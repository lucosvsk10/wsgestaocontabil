alter table public.companies add column if not exists logo_url text;
comment on column public.companies.logo_url is 'Logo oficial do cliente do escritorio, usada no admin e por extensoes como carrossel.';
