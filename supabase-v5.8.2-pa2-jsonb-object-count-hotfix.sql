-- BNK School OS v5.8.2
-- Production hotfix already applied on project thvusgkxhiwsilipigno.
-- Replaces unsupported jsonb_object_length(jsonb) checks with counts from jsonb_each().
-- Reference source for fresh/rebuilt environments; do not re-run on Production unless reconciling schema intentionally.

begin;

create or replace function private.personnel_pa_assessment_before_write()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.personnel_pa_period_committee_members;
  v_report public.personnel_pa_reports;
  v_account public.personnel_pa_evaluator_accounts;
  v_key text;
  v_level integer;
  v_s1 numeric := 0;
  v_s2 numeric := 0;
  v_s1_count integer := 0;
  v_s2_count integer := 0;
  v_required1 text[] := array['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8','2.1','2.2','2.3','2.4','3.1','3.2','3.3'];
  v_required2 text[] := array['method','quantitative','qualitative'];
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_member from public.personnel_pa_period_committee_members where id=new.committee_member_id;
  if v_member.id is null then raise exception 'annual PA2 committee member not found'; end if;
  if v_member.evaluator_user_id<>v_uid then raise exception 'this PA2 assessment belongs to another evaluator'; end if;

  select * into v_account from public.personnel_pa_evaluator_accounts where auth_user_id=v_uid;
  if v_account.profile_completed_at is null or v_account.signature_path is null then
    raise exception 'complete evaluator profile and signature before assessment';
  end if;

  select * into v_report from public.personnel_pa_reports r
  where r.period_id=v_member.period_id and r.user_id=new.evaluatee_user_id and r.status='submitted';
  if v_report.id is null then raise exception 'submitted end-year PA report is required before assessment'; end if;

  if tg_op='INSERT' then
    new.created_by:=v_uid;
    new.created_at:=now();
  else
    if new.committee_member_id is distinct from old.committee_member_id
       or new.evaluatee_user_id is distinct from old.evaluatee_user_id
       or new.period_id is distinct from old.period_id
       or new.pa_report_id is distinct from old.pa_report_id then
      raise exception 'PA2 assessment identity cannot be changed';
    end if;
    if old.status='submitted' then raise exception 'submitted PA2 assessment is locked; reset it before reassessment'; end if;
  end if;

  if not private.personnel_pa_assessment_window_open(v_member.period_id) then raise exception 'PA2 assessment window is not open'; end if;

  new.period_id:=v_member.period_id;
  new.pa_report_id:=v_report.id;
  new.entry_mode:='self';
  new.evaluator_name_snapshot:=v_account.full_name;
  new.evaluator_position_snapshot:=v_account.position_title;
  new.evaluator_organization_snapshot:=v_account.organization;
  new.committee_slot_snapshot:=v_member.slot_no;
  new.committee_role_snapshot:=v_member.member_role;
  new.evaluator_signature_bucket_snapshot:=v_account.signature_bucket;
  new.evaluator_signature_path_snapshot:=v_account.signature_path;
  new.evaluator_signature_mime_snapshot:=v_account.signature_mime_type;
  new.entered_by:=v_uid;
  new.updated_by:=v_uid;
  new.updated_at:=now();

  if jsonb_typeof(coalesce(new.section1_levels,'{}'::jsonb))<>'object'
     or jsonb_typeof(coalesce(new.section2_levels,'{}'::jsonb))<>'object' then
    raise exception 'invalid PA2 rubric data';
  end if;

  select count(*) into v_s1_count from jsonb_each(coalesce(new.section1_levels,'{}'::jsonb));
  select count(*) into v_s2_count from jsonb_each(coalesce(new.section2_levels,'{}'::jsonb));

  for v_key,v_level in select key,(value #>> '{}')::integer from jsonb_each(coalesce(new.section1_levels,'{}'::jsonb)) loop
    if not(v_key=any(v_required1)) or v_level not between 1 and 4 then raise exception 'invalid section 1 rubric level'; end if;
    v_s1:=v_s1+v_level;
  end loop;

  for v_key,v_level in select key,(value #>> '{}')::integer from jsonb_each(coalesce(new.section2_levels,'{}'::jsonb)) loop
    if not(v_key=any(v_required2)) or v_level not between 1 and 4 then raise exception 'invalid section 2 rubric level'; end if;
    if v_key='method' then v_s2:=v_s2+(v_level*5); else v_s2:=v_s2+(v_level*2.5); end if;
  end loop;

  if new.status='submitted' then
    if new.workload_compliant is null then raise exception 'workload compliance decision is required'; end if;
    if v_s1_count<>15 then raise exception 'all 15 section 1 indicators must be assessed'; end if;
    if v_s2_count<>3 then raise exception 'all 3 section 2 criteria must be assessed'; end if;
    foreach v_key in array v_required1 loop if not(new.section1_levels?v_key) then raise exception 'missing section 1 indicator %',v_key; end if; end loop;
    foreach v_key in array v_required2 loop if not(new.section2_levels?v_key) then raise exception 'missing section 2 criterion %',v_key; end if; end loop;
    new.submitted_at:=now();
  end if;

  new.section1_total:=v_s1;
  new.section2_total:=v_s2;
  new.total_score:=v_s1+v_s2;
  new.passed:=coalesce(new.workload_compliant,false) and (v_s1+v_s2)>=70;
  return new;
exception when invalid_text_representation then
  raise exception 'rubric levels must be integers from 1 to 4';
end;
$$;

revoke all on function private.personnel_pa_assessment_before_write() from public,anon,authenticated;
grant execute on function private.personnel_pa_assessment_before_write() to service_role;

notify pgrst,'reload schema';
commit;
