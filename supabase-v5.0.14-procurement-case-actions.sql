begin;

-- v5.0.14
-- Procurement case cancel/delete actions.
-- "Delete" is implemented as a safe soft-delete so previously issued control numbers
-- stay linked to their original case and cannot silently return to the available pool.

alter table public.procurement_document_cases
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
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
  check (status = any (array['draft'::text,'ready'::text,'processing'::text,'completed'::text,'cancelled'::text,'deleted'::text]));

create or replace function public.cancel_procurement_document_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_case public.procurement_document_cases;
  v_manager boolean := false;
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

  v_manager := private.can_manage_procurement_documents();
  if not v_manager and v_case.created_by is distinct from v_uid then
    raise exception 'ไม่มีสิทธิ์ยกเลิกรายการนี้';
  end if;

  update public.procurement_document_cases
  set status='cancelled',
      updated_by=v_uid,
      updated_at=now()
  where id=v_case.id;

  return jsonb_build_object(
    'id',v_case.id,
    'status','cancelled'
  );
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
  v_manager boolean := false;
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

  v_manager := private.can_manage_procurement_documents();
  if not v_manager then
    if v_case.created_by is distinct from v_uid
       or v_case.status not in ('draft','cancelled') then
      raise exception 'ผู้สร้างลบได้เฉพาะฉบับร่างหรือรายการที่ยกเลิกแล้ว';
    end if;
  end if;

  -- Keep the row and every control FK intact. This is deliberate: issued control
  -- numbers remain reserved and audit history is not broken by deleting a case.
  update public.procurement_document_cases
  set status='deleted',
      deleted_at=now(),
      deleted_by=v_uid,
      updated_by=v_uid,
      updated_at=now()
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

notify pgrst, 'reload schema';
commit;
