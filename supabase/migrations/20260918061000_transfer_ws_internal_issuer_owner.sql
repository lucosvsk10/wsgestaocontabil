-- Make the existing internal Emissor workspace belong to the single WS admin login.
-- This keeps the fiscal workspace intact while allowing the legacy test auth user to be removed later.

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
update public.organizations o
set owner_user_id = admin_user.id,
    updated_at = now()
from admin_user, issuer_org
where o.id = issuer_org.organization_id
  and o.owner_user_id <> admin_user.id;
