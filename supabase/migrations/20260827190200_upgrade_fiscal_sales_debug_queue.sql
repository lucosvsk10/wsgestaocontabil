alter table public.fiscal_sales_debug_queue
  add column if not exists action text not null default 'deep_discover',
  add column if not exists period_start date,
  add column if not exists period_end date;

create or replace function public.dispatch_fiscal_sales_debug()
returns trigger
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  v_token text;
  v_request bigint;
begin
  select token::text into v_token
  from public._fiscal_sales_debug_token
  where id=true;

  select net.http_post(
    url := 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-sales-connector',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-debug-token',v_token
    ),
    body := jsonb_strip_nulls(jsonb_build_object(
      'company_id',new.company_id,
      'action',new.action,
      'period_start',new.period_start,
      'period_end',new.period_end
    ))
  ) into v_request;

  update public.fiscal_sales_debug_queue
  set request_id=v_request, dispatched_at=now()
  where id=new.id;

  return new;
end;
$$;
