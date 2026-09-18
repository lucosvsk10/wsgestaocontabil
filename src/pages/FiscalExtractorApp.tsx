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
import { CalendarDays, Info, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ExtractorFiscalDocumentPreviewModal from '@/components/extractor/ExtractorFiscalDocumentPreviewModal';
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
import '@/styles/fiscal-extractor-redesign.css';

type Section =
  | 'Visão geral'
  | 'Empresas'
  | 'Documentos'
  | 'Relatórios'
  | 'Faturas'
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
type ImportNotification = {
  id: string;
  company_id: string;
  kind: string;
  title: string;
  message: string;
  metadata?: {
    company_name?: string;
    purchase_count?: number;
    sales_count?: number;
    total_count?: number;
    access_keys?: string[];
    issue_from?: string | null;
    issue_to?: string | null;
  };
  created_at: string;
};
type DocumentNotificationFocus = {
  notificationId: string;
  companyId: string;
  keys: string[];
  issueFrom?: string | null;
  issueTo?: string | null;
  label: string;
};
type UsageCompany = {
  company_id: string;
  name: string;
  legal_name?: string;
  cnpj?: string;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
};
type Usage = {
  mode?: 'aggregate' | 'per_company';
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  per_company_limit?: number;
  companies?: UsageCompany[];
  period_start?: string | null;
  period_end?: string | null;
};

const nav: Array<{ label: Section; icon: ExtractorIconName; group: string }> = [
  { label: 'Visão geral', icon: 'dashboard', group: 'Operação' },
  { label: 'Empresas', icon: 'company', group: 'Operação' },
  { label: 'Documentos', icon: 'document', group: 'Fiscal' },
  { label: 'Relatórios', icon: 'report', group: 'Fiscal' },
  { label: 'Faturas', icon: 'report', group: 'Gestão' },
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
    [usage, setUsage] = useState<Usage>({ used: 0, limit: 0, remaining: 0, percent: 0 }),
    [importNotifications, setImportNotifications] = useState<ImportNotification[]>([]),
    [documentFocus, setDocumentFocus] = useState<DocumentNotificationFocus | null>(null);
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

  const loadImportNotifications = useCallback(async () => {
    if (preview || denied || !user) return;
    try {
      const { data, error } = await supabase.functions.invoke('extractor-notifications', {
        body: { action: 'list' },
      });
      if (error) throw error;
      setImportNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch {
      // Notification delivery must never interrupt the fiscal workspace.
    }
  }, [preview, denied, user?.id]);

  useEffect(() => {
    if (preview || denied || !user) return;
    void loadImportNotifications();
    const timer = window.setInterval(() => void loadImportNotifications(), 60000);
    const onFocus = () => void loadImportNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [preview, denied, user?.id, loadImportNotifications]);

  const updateImportNotification = useCallback(async (
    notification: ImportNotification,
    action: 'read' | 'dismiss',
    openDocuments = false
  ) => {
    setImportNotifications(current => current.filter(item => item.id !== notification.id));
    try {
      await supabase.functions.invoke('extractor-notifications', {
        body: { action, notification_id: notification.id },
      });
    } catch {
      // Optimistic dismissal keeps the UI quiet; the next successful poll reconciles state.
    }
    if (openDocuments) {
      const keys = Array.isArray(notification.metadata?.access_keys)
        ? notification.metadata!.access_keys!.map(String).filter(Boolean)
        : [];
      setSelectedCompanyId(notification.company_id);
      setDocumentFocus({
        notificationId: notification.id,
        companyId: notification.company_id,
        keys,
        issueFrom: notification.metadata?.issue_from || null,
        issueTo: notification.metadata?.issue_to || null,
        label: notification.message,
      });
      setActive('Documentos');
      setMobile(false);
      setNotice(null);
    }
  }, []);
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
              purchaseLastCompletedAt: new Date().toISOString(),
              purchaseLastError: null,
              salesLastCompletedAt: new Date().toISOString(),
              salesLastError: null,
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
        limit: 5000,
        remaining: 4674,
        percent: 7,
        period_start: null,
        period_end: null,
      }
    : usage;
  const planLabel = preview
    ? 'Extrator Padrão · 5.000 XML/mês'
    : snapshot?.account?.plan_code === 'extractor_commercial'
      ? 'Extrator Padrão · 5.000 XML/mês'
      : snapshot?.account?.plan_code === 'extractor_pro'
        ? 'Extrator Pro · 15.000 XML/mês'
        : snapshot?.account?.plan_code === 'extractor_enterprise'
          ? 'Extrator Enterprise · 10.000 XML por empresa'
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
        const { data, error } = await supabase.functions.invoke('extractor-document-preview', {
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
      const { data: refresh } = await supabase.functions.invoke('extractor-document-preview', {
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
        {planUsage.mode === 'per_company' && planUsage.companies?.length ? (
          <section className="extractor-usage extractor-usage-enterprise">
            <button className="extractor-usage-enterprise-head" onClick={() => go('Faturas')}>
              <small>Uso do plano</small>
              <strong>Enterprise</strong>
              <span>{integer.format(planUsage.per_company_limit || 10000)} XML por empresa</span>
            </button>
            <div className="extractor-usage-company-list">
              {planUsage.companies.map(companyUsage => (
                <button
                  key={companyUsage.company_id}
                  className="extractor-usage-company"
                  onClick={() => go('Faturas')}
                  title={companyUsage.legal_name || companyUsage.name}
                >
                  <span className="extractor-usage-company-head">
                    <b>{companyUsage.name}</b>
                    <em>{integer.format(companyUsage.used)} / {integer.format(companyUsage.limit)}</em>
                  </span>
                  <span className="usage-track">
                    <i style={{ width: `${Math.min(100, Math.max(0, companyUsage.percent))}%` }} />
                  </span>
                  <small>{integer.format(companyUsage.remaining)} restantes</small>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <button className="extractor-usage" onClick={() => go('Faturas')} data-icon-hover>
            <small>Uso do plano</small>
            <strong>
              {integer.format(planUsage.used)} <span>/ {integer.format(planUsage.limit)} XML</span>
            </strong>
            <div className="usage-track">
              <i style={{ width: `${Math.min(100, Math.max(0, planUsage.percent))}%` }} />
            </div>
            <span>{integer.format(planUsage.remaining)} restantes · ver detalhes</span>
          </button>
        )}
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
            notificationFocus={documentFocus}
            onClearNotificationFocus={() => setDocumentFocus(null)}
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
        {active === 'Faturas' && (
          <BillingSection
            usage={planUsage}
            planLabel={planLabel}
            preview={preview}
            setNotice={setNotice}
          />
        )}
        {active === 'Histórico' && (
          <HistorySection
            companies={companies}
            preview={preview}
            setNotice={setNotice}
          />
        )}
        {active === 'Configurações' && (
          <SettingsSection
            account={snapshot?.account}
            user={user}
            preview={preview}
            setNotice={setNotice}
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
      <ImportNotificationStack
        notifications={importNotifications.slice(0, 3)}
        onOpen={notification => void updateImportNotification(notification, 'read', true)}
        onDismiss={notification => void updateImportNotification(notification, 'dismiss', false)}
      />
      <ExtractorFiscalDocumentPreviewModal
        document={previewDoc}
        companyName={previewCompany?.tradeName || previewCompany?.name || 'Empresa'}
        companyCnpj={previewCompany?.cnpj || ''}
        downloadingPdf={previewPdfBusy}
        downloadingXml={previewXmlBusy}
        onClose={() => setPreviewDoc(null)}
        onDownloadPdf={downloadPreviewPdf}
        onDownloadXml={downloadPreviewXml}
        onManifestation={manifestPreview}
        onRetry={async document => {
          const { data } = await supabase.functions.invoke('extractor-document-preview', {
            body: { company_id: document.companyId, access_key: document.accessKey, nsu: document.nsu },
          });
          if (data?.ready && data.document) setPreviewDoc(rowToDoc(data.document));
          await load(true);
        }}
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

function ImportNotificationStack({
  notifications,
  onOpen,
  onDismiss,
}: {
  notifications: ImportNotification[];
  onOpen: (notification: ImportNotification) => void;
  onDismiss: (notification: ImportNotification) => void;
}) {
  if (!notifications.length) return null;
  return (
    <aside className="extractor-import-notifications" aria-live="polite">
      {notifications.map(notification => {
        const purchases = Number(notification.metadata?.purchase_count || 0);
        const sales = Number(notification.metadata?.sales_count || 0);
        const companyName = notification.metadata?.company_name || 'Empresa';
        return (
          <article key={notification.id} className="extractor-import-notification">
            <div className="extractor-import-notification-icon">
              <AnimatedExtractorIcon name={sales > 0 && purchases === 0 ? 'upload' : 'download'} />
            </div>
            <div>
              <small>{companyName}</small>
              <strong>{notification.title}</strong>
              <p>
                {purchases > 0 && <span>{purchases} compra{purchases === 1 ? '' : 's'}</span>}
                {sales > 0 && <span>{sales} venda{sales === 1 ? '' : 's'}</span>}
              </p>
              <button onClick={() => onOpen(notification)}>Ver documentos</button>
            </div>
            <button
              className="extractor-import-notification-close"
              onClick={() => onDismiss(notification)}
              aria-label="Dispensar notificação"
            >
              <X />
            </button>
          </article>
        );
      })}
    </aside>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  watermark = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ExtractorIconName;
  watermark?: boolean;
}) {
  return (
    <article className={`extractor-metric ${watermark ? 'extractor-metric-visual' : ''}`} data-icon-hover>
      <div>
        <p>{label}</p>
        {!watermark && <AnimatedExtractorIcon name={icon} />}
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
      {watermark && (
        <span className="extractor-metric-watermark" aria-hidden="true">
          <AnimatedExtractorIcon name={icon} />
        </span>
      )}
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
          watermark
        />
        <Metric
          label="Compras"
          value={integer.format(totals.entries)}
          detail="Entradas fiscais"
          icon="download"
          watermark
        />
        <Metric
          label="Vendas"
          value={integer.format(totals.exits)}
          detail="Saídas fiscais"
          icon="upload"
          watermark
        />
        <Metric
          label="Movimentação"
          value={currency.format(totals.value)}
          detail="Valor disponível no período"
          icon="report"
          watermark
        />
        <Metric
          label="Cobertura XML"
          value={`${xmlRate}%`}
          detail={`${integer.format(totals.pendingXml)} pendente(s)`}
          icon="certificate"
          watermark
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
                        ? 'Empresas'
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
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState('');
  const [detailId, setDetailId] = useState('');
  const [detailRaw, setDetailRaw] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [removeTarget, setRemoveTarget] = useState<Company | null>(null);

  const visible = companies.filter(
    (c: Company) =>
      `${c.name} ${c.tradeName} ${c.cnpj}`.toLowerCase().includes(term.toLowerCase().trim()) ||
      (term.replace(/\D/g, '').length > 0 && c.cnpj.replace(/\D/g, '').includes(term.replace(/\D/g, '')))
  );
  const selected = companies.find((c: Company) => c.id === detailId) || null;

  const loadDetail = useCallback(async (id: string) => {
    if (!id || preview) {
      setDetailRaw(null);
      return;
    }
    setDetailLoading(true);
    try {
      const data = await extractorRequest({ action: 'list' });
      const link = (data?.companies || []).find((item: any) => String(item.fiscal_company_id) === id);
      setDetailRaw(link || null);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível carregar os dados completos da empresa.',
      });
      setDetailRaw(null);
    } finally {
      setDetailLoading(false);
    }
  }, [preview]);

  useEffect(() => {
    if (detailId) void loadDetail(detailId);
  }, [detailId, loadDetail]);

  const sync = async (c: Company) => {
    if (preview)
      return setNotice({ tone: 'warning', text: 'A sincronização fica disponível no ambiente autenticado.' });
    if (busy) return;
    setBusy(`sync:${c.id}`);
    try {
      const { data, error } = await (supabase as any).rpc('extractor_queue_sync', { _company_id: c.id });
      if (error || !data?.ok)
        setNotice({ tone: 'error', text: data?.message || 'Não foi possível sincronizar esta empresa agora.' });
      else
        setNotice({ tone: 'success', text: `${c.tradeName}: sincronização fiscal colocada na fila.` });
      await onReload();
      if (detailId === c.id) await loadDetail(c.id);
    } catch {
      setNotice({ tone: 'error', text: 'Falha de conexão ao sincronizar. Tente novamente.' });
    } finally {
      setBusy('');
    }
  };

  const openEditor = () => {
    if (!selected) return;
    const fiscal = detailRaw?.fiscal_companies || {};
    const profile = detailRaw?.profile_overrides || {};
    const address = profile?.address || {};
    const fiscalAddress = fiscal?.endereco || {};
    setEditForm({
      trade_name: profile.trade_name ?? fiscal.nome_fantasia ?? selected.tradeName ?? '',
      state_registration: profile.state_registration ?? fiscal.inscricao_estadual ?? '',
      municipality: profile.municipality ?? fiscal.municipio ?? '',
      phone: profile.phone ?? '',
      address: {
        street: address.street ?? fiscalAddress.logradouro ?? '',
        number: address.number ?? fiscalAddress.numero ?? '',
        district: address.district ?? fiscalAddress.bairro ?? '',
        postal_code: address.postal_code ?? fiscalAddress.cep ?? '',
        complement: address.complement ?? fiscalAddress.complemento ?? '',
      },
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!selected || busy) return;
    if (preview) return setNotice({ tone: 'warning', text: 'A edição fica disponível no ambiente autenticado.' });
    setBusy(`edit:${selected.id}`);
    try {
      await extractorRequest({ action: 'update_profile', company_id: selected.id, profile: editForm });
      setEditOpen(false);
      await loadDetail(selected.id);
      await onReload();
      setNotice({ tone: 'success', text: 'Dados de exibição da empresa atualizados.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar os dados da empresa.' });
    } finally {
      setBusy('');
    }
  };

  const removeCompany = async () => {
    if (!removeTarget || busy) return;
    if (preview) return setNotice({ tone: 'warning', text: 'A remoção fica disponível no ambiente autenticado.' });
    setBusy(`remove:${removeTarget.id}`);
    try {
      await extractorRequest({ action: 'remove', company_id: removeTarget.id });
      if (detailId === removeTarget.id) {
        setDetailId('');
        setDetailRaw(null);
      }
      setRemoveTarget(null);
      await onReload();
      setNotice({ tone: 'success', text: 'Empresa removida desta conta do Extrator. Os documentos fiscais originais foram preservados.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível remover a empresa.' });
    } finally {
      setBusy('');
    }
  };

  if (selected) {
    const fiscal = detailRaw?.fiscal_companies || {};
    const profile = detailRaw?.profile_overrides || {};
    const address = profile?.address || {};
    const fiscalAddress = fiscal?.endereco || {};
    const certs = Array.isArray(fiscal?.fiscal_certificates) ? fiscal.fiscal_certificates : [];
    const activeCert = certs.find((item: any) => item.is_active) || certs[0] || null;
    const displayTradeName = profile.trade_name || fiscal.nome_fantasia || selected.tradeName;
    const displayIE = profile.state_registration || fiscal.inscricao_estadual || '—';
    const displayMunicipality = profile.municipality || fiscal.municipio || '—';
    const displayAddress = [
      address.street || fiscalAddress.logradouro,
      address.number || fiscalAddress.numero,
      address.district || fiscalAddress.bairro,
      address.postal_code || fiscalAddress.cep,
    ].filter(Boolean).join(' · ') || '—';
    const certLabel =
      selected.certificateDays == null
        ? 'Não configurado'
        : selected.certificateDays < 0
          ? 'Vencido'
          : selected.certificateDays <= 30
            ? 'Vence em breve'
            : 'Válido';

    return (
      <div className="extractor-page">
        <PageHeading
          title="Empresas"
          icon="company"
          description="Cadastro fiscal, certificado e operação da empresa dentro do Extrator."
          actions={<button className="extractor-company-back" onClick={() => { setDetailId(''); setDetailRaw(null); }}>← Voltar para empresas</button>}
        />
        <section className="extractor-company-detail">
          <header className="extractor-company-detail-head">
            <div>
              <span className="extractor-company-detail-avatar">{displayTradeName.slice(0, 2).toUpperCase()}</span>
              <div>
                <small>Empresa do Extrator</small>
                <h2>{selected.name}</h2>
                <p>{displayTradeName} · {formatCnpj(selected.cnpj)} · {selected.uf}</p>
              </div>
            </div>
            <div className="extractor-company-detail-actions">
              <button onClick={() => void sync(selected)} disabled={busy === `sync:${selected.id}`}>
                {busy === `sync:${selected.id}` ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
              <button onClick={openEditor}>Editar dados</button>
              <button onClick={onAdd}>Adicionar / substituir A1</button>
              <button className="primary" onClick={() => onOpen(selected.id)}>Ver documentos</button>
            </div>
          </header>

          <div className="extractor-company-detail-grid">
            <article className="extractor-company-detail-card">
              <small>Documentos</small><strong>{integer.format(selected.documents)}</strong>
              <span>{integer.format(selected.entries)} compras · {integer.format(selected.exits)} vendas</span>
            </article>
            <article className="extractor-company-detail-card">
              <small>XML integral</small><strong>{integer.format(selected.fullXml)}</strong>
              <span>{selected.pendingXml ? `${selected.pendingXml} pendente(s)` : 'Todos os arquivos disponíveis'}</span>
            </article>
            <article className="extractor-company-detail-card">
              <small>Sincronização</small><strong>{syncLabel(selected.purchaseStatus)} / {syncLabel(selected.salesStatus)}</strong>
              <span>{selected.lastSync ? `Última busca ${formatDate(selected.lastSync, true)}` : 'Primeira busca ainda não concluída'}</span>
            </article>
            <article className="extractor-company-detail-card">
              <small>Certificado A1</small><strong>{certLabel}</strong>
              <span>{selected.certificateUntil ? `Validade ${formatDate(selected.certificateUntil)}` : 'Adicione um A1 para manter as consultas ativas'}</span>
            </article>
          </div>

          <div className="extractor-company-detail-info">
            <article>
              <div className="extractor-detail-title-row"><h3>Dados cadastrais</h3><button onClick={openEditor}>Editar</button></div>
              {detailLoading ? <p className="extractor-helper">Carregando dados completos...</p> : (
                <dl>
                  <div><dt>Razão social</dt><dd>{fiscal.razao_social || selected.name}</dd></div>
                  <div><dt>Nome fantasia</dt><dd>{displayTradeName}</dd></div>
                  <div><dt>CNPJ</dt><dd>{formatCnpj(fiscal.cnpj || selected.cnpj)}</dd></div>
                  <div><dt>Inscrição estadual</dt><dd>{displayIE}</dd></div>
                  <div><dt>Município / UF</dt><dd>{[displayMunicipality, fiscal.uf || selected.uf].filter(Boolean).join(' / ')}</dd></div>
                  <div><dt>Telefone</dt><dd>{profile.phone || 'Não informado'}</dd></div>
                  <div><dt>Endereço</dt><dd>{displayAddress}</dd></div>
                  <div><dt>Regime tributário</dt><dd>{String(fiscal.regime_tributario || '—').replace(/_/g, ' ')}</dd></div>
                  <div><dt>Ambiente</dt><dd>{fiscal.ambiente_padrao === 'homologacao' ? 'Homologação' : 'Produção'}</dd></div>
                  <div><dt>Vinculada ao Extrator em</dt><dd>{detailRaw?.created_at ? formatDate(detailRaw.created_at, true) : '—'}</dd></div>
                </dl>
              )}
            </article>
            <article>
              <h3>Certificado e captura</h3>
              <dl>
                <div><dt>Certificado</dt><dd>{activeCert?.certificate_name || 'Não configurado'}</dd></div>
                <div><dt>Titular</dt><dd>{activeCert?.holder_name || '—'}</dd></div>
                <div><dt>CNPJ do titular</dt><dd>{activeCert?.holder_cnpj ? formatCnpj(activeCert.holder_cnpj) : '—'}</dd></div>
                <div><dt>Validade</dt><dd>{activeCert?.valid_until ? formatDate(activeCert.valid_until) : selected.certificateUntil ? formatDate(selected.certificateUntil) : '—'}</dd></div>
                <div><dt>Busca automática</dt><dd>{selected.automaticSync ? 'Ativada' : 'Desativada'}</dd></div>
                <div><dt>Compras</dt><dd>{syncLabel(selected.purchaseStatus)}</dd></div>
                <div><dt>Vendas</dt><dd>{syncLabel(selected.salesStatus)}</dd></div>
                <div><dt>Último erro</dt><dd>{selected.purchaseLastError || selected.salesLastError || 'Nenhuma falha persistente'}</dd></div>
              </dl>
            </article>
          </div>
        </section>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="extractor-dark-dialog sm:max-w-2xl">
            <DialogTitle>Editar dados da empresa</DialogTitle>
            <DialogDescription>
              CNPJ e razão social fiscal permanecem protegidos. As alterações abaixo valem apenas para a exibição desta empresa dentro da sua conta do Extrator.
            </DialogDescription>
            <div className="extractor-edit-company-grid">
              <label>Nome fantasia<input value={editForm.trade_name || ''} onChange={e => setEditForm((v: any) => ({ ...v, trade_name: e.target.value }))} /></label>
              <label>Inscrição estadual<input value={editForm.state_registration || ''} onChange={e => setEditForm((v: any) => ({ ...v, state_registration: e.target.value }))} /></label>
              <label>Município<input value={editForm.municipality || ''} onChange={e => setEditForm((v: any) => ({ ...v, municipality: e.target.value }))} /></label>
              <label>Telefone<input value={editForm.phone || ''} onChange={e => setEditForm((v: any) => ({ ...v, phone: e.target.value }))} /></label>
              <label className="wide">Logradouro<input value={editForm.address?.street || ''} onChange={e => setEditForm((v: any) => ({ ...v, address: { ...(v.address || {}), street: e.target.value } }))} /></label>
              <label>Número<input value={editForm.address?.number || ''} onChange={e => setEditForm((v: any) => ({ ...v, address: { ...(v.address || {}), number: e.target.value } }))} /></label>
              <label>Bairro<input value={editForm.address?.district || ''} onChange={e => setEditForm((v: any) => ({ ...v, address: { ...(v.address || {}), district: e.target.value } }))} /></label>
              <label>CEP<input value={editForm.address?.postal_code || ''} onChange={e => setEditForm((v: any) => ({ ...v, address: { ...(v.address || {}), postal_code: e.target.value } }))} /></label>
              <label className="wide">Complemento<input value={editForm.address?.complement || ''} onChange={e => setEditForm((v: any) => ({ ...v, address: { ...(v.address || {}), complement: e.target.value } }))} /></label>
            </div>
            <div className="extractor-dialog-actions">
              <button className="extractor-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
              <button className="extractor-primary" onClick={() => void saveProfile()} disabled={busy === `edit:${selected.id}`}>
                {busy === `edit:${selected.id}` ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="extractor-page">
      <PageHeading
        title="Empresas"
        icon="company"
        description="Empresas vinculadas ao Extrator. Clique em uma delas para abrir o cadastro fiscal completo."
        actions={<button className="extractor-primary" onClick={onAdd}><AnimatedExtractorIcon name="upload" />Adicionar com A1</button>}
      />
      <div className="extractor-toolbar">
        <label><AnimatedExtractorIcon name="search" /><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar empresa ou CNPJ" /></label>
      </div>
      <div className="extractor-company-list">
        <div className="extractor-company-head">
          <span>Empresa</span><span>Documentos</span><span>XML integral</span><span>Sincronização</span><span>Certificado</span><span>Ações</span>
        </div>
        {visible.map((c: Company) => (
          <div
            className="extractor-company-row" key={c.id} role="button" tabIndex={0} data-icon-hover
            onClick={() => setDetailId(c.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailId(c.id); } }}
          >
            <div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)} · {c.uf}</span></div>
            <div><strong>{integer.format(c.documents)}</strong><span>{c.entries} compras · {c.exits} vendas</span></div>
            <div><strong>{integer.format(c.fullXml)}</strong><span>{c.pendingXml ? `${c.pendingXml} pendente(s)` : 'Completo no período'}</span></div>
            <div><strong>{syncLabel(c.purchaseStatus)} / {syncLabel(c.salesStatus)}</strong><span>{c.lastSync ? formatDate(c.lastSync, true) : 'Ainda não concluída'}</span></div>
            <div><strong>{c.certificateUntil ? formatDate(c.certificateUntil) : 'Não configurado'}</strong><span>{c.certificateDays == null ? '—' : `${c.certificateDays} dia(s)`}</span></div>
            <div className="extractor-row-actions">
              <button onClick={e => { e.stopPropagation(); setDetailId(c.id); }}>Abrir</button>
              <button className="danger" onClick={e => { e.stopPropagation(); setRemoveTarget(c); }}>Remover</button>
            </div>
          </div>
        ))}
        {!visible.length && <Empty>Nenhuma empresa encontrada.</Empty>}
      </div>

      <Dialog open={Boolean(removeTarget)} onOpenChange={open => !open && setRemoveTarget(null)}>
        <DialogContent className="extractor-dark-dialog sm:max-w-md">
          <DialogTitle>Remover empresa do Extrator?</DialogTitle>
          <DialogDescription>
            {removeTarget ? `${removeTarget.tradeName} será removida desta conta. Os documentos fiscais já armazenados não serão apagados.` : ''}
          </DialogDescription>
          <div className="extractor-dialog-actions">
            <button className="extractor-secondary" onClick={() => setRemoveTarget(null)}>Cancelar</button>
            <button className="extractor-danger-button" onClick={() => void removeCompany()} disabled={Boolean(busy)}>
              {busy.startsWith('remove:') ? 'Removendo...' : 'Remover empresa'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
  notificationFocus,
  onClearNotificationFocus,
}: any) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<(typeof MONTHS)[number]>(MONTHS[now.getMonth() + 1]);
  const [filter, setFilter] = useState<Filter>('todos');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { sales: number; purchases: number }>>({});
  const requestSequence = useRef(0);
  const company = companies.find((c: Company) => c.id === selectedCompanyId) || companies[0] || null;

  const monthStart = month === 'Ano'
    ? `${year}-01-01`
    : iso(new Date(year, MONTH_INDEX[month], 1));
  const monthEnd = month === 'Ano'
    ? `${year}-12-31`
    : iso(new Date(year, MONTH_INDEX[month] + 1, 0));
  const start = customOpen && customStart ? customStart : monthStart;
  const end = customOpen && customEnd ? customEnd : monthEnd;

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
        .rpc('extractor_company_documents', { _company_id: company.id, _start: start, _end: end })
        .abortSignal(AbortSignal.timeout(30_000));
      if (sequence !== requestSequence.current) return;
      if (error) throw error;
      const base = (data?.documents || []).map(rowToDoc);
      const known = new Set(base.map((d: Doc) => String(d.accessKey || '')).filter(Boolean));
      const extra = (data?.reconciliation || [])
        .filter((row: any) => row.access_key && !known.has(String(row.access_key)))
        .map((row: any) => reconciliationToDoc(row, company.id));
      const map = new Map<string, Doc>();
      [...base, ...extra].forEach((doc: Doc, index: number) => {
        const key = String(doc.accessKey || `${doc.nsu || 'nsu'}:${doc.number || index}`);
        const current = map.get(key);
        if (!current || (doc.fullXml && doc.xml && !(current.fullXml && current.xml))) map.set(key, doc);
      });
      setDocs([...map.values()]);
    } catch {
      if (sequence === requestSequence.current)
        setNotice({ tone: 'error', text: 'Não foi possível carregar os documentos. Tente novamente.' });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [preview, company?.id, start, end]);

  const loadMonthlyStats = useCallback(async () => {
    if (preview || !company) return;
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: { action: 'monthly_stats', company_id: company.id, year },
      });
      if (!error && data?.months) setMonthlyStats(data.months);
    } catch {
      // Os documentos continuam disponíveis mesmo se os contadores mensais não atualizarem.
    }
  }, [preview, company?.id, year]);

  useEffect(() => {
    void loadDocs();
    return () => { requestSequence.current++; };
  }, [loadDocs]);
  useEffect(() => { void loadMonthlyStats(); }, [loadMonthlyStats]);
  useEffect(() => setPage(1), [start, end, filter, typeFilter, query, company?.id]);

  useEffect(() => {
    if (!notificationFocus || notificationFocus.companyId !== company?.id) return;
    const from = notificationFocus.issueFrom ? String(notificationFocus.issueFrom).slice(0, 10) : '';
    const to = notificationFocus.issueTo ? String(notificationFocus.issueTo).slice(0, 10) : '';
    if (from && to) {
      setCustomOpen(true);
      setCustomStart(from);
      setCustomEnd(to);
    }
    setFilter('todos');
    setTypeFilter('todos');
    setQuery('');
    setPage(1);
  }, [notificationFocus?.notificationId, company?.id]);

  const fiscal = docs.filter(d => d.documentKind !== 'evento');
  const sales = fiscal.filter(d => d.direction === 'saida');
  const purchases = fiscal.filter(d => d.direction === 'entrada');
  const events = docs.filter(d => d.documentKind === 'evento' || d.direction === 'relacionada');
  const cancelledDocs = fiscal.filter(cancelled);
  const manifestationDocs = fiscal.filter(
    d => d.parseError === 'xml_requires_manifestation' || d.parseError === 'xml_retry:manifestation_sent'
  );
  const nfe = fiscal.filter(d => type(d) === 'NF-e').length;
  const nfce = fiscal.filter(d => type(d) === 'NFC-e').length;
  const nfse = fiscal.filter(d => type(d) === 'NFS-e').length;

  const filtered = docs.filter(d => {
    if (
      notificationFocus?.companyId === company?.id &&
      Array.isArray(notificationFocus?.keys) &&
      notificationFocus.keys.length > 0 &&
      !notificationFocus.keys.includes(String(d.accessKey || ''))
    ) return false;
    if (filter === 'saida' && (d.direction !== 'saida' || d.documentKind === 'evento')) return false;
    if (filter === 'entrada' && (d.direction !== 'entrada' || d.documentKind === 'evento')) return false;
    if (filter === 'evento' && !(d.documentKind === 'evento' || d.direction === 'relacionada')) return false;
    if (filter === 'cancelada' && !cancelled(d)) return false;
    if (filter === 'manifestacao' && !['xml_requires_manifestation', 'xml_retry:manifestation_sent'].includes(String(d.parseError || ''))) return false;
    const documentType = type(d);
    if (typeFilter === 'nfe' && documentType !== 'NF-e') return false;
    if (typeFilter === 'nfce' && documentType !== 'NFC-e') return false;
    if (typeFilter === 'nfse' && documentType !== 'NFS-e') return false;
    const normalized = query.trim().toLowerCase();
    return !normalized || [
      d.number, d.accessKey, d.issuerName, d.issuerCnpj, d.recipientName, d.recipientCnpj,
      d.nsu, d.series, d.statusText, documentType,
    ].some(value => String(value || '').toLowerCase().includes(normalized));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const open = async (document: Doc) => {
    if (preview) return setNotice({ tone: 'warning', text: 'A visualização completa fica disponível no ambiente autenticado.' });
    if (document.fullXml && document.xml) {
      onPreview(document);
      return;
    }
    if (busy) return;
    setBusy(`doc:${document.accessKey || document.nsu}`);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-document-preview', {
        body: { company_id: company.id, access_key: document.accessKey, nsu: document.nsu },
      });
      if (error) {
        setNotice({ tone: 'error', text: await extractorErrorMessage(error) });
        return;
      }
      if (data?.ready && data.document) {
        onPreview(rowToDoc(data.document));
      } else {
        onPreview({
          ...document,
          parseError: data?.requires_manifestation ? 'xml_requires_manifestation' : document.parseError,
        });
        if (data?.reason) setNotice({ tone: 'warning', text: data.reason });
      }
    } catch {
      setNotice({ tone: 'error', text: 'Não foi possível carregar o XML desta nota agora. Tente novamente.' });
    } finally {
      setBusy('');
    }
  };

  if (!company) {
    return (
      <div className="extractor-page">
        <PageHeading title="Documentos" icon="document" description="Adicione uma empresa com certificado A1 para iniciar." />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );
  }

  const statsFor = (label: (typeof MONTHS)[number]) => {
    if (label === 'Ano') {
      return Object.values(monthlyStats).reduce((acc, value) => ({
        sales: acc.sales + Number(value?.sales || 0),
        purchases: acc.purchases + Number(value?.purchases || 0),
      }), { sales: 0, purchases: 0 });
    }
    return monthlyStats[String(MONTH_INDEX[label] + 1).padStart(2, '0')] || { sales: 0, purchases: 0 };
  };
  const issueHour = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="extractor-page extractor-documents-v2">
      <PageHeading
        title="Documentos"
        icon="document"
        description="Compras e vendas com a mesma leitura fiscal do painel administrativo."
        actions={
          <select className="extractor-company-select" value={company.id} onChange={event => setSelectedCompanyId(event.target.value)}>
            {companies.map((item: Company) => <option key={item.id} value={item.id}>{item.tradeName}</option>)}
          </select>
        }
      />

      <section className="extractor-active-company">
        <div>
          <p>Empresa ativa</p>
          <strong>{company.name}</strong>
          <span>{company.tradeName !== company.name ? `${company.tradeName} · ` : ''}{formatCnpj(company.cnpj)}</span>
        </div>
        <div className={company.certificateDays != null && company.certificateDays >= 0 ? 'ok' : 'bad'}>
          <AnimatedExtractorIcon name="certificate" />
          {company.certificateDays != null && company.certificateDays >= 0 ? 'Certificado válido' : 'Certificado pendente'}
        </div>
      </section>

      <section className="extractor-period-v2">
        <div className="extractor-period-year">
          <small>Ano</small>
          <div>
            <button onClick={() => setYear(value => value - 1)}>‹</button>
            <strong>{year}</strong>
            <button disabled={year >= now.getFullYear()} onClick={() => setYear(value => value + 1)}>›</button>
          </div>
        </div>
        <div className="extractor-period-months">
          {MONTHS.filter(item => item !== 'Ano').map(item => {
            const future = year === now.getFullYear() && MONTH_INDEX[item] > now.getMonth();
            const stat = statsFor(item);
            return (
              <button
                key={item}
                disabled={future}
                className={`extractor-period-month ${!customOpen && month === item ? 'active' : ''}`}
                onClick={() => { setMonth(item); setCustomOpen(false); setCustomStart(''); setCustomEnd(''); }}
              >
                <b>{item}</b>
                <span>{stat.sales}V · <em>{stat.purchases}C</em></span>
              </button>
            );
          })}
        </div>
        <div className="extractor-period-custom">
          <button onClick={() => {
            const opening = !customOpen;
            setCustomOpen(opening);
            if (opening) {
              setCustomStart(start);
              setCustomEnd(end);
            }
          }}>
            <CalendarDays /> Personalizado
          </button>
        </div>
      </section>

      {customOpen && (
        <section className="extractor-custom-dates">
          <label>De <input type="date" value={customStart} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} /></label>
          <label>Até <input type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} /></label>
          <button onClick={() => { setCustomOpen(false); setCustomStart(''); setCustomEnd(''); }}>Voltar ao mês</button>
        </section>
      )}

      <section className="extractor-doc-kpis">
        <Metric label="Total notas" value={String(fiscal.length)} detail="Documentos fiscais" icon="document" />
        <Metric label="Vendas" value={String(sales.length)} detail="Saídas" icon="upload" />
        <Metric label="Compras" value={String(purchases.length)} detail="Entradas" icon="download" />
        <Metric
          label="Faturamento"
          value={currency.format(sales.reduce((sum, document) => sum + Number(document.value || 0), 0))}
          detail={`Entradas: ${currency.format(purchases.reduce((sum, document) => sum + Number(document.value || 0), 0))}`}
          icon="report"
        />
      </section>

      <section className="extractor-admin-table">
        {notificationFocus?.companyId === company.id && (
          <div className="extractor-document-focus">
            <div>
              <small>Importação recente</small>
              <strong>{notificationFocus.label}</strong>
              <span>Mostrando somente os documentos desta importação.</span>
            </div>
            <button onClick={onClearNotificationFocus}>Ver todos os documentos</button>
          </div>
        )}
        <div className="extractor-filter-row">
          <div>
            <Pill active={filter === 'saida'} onClick={() => setFilter('saida')}>↗ Vendas <b>{sales.length}</b></Pill>
            <Pill active={filter === 'entrada'} onClick={() => setFilter('entrada')}>↙ Compras <b>{purchases.length}</b></Pill>
            <Pill active={filter === 'todos'} onClick={() => setFilter('todos')}>Todas <b>{docs.length}</b></Pill>
            <Pill active={filter === 'evento'} onClick={() => setFilter('evento')}>Eventos <b>{events.length}</b></Pill>
            <Pill active={filter === 'cancelada'} onClick={() => setFilter('cancelada')}>⊘ Canceladas <b>{cancelledDocs.length}</b></Pill>
            {manifestationDocs.length > 0 && (
              <Pill active={filter === 'manifestacao'} onClick={() => setFilter('manifestacao')}>! Manifestação <b>{manifestationDocs.length}</b></Pill>
            )}
            <i />
            <Pill active={typeFilter === 'nfe'} onClick={() => setTypeFilter(typeFilter === 'nfe' ? 'todos' : 'nfe')}>NF-e <b>{nfe}</b></Pill>
            <Pill active={typeFilter === 'nfce'} onClick={() => setTypeFilter(typeFilter === 'nfce' ? 'todos' : 'nfce')}>NFC-e <b>{nfce}</b></Pill>
            <Pill active={typeFilter === 'nfse'} onClick={() => setTypeFilter(typeFilter === 'nfse' ? 'todos' : 'nfse')}>NFS-e <b>{nfse}</b></Pill>
          </div>
          <span>Última busca: {company.lastSync ? formatDate(company.lastSync, true) : '—'}</span>
        </div>

        <div className="extractor-search-row">
          <label>
            <AnimatedExtractorIcon name="search" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por número, chave, razão social, CNPJ, tipo ou situação..." />
          </label>
          <button className="extractor-primary" onClick={() => setDownloadOpen(true)}>
            <AnimatedExtractorIcon name="download" /> Baixar
          </button>
        </div>

        {loading ? <div className="extractor-table-loading">Carregando documentos...</div> : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Emissão</th><th>Nota / chave</th><th>Destinatário / emitente</th><th>Operação</th><th>Valor</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {rows.map((document: Doc, index: number) => {
                  const documentType = type(document);
                  const situation = status(document);
                  const counterpartyName = document.direction === 'saida'
                    ? document.recipientName || document.recipientCnpj || '—'
                    : document.issuerName || document.issuerCnpj || '—';
                  const counterpartyCnpj = document.direction === 'saida' ? document.recipientCnpj : document.issuerCnpj;
                  const manifest = ['xml_requires_manifestation', 'xml_retry:manifestation_sent'].includes(String(document.parseError || ''));
                  return (
                    <tr key={document.accessKey || `${document.nsu}-${index}`} className="ws-zebra-row extractor-doc-row" onDoubleClick={() => void open(document)}>
                      <td className="extractor-doc-emission">
                        <strong>{formatDate(document.issueDate)}</strong>
                        <span>{issueHour(document.issueDate)}</span>
                      </td>
                      <td className="extractor-doc-note">
                        <div className="extractor-doc-note-top">
                          <strong className="extractor-doc-number">{document.number || '—'} / {document.series || '—'}</strong>
                          <TypeTag value={documentType} />
                          <StatusTag value={situation} />
                          {manifest && (
                            <button
                              type="button"
                              className="extractor-manifest-info"
                              title={document.parseError === 'xml_requires_manifestation' ? 'Manifestação necessária' : 'Manifestação registrada; XML aguardando liberação'}
                              onClick={() => void open(document)}
                            ><Info /></button>
                          )}
                        </div>
                        <span className="key extractor-doc-key" title={document.accessKey || document.nsu || ''}>
                          {document.accessKey || document.nsu || 'Sem chave informada'}
                        </span>
                      </td>
                      <td className="extractor-doc-company">
                        <strong title={counterpartyName}>{counterpartyName}</strong>
                        <span>{counterpartyCnpj ? formatCnpj(counterpartyCnpj) : '—'}</span>
                      </td>
                      <td className="extractor-doc-operation">
                        <strong>{document.direction === 'saida' ? 'Venda de mercadoria' : document.direction === 'entrada' ? 'Entrada fiscal' : 'Evento fiscal'}</strong>
                        <span>{documentType} · {situation}</span>
                      </td>
                      <td className="extractor-doc-value"><strong>{currency.format(Number(document.value || 0))}</strong></td>
                      <td className="extractor-doc-actions">
                        <button className="extractor-view" onClick={() => void open(document)} disabled={busy === `doc:${document.accessKey || document.nsu}`}>
                          <AnimatedExtractorIcon name="eye" /> {busy === `doc:${document.accessKey || document.nsu}` ? 'Abrindo...' : 'Visualizar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6}><Empty>Nenhum documento encontrado para os filtros selecionados.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="extractor-pagination">
          <span>{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}` : '0 documento(s)'}</span>
          <div>
            <button disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>‹</button>
            <span>{safePage} / {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>›</button>
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
        appearance="extractor"
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
function HealthState({ label, state }: { label: string; state: 'ok' | 'attention' | 'error' }) {
  return <span className={`extractor-health-state ${state}`}><i />{label}</span>;
}

function HistorySection({ companies, preview, setNotice }: any) {
  const [healthCompanyId, setHealthCompanyId] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [healthSearch, setHealthSearch] = useState('');
  const company =
    companies.find((item: Company) => item.id === healthCompanyId) || companies[0] || null;

  useEffect(() => {
    if (!companies.length) {
      setHealthCompanyId('');
      setHealth(null);
      return;
    }
    if (!companies.some((item: Company) => item.id === healthCompanyId)) {
      setHealthCompanyId(companies[0].id);
    }
  }, [companies, healthCompanyId]);

  const loadHealth = useCallback(async () => {
    if (!company) return;
    if (preview) {
      setHealth({
        state: 'healthy',
        checked_at: new Date().toISOString(),
        period: { start: iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), end: iso(new Date()) },
        purchases: { source_checked: true, expected: company.entries, stored: company.entries, xml_ready: Math.max(0, company.entries - company.pendingXml), xml_pending: company.pendingXml, manifestation_required: 0, manifestation_sent: 0, status: company.purchaseStatus, failures: 0 },
        sales: { expected: company.exits, stored: company.exits, xml_ready: Math.max(0, company.exits - company.salesXmlPending), xml_pending: company.salesXmlPending, sequence_total: company.exits, sequence_resolved: company.exits, reconciliation_complete: true, status: company.salesStatus, failures: 0 },
        certificate: { valid_until: company.certificateUntil, expired: false },
        recovery: { count: 0, last_reason: null, last_checked_at: new Date().toISOString() },
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: { company_id: company.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setHealth(data);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível conferir a saúde fiscal agora.',
      });
    } finally {
      setBusy(false);
    }
  }, [company?.id, preview]);

  useEffect(() => {
    setHealth(null);
    void loadHealth();
  }, [loadHealth]);

  if (!company) {
    return (
      <div className="extractor-page">
        <PageHeading title="Histórico" icon="history" description="Saúde fiscal e conferência das extrações." />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );
  }

  const purchase = health?.purchases || {};
  const sales = health?.sales || {};
  const cert = health?.certificate || {};
  const recovery = health?.recovery || {};
  const overallState: 'ok' | 'attention' | 'error' =
    health?.state === 'error' ? 'error' : health?.state === 'attention' ? 'attention' : 'ok';
  const overallLabel =
    overallState === 'error' ? 'Precisa de intervenção' : overallState === 'attention' ? 'Acompanhando' : 'Tudo certo';
  const purchaseExpected = purchase.expected == null ? null : Number(purchase.expected);
  const purchaseStored = Number(purchase.stored ?? company.entries ?? 0);
  const salesExpected = sales.expected == null ? null : Number(sales.expected);
  const salesStored = Number(sales.stored ?? company.exits ?? 0);
  const purchaseXmlReady = Number(purchase.xml_ready ?? 0);
  const salesXmlReady = Number(sales.xml_ready ?? 0);
  const periodText = health?.period?.start && health?.period?.end
    ? `${formatDate(health.period.start)} a ${formatDate(health.period.end)}`
    : 'Mês atual';

  return (
    <div className="extractor-page">
      <PageHeading
        title="Saúde fiscal"
        icon="history"
        description="Conferência automática de uma empresa por vez, sem alterar a empresa ativa do restante do Extrator."
      />

      <div className="extractor-health-selector">
        <label>
          <AnimatedExtractorIcon name="search" />
          <input
            value={healthSearch}
            onChange={event => setHealthSearch(event.target.value)}
            placeholder="Buscar empresa ou CNPJ"
          />
        </label>
        <select value={company.id} onChange={event => setHealthCompanyId(event.target.value)}>
          {companies
            .filter((item: Company) => {
              const q = healthSearch.trim().toLowerCase();
              if (!q || item.id === company.id) return true;
              return `${item.tradeName} ${item.name} ${item.cnpj}`.toLowerCase().includes(q);
            })
            .map((item: Company) => (
              <option key={item.id} value={item.id}>
                {item.tradeName} · {formatCnpj(item.cnpj)}
              </option>
            ))}
        </select>
        <span className={`extractor-health-auto-state ${busy ? 'busy' : ''}`}>
          {busy ? 'Conferindo automaticamente...' : 'Conferência automática ao abrir ou trocar a empresa'}
        </span>
      </div>

      <section className="extractor-health-hero">
        <div>
          <p>Empresa conferida</p>
          <h2>{company.tradeName}</h2>
          <span>{formatCnpj(company.cnpj)} · {periodText}</span>
        </div>
        <HealthState label={overallLabel} state={overallState} />
      </section>

      <section className="extractor-health-v2-kpis">
        <article>
          <span>Compras encontradas</span>
          <strong>{purchaseExpected == null ? '—' : integer.format(purchaseExpected)}</strong>
          <small>{purchase.source_checked ? 'Conferido na fonte fiscal' : 'Fonte externa não comparada nesta UF'}</small>
        </article>
        <article>
          <span>Compras no site</span>
          <strong>{integer.format(purchaseStored)}</strong>
          <small>{integer.format(purchaseXmlReady)} com XML integral</small>
        </article>
        <article>
          <span>Vendas encontradas</span>
          <strong>{salesExpected == null ? '—' : integer.format(salesExpected)}</strong>
          <small>{sales.sequence_total ? `Sequência: ${sales.sequence_resolved || 0}/${sales.sequence_total}` : 'Base fiscal reconciliada'}</small>
        </article>
        <article>
          <span>Vendas no site</span>
          <strong>{integer.format(salesStored)}</strong>
          <small>{integer.format(salesXmlReady)} com XML integral</small>
        </article>
      </section>

      <section className="extractor-health-compare">
        <article>
          <header>
            <h3>Compras</h3>
            <span>{syncLabel(purchase.status || company.purchaseStatus)}</span>
          </header>
          <div className="extractor-health-compare-grid">
            <div><small>Fonte fiscal</small><strong>{purchaseExpected == null ? '—' : integer.format(purchaseExpected)}</strong></div>
            <div><small>Salvas</small><strong>{integer.format(purchaseStored)}</strong></div>
            <div><small>XML</small><strong>{integer.format(purchaseXmlReady)}/{integer.format(purchaseStored)}</strong></div>
            <div><small>XML pendente</small><strong>{integer.format(Number(purchase.xml_pending || 0))}</strong></div>
            <div><small>Manifestação</small><strong>{integer.format(Number(purchase.manifestation_required || 0))}</strong></div>
            <div><small>Falhas seguidas</small><strong>{integer.format(Number(purchase.failures || 0))}</strong></div>
          </div>
          {purchase.source_error && <p className="extractor-helper">A fonte externa respondeu com indisponibilidade temporária: {purchase.source_error}</p>}
        </article>

        <article>
          <header>
            <h3>Vendas</h3>
            <span>{syncLabel(sales.status || company.salesStatus)}</span>
          </header>
          <div className="extractor-health-compare-grid">
            <div><small>Esperadas</small><strong>{salesExpected == null ? '—' : integer.format(salesExpected)}</strong></div>
            <div><small>Salvas</small><strong>{integer.format(salesStored)}</strong></div>
            <div><small>XML</small><strong>{integer.format(salesXmlReady)}/{integer.format(salesStored)}</strong></div>
            <div><small>XML pendente</small><strong>{integer.format(Number(sales.xml_pending || 0))}</strong></div>
            <div><small>Sequência resolvida</small><strong>{integer.format(Number(sales.sequence_resolved || 0))}/{integer.format(Number(sales.sequence_total || 0))}</strong></div>
            <div><small>Falhas seguidas</small><strong>{integer.format(Number(sales.failures || 0))}</strong></div>
          </div>
        </article>
      </section>

      <article className="extractor-health-timeline extractor-health-activity">
        <div className="extractor-health-title">
          <div><h2>Últimas verificações</h2><p>Somente informações úteis para acompanhar a captura fiscal.</p></div>
          <span>Conferido: {health?.checked_at ? formatDate(health.checked_at, true) : '—'}</span>
        </div>
        <div>
          <div className="extractor-health-activity-row">
            <span>Compras</span>
            <strong>{syncLabel(purchase.status || company.purchaseStatus)}</strong>
            <span>{purchase.last_error || 'Nenhuma falha persistente'}</span>
            <small>{purchase.last_completed_at ? formatDate(purchase.last_completed_at, true) : 'Sem conclusão registrada'}</small>
          </div>
          <div className="extractor-health-activity-row">
            <span>Vendas</span>
            <strong>{syncLabel(sales.status || company.salesStatus)}</strong>
            <span>{sales.last_error || 'Nenhuma falha persistente'}</span>
            <small>{sales.last_completed_at ? formatDate(sales.last_completed_at, true) : 'Sem conclusão registrada'}</small>
          </div>
          <div className="extractor-health-activity-row">
            <span>Certificado A1</span>
            <strong>{cert.expired ? 'Vencido' : cert.valid_until ? 'Válido' : 'Não configurado'}</strong>
            <span>{cert.name || 'Certificado ativo da empresa'}</span>
            <small>{cert.valid_until ? `Validade ${formatDate(cert.valid_until)}` : '—'}</small>
          </div>
          <div className="extractor-health-activity-row">
            <span>Recuperações automáticas</span>
            <strong>{integer.format(Number(recovery.count || 0))}</strong>
            <span>{recovery.last_reason || 'Nenhuma correção recente necessária'}</span>
            <small>{recovery.last_checked_at ? formatDate(recovery.last_checked_at, true) : '—'}</small>
          </div>
        </div>
      </article>
    </div>
  );
}

const billingStatusLabel = (status?: string | null) => {
  const value = String(status || '').toLowerCase();
  if (['active', 'authorized', 'paid', 'approved'].includes(value)) return 'Ativo';
  if (['trialing'].includes(value)) return 'Período gratuito';
  if (['past_due', 'pending', 'in_process', 'incomplete'].includes(value)) return 'Pagamento pendente';
  if (['paused'].includes(value)) return 'Pausado';
  if (['canceled', 'cancelled', 'rejected'].includes(value)) return 'Encerrado';
  return status || 'Sem recorrência';
};
const invoiceTone = (status?: string | null) => {
  const value = String(status || '').toLowerCase();
  if (['paid', 'approved'].includes(value)) return 'paid';
  if (['failed', 'rejected', 'cancelled', 'canceled'].includes(value)) return 'failed';
  return 'pending';
};
const invoiceStatusLabel = (status?: string | null) => {
  const value = String(status || '').toLowerCase();
  if (['paid', 'approved'].includes(value)) return 'Pago';
  if (['failed', 'rejected', 'cancelled', 'canceled'].includes(value)) return 'Falhou';
  if (['open', 'pending', 'in_process'].includes(value)) return 'Pendente';
  return status || 'Pendente';
};
const centsMoney = (cents?: number | null) =>
  currency.format(Math.max(0, Number(cents || 0)) / 100);

function BillingSection({ usage, planLabel, preview, setNotice }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!preview);

  const loadBilling = useCallback(async () => {
    if (preview) {
      setData({
        account: { name: 'Conta demonstração', companies: 1, lifetime_access: false },
        subscription: {
          status: 'active',
          provider: 'mercado_pago',
          billing_mode: 'recurring',
          current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
          plan: { code: 'extractor_commercial', name: 'Extrator Padrão', price_cents: 9700, limits: { monthly_xml: 5000, companies: 5 } },
        },
        billing_cycle: {
          paid: true,
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'pix',
          amount_cents: 9700,
          next_charge_at: new Date(Date.now() + 20 * 86400000).toISOString(),
          renewal_mode: 'automatic',
        },
        plans: [
          { code: 'extractor_commercial', name: 'Extrator Padrão', price_cents: 9700, limits: { monthly_xml: 5000, companies: 5 }, features: {} },
          { code: 'extractor_pro', name: 'Extrator Pro', price_cents: 15000, limits: { monthly_xml: 15000, companies: 10 }, features: {} },
          { code: 'extractor_enterprise', name: 'Extrator Enterprise', price_cents: 39700, limits: { monthly_xml: 10000, monthly_xml_per_company: 10000, companies: 100 }, features: { enterprise: true, hide_company_limit: true } },
        ],
        invoices: [],
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('extractor-billing-portal', { body: {} });
      if (error) throw error;
      if (response?.error) throw new Error(String(response.error));
      setData(response);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar as faturas agora.' });
    } finally {
      setLoading(false);
    }
  }, [preview]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const subscription = data?.subscription || null;
  const account = data?.account || null;
  const billingCycle = data?.billing_cycle || {};
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const plans = Array.isArray(data?.plans) ? data.plans : [];
  const plan = subscription?.plan || plans.find((item: any) => item.code === account?.plan_code) || null;
  const currentPlanCode = String(plan?.code || account?.plan_code || '');
  const statusText = account?.lifetime_access
    ? 'Acesso vitalício'
    : billingStatusLabel(subscription?.status || subscription?.provider_status);
  const cyclePaid = account?.lifetime_access || billingCycle?.paid === true || billingCycle?.status === 'paid';
  const nextCharge = billingCycle?.next_charge_at || subscription?.current_period_end || subscription?.access_expires_at || account?.access_expires_at;
  const checkoutUrl = String(subscription?.checkout_url || '');
  const paymentMethod = billingCycle?.payment_method
    ? String(billingCycle.payment_method).replace(/_/g, ' ')
    : '—';
  const renewalAutomatic = billingCycle?.renewal_mode === 'automatic' || subscription?.billing_mode === 'recurring';
  const monthlyLimit = Number(plan?.limits?.monthly_xml || usage.limit || 0);
  const monthlyPerCompany = Number(plan?.limits?.monthly_xml_per_company || 0);
  const enterpriseCapacity = monthlyPerCompany > 0;
  const usageLimitLabel = integer.format(Number(usage.limit || monthlyLimit || 0));
  const planCapacityLabel = enterpriseCapacity
    ? `${integer.format(monthlyPerCompany)} XML por empresa/mês`
    : `${integer.format(monthlyLimit)} XML/mês`;

  const requestUpgrade = (targetPlan: any) => {
    const message = encodeURIComponent(
      `Olá, quero alterar meu plano do Extrator Fiscal WS de ${plan?.name || planLabel} para ${targetPlan.name}.`
    );
    window.open(`https://wa.me/5582999324884?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="extractor-page">
      <PageHeading
        title="Faturas"
        icon="report"
        description="Mensalidade, plano, consumo e documentos de pagamento do Extrator Fiscal."
      />

      {loading && !data ? <div className="extractor-report-loading">Carregando faturamento...</div> : (
        <>
          <section className="extractor-billing-status-hero">
            <div className="extractor-billing-status-main">
              <small>Mensalidade do ciclo</small>
              <strong className={cyclePaid ? 'paid' : 'pending'}>
                {account?.lifetime_access ? 'Acesso vitalício' : cyclePaid ? 'Mensalidade paga' : 'Pagamento pendente'}
              </strong>
              <span>
                {cyclePaid && billingCycle?.paid_at
                  ? `Pago em ${formatDate(billingCycle.paid_at, true)}`
                  : checkoutUrl
                    ? 'Existe uma cobrança aguardando conclusão.'
                    : statusText}
              </span>
            </div>
            <div>
              <small>Plano atual</small>
              <strong>{plan?.name || planLabel}</strong>
              <span>{planCapacityLabel}</span>
            </div>
            <div>
              <small>{renewalAutomatic ? 'Próxima cobrança' : 'Próxima renovação'}</small>
              <strong>{account?.lifetime_access ? 'Sem cobrança' : nextCharge ? formatDate(nextCharge) : '—'}</strong>
              <span>{renewalAutomatic ? 'Cobrança mensal automática' : 'Ciclo mensal com renovação manual'}</span>
            </div>
            <div>
              <small>Valor do plano</small>
              <strong>{plan?.price_cents ? centsMoney(plan.price_cents) : '—'}</strong>
              <span>{paymentMethod !== '—' ? `Último pagamento: ${paymentMethod}` : 'Forma de pagamento não informada'}</span>
            </div>
          </section>

          {!cyclePaid && checkoutUrl && (
            <section className="extractor-payment-callout pending">
              <div>
                <small>Cobrança em aberto</small>
                <strong>{centsMoney(Number(billingCycle?.amount_cents || plan?.price_cents || 0))}</strong>
                <span>{nextCharge ? `Referência do ciclo até ${formatDate(nextCharge)}` : 'Pagamento necessário para manter o acesso.'}</span>
              </div>
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">Continuar pagamento</a>
            </section>
          )}

          <section className="extractor-billing-grid">
            <article className="extractor-billing-card">
              <header>
                <div>
                  <h2>Uso do plano</h2>
                  <p>{enterpriseCapacity ? 'Consumo separado por empresa no ciclo atual' : 'Consumo de XML no período atual'}</p>
                </div>
                <strong className="amount">{enterpriseCapacity ? 'Por empresa' : `${usage.percent}%`}</strong>
              </header>
              {enterpriseCapacity && usage.mode === 'per_company' && usage.companies?.length ? (
                <div className="extractor-billing-company-usage">
                  {usage.companies.map((companyUsage: UsageCompany) => (
                    <div className="extractor-billing-company-usage-row" key={companyUsage.company_id}>
                      <div>
                        <strong>{companyUsage.name}</strong>
                        <span>{integer.format(companyUsage.used)} de {integer.format(companyUsage.limit)} XML</span>
                      </div>
                      <b>{companyUsage.percent}%</b>
                      <div className="extractor-billing-progress">
                        <i style={{ width: `${Math.min(100, Math.max(0, companyUsage.percent))}%` }} />
                      </div>
                      <small>{integer.format(companyUsage.remaining)} restantes</small>
                    </div>
                  ))}
                  <div className="extractor-billing-company-cycle">
                    Ciclo: {formatDate(usage.period_start)} a {formatDate(usage.period_end)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="extractor-billing-progress"><i style={{ width: `${Math.min(100, Math.max(0, usage.percent))}%` }} /></div>
                  <div className="extractor-billing-facts">
                    <div><span>Processados</span><b>{integer.format(usage.used)}</b></div>
                    <div><span>Limite do ciclo</span><b>{usageLimitLabel}</b></div>
                    <div><span>Restantes</span><b>{integer.format(usage.remaining)}</b></div>
                    <div><span>Ciclo</span><b>{formatDate(usage.period_start)} a {formatDate(usage.period_end)}</b></div>
                  </div>
                </>
              )}
            </article>

            <article className="extractor-billing-card">
              <header>
                <div><h2>Assinatura</h2><p>Situação real registrada no Mercado Pago</p></div>
                <span className={`extractor-invoice-status ${cyclePaid ? 'paid' : 'pending'}`}>
                  {cyclePaid ? 'Pago' : invoiceStatusLabel(billingCycle?.status)}
                </span>
              </header>
              <div className="extractor-billing-facts">
                <div><span>Situação</span><b>{statusText}</b></div>
                <div><span>Periodicidade</span><b>Mensal</b></div>
                <div><span>Renovação</span><b>{renewalAutomatic ? 'Automática' : 'Manual'}</b></div>
                <div><span>Provedor</span><b>{subscription?.provider === 'mercado_pago' ? 'Mercado Pago' : subscription?.provider || '—'}</b></div>
                <div><span>Último pagamento</span><b>{billingCycle?.paid_at ? formatDate(billingCycle.paid_at, true) : '—'}</b></div>
                <div><span>Método</span><b>{paymentMethod}</b></div>
              </div>
            </article>
          </section>

          <section className="extractor-plan-options">
            <div className="extractor-section-copy">
              <div><small>Planos do Extrator</small><h2>Escolha conforme o volume do escritório</h2></div>
              <span>Os limites abaixo vêm da configuração real dos planos.</span>
            </div>
            <div className="extractor-plan-options-grid">
              {plans.map((item: any) => {
                const itemLimit = Number(item?.limits?.monthly_xml || 0);
                const itemPerCompany = Number(item?.limits?.monthly_xml_per_company || 0);
                const current = item.code === currentPlanCode;
                const order: Record<string, number> = {
                  extractor_commercial: 1,
                  extractor_pro: 2,
                  extractor_enterprise: 3,
                };
                const canUpgrade = (order[item.code] || 0) > (order[currentPlanCode] || 0);
                const capacity = itemPerCompany > 0
                  ? `${integer.format(itemPerCompany)} XML por empresa/mês`
                  : `${integer.format(itemLimit)} XML por mês`;
                const companyCopy = item.code === 'extractor_enterprise'
                  ? 'Estrutura Enterprise'
                  : `Até ${integer.format(Number(item?.limits?.companies || 0))} empresas`;
                return (
                  <article key={item.code} className={`extractor-plan-option ${current ? 'current' : ''}`}>
                    <div>
                      <small>{current ? 'Plano atual' : item.code === 'extractor_enterprise' ? 'Enterprise' : 'Plano disponível'}</small>
                      <h3>{item.name}</h3>
                      <strong>{centsMoney(item.price_cents)}<span>/mês</span></strong>
                      <p>{capacity} · {companyCopy}</p>
                    </div>
                    {current ? (
                      <span className="extractor-plan-current">Seu plano</span>
                    ) : canUpgrade ? (
                      <button onClick={() => requestUpgrade(item)}>Solicitar upgrade</button>
                    ) : (
                      <span className="extractor-plan-muted">Plano inferior ao atual</span>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="extractor-invoice-list">
            <div className="extractor-section-copy invoice-copy">
              <div><small>Histórico financeiro</small><h2>Faturas e comprovantes</h2></div>
              <span>Documentos oficiais aparecem aqui quando estiverem disponíveis no pagamento ou forem anexados pela WS.</span>
            </div>
            <div className="extractor-invoice-head">
              <span>Fatura</span><span>Descrição</span><span>Vencimento</span><span>Valor</span><span>Pagamento</span><span>Documentos</span>
            </div>
            {invoices.length ? invoices.map((invoice: any) => {
              const tone = invoiceTone(invoice.status || invoice.provider_status);
              const paymentUrl = String(invoice.checkout_url || '');
              const receiptUrl = String(invoice.receipt_url || invoice.provider_receipt_url || '');
              const fiscalNoteUrl = String(invoice.fiscal_note_url || '');
              return (
                <div className="extractor-invoice-row" key={invoice.id}>
                  <strong>#{invoice.invoice_number || String(invoice.id).slice(0, 8)}</strong>
                  <span>
                    {invoice.description || 'Extrator Fiscal WS'}
                    {invoice.paid_at && <small>Pago em {formatDate(invoice.paid_at, true)}</small>}
                  </span>
                  <span>{invoice.due_date ? formatDate(invoice.due_date) : '—'}<br /><small className={`extractor-invoice-status ${tone}`}>{invoiceStatusLabel(invoice.status || invoice.provider_status)}</small></span>
                  <strong>{centsMoney(invoice.total_cents)}</strong>
                  <span>{invoice.payment_method ? String(invoice.payment_method).replace(/_/g, ' ') : invoice.provider === 'mercado_pago' ? 'Mercado Pago' : '—'}</span>
                  <span className="extractor-invoice-docs">
                    {tone !== 'paid' && paymentUrl && <a href={paymentUrl} target="_blank" rel="noopener noreferrer">Pagar agora</a>}
                    {receiptUrl && <a href={receiptUrl} target="_blank" rel="noopener noreferrer">Comprovante</a>}
                    {fiscalNoteUrl && <a href={fiscalNoteUrl} target="_blank" rel="noopener noreferrer">Nota fiscal</a>}
                    {tone === 'paid' && !receiptUrl && !fiscalNoteUrl && <small>Pagamento confirmado</small>}
                    {tone !== 'paid' && !paymentUrl && <small>Sem ação pendente</small>}
                  </span>
                </div>
              );
            }) : <Empty>Nenhuma fatura registrada para esta conta.</Empty>}
          </section>
        </>
      )}
    </div>
  );
}

function SettingsSection({ account, user, preview, setNotice }: any) {
  const [portal, setPortal] = useState<any>(null);
  const [loading, setLoading] = useState(!preview);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    full_name: '',
    phone: '',
    account_name: '',
    fiscal_alerts: true,
    billing_updates: true,
  });

  const loadProfile = useCallback(async () => {
    if (preview) {
      setPortal({
        profile: {
          full_name: 'Usuário demonstração',
          email: 'demo@wsgestao.com.br',
          phone: '',
          notifications: { fiscal_alerts: true, billing_updates: true },
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
        },
        organization: { name: 'Conta demonstração', status: 'active', member_role: 'owner', member_since: new Date().toISOString() },
        account: { name: account?.name || 'Conta Extrator', status: 'active', access_source: 'subscription', lifetime_access: false, created_at: new Date().toISOString() },
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-billing-portal', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setPortal(data);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar o perfil.' });
    } finally {
      setLoading(false);
    }
  }, [preview, account?.id]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!portal) return;
    setForm({
      full_name: portal.profile?.full_name || '',
      phone: portal.profile?.phone || '',
      account_name: portal.account?.name || portal.organization?.name || '',
      fiscal_alerts: portal.profile?.notifications?.fiscal_alerts !== false,
      billing_updates: portal.profile?.notifications?.billing_updates !== false,
    });
  }, [portal]);

  const profile = portal?.profile || {};
  const organization = portal?.organization || {};
  const portalAccount = portal?.account || account || {};
  const displayName = profile.full_name || String(profile.email || user?.email || 'Usuário').split('@')[0] || 'Usuário';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join('') || 'WS';

  const saveProfile = async () => {
    if (preview || saving) return;
    const name = String(form.full_name || '').trim();
    const phone = String(form.phone || '').trim();
    const accountName = String(form.account_name || '').trim();
    if (name && name.length < 2) return setNotice({ tone: 'error', text: 'Informe um nome com pelo menos 2 caracteres.' });
    if (accountName && accountName.length < 2) return setNotice({ tone: 'error', text: 'Informe um nome válido para a conta.' });
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name || null,
          contact_phone: phone || null,
          notification_preferences: {
            fiscal_alerts: Boolean(form.fiscal_alerts),
            billing_updates: Boolean(form.billing_updates),
          },
        },
      });
      if (error) throw error;
      if (accountName && accountName !== portalAccount.name) {
        await extractorRequest({ action: 'save_account', name: accountName });
      }
      await loadProfile();
      setNotice({ tone: 'success', text: 'Perfil e preferências atualizados.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar o perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    const email = String(profile.email || user?.email || '');
    if (!email || preview || resetting) return;
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      setNotice({ tone: 'success', text: 'Link de redefinição enviado para o e-mail da conta.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Não foi possível enviar o link agora.' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="extractor-page">
      <PageHeading
        title="Configurações"
        icon="settings"
        description="Perfil, preferências, conta e segurança do Extrator."
      />

      {loading && !portal ? <div className="extractor-report-loading">Carregando conta...</div> : (
        <div className="extractor-settings-v2 extractor-settings-editable">
          <article className="extractor-profile-card">
            <div className="extractor-profile-head">
              <span className="extractor-profile-avatar">{initials}</span>
              <div><h2>{displayName}</h2><p>{profile.email || user?.email || '—'}</p></div>
            </div>
            <div className="extractor-settings-form">
              <label>
                Nome
                <input value={form.full_name || ''} onChange={e => setForm((v: any) => ({ ...v, full_name: e.target.value }))} placeholder="Seu nome" />
              </label>
              <label>
                Telefone de contato
                <input value={form.phone || ''} onChange={e => setForm((v: any) => ({ ...v, phone: e.target.value }))} placeholder="(82) 99999-9999" />
              </label>
              <label>
                Nome da conta
                <input value={form.account_name || ''} onChange={e => setForm((v: any) => ({ ...v, account_name: e.target.value }))} placeholder="Nome do escritório ou empresa" />
              </label>
              <label className="readonly">
                E-mail
                <input value={profile.email || user?.email || ''} readOnly />
                <small>O e-mail de acesso não é alterado por esta tela.</small>
              </label>
            </div>
            <button className="extractor-primary extractor-save-profile" onClick={() => void saveProfile()} disabled={preview || saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </article>

          <article className="extractor-settings-card">
            <h3>Preferências e segurança</h3>
            <div className="extractor-settings-toggles">
              <label>
                <span><b>Importações fiscais</b><small>Mostrar um aviso quando a sincronização encontrar novas compras ou vendas.</small></span>
                <input type="checkbox" checked={Boolean(form.fiscal_alerts)} onChange={e => setForm((v: any) => ({ ...v, fiscal_alerts: e.target.checked }))} />
              </label>
              <label>
                <span><b>Atualizações de cobrança</b><small>Avisar sobre pagamento confirmado, renovação e vencimento da mensalidade.</small></span>
                <input type="checkbox" checked={Boolean(form.billing_updates)} onChange={e => setForm((v: any) => ({ ...v, billing_updates: e.target.checked }))} />
              </label>
            </div>
            <dl>
              <div><dt>Organização</dt><dd>{organization.name || portalAccount.name || 'Conta Extrator'}</dd></div>
              <div><dt>Perfil de acesso</dt><dd>{String(organization.member_role || 'membro').replace(/_/g, ' ')}</dd></div>
              <div><dt>Situação da conta</dt><dd>{portalAccount.status || organization.status || 'Ativa'}</dd></div>
              <div><dt>Origem do acesso</dt><dd>{portalAccount.lifetime_access ? 'Acesso vitalício' : String(portalAccount.access_source || 'assinatura').replace(/_/g, ' ')}</dd></div>
              <div><dt>Membro desde</dt><dd>{organization.member_since ? formatDate(organization.member_since, true) : '—'}</dd></div>
              <div><dt>Último acesso</dt><dd>{profile.last_sign_in_at ? formatDate(profile.last_sign_in_at, true) : '—'}</dd></div>
            </dl>
            <div className="extractor-settings-security">
              <button onClick={() => void sendReset()} disabled={preview || resetting}>{resetting ? 'Enviando...' : 'Enviar link para redefinir senha'}</button>
              <button onClick={() => void supabase.auth.signOut()}>Sair da conta</button>
            </div>
          </article>
        </div>
      )}
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
        className="extractor-dark-dialog max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl"
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
