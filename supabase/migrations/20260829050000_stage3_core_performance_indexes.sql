-- Stage 3: indexes for hot document/accounting relations and cleanup of exact duplicate indexes.
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_uploaded_at_idx on public.documents(uploaded_at desc);
create index if not exists documents_viewed_at_idx on public.documents(viewed_at desc) where viewed = true and viewed_at is not null;
create index if not exists documents_category_idx on public.documents(category) where category is not null;
create index if not exists visualized_documents_document_id_idx on public.visualized_documents(document_id);
create index if not exists fiscal_documents_sync_id_idx on public.fiscal_documents(sync_id) where sync_id is not null;
create index if not exists folha_lancamentos_source_upload_id_idx on public.folha_lancamentos(source_upload_id) where source_upload_id is not null;
create index if not exists extrato_bancario_documento_id_idx on public.extrato_bancario(documento_id) where documento_id is not null;

drop index if exists public.idx_documentos_conciliacao_status;
drop index if exists public.idx_documentos_conciliacao_user_competencia;
