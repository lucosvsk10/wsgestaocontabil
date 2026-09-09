-- Dedicated document feed for the paid Extrator workspace.
-- It reuses the proven fiscal storage/engines, but only for companies explicitly
-- linked to the authenticated extractor account.

create or replace function public.extractor_company_documents(
  _company_id uuid,
  _start date default (current_date - 30),
  _end date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.extractor_accounts%rowtype;
  v_allowed_from date;
  v_from date;
  v_to date;
  v_documents jsonb := '[]'::jsonb;
  v_reconciliation jsonb := '[]'::jsonb;
  v_last_sync timestamptz;
begin
  if _company_id is null then
    raise exception 'extractor_company_required' using errcode = '22023';
  end if;
  if _start is null or _end is null or _start > _end then
    raise exception 'extractor_period_invalid' using errcode = '22023';
  end if;

  select ea.* into v_account
  from public.extractor_accounts ea
  join public.extractor_companies ec on ec.account_id = ea.id
  where ec.fiscal_company_id = _company_id
    and ec.status = 'active'
    and (
      private.is_extractor_member(ea.id, auth.uid())
      or private.is_any_admin(auth.uid())
    )
  order by ea.created_at
  limit 1;

  if v_account.id is null then
    raise exception 'extractor_company_access_denied' using errcode = '42501';
  end if;

  v_allowed_from := greatest(
    coalesce(v_account.history_from, current_date - v_account.base_lookback_days),
    current_date - 366
  );
  v_from := greatest(_start, v_allowed_from);
  v_to := least(_end, current_date);

  select fc.last_sync_at into v_last_sync
  from public.fiscal_companies fc
  where fc.id = _company_id;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.issue_date desc nulls last, d.received_at desc), '[]'::jsonb)
  into v_documents
  from (
    select
      fd.id,
      fd.company_id,
      fd.nsu,
      fd.schema_name,
      fd.source,
      fd.document_kind,
      fd.full_xml,
      fd.direction,
      fd.access_key,
      fd.model,
      fd.issue_date,
      fd.value,
      fd.issuer_cnpj,
      fd.issuer_name,
      fd.recipient_cnpj,
      fd.note_number,
      fd.series,
      fd.status_code,
      fd.status_text,
      fd.parse_error,
      fd.received_at
    from public.fiscal_dfe_documents fd
    where fd.company_id = _company_id
      and (
        (fd.issue_date is not null and fd.issue_date >= v_from::timestamptz and fd.issue_date < (v_to + 1)::timestamptz)
        or (fd.issue_date is null and fd.received_at >= v_from::timestamptz and fd.received_at < (v_to + 1)::timestamptz)
      )
    order by fd.issue_date desc nulls last, fd.received_at desc
    limit 5000
  ) d;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.issue_date desc nulls last, r.note_number desc), '[]'::jsonb)
  into v_reconciliation
  from (
    select
      sr.company_id,
      sr.model,
      sr.series,
      sr.note_number,
      sr.status,
      sr.access_key,
      sr.issue_date,
      sr.month_code,
      sr.cstat,
      sr.xmotivo,
      sr.xml_status,
      sr.detail_status,
      sr.event_status,
      sr.updated_at
    from public.fiscal_sales_reconciliation sr
    where sr.company_id = _company_id
      and sr.issue_date is not null
      and sr.issue_date >= v_from::timestamptz
      and sr.issue_date < (v_to + 1)::timestamptz
    order by sr.issue_date desc nulls last, sr.note_number desc
    limit 5000
  ) r;

  return jsonb_build_object(
    'ok', true,
    'company_id', _company_id,
    'allowed_from', v_allowed_from,
    'requested_from', _start,
    'effective_from', v_from,
    'effective_to', v_to,
    'last_sync_at', v_last_sync,
    'documents', v_documents,
    'reconciliation', v_reconciliation
  );
end;
$$;

revoke execute on function public.extractor_company_documents(uuid,date,date) from public, anon;
grant execute on function public.extractor_company_documents(uuid,date,date) to authenticated;

comment on function public.extractor_company_documents(uuid,date,date) is
  'Returns the fiscal document feed only for a company explicitly linked to the authenticated paid Extrator account.';
