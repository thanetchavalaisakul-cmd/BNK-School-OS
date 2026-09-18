-- BNK School OS V10.9.0 - Academic Registration / Student Transfer Request

-- 1) Module registration ----------------------------------------------------
update public.modules set sort_order = 7 where code = 'student_cards' and sort_order = 6;

insert into public.modules (department_id, code, name_th, name_en, route, sort_order, is_active)
select d.id, 'academic_registration', 'ระบบงานทะเบียนวิชาการ', 'Academic Registration', '/academic/registration', 6, true
from public.departments d
where d.code = 'academic'
  and not exists (select 1 from public.modules m where m.code = 'academic_registration');

update public.modules
set name_th='ระบบงานทะเบียนวิชาการ', name_en='Academic Registration', route='/academic/registration', sort_order=6, is_active=true
where code='academic_registration';

-- 2) Core tables ------------------------------------------------------------
create table if not exists public.academic_transfer_request_counters (
  academic_year text primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique,
  academic_year text not null,
  semester integer not null check (semester between 1 and 3),
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid references public.school_classes(id) on delete set null,
  student_number integer,
  request_date date not null default current_date,
  guardian_name text not null,
  student_name text not null,
  class_label text not null,
  student_code text not null,
  birth_date date not null,
  citizen_id text not null,
  father_name text,
  mother_name text,
  contact_phone text not null,
  reason_type text not null check (reason_type in ('continue_study','other')),
  destination_school text,
  destination_district text,
  destination_province text,
  other_reason text,
  transfer_date date not null,
  applicant_name text not null,
  applicant_role text not null default 'guardian' check (applicant_role in ('guardian','homeroom_teacher','other')),
  evidence_photo boolean not null default false,
  evidence_birth_certificate boolean not null default false,
  evidence_house_registration boolean not null default false,
  evidence_parent_id boolean not null default false,
  evidence_phone boolean not null default false,
  evidence_other boolean not null default false,
  evidence_other_note text,
  finance_status text not null default 'pending' check (finance_status in ('pending','paid','due')),
  finance_amount_due numeric(12,2),
  registrar_decision text not null default 'pending' check (registrar_decision in ('pending','approve','reject')),
  registrar_reason text,
  assessment_decision text not null default 'pending' check (assessment_decision in ('pending','approve','reject')),
  assessment_reason text,
  director_decision text not null default 'pending' check (director_decision in ('pending','approve','reject')),
  director_reason text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id) on delete set null,
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_transfer_destination_required check (
    reason_type <> 'continue_study'
    or (nullif(btrim(destination_school),'') is not null)
  ),
  constraint academic_transfer_other_reason_required check (
    reason_type <> 'other'
    or (nullif(btrim(other_reason),'') is not null)
  )
);

create table if not exists public.academic_transfer_request_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.academic_transfer_requests(id) on delete cascade,
  bucket text not null default 'academic-registration',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint academic_transfer_request_files_pdf check (mime_type = 'application/pdf')
);

create index if not exists academic_transfer_requests_student_idx on public.academic_transfer_requests(student_id);
create index if not exists academic_transfer_requests_class_idx on public.academic_transfer_requests(class_id);
create index if not exists academic_transfer_requests_created_by_idx on public.academic_transfer_requests(created_by);
create index if not exists academic_transfer_requests_submitted_by_idx on public.academic_transfer_requests(submitted_by);
create index if not exists academic_transfer_requests_finalized_by_idx on public.academic_transfer_requests(finalized_by);
create index if not exists academic_transfer_requests_period_idx on public.academic_transfer_requests(academic_year,semester,status);
create index if not exists academic_transfer_request_files_request_idx on public.academic_transfer_request_files(request_id,sort_order);
create index if not exists academic_transfer_request_files_created_by_idx on public.academic_transfer_request_files(created_by);

-- 3) Authorization helpers --------------------------------------------------
create or replace function private.can_manage_academic_registration()
returns boolean
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select private.is_active_user()
    and (private.is_super_admin() or private.is_department_head_of('academic'));
$$;

