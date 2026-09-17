-- BNK School OS V10.8
-- Academic Supervision Calendar + PLC Calendar

create table if not exists public.academic_supervision_settings (
  id smallint primary key default 1 check (id = 1),
  deputy_academic_user_id uuid references public.profiles(id) on delete set null,
  coordinator_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.academic_supervision_settings(id) values (1) on conflict (id) do nothing;

create index if not exists academic_supervision_settings_deputy_idx on public.academic_supervision_settings(deputy_academic_user_id);
create index if not exists academic_supervision_settings_coordinator_idx on public.academic_supervision_settings(coordinator_user_id);
create index if not exists academic_supervision_settings_updated_by_idx on public.academic_supervision_settings(updated_by);

create table if not exists public.academic_supervision_weeks (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  semester integer not null check (semester in (1,2,3)),
  week_start date not null,
  stage_code text not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint academic_supervision_weeks_year_sem_week_key unique (academic_year, semester, week_start),
  constraint academic_supervision_weeks_monday_check check (extract(isodow from week_start) = 1)
);
create index if not exists academic_supervision_weeks_period_idx on public.academic_supervision_weeks(academic_year,semester,week_start);
create index if not exists academic_supervision_weeks_stage_idx on public.academic_supervision_weeks(stage_code);
create index if not exists academic_supervision_weeks_created_by_idx on public.academic_supervision_weeks(created_by);
create index if not exists academic_supervision_weeks_updated_by_idx on public.academic_supervision_weeks(updated_by);

create table if not exists public.academic_supervision_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.academic_supervision_weeks(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  timetable_entry_id uuid references public.timetable_entries(id) on delete set null,
  event_date date not null,
  weekday smallint not null check (weekday between 1 and 7),
  period_no integer not null,
  period_label text,
  start_time time,
  end_time time,
  subject_id uuid references public.academic_subjects(id) on delete set null,
  subject_name text not null,
  class_id uuid references public.school_classes(id) on delete set null,
  class_label text not null,
  note text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint academic_supervision_slots_week_teacher_key unique (week_id, teacher_id)
);
create index if not exists academic_supervision_slots_teacher_date_idx on public.academic_supervision_slots(teacher_id,event_date);
create index if not exists academic_supervision_slots_entry_idx on public.academic_supervision_slots(timetable_entry_id);
create index if not exists academic_supervision_slots_subject_idx on public.academic_supervision_slots(subject_id);
create index if not exists academic_supervision_slots_class_idx on public.academic_supervision_slots(class_id);
create index if not exists academic_supervision_slots_created_by_idx on public.academic_supervision_slots(created_by);
create index if not exists academic_supervision_slots_updated_by_idx on public.academic_supervision_slots(updated_by);

create table if not exists public.academic_plc_plans (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  semester integer not null check (semester in (1,2,3)),
  stage_code text not null,
  recurrence_type text not null check (recurrence_type in ('weekly','custom')),
  weekday smallint check (weekday between 1 and 7),
  period_no integer not null,
  period_label text,
  start_time time,
  end_time time,
  start_date date,
  end_date date,
  title text not null default 'PLC',
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create index if not exists academic_plc_plans_period_stage_idx on public.academic_plc_plans(academic_year,semester,stage_code,is_active);
create index if not exists academic_plc_plans_created_by_idx on public.academic_plc_plans(created_by);
create index if not exists academic_plc_plans_updated_by_idx on public.academic_plc_plans(updated_by);

create table if not exists public.academic_plc_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.academic_plc_plans(id) on delete cascade,
  event_date date not null,
  created_at timestamptz not null default now(),
  constraint academic_plc_sessions_plan_date_key unique(plan_id,event_date)
);
create index if not exists academic_plc_sessions_date_idx on public.academic_plc_sessions(event_date);

create or replace function private.can_manage_academic_supervision()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.is_active_user()
    and (
      private.is_super_admin()
      or exists (
        select 1
        from public.academic_supervision_settings s
        where s.id = 1
          and auth.uid() in (s.deputy_academic_user_id, s.coordinator_user_id)
      )
    );
$$;

create or replace function private.can_manage_academic_plc()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.is_active_user()
    and (private.is_super_admin() or private.is_academic_head());
$$;

create or replace function private.user_in_academic_stage(
  p_user_id uuid,
  p_academic_year text,
  p_semester integer,
  p_stage_code text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.deleted_at is null
      and (
        exists (
          select 1
          from public.homeroom_teachers ht
          join public.school_classes sc on sc.id = ht.class_id
          where ht.teacher_id = p_user_id
            and sc.academic_year = p_academic_year
            and sc.semester = p_semester
            and sc.stage_code = p_stage_code
            and sc.is_active
        )
        or exists (
          select 1
          from public.teaching_assignments ta
          join public.school_classes sc on sc.id = ta.class_id
          where ta.teacher_id = p_user_id
            and ta.is_active
            and sc.academic_year = p_academic_year
            and sc.semester = p_semester
            and sc.stage_code = p_stage_code
            and sc.is_active
        )
      )
  );
$$;

create or replace function private.academic_calendar_end_date(
  p_academic_year text,
  p_semester integer
)
returns date
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_calendar public.academic_calendars%rowtype;
  v_end date;
begin
  select * into v_calendar
  from public.academic_calendars
  where academic_year = p_academic_year and semester = p_semester
  limit 1;

  if not found then return null; end if;

  select x.d::date into v_end
  from (
    select gs::date as d,
           row_number() over(order by gs) as n
    from generate_series(v_calendar.start_date::timestamp, (v_calendar.start_date + 500)::timestamp, interval '1 day') gs
    left join public.academic_calendar_day_overrides o
      on o.calendar_id = v_calendar.id and o.event_date = gs::date
    where coalesce(o.override_type,'') <> 'holiday'
      and (
        extract(isodow from gs)::int between 1 and 5
        or o.override_type = 'special_school_day'
      )
  ) x
  where x.n = 100
  limit 1;

  return v_end;
end;
$$;

create or replace function private.academic_date_in_calendar(
  p_academic_year text,
  p_semester integer,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.academic_calendars c
    where c.academic_year = p_academic_year
      and c.semester = p_semester
      and p_date between c.start_date and private.academic_calendar_end_date(p_academic_year,p_semester)
  );
$$;

create or replace function private.validate_academic_supervision_week()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_start date;
  v_end date;
begin
  select c.start_date, private.academic_calendar_end_date(new.academic_year,new.semester)
    into v_start, v_end
  from public.academic_calendars c
  where c.academic_year = new.academic_year and c.semester = new.semester
  limit 1;

  if v_start is null or v_end is null then
    raise exception 'ต้องมีปฏิทิน 100 วันของปีการศึกษา/ภาคเรียนนี้ก่อน';
  end if;
  if new.week_start > v_end or (new.week_start + 4) < v_start then
    raise exception 'สัปดาห์นิเทศอยู่นอกช่วงปฏิทิน 100 วัน';
  end if;
  if not exists (
    select 1 from public.school_classes sc
    where sc.academic_year=new.academic_year and sc.semester=new.semester
      and sc.stage_code=new.stage_code and sc.is_active
  ) then
    raise exception 'ไม่พบช่วงชั้นในปีการศึกษา/ภาคเรียนนี้';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists academic_supervision_weeks_validate on public.academic_supervision_weeks;
create trigger academic_supervision_weeks_validate
before insert or update on public.academic_supervision_weeks
for each row execute function private.validate_academic_supervision_week();

alter table public.academic_supervision_settings enable row level security;
alter table public.academic_supervision_weeks enable row level security;
alter table public.academic_supervision_slots enable row level security;
alter table public.academic_plc_plans enable row level security;
alter table public.academic_plc_sessions enable row level security;

drop policy if exists academic_supervision_settings_read_active on public.academic_supervision_settings;
create policy academic_supervision_settings_read_active on public.academic_supervision_settings
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_supervision_settings_update_superadmin on public.academic_supervision_settings;
create policy academic_supervision_settings_update_superadmin on public.academic_supervision_settings
for update to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists academic_supervision_weeks_read_active on public.academic_supervision_weeks;
create policy academic_supervision_weeks_read_active on public.academic_supervision_weeks
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_supervision_weeks_insert_manager on public.academic_supervision_weeks;
create policy academic_supervision_weeks_insert_manager on public.academic_supervision_weeks
for insert to authenticated with check ((select private.can_manage_academic_supervision()) and created_by=(select auth.uid()));
drop policy if exists academic_supervision_weeks_update_manager on public.academic_supervision_weeks;
create policy academic_supervision_weeks_update_manager on public.academic_supervision_weeks
for update to authenticated using ((select private.can_manage_academic_supervision())) with check ((select private.can_manage_academic_supervision()));
drop policy if exists academic_supervision_weeks_delete_manager on public.academic_supervision_weeks;
create policy academic_supervision_weeks_delete_manager on public.academic_supervision_weeks
for delete to authenticated using ((select private.can_manage_academic_supervision()));

drop policy if exists academic_supervision_slots_read_active on public.academic_supervision_slots;
create policy academic_supervision_slots_read_active on public.academic_supervision_slots
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_supervision_slots_insert_manager on public.academic_supervision_slots;
create policy academic_supervision_slots_insert_manager on public.academic_supervision_slots
for insert to authenticated with check ((select private.can_manage_academic_supervision()) and created_by=(select auth.uid()));
drop policy if exists academic_supervision_slots_update_manager on public.academic_supervision_slots;
create policy academic_supervision_slots_update_manager on public.academic_supervision_slots
for update to authenticated using ((select private.can_manage_academic_supervision())) with check ((select private.can_manage_academic_supervision()));
drop policy if exists academic_supervision_slots_delete_manager on public.academic_supervision_slots;
create policy academic_supervision_slots_delete_manager on public.academic_supervision_slots
for delete to authenticated using ((select private.can_manage_academic_supervision()));

drop policy if exists academic_plc_plans_read_active on public.academic_plc_plans;
create policy academic_plc_plans_read_active on public.academic_plc_plans
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_plc_plans_insert_manager on public.academic_plc_plans;
create policy academic_plc_plans_insert_manager on public.academic_plc_plans
for insert to authenticated with check ((select private.can_manage_academic_plc()) and created_by=(select auth.uid()));
drop policy if exists academic_plc_plans_update_manager on public.academic_plc_plans;
create policy academic_plc_plans_update_manager on public.academic_plc_plans
for update to authenticated using ((select private.can_manage_academic_plc())) with check ((select private.can_manage_academic_plc()));
drop policy if exists academic_plc_plans_delete_manager on public.academic_plc_plans;
create policy academic_plc_plans_delete_manager on public.academic_plc_plans
for delete to authenticated using ((select private.can_manage_academic_plc()));

drop policy if exists academic_plc_sessions_read_active on public.academic_plc_sessions;
create policy academic_plc_sessions_read_active on public.academic_plc_sessions
for select to authenticated using ((select private.is_active_user()));
drop policy if exists academic_plc_sessions_insert_manager on public.academic_plc_sessions;
create policy academic_plc_sessions_insert_manager on public.academic_plc_sessions
for insert to authenticated with check ((select private.can_manage_academic_plc()));
drop policy if exists academic_plc_sessions_update_manager on public.academic_plc_sessions;
create policy academic_plc_sessions_update_manager on public.academic_plc_sessions
for update to authenticated using ((select private.can_manage_academic_plc())) with check ((select private.can_manage_academic_plc()));
drop policy if exists academic_plc_sessions_delete_manager on public.academic_plc_sessions;
create policy academic_plc_sessions_delete_manager on public.academic_plc_sessions
for delete to authenticated using ((select private.can_manage_academic_plc()));

create or replace function public.get_academic_stage_teachers(
  p_academic_year text,
  p_semester integer,
  p_stage_code text
)
returns table(teacher_id uuid, full_name text)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select p.id, coalesce(p.full_name,p.email,'ไม่ระบุชื่อ')
  from public.profiles p
  where p.account_status='active' and p.deleted_at is null
    and private.user_in_academic_stage(p.id,p_academic_year,p_semester,p_stage_code)
  order by coalesce(p.full_name,p.email,'');
$$;

create or replace function public.get_my_academic_stages(
  p_academic_year text,
  p_semester integer
)
returns table(stage_code text)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select distinct sc.stage_code
  from public.school_classes sc
  where sc.academic_year=p_academic_year and sc.semester=p_semester and sc.is_active
    and private.user_in_academic_stage(auth.uid(),p_academic_year,p_semester,sc.stage_code)
  order by sc.stage_code;
$$;

create or replace function public.get_supervision_teacher_slots(
  p_week_id uuid,
  p_teacher_id uuid
)
returns table(
  timetable_entry_id uuid,
  event_date date,
  weekday smallint,
  period_no integer,
  period_label text,
  start_time time,
  end_time time,
  subject_id uuid,
  subject_name text,
  class_id uuid,
  class_label text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_week public.academic_supervision_weeks%rowtype;
begin
  if not private.can_manage_academic_supervision() then
    raise exception 'ไม่มีสิทธิ์จัดคาบนิเทศ';
  end if;
  select * into v_week from public.academic_supervision_weeks where id=p_week_id;
  if not found then raise exception 'ไม่พบสัปดาห์นิเทศ'; end if;
  if not private.user_in_academic_stage(p_teacher_id,v_week.academic_year,v_week.semester,v_week.stage_code) then
    raise exception 'ครูไม่ได้อยู่ในช่วงชั้นของสัปดาห์นี้';
  end if;

  return query
  select te.id,
         (v_week.week_start + (te.weekday::int - 1))::date,
         te.weekday,
         per.period_no,
         coalesce(per.label,'คาบ '||per.period_no),
         per.start_time,
         per.end_time,
         subj.id,
         subj.subject_name,
         sc.id,
         sc.level_name||'/'||sc.room_name
  from public.timetable_entries te
  join public.timetable_profiles tp on tp.id=te.timetable_id and tp.status='published'
  join public.timetable_periods per on per.id=te.period_id and not per.is_break
  join public.teaching_assignments ta on ta.id=te.assignment_id and ta.is_active
  join public.academic_subjects subj on subj.id=ta.subject_id
  join public.school_classes sc on sc.id=ta.class_id and sc.id=tp.class_id
  where ta.teacher_id=p_teacher_id
    and sc.academic_year=v_week.academic_year
    and sc.semester=v_week.semester
    and sc.stage_code=v_week.stage_code
    and sc.is_active
    and private.academic_date_in_calendar(v_week.academic_year,v_week.semester,(v_week.week_start + (te.weekday::int - 1))::date)
  order by te.weekday, per.period_no, sc.sort_order;
end;
$$;

create or replace function public.save_academic_supervision_slot(
  p_week_id uuid,
  p_teacher_id uuid,
  p_timetable_entry_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_week public.academic_supervision_weeks%rowtype;
  v_entry record;
  v_slot_id uuid;
  v_event_date date;
  v_teacher_name text;
begin
  if not private.can_manage_academic_supervision() then raise exception 'ไม่มีสิทธิ์จัดคาบนิเทศ'; end if;
  select * into v_week from public.academic_supervision_weeks where id=p_week_id;
  if not found then raise exception 'ไม่พบสัปดาห์นิเทศ'; end if;

  select te.weekday, per.period_no, coalesce(per.label,'คาบ '||per.period_no) period_label,
         per.start_time, per.end_time, subj.id subject_id, subj.subject_name,
         sc.id class_id, sc.level_name||'/'||sc.room_name class_label,
         ta.teacher_id
    into v_entry
  from public.timetable_entries te
  join public.timetable_profiles tp on tp.id=te.timetable_id and tp.status='published'
  join public.timetable_periods per on per.id=te.period_id and not per.is_break
  join public.teaching_assignments ta on ta.id=te.assignment_id and ta.is_active
  join public.academic_subjects subj on subj.id=ta.subject_id
  join public.school_classes sc on sc.id=ta.class_id and sc.id=tp.class_id
  where te.id=p_timetable_entry_id
    and ta.teacher_id=p_teacher_id
    and sc.academic_year=v_week.academic_year
    and sc.semester=v_week.semester
    and sc.stage_code=v_week.stage_code
    and sc.is_active;

  if not found then raise exception 'คาบนี้ไม่ใช่คาบสอนที่ใช้ได้สำหรับครู/ช่วงชั้นนี้'; end if;
  v_event_date := (v_week.week_start + (v_entry.weekday::int - 1))::date;
  if not private.academic_date_in_calendar(v_week.academic_year,v_week.semester,v_event_date) then
    raise exception 'วันที่นิเทศอยู่นอกช่วงปฏิทิน 100 วัน';
  end if;

  insert into public.academic_supervision_slots(
    week_id,teacher_id,timetable_entry_id,event_date,weekday,period_no,period_label,start_time,end_time,
    subject_id,subject_name,class_id,class_label,note,status,created_by,updated_by
  ) values (
    p_week_id,p_teacher_id,p_timetable_entry_id,v_event_date,v_entry.weekday,v_entry.period_no,v_entry.period_label,
    v_entry.start_time,v_entry.end_time,v_entry.subject_id,v_entry.subject_name,v_entry.class_id,v_entry.class_label,
    nullif(trim(coalesce(p_note,'')),''),'scheduled',auth.uid(),auth.uid()
  )
  on conflict (week_id,teacher_id) do update set
    timetable_entry_id=excluded.timetable_entry_id,
    event_date=excluded.event_date,
    weekday=excluded.weekday,
    period_no=excluded.period_no,
    period_label=excluded.period_label,
    start_time=excluded.start_time,
    end_time=excluded.end_time,
    subject_id=excluded.subject_id,
    subject_name=excluded.subject_name,
    class_id=excluded.class_id,
    class_label=excluded.class_label,
    note=excluded.note,
    status='scheduled',
    updated_at=now(),
    updated_by=auth.uid()
  returning id into v_slot_id;

  select coalesce(full_name,email,'ครู') into v_teacher_name from public.profiles where id=p_teacher_id;
  insert into public.notifications(recipient_id,type,title,message,entity_type,entity_id,action_url)
  values (
    p_teacher_id,
    'academic_supervision',
    'แจ้งกำหนดนิเทศการสอน',
    'กำหนดนิเทศวันที่ '||extract(day from v_event_date)::int||'/'||extract(month from v_event_date)::int||'/'||(extract(year from v_event_date)::int+543)||
      ' '||v_entry.period_label||' · '||v_entry.subject_name||' · '||v_entry.class_label,
    'academic_supervision_slot',
    v_slot_id,
    '/academic/calendar?section=supervision'
  );

  return v_slot_id;
end;
$$;

create or replace function public.get_academic_period_options(
  p_academic_year text,
  p_semester integer,
  p_stage_code text
)
returns table(period_no integer, period_label text, start_time time, end_time time)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select per.period_no,
         coalesce(max(per.label),'คาบ '||per.period_no),
         min(per.start_time),
         max(per.end_time)
  from public.timetable_periods per
  join public.timetable_profiles tp on tp.id=per.timetable_id and tp.status='published'
  join public.school_classes sc on sc.id=tp.class_id
  where sc.academic_year=p_academic_year and sc.semester=p_semester
    and sc.stage_code=p_stage_code and sc.is_active and not per.is_break
  group by per.period_no
  order by per.period_no;
$$;

create or replace function public.save_academic_plc_plan(
  p_plan_id uuid,
  p_academic_year text,
  p_semester integer,
  p_stage_code text,
  p_recurrence_type text,
  p_weekday smallint,
  p_period_no integer,
  p_start_date date,
  p_end_date date,
  p_event_dates date[],
  p_title text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_plan_id uuid;
  v_calendar_start date;
  v_calendar_end date;
  v_period record;
  v_date date;
  v_dates date[] := '{}';
begin
  if not private.can_manage_academic_plc() then raise exception 'ไม่มีสิทธิ์จัดปฏิทิน PLC'; end if;
  if p_recurrence_type not in ('weekly','custom') then raise exception 'รูปแบบ PLC ไม่ถูกต้อง'; end if;

  select c.start_date, private.academic_calendar_end_date(p_academic_year,p_semester)
    into v_calendar_start,v_calendar_end
  from public.academic_calendars c
  where c.academic_year=p_academic_year and c.semester=p_semester
  limit 1;
  if v_calendar_start is null or v_calendar_end is null then raise exception 'ต้องมีปฏิทิน 100 วันก่อนกำหนด PLC'; end if;

  select * into v_period
  from public.get_academic_period_options(p_academic_year,p_semester,p_stage_code)
  where period_no=p_period_no
  limit 1;
  if not found then raise exception 'ไม่พบคาบเรียนของช่วงชั้นนี้ในตารางสอนที่ประกาศใช้'; end if;

  if p_recurrence_type='weekly' then
    if p_weekday is null or p_weekday not between 1 and 7 then raise exception 'กรุณาเลือกวันของสัปดาห์'; end if;
    if p_start_date is null or p_end_date is null or p_start_date>p_end_date then raise exception 'ช่วงวันที่ PLC ไม่ถูกต้อง'; end if;
    if p_start_date < v_calendar_start or p_end_date > v_calendar_end then raise exception 'ช่วงวันที่ PLC ต้องอยู่ภายในปฏิทิน 100 วัน'; end if;
    select coalesce(array_agg(gs::date order by gs), '{}') into v_dates
    from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') gs
    where extract(isodow from gs)::int=p_weekday;
  else
    if p_event_dates is null or cardinality(p_event_dates)=0 then raise exception 'กรุณาเลือกวันที่ PLC อย่างน้อย 1 วัน'; end if;
    select coalesce(array_agg(distinct d order by d),'{}') into v_dates from unnest(p_event_dates) d;
    if exists(select 1 from unnest(v_dates) d where d<v_calendar_start or d>v_calendar_end) then
      raise exception 'วันที่ PLC ต้องอยู่ภายในปฏิทิน 100 วัน';
    end if;
  end if;

  if p_plan_id is null then
    insert into public.academic_plc_plans(
      academic_year,semester,stage_code,recurrence_type,weekday,period_no,period_label,start_time,end_time,
      start_date,end_date,title,note,created_by,updated_by
    ) values (
      p_academic_year,p_semester,p_stage_code,p_recurrence_type,case when p_recurrence_type='weekly' then p_weekday else null end,
      p_period_no,v_period.period_label,v_period.start_time,v_period.end_time,
      case when p_recurrence_type='weekly' then p_start_date else (select min(d) from unnest(v_dates) d) end,
      case when p_recurrence_type='weekly' then p_end_date else (select max(d) from unnest(v_dates) d) end,
      coalesce(nullif(trim(coalesce(p_title,'')),''),'PLC'),nullif(trim(coalesce(p_note,'')),''),auth.uid(),auth.uid()
    ) returning id into v_plan_id;
  else
    update public.academic_plc_plans set
      academic_year=p_academic_year,semester=p_semester,stage_code=p_stage_code,recurrence_type=p_recurrence_type,
      weekday=case when p_recurrence_type='weekly' then p_weekday else null end,
      period_no=p_period_no,period_label=v_period.period_label,start_time=v_period.start_time,end_time=v_period.end_time,
      start_date=case when p_recurrence_type='weekly' then p_start_date else (select min(d) from unnest(v_dates) d) end,
      end_date=case when p_recurrence_type='weekly' then p_end_date else (select max(d) from unnest(v_dates) d) end,
      title=coalesce(nullif(trim(coalesce(p_title,'')),''),'PLC'),note=nullif(trim(coalesce(p_note,'')),''),
      is_active=true,updated_at=now(),updated_by=auth.uid()
    where id=p_plan_id
    returning id into v_plan_id;
    if v_plan_id is null then raise exception 'ไม่พบรายการ PLC ที่ต้องการแก้ไข'; end if;
    delete from public.academic_plc_sessions where plan_id=v_plan_id;
  end if;

  insert into public.academic_plc_sessions(plan_id,event_date)
  select v_plan_id,d from unnest(v_dates) d
  on conflict(plan_id,event_date) do nothing;

  return v_plan_id;
end;
$$;

revoke all on function private.can_manage_academic_supervision() from public, anon;
grant execute on function private.can_manage_academic_supervision() to authenticated;
revoke all on function private.can_manage_academic_plc() from public, anon;
grant execute on function private.can_manage_academic_plc() to authenticated;
revoke all on function private.user_in_academic_stage(uuid,text,integer,text) from public, anon;
grant execute on function private.user_in_academic_stage(uuid,text,integer,text) to authenticated;
revoke all on function private.academic_calendar_end_date(text,integer) from public, anon;
grant execute on function private.academic_calendar_end_date(text,integer) to authenticated;
revoke all on function private.academic_date_in_calendar(text,integer,date) from public, anon;
grant execute on function private.academic_date_in_calendar(text,integer,date) to authenticated;

revoke all on function public.get_academic_stage_teachers(text,integer,text) from public, anon;
grant execute on function public.get_academic_stage_teachers(text,integer,text) to authenticated;
revoke all on function public.get_my_academic_stages(text,integer) from public, anon;
grant execute on function public.get_my_academic_stages(text,integer) to authenticated;
revoke all on function public.get_supervision_teacher_slots(uuid,uuid) from public, anon;
grant execute on function public.get_supervision_teacher_slots(uuid,uuid) to authenticated;
revoke all on function public.save_academic_supervision_slot(uuid,uuid,uuid,text) from public, anon;
grant execute on function public.save_academic_supervision_slot(uuid,uuid,uuid,text) to authenticated;
revoke all on function public.get_academic_period_options(text,integer,text) from public, anon;
grant execute on function public.get_academic_period_options(text,integer,text) to authenticated;
revoke all on function public.save_academic_plc_plan(uuid,text,integer,text,text,smallint,integer,date,date,date[],text,text) from public, anon;
grant execute on function public.save_academic_plc_plan(uuid,text,integer,text,text,smallint,integer,date,date,date[],text,text) to authenticated;

-- Final V10.8 adjustment: allow assigning a supervision week by stage before semester class/timetable data is ready.
create or replace function private.validate_academic_supervision_week()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_start date; v_end date;
begin
  select c.start_date,private.academic_calendar_end_date(new.academic_year,new.semester)
    into v_start,v_end
  from public.academic_calendars c
  where c.academic_year=new.academic_year and c.semester=new.semester
  limit 1;
  if v_start is null or v_end is null then
    raise exception 'ต้องมีปฏิทิน 100 วันของปีการศึกษา/ภาคเรียนนี้ก่อน';
  end if;
  if new.week_start>v_end or (new.week_start+4)<v_start then
    raise exception 'สัปดาห์นิเทศอยู่นอกช่วงปฏิทิน 100 วัน';
  end if;
  new.updated_at=now();
  return new;
end;
$$;

create or replace function public.get_academic_stage_teachers(p_academic_year text,p_semester integer,p_stage_code text)
returns table(teacher_id uuid,full_name text)
language sql stable security definer set search_path=pg_catalog,public,private
as $$
  select p.id,coalesce(p.full_name,p.email,'ไม่ระบุชื่อ')
  from public.profiles p
  where private.is_active_user()
    and p.account_status='active'
    and p.deleted_at is null
    and private.user_in_academic_stage(p.id,p_academic_year,p_semester,p_stage_code)
  order by coalesce(p.full_name,p.email,'');
$$;

create or replace function public.get_my_academic_stages(p_academic_year text,p_semester integer)
returns table(stage_code text)
language sql stable security definer set search_path=pg_catalog,public,private
as $$
  select distinct sc.stage_code
  from public.school_classes sc
  where private.is_active_user()
    and sc.academic_year=p_academic_year
    and sc.semester=p_semester
    and sc.is_active
    and private.user_in_academic_stage(auth.uid(),p_academic_year,p_semester,sc.stage_code)
  order by sc.stage_code;
$$;

create or replace function public.get_academic_period_options(p_academic_year text,p_semester integer,p_stage_code text)
returns table(period_no integer,period_label text,start_time time,end_time time)
language sql stable security definer set search_path=pg_catalog,public,private
as $$
  select per.period_no,coalesce(max(per.label),'คาบ '||per.period_no),min(per.start_time),max(per.end_time)
  from public.timetable_periods per
  join public.timetable_profiles tp on tp.id=per.timetable_id and tp.status='published'
  join public.school_classes sc on sc.id=tp.class_id
  where private.is_active_user()
    and sc.academic_year=p_academic_year
    and sc.semester=p_semester
    and sc.stage_code=p_stage_code
    and sc.is_active
    and not per.is_break
  group by per.period_no
  order by per.period_no;
$$;
