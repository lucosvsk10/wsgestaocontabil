import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Download, FileCode2, FileSpreadsheet, FileText, KeyRound, Loader2, X } from 'lucide-react';
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
  exportFunction?: string;
  allowAllCompanies?: boolean;
  appearance?: 'default' | 'extractor';
};

type PendingDocument = {
  company: string;
  type: string;
  number: string;
  series: string;
  access_key: string;
  issue_date?: string | null;
  reason?: string | null;
};

type Preflight = {
  total: number;
  complete: number;
  pending: number;
  companies: number;
  archive_limit?: number;
  too_large?: boolean;
  pending_documents?: PendingDocument[];
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
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
};

const isZipSignature = (bytes: Uint8Array) =>
  bytes.length >= 4 &&
  bytes[0] === 0x50 &&
  bytes[1] === 0x4b &&
  ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08));

const formatLabel: Record<DownloadFormat, string> = {
  bundle: 'Pacote completo',
  pdf: 'Somente PDF',
  xml: 'Somente XML',
  keys: 'Chaves das notas',
  report: 'Relatório',
};

const humanDownloadError = (value: unknown) => {
  const raw = value instanceof Error ? value.message : String(value || '');
  const message = raw.replace(/^FunctionsHttpError:\s*/i, '').trim();
  if (!message) return 'Não foi possível conferir os documentos agora. Tente novamente.';
  if (/Edge Function|non-2xx|failed to fetch|network|load failed|fetch failed/i.test(message)) {
    return 'Não foi possível concluir a conferência com o servidor. Tente novamente em alguns segundos.';
  }
  if (/rate.?limit|too many requests|429/i.test(message)) {
    return 'Foram feitas muitas tentativas em sequência. Aguarde um pouco e tente novamente.';
  }
  if (/jwt|token|sess[aã]o|unauthorized|não autenticado/i.test(message)) {
    return 'Sua sessão expirou. Entre novamente para continuar o download.';
  }
  return message;
};

const normalizePreflight = (data: any): Preflight => ({
  total: Number(data?.total || 0),
  complete: Number(data?.complete || 0),
  pending: Number(data?.pending || 0),
  companies: Number(data?.companies || 0),
  archive_limit: Number(data?.archive_limit || 0) || undefined,
  too_large: Boolean(data?.too_large),
  pending_documents: Array.isArray(data?.pending_documents)
    ? data.pending_documents.map((item: any) => ({
        company: String(item?.company || ''),
        type: String(item?.type || ''),
        number: String(item?.number || ''),
        series: String(item?.series || ''),
        access_key: String(item?.access_key || ''),
        issue_date: item?.issue_date ? String(item.issue_date) : null,
        reason: item?.reason ? String(item.reason) : null,
      }))
    : [],
});

