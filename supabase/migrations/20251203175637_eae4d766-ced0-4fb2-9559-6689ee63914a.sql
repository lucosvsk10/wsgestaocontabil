-- Add alignment status column to documentos_conciliacao
ALTER TABLE public.documentos_conciliacao 
ADD COLUMN IF NOT EXISTS status_alinhamento TEXT DEFAULT 'pendente';

-- Add alinhado_em timestamp
ALTER TABLE public.documentos_conciliacao 
ADD COLUMN IF NOT EXISTS alinhado_em TIMESTAMPTZ;

-- Add tentativas_alinhamento column
ALTER TABLE public.documentos_conciliacao 
ADD COLUMN IF NOT EXISTS tentativas_alinhamento INTEGER DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.documentos_conciliacao.status_alinhamento IS 'Status do alinhamento: pendente, processando, alinhado, erro';
COMMENT ON COLUMN public.documentos_conciliacao.alinhado_em IS 'Data/hora em que o documento foi alinhado com sucesso';
COMMENT ON COLUMN public.documentos_conciliacao.tentativas_alinhamento IS 'Número de tentativas de alinhamento';