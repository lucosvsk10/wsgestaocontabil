-- Remover política que usa tabela roles antiga
DROP POLICY IF EXISTS "Apenas admins podem gerenciar usuários" ON public.users;

-- Criar nova política para admins visualizarem todos os usuários
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (is_any_admin(auth.uid()));