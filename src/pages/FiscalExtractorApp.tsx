import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { extractorRequest, extractorErrorMessage } from '@/lib/extractor/request';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Info, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FiscalDocumentPreviewModal } from '@/components/admin/fiscal/FiscalDocumentPreviewModal';
import { FiscalDownloadCenter } from '@/components/admin/fiscal/FiscalDownloadCenter';
import AnimatedExtractorIcon, {
  type ExtractorIconName,
} from '@/components/extractor/AnimatedExtractorIcon';
import ExtractorAccountDrawer from '@/components/extractor/ExtractorAccountDrawer';
import ExtractorCompanySelector from '@/components/extractor/ExtractorCompanySelector';
import ExtractorReports from '@/components/extractor/ExtractorReports';
import '@/styles/fiscal-extractor.css';
import '@/styles/fiscal-extractor-polish.css';
import '@/styles/fiscal-extractor-final.css';

type Section =
  | 'Visão geral'
  | 'Empresas'
  | 'Documentos'
  | 'Relatórios'
  | 'Certificados'
  | 'Histórico'
  | 'Configurações';
type Filter = 'saida' | 'entrada' | 'todos' | 'cancelada' | 'evento' | 'manifestacao';
type TypeFilter = 'todos' | 'nfe' | 'nfce' | 'nfse';
type Company = {
  id: string;
  extractorCompanyId: string;
  name: string;
  tradeName: string;
  cnpj: string;
  uf: string;
  documents: number;
  entries: number;
  exits: number;
  fullXml: number;
  pendingXml: number;
  lastSync: string | null;
  automaticSync: boolean;
  certificateUntil: string | null;
  certificateDays: number | null;
  purchaseStatus: string | null;
  salesStatus: string | null;
  salesXmlPending: number;
  salesXmlFailed: number;
  purchaseLastCompletedAt: string | null;
  purchaseLastError: string | null;
  salesLastCompletedAt: string | null;
  salesLastError: string | null;
};
type Doc = {
  id?: string;
  companyId: string;
  nsu?: string;
  schema?: string;
  source?: string;
  documentKind?: string;
  fullXml: boolean;
  direction: 'entrada' | 'saida' | 'relacionada';
  accessKey?: string;
  model?: string;
  issueDate?: string | null;
  value?: number;
  issuerCnpj?: string;
  issuerName?: string;
  recipientCnpj?: string;
  recipientName?: string;
  number?: string;
  series?: string;
  statusCode?: string;
  statusText?: string;
  parseError?: string;
  xml?: string;
};
type Snapshot = {
  account?: {
    id?: string;
    name?: string;
    plan_code?: string;
    monthly_xml_limit?: number;
    base_lookback_days?: number;
    allowed_from?: string;
  };
  companies?: Array<Record<string, any>>;
  totals?: {
    documents?: number;
    entries?: number;
    exits?: number;
    value?: number;
    full_xml?: number;
    pending_xml?: number;
  };
  models?: { nfe?: number; nfce?: number; nfse?: number; other?: number };
  daily?: Array<{ day?: string; documents?: number }>;
};
type Notice = { tone: 'success' | 'warning' | 'error'; text: string } | null;
type Usage = {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  period_start?: string | null;
  period_end?: string | null;
};

const nav: Array<{ label: Section; icon: ExtractorIconName; group: string }> = [
  { label: 'Visão geral', icon: 'dashboard', group: 'Operação' },
  { label: 'Empresas', icon: 'company', group: 'Operação' },
  { label: 'Documentos', icon: 'document', group: 'Fiscal' },
  { label: 'Relatórios', icon: 'report', group: 'Fiscal' },
  { label: 'Certificados', icon: 'certificate', group: 'Gestão' },
  { label: 'Histórico', icon: 'history', group: 'Gestão' },
  { label: 'Configurações', icon: 'settings', group: 'Gestão' },
];
const MONTHS = [
  'Ano',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;
const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Fev: 1,
  Mar: 2,
  Abr: 3,
  Mai: 4,
  Jun: 5,
  Jul: 6,
  Ago: 7,
  Set: 8,
  Out: 9,
  Nov: 10,
  Dez: 11,
};
const PAGE_SIZE = 50;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  integer = new Intl.NumberFormat('pt-BR');
const digits = (v: unknown) => String(v || '').replace(/\D/g, '');
const formatCnpj = (v: unknown) => {
  const d = digits(v);
  return d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : String(v || '—');
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;
const formatDate = (v?: string | null, withTime = false) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return withTime
    ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('pt-BR');
};
const syncLabel = (v?: string | null) => {
  const x = String(v || '').toLowerCase();
  if (x === 'queued') return 'Na fila';
  if (x === 'waiting_state_credentials') return 'Credencial SEFAZ pendente';
  if (x === 'waiting_certificate') return 'Certificado pendente';
  if (['running', 'reconciling', 'bootstrap_window', 'retrying'].includes(x))
    return 'Sincronizando';
  if (['idle', 'completed', 'success'].includes(x)) return 'Ativa';
  if (!x) return 'Não iniciada';
  return x.replace(/_/g, ' ');
};
const model = (d: Doc) =>
  String(
    d.model || (/^\d{44}$/.test(String(d.accessKey || '')) ? String(d.accessKey).slice(20, 22) : '')
  );
const type = (d: Doc) => {
  const h = `${d.documentKind || ''} ${d.schema || ''} ${d.model || ''}`.toLowerCase();
  if (d.documentKind === 'evento') return 'Evento';
  if (h.includes('nfse') || h.includes('nfs-e')) return 'NFS-e';
  if (model(d) === '65') return 'NFC-e';
  if (model(d) === '55') return 'NF-e';
  return 'Documento';
};
const cancelled = (d: Doc) =>
  ['101', '151', '155'].includes(String(d.statusCode || '')) ||
  /cancel/i.test(String(d.statusText || ''));
const status = (d: Doc) => {
  if (d.documentKind === 'evento') return 'Evento';
  if (cancelled(d)) return 'Cancelada';
  if (
    /deneg/i.test(String(d.statusText || '')) ||
    ['110', '301', '302'].includes(String(d.statusCode || ''))
  )
    return 'Denegada';
  if (
    ['1', '100', '150'].includes(String(d.statusCode || '')) ||
    /autoriz|ativa/i.test(String(d.statusText || ''))
  )
    return 'Autorizada';
  return d.statusText || 'Fiscal';
};

const normalizeCompany = (r: Record<string, any>, i: number): Company => ({
  id: String(r.id || i),
  extractorCompanyId: String(r.extractor_company_id || ''),
  name: r.razao_social || 'Empresa',
  tradeName: r.nome_fantasia || r.razao_social || 'Empresa',
  cnpj: r.cnpj || '',
  uf: r.uf || '—',
  documents: Number(r.documents || 0),
  entries: Number(r.entries || 0),
  exits: Number(r.exits || 0),
  fullXml: Number(r.full_xml || 0),
  pendingXml: Number(r.pending_xml || 0),
  lastSync: r.last_sync_at || null,
  automaticSync: r.automatic_sync !== false,
  certificateUntil: r.certificate_until || null,
  certificateDays: r.certificate_days == null ? null : Number(r.certificate_days),
  purchaseStatus: r.purchase_status || null,
  salesStatus: r.sales_status || null,
  salesXmlPending: Number(r.sales_xml_pending || 0),
  salesXmlFailed: Number(r.sales_xml_failed || 0),
  purchaseLastCompletedAt: r.purchase_last_completed_at || null,
  purchaseLastError: r.purchase_last_error || null,
  salesLastCompletedAt: r.sales_last_completed_at || null,
  salesLastError: r.sales_last_error || null,
});
const rowToDoc = (r: any): Doc => ({
  id: r.id,
  companyId: String(r.company_id || ''),
  nsu: r.nsu || undefined,
  schema: r.schema_name || undefined,
  source: r.source || undefined,
  documentKind: r.document_kind || undefined,
  fullXml: Boolean(r.full_xml),
  direction:
    r.direction === 'saida' || r.direction === 'outbound'
      ? 'saida'
      : r.direction === 'entrada' || r.direction === 'inbound'
      ? 'entrada'
      : 'relacionada',
  accessKey: r.access_key || undefined,
  model: r.model || undefined,
  issueDate: r.issue_date || undefined,
  value: r.value == null ? undefined : Number(r.value),
  issuerCnpj: r.issuer_cnpj || undefined,
  issuerName: r.issuer_name || undefined,
  recipientCnpj: r.recipient_cnpj || undefined,
  recipientName: r.recipient_name || undefined,
  number: r.note_number == null ? '' : String(r.note_number),
  series: r.series == null ? '' : String(r.series),
  statusCode: r.status_code || undefined,
  statusText: r.status_text || undefined,
  parseError: r.parse_error || undefined,
  xml: r.xml || undefined,
});
const reconciliationToDoc = (r: any, companyId: string): Doc => ({
  companyId,
  documentKind: 'nfe',
  fullXml: false,
  direction: 'saida',
  accessKey: r.access_key || undefined,
  model: String(r.model || '65'),
  issueDate: r.issue_date || undefined,
  number: r.note_number == null ? '' : String(r.note_number),
  series: r.series == null ? '' : String(r.series),
  statusCode: r.cstat || undefined,
  statusText:
    r.xmotivo ||
    (r.status === 'cancelled'
      ? 'Cancelada'
      : r.status === 'found'
      ? 'Encontrada'
      : r.status || 'Fiscal'),
});