export function FiscalDownloadCenter({
  open,
  currentCompany,
  companies,
  initialStart,
  initialEnd,
  initialDirection = 'todos',
  onClose,
  exportFunction = 'admin-fiscal-export',
  allowAllCompanies = true,
  appearance = 'default',
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
  const canUseAll = allowAllCompanies && fiscalCompanies.length > 1;
  const requiresIntegralFiles = ['bundle', 'pdf', 'xml'].includes(format);
  const invalidPeriod = !start || !end || start > end;
  const busy = checking || downloading;
  const canDownloadPartial = Boolean(
    preflight &&
      requiresIntegralFiles &&
      preflight.pending > 0 &&
      preflight.complete > 0 &&
      !preflight.too_large
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

  const payload = (action: 'preflight' | 'download', allowPartial = false) => ({
    action,
    format,
    company_id: scope === 'current' ? currentCompany?.id : undefined,
    all_companies: scope === 'all',
    start,
    end,
    direction,
    document_type: documentType,
    allow_partial: allowPartial,
  });

  const preflightRequest = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar o download.');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${exportFunction}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload('preflight')),
    });
    const body = await response.json().catch(() => ({}));
    if (body && typeof body === 'object') setPreflight(normalizePreflight(body));
    if (!response.ok || body?.error) {
      throw new Error(humanDownloadError(body?.error || `Falha ao conferir os documentos (${response.status}).`));
    }
    const next = normalizePreflight(body);
    setPreflight(next);
    return next;
  };

  const performDownload = async (allowPartial = false) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente para continuar.');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${exportFunction}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: requiresIntegralFiles ? 'application/zip' : 'text/csv,application/octet-stream',
      },
      body: JSON.stringify(payload('download', allowPartial)),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (body && typeof body === 'object') setPreflight(normalizePreflight(body));
      throw new Error(humanDownloadError(body?.error || `Falha ao preparar o download (${response.status}).`));
    }

    const fallback = format === 'report'
      ? 'relatorio-fiscal.csv'
      : format === 'keys'
        ? 'chaves-fiscais.csv'
        : 'documentos-fiscais.zip';
    const filename = getFilename(response, fallback);

    if (requiresIntegralFiles) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (!isZipSignature(bytes)) {
        const diagnostic = new TextDecoder().decode(bytes.slice(0, 500)).replace(/\s+/g, ' ').trim();
        throw new Error(
          diagnostic && diagnostic.startsWith('{')
            ? 'O servidor retornou uma resposta de erro no lugar do ZIP. Tente novamente.'
            : 'O arquivo gerado não contém uma estrutura ZIP válida. O download foi interrompido para não salvar um arquivo corrompido.'
        );
      }
      triggerBlobDownload(new Blob([buffer], { type: 'application/zip' }), filename);
    } else {
      triggerBlobDownload(await response.blob(), filename);
    }
  };

  const handleDownload = async () => {
    if (invalidPeriod || !currentCompany || busy) return;
    setChecking(true);
    setError('');
    try {
      const checked = await preflightRequest();
      if (checked.total === 0) return;
      if (requiresIntegralFiles && checked.too_large) return;
      if (requiresIntegralFiles && checked.pending > 0) return;

      setChecking(false);
      setDownloading(true);
      await performDownload(false);
      onClose();
    } catch (caught) {
      setError(humanDownloadError(caught));
    } finally {
      setChecking(false);
      setDownloading(false);
    }
  };

  const handlePartialDownload = async () => {
    if (!canDownloadPartial || !currentCompany || busy) return;
    setDownloading(true);
    setError('');
    try {
      await performDownload(true);
      onClose();
    } catch (caught) {
      setError(humanDownloadError(caught));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`extractor-download-center fixed inset-0 z-[185] flex items-center justify-center bg-black/55 p-3 backdrop-blur-md ${appearance === 'extractor' ? 'extractor-dark-download' : ''}`}
      onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}
    >
      <div className="extractor-download-shell max-h-[92vh] w-full max-w-[980px] overflow-auto rounded-[24px] border border-border bg-background shadow-2xl">
        <div className="extractor-download-head sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Central de downloads</p>
            <h2 className="mt-1 text-xl font-semibold">Baixar documentos fiscais</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha o que precisa. Ao clicar em Baixar, o sistema confere a integridade e inicia o download automaticamente.</p>
          </div>
          <button disabled={busy} onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="extractor-download-body space-y-6 p-6">
          <section>
            <p className="text-xs font-semibold">1. O que você quer baixar?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {formats.map(item => {
                const Icon = item.icon;
                const active = format === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setFormat(item.id)}
                    data-active={active ? 'true' : undefined}
                    className={`rounded-2xl border p-4 text-left transition disabled:opacity-60 ${active ? 'border-foreground bg-foreground text-background shadow-sm' : 'border-border bg-muted/10 hover:bg-muted/25'}`}
                  >
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setScope('current')}
                  data-active={scope === 'current' ? 'true' : undefined}
                  className={`extractor-download-scope rounded-xl border px-4 py-3 text-left disabled:opacity-60 ${scope === 'current' ? 'border-foreground bg-muted/35' : 'border-border'}`}
                >
                  <span className="extractor-download-scope-state">{scope === 'current' ? 'Selecionado' : ''}</span>
                  <p className="text-sm font-semibold">Empresa atual</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{currentCompany?.name || '—'}</p>
                </button>
                <button
                  type="button"
                  disabled={!canUseAll || busy}
                  onClick={() => canUseAll && setScope('all')}
                  data-active={scope === 'all' ? 'true' : undefined}
                  className={`extractor-download-scope rounded-xl border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40 ${scope === 'all' ? 'border-foreground bg-muted/35' : 'border-border'}`}
                >
                  <span className="extractor-download-scope-state">{scope === 'all' ? 'Selecionado' : ''}</span>
                  <p className="text-sm font-semibold">Todas as empresas</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fiscalCompanies.length} com perfil fiscal</p>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold">3. Período</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-[11px] font-medium text-muted-foreground">Início<Input disabled={busy} className="mt-1.5" type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
                <label className="text-[11px] font-medium text-muted-foreground">Fim<Input disabled={busy} className="mt-1.5" type="date" min={start} value={end} onChange={event => setEnd(event.target.value)} /></label>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Operação
              <select disabled={busy} value={direction} onChange={event => setDirection(event.target.value as Direction)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal disabled:opacity-60">
                <option value="todos">Compras + vendas</option>
                <option value="entrada">Somente compras / entradas</option>
                <option value="saida">Somente vendas / saídas</option>
              </select>
            </label>
            <label className="text-xs font-semibold">Tipo de documento
              <select disabled={busy} value={documentType} onChange={event => setDocumentType(event.target.value as DocumentType)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal disabled:opacity-60">
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
            <section className={`extractor-download-preflight rounded-2xl border p-5 ${preflight.pending || preflight.too_large ? 'border-amber-500/30 bg-amber-500/7' : 'border-emerald-500/30 bg-emerald-500/7'}`}>
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
                    ? `${preflight.pending} documento(s) ainda não têm arquivo integral. Você pode aguardar a recuperação ou baixar agora somente os ${preflight.complete} arquivo(s) disponíveis.`
                    : preflight.too_large
                      ? `O pacote tem documentos demais para uma geração segura de uma só vez. Limite atual: ${preflight.archive_limit || 200}. Reduza o período ou filtre o tipo.`
                      : `${formatLabel[format]} conferido e pronto.`}
              </p>

              {requiresIntegralFiles && preflight.pending > 0 && Boolean(preflight.pending_documents?.length) && (
                <div className="mt-4 overflow-hidden rounded-xl border border-amber-500/20 bg-background/70">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Arquivos que não foram encontrados
                  </div>
                  <div className="max-h-48 divide-y overflow-auto">
                    {preflight.pending_documents?.slice(0, 20).map((item, index) => (
                      <div key={`${item.access_key}-${index}`} className="px-3 py-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{item.company || 'Empresa'} · {item.type || 'Documento'} {item.number ? `nº ${item.number}` : ''}</span>
                          {item.series && <span className="text-[10px] text-muted-foreground">Série {item.series}</span>}
                        </div>
                        <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{item.access_key || 'Sem chave informada'}</p>
                        {item.reason && <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">{item.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="extractor-download-footer sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <p className="text-xs text-muted-foreground">{scope === 'all' ? 'Todas as empresas fiscais' : currentCompany?.name || 'Empresa atual'} · {formatLabel[format]}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {canDownloadPartial && (
              <Button variant="outline" disabled={busy} onClick={() => void handlePartialDownload()}>
                <Download className="mr-2 h-4 w-4" />
                Baixar o restante
              </Button>
            )}
            <Button disabled={busy || invalidPeriod || !currentCompany} onClick={() => void handleDownload()}>
              {checking || downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {checking ? 'Conferindo...' : downloading ? 'Preparando...' : 'Baixar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