create or replace function private.can_create_transfer_request(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select private.is_active_user()
    and (private.can_manage_academic_registration() or private.can_view_student(p_student_id));
$$;

create or replace function private.can_view_transfer_request(p_request_id uuid)
returns boolean
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select private.is_active_user() and exists (
    select 1
    from public.academic_transfer_requests r
    where r.id=p_request_id
      and (
        private.can_manage_academic_registration()
        or r.created_by=auth.uid()
        or private.can_view_student(r.student_id)
      )
  );
$$;

create or replace function private.can_edit_transfer_request(p_request_id uuid)
returns boolean
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select private.is_active_user() and exists (
    select 1
    from public.academic_transfer_requests r
    where r.id=p_request_id
      and (
        private.can_manage_academic_registration()
        or (r.created_by=auth.uid() and r.status='draft')
      )
  );
$$;

revoke all on function private.can_manage_academic_registration() from public,anon;
revoke all on function private.can_create_transfer_request(uuid) from public,anon;
revoke all on function private.can_view_transfer_request(uuid) from public,anon;
revoke all on function private.can_edit_transfer_request(uuid) from public,anon;
grant execute on function private.can_manage_academic_registration() to authenticated;
grant execute on function private.can_create_transfer_request(uuid) to authenticated;
grant execute on function private.can_view_transfer_request(uuid) to authenticated;
grant execute on function private.can_edit_transfer_request(uuid) to authenticated;

-- 4) Request code + updated_at triggers ------------------------------------
create or replace function private.assign_academic_transfer_request_code()
returns trigger
language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_num integer;
begin
  if new.request_code is not null and btrim(new.request_code) <> '' then
    return new;
  end if;
  insert into public.academic_transfer_request_counters(academic_year,last_number,updated_at)
  values(new.academic_year,1,now())
  on conflict(academic_year) do update
    set last_number=public.academic_transfer_request_counters.last_number+1,
        updated_at=now()
  returning last_number into v_num;
  new.request_code := 'TR-' || new.academic_year || '-' || lpad(v_num::text,5,'0');
  return new;
end;
$$;

create or replace function private.touch_academic_transfer_request()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_academic_transfer_request_code on public.academic_transfer_requests;
create trigger trg_academic_transfer_request_code
before insert on public.academic_transfer_requests
for each row execute function private.assign_academic_transfer_request_code();

drop trigger if exists trg_academic_transfer_request_touch on public.academic_transfer_requests;
create trigger trg_academic_transfer_request_touch
before update on public.academic_transfer_requests
for each row execute function private.touch_academic_transfer_request();

-- 5) RLS --------------------------------------------------------------------
alter table public.academic_transfer_requests enable row level security;
alter table public.academic_transfer_request_files enable row level security;
alter table public.academic_transfer_request_counters enable row level security;

-- counters are internal only; no direct authenticated policies.

drop policy if exists academic_transfer_requests_select_scope on public.academic_transfer_requests;
create policy academic_transfer_requests_select_scope
on public.academic_transfer_requests for select to authenticated
using ((select private.can_view_transfer_request(id)));

drop policy if exists academic_transfer_requests_insert_scope on public.academic_transfer_requests;
create policy academic_transfer_requests_insert_scope
on public.academic_transfer_requests for insert to authenticated
with check (
  created_by=(select auth.uid())
  and (select private.can_create_transfer_request(student_id))
);

drop policy if exists academic_transfer_requests_update_scope on public.academic_transfer_requests;
create policy academic_transfer_requests_update_scope
on public.academic_transfer_requests for update to authenticated
using ((select private.can_edit_transfer_request(id)))
with check ((select private.can_edit_transfer_request(id)));

drop policy if exists academic_transfer_requests_delete_scope on public.academic_transfer_requests;
create policy academic_transfer_requests_delete_scope
on public.academic_transfer_requests for delete to authenticated
using ((select private.can_edit_transfer_request(id)) and status='draft');

drop policy if exists academic_transfer_files_select_scope on public.academic_transfer_request_files;
create policy academic_transfer_files_select_scope
on public.academic_transfer_request_files for select to authenticated
using ((select private.can_view_transfer_request(request_id)));

drop policy if exists academic_transfer_files_insert_scope on public.academic_transfer_request_files;
create policy academic_transfer_files_insert_scope
on public.academic_transfer_request_files for insert to authenticated
with check (
  created_by=(select auth.uid())
  and (select private.can_edit_transfer_request(request_id))
);

drop policy if exists academic_transfer_files_update_scope on public.academic_transfer_request_files;
create policy academic_transfer_files_update_scope
on public.academic_transfer_request_files for update to authenticated
using ((select private.can_edit_transfer_request(request_id)))
with check ((select private.can_edit_transfer_request(request_id)));

drop policy if exists academic_transfer_files_delete_scope on public.academic_transfer_request_files;
create policy academic_transfer_files_delete_scope
on public.academic_transfer_request_files for delete to authenticated
using ((select private.can_edit_transfer_request(request_id)));

