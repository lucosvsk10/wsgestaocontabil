-- Tabela para armazenar planos de contas por cliente
CREATE TABLE public.planos_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  conteudo TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planos_contas ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todos os planos
CREATE POLICY "Admins can manage all planos_contas" 
ON public.planos_contas 
FOR ALL 
USING (is_admin());

-- Usuários podem ver seu próprio plano
CREATE POLICY "Users can view their own plano_contas" 
ON public.planos_contas 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_planos_contas_updated_at
BEFORE UPDATE ON public.planos_contas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();