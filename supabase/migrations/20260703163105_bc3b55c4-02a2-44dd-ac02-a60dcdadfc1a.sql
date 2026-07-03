ALTER TABLE public.folha_uploads
  ADD COLUMN IF NOT EXISTS total_rendimentos_documento NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_descontos_documento NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_liquido_documento NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_rendimentos_lancamentos NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_descontos_lancamentos NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_liquido_lancamentos NUMERIC(14,2);