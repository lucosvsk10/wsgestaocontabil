-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily cleanup of expired documents at 2 AM
-- This will delete documents that have been expired for more than 7 days
SELECT cron.schedule(
  'delete-expired-documents-daily',
  '0 2 * * *', -- Run at 2 AM every day
  $$
  SELECT
    net.http_post(
      url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/delete-expired-documents',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZHRvaXRna3VremJnaHRib2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTY5MTEsImV4cCI6MjA1OTE5MjkxMX0.-dF-MxB7bcJCXTPC0fo_U50yzukvTrP1QKtJyBCmIoE"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) AS request_id;
  $$
);