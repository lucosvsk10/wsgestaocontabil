delete from extractor_history_requests where account_id='42f65d8a-b881-42ea-8c3e-3ec2007ac850';
delete from extractor_companies where account_id='42f65d8a-b881-42ea-8c3e-3ec2007ac850';
delete from extractor_accounts where id='42f65d8a-b881-42ea-8c3e-3ec2007ac850';
delete from saas_subscriptions where organization_id='e5a09bb8-9d6c-495f-80be-ebea53e889f4' and product_code='extractor';
insert into saas_subscriptions (organization_id, plan_id, status, provider, product_code, billing_mode, current_period_start, access_expires_at, metadata)
select 'e5a09bb8-9d6c-495f-80be-ebea53e889f4', p.id, 'active', 'manual', 'issuer', 'one_time', now(), null, jsonb_build_object('plan_code','issuer_monthly','grant','lifetime_test')
from saas_plans p where p.code='issuer_monthly'
and not exists (select 1 from saas_subscriptions s where s.organization_id='e5a09bb8-9d6c-495f-80be-ebea53e889f4' and s.product_code='issuer' and s.status='active');