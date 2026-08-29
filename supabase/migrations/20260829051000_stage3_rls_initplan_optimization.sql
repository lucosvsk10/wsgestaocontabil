-- Stage 3: preserve RLS semantics while allowing auth helpers to be initialized once per query.
alter policy "Admins manage accounting workspace" on public.accounting_workspace_data using (private.is_any_admin((select auth.uid()))) with check (private.is_any_admin((select auth.uid())));
alter policy "Admins manage accounting documents" on public.accounting_workspace_documents using (private.is_any_admin((select auth.uid()))) with check (private.is_any_admin((select auth.uid())));

alter policy "Admins can manage companies" on public.companies using (exists (select 1 from public.users where users.id = (select auth.uid()) and users.role = 'admin'));
alter policy "Users can view their own company" on public.companies using ((not private.is_user_admin()) and cnpj = (select cd.cnpj from public.company_data cd where cd.user_id = (select auth.uid())));

alter policy "Admins can manage all company data" on public.company_data using (exists (select 1 from public.users where users.id = (select auth.uid()) and users.role = 'admin'));
alter policy "Admins can view all company data" on public.company_data using (exists (select 1 from public.users where users.id = (select auth.uid()) and users.role = 'admin'));
alter policy "Users can view their own company data" on public.company_data using (user_id = (select auth.uid()));

alter policy "Enable insert for authenticated users only" on public.documents with check ((select auth.uid()) = user_id);
alter policy "Admin can view all documents" on public.documents using (((select auth.jwt()) ->> 'role') = any (array['admin','geral','fiscal','contabil']));
alter policy "Users can view their own active documents" on public.documents using ((user_id = (select auth.uid())) and ((status = 'active') or status is null));
alter policy "Users can view their own documents" on public.documents using (user_id = (select auth.uid()));
alter policy "Users can update their own documents" on public.documents using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter policy "Users can insert own fiscal dfe documents" on public.fiscal_dfe_documents with check ((select auth.uid()) = user_id);
alter policy "Users can read own fiscal notes" on public.fiscal_dfe_documents using (((select auth.uid()) = user_id) and document_kind <> 'evento');
alter policy "Users can update own fiscal dfe documents" on public.fiscal_dfe_documents using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can insert own fiscal sync state" on public.fiscal_dfe_sync_state with check ((select auth.uid()) = user_id);
alter policy "Users can read own fiscal sync state" on public.fiscal_dfe_sync_state using ((select auth.uid()) = user_id);
alter policy "Users can update own fiscal sync state" on public.fiscal_dfe_sync_state using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "Users can only insert their own profile" on public.users with check ((id = (select auth.uid())) and (coalesce(role,'client') = 'client'));
alter policy "Admins can view all users" on public.users using (private.is_any_admin((select auth.uid())));
alter policy "Users can view their own data" on public.users using ((id = (select auth.uid())) or private.is_any_admin((select auth.uid())));
alter policy "Users can update their own profile" on public.users using (id = (select auth.uid())) with check ((id = (select auth.uid())) and (not (role is distinct from private.current_user_profile_role())));
