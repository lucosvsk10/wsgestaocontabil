import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CredentialStatus = {
  configured: boolean;
  supported: boolean;
  uf: string | null;
  portal_name: string;
  verification_status: string;
  verification_label: string;
  last_verified_at: string | null;
  can_reconcile: boolean;
  username_automatic: boolean;
  username_source: string | null;
  sales_status?: string | null;
  sales_error?: string | null;
  sales_started_at?: string | null;
  sales_completed_at?: string | null;
  sales_found?: number;
  sales_documents?: number;
  reconciliation_total?: number;
  reconciliation_resolved?: number;
  reconciliation_pending?: number;
  reconciliation_complete?: boolean;
};

async function callCredential(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('fiscal-state-credential', { body });
  if (!error && !data?.error) return data;
  let message = data?.error || error?.message || 'Não foi possível validar o acesso estadual.';
  try {
    const context = (error as { context?: Response })?.context;
    if (context) message = (await context.clone().json())?.error || message;
  } catch {
    // Mantém a mensagem segura quando a resposta não possui JSON legível.
  }
  throw new Error(message);
}

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const tone = (status?: string) => {
  if (status === 'valid') return 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300';
  if (status === 'valid_without_report_permission' || status === 'pending_verification' || status === 'portal_unavailable')
    return 'text-amber-700 bg-amber-500/10 dark:text-amber-300';
  if (status === 'invalid_credentials') return 'text-destructive bg-destructive/10';
  return 'text-muted-foreground bg-muted/40';
};

