do $scope$
declare
  def text;
begin
  select pg_get_functiondef('public.extractor_account_usage()'::regprocedure) into def;
  def := replace(
    def,
    'and (private.is_extractor_member(ea.id, auth.uid()) or private.is_any_admin(auth.uid()))',
    'and private.is_extractor_member(ea.id, auth.uid())'
  );
  execute def;
end
$scope$;
