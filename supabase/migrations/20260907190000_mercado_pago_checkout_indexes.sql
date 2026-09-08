-- Cover the server-side lookup paths used while creating and reconciling checkouts.

create index if not exists saas_payment_attempts_organization_idx
  on public.saas_payment_attempts(organization_id, created_at desc);

create index if not exists saas_payment_attempts_requested_by_idx
  on public.saas_payment_attempts(requested_by, created_at desc);
