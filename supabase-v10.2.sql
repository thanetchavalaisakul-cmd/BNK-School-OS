-- BNK School OS V10.2
-- Project ref: thvusgkxhiwsilipigno
-- Student Registry: academic year management + enrollment exit history

alter table public.student_enrollments
  add column if not exists exit_reason text,
  add column if not exists exit_note text,
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.student_enrollments'::regclass
      and conname='student_enrollments_exit_reason_check'
  ) then
    alter table public.student_enrollments
      add constraint student_enrollments_exit_reason_check
      check (exit_reason is null or exit_reason in ('transferred_out','not_continuing','withdrawn','deceased','other'));
  end if;
end $$;

create index if not exists student_enrollments_ended_by_idx on public.student_enrollments(ended_by);
create index if not exists student_enrollments_period_status_idx on public.student_enrollments(academic_year,semester,enrollment_status);

grant select,insert,update,delete on public.academic_terms to authenticated;

drop policy if exists academic_terms_insert_superadmin on public.academic_terms;
create policy academic_terms_insert_superadmin on public.academic_terms
for insert to authenticated with check ((select private.is_super_admin()));

drop policy if exists academic_terms_update_superadmin on public.academic_terms;
create policy academic_terms_update_superadmin on public.academic_terms
for update to authenticated
using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists academic_terms_delete_superadmin on public.academic_terms;
create policy academic_terms_delete_superadmin on public.academic_terms
for delete to authenticated using ((select private.is_super_admin()));

insert into public.academic_terms(academic_year,semester,is_current)
select distinct c.academic_year,c.semester,false
from public.school_classes c
on conflict (academic_year,semester) do nothing;

with ranked as (
  select id,row_number() over(order by academic_year::int desc,semester desc,created_at desc) rn
  from public.academic_terms
)
update public.academic_terms t
set is_current=(r.rn=1)
from ranked r
where t.id=r.id
  and not exists(select 1 from public.academic_terms where is_current=true);

create unique index if not exists academic_terms_one_current_idx
on public.academic_terms((is_current)) where is_current=true;

create or replace function public.set_current_academic_term(p_academic_year text,p_semester integer)
returns void language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'Only Super Admin can set the current academic term';
  end if;
  if not exists (
    select 1 from public.academic_terms
    where academic_year=btrim(p_academic_year) and semester=p_semester
  ) then
    raise exception 'Academic term not found';
  end if;
  update public.academic_terms set is_current=false where is_current=true;
  update public.academic_terms set is_current=true
    where academic_year=btrim(p_academic_year) and semester=p_semester;
end;
$$;

revoke all on function public.set_current_academic_term(text,integer) from public,anon;
grant execute on function public.set_current_academic_term(text,integer) to authenticated;

create or replace function private.normalize_student_enrollment_reactivation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.enrollment_status='active' and (tg_op='INSERT' or old.enrollment_status is distinct from 'active') then
    new.exit_reason:=null;
    new.exit_note:=null;
    new.ended_at:=null;
    new.ended_by:=null;
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_student_enrollment_reactivation() from public,anon,authenticated;

drop trigger if exists trg_normalize_student_enrollment_reactivation on public.student_enrollments;
create trigger trg_normalize_student_enrollment_reactivation
before insert or update of enrollment_status on public.student_enrollments
for each row execute function private.normalize_student_enrollment_reactivation();