const chart = {
  gold: '#d7b65a',
  blue: '#5b83ad',
  cyan: '#4b9e9d',
  green: '#5f987d',
  muted: '#485667',
  grid: '#1c2a3a',
  text: '#9aa9b8',
};

export default function FiscalExtractorApp({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const [active, setActive] = useState<Section>('Visão geral'),
    [mobile, setMobile] = useState(false),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(!preview),
    [denied, setDenied] = useState(false),
    [notice, setNotice] = useState<Notice>(null),
    [companyModal, setCompanyModal] = useState(false),
    [selectedCompanyId, setSelectedCompanyId] = useState<string>(''),
    [previewDoc, setPreviewDoc] = useState<Doc | null>(null),
    [previewPdfBusy, setPreviewPdfBusy] = useState(false),
    [previewXmlBusy, setPreviewXmlBusy] = useState(false),
    [usage, setUsage] = useState<Usage>({ used: 0, limit: 0, remaining: 0, percent: 0 });
  const load = useCallback(
    async (quiet = false) => {
      if (preview || !user) return;
      if (!quiet) setLoading(true);
      try {
        const [snapshotResult, usageResult] = await Promise.all([
          (supabase as any).rpc('extractor_workspace_snapshot'),
          (supabase as any).rpc('extractor_account_usage'),
        ]);
        if (snapshotResult.error || !snapshotResult.data) {
          setDenied(true);
        } else {
          setSnapshot(snapshotResult.data as Snapshot);
          setDenied(false);
          if (usageResult.data) setUsage(usageResult.data as Usage);
        }
      } catch {
        setNotice({
          tone: 'error',
          text: 'Não foi possível atualizar os dados. Confira sua conexão.',
        });
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [preview, user?.id]
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (preview || denied) return;
    const t = window.setInterval(() => void load(true), 30000),
      f = () => void load(true);
    window.addEventListener('focus', f);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', f);
    };
  }, [preview, denied, load]);
  const companies = useMemo(
    () =>
      preview
        ? [
            {
              id: 'demo',
              extractorCompanyId: 'demo',
              name: 'EMPRESA DEMONSTRAÇÃO LTDA',
              tradeName: 'Empresa demonstração',
              cnpj: '00000000000000',
              uf: 'AL',
              documents: 326,
              entries: 55,
              exits: 271,
              fullXml: 266,
              pendingXml: 60,
              lastSync: new Date().toISOString(),
              automaticSync: true,
              certificateUntil: '2027-08-25',
              certificateDays: 351,
              purchaseStatus: 'idle',
              salesStatus: 'idle',
              salesXmlPending: 60,
              salesXmlFailed: 0,
            },
          ]
        : (snapshot?.companies || []).map(normalizeCompany),
    [preview, snapshot]
  );
  useEffect(() => {
    if (!selectedCompanyId && companies.length) setSelectedCompanyId(companies[0].id);
  }, [companies, selectedCompanyId]);
  const totals = preview
    ? { documents: 326, entries: 55, exits: 271, value: 675295.32, fullXml: 266, pendingXml: 60 }
    : {
        documents: Number(snapshot?.totals?.documents || 0),
        entries: Number(snapshot?.totals?.entries || 0),
        exits: Number(snapshot?.totals?.exits || 0),
        value: Number(snapshot?.totals?.value || 0),
        fullXml: Number(snapshot?.totals?.full_xml || 0),
        pendingXml: Number(snapshot?.totals?.pending_xml || 0),
      };
  const models = preview
    ? { nfe: 149, nfce: 169, nfse: 8, other: 0 }
    : {
        nfe: Number(snapshot?.models?.nfe || 0),
        nfce: Number(snapshot?.models?.nfce || 0),
        nfse: Number(snapshot?.models?.nfse || 0),
        other: Number(snapshot?.models?.other || 0),
      };
  const daily = preview
    ? Array.from({ length: 30 }, (_, i) => ({
        day: iso(new Date(Date.now() - (29 - i) * 86400000)),
        documents: [7, 9, 6, 12, 8, 4, 11, 13, 8, 10][i % 10],
      }))
    : (snapshot?.daily || []).map(x => ({
        day: String(x.day || ''),
        documents: Number(x.documents || 0),
      }));
  const planUsage: Usage = preview
    ? {
        used: 326,
        limit: 20000,
        remaining: 19674,
        percent: 2,
        period_start: null,
        period_end: null,
      }
    : usage;
  const planLabel = preview
    ? 'Escritório · 20.000 XML/mês'
    : snapshot?.account?.plan_code === 'office_20000'
    ? 'Escritório · 20.000 XML/mês'
    : snapshot?.account?.plan_code || 'Plano Extrator';
  const go = (s: Section, companyId?: string) => {
    if (companyId) setSelectedCompanyId(companyId);
    setActive(s);
    setMobile(false);
    setNotice(null);
  };

  const previewCompany =
    companies.find(company => company.id === previewDoc?.companyId) ||
    companies.find(company => company.id === selectedCompanyId) ||
    companies[0] ||
    null;

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadPreviewPdf = async (document: Doc) => {
    if (previewPdfBusy) return;
    setPreviewPdfBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('dfe-danfe-pdf', {
        body: { company_id: document.companyId, document },
      });
      if (error) throw error;
      const base64 = String(data?.pdf_base64 || '');
      if (!base64) throw new Error(String(data?.error || 'PDF não foi gerado.'));
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      triggerBlobDownload(
        new Blob([bytes], { type: 'application/pdf' }),
        String(data?.filename || `${document.accessKey || document.nsu || 'documento-fiscal'}.pdf`)
      );
    } catch (caught) {
      setNotice({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'Não foi possível gerar o PDF.',
      });
    } finally {
      setPreviewPdfBusy(false);
    }
  };

  const downloadPreviewXml = async (document: Doc) => {
    if (previewXmlBusy) return;
    setPreviewXmlBusy(true);
    try {
      let current = document;
      if (!(current.fullXml && current.xml)) {
        const { data, error } = await supabase.functions.invoke('fiscal-document-recover', {
          body: { company_id: current.companyId, access_key: current.accessKey, nsu: current.nsu },
        });
        if (error) throw error;
        if (data?.ready && data.document) current = rowToDoc(data.document);
        else throw new Error(String(data?.reason || 'O XML integral ainda não está disponível.'));
      }
      if (!current.xml) throw new Error('O XML integral ainda não está disponível.');
      triggerBlobDownload(
        new Blob([current.xml], { type: 'application/xml;charset=utf-8' }),
        `${current.accessKey || current.nsu || 'documento-fiscal'}.xml`
      );
      setPreviewDoc(current);
    } catch (caught) {
      setNotice({
        tone: 'warning',
        text: caught instanceof Error ? caught.message : 'Não foi possível recuperar o XML.',
      });
    } finally {
      setPreviewXmlBusy(false);
    }
  };

  const manifestPreview = async (document: Doc) => {
    if (!document.accessKey || !document.companyId) return;
    const confirmed = window.confirm(
      'Esta ação registra a manifestação do destinatário na SEFAZ para liberar o XML desta NF-e. Deseja continuar?'
    );
    if (!confirmed) return;
    setPreviewXmlBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-manifest', {
        body: {
          confirm: true,
          company_id: document.companyId,
          access_key: document.accessKey,
        },
      });
      if (error) throw error;
      const recovered = Boolean(data?.recovered);
      setNotice({
        tone: recovered ? 'success' : 'warning',
        text: recovered
          ? 'Manifestação registrada e XML integral recuperado.'
          : String(data?.result?.message || 'Manifestação registrada. A recuperação do XML continuará automaticamente.'),
      });
      const { data: refresh } = await supabase.functions.invoke('fiscal-document-recover', {
        body: { company_id: document.companyId, access_key: document.accessKey, nsu: document.nsu },
      });
      if (refresh?.ready && refresh.document) setPreviewDoc(rowToDoc(refresh.document));
      else setPreviewDoc({ ...document, parseError: recovered ? undefined : 'xml_retry:manifestation_sent' });
    } catch (caught) {
      setNotice({
        tone: 'error',
        text: caught instanceof Error ? caught.message : 'A SEFAZ não confirmou a manifestação.',
      });
    } finally {
      setPreviewXmlBusy(false);
    }
  };
  if (loading) return <Loading />;
  if (!preview && denied) return <AccessPending />;
  return (
    <div className="extractor-app">
      <header className="extractor-topbar">
        <div className="extractor-brand">
          <button
            className="extractor-mobile-trigger"
            onClick={() => setMobile(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
        </div>
        <ExtractorCompanySelector
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelect={setSelectedCompanyId}
          preview={preview}
        />
        <div className="extractor-account">
          {preview ? (
            <span className="extractor-account-avatar">PR</span>
          ) : (
            <ExtractorAccountDrawer
              accountName={snapshot?.account?.name || 'Conta Extrator'}
              onSaved={() => void load(true)}
              planLabel={planLabel}
              usage={planUsage}
              companies={companies.length}
              onOpenSettings={() => go('Configurações')}
            />
          )}
        </div>
      </header>
      {mobile && (
        <button
          className="extractor-scrim"
          onClick={() => setMobile(false)}
          aria-label="Fechar menu"
        />
      )}
      <aside className={`extractor-sidebar ${mobile ? 'is-open' : ''}`}>
        <button className="extractor-sidebar-close" onClick={() => setMobile(false)}>
          <X />
        </button>
        <div className="extractor-sidebar-title">
          <strong>Extrato Fiscal</strong>
          <small>Compras e vendas</small>
        </div>
        <nav>
          {['Operação', 'Fiscal', 'Gestão'].map(group => (
            <section key={group}>
              <p>{group}</p>
              {nav
                .filter(n => n.group === group)
                .map(n => (
                  <button
                    key={n.label}
                    data-icon-hover
                    className={active === n.label ? 'is-active' : ''}
                    onClick={() => go(n.label)}
                  >
                    <AnimatedExtractorIcon name={n.icon} className="extractor-nav-icon" />
                    <span>{n.label}</span>
                  </button>
                ))}
            </section>
          ))}
        </nav>
        <button className="extractor-usage" onClick={() => go('Configurações')} data-icon-hover>
          <small>Uso do plano</small>
          <strong>
            {integer.format(planUsage.used)} <span>/ {integer.format(planUsage.limit)} XML</span>
          </strong>
          <div className="usage-track">
            <i style={{ width: `${Math.min(100, Math.max(0, planUsage.percent))}%` }} />
          </div>
          <span>{integer.format(planUsage.remaining)} restantes · ver detalhes</span>
        </button>
      </aside>
      <main className="extractor-main">
        {notice && <NoticeBar notice={notice} close={() => setNotice(null)} />}
        {active === 'Visão geral' && (
          <Overview companies={companies} totals={totals} models={models} daily={daily} onGo={go} />
        )}
        {active === 'Empresas' && (
          <Companies
            companies={companies}
            onAdd={() => setCompanyModal(true)}
            onOpen={id => go('Documentos', id)}
            onReload={() => load(true)}
            setNotice={setNotice}
            preview={preview}
          />
        )}
        {active === 'Documentos' && (
          <Documents
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            preview={preview}
            setNotice={setNotice}
            onPreview={setPreviewDoc}
          />
        )}
        {active === 'Relatórios' && (
          <ExtractorReports
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={setSelectedCompanyId}
            allowedFrom={snapshot?.account?.allowed_from}
            preview={preview}
          />
        )}
        {active === 'Certificados' && <Certificates companies={companies} onGo={go} />}
        {active === 'Histórico' && (
          <HistorySection
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            accountId={snapshot?.account?.id}
            userId={user?.id}
            preview={preview}
            setNotice={setNotice}
          />
        )}
        {active === 'Configurações' && (
          <SettingsSection
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            setSelectedCompanyId={setSelectedCompanyId}
            account={snapshot?.account}
            usage={planUsage}
            planLabel={planLabel}
          />
        )}
      </main>
      {companyModal && (
        <AddCompanyModal
          preview={preview}
          onClose={() => setCompanyModal(false)}
          onDone={async company => {
            setCompanyModal(false);
            setSelectedCompanyId(company.id);
            setNotice({
              tone: 'success',
              text: `${
                company.trade_name || company.legal_name
              } adicionada. A sincronização inicial já foi colocada em execução.`,
            });
            await load(true);
            setActive('Empresas');
          }}
        />
      )}
      <FiscalDocumentPreviewModal
        document={previewDoc}
        companyName={previewCompany?.tradeName || previewCompany?.name || 'Empresa'}
        companyCnpj={previewCompany?.cnpj || ''}
        downloadingPdf={previewPdfBusy}
        downloadingXml={previewXmlBusy}
        onClose={() => setPreviewDoc(null)}
        onDownloadPdf={downloadPreviewPdf}
        onDownloadXml={downloadPreviewXml}
        onManifestation={manifestPreview}
      />
    </div>
  );
}

function PageHeading({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon: ExtractorIconName;
  actions?: React.ReactNode;
}) {
  return (
    <div className="extractor-page-heading">
      <div>
        <span className="extractor-eyebrow">
          <AnimatedExtractorIcon name={icon} />
          WS Extrator Fiscal
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="extractor-heading-actions">{actions}</div>}
    </div>
  );
}
function NoticeBar({ notice, close }: { notice: NonNullable<Notice>; close: () => void }) {
  return (
    <div className={`extractor-notice ${notice.tone}`}>
      <span>{notice.text}</span>
      <button onClick={close}>
        <X />
      </button>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ExtractorIconName;
}) {
  return (
    <article className="extractor-metric" data-icon-hover>
      <div>
        <p>{label}</p>
        <AnimatedExtractorIcon name={icon} />
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
function PanelHead({ title, sub, icon }: { title: string; sub: string; icon: ExtractorIconName }) {
  return (
    <header className="extractor-panel-head" data-icon-hover>
      <div>
        <AnimatedExtractorIcon name={icon} />
        <span>
          <h2>{title}</h2>
          <p>{sub}</p>
        </span>
      </div>
    </header>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="extractor-empty">{children}</div>;
}
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="extractor-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map((p: any, i: number) => (
        <span key={i}>
          {p.name}: <b>{integer.format(Number(p.value || 0))}</b>
        </span>
      ))}
    </div>
  );
}

