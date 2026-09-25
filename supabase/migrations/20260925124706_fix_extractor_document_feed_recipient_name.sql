-- fiscal_dfe_documents stores the recipient document but not a recipient name.
-- Keep the canonical extractor feed compatible with that schema instead of
-- failing the whole Documents page for every company.
do $migration$
declare
  v_function regprocedure := 'public.extractor_company_documents(uuid,date,date)'::regprocedure;
  v_definition text;
begin
  select pg_get_functiondef(v_function) into v_definition;

  if position('fd.recipient_name' in v_definition) = 0 then
    return;
  end if;

  v_definition := replace(
    v_definition,
    'fd.recipient_name,',
    'null::text as recipient_name,'
  );

  execute v_definition;
end;
$migration$;
