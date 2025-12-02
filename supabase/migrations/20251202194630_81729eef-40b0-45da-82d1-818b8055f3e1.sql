-- Modificar tabela documentos_conciliacao para adicionar campos necessários
ALTER TABLE documentos_conciliacao 
ADD COLUMN IF NOT EXISTS tipo_documento text DEFAULT 'comprovante',
ADD COLUMN IF NOT EXISTS arquivo_original text,
ADD COLUMN IF NOT EXISTS tentativas_processamento integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_erro text,
ADD COLUMN IF NOT EXISTS processado_em timestamp with time zone;

-- Criar tabela de lançamentos processados (dados limpos do fechamento)
CREATE TABLE IF NOT EXISTS lancamentos_processados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competencia text NOT NULL,
  data date,
  valor numeric(15,2),
  historico text,
  debito text,
  credito text,
  documento_origem_id uuid REFERENCES documentos_conciliacao(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_processados_user_competencia 
ON lancamentos_processados(user_id, competencia);

CREATE INDEX IF NOT EXISTS idx_documentos_conciliacao_status 
ON documentos_conciliacao(status_processamento);

CREATE INDEX IF NOT EXISTS idx_documentos_conciliacao_user_competencia 
ON documentos_conciliacao(user_id, competencia);

-- Criar tabela de fechamentos exportados
CREATE TABLE IF NOT EXISTS fechamentos_exportados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  competencia text NOT NULL,
  arquivo_excel_url text,
  arquivo_csv_url text,
  total_lancamentos integer DEFAULT 0,
  status text DEFAULT 'processando',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, competencia)
);

-- Criar índice para fechamentos
CREATE INDEX IF NOT EXISTS idx_fechamentos_user_competencia 
ON fechamentos_exportados(user_id, competencia);

-- RLS para lancamentos_processados
ALTER TABLE lancamentos_processados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lancamentos" 
ON lancamentos_processados FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lancamentos" 
ON lancamentos_processados FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lancamentos" 
ON lancamentos_processados FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lancamentos" 
ON lancamentos_processados FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all lancamentos" 
ON lancamentos_processados FOR ALL 
USING (is_admin());

-- RLS para fechamentos_exportados
ALTER TABLE fechamentos_exportados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fechamentos" 
ON fechamentos_exportados FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fechamentos" 
ON fechamentos_exportados FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fechamentos" 
ON fechamentos_exportados FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all fechamentos" 
ON fechamentos_exportados FOR ALL 
USING (is_admin());

-- Criar bucket para arquivos de lançamentos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('lancamentos', 'lancamentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para lancamentos usando split_part
CREATE POLICY "Users can upload their own lancamentos files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lancamentos' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can view their own lancamentos files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lancamentos' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Users can delete their own lancamentos files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lancamentos' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

CREATE POLICY "Admins can manage all lancamentos files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'lancamentos' 
  AND is_admin()
);