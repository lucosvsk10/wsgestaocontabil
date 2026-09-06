-- Old A1 copies found in the generic documents bucket are quarantined from
-- every browser session, including admins. Only backend service-role jobs may
-- access them while retention/migration is decided.
drop policy if exists documents_storage_admin_read on storage.objects;
create policy documents_storage_admin_read
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and private.is_any_admin((select auth.uid()))
  and lower(name) !~ '\.(p12|pfx|pem|key|crt|cer)$'
);
