-- BNK School OS v5.0.15
-- Procurement Shared Workspace permissions.
-- Run AFTER v5.0.13. This file also includes the v5.0.14 case cancel/delete DB changes,
-- so users who have not yet run v5.0.14 SQL may run this v5.0.15 file directly after v5.0.13.
-- The package does NOT apply this migration automatically.

begin;

-- -----------------------------------------------------------------------------
-- 1) Preserve the v5.0.14 safe cancel/delete schema in an idempotent form.
-- -----------------------------------------------------------------------------
alter table public.procurement_document_cases
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.procurement_document_cases'::regclass
      and conname='procurement_document_cases_deleted_by_fkey'
  ) then
    alter table public.procurement_document_cases
      add constraint procurement_document_cases_deleted_by_fkey
      foreign key (deleted_by) references public.profiles(id) on delete set null;
  end if;
end $$;

alter table public.procurement_document_cases
  drop constraint if exists procurement_document_cases_status_check;

alter table public.procurement_document_cases
  add constraint procurement_document_cases_status_check
  check (status = any (array[
    'draft'::text,
    'ready'::text,
    'processing'::text,
    'completed'::text,
    'cancelled'::text,
    'deleted'::text
  ]));

-- -----------------------------------------------------------------------------
-- 2) Full module access = full operator access inside that Procurement module.
--    Only the permission-administration table remains Super-Admin-only.
-- -----------------------------------------------------------------------------
create or replace function private.can_manage_procurement_documents()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select private.has_procurement_module_access('documents');
$$;

create or replace function private.can_manage_procurement_control_settings()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select private.has_procurement_module_access('control');
$$;

revoke all on function private.can_manage_procurement_documents() from public,anon;
revoke all on function private.can_manage_procurement_control_settings() from public,anon;
grant execute on function private.can_manage_procurement_documents() to authenticated;
grant execute on function private.can_manage_procurement_control_settings() to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Document Builder is a shared school workspace.
--    Any user granted the documents module sees and operates on the same cases.
-- -----------------------------------------------------------------------------
alter table public.procurement_document_cases enable row level security;

grant select,insert,update on table public.procurement_document_cases to authenticated;
revoke delete on table public.procurement_document_cases from authenticated;
revoke all on table public.procurement_document_cases from anon;

drop policy if exists procurement_document_cases_select on public.procurement_document_cases;
drop policy if exists procurement_document_cases_insert on public.procurement_document_cases;
drop policy if exists procurement_document_cases_update on public.procurement_document_cases;
drop policy if exists procurement_document_cases_delete on public.procurement_document_cases;

create policy procurement_document_cases_select
on public.procurement_document_cases
for select
to authenticated
using ((select private.has_procurement_module_access('documents')));

create policy procurement_document_cases_insert
on public.procurement_document_cases
for insert
to authenticated
with check (
  (select private.has_procurement_module_access('documents'))
  and (select private.is_active_user())
  and created_by=(select auth.uid())
  and status='draft'
  and deleted_at is null
  and deleted_by is null
);

create policy procurement_document_cases_update
on public.procurement_document_cases
for update
to authenticated
using (
  (select private.has_procurement_module_access('documents'))
  and status <> 'deleted'
)
with check (
  (select private.has_procurement_module_access('documents'))
  and (select private.is_active_user())
  and status <> 'deleted'
  and deleted_at is null
  and deleted_by is null
);

-- Deliberately no direct DELETE policy. The UI uses the safe-delete RPC below so
-- issued control numbers remain reserved and audit history stays intact.

-- -----------------------------------------------------------------------------
-- 4) Shared Procurement master data. Every authorized documents-module user may
--    maintain the same vendors, item catalog and system settings.
-- -----------------------------------------------------------------------------
alter table public.procurement_vendors enable row level security;
alter table public.procurement_item_catalog enable row level security;
alter table public.procurement_system_settings enable row level security;

grant select,insert,update,delete on table public.procurement_vendors to authenticated;
grant select,insert,update,delete on table public.procurement_item_catalog to authenticated;
grant select,insert,update on table public.procurement_system_settings to authenticated;
revoke all on table public.procurement_vendors from anon;
revoke all on table public.procurement_item_catalog from anon;
revoke all on table public.procurement_system_settings from anon;

drop policy if exists procurement_vendors_select on public.procurement_vendors;
drop policy if exists procurement_vendors_write on public.procurement_vendors;
create policy procurement_vendors_select
on public.procurement_vendors
for select to authenticated
using ((select private.has_procurement_module_access('documents')));
create policy procurement_vendors_write
on public.procurement_vendors
for all to authenticated
using ((select private.has_procurement_module_access('documents')))
with check ((select private.has_procurement_module_access('documents')));

