alter table public.extractor_accounts
  add column if not exists access_source text not null default 'billing',
  add column if not exists access_expires_at timestamptz,
  add column if not exists lifetime_access boolean not null default false;

alter table public.extractor_accounts
  drop constraint if exists extractor_accounts_access_source_check;

alter table public.extractor_accounts
  add constraint extractor_accounts_access_source_check
  check (access_source in ('billing','manual','lifetime_test'));

comment on column public.extractor_accounts.access_source is
  'Origem auditável do direito de acesso ao produto Extrator.';
comment on column public.extractor_accounts.access_expires_at is
  'Fim do período contratado. Nulo somente quando lifetime_access=true.';
comment on column public.extractor_accounts.lifetime_access is
  'Exceção vitalícia explícita; não deve ser usada para assinaturas comuns.';

create or replace function private.is_extractor_entitled(_account_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.extractor_accounts ea
    where ea.id = _account_id
      and ea.status = 'active'
      and (ea.lifetime_access = true or ea.access_expires_at > now())
  );
$$;

create or replace function private.is_extractor_member(_account_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_extractor_entitled(_account_id)
    and exists (
      select 1
      from public.extractor_accounts ea
      join public.organization_members om on om.organization_id = ea.organization_id
      where ea.id = _account_id
        and om.user_id = _user_id
        and om.status = 'active'
    );
$$;

create or replace function private.can_manage_extractor(_account_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select (
      private.is_extractor_entitled(_account_id)
      and exists (
        select 1
        from public.extractor_accounts ea
        join public.organization_members om on om.organization_id = ea.organization_id
        where ea.id = _account_id
          and om.user_id = _user_id
          and om.status = 'active'
          and om.role in ('owner','admin')
      )
    )
    or private.is_any_admin(_user_id);
$$;

revoke all on function private.is_extractor_entitled(uuid) from public;
revoke all on function private.is_extractor_member(uuid,uuid) from public;
revoke all on function private.can_manage_extractor(uuid,uuid) from public;

update public.extractor_accounts
set lifetime_access = true, access_source = 'manual', access_expires_at = null, updated_at = now()
where organization_id in (
  select om.organization_id
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  where lower(u.email) = 'wsgestao@gmail.com'
);

insert into public.extractor_accounts (
  organization_id, name, status, plan_code, monthly_xml_limit, base_lookback_days,
  current_period_start, access_source, access_expires_at, lifetime_access
)
select
  om.organization_id, coalesce(nullif(trim(o.name), ''), 'Conta de teste WS'),
  'active', 'lifetime_test', 20000, 30, date_trunc('month', current_date)::date,
  'lifetime_test', null, true
from auth.users u
join public.organization_members om on om.user_id = u.id and om.status = 'active'
join public.organizations o on o.id = om.organization_id
where lower(u.email) = 'wsteste@gmail.com'
order by case when om.role = 'owner' then 0 else 1 end, om.created_at
limit 1
on conflict (organization_id) do update
set status = 'active', plan_code = 'lifetime_test', base_lookback_days = 30,
    access_source = 'lifetime_test', access_expires_at = null,
    lifetime_access = true, updated_at = now();
