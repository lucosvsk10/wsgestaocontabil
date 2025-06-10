
-- 1. Adicionar campo status à tabela documents para controlar estados
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Criar índice para melhor performance nas consultas de status
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON public.documents(expires_at);

-- 3. Criar função para marcar documentos expirados como "expired" em vez de deletá-los
CREATE OR REPLACE FUNCTION public.mark_expired_documents()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Marcar documentos expirados como "expired" em vez de deletá-los
  UPDATE documents 
  SET status = 'expired'
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND status = 'active';
END;
$$;

-- 4. Criar trigger para notificações automáticas quando documentos são inseridos
CREATE OR REPLACE FUNCTION public.create_document_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir notificação para o usuário
  INSERT INTO notifications (user_id, message, type)
  VALUES (
    NEW.user_id, 
    'Novo documento enviado: ' || NEW.name, 
    'Novo Documento'
  );
  RETURN NEW;
END;
$$;

-- 5. Criar o trigger que executa a função acima
DROP TRIGGER IF EXISTS trigger_document_notification ON public.documents;
CREATE TRIGGER trigger_document_notification
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.create_document_notification();

-- 6. Habilitar extensões necessárias para cron jobs (se não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 7. Criar job cron para marcar documentos expirados diariamente às 2:00 AM
SELECT cron.schedule(
  'mark-expired-documents-daily',
  '0 2 * * *',
  'SELECT public.mark_expired_documents();'
);

-- 8. Atualizar políticas RLS para documentos - clientes só veem documentos ativos
DROP POLICY IF EXISTS "Users can view their own active documents" ON public.documents;
CREATE POLICY "Users can view their own active documents" ON public.documents
FOR SELECT TO public
USING (
  user_id = auth.uid() AND 
  (status = 'active' OR status IS NULL)
);

-- 9. Política para administradores verem todos os documentos
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
CREATE POLICY "Admins can view all documents" ON public.documents
FOR SELECT TO public
USING (public.is_admin());

-- 10. Política para inserção de documentos
DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
CREATE POLICY "Admins can insert documents" ON public.documents
FOR INSERT TO public
WITH CHECK (public.is_admin());

-- 11. Política para atualização de documentos
DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;
CREATE POLICY "Admins can update documents" ON public.documents
FOR UPDATE TO public
USING (public.is_admin());

-- 12. Política para exclusão de documentos
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;
CREATE POLICY "Admins can delete documents" ON public.documents
FOR DELETE TO public
USING (public.is_admin());

-- 13. Marcar documentos expirados existentes
UPDATE documents 
SET status = 'expired'
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW() 
  AND (status IS NULL OR status = 'active');
