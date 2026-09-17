-- BNK School OS V10.7 — Academic Calendar / 100 School Days

-- One extra calendar editor appointed by Super Admin.
create table if not exists public.academic_calendar_settings (
  id smallint primary key default 1 check (id = 1),
  editor_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.academic_calendar_settings(id) values (1) on conflict (id) do nothing;
create index if not exists academic_calendar_settings_editor_user_idx on public.academic_calendar_settings(editor_user_id);

alter table public.academic_calendar_settings enable row level security;
drop policy if exists academic_calendar_settings_read_active on public.academic_calendar_settings;
create policy academic_calendar_settings_read_active on public.academic_calendar_settings
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_calendar_settings_update_superadmin on public.academic_calendar_settings;
create policy academic_calendar_settings_update_superadmin on public.academic_calendar_settings
for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create or replace function private.can_manage_academic_calendar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_active_user() and (
    private.is_super_admin()
    or private.is_department_head_of('academic')
    or exists (
      select 1
      from public.academic_calendar_settings s
      where s.id = 1 and s.editor_user_id = auth.uid()
    )
  );
$function$;
revoke all on function private.can_manage_academic_calendar() from public, anon, authenticated;

create table if not exists public.academic_calendars (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  semester integer not null check (semester in (1,2,3)),
  start_date date not null,
  display_months date[] not null default '{}'::date[],
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (academic_year, semester)
);
create index if not exists academic_calendars_period_idx on public.academic_calendars(academic_year,semester,status);
create index if not exists academic_calendars_created_by_idx on public.academic_calendars(created_by);
create index if not exists academic_calendars_updated_by_idx on public.academic_calendars(updated_by);

create table if not exists public.academic_calendar_day_overrides (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.academic_calendars(id) on delete cascade,
  event_date date not null,
  override_type text not null check (override_type in ('holiday','special_school_day')),
  category text not null,
  title text not null,
  make_up_for date,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique(calendar_id,event_date),
  check ((override_type <> 'special_school_day') or (category <> 'makeup') or (make_up_for is not null))
);
create index if not exists academic_calendar_overrides_calendar_date_idx on public.academic_calendar_day_overrides(calendar_id,event_date);
create index if not exists academic_calendar_overrides_created_by_idx on public.academic_calendar_day_overrides(created_by);

create table if not exists public.academic_calendar_activities (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.academic_calendars(id) on delete cascade,
  event_date date not null,
  title text not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create index if not exists academic_calendar_activities_calendar_date_idx on public.academic_calendar_activities(calendar_id,event_date);
create index if not exists academic_calendar_activities_created_by_idx on public.academic_calendar_activities(created_by);

create or replace function private.can_view_academic_calendar(p_calendar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select private.is_active_user() and exists (
    select 1 from public.academic_calendars c
    where c.id = p_calendar_id
      and (c.status = 'published' or private.can_manage_academic_calendar())
  );
$function$;
revoke all on function private.can_view_academic_calendar(uuid) from public, anon, authenticated;

alter table public.academic_calendars enable row level security;
alter table public.academic_calendar_day_overrides enable row level security;
alter table public.academic_calendar_activities enable row level security;

drop policy if exists academic_calendars_select_scope on public.academic_calendars;
create policy academic_calendars_select_scope on public.academic_calendars
for select to authenticated using ((select private.is_active_user()) and (status='published' or (select private.can_manage_academic_calendar())));
drop policy if exists academic_calendars_insert_manager on public.academic_calendars;
create policy academic_calendars_insert_manager on public.academic_calendars
for insert to authenticated with check ((select private.can_manage_academic_calendar()) and created_by=(select auth.uid()));
drop policy if exists academic_calendars_update_manager on public.academic_calendars;
create policy academic_calendars_update_manager on public.academic_calendars
for update to authenticated using ((select private.can_manage_academic_calendar())) with check ((select private.can_manage_academic_calendar()));
drop policy if exists academic_calendars_delete_manager on public.academic_calendars;
create policy academic_calendars_delete_manager on public.academic_calendars
for delete to authenticated using ((select private.can_manage_academic_calendar()));

drop policy if exists academic_calendar_overrides_select_scope on public.academic_calendar_day_overrides;
create policy academic_calendar_overrides_select_scope on public.academic_calendar_day_overrides
for select to authenticated using ((select private.can_view_academic_calendar(calendar_id)));
drop policy if exists academic_calendar_overrides_insert_manager on public.academic_calendar_day_overrides;
create policy academic_calendar_overrides_insert_manager on public.academic_calendar_day_overrides
for insert to authenticated with check ((select private.can_manage_academic_calendar()) and created_by=(select auth.uid()));
drop policy if exists academic_calendar_overrides_update_manager on public.academic_calendar_day_overrides;
create policy academic_calendar_overrides_update_manager on public.academic_calendar_day_overrides
for update to authenticated using ((select private.can_manage_academic_calendar())) with check ((select private.can_manage_academic_calendar()));
drop policy if exists academic_calendar_overrides_delete_manager on public.academic_calendar_day_overrides;
create policy academic_calendar_overrides_delete_manager on public.academic_calendar_day_overrides
for delete to authenticated using ((select private.can_manage_academic_calendar()));

drop policy if exists academic_calendar_activities_select_scope on public.academic_calendar_activities;
create policy academic_calendar_activities_select_scope on public.academic_calendar_activities
for select to authenticated using ((select private.can_view_academic_calendar(calendar_id)));
drop policy if exists academic_calendar_activities_insert_manager on public.academic_calendar_activities;
create policy academic_calendar_activities_insert_manager on public.academic_calendar_activities
for insert to authenticated with check ((select private.can_manage_academic_calendar()) and created_by=(select auth.uid()));
drop policy if exists academic_calendar_activities_update_manager on public.academic_calendar_activities;
create policy academic_calendar_activities_update_manager on public.academic_calendar_activities
for update to authenticated using ((select private.can_manage_academic_calendar())) with check ((select private.can_manage_academic_calendar()));
drop policy if exists academic_calendar_activities_delete_manager on public.academic_calendar_activities;
create policy academic_calendar_activities_delete_manager on public.academic_calendar_activities
for delete to authenticated using ((select private.can_manage_academic_calendar()));

-- Academic Calendar is the first Academic Administration module.
do $block$
declare v_department_id uuid;
begin
  select id into v_department_id from public.departments where code='academic' limit 1;
  if v_department_id is not null then
    if not exists (select 1 from public.modules where code='academic_calendar') then
      update public.modules set sort_order=sort_order+1 where department_id=v_department_id;
    end if;
    insert into public.modules(department_id,code,name_th,name_en,route,sort_order,is_active)
    values(v_department_id,'academic_calendar','ระบบปฏิทินวิชาการ','Academic Calendar','/academic/calendar',1,true)
    on conflict(code) do update set department_id=excluded.department_id,name_th=excluded.name_th,name_en=excluded.name_en,route=excluded.route,sort_order=1,is_active=true;
  end if;
end
$block$;

-- Follow-up indexes for FK columns flagged by the performance advisor.
create index if not exists academic_calendar_settings_updated_by_idx on public.academic_calendar_settings(updated_by);
create index if not exists academic_calendars_published_by_idx on public.academic_calendars(published_by);
create index if not exists academic_calendar_overrides_updated_by_idx on public.academic_calendar_day_overrides(updated_by);
create index if not exists academic_calendar_activities_updated_by_idx on public.academic_calendar_activities(updated_by);
