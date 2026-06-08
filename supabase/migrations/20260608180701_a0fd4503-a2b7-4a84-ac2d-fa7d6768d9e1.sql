
-- 1. documents: fix insert/update policies (any-user attribution / blanket update)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.documents;
CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. roles table privilege escalation: restrict management to admin only
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.roles;
CREATE POLICY "Only admins can manage roles in roles table"
  ON public.roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. tax_simulations: remove anonymous insert policy
DROP POLICY IF EXISTS "Usuários podem criar simulações" ON public.tax_simulations;

-- 4. storage: remove blanket authenticated read/upload across all buckets
DROP POLICY IF EXISTS "Allow read for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload for authenticated users" ON storage.objects;

-- 5. xml-nfe bucket: restrict write operations to admins
DROP POLICY IF EXISTS "Admins can upload XML files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update XML files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete XML files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view XML files" ON storage.objects;
CREATE POLICY "Admins can upload XML files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'xml-nfe' AND public.is_admin());
CREATE POLICY "Admins can update XML files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'xml-nfe' AND public.is_admin())
  WITH CHECK (bucket_id = 'xml-nfe' AND public.is_admin());
CREATE POLICY "Admins can delete XML files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'xml-nfe' AND public.is_admin());
CREATE POLICY "Admins can view XML files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'xml-nfe' AND public.is_admin());

-- 6. Function search_path hardening for functions missing SET search_path
CREATE OR REPLACE FUNCTION public.is_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT c.id FROM public.companies c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.cnpj = (
      SELECT cd.cnpj FROM public.company_data cd
      WHERE cd.user_id = auth.uid()
    )
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_carousel_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_data_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_fiscal_companies_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 7. Revoke EXECUTE on internal helper SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.foldername() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.foldername(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_any_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
