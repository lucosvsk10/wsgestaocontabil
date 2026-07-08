
-- 1) Limpar dados antigos de folha
DELETE FROM public.folha_lancamentos;
DELETE FROM public.folha_uploads;

-- 2) Ampliar folha_uploads
ALTER TABLE public.folha_uploads
  ADD COLUMN IF NOT EXISTS total_recol_fgts_documento numeric;

-- 3) Nova tabela: folha_transcricoes
CREATE TABLE IF NOT EXISTS public.folha_transcricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.folha_uploads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_rendimentos_pdf numeric,
  total_descontos_pdf numeric,
  total_recol_fgts_pdf numeric,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  observacoes_ia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_transcricoes TO authenticated;
GRANT ALL ON public.folha_transcricoes TO service_role;

ALTER TABLE public.folha_transcricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente vê sua transcrição"
  ON public.folha_transcricoes FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id OR public.is_any_admin(auth.uid()));

CREATE POLICY "Cliente/admin altera sua transcrição"
  ON public.folha_transcricoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id OR public.is_any_admin(auth.uid()))
  WITH CHECK (auth.uid() = client_id OR public.is_any_admin(auth.uid()));

CREATE POLICY "Cliente/admin cria transcrição"
  ON public.folha_transcricoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id OR public.is_any_admin(auth.uid()));

CREATE POLICY "Cliente/admin apaga transcrição"
  ON public.folha_transcricoes FOR DELETE
  TO authenticated
  USING (auth.uid() = client_id OR public.is_any_admin(auth.uid()));

CREATE TRIGGER trg_folha_transcricoes_updated_at
  BEFORE UPDATE ON public.folha_transcricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_folha_transcricoes_client_comp
  ON public.folha_transcricoes(client_id, competencia);

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.folha_transcricoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folha_uploads;
