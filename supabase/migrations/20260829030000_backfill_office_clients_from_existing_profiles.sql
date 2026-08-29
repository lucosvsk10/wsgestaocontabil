update public.companies
set cnpj = regexp_replace(cnpj, '\D', '', 'g')
where cnpj is distinct from regexp_replace(cnpj, '\D', '', 'g');

insert into public.companies (cnpj, company_name, trade_name, address, created_at, updated_at)
select
  regexp_replace(cd.cnpj, '\D', '', 'g') as cnpj,
  coalesce(nullif(trim(cd.name), ''), nullif(trim(u.name), ''), 'CLIENTE WS') as company_name,
  nullif(trim(cd.fantasy_name), '') as trade_name,
  nullif(trim(concat_ws(', ', nullif(trim(cd.address), ''), nullif(trim(cd.number), ''), nullif(trim(cd.neighborhood), ''), nullif(trim(cd.city), ''), nullif(trim(cd.state), ''), nullif(trim(cd.postal_code), ''))), '') as address,
  coalesce(cd.created_at, now()),
  now()
from public.company_data cd
join public.users u on u.id = cd.user_id
where coalesce(u.role, 'client') = 'client'
  and length(regexp_replace(coalesce(cd.cnpj, ''), '\D', '', 'g')) = 14
  and not exists (
    select 1 from public.companies c
    where regexp_replace(c.cnpj, '\D', '', 'g') = regexp_replace(cd.cnpj, '\D', '', 'g')
  );

insert into public.company_user_links (company_id, user_id, is_primary)
select c.id, cd.user_id, true
from public.company_data cd
join public.users u on u.id = cd.user_id
join public.companies c on regexp_replace(c.cnpj, '\D', '', 'g') = regexp_replace(cd.cnpj, '\D', '', 'g')
where coalesce(u.role, 'client') = 'client'
  and length(regexp_replace(coalesce(cd.cnpj, ''), '\D', '', 'g')) = 14
on conflict (company_id, user_id) do update set is_primary = true, updated_at = now();

update public.documents d
set company_id = cul.company_id
from public.company_user_links cul
where d.user_id = cul.user_id
  and cul.is_primary = true
  and d.company_id is null;

update public.fiscal_companies fc
set company_id = c.id
from public.companies c
where fc.company_id is null
  and regexp_replace(fc.cnpj, '\D', '', 'g') = regexp_replace(c.cnpj, '\D', '', 'g');