export function StateCredentialPanel({
  officeCompanyId,
  fiscalCompanyId,
  state,
  allowDelete = false,
  onChanged,
  portal = false,
}: {
  officeCompanyId?: string;
  state?: string | null;
  allowDelete?: boolean;
  fiscalCompanyId?: string;
  onChanged?: (status?: CredentialStatus | null) => void;
  portal?: boolean;
}) {
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const base = useMemo(() => fiscalCompanyId
    ? { fiscal_company_id: fiscalCompanyId }
    : officeCompanyId ? { office_company_id: officeCompanyId } : {}, [fiscalCompanyId, officeCompanyId]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await callCredential({ action: 'status', ...base });
      setStatus(result.status || null);
      if (silent) setError('');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const active =
      status?.verification_status === 'pending_verification' ||
      status?.verification_status === 'valid' &&
        ['queued', 'reconciling', 'waiting_sales_reference', 'running'].includes(String(status?.sales_status || ''));
    if (!active) return;
    const timer = window.setInterval(() => void load(true), 3000);
    return () => window.clearInterval(timer);
  }, [load, status?.verification_status, status?.sales_status]);

  const saveAndTest = async () => {
    if ((!status?.username_automatic && !username.trim()) || !password) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await callCredential({ action: 'save_deferred', ...base, username: username.trim(), password });
      setStatus(result.status || null);
      setUsername('');
      setPassword('');
      setMessage('');
      onChanged?.(result.status || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!allowDelete || !window.confirm('Remover o acesso estadual desta empresa? A busca completa de vendas ficará bloqueada até um novo cadastro.')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await callCredential({ action: 'delete', ...base });
      setStatus(result.status || null);
      setMessage('Acesso estadual removido.');
      onChanged?.(result.status || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const effectiveUf = String(status?.uf || state || '').toUpperCase();
  const liveStatus = (() => {
    if (!status?.configured) return { text: 'Informe a senha do portal para iniciar.', busy: false, kind: 'muted' };
    if (status.verification_status === 'pending_verification')
      return { text: 'Validando acesso na SEFAZ/AL…', busy: true, kind: 'warning' };
    if (status.verification_status === 'invalid_credentials')
      return { text: 'Senha inválida. Atualize o acesso para continuar.', busy: false, kind: 'error' };
    if (status.verification_status === 'valid_without_report_permission')
      return { text: 'Acesso confirmado, mas sem permissão para consultar o relatório fiscal.', busy: false, kind: 'error' };
    if (status.verification_status === 'portal_unavailable')
      return { text: 'SEFAZ indisponível no momento. A validação será tentada novamente automaticamente.', busy: true, kind: 'warning' };
    if (status.verification_status === 'valid') {
      const found = Number(status.sales_documents || status.sales_found || 0);
      if (status.reconciliation_complete)
        return { text: `Sincronização concluída · ${found} nota${found === 1 ? '' : 's'} encontrada${found === 1 ? '' : 's'}.`, busy: false, kind: 'success' };
      if (['reconciling', 'running'].includes(String(status.sales_status || '')))
        return { text: `Acesso confirmado. Buscando notas emitidas…${found ? ` ${found} encontrada${found === 1 ? '' : 's'} até agora.` : ''}`, busy: true, kind: 'success' };
      if (status.sales_status === 'error')
        return { text: 'Acesso confirmado, mas a busca encontrou um erro e será retomada automaticamente.', busy: false, kind: 'warning' };
      return { text: 'Acesso confirmado. Busca das notas emitidas iniciada.', busy: true, kind: 'success' };
    }
    return { text: status.verification_label || 'Aguardando processamento.', busy: false, kind: 'muted' };
  })();
  if (loading) return <div className="h-28 animate-pulse rounded-xl bg-muted/25" />;
  if (effectiveUf && effectiveUf !== 'AL') {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
        <p className="text-sm font-medium">SEFAZ Estadual · {effectiveUf}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">A automação de credenciais estaduais está disponível primeiro para Alagoas. Esta empresa continua usando as fontes nacionais e os conectores específicos da UF.</p>
      </div>
    );
  }

  return (
    <section className={portal ? 'rounded-xl border border-white/10 bg-[#071426] p-5' : 'rounded-xl border border-border/60 bg-muted/10 p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={portal ? 'text-[10px] font-semibold uppercase tracking-[.12em] text-[#718096]' : 'text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground'}>SEFAZ Estadual · AL</p>
          <h3 className={portal ? 'mt-1 text-sm font-semibold text-white' : 'mt-1 text-sm font-semibold'}>Acesso para conferência completa das vendas</h3>
          <p className={portal ? 'mt-1 max-w-2xl text-xs leading-5 text-[#91a1b5]' : 'mt-1 max-w-2xl text-xs leading-5 text-muted-foreground'}>
            O acesso é salvo no cofre fiscal e nunca volta para a tela. A validação ocorre no backend; depois de confirmada, o Extrator compara a fonte estadual com os documentos exibidos no sistema.
          </p>
        </div>
        <span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold ' + tone(status?.verification_status)}>
          {status?.verification_status === 'valid'
            ? (status.reconciliation_complete ? 'Sincronizado' : 'Buscando notas')
            : status?.configured ? status.verification_label : 'Não configurado'}
        </span>
      </div>

      <div className={portal ? 'mt-4 rounded-lg border border-white/10 bg-white/[.025] p-3' : 'mt-4 rounded-lg border border-border/50 bg-background/50 p-3'}>
        <div className="flex items-center gap-2">
          {liveStatus.busy
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            : <ShieldCheck className="h-4 w-4 shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-medium">{liveStatus.text}</p>
            {status?.configured && status.last_verified_at && (
              <p className={portal ? 'mt-0.5 text-[10px] text-[#91a1b5]' : 'mt-0.5 text-[10px] text-muted-foreground'}>
                Última validação: {formatDate(status.last_verified_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={'mt-4 grid gap-3 ' + (status?.username_automatic ? '' : 'sm:grid-cols-2')}>
        {!status?.username_automatic && <label>
          <span className={portal ? 'mb-1.5 block text-[10px] font-medium text-[#91a1b5]' : 'mb-1.5 block text-xs font-medium text-muted-foreground'}>Usuário do portal</span>
          <Input autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} placeholder="CACEAL sem dígito verificador" />
        </label>}
        <label>
          <span className={portal ? 'mb-1.5 block text-[10px] font-medium text-[#91a1b5]' : 'mb-1.5 block text-xs font-medium text-muted-foreground'}>
            {status?.configured ? 'Nova senha (somente para substituir)' : 'Senha do portal'}
          </span>
          <Input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder={status?.configured ? 'Deixe vazio para manter' : 'Senha SEFAZ/AL'} />
          {status?.username_automatic && <small className={portal ? 'mt-1 block text-[10px] text-[#91a1b5]' : 'mt-1 block text-xs text-muted-foreground'}>O usuário foi identificado automaticamente pela inscrição estadual do A1.</small>}
        </label>
      </div>

      {(error || message) && (
        <div className={'mt-3 rounded-lg px-3 py-2 text-xs ' + (error
          ? 'bg-destructive/10 text-destructive'
          : status?.verification_status === 'valid'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
          {error || message}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={busy || (!status?.username_automatic && !username.trim()) || !password} onClick={() => void saveAndTest()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar acesso
        </Button>
        {status?.configured && allowDelete && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => void remove()}>
            Remover
          </Button>
        )}
      </div>
    </section>
  );
}
