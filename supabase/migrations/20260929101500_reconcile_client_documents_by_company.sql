-- Canonicalize portal document access by office company rather than by the current auth UUID.
-- Legacy documents keep their original user_id/storage folder for provenance, but company_id
-- becomes the stable identity used when portal credentials are replaced or unified.

-- Recover company_id for documents that still only know the legacy portal user.
-- The document update guard intentionally blocks client-side metadata edits, so suspend
-- only this trigger while the migration performs an admin-controlled identity backfill.
alter table public.documents disable trigger trg_guard_client_document_update;

update public.documents d
set company_id = cul.company_id
from public.company_user_links cul
where d.company_id is null
  and d.user_id = cul.user_id
  and cul.is_primary = true;

-- Older portal users may no longer be linked after the access migration.
-- company_data preserves the historical user -> CNPJ relationship, so use it as a second recovery path.
update public.documents d
set company_id = c.id
from public.company_data cd
join public.companies c
  on regexp_replace(coalesce(c.cnpj, c.document_number, ''), '\D', '', 'g')
   = regexp_replace(coalesce(cd.cnpj, ''), '\D', '', 'g')
where d.company_id is null
  and d.user_id = cd.user_id
  and length(regexp_replace(coalesce(cd.cnpj, ''), '\D', '', 'g')) = 14;

alter table public.documents enable trigger trg_guard_client_document_update;

create index if not exists documents_company_status_uploaded_idx
  on public.documents(company_id, status, uploaded_at desc)
  where company_id is not null;

-- One canonical reader for both the client portal and the admin document screen.
-- A client may only request itself; admins may request the portal user selected in the ADM.
create or replace function public.portal_documents(_target_user_id uuid default auth.uid())
returns setof public.documents
language sql
security definer
stable
set search_path = pg_catalog, public, private
as $$
  select d.*
  from public.documents d
  where
    (
      _target_user_id = auth.uid()
      or private.is_any_admin(auth.uid())
    )
    and (
      private.is_any_admin(auth.uid())
      or coalesce(d.status, 'active') = 'active'
    )
    and (
      d.user_id = _target_user_id
      or (
        d.company_id is not null
        and exists (
          select 1
          from public.company_user_links cul
          where cul.user_id = _target_user_id
            and cul.company_id = d.company_id
        )
      )
    )
  order by d.uploaded_at desc nulls last, d.id desc;
$$;

revoke all on function public.portal_documents(uuid) from public, anon;
grant execute on function public.portal_documents(uuid) to authenticated;

-- Client visibility follows the company link. This is what lets a new portal credential
-- see documents that were originally uploaded to the legacy user UUID.
drop policy if exists documents_client_read on public.documents;
create policy documents_client_read
on public.documents
for select
to authenticated
using (
  coalesce(status, 'active') = 'active'
  and (
    user_id = auth.uid()
    or (
      company_id is not null
      and exists (
        select 1
        from public.company_user_links cul
        where cul.user_id = auth.uid()
          and cul.company_id = documents.company_id
      )
    )
  )
);

-- Storage must follow the document row, not the folder prefix. Legacy objects may remain
-- under the old user's UUID folder even after the portal credential was unified.
drop policy if exists documents_storage_client_read on storage.objects;
create policy documents_storage_client_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and lower(name) !~ '\.(p12|pfx|pem|key|crt|cer)$'
  and exists (
    select 1
    from public.documents d
    where d.storage_key = storage.objects.name
      and coalesce(d.status, 'active') = 'active'
      and (d.expires_at is null or d.expires_at > now())
      and (
        d.user_id = auth.uid()
        or (
          d.company_id is not null
          and exists (
            select 1
            from public.company_user_links cul
            where cul.user_id = auth.uid()
              and cul.company_id = d.company_id
          )
        )
      )
  )
);

-- Viewed status is per current portal user and may reference a legacy-owned document.
drop policy if exists visualized_documents_company_client_select on public.visualized_documents;
create policy visualized_documents_company_client_select
on public.visualized_documents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists visualized_documents_company_client_insert on public.visualized_documents;
create policy visualized_documents_company_client_insert
on public.visualized_documents
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.documents d
    where d.id = visualized_documents.document_id
      and coalesce(d.status, 'active') = 'active'
      and (
        d.user_id = auth.uid()
        or (
          d.company_id is not null
          and exists (
            select 1
            from public.company_user_links cul
            where cul.user_id = auth.uid()
              and cul.company_id = d.company_id
          )
        )
      )
  )
);

-- Read-only audit used to verify whether the historical merge actually reached every document
-- and whether duplicate company identities still exist. It does not mutate business data.
create or replace function public.admin_client_document_identity_audit()
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, private
as $$
declare
  result jsonb;
begin
  if not private.is_any_admin(auth.uid()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'documents_total', (select count(*) from public.documents),
    'documents_without_company', (select count(*) from public.documents where company_id is null),
    'documents_with_company', (select count(*) from public.documents where company_id is not null),
    'companies_total', (select count(*) from public.companies),
    'companies_without_portal_user', (
      select count(*)
      from public.companies c
      where not exists (
        select 1 from public.company_user_links cul
        where cul.company_id = c.id and cul.is_primary = true
      )
    ),
    'duplicate_document_numbers', (
      select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      from (
        select
          regexp_replace(coalesce(c.document_number, c.cnpj, ''), '\D', '', 'g') as document_number,
          count(*) as company_count,
          array_agg(c.id order by c.created_at, c.id) as company_ids,
          array_agg(coalesce(c.trade_name, c.company_name) order by c.created_at, c.id) as company_names
        from public.companies c
        where length(regexp_replace(coalesce(c.document_number, c.cnpj, ''), '\D', '', 'g')) in (11, 14)
        group by 1
        having count(*) > 1
      ) x
    ),
    'document_coverage_by_company', (
      select coalesce(jsonb_agg(row_to_json(x) order by x.company_name), '[]'::jsonb)
      from (
        select
          c.id as company_id,
          coalesce(c.trade_name, c.company_name) as company_name,
          c.document_number,
          count(d.id) as document_count,
          count(distinct d.user_id) as historical_document_owners,
          (
            select count(*)
            from public.company_user_links cul
            where cul.company_id = c.id
          ) as linked_portal_users
        from public.companies c
        left join public.documents d on d.company_id = c.id
        group by c.id, c.trade_name, c.company_name, c.document_number
      ) x
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_client_document_identity_audit() from public, anon;
grant execute on function public.admin_client_document_identity_audit() to authenticated;

comment on function public.portal_documents(uuid) is
  'Returns every document accessible through the office company linked to a portal user, including legacy documents owned by previous auth UUIDs.';
comment on function public.admin_client_document_identity_audit() is
  'Read-only audit for document/company identity migration coverage and duplicate office companies.';
