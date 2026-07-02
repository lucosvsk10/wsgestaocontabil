ALTER TABLE public.folha_lancamentos ADD COLUMN IF NOT EXISTS justificativa TEXT;
ALTER TABLE public.folha_uploads ADD COLUMN IF NOT EXISTS observacoes_ia TEXT;