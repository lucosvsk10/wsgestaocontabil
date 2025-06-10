
-- Primeiro, vamos remover as políticas atuais que são muito restritivas
DROP POLICY IF EXISTS "Enable all operations for public" ON public.tax_simulations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tax_simulations;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.tax_simulations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tax_simulations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tax_simulations;

-- Criar políticas que permitam que administradores vejam todas as simulações
-- Policy SELECT que permite ver suas próprias simulações OU se for admin
CREATE POLICY "Users can view their own simulations or admins view all" ON public.tax_simulations
FOR SELECT TO public
USING (
  auth.uid() = user_id OR 
  public.is_admin()
);

-- Policy INSERT para usuários autenticados criarem suas próprias simulações
CREATE POLICY "Users can create their own simulations" ON public.tax_simulations
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE que permite editar suas próprias simulações OU se for admin
CREATE POLICY "Users can update their own simulations or admins update all" ON public.tax_simulations
FOR UPDATE TO public
USING (
  auth.uid() = user_id OR 
  public.is_admin()
)
WITH CHECK (
  auth.uid() = user_id OR 
  public.is_admin()
);

-- Policy DELETE que permite deletar suas próprias simulações OU se for admin
CREATE POLICY "Users can delete their own simulations or admins delete all" ON public.tax_simulations
FOR DELETE TO public
USING (
  auth.uid() = user_id OR 
  public.is_admin()
);
