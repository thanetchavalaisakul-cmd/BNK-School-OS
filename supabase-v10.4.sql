-- BNK School OS V10.4 — Student Registry role scopes
-- Applied to project ref: thvusgkxhiwsilipigno

create or replace function public.get_student_class_roster(p_class_id uuid)
returns table(
  student_id uuid,
  student_code text,
  prefix text,
  first_name text,
  last_name text,
  gender text,
  class_id uuid,
  academic_year text,
  semester integer,
  stage_code text,
  level_name text,
  room_name text,
  homeroom_teacher_names text[]
)
language sql
stable
security definer
set search_path to ''
as $$
  select
    s.id,
    s.student_code,
    s.prefix,
    s.first_name,
    s.last_name,
    s.gender,
    c.id,
    c.academic_year,
    c.semester,
    c.stage_code,
    c.level_name,
    c.room_name,
    coalesce((
      select array_agg(distinct p.full_name order by p.full_name)
      from public.homeroom_teachers h
      join public.profiles p on p.id=h.teacher_id
      where h.class_id=c.id
        and p.account_status='active'
        and p.deleted_at is null
    ), array[]::text[])
  from public.school_classes c
  join public.student_enrollments e on e.class_id=c.id and e.enrollment_status='active'
  join public.students s on s.id=e.student_id
  where c.id=p_class_id
    and c.is_active=true
    and private.is_active_user()
  order by
    case s.gender when 'ชาย' then 0 when 'หญิง' then 1 else 2 end,
    case when s.student_code ~ '^[0-9]+$' then s.student_code::bigint else null end nulls last,
    s.student_code,
    s.last_name,
    s.first_name;
$$;

revoke all on function public.get_student_class_roster(uuid) from public, anon;
grant execute on function public.get_student_class_roster(uuid) to authenticated, service_role;

drop policy if exists student_promotion_batches_select_scope on public.student_promotion_batches;
create policy student_promotion_batches_select_scope
on public.student_promotion_batches
for select
to authenticated
using ((select private.can_manage_student_class(student_promotion_batches.source_class_id)));

drop policy if exists student_promotion_items_select_scope on public.student_promotion_items;
create policy student_promotion_items_select_scope
on public.student_promotion_items
for select
to authenticated
using (
  exists (
    select 1
    from public.student_promotion_batches b
    where b.id=student_promotion_items.batch_id
      and (select private.can_manage_student_class(b.source_class_id))
  )
);
