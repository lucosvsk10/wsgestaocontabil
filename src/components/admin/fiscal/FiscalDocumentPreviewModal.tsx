import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Download, FileCode2, Info, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FiscalDocumentLike,
  formatAccessKey,
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
  if (/autoriz/i.test(status)) return 'bg-emerald-500/10 text-emerald-700';
  if (/cancel|deneg/i.test(status)) return 'bg-red-500/10 text-red-700';
  return 'bg-muted text-muted-foreground';
};

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="border-b border-border/70 py-3 last:border-0">
    <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-foreground">{value || '—'}</p>
  </div>
);

const PaperHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-900 pb-3">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">Pré-visualização</p>
      <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">{title}</h3>
      <p className="mt-1 text-[11px] text-zinc-600">{subtitle}</p>
    </div>
    <div className="rounded border-2 border-zinc-900 px-3 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide">Documento fiscal</p>
      <p className="mt-0.5 text-sm font-black">Consulta</p>
    </div>
  </div>
);

const NfePaper = ({ data }: { data: ReturnType<typeof parseFiscalPreview> }) => (
  <div className="mx-auto w-full max-w-[920px] bg-white p-5 text-zinc-950 shadow-[0_18px_55px_rgba(0,0,0,.18)] sm:p-7">
    <PaperHeader title={data.type === 'NFC-e' ? 'NFC-e' : 'DANFE'} subtitle="Representação para conferência. O arquivo oficial continua disponível no botão de download." />
    <div className="mt-4 grid grid-cols-[1.7fr_.9fr] gap-2 text-[10px]">
      <div className="border border-zinc-900 p-3">
        <p className="text-[9px] font-bold uppercase text-zinc-500">Emitente</p>
        <p className="mt-1 text-sm font-black">{data.issuerName}</p>
        <p className="mt-1">CNPJ {formatCnpj(data.issuerCnpj)}</p>
        {data.city && <p>{data.city}</p>}
      </div>
      <div className="border border-zinc-900 p-3">
        <p className="text-[9px] font-bold uppercase text-zinc-500">Nota fiscal</p>
        <p className="mt-1 text-base font-black">Nº {data.number}</p>
        <p>Série {data.series}</p>
        <p>{formatDate(data.issueDate)} · {formatTime(data.issueDate)}</p>
      </div>
    </div>
    <div className="mt-2 border border-zinc-900 p-3">
      <p className="text-[9px] font-bold uppercase text-zinc-500">Chave de acesso</p>
      <p className="mt-1 break-all font-mono text-[11px] font-semibold leading-5">{formatAccessKey(data.accessKey)}</p>
      {data.protocol && <p className="mt-1 text-[9px] text-zinc-500">Protocolo: {data.protocol}</p>}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
      <div className="border border-zinc-900 p-3">
        <p className="text-[9px] font-bold uppercase text-zinc-500">Destinatário</p>
        <p className="mt-1 font-bold">{data.recipientName}</p>
        <p>CNPJ/CPF {formatCnpj(data.recipientCnpj)}</p>
      </div>
      <div className="border border-zinc-900 p-3">
        <p className="text-[9px] font-bold uppercase text-zinc-500">Natureza da operação</p>
        <p className="mt-1 font-bold">{data.operation}</p>
        <p className="mt-1">Situação: {data.status}</p>
      </div>
    </div>
    <div className="mt-2 overflow-hidden border border-zinc-900">
      <div className="grid grid-cols-[.7fr_2.8fr_.8fr_.7fr_.7fr_1fr] bg-zinc-100 px-2 py-2 text-[8px] font-black uppercase tracking-wide">
        <span>Cód.</span><span>Descrição</span><span>CFOP</span><span>Qtd.</span><span>Un.</span><span className="text-right">Total</span>
      </div>
      {(data.items.length ? data.items.slice(0, 14) : [{ code: '', description: 'Itens não disponíveis no resumo atual', cfop: '', quantity: null, unit: '', total: data.value }]).map((item, index) => (
        <div key={`${item.code}-${index}`} className="grid grid-cols-[.7fr_2.8fr_.8fr_.7fr_.7fr_1fr] border-t border-zinc-300 px-2 py-2 text-[9px] leading-4">
          <span className="truncate">{item.code || '—'}</span>
          <span className="pr-2 font-semibold">{item.description}</span>
          <span>{item.cfop || '—'}</span>
          <span>{item.quantity ?? '—'}</span>
          <span>{item.unit || '—'}</span>
          <span className="text-right font-semibold">{formatMoney(item.total ?? 0)}</span>
        </div>
      ))}
      {data.items.length > 14 && <div className="border-t border-zinc-300 px-3 py-2 text-[9px] text-zinc-500">+ {data.items.length - 14} item(ns) no XML.</div>}
    </div>
    <div className="mt-2 flex justify-end border border-zinc-900 p-3">
      <div className="min-w-[220px] text-right">
        <p className="text-[9px] font-bold uppercase text-zinc-500">Valor total</p>
        <p className="mt-1 text-xl font-black">{formatMoney(data.value)}</p>
      </div>
    </div>
  </div>
);

