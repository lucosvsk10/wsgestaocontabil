create table if not exists public.fiscal_health_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.fiscal_companies(id) on delete cascade,
  issue_code text not null,
  severity text not null default 'attention' check (severity in ('attention','error')),
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fiscal_health_alerts_active_issue_uidx
  on public.fiscal_health_alerts(company_id, issue_code)
  where resolved_at is null;
create index if not exists fiscal_health_alerts_company_created_idx
  on public.fiscal_health_alerts(company_id, created_at desc);

create table if not exists public.fiscal_health_alert_dismissals (
  alert_id uuid not null references public.fiscal_health_alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);
create index if not exists fiscal_health_alert_dismissals_user_idx
  on public.fiscal_health_alert_dismissals(user_id, dismissed_at desc);

alter table public.fiscal_health_alerts enable row level security;
alter table public.fiscal_health_alert_dismissals enable row level security;

drop policy if exists fiscal_health_alerts_admin_read on public.fiscal_health_alerts;
create policy fiscal_health_alerts_admin_read
  on public.fiscal_health_alerts for select to authenticated
  using (private.is_any_admin((select auth.uid())));

drop policy if exists fiscal_health_alert_dismissals_admin_read_own on public.fiscal_health_alert_dismissals;
create policy fiscal_health_alert_dismissals_admin_read_own
  on public.fiscal_health_alert_dismissals for select to authenticated
  using ((select auth.uid()) = user_id and private.is_any_admin((select auth.uid())));

drop policy if exists fiscal_health_alert_dismissals_admin_insert_own on public.fiscal_health_alert_dismissals;
create policy fiscal_health_alert_dismissals_admin_insert_own
  on public.fiscal_health_alert_dismissals for insert to authenticated
  with check ((select auth.uid()) = user_id and private.is_any_admin((select auth.uid())));

drop policy if exists fiscal_health_alert_dismissals_admin_delete_own on public.fiscal_health_alert_dismissals;
create policy fiscal_health_alert_dismissals_admin_delete_own
  on public.fiscal_health_alert_dismissals for delete to authenticated
  using ((select auth.uid()) = user_id and private.is_any_admin((select auth.uid())));

grant select on public.fiscal_health_alerts to authenticated;
grant select, insert, delete on public.fiscal_health_alert_dismissals to authenticated;

do $$
begin
  perform cron.unschedule('fiscal-health-daily-after-sync');
exception when others then
  null;
end $$;

select cron.schedule(
  'fiscal-health-daily-after-sync',
  '50 3 * * *',
  $cron$
    select net.http_post(
      url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-health-daily-cron',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-debug-token',(select token::text from public._fiscal_sales_debug_token where id=true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$
);
