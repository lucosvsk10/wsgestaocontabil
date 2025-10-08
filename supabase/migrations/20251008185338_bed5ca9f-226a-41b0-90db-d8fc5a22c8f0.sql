-- Criar tabela processed_documents
CREATE TABLE IF NOT EXISTS public.processed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  protocol_id TEXT,
  doc_type TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  processing_status TEXT DEFAULT 'processed',
  execution_log JSONB,
  upload_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_processed_docs_user_id ON public.processed_documents(user_id);
CREATE INDEX idx_processed_docs_month_year ON public.processed_documents(month, year);
CREATE INDEX idx_processed_docs_user_month ON public.processed_documents(user_id, month, year);

-- RLS Policies
ALTER TABLE public.processed_documents ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas seus documentos
CREATE POLICY "Usuários podem visualizar seus próprios documentos processados"
  ON public.processed_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios documentos
CREATE POLICY "Usuários podem inserir seus próprios documentos processados"
  ON public.processed_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios documentos
CREATE POLICY "Usuários podem deletar seus próprios documentos processados"
  ON public.processed_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins podem ver tudo
CREATE POLICY "Admins podem visualizar todos os documentos processados"
  ON public.processed_documents
  FOR SELECT
  USING (is_admin());

-- Admins podem deletar qualquer documento
CREATE POLICY "Admins podem deletar qualquer documento processado"
  ON public.processed_documents
  FOR DELETE
  USING (is_admin());

-- Migrar dados existentes de uploads para processed_documents
INSERT INTO public.processed_documents (
  user_id,
  user_email,
  user_name,
  file_name,
  file_url,
  storage_key,
  doc_type,
  month,
  year,
  upload_date,
  created_at
)
SELECT 
  user_id,
  user_email,
  user_name,
  file_name,
  '' as file_url,
  '' as storage_key,
  'Lançamento' as doc_type,
  month,
  year,
  upload_date,
  created_at
FROM public.uploads
ON CONFLICT DO NOTHING;