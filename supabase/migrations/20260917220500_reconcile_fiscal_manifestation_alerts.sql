create or replace function public.normalize_fiscal_manifestation_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_keys text[];
  issue_count integer;
begin
  if new.issue_code not in ('MANIFESTATION_REQUIRED', 'MANIFESTATION_XML_PENDING') then
    return new;
  end if;

  select coalesce(array_agg(key_text), array[]::text[])
    into remaining_keys
  from jsonb_array_elements_text(coalesce(new.data -> 'access_keys', '[]'::jsonb)) as key_text
  where not exists (
    select 1
    from public.fiscal_dfe_documents d
    where d.company_id = new.company_id
      and regexp_replace(coalesce(d.access_key, ''), '\D', '', 'g') = regexp_replace(key_text, '\D', '', 'g')
      and d.full_xml is true
      and d.xml is not null
      and length(d.xml) > 0
  );

  issue_count := coalesce(array_length(remaining_keys, 1), 0);

  if issue_count = 0 then
    new.resolved_at := coalesce(new.resolved_at, now());
    new.updated_at := now();
    return new;
  end if;

  new.data := jsonb_set(
    jsonb_set(coalesce(new.data, '{}'::jsonb), '{count}', to_jsonb(issue_count), true),
    '{access_keys}',
    to_jsonb(remaining_keys),
    true
  );

  if new.issue_code = 'MANIFESTATION_REQUIRED' then
    new.message := format('%s nota(s) de compra precisam de manifestação para a SEFAZ liberar o XML integral.', issue_count);
  else
    new.message := format('%s nota(s) já tiveram a manifestação registrada, mas o XML ainda não foi liberado.', issue_count);
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_fiscal_manifestation_alert_trigger on public.fiscal_health_alerts;
create trigger normalize_fiscal_manifestation_alert_trigger
before insert or update on public.fiscal_health_alerts
for each row
execute function public.normalize_fiscal_manifestation_alert();

create or replace function public.reconcile_fiscal_manifestation_alert_after_xml()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_xml is true
     and new.xml is not null
     and length(new.xml) > 0
     and new.access_key is not null then
    update public.fiscal_health_alerts
       set updated_at = now()
     where company_id = new.company_id
       and issue_code in ('MANIFESTATION_REQUIRED', 'MANIFESTATION_XML_PENDING')
       and resolved_at is null
       and coalesce(data -> 'access_keys', '[]'::jsonb) ? new.access_key;
  end if;

  return new;
end;
$$;

drop trigger if exists reconcile_fiscal_manifestation_alert_after_xml_trigger on public.fiscal_dfe_documents;
create trigger reconcile_fiscal_manifestation_alert_after_xml_trigger
after insert or update of full_xml, xml on public.fiscal_dfe_documents
for each row
execute function public.reconcile_fiscal_manifestation_alert_after_xml();

-- Reconcile alerts that were already active before this migration.
update public.fiscal_health_alerts
   set updated_at = now()
 where issue_code in ('MANIFESTATION_REQUIRED', 'MANIFESTATION_XML_PENDING')
   and resolved_at is null;