function Overview({ companies, totals, models, daily, onGo }: any) {
  const xmlRate = totals.documents ? Math.round((totals.fullXml / totals.documents) * 100) : 0,
    companyData = [...companies].sort((a: any, b: any) => b.documents - a.documents).slice(0, 6),
    modelData = [
      { name: 'NF-e', value: models.nfe, color: chart.gold },
      { name: 'NFC-e', value: models.nfce, color: chart.blue },
      { name: 'NFS-e', value: models.nfse, color: chart.cyan },
    ].filter(x => x.value > 0),
    attention = companies.filter(
      (c: any) =>
        c.pendingXml > 0 ||
        (c.certificateDays != null && c.certificateDays <= 30) ||
        /retry|error|fail|waiting/i.test(`${c.purchaseStatus} ${c.salesStatus}`)
    );
  return (
    <div className="extractor-page">
      <PageHeading
        title="Visão geral"
        icon="dashboard"
        description="Acompanhamento da carteira fiscal do escritório. A sincronização roda por empresa, como no painel fiscal administrativo."
      />
      <section className="extractor-kpis">
        <Metric
          label="Documentos"
          value={integer.format(totals.documents)}
          detail={`${integer.format(totals.fullXml)} com XML integral`}
          icon="document"
        />
        <Metric
          label="Compras"
          value={integer.format(totals.entries)}
          detail="Entradas fiscais"
          icon="download"
        />
        <Metric
          label="Vendas"
          value={integer.format(totals.exits)}
          detail="Saídas fiscais"
          icon="upload"
        />
        <Metric
          label="Movimentação"
          value={currency.format(totals.value)}
          detail="Valor disponível no período"
          icon="report"
        />
        <Metric
          label="Cobertura XML"
          value={`${xmlRate}%`}
          detail={`${integer.format(totals.pendingXml)} pendente(s)`}
          icon="certificate"
        />
      </section>
      <section className="extractor-dashboard-grid">
        <article className="extractor-panel extractor-panel-wide">
          <PanelHead
            title="Movimento dos últimos 30 dias"
            sub="Documentos capturados por dia"
            icon="report"
          />
          <div className="extractor-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="exFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={chart.gold} stopOpacity={0.34} />
                    <stop offset="1" stopColor={chart.gold} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chart.text }}
                  minTickGap={28}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chart.text }}
                />
                <Tooltip content={<Tip />} />
                <Area
                  type="monotone"
                  dataKey="documents"
                  name="Documentos"
                  stroke={chart.gold}
                  strokeWidth={2.3}
                  fill="url(#exFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="extractor-panel">
          <PanelHead title="Documentos por modelo" sub="Composição da carteira" icon="document" />
          <div className="extractor-donut">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={
                    modelData.length
                      ? modelData
                      : [{ name: 'Sem dados', value: 1, color: chart.muted }]
                  }
                  dataKey="value"
                  innerRadius="65%"
                  outerRadius="86%"
                  paddingAngle={4}
                  stroke="none"
                >
                  {(modelData.length
                    ? modelData
                    : [{ name: 'Sem dados', value: 1, color: chart.muted }]
                  ).map((x: any) => (
                    <Cell key={x.name} fill={x.color} />
                  ))}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <strong>{integer.format(totals.documents)}</strong>
              <span>documentos</span>
            </div>
          </div>
          <div className="extractor-legend">
            {modelData.map((x: any) => (
              <p key={x.name}>
                <i style={{ background: x.color }} />
                <span>{x.name}</span>
                <b>{x.value}</b>
              </p>
            ))}
          </div>
        </article>
        <article className="extractor-panel extractor-panel-wide">
          <PanelHead
            title="Empresas por volume"
            sub="CNPJs adicionados no Extrator"
            icon="company"
          />
          <div className="extractor-chart-company">
            {companyData.length ? (
              <ResponsiveContainer>
                <BarChart
                  data={companyData}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 6, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={chart.grid} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: chart.text }}
                  />
                  <YAxis
                    type="category"
                    dataKey="tradeName"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: chart.text }}
                  />
                  <Tooltip content={<Tip />} />
                  <Bar
                    dataKey="documents"
                    name="Documentos"
                    fill={chart.blue}
                    radius={[0, 4, 4, 0]}
                    barSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty>Nenhuma empresa adicionada.</Empty>
            )}
          </div>
        </article>
        <article className="extractor-panel">
          <PanelHead title="Pontos de atenção" sub="Ocorrências reais da carteira" icon="warning" />
          <div className="extractor-attention-list">
            {attention.length ? (
              attention.slice(0, 5).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() =>
                    onGo(
                      c.certificateDays != null && c.certificateDays <= 30
                        ? 'Certificados'
                        : 'Empresas'
                    )
                  }
                >
                  <span>
                    <strong>{c.tradeName}</strong>
                    <small>
                      {c.certificateDays != null && c.certificateDays <= 30
                        ? `Certificado vence em ${c.certificateDays} dia(s)`
                        : c.pendingXml
                        ? `${c.pendingXml} XML pendente(s)`
                        : `Compras: ${syncLabel(c.purchaseStatus)} · Vendas: ${syncLabel(
                            c.salesStatus
                          )}`}
                    </small>
                  </span>
                  <b>Ver</b>
                </button>
              ))
            ) : (
              <Empty>Nenhuma pendência relevante.</Empty>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function Companies({ companies, onAdd, onOpen, onReload, setNotice, preview }: any) {
  const [term, setTerm] = useState(''),
    [busy, setBusy] = useState('');
  const visible = companies.filter(
    (c: Company) =>
      `${c.name} ${c.tradeName} ${c.cnpj}`.toLowerCase().includes(term.toLowerCase().trim()) ||
      (term.replace(/\D/g, '').length > 0 &&
        c.cnpj.replace(/\D/g, '').includes(term.replace(/\D/g, '')))
  );
  const sync = async (c: Company) => {
    if (preview)
      return setNotice({
        tone: 'warning',
        text: 'A sincronização fica disponível no ambiente autenticado.',
      });
    if (busy) return;
    setBusy(c.id);
    try {
      const { data, error } = await (supabase as any).rpc('extractor_queue_sync', {
        _company_id: c.id,
      });
      if (error || !data?.ok)
        setNotice({
          tone: 'error',
          text: data?.message || 'Não foi possível atualizar esta empresa. Tente novamente.',
        });
      else
        setNotice({
          tone: 'success',
          text: `${c.tradeName}: atualização fiscal colocada na fila.`,
        });
      await onReload();
    } catch {
      setNotice({ tone: 'error', text: 'Falha de conexão ao atualizar. Tente novamente.' });
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="extractor-page">
      <PageHeading
        title="Empresas"
        icon="company"
        description="Somente clientes adicionados dentro do Extrator aparecem aqui. O cadastro do ADM não é importado automaticamente."
        actions={
          <button className="extractor-primary" onClick={onAdd}>
            <AnimatedExtractorIcon name="upload" />
            Adicionar com A1
          </button>
        }
      />
      <div className="extractor-toolbar">
        <label>
          <AnimatedExtractorIcon name="search" />
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Buscar empresa ou CNPJ"
          />
        </label>
      </div>
      <div className="extractor-company-list">
        <div className="extractor-company-head">
          <span>Empresa</span>
          <span>Documentos</span>
          <span>XML integral</span>
          <span>Sincronização</span>
          <span>Certificado</span>
          <span>Ações</span>
        </div>
        {visible.map((c: Company) => (
          <div
            className="extractor-company-row"
            key={c.id}
            role="button"
            tabIndex={0}
            data-icon-hover
            onClick={() => onOpen(c.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(c.id);
              }
            }}
          >
            <div>
              <strong>{c.tradeName}</strong>
              <span>
                {formatCnpj(c.cnpj)} · {c.uf}
              </span>
            </div>
            <div>
              <strong>{integer.format(c.documents)}</strong>
              <span>
                {c.entries} compras · {c.exits} vendas
              </span>
            </div>
            <div>
              <strong>{integer.format(c.fullXml)}</strong>
              <span>{c.pendingXml ? `${c.pendingXml} pendente(s)` : 'Completo no período'}</span>
            </div>
            <div>
              <strong>
                {syncLabel(c.purchaseStatus)} / {syncLabel(c.salesStatus)}
              </strong>
              <span>{c.lastSync ? formatDate(c.lastSync, true) : 'Ainda não concluída'}</span>
            </div>
            <div>
              <strong>
                {c.certificateUntil ? formatDate(c.certificateUntil) : 'Não configurado'}
              </strong>
              <span>{c.certificateDays == null ? '—' : `${c.certificateDays} dia(s)`}</span>
            </div>
            <div className="extractor-row-actions">
              <button
                onClick={e => {
                  e.stopPropagation();
                  void sync(c);
                }}
                disabled={busy === c.id}
              >
                <AnimatedExtractorIcon name="refresh" />
                {busy === c.id ? 'Atualizando' : 'Atualizar'}
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpen(c.id);
                }}
              >
                Notas
              </button>
            </div>
          </div>
        ))}
        {!visible.length && <Empty>Nenhuma empresa encontrada.</Empty>}
      </div>
    </div>
  );
}

