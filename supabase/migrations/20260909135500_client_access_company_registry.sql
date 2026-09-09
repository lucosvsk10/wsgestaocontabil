alter table public.users add column if not exists password_changed_at timestamptz;

alter table public.companies add column if not exists state_registration text;
alter table public.companies add column if not exists registration_status text;
alter table public.companies add column if not exists tax_regime text;
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists postal_code text;
alter table public.companies add column if not exists street text;
alter table public.companies add column if not exists street_number text;
alter table public.companies add column if not exists complement text;
alter table public.companies add column if not exists district text;
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists state text;
alter table public.companies add column if not exists city_ibge_code text;
alter table public.companies add column if not exists cnae_primary text;
alter table public.companies add column if not exists registry_payload jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists registry_updated_at timestamptz;

alter table public.users drop constraint if exists users_username_format_check;
alter table public.users add constraint users_username_format_check
  check (username is null or username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$');

update public.users
set name = upper(name), username = upper(username)
where role = 'client';

update public.companies
set company_name = upper(company_name), trade_name = upper(trade_name);

drop index if exists users_username_unique_ci;
create unique index if not exists users_username_unique_ci on public.users (lower(username)) where username is not null;

create or replace function public.mark_client_password_changed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set must_change_password = false,
         password_changed_at = now()
   where id = auth.uid()
     and role = 'client';
end;
$$;
revoke all on function public.mark_client_password_changed() from public;
grant execute on function public.mark_client_password_changed() to authenticated;
