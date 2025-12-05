-- Add verification tracking columns to fechamentos_exportados
ALTER TABLE public.fechamentos_exportados 
ADD COLUMN IF NOT EXISTS verification_id UUID,
ADD COLUMN IF NOT EXISTS n8n_status TEXT DEFAULT 'pendente';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fechamentos_verification_id ON public.fechamentos_exportados(verification_id);

-- Update existing records to have 'concluido' status
UPDATE public.fechamentos_exportados SET n8n_status = 'concluido' WHERE n8n_status IS NULL OR n8n_status = 'pendente';