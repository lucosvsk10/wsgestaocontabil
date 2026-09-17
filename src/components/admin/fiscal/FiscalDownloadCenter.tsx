import { useEffect, useMemo, useState } from 'react';
import { Archive, Download, FileCode2, FileSpreadsheet, FileText, KeyRound, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

type FiscalCompanyOption = { id: string; name: string };
type DownloadFormat = 'bundle' | 'pdf' | 'xml' | 'keys' | 'report';
type Direction = 'todos' | 'entrada' | 'saida';
type DocumentType = 'todos' | 'nfe' | 'nfce' | 'nfse';
type CompanyScope = 'current' | 'all';

type Props = {
  open: boolean;
  currentCompany: FiscalCompanyOption | null;
  companies: FiscalCompanyOption[];
  initialStart: string;
  initialEnd: string;
  initialDirection?: Direction;
  onClose: () => void;
};

type Preflight = {
  total: number;
  complete: number;
  pending: number;
  companies: number;
  archive_limit?: number;
  too_large?: boolean;
};

const formats: Array<{ id: DownloadFormat; title: string; description: string; icon: typeof Archive }> = [
  { id: 'bundle', title: 'Pacote completo', description: 'PDF oficial + XML, organizados em ZIP.', icon: Archive },
  { id: 'pdf', title: 'Somente PDF', description: 'DANFE, NFC-e ou DANFSe em um único ZIP.', icon: FileText },
  { id: 'xml', title: 'Somente XML', description: 'Arquivos XML integrais das notas selecionadas.', icon: FileCode2 },
  { id: 'keys', title: 'Chaves das notas', description: 'Lista simples com as chaves e identificação das notas.', icon: KeyRound },
  { id: 'report', title: 'Relatório', description: 'Planilha CSV com dados fiscais, valores, situação e chaves.', icon: FileSpreadsheet },
];

const getFilename = (response: Response, fallback: string) => {
  const header = response.headers.get('content-disposition') || '';
  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const formatLabel: Record<DownloadFormat, string> = {
  bundle: 'Pacote completo',
  pdf: 'Somente PDF',
  xml: 'Somente XML',
  keys: 'Chaves das notas',
  report: 'Relatório',
};

export function FiscalDownloadCenter({
  open,
  currentCompany,
  companies,
  initialStart,
  initialEnd,
  initialDirection = 'todos',
  onClose,
}: Props) {
  const [format, setFormat] = useState<DownloadFormat>('bundle');
  const [scope, setScope] = useState<CompanyScope>('current');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [documentType, setDocumentType] = useState<DocumentType>('todos');
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [error, setError] = useState('');

  const fiscalCompanies = useMemo(() => companies.filter(item => item.id), [companies]);
  const canUseAll = fiscalCompanies.length > 1;
  const requiresIntegralFiles = ['bundle', 'pdf', 'xml'].includes(format);
  const invalidPeriod = !start || !end || start > end;
  const downloadBlocked = Boolean(
    !preflight ||
      preflight.total === 0 ||
      invalidPeriod ||
      (requiresIntegralFiles && preflight.pending > 0) ||
      (requiresIntegralFiles && preflight.too_large)
  );

  useEffect(() => {
    if (!open) return;
    setStart(initialStart);
    setEnd(initialEnd);
    setDirection(initialDirection);
    setScope('current');
    setFormat('bundle');
    setDocumentType('todos');
    setPreflight(null);
    setError('');
  }, [open, initialStart, initialEnd, initialDirection, currentCompany?.id]);

  useEffect(() => {
    setPreflight(null);
    setError('');
  }, [format, scope, start, end, direction, documentType]);

  if (!open) return null;

  const payload = (action: 'preflight' | 'download') => ({
    action,
    format,
    company_id: scope === 'current' ? currentCompany?.id : undefined,
    all_companies: scope === 'all',
    start,
    end,
    direction,
    document_type: documentType,
  });

  const check = async () => {
    if (invalidPeriod || !currentCompany) return;
    setChecking(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-fiscal-export', {
        body: payload('preflight'),
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));
      setPreflight({
        total: Number(data?.total || 0),
        complete: Number(data?.complete || 0),
        pending: Number(data?.pending || 0),
        companies: Number(data?.companies || 0),
        archive_limit: Number(data?.archive_limit || 0) || undefined,
        too_large: Boolean(data?.too_large),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setPreflight(null);
    } finally {
      setChecking(false);
    }
  };

  const download = async () => {
    if (downloadBlocked || !currentCompany) return;
    setDownloading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Entre novamente para continuar.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-fiscal-export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload('download')),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(String(body?.error || `Falha ao preparar o download (${response.status}).`));
      }
      const fallback = `${format === 'report' ? 'relatorio-fiscal.csv' : format === 'keys' ? 'chaves-fiscais.csv' : 'documentos-fiscais.zip'}`;
      triggerBlobDownload(await response.blob(), getFilename(response, fallback));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[185] flex items-center justify-center bg-black/55 p-3 backdrop-blur-md" onMouseDown={event => event.target === event.currentTarget && !downloading && onClose()}>
      <div className="max-h-[92vh] w-full max-w-[980px] overflow-auto rounded-[24px] border border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Central de downloads</p>
            <h2 className="mt-1 text-xl font-semibold">Baixar documentos fiscais</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha exatamente o que precisa. O sistema confere a integridade antes de gerar arquivos oficiais.</p>
          </div>
          <button disabled={downloading} onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <p className="text-xs font-semibold">1. O que você quer baixar?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {formats.map(item => {
                const Icon = item.icon;
                const active = format === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setFormat(item.id)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-foreground bg-foreground text-background shadow-sm' : 'border-border bg-muted/10 hover:bg-muted/25'}`}>
                    <Icon className="h-4 w-4" />
                    <p className="mt-3 text-sm font-semibold">{item.title}</p>
                    <p className={`mt-1 text-[11px] leading-4 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>{item.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold">2. Empresas</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setScope('current')} className={`rounded-xl border px-4 py-3 text-left ${scope === 'current' ? 'border-foreground bg-muted/35' : 'border-border'}`}>
                  <p className="text-sm font-semibold">Empresa atual</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{currentCompany?.name || '—'}</p>
                </button>
                <button type="button" disabled={!canUseAll} onClick={() => canUseAll && setScope('all')} className={`rounded-xl border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40 ${scope === 'all' ? 'border-foreground bg-muted/35' : 'border-border'}`}>
                  <p className="text-sm font-semibold">Todas as empresas</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fiscalCompanies.length} com perfil fiscal</p>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold">3. Período</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-[11px] font-medium text-muted-foreground">Início<Input className="mt-1.5" type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
                <label className="text-[11px] font-medium text-muted-foreground">Fim<Input className="mt-1.5" type="date" min={start} value={end} onChange={event => setEnd(event.target.value)} /></label>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Operação
              <select value={direction} onChange={event => setDirection(event.target.value as Direction)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal">
                <option value="todos">Compras + vendas</option>
                <option value="entrada">Somente compras / entradas</option>
                <option value="saida">Somente vendas / saídas</option>
              </select>
            </label>
            <label className="text-xs font-semibold">Tipo de documento
              <select value={documentType} onChange={event => setDocumentType(event.target.value as DocumentType)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal">
                <option value="todos">Todos</option>
                <option value="nfe">NF-e</option>
                <option value="nfce">NFC-e</option>
                <option value="nfse">NFS-e</option>
              </select>
            </label>
          </section>

          {invalidPeriod && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">Informe um período válido.</div>}
          {error && <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</div>}

          {preflight && (
            <section className={`rounded-2xl border p-5 ${preflight.pending || preflight.too_large ? 'border-amber-500/30 bg-amber-500/7' : 'border-emerald-500/30 bg-emerald-500/7'}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><p className="text-2xl font-semibold">{preflight.total}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Documentos</p></div>
                <div><p className="text-2xl font-semibold text-emerald-600">{preflight.complete}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Íntegros</p></div>
                <div><p className={`text-2xl font-semibold ${preflight.pending ? 'text-amber-600' : 'text-emerald-600'}`}>{preflight.pending}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pendentes</p></div>
                <div><p className="text-2xl font-semibold">{preflight.companies}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Empresas</p></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {preflight.total === 0
                  ? 'Nenhum documento foi encontrado com esses filtros.'
                  : requiresIntegralFiles && preflight.pending > 0
                    ? `Há ${preflight.pending} documento(s) sem arquivo integral. O ZIP oficial só é liberado quando todos estiverem completos; relatórios e chaves continuam disponíveis normalmente.`
                    : preflight.too_large
                      ? `O pacote tem documentos demais para uma geração segura de uma só vez. Limite atual: ${preflight.archive_limit || 200}. Reduza o período ou filtre o tipo.`
                      : `${formatLabel[format]} pronto para ser gerado com os filtros selecionados.`}
              </p>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <p className="text-xs text-muted-foreground">{scope === 'all' ? 'Todas as empresas fiscais' : currentCompany?.name || 'Empresa atual'} · {formatLabel[format]}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={checking || downloading || invalidPeriod} onClick={() => void check()}>{checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{checking ? 'Conferindo...' : preflight ? 'Conferir novamente' : 'Conferir'}</Button>
            <Button disabled={downloading || checking || downloadBlocked} onClick={() => void download()}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{downloading ? 'Preparando...' : 'Baixar'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
