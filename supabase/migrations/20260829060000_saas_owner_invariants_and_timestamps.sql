create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.is_designated_org_owner(_org_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = _org_id and o.owner_user_id = _user_id
  );
$$;

create or replace function private.guard_organization_owner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    if not (
      auth.uid() = old.owner_user_id
      or private.is_any_admin(auth.uid())
      or current_user in ('postgres','service_role','supabase_admin')
    ) then
      raise exception 'Only the organization owner or platform admin can transfer ownership';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.sync_organization_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    update public.organization_members
      set role = case when role='owner' then 'admin' else role end,
          updated_at = now()
      where organization_id = new.id and user_id = old.owner_user_id;

    insert into public.organization_members(organization_id,user_id,role,status)
    values (new.id,new.owner_user_id,'owner','active')
    on conflict (organization_id,user_id)
    do update set role='owner',status='active',updated_at=now();
  end if;
  return new;
end;
$$;

create or replace function private.protect_designated_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare owner_id uuid;
begin
  select o.owner_user_id into owner_id
  from public.organizations o
  where o.id = old.organization_id;

  if owner_id is null then
    return case when tg_op='DELETE' then old else new end;
  end if;

  if old.user_id = owner_id then
    if tg_op='DELETE' then
      raise exception 'The designated organization owner membership cannot be deleted';
    end if;
    if new.user_id is distinct from old.user_id or new.organization_id is distinct from old.organization_id
       or new.role <> 'owner' or new.status <> 'active' then
      raise exception 'The designated organization owner must remain an active owner';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create or replace function private.member_role_allowed(_org_id uuid, _user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select _role <> 'owner' or private.is_designated_org_owner(_org_id,_user_id);
$$;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations for each row execute function private.set_updated_at();
drop trigger if exists trg_organization_members_updated_at on public.organization_members;
create trigger trg_organization_members_updated_at before update on public.organization_members for each row execute function private.set_updated_at();
drop trigger if exists trg_saas_plans_updated_at on public.saas_plans;
create trigger trg_saas_plans_updated_at before update on public.saas_plans for each row execute function private.set_updated_at();
drop trigger if exists trg_saas_subscriptions_updated_at on public.saas_subscriptions;
create trigger trg_saas_subscriptions_updated_at before update on public.saas_subscriptions for each row execute function private.set_updated_at();

drop trigger if exists trg_guard_organization_owner_change on public.organizations;
create trigger trg_guard_organization_owner_change before update of owner_user_id on public.organizations for each row execute function private.guard_organization_owner_change();
drop trigger if exists trg_sync_organization_owner_membership on public.organizations;
create trigger trg_sync_organization_owner_membership after update of owner_user_id on public.organizations for each row execute function private.sync_organization_owner_membership();
drop trigger if exists trg_protect_designated_owner_membership on public.organization_members;
create trigger trg_protect_designated_owner_membership before update or delete on public.organization_members for each row execute function private.protect_designated_owner_membership();

drop policy if exists "organization_members_insert_managers" on public.organization_members;
create policy "organization_members_insert_managers" on public.organization_members for insert to authenticated
with check (private.can_manage_org(organization_id,auth.uid()) and private.member_role_allowed(organization_id,user_id,role));

drop policy if exists "organization_members_update_managers" on public.organization_members;
create policy "organization_members_update_managers" on public.organization_members for update to authenticated
using (private.can_manage_org(organization_id,auth.uid()))
with check (private.can_manage_org(organization_id,auth.uid()) and private.member_role_allowed(organization_id,user_id,role));

revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.guard_organization_owner_change() from public, anon, authenticated;
revoke execute on function private.sync_organization_owner_membership() from public, anon, authenticated;
revoke execute on function private.protect_designated_owner_membership() from public, anon, authenticated;
grant execute on function private.is_designated_org_owner(uuid,uuid) to authenticated;
grant execute on function private.member_role_allowed(uuid,uuid,text) to authenticated;
