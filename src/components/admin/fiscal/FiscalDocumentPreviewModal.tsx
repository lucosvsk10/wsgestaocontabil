import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Download, FileCode2, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  FiscalDocumentLike,
  formatCnpj,
  formatDate,
  formatMoney,
  formatTime,
  parseFiscalPreview,
} from './fiscalDocumentPreviewUtils';

type Props = {
  document: FiscalDocumentLike | null;
  companyName: string;
  companyCnpj: string;
  downloadingPdf?: boolean;
  downloadingXml?: boolean;
  onClose: () => void;
  onDownloadPdf: (document: FiscalDocumentLike) => Promise<void> | void;
  onDownloadXml: (document: FiscalDocumentLike) => Promise<void> | void;
  onManifestation?: (document: FiscalDocumentLike) => void;
};

const statusClass = (status: string) => {
  if (/autoriz/i.test(status)) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (/cancel|deneg/i.test(status)) return 'bg-red-500/10 text-red-700 dark:text-red-300';
  return 'bg-muted text-muted-foreground';
};

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="border-b border-border/70 py-3 last:border-0">
    <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-foreground">{value || '—'}</p>
  </div>
);

function base64ToPdfUrl(base64: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export function FiscalDocumentPreviewModal({
  document,
  companyName,
  companyCnpj,
  downloadingPdf,
  downloadingXml,
  onClose,
  onDownloadPdf,
  onDownloadXml,
  onManifestation,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);

  const data = useMemo(
    () => (document ? parseFiscalPreview(document, companyName, companyCnpj) : null),
    [document, companyName, companyCnpj]
  );

  useEffect(() => {
    if (!document) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [document, onClose]);

  useEffect(() => setCopied(false), [document?.accessKey]);

  useEffect(() => {
    if (!document) {
      setPreviewUrl('');
      setPreviewError('');
      return;
    }

    let active = true;
    let nextUrl = '';
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });

    const load = async () => {
      try {
        if (!document.companyId) throw new Error('Empresa fiscal não identificada para gerar o documento.');
        if (document.documentKind === 'evento') throw new Error('Eventos fiscais não possuem DANFE para pré-visualização.');

        const { data: response, error } = await supabase.functions.invoke('dfe-danfe-pdf', {
          body: { company_id: document.companyId, document },
        });
        if (error) throw error;
        const base64 = String(response?.pdf_base64 || '');
        if (!base64) throw new Error(String(response?.error || 'O documento completo não pôde ser gerado.'));

        nextUrl = base64ToPdfUrl(base64);
        if (!active) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        setPreviewUrl(nextUrl);
      } catch (caught) {
        if (!active) return;
        setPreviewError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [document, previewNonce]);

  if (!document || !data) return null;
  const needsManifestation = document.parseError === 'xml_requires_manifestation';
  const manifestationSent = document.parseError === 'xml_retry:manifestation_sent';
  const canDownloadXml = Boolean(document.xml && document.fullXml);

  const copyKey = async () => {
    if (!data.accessKey) return;
    await navigator.clipboard.writeText(data.accessKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <div className="grid h-[94vh] w-full max-w-[1580px] overflow-hidden rounded-[24px] border border-white/10 bg-background shadow-2xl lg:grid-cols-[minmax(0,1.65fr)_420px]">
        <section className="flex min-h-0 flex-col bg-zinc-200/90 p-3 sm:p-5 dark:bg-zinc-900/80">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Documento fiscal</p>
              <p className="mt-1 text-sm font-semibold">Mesmo modelo utilizado no PDF oficial</p>
            </div>
            <span className="rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
              Visualização completa
            </span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
            {previewLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/92 text-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="mt-3 text-sm font-medium">Gerando documento completo...</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">O preview usa exatamente o mesmo gerador do PDF baixado.</p>
              </div>
            )}

            {!previewLoading && previewUrl && (
              <iframe
                title={`Documento fiscal ${data.number}`}
                src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                className="h-full min-h-[640px] w-full bg-white"
              />
            )}

            {!previewLoading && !previewUrl && (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <Info className="h-6 w-6 text-amber-500" />
                <p className="mt-3 text-sm font-semibold">Documento completo indisponível neste momento</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  {previewError || 'O XML integral ainda não está disponível para gerar o documento fiscal completo.'}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setPreviewNonce(value => value + 1)}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-auto border-l border-border bg-background">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 px-5 py-5 backdrop-blur">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Resumo</p>
              <h2 className="mt-1 text-lg font-semibold">{data.type} · {data.number}</h2>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(data.status)}`}>{data.status}</span>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-2">
            <Line label="Empresa" value={`${companyName}${companyCnpj ? ` · ${formatCnpj(companyCnpj)}` : ''}`} />
            <Line label="Operação" value={data.operation} />
            <Line label="Tipo" value={data.type} />
            <Line label="Emissão" value={`${formatDate(data.issueDate)} às ${formatTime(data.issueDate)}`} />
            <Line label="Valor" value={formatMoney(data.value)} />
            <Line label="Nota / série" value={`${data.number} / ${data.series}`} />
            <Line label="Emitente" value={`${data.issuerName}${data.issuerCnpj ? ` · ${formatCnpj(data.issuerCnpj)}` : ''}`} />
            <Line label="Destinatário" value={`${data.recipientName}${data.recipientCnpj ? ` · ${formatCnpj(data.recipientCnpj)}` : ''}`} />
            <div className="border-b border-border/70 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground">Chave de acesso</p>
              <p className="mt-1 break-all font-mono text-xs leading-5 text-foreground">{data.accessKey || '—'}</p>
              {data.accessKey && (
                <Button variant="ghost" size="sm" className="mt-1 -ml-2 h-8" onClick={() => void copyKey()}>
                  {copied ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Clipboard className="mr-1.5 h-3.5 w-3.5" />}
                  {copied ? 'Copiada' : 'Copiar chave'}
                </Button>
              )}
            </div>
          </div>

          {(needsManifestation || manifestationSent) && (
            <div className="mx-5 mt-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{needsManifestation ? 'Manifestação necessária' : 'Manifestação registrada'}</p>
                  <p className="mt-1 text-xs leading-5">
                    {needsManifestation
                      ? 'A SEFAZ exige a manifestação do destinatário antes de liberar o XML integral desta NF-e.'
                      : 'A manifestação já foi enviada e o sistema continua tentando recuperar o XML integral.'}
                  </p>
                </div>
              </div>
              {needsManifestation && onManifestation && (
                <Button size="sm" className="mt-3" onClick={() => onManifestation(document)}>Resolver manifestação</Button>
              )}
            </div>
          )}

          <div className="sticky bottom-0 mt-5 border-t bg-background/95 p-5 backdrop-blur">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button onClick={() => void onDownloadPdf(document)} disabled={Boolean(downloadingPdf) || document.documentKind === 'evento'}>
                {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloadingPdf ? 'Preparando PDF...' : 'Baixar PDF oficial'}
              </Button>
              <Button variant="outline" onClick={() => void onDownloadXml(document)} disabled={Boolean(downloadingXml) || (!canDownloadXml && needsManifestation)}>
                {downloadingXml ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}
                {downloadingXml ? 'Preparando XML...' : canDownloadXml ? 'Baixar XML' : 'Tentar recuperar XML'}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
