
-- compras_uploads
CREATE TABLE public.compras_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  storage_path text NOT NULL,
  nome_arquivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  ultimo_erro text,
  dados_extraidos jsonb,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_uploads TO authenticated;
GRANT ALL ON public.compras_uploads TO service_role;
ALTER TABLE public.compras_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all compras_uploads" ON public.compras_uploads
  FOR ALL USING (public.is_any_admin(auth.uid())) WITH CHECK (public.is_any_admin(auth.uid()));
CREATE POLICY "Clients view own compras_uploads" ON public.compras_uploads
  FOR SELECT USING (auth.uid() = client_id);
CREATE TRIGGER set_compras_uploads_updated_at BEFORE UPDATE ON public.compras_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- compras_lancamentos
CREATE TABLE public.compras_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  data date,
  conta_debito text,
  conta_credito text,
  cfop text,
  historico text,
  valor numeric,
  ordem integer NOT NULL DEFAULT 0,
  source_upload_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_lancamentos TO authenticated;
GRANT ALL ON public.compras_lancamentos TO service_role;
ALTER TABLE public.compras_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all compras_lancamentos" ON public.compras_lancamentos
  FOR ALL USING (public.is_any_admin(auth.uid())) WITH CHECK (public.is_any_admin(auth.uid()));
CREATE POLICY "Clients view own compras_lancamentos" ON public.compras_lancamentos
  FOR SELECT USING (auth.uid() = client_id);
CREATE TRIGGER set_compras_lancamentos_updated_at BEFORE UPDATE ON public.compras_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- compras_cfop_mapping
CREATE TABLE public.compras_cfop_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  cfop text NOT NULL,
  descricao text,
  conta_debito text NOT NULL,
  conta_credito text NOT NULL DEFAULT '777',
  ativo_padrao boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, cfop)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_cfop_mapping TO authenticated;
GRANT ALL ON public.compras_cfop_mapping TO service_role;
ALTER TABLE public.compras_cfop_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all compras_cfop_mapping" ON public.compras_cfop_mapping
  FOR ALL USING (public.is_any_admin(auth.uid())) WITH CHECK (public.is_any_admin(auth.uid()));
CREATE POLICY "Clients view own compras_cfop_mapping" ON public.compras_cfop_mapping
  FOR SELECT USING (auth.uid() = client_id);
CREATE TRIGGER set_compras_cfop_mapping_updated_at BEFORE UPDATE ON public.compras_cfop_mapping
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
