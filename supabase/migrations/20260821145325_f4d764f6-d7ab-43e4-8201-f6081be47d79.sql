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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_workspace_data TO authenticated;
GRANT ALL ON public.accounting_workspace_data TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_workspace_documents TO authenticated;
GRANT ALL ON public.accounting_workspace_documents TO service_role;

CREATE INDEX IF NOT EXISTS idx_accounting_workspace_context ON public.accounting_workspace_data(company_key, competence, module);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_scope ON public.accounting_workspace_documents(scope, created_at);

ALTER TABLE public.accounting_workspace_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_workspace_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage accounting workspace" ON public.accounting_workspace_data;
CREATE POLICY "Admins manage accounting workspace" ON public.accounting_workspace_data FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid())) WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage accounting documents" ON public.accounting_workspace_documents;
CREATE POLICY "Admins manage accounting documents" ON public.accounting_workspace_documents FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid())) WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins upload accounting documents" ON storage.objects;
CREATE POLICY "Admins upload accounting documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-documents' AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins read accounting documents" ON storage.objects;
CREATE POLICY "Admins read accounting documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update accounting documents" ON storage.objects;
CREATE POLICY "Admins update accounting documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_any_admin(auth.uid()))
  WITH CHECK (bucket_id = 'accounting-documents' AND public.is_any_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete accounting documents" ON storage.objects;
CREATE POLICY "Admins delete accounting documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accounting-documents' AND public.is_any_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_accounting_workspace_updated_at ON public.accounting_workspace_data;
CREATE TRIGGER set_accounting_workspace_updated_at BEFORE UPDATE ON public.accounting_workspace_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();