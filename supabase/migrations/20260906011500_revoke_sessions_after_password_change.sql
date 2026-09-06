-- Password resets must invalidate refresh sessions for the affected account.
create or replace function public.revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  removed integer;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from auth.sessions where user_id = p_user_id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
