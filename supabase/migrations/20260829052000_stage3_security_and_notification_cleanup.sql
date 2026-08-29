-- Stage 3: remove exact duplicate policies, speed notification reads and close direct access to a trigger function.
create index if not exists notifications_user_created_at_idx on public.notifications(user_id, created_at desc);

drop policy if exists "Usuários podem ver suas próprias notificações" on public.notifications;
drop policy if exists "Usuários podem excluir suas próprias notificações" on public.notifications;
drop policy if exists "Users can create their own INSS simulations" on public.inss_simulations;
drop policy if exists "Users can create their own Prolabore simulations" on public.prolabore_simulations;

alter policy "Users can view their own notifications" on public.notifications using ((select auth.uid()) = user_id);
alter policy "Users can delete their own notifications" on public.notifications using ((select auth.uid()) = user_id);
alter policy "Users can create own INSS simulations" on public.inss_simulations with check ((select auth.uid()) = user_id);
alter policy "Users can create own Prolabore simulations" on public.prolabore_simulations with check ((select auth.uid()) = user_id);

revoke execute on function public.init_fiscal_company_recent_sales_state() from public, anon, authenticated;
grant execute on function public.init_fiscal_company_recent_sales_state() to service_role;
