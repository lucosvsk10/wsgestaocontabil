
-- Criar bucket para logos do carrossel
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-logos', 'carousel-logos', true);

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Allow authenticated users to upload carousel logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'carousel-logos');

-- Política para permitir que qualquer pessoa visualize as logos (público)
CREATE POLICY "Allow public access to carousel logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'carousel-logos');

-- Política para permitir que usuários autenticados deletem suas próprias uploads
CREATE POLICY "Allow authenticated users to delete carousel logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'carousel-logos');
