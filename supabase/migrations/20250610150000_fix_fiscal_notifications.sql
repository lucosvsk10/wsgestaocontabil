
-- Habilitar realtime para fiscal_events (notifications já está habilitada)
ALTER TABLE public.fiscal_events REPLICA IDENTITY FULL;

-- Adicionar fiscal_events à publicação do realtime (notifications já está)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_events;
  EXCEPTION WHEN duplicate_object THEN
    -- Tabela já está na publicação, ignorar erro
    NULL;
  END;
END $$;

-- Criar trigger para notificações de eventos fiscais
CREATE OR REPLACE FUNCTION public.create_fiscal_event_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir notificação para todos os usuários sobre novo evento fiscal
  INSERT INTO notifications (user_id, message, type)
  SELECT 
    u.id,
    'Novo evento na agenda fiscal: ' || NEW.title,
    'Evento Fiscal'
  FROM users u
  WHERE u.role IN ('client', 'admin');
  
  RETURN NEW;
END;
$function$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_fiscal_event_notification ON public.fiscal_events;

-- Criar trigger que executa após inserção de evento fiscal
CREATE TRIGGER trigger_fiscal_event_notification
  AFTER INSERT ON public.fiscal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_fiscal_event_notification();
