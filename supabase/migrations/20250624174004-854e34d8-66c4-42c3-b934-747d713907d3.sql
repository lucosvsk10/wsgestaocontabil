
-- Criar tabela para empresas cadastradas no sistema fiscal
CREATE TABLE public.fiscal_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users NOT NULL
);

-- Criar tabela para certificados digitais A1
CREATE TABLE public.fiscal_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.fiscal_companies(id) ON DELETE CASCADE NOT NULL,
  certificate_name TEXT NOT NULL,
  certificate_data BYTEA NOT NULL, -- Certificado criptografado
  password_hash TEXT NOT NULL, -- Senha do certificado criptografada
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users NOT NULL
);

-- Criar tabela para logs de sincronização PRIMEIRO
CREATE TABLE public.fiscal_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.fiscal_companies(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL, -- manual, automatica
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  documentos_encontrados INTEGER DEFAULT 0,
  documentos_processados INTEGER DEFAULT 0,
  documentos_erro INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'iniciado', -- iniciado, processando, concluido, erro
  mensagem_erro TEXT,
  tempo_duracao INTEGER, -- em segundos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users NOT NULL
);

-- Criar tabela para documentos fiscais DEPOIS
CREATE TABLE public.fiscal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.fiscal_companies(id) ON DELETE CASCADE NOT NULL,
  chave_acesso TEXT NOT NULL UNIQUE,
  numero_nota TEXT NOT NULL,
  serie TEXT NOT NULL,
  tipo_documento TEXT NOT NULL, -- NFe, NFCe, NFSe, CTe, MDFe
  tipo_operacao TEXT NOT NULL, -- entrada, saida
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_impostos DECIMAL(15,2),
  cnpj_emitente TEXT NOT NULL,
  nome_emitente TEXT NOT NULL,
  cnpj_destinatario TEXT,
  nome_destinatario TEXT,
  cfop TEXT,
  natureza_operacao TEXT,
  xml_content TEXT NOT NULL,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'processado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_id UUID REFERENCES public.fiscal_sync_logs(id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.fiscal_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas administradores podem acessar
CREATE POLICY "Apenas admins podem ver empresas fiscais"
  ON public.fiscal_companies FOR ALL
  USING (public.is_admin());

CREATE POLICY "Apenas admins podem ver certificados fiscais"
  ON public.fiscal_certificates FOR ALL
  USING (public.is_admin());

CREATE POLICY "Apenas admins podem ver documentos fiscais"
  ON public.fiscal_documents FOR ALL
  USING (public.is_admin());

CREATE POLICY "Apenas admins podem ver logs de sincronização"
  ON public.fiscal_sync_logs FOR ALL
  USING (public.is_admin());

-- Criar índices para melhor performance
CREATE INDEX idx_fiscal_documents_chave_acesso ON public.fiscal_documents(chave_acesso);
CREATE INDEX idx_fiscal_documents_company_id ON public.fiscal_documents(company_id);
CREATE INDEX idx_fiscal_documents_data_emissao ON public.fiscal_documents(data_emissao);
CREATE INDEX idx_fiscal_documents_tipo_documento ON public.fiscal_documents(tipo_documento);
CREATE INDEX idx_fiscal_documents_cnpj_emitente ON public.fiscal_documents(cnpj_emitente);
CREATE INDEX idx_fiscal_certificates_company_id ON public.fiscal_certificates(company_id);
CREATE INDEX idx_fiscal_sync_logs_company_id ON public.fiscal_sync_logs(company_id);

-- Trigger para atualizar updated_at em fiscal_companies
CREATE OR REPLACE FUNCTION public.update_fiscal_companies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_fiscal_companies_updated_at
  BEFORE UPDATE ON public.fiscal_companies
  FOR EACH ROW EXECUTE PROCEDURE public.update_fiscal_companies_updated_at();
