-- Remove the accidental cross-account link created by the test workspace.
-- Keep the original WS extractor link and all fiscal documents intact.
update public.extractor_companies test_link
set status='removed',
    updated_at=now()
from public.extractor_accounts test_account
join public.organizations test_org on test_org.id=test_account.organization_id
join auth.users test_owner on test_owner.id=test_org.owner_user_id
join public.extractor_accounts ws_account on ws_account.name='WS Gestão Contábil'
join public.extractor_companies ws_link
  on ws_link.account_id=ws_account.id
 and ws_link.status='active'
where test_link.account_id=test_account.id
  and lower(test_owner.email)='testemp@gmail.com'
  and test_link.status='active'
  and test_link.fiscal_company_id=ws_link.fiscal_company_id
  and test_link.created_at>ws_link.created_at;
