-- Extractor SaaS is tenant-scoped even for platform administrators.
-- The administrator can use the SaaS only through explicit organization membership;
-- admin role must never grant visibility into another customer's fiscal companies.

do $scope$
declare
  fn regprocedure;
  def text;
begin
  foreach fn in array array[
    'public.extractor_account_usage()'::regprocedure,
    'public.extractor_company_documents(uuid,date,date)'::regprocedure,
    'public.extractor_company_overview(uuid)'::regprocedure,
    'public.extractor_document_preview_data(uuid,text,text)'::regprocedure,
    'public.extractor_workspace_snapshot()'::regprocedure
  ]
  loop
    select pg_get_functiondef(fn) into def;
    def := regexp_replace(
      def,
      E'\\n[[:space:]]*or private\\.is_any_admin\\(auth\\.uid\\(\\)\\)',
      '',
      'g'
    );
    execute def;
  end loop;

  select pg_get_functiondef('public.extractor_document_access(uuid,uuid)'::regprocedure) into def;
  def := replace(
    def,
    E'\n  if private.is_any_admin(p_user_id) then\n    return jsonb_build_object(''allowed'',true,''from'',null,''to'',public.extractor_local_date());\n  end if;\n',
    E'\n'
  );
  execute def;
end
$scope$;
