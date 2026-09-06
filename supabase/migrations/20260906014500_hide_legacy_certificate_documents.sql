-- Legacy certificate uploads may remain available to backend administrators for
-- migration, but their records and objects must never be exposed to clients.
drop policy if exists documents_client_read on public.documents;
create policy documents_client_read
on public.documents for select to authenticated
using (
  user_id = (select auth.uid())
  and coalesce(status, 'active') = 'active'
  and coalesce(storage_key, '') !~* '\.(p12|pfx|pem|key|crt|cer)$'
);
