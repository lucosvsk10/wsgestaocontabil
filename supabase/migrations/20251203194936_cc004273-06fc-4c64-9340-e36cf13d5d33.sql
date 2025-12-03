-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Admins can manage all lancamentos" ON public.lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.lancamentos_alinhados;

-- Criar políticas PERMISSIVAS (padrão) para admin poder ver tudo
CREATE POLICY "Admins can select all lancamentos" 
ON public.lancamentos_alinhados 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can insert all lancamentos" 
ON public.lancamentos_alinhados 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update all lancamentos" 
ON public.lancamentos_alinhados 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete all lancamentos" 
ON public.lancamentos_alinhados 
FOR DELETE 
USING (is_admin());

-- Políticas para usuários
CREATE POLICY "Users can view own lancamentos" 
ON public.lancamentos_alinhados 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lancamentos" 
ON public.lancamentos_alinhados 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lancamentos" 
ON public.lancamentos_alinhados 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lancamentos" 
ON public.lancamentos_alinhados 
FOR DELETE 
USING (auth.uid() = user_id);