-- Políticas RLS para buckets de lançamentos mensais

-- Política: Usuários podem ler seus próprios buckets de lançamentos
CREATE POLICY "Usuários podem ler seus buckets de lançamentos"
ON storage.objects FOR SELECT
USING (
  bucket_id LIKE 'user_' || auth.uid()::text || '_lancamentos_%'
);

-- Política: Admins podem ler todos os buckets de lançamentos
CREATE POLICY "Admins podem ler todos buckets de lançamentos"
ON storage.objects FOR SELECT
USING (
  bucket_id LIKE 'user_%_lancamentos_%' 
  AND is_admin()
);

-- Política: Sistema pode fazer upload (via service role key)
CREATE POLICY "Sistema pode fazer upload em buckets de lançamentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id LIKE 'user_%_lancamentos_%'
);

-- Política: Admins podem deletar de qualquer bucket de lançamentos
CREATE POLICY "Admins podem deletar de buckets de lançamentos"
ON storage.objects FOR DELETE
USING (
  bucket_id LIKE 'user_%_lancamentos_%' 
  AND is_admin()
);