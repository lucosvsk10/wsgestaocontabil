-- Criar tabela extrato_bancario
CREATE TABLE IF NOT EXISTS public.extrato_bancario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data_transacao DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado')),
  documento_id UUID,
  competencia TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela documentos_conciliacao
CREATE TABLE IF NOT EXISTS public.documentos_conciliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url_storage TEXT NOT NULL,
  status_processamento TEXT DEFAULT 'nao_processado' 
    CHECK (status_processamento IN ('nao_processado', 'processando', 'concluido', 'pendente_manual', 'erro')),
  dados_extraidos JSONB,
  competencia TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar foreign key após criar ambas tabelas
ALTER TABLE public.extrato_bancario 
ADD CONSTRAINT fk_extrato_documento 
FOREIGN KEY (documento_id) 
REFERENCES public.documentos_conciliacao(id) 
ON DELETE SET NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_extrato_user_competencia ON public.extrato_bancario(user_id, competencia);
CREATE INDEX IF NOT EXISTS idx_extrato_status ON public.extrato_bancario(status);
CREATE INDEX IF NOT EXISTS idx_documentos_user_competencia ON public.documentos_conciliacao(user_id, competencia);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON public.documentos_conciliacao(status_processamento);

-- Criar bucket de storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.extrato_bancario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_conciliacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para extrato_bancario
CREATE POLICY "Users can view their own extratos"
  ON public.extrato_bancario FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all extratos"
  ON public.extrato_bancario FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert extratos"
  ON public.extrato_bancario FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Users and admins can update extratos"
  ON public.extrato_bancario FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can delete extratos"
  ON public.extrato_bancario FOR DELETE
  USING (is_admin());

-- Políticas RLS para documentos_conciliacao
CREATE POLICY "Users can view their own documents"
  ON public.documentos_conciliacao FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.documentos_conciliacao FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documentos_conciliacao FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents"
  ON public.documentos_conciliacao FOR ALL
  USING (is_admin());

-- Políticas RLS para Storage bucket comprovantes (usando foldername que retorna TEXT)
CREATE POLICY "Users can upload to their own folder in comprovantes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comprovantes' 
    AND foldername(name) = auth.uid()::text
  );

CREATE POLICY "Users can view their own files in comprovantes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprovantes' 
    AND foldername(name) = auth.uid()::text
  );

CREATE POLICY "Admins can view all files in comprovantes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprovantes' 
    AND is_admin()
  );

CREATE POLICY "Users can delete their own files in comprovantes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comprovantes' 
    AND foldername(name) = auth.uid()::text
  );

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.extrato_bancario;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documentos_conciliacao;