-- Persistência definitiva da Central de Lançamentos.
CREATE TABLE IF NOT EXISTS public.accounting_workspace_data (
  scope text PRIMARY KEY,
  company_key text NOT NULL,
  competence text,
  module text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_workspace_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  company_key text NOT NULL,
  competence text,
  module text,
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  checksum text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_workspace_context ON public.accounting_workspace_data(company_key, competence, module);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_scope ON public.accounting_workspace_documents(scope, created_at);
ALTER TABLE public.accounting_workspace_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_workspace_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage accounting workspace" ON public.accounting_workspace_data FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage accounting documents" ON public.accounting_workspace_documents FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('accounting-documents', 'accounting-documents', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "Admins upload accounting documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-documents' AND public.is_admin());
CREATE POLICY "Admins read accounting documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_admin());
CREATE POLICY "Admins update accounting documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'accounting-documents' AND public.is_admin());
CREATE POLICY "Admins delete accounting documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_admin());

CREATE TRIGGER set_accounting_workspace_updated_at BEFORE UPDATE ON public.accounting_workspace_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_workspace_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_workspace_documents TO authenticated;
