CREATE POLICY "Admins can read all documents files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());