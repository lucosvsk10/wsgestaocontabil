GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can read all documents files" ON storage.objects;

CREATE POLICY "Admins can read all documents files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());