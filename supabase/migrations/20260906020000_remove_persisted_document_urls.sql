-- Signed URLs are credentials. Document access must always be authorized on
-- demand by get-signed-url, never persisted in a browser-readable table.
alter table public.documents disable trigger trg_guard_client_document_update;

update public.documents
set file_url = ''
where storage_key is not null
  and file_url <> '';

alter table public.documents enable trigger trg_guard_client_document_update;

comment on column public.documents.file_url is
  'Deprecated. Kept for compatibility; signed URLs must never be persisted here.';