drop policy if exists procurement_items_select on public.procurement_item_catalog;
drop policy if exists procurement_items_write on public.procurement_item_catalog;
create policy procurement_items_select
on public.procurement_item_catalog
for select to authenticated
using ((select private.has_procurement_module_access('documents')));
create policy procurement_items_write
on public.procurement_item_catalog
for all to authenticated
using ((select private.has_procurement_module_access('documents')))
with check ((select private.has_procurement_module_access('documents')));

drop policy if exists procurement_system_settings_select on public.procurement_system_settings;
drop policy if exists procurement_system_settings_insert on public.procurement_system_settings;
drop policy if exists procurement_system_settings_update on public.procurement_system_settings;
create policy procurement_system_settings_select
on public.procurement_system_settings
for select to authenticated
using ((select private.has_procurement_module_access('documents')));
create policy procurement_system_settings_insert
on public.procurement_system_settings
for insert to authenticated
with check ((select private.has_procurement_module_access('documents')));
create policy procurement_system_settings_update
on public.procurement_system_settings
for update to authenticated
using ((select private.has_procurement_module_access('documents')))
with check ((select private.has_procurement_module_access('documents')));

-- -----------------------------------------------------------------------------
-- 5) Safe case actions. Ownership is NOT used as an authorization boundary.
--    If a user has the documents module, the case is shared and actionable.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_procurement_document_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_case public.procurement_document_cases;
begin
  if v_uid is null or not private.has_procurement_module_access('documents') then
    raise exception 'permission denied';
  end if;

  select * into v_case
  from public.procurement_document_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'ไม่พบรายการจัดซื้อจัดจ้าง';
  end if;

  if v_case.status='deleted' then
    raise exception 'รายการนี้ถูกลบแล้ว';
  end if;

  if v_case.status='cancelled' then
    return jsonb_build_object('id',v_case.id,'status','cancelled','already_cancelled',true);
  end if;

  update public.procurement_document_cases
  set status='cancelled',
      updated_by=v_uid,
      updated_at=clock_timestamp()
  where id=v_case.id;

  return jsonb_build_object('id',v_case.id,'status','cancelled');
end;
$$;

create or replace function public.delete_procurement_document_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_case public.procurement_document_cases;
begin
  if v_uid is null or not private.has_procurement_module_access('documents') then
    raise exception 'permission denied';
  end if;

  select * into v_case
  from public.procurement_document_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'ไม่พบรายการจัดซื้อจัดจ้าง';
  end if;

  if v_case.status='deleted' then
    return jsonb_build_object('id',v_case.id,'status','deleted','already_deleted',true);
  end if;

  -- Keep the row and all control-number foreign keys intact. This is a safe
  -- delete for the workspace, not a hard database delete.
  update public.procurement_document_cases
  set status='deleted',
      deleted_at=clock_timestamp(),
      deleted_by=v_uid,
      updated_by=v_uid,
      updated_at=clock_timestamp()
  where id=v_case.id;

  return jsonb_build_object(
    'id',v_case.id,
    'status','deleted',
    'kept_control_links',true
  );
end;
$$;

revoke all on function public.cancel_procurement_document_case(uuid) from public,anon;
revoke all on function public.delete_procurement_document_case(uuid) from public,anon;
grant execute on function public.cancel_procurement_document_case(uuid) to authenticated;
grant execute on function public.delete_procurement_document_case(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Keep permission administration Super-Admin-only. These policies are
--    intentionally reasserted so full module access never means access to grant
--    rights to other users.
-- -----------------------------------------------------------------------------
alter table public.procurement_module_permissions enable row level security;

drop policy if exists procurement_module_permissions_select on public.procurement_module_permissions;
drop policy if exists procurement_module_permissions_insert on public.procurement_module_permissions;
drop policy if exists procurement_module_permissions_update on public.procurement_module_permissions;
drop policy if exists procurement_module_permissions_delete on public.procurement_module_permissions;

create policy procurement_module_permissions_select
on public.procurement_module_permissions
for select
to authenticated
using (
  user_id=(select auth.uid())
  or (select private.is_super_admin())
);

create policy procurement_module_permissions_insert
on public.procurement_module_permissions
for insert
to authenticated
with check ((select private.is_super_admin()));

create policy procurement_module_permissions_update
on public.procurement_module_permissions
for update
to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy procurement_module_permissions_delete
on public.procurement_module_permissions
for delete
to authenticated
using ((select private.is_super_admin()));

-- Refresh PostgREST after replacing functions and policies.
notify pgrst, 'reload schema';

commit;
