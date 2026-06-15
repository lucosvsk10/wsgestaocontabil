-- folha_uploads
CREATE TABLE public.folha_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  storage_path text NOT NULL,
  nome_arquivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  ultimo_erro text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_folha_uploads_client_comp ON public.folha_uploads(client_id, competencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_uploads TO authenticated;
GRANT ALL ON public.folha_uploads TO service_role;

ALTER TABLE public.folha_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all folha_uploads"
  ON public.folha_uploads FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Clients view own folha_uploads"
  ON public.folha_uploads FOR SELECT
  USING (auth.uid() = client_id);

CREATE TRIGGER folha_uploads_updated_at
  BEFORE UPDATE ON public.folha_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- folha_lancamentos
CREATE TABLE public.folha_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  data date,
  conta_debito text,
  conta_credito text,
  historico text,
  valor numeric(14,2),
  ordem int NOT NULL DEFAULT 0,
  source_upload_id uuid REFERENCES public.folha_uploads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_folha_lanc_client_comp ON public.folha_lancamentos(client_id, competencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_lancamentos TO authenticated;
GRANT ALL ON public.folha_lancamentos TO service_role;

ALTER TABLE public.folha_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all folha_lancamentos"
  ON public.folha_lancamentos FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Clients view own folha_lancamentos"
  ON public.folha_lancamentos FOR SELECT
  USING (auth.uid() = client_id);

CREATE TRIGGER folha_lancamentos_updated_at
  BEFORE UPDATE ON public.folha_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- month_closures.tipo
ALTER TABLE public.month_closures
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'despesas';