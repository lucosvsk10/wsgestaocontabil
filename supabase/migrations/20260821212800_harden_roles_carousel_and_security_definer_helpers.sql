create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Internal SECURITY DEFINER helpers must not be exposed as public RPC endpoints.
alter function public.foldername(text) set schema private;
alter function public.get_user_company_id() set schema private;
alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_admin() set schema private;
alter function public.is_any_admin(uuid) set schema private;
alter function public.is_user_admin() set schema private;

-- The legacy users.role column is no longer authoritative for admin access.
create or replace function private.is_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'::public.app_role
  );
$$;

-- Read the stored legacy role without recursively evaluating users RLS.
create or replace function private.current_user_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

revoke all on function private.current_user_profile_role() from public;
grant execute on function private.current_user_profile_role() to authenticated, service_role;

-- Self-service profile creation can never assign an elevated legacy role.
drop policy if exists "Users can only insert their own profile" on public.users;
create policy "Users can only insert their own profile"
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  and coalesce(role, 'client') = 'client'
);

-- Users can edit their own profile fields, but cannot change the legacy role value.
drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role is not distinct from private.current_user_profile_role()
);

-- Remove obsolete carousel write policies that allowed every signed-in user to mutate assets.
drop policy if exists "Allow authenticated users to upload carousel logos" on storage.objects;
drop policy if exists "Allow authenticated users to delete carousel logos" on storage.objects;
