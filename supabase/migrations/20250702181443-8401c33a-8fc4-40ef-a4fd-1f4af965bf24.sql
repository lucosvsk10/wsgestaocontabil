-- Criar tabela fiscal_notes (Notas Fiscais)
CREATE TABLE public.fiscal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  note_type TEXT NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  xml_content TEXT,
  pdf_url TEXT,
  issue_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  issuer_cnpj TEXT NOT NULL,
  recipient_cnpj TEXT NOT NULL,
  is_purchase BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela fiscal_notes
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;

-- Política RLS para fiscal_notes - apenas admins
CREATE POLICY "Admins can manage fiscal notes" 
ON public.fiscal_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);