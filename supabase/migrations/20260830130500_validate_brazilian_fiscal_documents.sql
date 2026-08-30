create or replace function public.is_valid_cpf(value text)
returns boolean
language plpgsql
immutable
as $$
declare
  s text := regexp_replace(coalesce(value,''), '\D', '', 'g');
  i int; total int := 0; d1 int; d2 int;
begin
  if length(s) <> 11 or s ~ '^(\d)\1{10}$' then return false; end if;
  for i in 1..9 loop total := total + substr(s,i,1)::int * (11-i); end loop;
  d1 := (total * 10) % 11; if d1 = 10 then d1 := 0; end if;
  if d1 <> substr(s,10,1)::int then return false; end if;
  total := 0;
  for i in 1..10 loop total := total + substr(s,i,1)::int * (12-i); end loop;
  d2 := (total * 10) % 11; if d2 = 10 then d2 := 0; end if;
  return d2 = substr(s,11,1)::int;
end $$;

create or replace function public.is_valid_cnpj(value text)
returns boolean
language plpgsql
immutable
as $$
declare
  s text := regexp_replace(coalesce(value,''), '\D', '', 'g');
  i int; total int := 0; r int; d1 int; d2 int;
  w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  if length(s) <> 14 or s ~ '^(\d)\1{13}$' then return false; end if;
  for i in 1..12 loop total := total + substr(s,i,1)::int * w1[i]; end loop;
  r := total % 11; d1 := case when r < 2 then 0 else 11-r end;
  if d1 <> substr(s,13,1)::int then return false; end if;
  total := 0;
  for i in 1..13 loop total := total + substr(s,i,1)::int * w2[i]; end loop;
  r := total % 11; d2 := case when r < 2 then 0 else 11-r end;
  return d2 = substr(s,14,1)::int;
end $$;

create or replace function public.validate_saas_party_tax_id()
returns trigger
language plpgsql
as $$
begin
  if new.person_type='legal' and coalesce(new.tax_id,'')<>'' and not public.is_valid_cnpj(new.tax_id) then
    raise exception 'CNPJ inválido. Corrija o documento antes de salvar.' using errcode='23514';
  elsif new.person_type='individual' and coalesce(new.tax_id,'')<>'' and not public.is_valid_cpf(new.tax_id) then
    raise exception 'CPF inválido. Corrija o documento antes de salvar.' using errcode='23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_validate_saas_party_tax_id on public.saas_fiscal_parties;
create trigger trg_validate_saas_party_tax_id before insert or update of tax_id,person_type on public.saas_fiscal_parties for each row execute function public.validate_saas_party_tax_id();

create or replace function public.validate_saas_profile_tax_id()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.tax_id,'')<>'' and not public.is_valid_cnpj(new.tax_id) then
    raise exception 'CNPJ da empresa inválido.' using errcode='23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_validate_saas_profile_tax_id on public.saas_company_fiscal_profiles;
create trigger trg_validate_saas_profile_tax_id before insert or update of tax_id on public.saas_company_fiscal_profiles for each row execute function public.validate_saas_profile_tax_id();
