-- Share the existing internal Emissor workspace with the single WS admin login.
-- The legacy test user remains linked for now so payment tests are not destroyed before cleanup.

with admin_user as (
  select id
  from auth.users
  where lower(email) = 'wsgestao@gmail.com'
  limit 1
),
issuer_org as (
  select om.organization_id
  from auth.users test_user
  join public.organization_members om
    on om.user_id = test_user.id
   and om.status = 'active'
  join public.saas_subscriptions ss
    on ss.organization_id = om.organization_id
   and ss.status in ('trialing','active','past_due')
  join public.saas_plans sp
    on sp.id = ss.plan_id
   and sp.product_code = 'issuer'
  where lower(test_user.email) = 'wsteste@gmail.com'
  order by ss.created_at desc
  limit 1
)
insert into public.organization_members (organization_id, user_id, role, status)
select issuer_org.organization_id, admin_user.id, 'owner', 'active'
from issuer_org
cross join admin_user
on conflict (organization_id, user_id)
do update set role = excluded.role, status = excluded.status;
