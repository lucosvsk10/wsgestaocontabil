
-- Verificar se o trigger já existe antes de criar
DROP TRIGGER IF EXISTS update_carousel_items_updated_at_trigger ON public.carousel_items;

-- Criar função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION public.update_carousel_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_carousel_items_updated_at_trigger
  BEFORE UPDATE ON public.carousel_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_carousel_items_updated_at();
