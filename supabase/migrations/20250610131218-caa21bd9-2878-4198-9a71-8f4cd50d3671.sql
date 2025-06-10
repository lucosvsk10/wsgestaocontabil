
-- Primeiro, vamos remover todas as políticas existentes da tabela tax_simulations
DROP POLICY IF EXISTS "manage all tax simulations" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations insert" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations insert with auth" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations delete" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations delete with auth" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations update" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations update with auth" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations select" ON public.tax_simulations;
DROP POLICY IF EXISTS "tax simulations select with auth" ON public.tax_simulations;

-- Agora vamos criar as políticas corretas seguindo o padrão das outras tabelas
-- Policy ALL para public role com permissões totais (para admins)
CREATE POLICY "Enable all operations for public" ON public.tax_simulations
FOR ALL TO public
USING (true)
WITH CHECK (true);

-- Policy INSERT para usuários autenticados (apenas suas próprias simulações)
CREATE POLICY "Enable insert for authenticated users" ON public.tax_simulations
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Policy SELECT para usuários autenticados (apenas suas próprias simulações)
CREATE POLICY "Enable select for authenticated users" ON public.tax_simulations
FOR SELECT TO public
USING (auth.uid() = user_id);

-- Policy UPDATE para usuários autenticados (apenas suas próprias simulações)
CREATE POLICY "Enable update for authenticated users" ON public.tax_simulations
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy DELETE para usuários autenticados (apenas suas próprias simulações)
CREATE POLICY "Enable delete for authenticated users" ON public.tax_simulations
FOR DELETE TO public
USING (auth.uid() = user_id);
