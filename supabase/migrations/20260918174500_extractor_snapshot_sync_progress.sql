do $migration$
declare
  def text;
begin
  select pg_get_functiondef('public.extractor_workspace_snapshot()'::regprocedure) into def;

  def := replace(
    def,
    'ps.status as purchase_status,',
    'ps.status as purchase_status,
      ps.last_started_at as purchase_last_started_at,'
  );
  def := replace(
    def,
    'ss.status as sales_status,',
    'ss.status as sales_status,
      ss.last_started_at as sales_last_started_at,'
  );
  def := replace(
    def,
    'coalesce(ss.xml_failed, 0)::integer as sales_xml_failed',
    'coalesce(ss.xml_failed, 0)::integer as sales_xml_failed,
      fc.fiscal_settings #>> ''{extractor_initial_sync,queued_at}'' as initial_sync_queued_at,
      fc.fiscal_settings #>> ''{extractor_initial_sync,period_from}'' as initial_sync_period_from,
      fc.fiscal_settings #>> ''{extractor_initial_sync,period_to}'' as initial_sync_period_to'
  );
  def := replace(
    def,
    'ps.status, ps.last_completed_at, ps.last_error,',
    'ps.status, ps.last_started_at, ps.last_completed_at, ps.last_error,'
  );
  def := replace(
    def,
    'ss.status, ss.last_completed_at, ss.last_error, ss.xml_pending, ss.xml_failed',
    'ss.status, ss.last_started_at, ss.last_completed_at, ss.last_error, ss.xml_pending, ss.xml_failed'
  );

  execute def;
end
$migration$;
