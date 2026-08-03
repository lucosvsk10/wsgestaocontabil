-- 1. Drop legacy/unused tables
DROP TABLE IF EXISTS public.lancamentos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar usuários" ON auth.users;
DROP TABLE IF EXISTS public.roles;

-- 2. Polls: remove overly permissive "any authenticated user" SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all polls" ON public.polls;
DROP POLICY IF EXISTS "Authenticated users can view all poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Authenticated users can view all poll responses" ON public.poll_responses;

CREATE POLICY "Creators and admins can view their polls"
ON public.polls FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.is_any_admin(auth.uid()));

CREATE POLICY "Creators and admins can view poll options"
ON public.poll_options FOR SELECT TO authenticated
USING (
  public.is_any_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid())
);

CREATE POLICY "Users see own responses, creators and admins see all"
ON public.poll_responses FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_any_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_responses.poll_id AND p.created_by = auth.uid())
);

-- 3. Remove always-true write policies
DROP POLICY IF EXISTS "Allow insert on document_categories for authenticated users" ON public.document_categories;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.document_categories;

CREATE POLICY "Admins can insert document categories"
ON public.document_categories FOR INSERT TO authenticated
WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update document categories"
ON public.document_categories FOR UPDATE TO authenticated
USING (public.is_any_admin(auth.uid()))
WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can insert form responses" ON public.form_responses;
CREATE POLICY "Responses only for existing polls and own user"
ON public.form_responses FOR INSERT
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = form_responses.poll_id)
);

DROP POLICY IF EXISTS "Anyone can insert numerical responses" ON public.numerical_responses;
CREATE POLICY "Numerical responses only for existing polls and own user"
ON public.numerical_responses FOR INSERT
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = numerical_responses.poll_id)
);

-- 4. Storage: wildcard lancamentos bucket upload requires ownership or admin
DROP POLICY IF EXISTS "Sistema pode fazer upload em buckets de lançamentos" ON storage.objects;
CREATE POLICY "Upload apenas no proprio bucket de lancamentos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id LIKE 'user\_%\_lancamentos\_%'
  AND (
    bucket_id LIKE ('user_' || auth.uid()::text || '_lancamentos_%')
    OR public.is_admin()
  )
);

-- 5. Lock down SECURITY DEFINER functions from anonymous execution
REVOKE EXECUTE ON FUNCTION public.create_document_notification() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.foldername() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.foldername(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.foldername(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_any_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id() FROM anon, PUBLIC;