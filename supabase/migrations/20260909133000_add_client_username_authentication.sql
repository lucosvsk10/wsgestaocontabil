alter table public.users add column if not exists username text;
alter table public.users add column if not exists must_change_password boolean not null default false;

update public.users u
set username = case lower(u.email)
  when 'agrestelink@wsgestao.com' then 'agrestelink'
  when 'bellavidaclubfinanceiro@gmail.com' then 'bellavidaclub'
  when 'casadoordenhador@yahoo.com.br' then 'casadoordenhador'
  when 'reidoacorp@gmail.com' then 'reidoaco'
  when 'flordotrigo@wsgestaocontabil.com' then 'flordotrigo'
  when 'laticinio_santamaria@outlook.com' then 'laticiniosantamaria'
  when 'leclinicsaudeintegrada.al@gmail.com' then 'leclinic'
  when 'jl.parafusos@hotmail.com' then 'jlparafusos'
  when 'diegosantomelo70@gmail.com' then 'reiacosaopaulo'
  when 'revicalc.scacordo@gmail.com' then 'revicalc'
  when 'teste@gmail.com' then 'wstestecliente'
  when 'vaniovariedades1@gmail.com' then 'vaniovariedades'
  else u.username
end
where exists (
  select 1 from public.company_user_links cul where cul.user_id = u.id
);

create unique index if not exists users_username_unique_idx
  on public.users (lower(username))
  where username is not null;

alter table public.users drop constraint if exists users_username_format_check;
alter table public.users add constraint users_username_format_check
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

create table if not exists public.client_login_attempts (
  key_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.client_login_attempts enable row level security;
revoke all on public.client_login_attempts from anon, authenticated;

comment on column public.users.username is 'Nome de usuário utilizado por clientes do escritório no portal. O e-mail do Supabase Auth permanece identificador interno e não deve ser exibido como credencial do cliente.';
comment on column public.users.must_change_password is 'Quando true, o cliente deve trocar a senha após autenticar.';
comment on table public.client_login_attempts is 'Controle interno de tentativas do login por nome de usuário. A chave é hash de usuário+origem; sem dados pessoais em claro.';
