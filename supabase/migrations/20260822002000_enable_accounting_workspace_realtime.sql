-- Keep month/module status indicators synchronized after multi-competence imports.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'accounting_workspace_data'
  ) then
    alter publication supabase_realtime add table public.accounting_workspace_data;
  end if;
end
$$;
