-- User documents are private records. Clients may only read active files that
-- belong to their own account; creation and administration stay with admins.

update storage.buckets
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
where id = 'documents';

drop policy if exists "Admins can read all documents files" on storage.objects;
drop policy if exists "Allow client read access flreew_0" on storage.objects;
drop policy if exists "Allow delete for admin" on storage.objects;
drop policy if exists "Allow uploads for admin" on storage.objects;
drop policy if exists documents_storage_client_read on storage.objects;
drop policy if exists documents_storage_admin_read on storage.objects;
drop policy if exists documents_storage_admin_insert on storage.objects;
drop policy if exists documents_storage_admin_update on storage.objects;
drop policy if exists documents_storage_admin_delete on storage.objects;

create policy documents_storage_client_read
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and lower(name) !~ '\.(p12|pfx|pem|key|crt|cer)$'
  and exists (
    select 1
    from public.documents d
    where d.storage_key = storage.objects.name
      and d.user_id = (select auth.uid())
      and coalesce(d.status, 'active') = 'active'
      and (d.expires_at is null or d.expires_at > now())
  )
);

create policy documents_storage_admin_read
on storage.objects for select to authenticated
using (bucket_id = 'documents' and private.is_any_admin((select auth.uid())));

create policy documents_storage_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and private.is_any_admin((select auth.uid()))
  and exists (
    select 1 from public.users u
    where u.id::text = split_part(storage.objects.name, '/', 1)
  )
  and lower(name) ~ '\.(pdf|png|jpe?g|docx?|xlsx?)$'
);

create policy documents_storage_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'documents' and private.is_any_admin((select auth.uid())))
with check (
  bucket_id = 'documents'
  and private.is_any_admin((select auth.uid()))
  and exists (
    select 1 from public.users u
    where u.id::text = split_part(storage.objects.name, '/', 1)
  )
  and lower(name) ~ '\.(pdf|png|jpe?g|docx?|xlsx?)$'
);

create policy documents_storage_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'documents' and private.is_any_admin((select auth.uid())));

drop policy if exists "Admin can view all documents" on public.documents;
drop policy if exists "Admins can delete documents" on public.documents;
drop policy if exists "Admins can insert documents" on public.documents;
drop policy if exists "Admins can update documents" on public.documents;
drop policy if exists "Admins can view all documents" on public.documents;
drop policy if exists "Enable insert for authenticated users only" on public.documents;
drop policy if exists "Users can update their own documents" on public.documents;
drop policy if exists "Users can view their own active documents" on public.documents;
drop policy if exists "Users can view their own documents" on public.documents;
drop policy if exists documents_client_read on public.documents;
drop policy if exists documents_client_mark_viewed on public.documents;
drop policy if exists documents_admin_manage on public.documents;

create policy documents_client_read
on public.documents for select to authenticated
using (
  user_id = (select auth.uid())
  and coalesce(status, 'active') = 'active'
);

create policy documents_client_mark_viewed
on public.documents for update to authenticated
using (user_id = (select auth.uid()) and coalesce(status, 'active') = 'active')
with check (user_id = (select auth.uid()) and coalesce(status, 'active') = 'active');

create policy documents_admin_manage
on public.documents for all to authenticated
using (private.is_any_admin((select auth.uid())))
with check (private.is_any_admin((select auth.uid())));

create or replace function private.guard_client_document_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if private.is_any_admin((select auth.uid())) then
    return new;
  end if;

  if new.user_id <> (select auth.uid())
     or (to_jsonb(new) - 'viewed' - 'viewed_at')
        is distinct from (to_jsonb(old) - 'viewed' - 'viewed_at')
     or new.viewed is not true
     or new.viewed_at is null
     or new.viewed_at < now() - interval '5 minutes'
     or new.viewed_at > now() + interval '1 minute' then
    raise exception 'document_update_not_allowed' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_client_document_update() from public, anon, authenticated;

drop trigger if exists trg_guard_client_document_update on public.documents;
create trigger trg_guard_client_document_update
before update on public.documents
for each row execute function private.guard_client_document_update();

revoke all on table public.documents from anon;
grant select, insert, update, delete on table public.documents to authenticated;

comment on table public.documents is
  'Private user documents. Files are served only through Storage authorization or short-lived signed URLs.';
