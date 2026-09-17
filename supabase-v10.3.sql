-- BNK School OS V10.3
-- Student Registry semester copy support
-- Applied to Supabase project ref: thvusgkxhiwsilipigno

create or replace function public.copy_student_registry_semester(
  p_academic_year text,
  p_from_semester integer,
  p_to_semester integer
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_year text := btrim(p_academic_year);
  v_classes integer := 0;
  v_enrollments integer := 0;
begin
  if auth.uid() is null or not private.can_manage_student_master() then
    raise exception 'Only Academic Head or Super Admin can copy student registry semester data';
  end if;
  if v_year is null or v_year = '' then
    raise exception 'Academic year is required';
  end if;
  if p_from_semester not in (1,2) or p_to_semester not in (1,2) or p_from_semester = p_to_semester then
    raise exception 'Semester must be 1 or 2 and source/target must be different';
  end if;

  insert into public.academic_terms(academic_year,semester,is_current)
  values(v_year,p_to_semester,false)
  on conflict(academic_year,semester) do nothing;

  insert into public.school_classes(
    academic_year,semester,stage_code,level_name,room_name,sort_order,is_active,created_by
  )
  select
    v_year,p_to_semester,c.stage_code,c.level_name,c.room_name,c.sort_order,true,auth.uid()
  from public.school_classes c
  where c.academic_year=v_year
    and c.semester=p_from_semester
    and c.is_active=true
  on conflict(academic_year,semester,level_name,room_name) do nothing;
  get diagnostics v_classes = row_count;

  with candidates as (
    select
      e.student_id,
      tc.id as target_class_id,
      coalesce(mx.max_no,0) as base_no,
      row_number() over (
        partition by tc.id
        order by
          case when s.gender='ชาย' then 0 when s.gender='หญิง' then 1 else 2 end,
          case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else 9223372036854775807::bigint end,
          s.student_code,
          s.id
      ) as seq_no
    from public.student_enrollments e
    join public.school_classes sc on sc.id=e.class_id
    join public.students s on s.id=e.student_id
    join public.school_classes tc
      on tc.academic_year=v_year
     and tc.semester=p_to_semester
     and tc.level_name=sc.level_name
     and tc.room_name=sc.room_name
     and tc.is_active=true
    left join lateral (
      select max(te.student_number) as max_no
      from public.student_enrollments te
      where te.class_id=tc.id
    ) mx on true
    where e.academic_year=v_year
      and e.semester=p_from_semester
      and e.enrollment_status='active'
      and sc.is_active=true
      and not exists (
        select 1
        from public.student_enrollments te
        where te.student_id=e.student_id
          and te.academic_year=v_year
          and te.semester=p_to_semester
      )
  )
  insert into public.student_enrollments(
    student_id,class_id,academic_year,semester,student_number,enrollment_status,promotion_status,created_by
  )
  select
    student_id,target_class_id,v_year,p_to_semester,base_no+seq_no,'active','pending',auth.uid()
  from candidates
  on conflict do nothing;
  get diagnostics v_enrollments = row_count;

  return jsonb_build_object(
    'academic_year',v_year,
    'from_semester',p_from_semester,
    'to_semester',p_to_semester,
    'classes_created',v_classes,
    'enrollments_created',v_enrollments
  );
end;
$function$;

revoke all on function public.copy_student_registry_semester(text,integer,integer) from public;
revoke all on function public.copy_student_registry_semester(text,integer,integer) from anon;
grant execute on function public.copy_student_registry_semester(text,integer,integer) to authenticated;
grant execute on function public.copy_student_registry_semester(text,integer,integer) to service_role;
