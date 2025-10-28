-- Adicionar políticas de DELETE para a tabela uploads
-- Permitir que usuários deletem APENAS seus próprios uploads
CREATE POLICY "Usuários podem deletar seus próprios uploads"
ON uploads
FOR DELETE
USING (auth.uid() = user_id);

-- Permitir que admins deletem qualquer upload
CREATE POLICY "Admins podem deletar qualquer upload"
ON uploads
FOR DELETE
USING (is_admin());