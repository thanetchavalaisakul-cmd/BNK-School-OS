-- BNK School OS V10.7.1
-- Fix academic calendar RLS helper EXECUTE privileges.
-- Applied to Supabase project thvusgkxhiwsilipigno.

revoke all on function private.can_manage_academic_calendar() from public, anon;
grant execute on function private.can_manage_academic_calendar() to authenticated;

revoke all on function private.can_view_academic_calendar(uuid) from public, anon;
grant execute on function private.can_view_academic_calendar(uuid) to authenticated;