-- 6) Student selector RPC ----------------------------------------------------
create or replace function public.get_transfer_request_student_options(
  p_academic_year text,
  p_semester integer
)
returns table(
  student_id uuid,
  class_id uuid,
  student_number integer,
  student_code text,
  citizen_id text,
  prefix text,
  first_name text,
  last_name text,
  gender text,
  birth_date date,
  guardian_name text,
  father_name text,
  mother_name text,
  class_label text,
  academic_year text,
  semester integer
)
language sql stable security definer
set search_path=pg_catalog,public,private
as $$
  select
    s.id,
    sc.id,
    e.student_number,
    s.student_code,
    s.citizen_id,
    s.prefix,
    s.first_name,
    s.last_name,
    s.gender,
    s.birth_date,
    nullif(btrim(concat_ws(' ',s.guardian_prefix,s.guardian_first_name,s.guardian_last_name)),''),
    nullif(btrim(concat_ws(' ',s.father_prefix,s.father_first_name,s.father_last_name)),''),
    nullif(btrim(concat_ws(' ',s.mother_prefix,s.mother_first_name,s.mother_last_name)),''),
    sc.level_name || '/' || sc.room_name,
    e.academic_year,
    e.semester
  from public.student_enrollments e
  join public.students s on s.id=e.student_id
  join public.school_classes sc on sc.id=e.class_id
  where private.is_active_user()
    and e.enrollment_status='active'
    and e.academic_year=p_academic_year
    and e.semester=p_semester
    and (private.can_manage_academic_registration() or private.can_view_student(s.id))
  order by sc.sort_order,
           case when lower(coalesce(s.gender,'')) in ('male','m','ชาย') then 0 when lower(coalesce(s.gender,'')) in ('female','f','หญิง') then 1 else 2 end,
           case when s.student_code ~ '^[0-9]+$' then s.student_code::integer else 999999999 end,
           s.student_code;
$$;

revoke all on function public.get_transfer_request_student_options(text,integer) from public,anon;
grant execute on function public.get_transfer_request_student_options(text,integer) to authenticated;

-- 7) Submit RPC --------------------------------------------------------------
create or replace function public.submit_academic_transfer_request(p_request_id uuid)
returns public.academic_transfer_requests
language plpgsql security definer
set search_path=pg_catalog,public,private
as $$
declare v_row public.academic_transfer_requests;
begin
  if not private.can_edit_transfer_request(p_request_id) then
    raise exception 'ไม่มีสิทธิ์ยื่นคำร้องรายการนี้';
  end if;
  update public.academic_transfer_requests
  set status='submitted', submitted_at=now(), submitted_by=auth.uid(), updated_by=auth.uid()
  where id=p_request_id and status='draft'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'ยื่นคำร้องได้เฉพาะรายการที่เป็นแบบร่าง';
  end if;
  return v_row;
end;
$$;

revoke all on function public.submit_academic_transfer_request(uuid) from public,anon;
grant execute on function public.submit_academic_transfer_request(uuid) to authenticated;

-- 8) Storage bucket + path authorization ------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academic-registration','academic-registration',false,26214400,array['application/pdf']::text[])
on conflict(id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.academic_registration_request_id_from_path(p_name text)
returns uuid
language plpgsql stable security definer
set search_path=pg_catalog,public,storage,private
as $$
declare v text;
begin
  v := (storage.foldername(p_name))[2];
  if v is null then return null; end if;
  return v::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function private.academic_registration_request_id_from_path(text) from public,anon;
grant execute on function private.academic_registration_request_id_from_path(text) to authenticated;

drop policy if exists academic_registration_files_select on storage.objects;
create policy academic_registration_files_select
on storage.objects for select to authenticated
using (
  bucket_id='academic-registration'
  and (select private.can_view_transfer_request(private.academic_registration_request_id_from_path(name)))
);

drop policy if exists academic_registration_files_insert on storage.objects;
create policy academic_registration_files_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='academic-registration'
  and lower(storage.extension(name))='pdf'
  and (select private.can_edit_transfer_request(private.academic_registration_request_id_from_path(name)))
);

drop policy if exists academic_registration_files_update on storage.objects;
create policy academic_registration_files_update
on storage.objects for update to authenticated
using (
  bucket_id='academic-registration'
  and (select private.can_edit_transfer_request(private.academic_registration_request_id_from_path(name)))
)
with check (
  bucket_id='academic-registration'
  and lower(storage.extension(name))='pdf'
  and (select private.can_edit_transfer_request(private.academic_registration_request_id_from_path(name)))
);

drop policy if exists academic_registration_files_delete on storage.objects;
create policy academic_registration_files_delete
on storage.objects for delete to authenticated
using (
  bucket_id='academic-registration'
  and (select private.can_edit_transfer_request(private.academic_registration_request_id_from_path(name)))
);

-- Covering index for updated_by FK (added after advisor check)
create index if not exists academic_transfer_requests_updated_by_idx
on public.academic_transfer_requests(updated_by);
