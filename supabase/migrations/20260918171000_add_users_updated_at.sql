alter table public.users
  add column if not exists updated_at timestamptz not null default now();

update public.users
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
