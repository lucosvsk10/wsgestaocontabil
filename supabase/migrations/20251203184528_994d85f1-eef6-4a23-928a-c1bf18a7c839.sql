-- Recriar políticas RLS para documentos_brutos (anteriormente documentos_conciliacao)
DROP POLICY IF EXISTS "Admins can manage all documents" ON documentos_brutos;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documentos_brutos;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documentos_brutos;
DROP POLICY IF EXISTS "Users can update their own documents" ON documentos_brutos;
DROP POLICY IF EXISTS "Users can view their own documents" ON documentos_brutos;

CREATE POLICY "Admins can manage all documents" 
ON documentos_brutos FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own documents" 
ON documentos_brutos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" 
ON documentos_brutos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON documentos_brutos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON documentos_brutos FOR DELETE 
USING (auth.uid() = user_id);

-- Recriar políticas RLS para lancamentos_alinhados (anteriormente lancamentos_processados)
DROP POLICY IF EXISTS "Admins can manage all lancamentos" ON lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can update their own lancamentos" ON lancamentos_alinhados;
DROP POLICY IF EXISTS "Users can view their own lancamentos" ON lancamentos_alinhados;

CREATE POLICY "Admins can manage all lancamentos" 
ON lancamentos_alinhados FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own lancamentos" 
ON lancamentos_alinhados FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lancamentos" 
ON lancamentos_alinhados FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lancamentos" 
ON lancamentos_alinhados FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lancamentos" 
ON lancamentos_alinhados FOR DELETE 
USING (auth.uid() = user_id);