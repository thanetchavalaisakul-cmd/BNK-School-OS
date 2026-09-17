-- BNK School OS V10.5 — Homeroom student photo permissions
-- Applied to project ref: thvusgkxhiwsilipigno

create or replace function private.can_manage_student_photo(p_student_id uuid)
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
      join public.school_classes c on c.id = e.class_id
      join public.homeroom_teachers h on h.class_id = e.class_id
      where e.student_id = p_student_id
        and e.enrollment_status = 'active'
        and c.is_active = true
        and h.teacher_id = auth.uid()
        and exists (
          select 1
          from public.academic_terms t
          where t.is_current = true
            and t.academic_year = e.academic_year
            and t.semester = e.semester
        )
    )
  );
$$;

create or replace function public.set_student_photo(p_student_id uuid, p_photo_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.can_manage_student_photo(p_student_id) then
    raise exception 'You do not have permission to manage this student photo';
  end if;

  if nullif(btrim(p_photo_path), '') is null
     or split_part(btrim(p_photo_path), '/', 1) <> p_student_id::text then
    raise exception 'Invalid student photo path';
  end if;

  update public.students
  set photo_bucket = 'student-photos',
      photo_path = btrim(p_photo_path),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_student_id;

  if not found then
    raise exception 'Student not found';
  end if;
end;
$$;

revoke all on function public.set_student_photo(uuid,text) from public, anon;
grant execute on function public.set_student_photo(uuid,text) to authenticated;

drop policy if exists schoolos_student_photos_insert on storage.objects;
drop policy if exists schoolos_student_photos_update on storage.objects;
drop policy if exists schoolos_student_photos_delete on storage.objects;

create policy schoolos_student_photos_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-photos'
  and private.student_photo_student_id(name) is not null
  and (select private.can_manage_student_photo(private.student_photo_student_id(name)))
);

create policy schoolos_student_photos_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-photos'
  and private.student_photo_student_id(name) is not null
  and (select private.can_manage_student_photo(private.student_photo_student_id(name)))
)
with check (
  bucket_id = 'student-photos'
  and private.student_photo_student_id(name) is not null
  and (select private.can_manage_student_photo(private.student_photo_student_id(name)))
);

create policy schoolos_student_photos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-photos'
  and private.student_photo_student_id(name) is not null
  and (select private.can_manage_student_photo(private.student_photo_student_id(name)))
);
