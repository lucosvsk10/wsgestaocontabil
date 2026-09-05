-- The cleanup worker uses an internal high-entropy token kept in an RLS-denied
-- table. Do not embed reusable API keys in pg_cron command text.
select cron.unschedule(2);

select cron.schedule(
  'delete-expired-documents-daily',
  '0 2 * * *',
  $job$
  select net.http_post(
    url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/delete-expired-documents',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-token', (select token::text from public._fiscal_sales_debug_token where id = true)
    ),
    body := '{"trigger":"cron"}'::jsonb
  );
$job$
);
