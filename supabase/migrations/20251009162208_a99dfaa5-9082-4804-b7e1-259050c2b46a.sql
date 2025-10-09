-- Adicionar política para admins poderem deletar fechamentos de mês
CREATE POLICY "Admins podem deletar fechamentos de mês"
ON public.month_closures
FOR DELETE
USING (is_admin());