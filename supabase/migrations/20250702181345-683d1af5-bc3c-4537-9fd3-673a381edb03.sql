-- Criar tabela companies (Empresas)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  company_name TEXT,
  trade_name TEXT,
  address TEXT,
  company_size TEXT,
  certificate_data BYTEA,
  certificate_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Habilitar RLS nas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para companies - apenas admins
CREATE POLICY "Admins can manage companies" 
ON public.companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Políticas RLS para fiscal_notes - apenas admins
CREATE POLICY "Admins can manage fiscal notes" 
ON public.fiscal_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para atualizar updated_at na tabela companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();