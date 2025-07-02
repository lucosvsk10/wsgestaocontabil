-- Adicionar colunas ausentes na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS certificate_data BYTEA,
ADD COLUMN IF NOT EXISTS certificate_password TEXT;

-- Renomear fiscal_automation_client para is_fiscal_automation_client se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'companies' AND column_name = 'fiscal_automation_client') THEN
        ALTER TABLE public.companies RENAME COLUMN fiscal_automation_client TO is_fiscal_automation_client;
    END IF;
END $$;

-- Adicionar is_fiscal_automation_client se não existir
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_fiscal_automation_client BOOLEAN DEFAULT FALSE;

-- Remover colunas desnecessárias se existirem
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'companies' AND column_name = 'sefaz_api_key') THEN
        ALTER TABLE public.companies DROP COLUMN sefaz_api_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'companies' AND column_name = 'receita_federal_api_key') THEN
        ALTER TABLE public.companies DROP COLUMN receita_federal_api_key;
    END IF;
END $$;