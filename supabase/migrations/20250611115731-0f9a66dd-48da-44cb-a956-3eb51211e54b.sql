
-- Criar tabela para itens do carrossel
CREATE TABLE IF NOT EXISTS public.carousel_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text NOT NULL,
  instagram text,
  whatsapp text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.carousel_items ENABLE ROW LEVEL SECURITY;

-- Política para permitir que administradores vejam todos os itens
CREATE POLICY "Admins can view all carousel items" ON public.carousel_items
FOR SELECT TO public
USING (public.is_admin());

-- Política para permitir que administradores insiram itens
CREATE POLICY "Admins can insert carousel items" ON public.carousel_items
FOR INSERT TO public
WITH CHECK (public.is_admin());

-- Política para permitir que administradores atualizem itens
CREATE POLICY "Admins can update carousel items" ON public.carousel_items
FOR UPDATE TO public
USING (public.is_admin());

-- Política para permitir que administradores deletem itens
CREATE POLICY "Admins can delete carousel items" ON public.carousel_items
FOR DELETE TO public
USING (public.is_admin());

-- Política para permitir que qualquer pessoa visualize itens ativos (para o carrossel público)
CREATE POLICY "Public can view active carousel items" ON public.carousel_items
FOR SELECT TO public
USING (status = 'active');

-- Criar bucket para logos do carrossel se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-logos', 'carousel-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que administradores façam upload
CREATE POLICY "Admins can upload carousel logos" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'carousel-logos' AND public.is_admin());

-- Política para permitir acesso público às logos
CREATE POLICY "Public access to carousel logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'carousel-logos');

-- Política para permitir que administradores deletem logos
CREATE POLICY "Admins can delete carousel logos" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'carousel-logos' AND public.is_admin());
