-- Periodic, non-destructive refresh of office client registry data.
-- The Edge Function updates only empty fields or fields that still equal the last registry-managed value.

create table if not exists public._company_registry_sync_token (
  id boolean primary key default true check (id = true),
  token text not null,
  created_at timestamptz not null default now()
);

alter table public._company_registry_sync_token enable row level security;

insert into public._company_registry_sync_token (id, token)
values (true, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

do $cron$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'office-company-registry-sync-daily'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'office-company-registry-sync-daily',
    '35 4 * * *',
    $cmd$
      select net.http_post(
        url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-company-registry-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-token', (select token from public._company_registry_sync_token where id = true)
        ),
        body := jsonb_build_object('batch', 20, 'stale_days', 14),
        timeout_milliseconds := 120000
      );
    $cmd$
  );
end
$cron$;
