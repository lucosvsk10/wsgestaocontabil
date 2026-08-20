-- Fundação aditiva para a nova Central de Lançamentos.
-- A lógica contábil é global; os C.R.s e confirmações pertencem a cada empresa.

CREATE TABLE IF NOT EXISTS public.lancamento_account_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  role_key text NOT NULL,
  role_label text NOT NULL,
  account_cr text NOT NULL,
  account_description text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggestion', 'confirmed_history')),
  confidence numeric(5,4),
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_lancamento_account_roles_client
  ON public.lancamento_account_roles(client_id);

CREATE TABLE IF NOT EXISTS public.lancamento_ai_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('despesas', 'compras', 'faturamento', 'folha', 'balancete')),
  rule_key text NOT NULL,
  title text NOT NULL,
  instruction text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, rule_key, version)
);

CREATE INDEX IF NOT EXISTS idx_lancamento_ai_rules_active
  ON public.lancamento_ai_rules(module, is_active, priority);

CREATE TABLE IF NOT EXISTS public.lancamento_ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  module text NOT NULL CHECK (module IN ('despesas', 'compras', 'faturamento', 'folha', 'balancete')),
  document_id uuid,
  original_output jsonb NOT NULL,
  corrected_output jsonb NOT NULL,
  correction_summary text,
  approved_by uuid,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'ignored', 'candidate')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamento_ai_feedback_client_module
  ON public.lancamento_ai_feedback(client_id, module, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lancamento_period_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  competencia text NOT NULL,
  module text NOT NULL CHECK (module IN ('despesas', 'compras', 'faturamento', 'folha', 'balancete')),
  status text NOT NULL DEFAULT 'nao_iniciado' CHECK (
    status IN ('nao_iniciado', 'recebido', 'processando', 'revisar', 'lancado', 'sem_movimento', 'erro')
  ),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, competencia, module)
);

CREATE INDEX IF NOT EXISTS idx_lancamento_period_modules_context
  ON public.lancamento_period_modules(client_id, competencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_account_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_ai_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_ai_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamento_period_modules TO authenticated;

GRANT ALL ON public.lancamento_account_roles TO service_role;
GRANT ALL ON public.lancamento_ai_rules TO service_role;
GRANT ALL ON public.lancamento_ai_feedback TO service_role;
GRANT ALL ON public.lancamento_period_modules TO service_role;

ALTER TABLE public.lancamento_account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamento_ai_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamento_ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamento_period_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lancamento account roles"
  ON public.lancamento_account_roles FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins manage lancamento ai rules"
  ON public.lancamento_ai_rules FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins manage lancamento ai feedback"
  ON public.lancamento_ai_feedback FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Admins manage lancamento period modules"
  ON public.lancamento_period_modules FOR ALL
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

CREATE POLICY "Clients view own lancamento module status"
  ON public.lancamento_period_modules FOR SELECT
  USING (auth.uid() = client_id);

CREATE TRIGGER set_lancamento_account_roles_updated_at
  BEFORE UPDATE ON public.lancamento_account_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_lancamento_ai_rules_updated_at
  BEFORE UPDATE ON public.lancamento_ai_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_lancamento_period_modules_updated_at
  BEFORE UPDATE ON public.lancamento_period_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
