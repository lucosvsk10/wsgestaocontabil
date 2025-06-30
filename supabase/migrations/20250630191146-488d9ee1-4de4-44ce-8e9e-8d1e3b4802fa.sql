
-- Criar tabela companies (Empresas)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  sefaz_api_key TEXT,
  receita_federal_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela fiscal_notes (Notas Fiscais)
CREATE TABLE public.fiscal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  xml_url TEXT,
  pdf_url TEXT,
  issue_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  cfop TEXT,
  issuer_cnpj TEXT NOT NULL,
  recipient_cnpj TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela note_items (Itens da Nota)
CREATE TABLE public.note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.fiscal_notes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  ncm TEXT,
  cst TEXT,
  cfop TEXT
);

-- Criar função trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at nas tabelas
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fiscal_notes_updated_at
  BEFORE UPDATE ON public.fiscal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS nas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_items ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Criar função para obter company_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT c.id FROM public.companies c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.cnpj = (
      SELECT cd.cnpj FROM public.company_data cd 
      WHERE cd.user_id = auth.uid()
    )
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Políticas RLS para companies
CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT USING (public.is_user_admin());

CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (
    NOT public.is_user_admin() AND 
    cnpj = (SELECT cd.cnpj FROM public.company_data cd WHERE cd.user_id = auth.uid())
  );

CREATE POLICY "Admins can insert companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_user_admin());

CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE USING (public.is_user_admin());

CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE USING (public.is_user_admin());

-- Políticas RLS para fiscal_notes
CREATE POLICY "Admins can view all fiscal notes" ON public.fiscal_notes
  FOR SELECT USING (public.is_user_admin());

CREATE POLICY "Users can view their company fiscal notes" ON public.fiscal_notes
  FOR SELECT USING (
    NOT public.is_user_admin() AND 
    company_id = public.get_user_company_id()
  );

CREATE POLICY "Admins can insert fiscal notes" ON public.fiscal_notes
  FOR INSERT WITH CHECK (public.is_user_admin());

CREATE POLICY "Admins can update fiscal notes" ON public.fiscal_notes
  FOR UPDATE USING (public.is_user_admin());

CREATE POLICY "Admins can delete fiscal notes" ON public.fiscal_notes
  FOR DELETE USING (public.is_user_admin());

-- Políticas RLS para note_items
CREATE POLICY "Admins can view all note items" ON public.note_items
  FOR SELECT USING (public.is_user_admin());

CREATE POLICY "Users can view their company note items" ON public.note_items
  FOR SELECT USING (
    NOT public.is_user_admin() AND 
    EXISTS (
      SELECT 1 FROM public.fiscal_notes fn 
      WHERE fn.id = note_items.note_id 
      AND fn.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Admins can insert note items" ON public.note_items
  FOR INSERT WITH CHECK (public.is_user_admin());

CREATE POLICY "Admins can update note items" ON public.note_items
  FOR UPDATE USING (public.is_user_admin());

CREATE POLICY "Admins can delete note items" ON public.note_items
  FOR DELETE USING (public.is_user_admin());

-- Criar índices para melhorar performance
CREATE INDEX idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX idx_fiscal_notes_company_id ON public.fiscal_notes(company_id);
CREATE INDEX idx_fiscal_notes_access_key ON public.fiscal_notes(access_key);
CREATE INDEX idx_fiscal_notes_issue_date ON public.fiscal_notes(issue_date);
CREATE INDEX idx_note_items_note_id ON public.note_items(note_id);
