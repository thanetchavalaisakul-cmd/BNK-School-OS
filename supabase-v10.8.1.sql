-- BNK School OS V10.8.1
-- Applied to Supabase project thvusgkxhiwsilipigno

alter table public.academic_supervision_slots
  add column if not exists supervisor_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists supervisor_name text;

create index if not exists academic_supervision_slots_supervisor_idx
  on public.academic_supervision_slots(supervisor_user_id);

create or replace function private.can_view_academic_supervision_stage(
  p_academic_year text, p_semester integer, p_stage_code text
)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select private.is_active_user()
    and (
      private.can_manage_academic_supervision()
      or private.user_in_academic_stage(auth.uid(),p_academic_year,p_semester,p_stage_code)
    );
$$;

revoke all on function private.can_view_academic_supervision_stage(text,integer,text) from public, anon;
grant execute on function private.can_view_academic_supervision_stage(text,integer,text) to authenticated;

drop policy if exists academic_supervision_weeks_read_active on public.academic_supervision_weeks;
drop policy if exists academic_supervision_weeks_read_scope on public.academic_supervision_weeks;
create policy academic_supervision_weeks_read_scope on public.academic_supervision_weeks
for select to authenticated using (
  (select private.can_view_academic_supervision_stage(academic_year,semester,stage_code))
);

drop policy if exists academic_supervision_slots_read_active on public.academic_supervision_slots;
drop policy if exists academic_supervision_slots_read_scope on public.academic_supervision_slots;
create policy academic_supervision_slots_read_scope on public.academic_supervision_slots
for select to authenticated using (
  (select private.is_active_user())
  and (
    (select private.can_manage_academic_supervision())
    or teacher_id=(select auth.uid())
    or supervisor_user_id=(select auth.uid())
    or exists (
      select 1 from public.academic_supervision_weeks w
      where w.id=academic_supervision_slots.week_id
        and private.user_in_academic_stage(auth.uid(),w.academic_year,w.semester,w.stage_code)
    )
  )
);

create or replace function public.get_academic_supervisor_candidates()
returns table(user_id uuid,full_name text,role text)
language sql stable security definer set search_path=pg_catalog,public,private
as $$
  select p.id,coalesce(p.full_name,p.email,'ไม่ระบุชื่อ'),p.role
  from public.profiles p
  where private.can_manage_academic_supervision()
    and p.account_status='active' and p.deleted_at is null
  order by coalesce(p.full_name,p.email,'');
$$;

revoke all on function public.get_academic_supervisor_candidates() from public, anon;
grant execute on function public.get_academic_supervisor_candidates() to authenticated;

-- save_academic_supervision_slot was upgraded in production to accept
-- p_supervisor_user_id uuid before p_note, store supervisor snapshot,
-- and notify both the supervised teacher and the assigned supervisor.
-- Signature:
-- public.save_academic_supervision_slot(uuid,uuid,uuid,uuid,text)
