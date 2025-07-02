-- Verificar e criar políticas RLS para companies se não existirem
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" 
ON public.companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verificar e criar políticas RLS para fiscal_notes se não existirem  
DROP POLICY IF EXISTS "Admins can manage fiscal notes" ON public.fiscal_notes;
CREATE POLICY "Admins can manage fiscal notes" 
ON public.fiscal_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Garantir que RLS está habilitado nas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;