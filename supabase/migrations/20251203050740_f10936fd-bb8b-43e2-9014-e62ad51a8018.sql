-- Add DELETE policy for users to delete their own documents in documentos_conciliacao
CREATE POLICY "Users can delete their own documents"
ON public.documentos_conciliacao
FOR DELETE
USING (auth.uid() = user_id);