-- Criar tabela de uploads
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de fechamentos de mês
CREATE TABLE public.month_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'fechado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.month_closures ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para uploads
CREATE POLICY "Usuários podem visualizar seus próprios uploads"
ON public.uploads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios uploads"
ON public.uploads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem visualizar todos os uploads"
ON public.uploads
FOR SELECT
USING (is_admin());

-- Políticas RLS para month_closures
CREATE POLICY "Usuários podem visualizar seus próprios fechamentos"
ON public.month_closures
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios fechamentos"
ON public.month_closures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem visualizar todos os fechamentos"
ON public.month_closures
FOR SELECT
USING (is_admin());

-- Criar índices para melhor performance
CREATE INDEX idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX idx_uploads_month_year ON public.uploads(month, year);
CREATE INDEX idx_month_closures_user_id ON public.month_closures(user_id);
CREATE INDEX idx_month_closures_month_year ON public.month_closures(month, year);