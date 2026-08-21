CREATE TABLE IF NOT EXISTS public.accounting_engine_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  password_iterations integer NOT NULL DEFAULT 210000,
  configured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  configured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_key text,
  competence text,
  module text NOT NULL DEFAULT 'engine',
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  response_id text,
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  cached_input_tokens bigint NOT NULL DEFAULT 0 CHECK (cached_input_tokens >= 0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens bigint NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_cost_usd numeric(14, 8) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  error_code text,
  error_message text,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_accounting_ai_usage_created_at
  ON public.accounting_ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_ai_usage_context
  ON public.accounting_ai_usage (company_key, competence, module, created_at DESC);

ALTER TABLE public.accounting_engine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage accounting engine settings" ON public.accounting_engine_settings;
CREATE POLICY "Admins manage accounting engine settings"
  ON public.accounting_engine_settings FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read accounting AI usage" ON public.accounting_ai_usage;
CREATE POLICY "Admins read accounting AI usage"
  ON public.accounting_ai_usage FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()));

REVOKE ALL ON public.accounting_engine_settings FROM anon;
REVOKE ALL ON public.accounting_ai_usage FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.accounting_engine_settings TO authenticated, service_role;
GRANT SELECT ON public.accounting_ai_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_ai_usage TO service_role;