function Documents({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  preview,
  setNotice,
  onPreview,
}: any) {
  const now = new Date(),
    today = iso(now),
    [year, setYear] = useState(now.getFullYear()),
    [month, setMonth] = useState<(typeof MONTHS)[number]>(MONTHS[now.getMonth() + 1]),
    [filter, setFilter] = useState<Filter>('todos'),
    [typeFilter, setTypeFilter] = useState<TypeFilter>('todos'),
    [query, setQuery] = useState(''),
    [docs, setDocs] = useState<Doc[]>([]),
    [loading, setLoading] = useState(false),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(''),
    [downloadOpen, setDownloadOpen] = useState(false);
  const company =
    companies.find((c: Company) => c.id === selectedCompanyId) || companies[0] || null;
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const requestSequence = useRef(0);
  const start = customStart || (month === 'Ano' ? `${year}-01-01` : iso(new Date(year, MONTH_INDEX[month], 1)));
  const end = customEnd || (month === 'Ano' ? `${year}-12-31` : iso(new Date(year, MONTH_INDEX[month] + 1, 0)));
  const loadDocs = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setDocs([]);
    if (preview || !company || !start || !end || start > end) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .rpc('extractor_company_documents', {
          _company_id: company.id,
          _start: start,
          _end: end,
        })
        .abortSignal(AbortSignal.timeout(30_000));
      if (sequence !== requestSequence.current) return;
      if (error) throw error;
      const base = (data?.documents || []).map(rowToDoc),
        known = new Set(base.map((d: Doc) => String(d.accessKey || '')).filter(Boolean)),
        extra = (data?.reconciliation || [])
          .filter((r: any) => r.access_key && !known.has(String(r.access_key)))
          .map((r: any) => reconciliationToDoc(r, company.id));
      setDocs([...base, ...extra]);
    } catch {
      if (sequence === requestSequence.current)
        setNotice({
          tone: 'error',
          text: 'Não foi possível carregar os documentos. Tente novamente.',
        });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [preview, company?.id, start, end]);
  useEffect(() => {
    void loadDocs();
    return () => {
      requestSequence.current++;
    };
  }, [loadDocs]);
  useEffect(() => setPage(1), [start, end, filter, typeFilter, query, company?.id]);
  const fiscal = docs.filter(d => d.documentKind !== 'evento'),
    sales = fiscal.filter(d => d.direction === 'saida'),
    purchases = fiscal.filter(d => d.direction === 'entrada'),
    events = docs.filter(d => d.documentKind === 'evento' || d.direction === 'relacionada'),
    cancelledDocs = fiscal.filter(cancelled),
    manifestationDocs = fiscal.filter(
      d => d.parseError === 'xml_requires_manifestation' || d.parseError === 'xml_retry:manifestation_sent'
    ),
    nfe = fiscal.filter(d => type(d) === 'NF-e').length,
    nfce = fiscal.filter(d => type(d) === 'NFC-e').length,
    nfse = fiscal.filter(d => type(d) === 'NFS-e').length;
  const filtered = docs.filter(d => {
    if (filter === 'saida' && (d.direction !== 'saida' || d.documentKind === 'evento'))
      return false;
    if (filter === 'entrada' && (d.direction !== 'entrada' || d.documentKind === 'evento'))
      return false;
    if (filter === 'evento' && !(d.documentKind === 'evento' || d.direction === 'relacionada'))
      return false;
    if (filter === 'cancelada' && !cancelled(d)) return false;
    if (
      filter === 'manifestacao' &&
      !['xml_requires_manifestation', 'xml_retry:manifestation_sent'].includes(String(d.parseError || ''))
    )
      return false;
    const t = type(d);
    if (typeFilter === 'nfe' && t !== 'NF-e') return false;
    if (typeFilter === 'nfce' && t !== 'NFC-e') return false;
    if (typeFilter === 'nfse' && t !== 'NFS-e') return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      [
        d.number,
        d.accessKey,
        d.issuerName,
        d.issuerCnpj,
        d.recipientCnpj,
        d.nsu,
        d.series,
        d.statusText,
        t,
      ].some(v =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      )
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    safe = Math.min(page, totalPages),
    rows = filtered.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE);
  const open = async (d: Doc) => {
    if (preview)
      return setNotice({
        tone: 'warning',
        text: 'A visualização usa XML fiscal real e fica disponível no ambiente autenticado.',
      });
    if (busy) return;
    setBusy(`doc:${d.accessKey || d.nsu}`);
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-document-recover', {
        body: { company_id: company.id, access_key: d.accessKey, nsu: d.nsu },
      });
      if (error) {
        setNotice({ tone: 'error', text: await extractorErrorMessage(error) });
        onPreview(d);
      } else if (data?.ready && data.document) {
        onPreview(rowToDoc(data.document));
      } else {
        const next = {
          ...d,
          parseError: data?.requires_manifestation ? 'xml_requires_manifestation' : d.parseError,
        };
        onPreview(next);
        if (data?.reason)
          setNotice({
            tone: data?.requires_manifestation ? 'warning' : 'warning',
            text: data.reason,
          });
      }
    } catch {
      onPreview(d);
      setNotice({ tone: 'error', text: 'Não foi possível atualizar o documento agora. A prévia foi aberta com os dados já disponíveis.' });
    } finally {
      setBusy('');
    }
  };
  if (!company)
    return (
      <div className="extractor-page">
        <PageHeading
          title="Documentos"
          icon="document"
          description="Adicione uma empresa com certificado A1 para iniciar."
        />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );
  return (
    <div className="extractor-page extractor-admin-clone">
      <PageHeading
        title="Documentos"
        icon="document"
        description="Mesmo fluxo de compras e vendas utilizado no painel fiscal administrativo."
        actions={
          <select
            className="extractor-company-select"
            value={company.id}
            onChange={e => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c: Company) => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </select>
        }
      />
      <section className="extractor-active-company">
        <div>
          <p>Empresa ativa</p>
          <strong>{company.name}</strong>
          <span>{formatCnpj(company.cnpj)}</span>
        </div>
        <div
          className={company.certificateDays != null && company.certificateDays >= 0 ? 'ok' : 'bad'}
        >
          <AnimatedExtractorIcon name="certificate" />
          {company.certificateDays != null && company.certificateDays >= 0
            ? 'Certificado válido'
            : 'Certificado pendente'}
        </div>
      </section>
      <section className="extractor-period">
        <div className="extractor-year">
          <button onClick={() => setYear(y => y - 1)}>‹</button>
          <strong>{year}</strong>
          <button disabled={year >= now.getFullYear()} onClick={() => setYear(y => y + 1)}>
            ›
          </button>
        </div>
        <div className="extractor-months">
          {MONTHS.map(m => {
            const future =
              m !== 'Ano' && year === now.getFullYear() && MONTH_INDEX[m] > now.getMonth();
            return (
              <button
                key={m}
                disabled={future}
                className={month === m ? 'active' : ''}
                onClick={() => setMonth(m)}
              >
                {m}
              </button>
            );
          })}
        </div>
      </section>
      <section className="extractor-filter-row" aria-label="Período personalizado">
        <div>
          <label>
            De{' '}
            <input
              aria-label="Data inicial dos documentos"
              type="date"
              value={customStart || start}
              max={end}
              onChange={e => setCustomStart(e.target.value)}
            />
          </label>
          <label>
            Até{' '}
            <input
              aria-label="Data final dos documentos"
              type="date"
              value={customEnd || end}
              min={start}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </label>
          {(customStart || customEnd) && (
            <button
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
            >
              Usar mês selecionado
            </button>
          )}
        </div>
        <small>Pacotes de até 100 documentos. Para volumes maiores, divida o período.</small>
      </section>
      <section className="extractor-doc-kpis">
        <Metric
          label="Total notas"
          value={String(fiscal.length)}
          detail="Documentos fiscais"
          icon="document"
        />
        <Metric label="Vendas" value={String(sales.length)} detail="Saídas" icon="upload" />
        <Metric
          label="Compras"
          value={String(purchases.length)}
          detail="Entradas"
          icon="download"
        />
        <Metric
          label="Faturamento"
          value={currency.format(sales.reduce((s, d) => s + Number(d.value || 0), 0))}
          detail={`Entradas: ${currency.format(
            purchases.reduce((s, d) => s + Number(d.value || 0), 0)
          )}`}
          icon="report"
        />
      </section>
      <section className="extractor-admin-table">
        <div className="extractor-filter-row">
          <div>
            <Pill active={filter === 'saida'} onClick={() => setFilter('saida')}>
              ↗ Vendas <b>{sales.length}</b>
            </Pill>
            <Pill active={filter === 'entrada'} onClick={() => setFilter('entrada')}>
              ↙ Compras <b>{purchases.length}</b>
            </Pill>
            <Pill active={filter === 'todos'} onClick={() => setFilter('todos')}>
              Todas <b>{docs.length}</b>
            </Pill>
            <Pill active={filter === 'evento'} onClick={() => setFilter('evento')}>
              Eventos <b>{events.length}</b>
            </Pill>
            <Pill active={filter === 'cancelada'} onClick={() => setFilter('cancelada')}>
              ⊘ Canceladas <b>{cancelledDocs.length}</b>
            </Pill>
            {manifestationDocs.length > 0 && (
              <Pill active={filter === 'manifestacao'} onClick={() => setFilter('manifestacao')}>
                ! Manifestação <b>{manifestationDocs.length}</b>
              </Pill>
            )}
            <i />
            <Pill
              active={typeFilter === 'nfe'}
              onClick={() => setTypeFilter(typeFilter === 'nfe' ? 'todos' : 'nfe')}
            >
              NF-e <b>{nfe}</b>
            </Pill>
            <Pill
              active={typeFilter === 'nfce'}
              onClick={() => setTypeFilter(typeFilter === 'nfce' ? 'todos' : 'nfce')}
            >
              NFC-e <b>{nfce}</b>
            </Pill>
            <Pill
              active={typeFilter === 'nfse'}
              onClick={() => setTypeFilter(typeFilter === 'nfse' ? 'todos' : 'nfse')}
            >
              NFS-e <b>{nfse}</b>
            </Pill>
          </div>
          <span>
            Última busca: {company.lastSync ? formatDate(company.lastSync, true) : 'automática'}
          </span>
        </div>
        <div className="extractor-search-row">
          <label>
            <AnimatedExtractorIcon name="search" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por número, chave, razão social, CNPJ, tipo ou situação..."
            />
          </label>
          <button
            className="extractor-primary"
            onClick={() => setDownloadOpen(true)}
          >
            <AnimatedExtractorIcon name="download" />
            Baixar
          </button>
        </div>
        <div className="extractor-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emissão</th>
                <th>Nota / Chave</th>
                <th>Destinatário / Emitente</th>
                <th>Operação</th>
                <th className="right">Valor</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="extractor-empty-cell">
                    Carregando documentos...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((d, i) => {
                  const t = type(d),
                    st = status(d),
                    isEvent = d.documentKind === 'evento';
                  return (
                    <tr
                      key={`${d.accessKey || d.nsu || i}-${i}`}
                      className={`ws-zebra-row ${cancelled(d) ? 'ws-zebra-cancelled' : ''}`}
                      data-icon-hover
                      onClick={() => void open(d)}
                    >
                      <td>
                        <strong>{formatDate(d.issueDate)}</strong>
                        <span>
                          {d.issueDate
                            ? new Date(d.issueDate).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <b>{d.number || '—'}</b>
                          <small>/ {d.series || '1'}</small>
                          <TypeTag value={t} />
                          <StatusTag value={st} />
                          {['xml_requires_manifestation', 'xml_retry:manifestation_sent'].includes(
                            String(d.parseError || '')
                          ) && (
                            <button
                              type="button"
                              className="extractor-manifest-info"
                              title={
                                d.parseError === 'xml_requires_manifestation'
                                  ? 'Esta NF-e precisa de manifestação do destinatário.'
                                  : 'Manifestação registrada; XML aguardando liberação.'
                              }
                              onClick={event => {
                                event.stopPropagation();
                                void open(d);
                              }}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="key">{d.accessKey || '—'}</span>
                      </td>
                      <td>
                        <strong>
                          {isEvent
                            ? 'Documento relacionado'
                            : d.direction === 'saida'
                            ? d.recipientCnpj || '—'
                            : d.issuerName || '—'}
                        </strong>
                        <span>{d.direction === 'saida' ? d.recipientCnpj : d.issuerCnpj}</span>
                      </td>
                      <td>
                        <strong>
                          {isEvent
                            ? 'Evento fiscal'
                            : d.direction === 'saida'
                            ? 'Venda de mercadoria'
                            : 'Entrada fiscal'}
                        </strong>
                        <span>
                          {t} · {st}
                        </span>
                      </td>
                      <td className="right value">
                        {isEvent || d.value == null ? '—' : currency.format(d.value)}
                      </td>
                      <td className="right">
                        <button
                          className="extractor-view"
                          onClick={e => {
                            e.stopPropagation();
                            void open(d);
                          }}
                          disabled={busy === `doc:${d.accessKey || d.nsu}`}
                        >
                          <AnimatedExtractorIcon name="eye" />
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="extractor-empty-cell">
                    Nenhum documento neste filtro/período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="extractor-pagination">
          <span>
            {filtered.length
              ? `${(safe - 1) * PAGE_SIZE + 1}–${Math.min(safe * PAGE_SIZE, filtered.length)} de ${
                  filtered.length
                }`
              : '0 documento(s)'}
          </span>
          <div>
            <button disabled={safe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              ‹
            </button>
            <span>
              {safe} / {totalPages}
            </span>
            <button
              disabled={safe >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </section>
      <FiscalDownloadCenter
        open={downloadOpen}
        currentCompany={{ id: company.id, name: company.tradeName }}
        companies={companies.map((item: Company) => ({ id: item.id, name: item.tradeName }))}
        initialStart={start}
        initialEnd={end}
        initialDirection={filter === 'entrada' ? 'entrada' : filter === 'saida' ? 'saida' : 'todos'}
        onClose={() => setDownloadOpen(false)}
        exportFunction="extractor-fiscal-export"
        allowAllCompanies={companies.length > 1}
      />
    </div>
  );
}
function Pill({ active, onClick, children }: any) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {children}
    </button>
  );
}
function TypeTag({ value }: { value: string }) {
  return (
    <em className={`extractor-type ${value.replace(/[^a-z]/gi, '').toLowerCase()}`}>{value}</em>
  );
}
function StatusTag({ value }: { value: string }) {
  return (
    <em
      className={`extractor-state ${
        /cancel/i.test(value)
          ? 'danger'
          : /deneg/i.test(value)
          ? 'warning'
          : /autoriz/i.test(value)
          ? 'success'
          : 'neutral'
      }`}
    >
      {value}
    </em>
  );
}

function Reports({ companies, totals, models, daily }: any) {
  const data = [...companies].sort((a: any, b: any) => b.documents - a.documents).slice(0, 10);
  return (
    <div className="extractor-page">
      <PageHeading
        title="Relatórios"
        icon="report"
        description="Consolidado real da carteira fiscal."
      />
      <section className="extractor-kpis">
        <Metric
          label="Empresas"
          value={String(companies.length)}
          detail="CNPJs vinculados"
          icon="company"
        />
        <Metric
          label="Documentos"
          value={integer.format(totals.documents)}
          detail={`${totals.entries} compras · ${totals.exits} vendas`}
          icon="document"
        />
        <Metric
          label="XML integral"
          value={integer.format(totals.fullXml)}
          detail={`${totals.pendingXml} pendente(s)`}
          icon="certificate"
        />
        <Metric
          label="Movimentação"
          value={currency.format(totals.value)}
          detail="Total da janela"
          icon="report"
        />
      </section>
      <section className="extractor-dashboard-grid">
        <article className="extractor-panel extractor-panel-wide">
          <PanelHead title="Ritmo documental" sub="Últimos 30 dias" icon="report" />
          <div className="extractor-chart-area">
            <ResponsiveContainer>
              <AreaChart data={daily}>
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis dataKey="day" hide />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chart.text, fontSize: 10 }}
                />
                <Tooltip content={<Tip />} />
                <Area
                  dataKey="documents"
                  name="Documentos"
                  type="monotone"
                  stroke={chart.blue}
                  fill={chart.blue}
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="extractor-panel extractor-panel-wide">
          <PanelHead title="Empresas por volume" sub="Documentos por cliente" icon="company" />
          <div className="extractor-chart-company">
            <ResponsiveContainer>
              <BarChart data={data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="tradeName"
                  width={120}
                  tick={{ fill: chart.text, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<Tip />} />
                <Bar dataKey="documents" fill={chart.gold} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  );
}
function Certificates({ companies, onGo }: any) {
  return (
    <div className="extractor-page">
      <PageHeading
        title="Certificados"
        icon="certificate"
        description="A1 utilizado nas consultas fiscais das empresas adicionadas ao Extrator."
      />
      <div className="extractor-company-list">
        <div className="extractor-company-head certificate">
          <span>Empresa</span>
          <span>Validade</span>
          <span>Dias restantes</span>
          <span>Situação</span>
          <span>Ação</span>
        </div>
        {companies.map((c: Company) => {
          const state =
            c.certificateDays == null
              ? 'Não configurado'
              : c.certificateDays < 0
              ? 'Vencido'
              : c.certificateDays <= 30
              ? 'Atenção'
              : 'Válido';
          return (
            <div className="extractor-certificate-row" key={c.id}>
              <div>
                <strong>{c.tradeName}</strong>
                <span>{formatCnpj(c.cnpj)}</span>
              </div>
              <span>{c.certificateUntil ? formatDate(c.certificateUntil) : '—'}</span>
              <span>{c.certificateDays == null ? '—' : `${c.certificateDays} dia(s)`}</span>
              <StatusTag value={state} />
              <button onClick={() => onGo('Empresas')}>Gerenciar</button>
            </div>
          );
        })}
        {!companies.length && <Empty>Nenhuma empresa adicionada.</Empty>}
      </div>
    </div>
  );
}
function HealthState({ label, state }: { label: string; state: 'ok' | 'attention' | 'error' }) {
  return (
    <span className={`extractor-health-state ${state}`}>
      <i />
      {label}
    </span>
  );
}

function HistorySection({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  accountId,
  userId,
  preview,
  setNotice,
}: any) {
  const now = new Date();
  const company =
    companies.find((item: Company) => item.id === selectedCompanyId) || companies[0] || null;
  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth() - 6, 1).toLocaleDateString('sv-SE').slice(0, 7)
  );
  const [to, setTo] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [busy, setBusy] = useState(false);

  const purchaseError = Boolean(
    company?.purchaseLastError ||
      /error|fail/i.test(String(company?.purchaseStatus || ''))
  );
  const salesError = Boolean(
    company?.salesLastError ||
      /error|fail/i.test(String(company?.salesStatus || ''))
  );
  const certificateError = company?.certificateDays != null && company.certificateDays < 0;
  const attention =
    !certificateError &&
    (company?.pendingXml > 0 ||
      (company?.certificateDays != null && company.certificateDays <= 30) ||
      /retry|waiting|queued|running|reconciling|bootstrap/i.test(
        `${company?.purchaseStatus || ''} ${company?.salesStatus || ''}`
      ));
  const overall = purchaseError || salesError || certificateError
    ? { label: 'Precisa de atenção', state: 'error' as const }
    : attention
      ? { label: 'Acompanhando', state: 'attention' as const }
      : { label: 'Tudo certo', state: 'ok' as const };

  const save = async () => {
    if (preview) return setNotice({ tone: 'warning', text: 'Disponível no ambiente autenticado.' });
    if (
      !accountId ||
      !userId ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(from) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(to) ||
      from > to ||
      to > now.toLocaleDateString('sv-SE').slice(0, 7) ||
      !companies.length
    )
      return setNotice({ tone: 'error', text: 'Período inválido.' });
    if (busy) return;
    setBusy(true);
    try {
      const endDate = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)), 0);
      const { error } = await (supabase as any).from('extractor_history_requests').insert({
        account_id: accountId,
        requested_by: userId,
        requested_from: `${from}-01`,
        requested_to: `${to}-${String(endDate.getDate()).padStart(2, '0')}`,
        metadata: {
          companies: company ? [company.id] : companies.map((item: Company) => item.id),
          source: 'extractor_health_ui',
        },
      });
      setNotice(
        error
          ? { tone: 'error', text: 'Não foi possível registrar a solicitação agora.' }
          : { tone: 'success', text: 'Solicitação de período histórico registrada.' }
      );
    } catch {
      setNotice({ tone: 'error', text: 'Falha de conexão ao registrar o histórico.' });
    } finally {
      setBusy(false);
    }
  };

  if (!company)
    return (
      <div className="extractor-page">
        <PageHeading title="Histórico" icon="history" description="Saúde e atividade das extrações." />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );

  return (
    <div className="extractor-page">
      <PageHeading
        title="Histórico"
        icon="history"
        description="Saúde da extração, últimas rotinas e pendências da empresa selecionada."
        actions={
          <select
            className="extractor-company-select"
            value={company.id}
            onChange={event => setSelectedCompanyId(event.target.value)}
          >
            {companies.map((item: Company) => (
              <option key={item.id} value={item.id}>
                {item.tradeName}
              </option>
            ))}
          </select>
        }
      />

      <section className="extractor-health-hero">
        <div>
          <p>Saúde da extração</p>
          <h2>{company.tradeName}</h2>
          <span>{formatCnpj(company.cnpj)}</span>
        </div>
        <HealthState label={overall.label} state={overall.state} />
      </section>

      <section className="extractor-health-grid">
        <article>
          <span>Compras</span>
          <strong>{syncLabel(company.purchaseStatus)}</strong>
          <small>
            {company.purchaseLastCompletedAt
              ? `Última conclusão: ${formatDate(company.purchaseLastCompletedAt, true)}`
              : 'Aguardando primeira conclusão'}
          </small>
          {company.purchaseLastError && <p>{company.purchaseLastError}</p>}
        </article>
        <article>
          <span>Vendas</span>
          <strong>{syncLabel(company.salesStatus)}</strong>
          <small>
            {company.salesLastCompletedAt
              ? `Última conclusão: ${formatDate(company.salesLastCompletedAt, true)}`
              : 'Aguardando primeira conclusão'}
          </small>
          {company.salesLastError && <p>{company.salesLastError}</p>}
        </article>
        <article>
          <span>Documentos</span>
          <strong>{integer.format(company.documents)}</strong>
          <small>
            {integer.format(company.fullXml)} com XML · {integer.format(company.pendingXml)} pendente(s)
          </small>
          {company.salesXmlPending > 0 && <p>{company.salesXmlPending} XML de vendas aguardando recuperação.</p>}
        </article>
        <article>
          <span>Certificado A1</span>
          <strong>{company.certificateUntil ? formatDate(company.certificateUntil) : 'Não configurado'}</strong>
          <small>
            {company.certificateDays == null
              ? 'Sem validade disponível'
              : company.certificateDays < 0
                ? 'Certificado vencido'
                : `${company.certificateDays} dia(s) restantes`}
          </small>
        </article>
      </section>

      <article className="extractor-health-timeline">
        <div className="extractor-health-title">
          <div>
            <h2>Última atividade</h2>
            <p>Resumo das rotinas fiscais sem expor logs técnicos internos.</p>
          </div>
          <span>Última busca: {company.lastSync ? formatDate(company.lastSync, true) : '—'}</span>
        </div>
        <div className="extractor-health-rows">
          <div>
            <span><i className={purchaseError ? 'error' : 'ok'} />Compras</span>
            <strong>{syncLabel(company.purchaseStatus)}</strong>
            <small>{company.purchaseLastError || 'Nenhuma falha persistente informada.'}</small>
          </div>
          <div>
            <span><i className={salesError ? 'error' : 'ok'} />Vendas</span>
            <strong>{syncLabel(company.salesStatus)}</strong>
            <small>{company.salesLastError || 'Nenhuma falha persistente informada.'}</small>
          </div>
          <div>
            <span><i className={company.pendingXml ? 'attention' : 'ok'} />XML</span>
            <strong>{company.pendingXml ? `${company.pendingXml} pendente(s)` : 'Completo'}</strong>
            <small>{company.pendingXml ? 'A recuperação automática continuará tentando.' : 'Arquivos disponíveis no período contratado.'}</small>
          </div>
        </div>
      </article>

      <article className="extractor-history extractor-history-compact">
        <div>
          <h2>Consulta retroativa</h2>
          <p>Precisa analisar um período anterior à janela atual? Registre a solicitação para esta empresa.</p>
          <div className="extractor-form-row">
            <label>
              De
              <input type="month" value={from} onChange={event => setFrom(event.target.value)} />
            </label>
            <label>
              Até
              <input type="month" value={to} onChange={event => setTo(event.target.value)} />
            </label>
          </div>
          <button className="extractor-primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Registrando' : 'Solicitar análise'}
          </button>
        </div>
        <aside>
          <strong>{integer.format(company.documents)}</strong>
          <span>documentos disponíveis</span>
        </aside>
      </article>
    </div>
  );
}

