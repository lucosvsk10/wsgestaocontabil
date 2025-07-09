-- Criar bucket para arquivos XML NFe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('xml-nfe', 'xml-nfe', true);

-- Políticas para o bucket xml-nfe
CREATE POLICY "Admins can view XML files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'xml-nfe' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can upload XML files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'xml-nfe' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update XML files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'xml-nfe' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete XML files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'xml-nfe' AND auth.uid() IS NOT NULL);