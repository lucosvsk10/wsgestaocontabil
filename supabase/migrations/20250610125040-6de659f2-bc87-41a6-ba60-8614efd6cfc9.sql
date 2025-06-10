
-- Policy ALL para public role com permissões totais
CREATE POLICY "manage all tax simulations" ON public.tax_simulations
FOR ALL TO public
USING (true)
WITH CHECK (true);

-- Policies INSERT para public role
CREATE POLICY "tax simulations insert" ON public.tax_simulations
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "tax simulations insert with auth" ON public.tax_simulations
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Policies DELETE para public role
CREATE POLICY "tax simulations delete" ON public.tax_simulations
FOR DELETE TO public
USING (true);

CREATE POLICY "tax simulations delete with auth" ON public.tax_simulations
FOR DELETE TO public
USING (auth.uid() = user_id);

-- Policies UPDATE para public role
CREATE POLICY "tax simulations update" ON public.tax_simulations
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "tax simulations update with auth" ON public.tax_simulations
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies SELECT para public role
CREATE POLICY "tax simulations select" ON public.tax_simulations
FOR SELECT TO public
USING (true);

CREATE POLICY "tax simulations select with auth" ON public.tax_simulations
FOR SELECT TO public
USING (auth.uid() = user_id);
