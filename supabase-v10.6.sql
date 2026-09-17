-- BNK School OS V10.6 — import roster numbering + homeroom card issuance
-- Project: thvusgkxhiwsilipigno

-- 1) Active roster numbers must be unique only among active students.
-- Historical/inactive enrollments may retain their old number without blocking a current roster.
alter table public.student_enrollments
  drop constraint if exists student_enrollments_class_id_student_number_key;

drop index if exists public.student_enrollments_active_class_student_number_uidx;
create unique index student_enrollments_active_class_student_number_uidx
  on public.student_enrollments(class_id, student_number)
  where enrollment_status = 'active';

-- 2) A homeroom teacher may issue a card only for a student in their own class
-- in the academic term currently selected by Super Admin.
create or replace function private.can_issue_student_card(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and (
    private.can_manage_student_master()
    or exists (
      select 1
      from public.student_enrollments e
      join public.homeroom_teachers h
        on h.class_id = e.class_id
       and h.teacher_id = auth.uid()
      join public.academic_terms t
        on t.academic_year = e.academic_year
       and t.semester = e.semester
       and t.is_current = true
      where e.student_id = p_student_id
        and e.enrollment_status = 'active'
    )
  );
$$;

create or replace function private.prepare_student_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_issue_student_card(new.student_id) then
    raise exception 'ไม่มีสิทธิ์ออกบัตรนักเรียนคนนี้';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id = new.student_id
      and s.status = 'active'
      and s.photo_path is not null
  ) then
    raise exception 'นักเรียนต้องมีรูปถ่ายก่อนออกบัตร';
  end if;

  new.issued_at := coalesce(new.issued_at,current_date);
  new.expires_at := (new.issued_at + interval '3 years')::date;
  if new.card_number is null or btrim(new.card_number) = '' then
    new.card_number := private.next_student_card_number(new.issued_at);
  end if;
  new.issued_by := auth.uid();
  new.status := 'active';
  new.revoked_at := null;
  new.revoked_by := null;
  new.revoke_reason := null;
  new.updated_at := now();

  update public.student_cards c
     set status='revoked',
         revoked_at=now(),
         revoked_by=auth.uid(),
         revoke_reason=coalesce(c.revoke_reason,'ออกบัตรใบใหม่'),
         updated_at=now()
   where c.student_id=new.student_id
     and c.status='active';

  return new;
end;
$$;

drop policy if exists student_cards_insert_academic_admin on public.student_cards;
drop policy if exists student_cards_insert_authorized on public.student_cards;
create policy student_cards_insert_authorized
on public.student_cards
for insert
to authenticated
with check (
  (select private.can_issue_student_card(student_id))
  and issued_by = (select auth.uid())
);