function SettingsSection({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  account,
  usage,
  planLabel,
}: any) {
  const company =
    companies.find((item: Company) => item.id === selectedCompanyId) || companies[0] || null;
  const upgrade = () =>
    window.open(
      'https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20fazer%20upgrade%20do%20plano%20do%20Extrator%20Fiscal%20WS.',
      '_blank',
      'noopener,noreferrer'
    );

  if (!company)
    return (
      <div className="extractor-page">
        <PageHeading title="Configurações" icon="settings" description="Configurações do Extrator Fiscal." />
        <Empty>Adicione uma empresa para configurar o Extrator.</Empty>
      </div>
    );

  const certState =
    company.certificateDays == null
      ? 'Não configurado'
      : company.certificateDays < 0
        ? 'Vencido'
        : company.certificateDays <= 30
          ? 'Vence em breve'
          : 'Válido';

  return (
    <div className="extractor-page">
      <PageHeading
        title="Configurações"
        icon="settings"
        description="Empresa, certificado, sincronização, documentos e plano em um só lugar."
        actions={
          <select
            className="extractor-company-select"
            value={company.id}
            onChange={event => setSelectedCompanyId(event.target.value)}
          >
            {companies.map((item: Company) => (
              <option key={item.id} value={item.id}>
                {item.tradeName}
              </option>
            ))}
          </select>
        }
      />

      <section className="extractor-settings-overview">
        <div>
          <p>Empresa ativa</p>
          <h2>{company.tradeName}</h2>
          <span>{formatCnpj(company.cnpj)} · {company.uf}</span>
        </div>
        <div>
          <span>Última sincronização</span>
          <strong>{company.lastSync ? formatDate(company.lastSync, true) : 'Ainda não concluída'}</strong>
        </div>
      </section>

      <div className="extractor-settings-sections">
        <article className="extractor-panel">
          <PanelHead title="Empresa" sub="Identificação fiscal utilizada pelo Extrator" icon="company" />
          <dl>
            <div><dt>Razão social</dt><dd>{company.name}</dd></div>
            <div><dt>Nome fantasia</dt><dd>{company.tradeName}</dd></div>
            <div><dt>CNPJ</dt><dd>{formatCnpj(company.cnpj)}</dd></div>
            <div><dt>UF</dt><dd>{company.uf}</dd></div>
          </dl>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Certificado digital" sub="A1 usado nas consultas fiscais" icon="certificate" />
          <dl>
            <div><dt>Situação</dt><dd>{certState}</dd></div>
            <div><dt>Validade</dt><dd>{company.certificateUntil ? formatDate(company.certificateUntil) : '—'}</dd></div>
            <div><dt>Dias restantes</dt><dd>{company.certificateDays == null ? '—' : String(company.certificateDays)}</dd></div>
          </dl>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Sincronização fiscal" sub="Compras e vendas desta empresa" icon="refresh" />
          <dl>
            <div><dt>Automática</dt><dd>{company.automaticSync ? 'Ativada' : 'Desativada'}</dd></div>
            <div><dt>Compras</dt><dd>{syncLabel(company.purchaseStatus)}</dd></div>
            <div><dt>Vendas</dt><dd>{syncLabel(company.salesStatus)}</dd></div>
            <div><dt>Última busca</dt><dd>{company.lastSync ? formatDate(company.lastSync, true) : '—'}</dd></div>
          </dl>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Documentos" sub="Cobertura dos arquivos fiscais" icon="document" />
          <dl>
            <div><dt>Documentos</dt><dd>{integer.format(company.documents)}</dd></div>
            <div><dt>XML integral</dt><dd>{integer.format(company.fullXml)}</dd></div>
            <div><dt>Pendentes</dt><dd>{integer.format(company.pendingXml)}</dd></div>
            <div><dt>Compras / vendas</dt><dd>{integer.format(company.entries)} / {integer.format(company.exits)}</dd></div>
          </dl>
        </article>

        <article className="extractor-panel extractor-plan-card">
          <PanelHead title="Plano e consumo" sub="Ciclo atual da conta" icon="report" />
          <div className="extractor-settings-plan">
            <div className="extractor-plan-usage-header">
              <div>
                <span>XML processados</span>
                <strong>{integer.format(usage.used)} / {integer.format(usage.limit)}</strong>
              </div>
              <b>{usage.percent}% utilizado</b>
            </div>
            <div className="extractor-plan-progress">
              <i style={{ width: `${Math.min(100, Math.max(0, usage.percent))}%` }} />
            </div>
            <dl>
              <div><dt>Plano</dt><dd>{planLabel}</dd></div>
              <div><dt>Restantes</dt><dd>{integer.format(usage.remaining)} XML</dd></div>
              <div><dt>Ciclo</dt><dd>{formatDate(usage.period_start)} a {formatDate(usage.period_end)}</dd></div>
              <div><dt>Janela padrão</dt><dd>{account?.base_lookback_days ? `${account.base_lookback_days} dias` : '—'}</dd></div>
            </dl>
            <button className="extractor-primary extractor-upgrade" onClick={upgrade}>Fazer upgrade</button>
          </div>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Conta e acesso" sub="Contexto desta assinatura" icon="settings" />
          <dl>
            <div><dt>Conta</dt><dd>{account?.name || 'Conta Extrator'}</dd></div>
            <div><dt>Empresas</dt><dd>{companies.length}</dd></div>
            <div><dt>Período liberado desde</dt><dd>{account?.allowed_from ? formatDate(account.allowed_from) : '—'}</dd></div>
            <div><dt>Produto</dt><dd>Extrator Fiscal WS</dd></div>
          </dl>
        </article>
      </div>
    </div>
  );
}

