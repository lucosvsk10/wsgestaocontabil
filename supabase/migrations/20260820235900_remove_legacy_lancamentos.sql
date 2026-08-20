-- Remoção definitiva do sistema legado de lançamentos.
-- Esta migration apaga dados, estruturas e arquivos dos módulos antigos.

DROP POLICY IF EXISTS "Users can upload their own lancamentos files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own lancamentos files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own lancamentos files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all lancamentos files" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'lancamentos';
DELETE FROM storage.buckets WHERE id = 'lancamentos';

DROP TABLE IF EXISTS public.lancamento_ai_feedback CASCADE;
DROP TABLE IF EXISTS public.lancamento_ai_rules CASCADE;
DROP TABLE IF EXISTS public.lancamento_account_roles CASCADE;
DROP TABLE IF EXISTS public.lancamento_period_modules CASCADE;

DROP TABLE IF EXISTS public.folha_transcricoes CASCADE;
DROP TABLE IF EXISTS public.folha_lancamentos CASCADE;
DROP TABLE IF EXISTS public.folha_uploads CASCADE;

DROP TABLE IF EXISTS public.compras_lancamentos CASCADE;
DROP TABLE IF EXISTS public.compras_cfop_mapping CASCADE;
DROP TABLE IF EXISTS public.compras_uploads CASCADE;

DROP TABLE IF EXISTS public.fechamentos_exportados CASCADE;
DROP TABLE IF EXISTS public.month_closures CASCADE;
DROP TABLE IF EXISTS public.lancamentos_alinhados CASCADE;
DROP TABLE IF EXISTS public.lancamentos_processados CASCADE;

ALTER TABLE IF EXISTS public.extrato_bancario
  DROP COLUMN IF EXISTS documento_id;

DROP TABLE IF EXISTS public.documentos_brutos CASCADE;
DROP TABLE IF EXISTS public.documentos_conciliacao CASCADE;
DROP TABLE IF EXISTS public.planos_contas CASCADE;
