-- Cover billing foreign keys and remove anonymous execution from an authenticated extractor RPC.
create index if not exists saas_subscriptions_plan_idx on public.saas_subscriptions(plan_id);
create index if not exists saas_trial_redemptions_org_idx on public.saas_trial_redemptions(organization_id);
create index if not exists saas_trial_redemptions_user_idx on public.saas_trial_redemptions(user_id);
create index if not exists saas_trial_redemptions_subscription_idx on public.saas_trial_redemptions(subscription_id);
create index if not exists saas_billing_checkouts_org_idx on public.saas_billing_checkouts(organization_id);
create index if not exists saas_billing_checkouts_requested_by_idx on public.saas_billing_checkouts(requested_by);

revoke execute on function public.extractor_account_usage() from public, anon;
grant execute on function public.extractor_account_usage() to authenticated;