export function AddCompanyModal({ preview, onClose, onDone }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    if (preview) return setError('O cadastro fica disponível no ambiente autenticado.');
    if (!file || !password) return setError('Selecione o certificado A1 e informe a senha.');
    if (!/\.(pfx|p12)$/i.test(file.name)) return setError('Selecione um certificado .pfx ou .p12.');
    if (!file.size || file.size > 2 * 1024 * 1024)
      return setError('O certificado deve ter entre 1 byte e 2 MB.');
    setBusy(true);
    setError('');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const data = await extractorRequest({
        action: 'add_from_certificate',
        certificate_base64: btoa(binary),
        certificate_password: password,
        certificate_name: file.name,
      });
      setPassword('');
      setFile(null);
      onDone(data.company);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl"
        onEscapeKeyDown={e => {
          if (busy) e.preventDefault();
        }}
        onInteractOutside={e => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogTitle>Adicionar ou renovar certificado A1</DialogTitle>
        <DialogDescription>
          O CNPJ é identificado pelo certificado. Na renovação, os dados já cadastrados da empresa
          são preservados.
        </DialogDescription>
        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
          aria-busy={busy}
        >
          <label className="block space-y-2 text-sm font-medium">
            Arquivo do certificado
            <input
              className="block w-full rounded-lg border p-3"
              type="file"
              accept=".pfx,.p12"
              disabled={busy}
              onChange={e => {
                setFile(e.target.files?.[0] || null);
                setError('');
              }}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {file ? file.name : 'Selecione um arquivo .pfx ou .p12, de até 2 MB.'}
          </p>
          <label className="block space-y-2 text-sm font-medium">
            Senha do certificado
            <input
              className="block w-full rounded-lg border p-3"
              type="password"
              autoComplete="off"
              maxLength={1024}
              disabled={busy}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha do A1"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {busy && (
            <p role="status" className="text-sm text-muted-foreground">
              Validando o A1 e consultando o cadastro. Aguarde a confirmação antes de sair.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="extractor-secondary" disabled={busy} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="extractor-primary" disabled={busy}>
              {busy ? 'Validando e salvando…' : 'Validar e salvar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Loading() {
  return (
    <div className="extractor-loading">
      <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
      <span />
      <p>Carregando dados fiscais...</p>
    </div>
  );
}
function AccessPending() {
  return (
    <div className="extractor-access-pending">
      <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
      <div>
        <h1>Extrato Fiscal não habilitado</h1>
        <p>Esta conta não possui acesso ativo ao produto.</p>
        <a href="/extrator-preview">Abrir demonstração</a>
      </div>
    </div>
  );
}