const NfcePaper = ({ data }: { data: ReturnType<typeof parseFiscalPreview> }) => (
  <div className="mx-auto w-full max-w-[420px] bg-white px-5 py-6 font-mono text-zinc-950 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
    <div className="text-center">
      <p className="text-sm font-black">{data.issuerName}</p>
      <p className="mt-1 text-[10px]">CNPJ {formatCnpj(data.issuerCnpj)}</p>
      <div className="my-4 border-t border-dashed border-zinc-500" />
      <p className="text-xs font-black">DOCUMENTO AUXILIAR DA NFC-e</p>
      <p className="mt-1 text-[10px]">Nº {data.number} · Série {data.series}</p>
    </div>
    <div className="my-4 border-t border-dashed border-zinc-500" />
    <div className="space-y-2 text-[10px]">
      {(data.items.length ? data.items : [{ code: '', description: 'Itens não disponíveis no resumo atual', quantity: null, unit: '', unitValue: null, total: data.value, ncm: '', cfop: '' }]).slice(0, 20).map((item, index) => (
        <div key={`${item.code}-${index}`}>
          <p className="font-bold">{item.description}</p>
          <div className="mt-0.5 flex justify-between gap-3">
            <span>{item.quantity ?? 1} {item.unit || 'UN'} x {formatMoney(item.unitValue ?? item.total ?? 0)}</span>
            <span className="font-bold">{formatMoney(item.total ?? 0)}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="my-4 border-t border-dashed border-zinc-500" />
    <div className="flex justify-between text-sm font-black"><span>TOTAL</span><span>{formatMoney(data.value)}</span></div>
    <div className="my-4 border-t border-dashed border-zinc-500" />
    <div className="text-center text-[9px] leading-4">
      <p>{formatDate(data.issueDate)} {formatTime(data.issueDate)}</p>
      <p className="mt-2 break-all">{formatAccessKey(data.accessKey)}</p>
      <p className="mt-2 font-bold">{data.status}</p>
      <p className="mt-3 text-zinc-500">Pré-visualização para conferência</p>
    </div>
  </div>
);

const NfsePaper = ({ data }: { data: ReturnType<typeof parseFiscalPreview> }) => (
  <div className="mx-auto w-full max-w-[860px] bg-white p-6 text-zinc-950 shadow-[0_18px_55px_rgba(0,0,0,.18)] sm:p-8">
    <PaperHeader title="NFS-e" subtitle="Nota Fiscal de Serviço eletrônica · pré-visualização para conferência" />
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded border border-zinc-300 p-4">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Prestador</p>
        <p className="mt-1 text-sm font-black">{data.issuerName}</p>
        <p className="mt-1 text-[10px]">CNPJ/CPF {formatCnpj(data.issuerCnpj)}</p>
      </div>
      <div className="rounded border border-zinc-300 p-4">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Tomador</p>
        <p className="mt-1 text-sm font-black">{data.recipientName}</p>
        <p className="mt-1 text-[10px]">CNPJ/CPF {formatCnpj(data.recipientCnpj)}</p>
      </div>
    </div>
    <div className="mt-3 rounded border border-zinc-300 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">NFS-e</p><p className="mt-1 text-base font-black">Nº {data.number}</p></div>
        <div className="text-right text-[10px]"><p>{formatDate(data.issueDate)}</p><p>{formatTime(data.issueDate)}</p></div>
      </div>
    </div>
    <div className="mt-3 min-h-[180px] rounded border border-zinc-300 p-4">
      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Descrição do serviço</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{data.serviceDescription || data.operation || 'Serviço não detalhado no resumo atual.'}</p>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="rounded border border-zinc-300 p-4 text-[10px]">
        <p className="font-black uppercase text-zinc-500">Código / chave</p>
        <p className="mt-2 break-all font-mono">{formatAccessKey(data.accessKey)}</p>
        <p className="mt-2">Situação: <b>{data.status}</b></p>
      </div>
      <div className="rounded border-2 border-zinc-900 p-4 text-right">
        <p className="text-[9px] font-black uppercase text-zinc-500">Valor do serviço</p>
        <p className="mt-2 text-xl font-black">{formatMoney(data.value)}</p>
      </div>
    </div>
  </div>
);

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
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-2 backdrop-blur-md sm:p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="grid h-[94vh] w-full max-w-[1580px] overflow-hidden rounded-[24px] border border-white/10 bg-background shadow-2xl lg:grid-cols-[minmax(0,1.55fr)_420px]">
        <section className="min-h-0 overflow-auto bg-zinc-200/90 p-4 sm:p-7 dark:bg-zinc-900/80">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Documento fiscal</p>
              <p className="mt-1 text-sm font-semibold">Pré-visualização para conferência</p>
            </div>
            <span className="rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">Não substitui o arquivo oficial</span>
          </div>
          {data.type === 'NFC-e' ? <NfcePaper data={data} /> : data.type === 'NFS-e' ? <NfsePaper data={data} /> : <NfePaper data={data} />}
        </section>

        <aside className="min-h-0 overflow-auto border-l border-border bg-background">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/95 px-5 py-5 backdrop-blur">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Resumo</p>
              <h2 className="mt-1 text-lg font-semibold">{data.type} {data.number !== '—' ? `nº ${data.number}` : ''}</h2>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(data.status)}`}>{data.status}</span>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Fechar preview"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-2">
            <Line label="Empresa" value={companyName || data.issuerName} />
            <Line label="Tipo" value={data.type} />
            <Line label="Operação" value={document.direction === 'saida' ? 'Venda / saída fiscal' : document.direction === 'entrada' ? 'Compra / entrada fiscal' : data.operation} />
            <Line label="Emissão" value={`${formatDate(data.issueDate)} às ${formatTime(data.issueDate)}`} />
            <Line label="Valor" value={formatMoney(data.value)} />
            <Line label="Nota / série" value={`${data.number} / ${data.series}`} />
            <Line label="Emitente" value={`${data.issuerName}${data.issuerCnpj ? ` · ${formatCnpj(data.issuerCnpj)}` : ''}`} />
            <Line label="Destinatário" value={`${data.recipientName}${data.recipientCnpj ? ` · ${formatCnpj(data.recipientCnpj)}` : ''}`} />
            <div className="border-b border-border/70 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-muted-foreground">Chave de acesso</p>
              <p className="mt-1 break-all font-mono text-xs leading-5 text-foreground">{data.accessKey || '—'}</p>
              {data.accessKey && <Button variant="ghost" size="sm" className="mt-1 -ml-2 h-8" onClick={() => void copyKey()}>{copied ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Clipboard className="mr-1.5 h-3.5 w-3.5" />}{copied ? 'Copiada' : 'Copiar chave'}</Button>}
            </div>
          </div>

          {(needsManifestation || manifestationSent) && (
            <div className="mx-5 mt-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">{needsManifestation ? 'Manifestação necessária' : 'Manifestação registrada'}</p><p className="mt-1 text-xs leading-5">{needsManifestation ? 'A SEFAZ exige a manifestação do destinatário antes de liberar o XML integral desta NF-e.' : 'A manifestação já foi enviada e o sistema continua tentando recuperar o XML integral.'}</p></div></div>
              {needsManifestation && onManifestation && <Button size="sm" className="mt-3" onClick={() => onManifestation(document)}>Resolver manifestação</Button>}
            </div>
          )}

          {!document.fullXml && !needsManifestation && !manifestationSent && (
            <div className="mx-5 mt-3 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
              O XML integral ainda não está disponível. A pré-visualização usa os dados já capturados e pode ficar mais completa assim que a recuperação terminar.
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
