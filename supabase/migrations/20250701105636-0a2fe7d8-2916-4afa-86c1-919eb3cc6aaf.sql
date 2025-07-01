-- Adicionar coluna para marcar empresas como clientes de automação fiscal
ALTER TABLE public.companies 
ADD COLUMN fiscal_automation_client BOOLEAN DEFAULT false;