-- 3) Import is still restricted to Super Admin / Academic Head.
-- The backend ignores the Excel row number and rebuilds the roster number:
-- male first -> student code ascending -> female -> student code ascending.
create or replace function public.import_student_registry(
  p_rows jsonb,
  p_academic_year text,
  p_semester integer,
  p_source_filename text default 'student_import.xlsx'::text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_class public.school_classes;
  v_student_id uuid;
  v_by_code uuid;
  v_by_citizen uuid;
  v_batch_id uuid;
  v_inserted integer:=0;
  v_updated integer:=0;
  v_enrolled integer:=0;
  v_total integer:=0;
  v_gender text;
  v_student_number integer;
  v_student_code text;
  v_citizen_id text;
  v_level text;
  v_room text;
  v_prefix text;
  v_counter integer:=0;
  v_affected_classes uuid[];
begin
  if auth.uid() is null or not private.can_manage_student_master() then
    raise exception 'Only Academic Head or Super Admin can import student registry data';
  end if;
  if p_semester not in (1,2,3) then raise exception 'Invalid semester'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'p_rows must be a JSON array'; end if;

  v_total:=jsonb_array_length(p_rows);
  if v_total=0 then raise exception 'No student rows supplied'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) x(value)
    where btrim(coalesce(x.value->>'student_code',''))=''
       or btrim(coalesce(x.value->>'citizen_id',''))=''
       or btrim(coalesce(x.value->>'level_name',''))=''
       or btrim(coalesce(x.value->>'room_name',''))=''
       or btrim(coalesce(x.value->>'first_name',''))=''
       or btrim(coalesce(x.value->>'last_name',''))=''
       or btrim(coalesce(x.value->>'birth_date',''))=''
  ) then
    raise exception 'Import contains rows with missing required data';
  end if;

  if exists (
    select 1 from (
      select btrim(value->>'student_code') as k, count(*)
      from jsonb_array_elements(p_rows)
      group by btrim(value->>'student_code')
      having count(*) > 1
    ) d
  ) then
    raise exception 'Duplicate student codes found in import file';
  end if;

  if exists (
    select 1 from (
      select btrim(value->>'citizen_id') as k, count(*)
      from jsonb_array_elements(p_rows)
      group by btrim(value->>'citizen_id')
      having count(*) > 1
    ) d
  ) then
    raise exception 'Duplicate citizen/G IDs found in import file';
  end if;

  if exists (
    select 1
    from (
      select distinct btrim(x.value->>'level_name') as level_name,
                      btrim(x.value->>'room_name') as room_name
      from jsonb_array_elements(p_rows) x(value)
    ) r
    where not exists (
      select 1 from public.school_classes c
      where c.academic_year=btrim(p_academic_year)
        and c.semester=p_semester
        and c.level_name=r.level_name
        and c.room_name=r.room_name
        and c.is_active=true
    )
  ) then
    raise exception 'One or more classes in the import file do not exist in the selected academic term';
  end if;

  select array_agg(distinct c.id)
  into v_affected_classes
  from jsonb_array_elements(p_rows) x(value)
  join public.school_classes c
    on c.academic_year=btrim(p_academic_year)
   and c.semester=p_semester
   and c.level_name=btrim(x.value->>'level_name')
   and c.room_name=btrim(x.value->>'room_name')
   and c.is_active=true;

  insert into public.student_import_batches(source_filename,academic_year,semester,total_rows,status,uploaded_by)
  values(coalesce(nullif(btrim(p_source_filename),''),'student_import.xlsx'),btrim(p_academic_year),p_semester,v_total,'preview',auth.uid())
  returning id into v_batch_id;

  -- Free current active roster numbers before upserts.
  with ranked as (
    select e.id,
           row_number() over(partition by e.class_id order by e.student_number,e.id) as rn
    from public.student_enrollments e
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = 1000000 + ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_counter:=v_counter+1;
    v_student_code:=btrim(coalesce(v_row->>'student_code',''));
    v_citizen_id:=btrim(coalesce(v_row->>'citizen_id',''));
    v_level:=btrim(coalesce(v_row->>'level_name',''));
    v_room:=btrim(coalesce(v_row->>'room_name',''));
    v_prefix:=btrim(coalesce(v_row->>'prefix',''));
    v_gender:=coalesce(nullif(btrim(v_row->>'gender'),''),
      case when v_prefix in ('เด็กชาย','นาย') then 'ชาย'
           when v_prefix in ('เด็กหญิง','นางสาว') then 'หญิง'
           else null end);

    if v_gender not in ('ชาย','หญิง') then
      raise exception 'Cannot determine gender for student code %',v_student_code;
    end if;

    select * into v_class
    from public.school_classes c
    where c.academic_year=btrim(p_academic_year)
      and c.semester=p_semester
      and c.level_name=v_level
      and c.room_name=v_room
      and c.is_active=true
    order by c.sort_order,c.id
    limit 1;

    select id into v_by_code from public.students where student_code=v_student_code limit 1;
    select id into v_by_citizen from public.students where citizen_id=v_citizen_id limit 1;
    if v_by_code is not null and v_by_citizen is not null and v_by_code<>v_by_citizen then
      raise exception 'Student code % and citizen/G ID % belong to different existing students',v_student_code,v_citizen_id;
    end if;
    v_student_id:=coalesce(v_by_code,v_by_citizen);

    if v_student_id is null then
      insert into public.students(
        student_code,citizen_id,prefix,first_name,last_name,gender,birth_date,
        weight_kg,height_cm,blood_group,religion,ethnicity,nationality,
        house_no,village_no,road_soi,subdistrict,district,province,
        guardian_prefix,guardian_first_name,guardian_last_name,guardian_occupation,guardian_relationship,
        father_prefix,father_first_name,father_last_name,father_occupation,
        mother_prefix,mother_first_name,mother_last_name,mother_occupation,
        disadvantaged_status,pending_disposal_status,status,created_by,updated_by
      ) values (
        v_student_code,v_citizen_id,v_prefix,btrim(v_row->>'first_name'),btrim(v_row->>'last_name'),v_gender,(v_row->>'birth_date')::date,
        nullif(v_row->>'weight_kg','')::numeric,nullif(v_row->>'height_cm','')::numeric,nullif(v_row->>'blood_group',''),nullif(v_row->>'religion',''),nullif(v_row->>'ethnicity',''),nullif(v_row->>'nationality',''),
        nullif(v_row->>'house_no',''),nullif(v_row->>'village_no',''),nullif(v_row->>'road_soi',''),nullif(v_row->>'subdistrict',''),nullif(v_row->>'district',''),nullif(v_row->>'province',''),
        nullif(v_row->>'guardian_prefix',''),nullif(v_row->>'guardian_first_name',''),nullif(v_row->>'guardian_last_name',''),nullif(v_row->>'guardian_occupation',''),nullif(v_row->>'guardian_relationship',''),
        nullif(v_row->>'father_prefix',''),nullif(v_row->>'father_first_name',''),nullif(v_row->>'father_last_name',''),nullif(v_row->>'father_occupation',''),
        nullif(v_row->>'mother_prefix',''),nullif(v_row->>'mother_first_name',''),nullif(v_row->>'mother_last_name',''),nullif(v_row->>'mother_occupation',''),
        nullif(v_row->>'disadvantaged_status',''),nullif(v_row->>'pending_disposal_status',''),'active',auth.uid(),auth.uid()
      ) returning id into v_student_id;
      v_inserted:=v_inserted+1;
    else
      update public.students set
        student_code=v_student_code,citizen_id=v_citizen_id,prefix=v_prefix,first_name=btrim(v_row->>'first_name'),last_name=btrim(v_row->>'last_name'),gender=v_gender,birth_date=(v_row->>'birth_date')::date,
        weight_kg=nullif(v_row->>'weight_kg','')::numeric,height_cm=nullif(v_row->>'height_cm','')::numeric,blood_group=nullif(v_row->>'blood_group',''),religion=nullif(v_row->>'religion',''),ethnicity=nullif(v_row->>'ethnicity',''),nationality=nullif(v_row->>'nationality',''),
        house_no=nullif(v_row->>'house_no',''),village_no=nullif(v_row->>'village_no',''),road_soi=nullif(v_row->>'road_soi',''),subdistrict=nullif(v_row->>'subdistrict',''),district=nullif(v_row->>'district',''),province=nullif(v_row->>'province',''),
        guardian_prefix=nullif(v_row->>'guardian_prefix',''),guardian_first_name=nullif(v_row->>'guardian_first_name',''),guardian_last_name=nullif(v_row->>'guardian_last_name',''),guardian_occupation=nullif(v_row->>'guardian_occupation',''),guardian_relationship=nullif(v_row->>'guardian_relationship',''),
        father_prefix=nullif(v_row->>'father_prefix',''),father_first_name=nullif(v_row->>'father_first_name',''),father_last_name=nullif(v_row->>'father_last_name',''),father_occupation=nullif(v_row->>'father_occupation',''),
        mother_prefix=nullif(v_row->>'mother_prefix',''),mother_first_name=nullif(v_row->>'mother_first_name',''),mother_last_name=nullif(v_row->>'mother_last_name',''),mother_occupation=nullif(v_row->>'mother_occupation',''),
        disadvantaged_status=nullif(v_row->>'disadvantaged_status',''),pending_disposal_status=nullif(v_row->>'pending_disposal_status',''),status='active',updated_by=auth.uid(),updated_at=now()
      where id=v_student_id;
      v_updated:=v_updated+1;
    end if;

    -- Temporary number only. Final roster number is rebuilt after all rows are saved.
    v_student_number:=2000000+v_counter;
    insert into public.student_enrollments(student_id,class_id,academic_year,semester,student_number,enrollment_status,promotion_status,created_by)
    values(v_student_id,v_class.id,btrim(p_academic_year),p_semester,v_student_number,'active','pending',auth.uid())
    on conflict(student_id,academic_year,semester) do update set
      class_id=excluded.class_id,
      student_number=excluded.student_number,
      enrollment_status='active',
      exit_reason=null,
      exit_note=null,
      ended_at=null,
      ended_by=null,
      updated_at=now();
    v_enrolled:=v_enrolled+1;
  end loop;

  -- Stage every active row to a conflict-free range using the required ordering.
  with ranked as (
    select e.id,
           row_number() over(
             partition by e.class_id
             order by
               case s.gender when 'ชาย' then 0 when 'หญิง' then 1 else 2 end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807 end,
               s.student_code,
               s.first_name,
               s.last_name,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = 3000000 + ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  -- Write final continuous numbers 1..N for each class.
  with ranked as (
    select e.id,
           row_number() over(
             partition by e.class_id
             order by
               case s.gender when 'ชาย' then 0 when 'หญิง' then 1 else 2 end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807 end,
               s.student_code,
               s.first_name,
               s.last_name,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.enrollment_status='active'
      and e.class_id = any(v_affected_classes)
  )
  update public.student_enrollments e
     set student_number = ranked.rn::integer,
         updated_at = now()
  from ranked
  where e.id=ranked.id;

  update public.student_import_batches
  set inserted_count=v_inserted,updated_count=v_updated,error_count=0,status='imported',completed_at=now(),
      notes=jsonb_build_object('enrollments',v_enrolled,'numbering_rule','male_then_student_code_then_female')
  where id=v_batch_id;

  return jsonb_build_object(
    'batch_id',v_batch_id,
    'total_rows',v_total,
    'inserted',v_inserted,
    'updated',v_updated,
    'enrollments',v_enrolled,
    'renumbered',true
  );
exception when others then
  if v_batch_id is not null then
    update public.student_import_batches
      set status='failed',error_count=greatest(v_total-v_inserted-v_updated,1),notes=jsonb_build_object('error',sqlerrm),completed_at=now()
      where id=v_batch_id;
  end if;
  raise;
end;
$$;
