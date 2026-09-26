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
import { AlertTriangle, ArrowLeft, CalendarDays, Camera, CheckCircle2, FileText, Info, KeyRound, Loader2, Menu, Upload, X } from 'lucide-react';
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
import AppLoadingScreen from '@/components/AppLoadingScreen';
import {
  accessKeyFromText,
  salesReferenceFromFile,
  type SalesReferenceMethod,
} from '@/lib/extractor/salesReference';
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
  purchaseLastStartedAt: string | null;
  purchaseLastCompletedAt: string | null;
  purchaseLastError: string | null;
  salesLastStartedAt: string | null;
  salesLastCompletedAt: string | null;
  salesLastError: string | null;
  initialSyncQueuedAt: string | null;
  initialSyncPeriodFrom: string | null;
  initialSyncPeriodTo: string | null;
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
type CompanyOverview = {
  company_id?: string;
  allowed_from?: string;
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
type CoverageRow = {
  document_type: string;
  direction: 'entrada' | 'saida' | 'eventos';
  applicability: 'required' | 'observed' | 'unknown' | 'not_applicable';
  coverage_status: 'covered' | 'partial' | 'blocked' | 'error' | 'unknown' | 'not_applicable';
  source_confirmed: boolean;
  source_name?: string | null;
  last_error?: string | null;
  last_verified_at?: string | null;
  details?: Record<string, unknown> | null;
};
type CoverageGate = {
  ready: boolean;
  status: 'checking' | 'needs_certificate' | 'discovering' | 'needs_reference' | 'syncing' | 'ready' | 'error';
  title: string;
  message: string;
  automatic_discovery: boolean;
  accepts_reference: boolean;
  last_checked_at?: string | null;
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
  if (x === 'waiting_state_credentials') return 'Preparando busca de vendas';
  if (x === 'waiting_sales_reference') return 'Preparando vendas';
  if (x === 'waiting_certificate') return 'Certificado pendente';
  if (['running', 'reconciling', 'bootstrap_window', 'retrying'].includes(x))
    return 'Sincronizando';
  if (['idle', 'completed', 'success'].includes(x)) return 'Ativa';
  if (!x) return 'Não iniciada';
  return x.replace(/_/g, ' ');
};
const syncIsActive = (company: Company) => {
  const states = [company.purchaseStatus, company.salesStatus].map(value => String(value || '').toLowerCase());
  return states.some(value => ['queued', 'running', 'reconciling', 'bootstrap_window', 'retrying'].includes(value));
};
const syncStartedAt = (company: Company) => {
  const values = [
    company.initialSyncQueuedAt,
    company.purchaseLastStartedAt,
    company.salesLastStartedAt,
  ]
    .filter(Boolean)
    .map(value => new Date(String(value)).getTime())
    .filter(value => Number.isFinite(value));
  return values.length ? new Date(Math.min(...values)).toISOString() : null;
};
const syncCompletedAt = (company: Company) => {
  const values = [
    company.lastSync,
    company.purchaseLastCompletedAt,
    company.salesLastCompletedAt,
  ]
    .filter(Boolean)
    .map(value => new Date(String(value)).getTime())
    .filter(value => Number.isFinite(value));
  return values.length ? new Date(Math.max(...values)).toISOString() : null;
};
const elapsedLabel = (value?: string | null) => {
  if (!value) return 'agora';
  const ms = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'há menos de 1 min';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `há ${hours}h${rest ? ` ${rest}min` : ''}`;
};
const syncPeriodLabel = (company: Company) => {
  if (!company.initialSyncPeriodFrom || !company.initialSyncPeriodTo) return 'janela fiscal em preparação';
  return `${formatDate(company.initialSyncPeriodFrom)} → ${formatDate(company.initialSyncPeriodTo)}`;
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
  purchaseLastStartedAt: r.purchase_last_started_at || null,
  purchaseLastCompletedAt: r.purchase_last_completed_at || null,
  purchaseLastError: r.purchase_last_error || null,
  salesLastStartedAt: r.sales_last_started_at || null,
  salesLastCompletedAt: r.sales_last_completed_at || null,
  salesLastError: r.sales_last_error || null,
  initialSyncQueuedAt: r.initial_sync_queued_at || null,
  initialSyncPeriodFrom: r.initial_sync_period_from || null,
  initialSyncPeriodTo: r.initial_sync_period_to || null,
});
const unwrapStoredFiscalXml = (raw: unknown) => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return undefined;
  if (/^<\?xml\b/i.test(value) || /^<(?:\w+:)?(?:nfeProc|NFe|procNFe|CompNfse|NFSe|DPS)\b/i.test(value)) {
    return value;
  }

  // Some SEFAZ endpoints return an HTML download page whose JavaScript contains
  // the actual authorized XML in: var stringJson = { "xml": "<nfeProc ...>" }.
  const objectMatch = value.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (objectMatch?.[1]) {
    try {
      const parsed = JSON.parse(objectMatch[1]);
      if (typeof parsed?.xml === 'string' && parsed.xml.trim().startsWith('<')) {
        return parsed.xml.trim();
      }
    } catch {
      // Fall through to the isolated JSON-string extraction below.
    }
  }

  const xmlStringMatch = value.match(/["']xml["']\s*:\s*("(?:\\.|[^"\\])*")/i);
  if (xmlStringMatch?.[1]) {
    try {
      const parsed = JSON.parse(xmlStringMatch[1]);
      if (typeof parsed === 'string' && parsed.trim().startsWith('<')) return parsed.trim();
    } catch {
      // Keep the original payload only as a last resort.
    }
  }

  return value.startsWith('<') && !/^<!doctype\s+html|^<html\b/i.test(value) ? value : undefined;
};

const rowToDoc = (r: any): Doc => {
  const xml = unwrapStoredFiscalXml(r.xml);
  return {
    id: r.id,
    companyId: String(r.company_id || ''),
    nsu: r.nsu || undefined,
    schema: r.schema_name || undefined,
    source: r.source || undefined,
    documentKind: r.document_kind || undefined,
    fullXml: Boolean(r.full_xml && xml),
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
    xml,
  };
};

const resolveExtractorPreview = async (document: Doc) => {
  const { data: stored, error: storedError } = await (supabase as any).rpc(
    'extractor_document_preview_data',
    {
      _company_id: document.companyId,
      _access_key: document.accessKey || null,
      _nsu: document.nsu || null,
    }
  );
  if (storedError) throw storedError;
  if (stored?.ready && stored.document) return stored;

  // Only ask the recovery pipeline when the DB genuinely has no complete payload.
  const { data: recovered, error: recoveryError } = await supabase.functions.invoke(
    'extractor-document-preview',
    {
      body: {
        company_id: document.companyId,
        access_key: document.accessKey,
        nsu: document.nsu,
      },
    }
  );
  if (recoveryError) throw recoveryError;
  return recovered || stored;
};
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
  const { user, isAdmin } = useAuth();
  const fromAdmin = isAdmin && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('source') === 'admin';
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
    [companyOverview, setCompanyOverview] = useState<CompanyOverview | null>(null),
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
    const refresh = () => void load(true);
    const t = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const channel = supabase
      .channel(`extractor-live-${user?.id || 'anonymous'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_certificates' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extractor_companies' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_purchase_sync_state' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_sales_sync_state' }, refresh)
      .subscribe();

    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [preview, denied, load, user?.id]);

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
              purchaseLastStartedAt: new Date().toISOString(),
              purchaseLastCompletedAt: new Date().toISOString(),
              purchaseLastError: null,
              salesLastStartedAt: new Date().toISOString(),
              salesLastCompletedAt: new Date().toISOString(),
              salesLastError: null,
              initialSyncQueuedAt: new Date().toISOString(),
              initialSyncPeriodFrom: iso(new Date(Date.now() - 30 * 86400000)),
              initialSyncPeriodTo: iso(new Date()),
            },
          ]
        : (snapshot?.companies || []).map(normalizeCompany),
    [preview, snapshot]
  );
  useEffect(() => {
    if (!selectedCompanyId && companies.length) setSelectedCompanyId(companies[0].id);
  }, [companies, selectedCompanyId]);
  const selectedCompany =
    companies.find(company => company.id === selectedCompanyId) ||
    companies[0] ||
    null;

  const loadCompanyOverview = useCallback(async () => {
    if (preview || !user || !selectedCompany?.id) return;
    setCompanyOverview(null);
    try {
      const { data, error } = await (supabase as any).rpc('extractor_company_overview', {
        _company_id: selectedCompany.id,
      });
      if (error) throw error;
      setCompanyOverview((data || null) as CompanyOverview | null);
    } catch {
      setCompanyOverview(null);
    }
  }, [preview, user?.id, selectedCompany?.id]);

  useEffect(() => {
    void loadCompanyOverview();
  }, [loadCompanyOverview]);

  useEffect(() => {
    if (preview || !selectedCompany?.id) return;
    const timer = window.setInterval(() => void loadCompanyOverview(), 30000);
    return () => window.clearInterval(timer);
  }, [preview, selectedCompany?.id, loadCompanyOverview]);
  const totals = preview
    ? { documents: 326, entries: 55, exits: 271, value: 675295.32, fullXml: 266, pendingXml: 60 }
    : {
        documents: Number(companyOverview?.totals?.documents ?? selectedCompany?.documents ?? 0),
        entries: Number(companyOverview?.totals?.entries ?? selectedCompany?.entries ?? 0),
        exits: Number(companyOverview?.totals?.exits ?? selectedCompany?.exits ?? 0),
        value: Number(companyOverview?.totals?.value || 0),
        fullXml: Number(companyOverview?.totals?.full_xml ?? selectedCompany?.fullXml ?? 0),
        pendingXml: Number(companyOverview?.totals?.pending_xml ?? selectedCompany?.pendingXml ?? 0),
      };
  const models = preview
    ? { nfe: 149, nfce: 169, nfse: 8, other: 0 }
    : {
        nfe: Number(companyOverview?.models?.nfe || 0),
        nfce: Number(companyOverview?.models?.nfce || 0),
        nfse: Number(companyOverview?.models?.nfse || 0),
        other: Number(companyOverview?.models?.other || 0),
      };
  const daily = preview
    ? Array.from({ length: 30 }, (_, i) => ({
        day: iso(new Date(Date.now() - (29 - i) * 86400000)),
        documents: [7, 9, 6, 12, 8, 4, 11, 13, 8, 10][i % 10],
      }))
    : (companyOverview?.daily || []).map(x => ({
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
      const modelHint = `${document.model || ''} ${document.documentKind || ''} ${document.schema || ''}`.toLowerCase();
      const isNfse =
        modelHint.includes('nfse') ||
        modelHint.includes('nfs-e') ||
        String(document.accessKey || '').replace(/\D/g, '').length > 44;
      const functionName = isNfse ? 'dfe-danfse-pdfmake-poc' : 'dfe-danfe-pdf';
      const { data, error } = await supabase.functions.invoke(functionName, {
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
      let message = caught instanceof Error ? caught.message : 'Não foi possível gerar o PDF.';
      const response = (caught as any)?.context;
      if (response && typeof response.json === 'function') {
        try {
          const payload = await response.clone().json();
          if (payload?.error) message = String(payload.error);
        } catch {
          // Mantém uma mensagem amigável mesmo quando o gateway não devolve JSON.
        }
      }
      if (/Edge Function returned a non-2xx status code|FunctionsHttpError|Failed to fetch/i.test(message)) {
        message = 'Não foi possível gerar o documento fiscal agora. Tente novamente em alguns instantes.';
      }
      setNotice({ tone: 'error', text: message });
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
        const data = await resolveExtractorPreview(current);
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
      const refresh = await resolveExtractorPreview(document);
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
          {fromAdmin && (
            <a href="/admin" title="Voltar ao painel do administrador" className="ml-1 hidden items-center gap-1.5 rounded-md border border-white/10 px-2 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white sm:inline-flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              Painel
            </a>
          )}
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
        {planUsage.mode === 'per_company' ? (
          <section className="extractor-usage extractor-usage-enterprise-simple">
            <small>Plano atual</small>
            <strong>Enterprise</strong>
            <span>{integer.format(planUsage.per_company_limit || 10000)} XML por empresa/mês</span>
            <button onClick={() => go('Faturas')}>Ver plano</button>
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
          <Overview company={selectedCompany} totals={totals} models={models} daily={daily} onGo={go} />
        )}
        {active === 'Empresas' && (
          <Companies
            companies={companies}
            onAdd={() => setCompanyModal(true)}
            onOpen={id => go('Documentos', id)}
            onReload={() => load(true)}
            setNotice={setNotice}
            preview={preview}
            adminAccess={isAdmin}
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
            selectedCompanyId={selectedCompanyId}
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
          const data = await resolveExtractorPreview(document as Doc);
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
        <span className="extractor-eyebrow">WS Extrator Fiscal</span>
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

function Overview({ company, totals, models, daily, onGo }: any) {
  if (!company) {
    return (
      <div className="extractor-page">
        <PageHeading
          title="Visão geral"
          icon="dashboard"
          description="Adicione uma empresa para começar a acompanhar a operação fiscal."
        />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );
  }

  const xmlRate = totals.documents ? Math.round((totals.fullXml / totals.documents) * 100) : 0;
  const modelData = [
    { name: 'NF-e', value: models.nfe, color: chart.gold },
    { name: 'NFC-e', value: models.nfce, color: chart.blue },
    { name: 'NFS-e', value: models.nfse, color: chart.cyan },
  ].filter(x => x.value > 0);
  const operationData = [
    { name: 'Compras', documents: totals.entries },
    { name: 'Vendas', documents: totals.exits },
    { name: 'XML integral', documents: totals.fullXml },
  ];
  const needsAttention =
    company.pendingXml > 0 ||
    (company.certificateDays != null && company.certificateDays <= 30) ||
    /retry|error|fail|waiting_certificate/i.test(`${company.purchaseStatus} ${company.salesStatus}`);

  return (
    <div className="extractor-page">
      <PageHeading
        title={`Visão geral · ${company.tradeName}`}
        icon="dashboard"
        description={`${company.name} · ${formatCnpj(company.cnpj)} · panorama somente desta empresa`}
      />
      <section className="extractor-kpis">
        <Metric label="Documentos" value={integer.format(totals.documents)} detail={`${integer.format(totals.fullXml)} com XML integral`} icon="document" watermark />
        <Metric label="Compras" value={integer.format(totals.entries)} detail="Entradas fiscais" icon="download" watermark />
        <Metric label="Vendas" value={integer.format(totals.exits)} detail="Saídas fiscais" icon="upload" watermark />
        <Metric label="Movimentação" value={currency.format(totals.value)} detail="Valor disponível no período" icon="report" watermark />
        <Metric label="Cobertura XML" value={`${xmlRate}%`} detail={`${integer.format(totals.pendingXml)} pendente(s)`} icon="certificate" watermark />
      </section>

      <section className="extractor-dashboard-grid">
        <article className="extractor-panel extractor-panel-wide">
          <PanelHead title="Movimento dos últimos 30 dias" sub={company.tradeName} icon="report" />
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
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chart.text }} minTickGap={28} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chart.text }} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="documents" name="Documentos" stroke={chart.gold} strokeWidth={2.3} fill="url(#exFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Documentos por modelo" sub={company.tradeName} icon="document" />
          <div className="extractor-donut">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={modelData.length ? modelData : [{ name: 'Sem dados', value: 1, color: chart.muted }]}
                  dataKey="value"
                  innerRadius="65%"
                  outerRadius="86%"
                  paddingAngle={4}
                  stroke="none"
                >
                  {(modelData.length ? modelData : [{ name: 'Sem dados', value: 1, color: chart.muted }]).map((x: any) => (
                    <Cell key={x.name} fill={x.color} />
                  ))}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div><strong>{integer.format(totals.documents)}</strong><span>documentos</span></div>
          </div>
          <div className="extractor-legend">
            {modelData.map((x: any) => <p key={x.name}><i style={{ background: x.color }} /><span>{x.name}</span><b>{x.value}</b></p>)}
          </div>
        </article>

        <article className="extractor-panel extractor-panel-wide">
          <PanelHead title="Operação da empresa" sub="Compras, vendas e XML disponível" icon="company" />
          <div className="extractor-chart-company">
            <ResponsiveContainer>
              <BarChart data={operationData} layout="vertical" margin={{ top: 0, right: 12, left: 6, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={chart.grid} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chart.text }} />
                <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chart.text }} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="documents" name="Documentos" fill={chart.blue} radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="extractor-panel">
          <PanelHead title="Pontos de atenção" sub={company.tradeName} icon="warning" />
          <div className="extractor-attention-list">
            {needsAttention ? (
              <button onClick={() => onGo('Empresas', company.id)}>
                <span>
                  <strong>{company.tradeName}</strong>
                  <small>
                    {company.certificateDays != null && company.certificateDays <= 30
                      ? `Certificado vence em ${company.certificateDays} dia(s)`
                      : company.pendingXml
                        ? `${company.pendingXml} XML pendente(s)`
                        : `Compras: ${syncLabel(company.purchaseStatus)} · Vendas: ${syncLabel(company.salesStatus)}`}
                  </small>
                </span>
                <b>Ver</b>
              </button>
            ) : (
              <Empty>Nenhuma pendência relevante para esta empresa.</Empty>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function Companies({ companies, onAdd, onOpen, onReload, setNotice, preview, adminAccess }: any) {
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState('');
  const [detailId, setDetailId] = useState('');
  const [detailRaw, setDetailRaw] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [removeTarget, setRemoveTarget] = useState<Company | null>(null);
  const [adminImportOpen, setAdminImportOpen] = useState(false);
  const [adminImportLoading, setAdminImportLoading] = useState(false);
  const [adminImportBusy, setAdminImportBusy] = useState('');
  const [adminImportError, setAdminImportError] = useState('');
  const [adminImportTerm, setAdminImportTerm] = useState('');
  const [adminOfficeCompanies, setAdminOfficeCompanies] = useState<any[]>([]);
  const [adminImportSelected, setAdminImportSelected] = useState<string[]>([]);

  const loadAdminOfficeCompanies = useCallback(async () => {
    if (!adminAccess || preview) return;
    setAdminImportLoading(true);
    setAdminImportError('');
    try {
      const data = await extractorRequest({ action: 'list_office_clients' });
      setAdminOfficeCompanies(Array.isArray(data?.companies) ? data.companies : []);
    } catch (error) {
      setAdminImportError(error instanceof Error ? error.message : 'Não foi possível carregar os clientes do painel.');
    } finally {
      setAdminImportLoading(false);
    }
  }, [adminAccess, preview]);

  const openAdminImport = async () => {
    setAdminImportOpen(true);
    setAdminImportTerm('');
    setAdminImportSelected([]);
    await loadAdminOfficeCompanies();
  };

  useEffect(() => {
    if (!adminImportOpen || preview || !adminAccess) return;
    const refresh = () => void loadAdminOfficeCompanies();
    const timer = window.setInterval(refresh, 5000);
    const channel = supabase
      .channel('extractor-admin-import-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_certificates' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_companies' }, refresh)
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [adminImportOpen, preview, adminAccess, loadAdminOfficeCompanies]);

  const importSelectedOfficeClients = async () => {
    if (adminImportBusy || !adminImportSelected.length) return;
    const selectedIds = [...adminImportSelected];
    setAdminImportBusy('bulk');
    setAdminImportError('');

    const verifyCommittedImports = async () => {
      try {
        const verify = await extractorRequest({ action: 'list_office_clients' });
        const rows = Array.isArray(verify?.companies) ? verify.companies : [];
        return selectedIds.filter(id =>
          rows.some((row: any) => String(row.office_company_id) === id && row.already_linked)
        );
      } catch {
        return [];
      }
    };

    try {
      const data = await extractorRequest({
        action: 'import_office_clients_bulk',
        office_company_ids: selectedIds,
      });
      const imported = Number(data?.imported || 0);
      const failed = Number(data?.failed || 0);
      const queuePending = Number(data?.queue_pending || 0);

      void Promise.resolve(onReload()).catch(() => null);
      void loadAdminOfficeCompanies();

      if (imported > 0) {
        setNotice({
          tone: failed || queuePending ? 'warning' : 'success',
          text: failed
            ? `${imported} empresa(s) importada(s). ${failed} não puderam ser importadas.`
            : queuePending
              ? `${imported} empresa(s) vinculada(s). ${queuePending} aguardam o próximo ciclo automático da fila fiscal.`
              : `${imported} empresa(s) importada(s). A busca fiscal inicial já começou automaticamente.`,
        });
      }

      if (failed > 0) {
        const messages = (data?.results || [])
          .filter((item: any) => !item?.ok)
          .map((item: any) => item?.error)
          .filter(Boolean);
        setAdminImportError(messages.slice(0, 3).join(' · ') || 'Algumas empresas não puderam ser importadas.');
        setAdminImportSelected(
          selectedIds.filter(id =>
            (data?.results || []).some((item: any) => String(item.office_company_id) === id && !item.ok)
          )
        );
      } else {
        setAdminImportSelected([]);
        setAdminImportOpen(false);
      }
    } catch (error) {
      const committed = await verifyCommittedImports();
      if (committed.length) {
        void Promise.resolve(onReload()).catch(() => null);
        setAdminImportSelected(selectedIds.filter(id => !committed.includes(id)));
        setNotice({
          tone: 'success',
          text: `${committed.length} empresa(s) foram importadas com sucesso. O retorno da tela falhou, mas o vínculo foi confirmado no servidor.`,
        });
        if (committed.length === selectedIds.length) setAdminImportOpen(false);
      } else {
        setAdminImportError(error instanceof Error ? error.message : 'Não foi possível importar as empresas selecionadas.');
      }
    } finally {
      setAdminImportBusy('');
    }
  };

  const filteredAdminOfficeCompanies = adminOfficeCompanies.filter((row: any) => {
    const value = adminImportTerm.trim().toLowerCase();
    if (!value) return true;
    return `${row.company_name || ''} ${row.trade_name || ''} ${row.cnpj || ''}`
      .toLowerCase()
      .includes(value);
  });
  const selectableAdminOfficeCompanies = filteredAdminOfficeCompanies.filter((row: any) => !row.already_linked);
  const allVisibleSelected =
    selectableAdminOfficeCompanies.length > 0 &&
    selectableAdminOfficeCompanies.every((row: any) => adminImportSelected.includes(String(row.office_company_id)));
  const toggleAdminImport = (id: string) => {
    setAdminImportSelected(current =>
      current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    );
  };
  const toggleAllAdminImports = () => {
    const visibleIds = selectableAdminOfficeCompanies.map((row: any) => String(row.office_company_id));
    setAdminImportSelected(current =>
      allVisibleSelected
        ? current.filter(id => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  };

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
    if (!detailId) return;
    void loadDetail(detailId);
    const timer = window.setInterval(() => void loadDetail(detailId), 10000);
    return () => window.clearInterval(timer);
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
              <span>
                {syncIsActive(selected)
                  ? `Busca iniciada ${elapsedLabel(syncStartedAt(selected))} · ${syncPeriodLabel(selected)}`
                  : syncCompletedAt(selected)
                    ? `Última consulta concluída ${formatDate(syncCompletedAt(selected), true)}`
                    : 'Primeira busca ainda não concluída'}
              </span>
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
        actions={
          <div className="extractor-company-heading-actions">
            {adminAccess && (
              <button className="extractor-secondary" onClick={() => void openAdminImport()}>
                Importar do painel
              </button>
            )}
            <button className="extractor-primary" onClick={onAdd}>
              <AnimatedExtractorIcon name="upload" />Adicionar com A1
            </button>
          </div>
        }
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
            <div>
              <strong>{c.name}</strong>
              <span>{c.tradeName}</span>
              <span>{formatCnpj(c.cnpj)} · {c.uf}</span>
            </div>
            <div><strong>{integer.format(c.documents)}</strong><span>{c.entries} compras · {c.exits} vendas</span></div>
            <div><strong>{integer.format(c.fullXml)}</strong><span>{c.pendingXml ? `${c.pendingXml} pendente(s)` : 'Completo no período'}</span></div>
            <div>
              <strong>{syncLabel(c.purchaseStatus)} / {syncLabel(c.salesStatus)}</strong>
              <span>{syncCompletedAt(c) ? `Última conclusão ${formatDate(syncCompletedAt(c), true)}` : 'Ainda não concluída'}</span>
            </div>
            <div><strong>{c.certificateUntil ? formatDate(c.certificateUntil) : 'Não configurado'}</strong><span>{c.certificateDays == null ? '—' : `${c.certificateDays} dia(s)`}</span></div>
            <div className="extractor-row-actions">
              {syncIsActive(c) && (
                <span className="extractor-sync-running" title={`Busca em andamento · ${syncPeriodLabel(c)}`}>
                  <Loader2 className="extractor-sync-spinner" />
                  <span>
                    <b>Buscando</b>
                    <small>{elapsedLabel(syncStartedAt(c))}</small>
                    <small>{syncPeriodLabel(c)}</small>
                  </span>
                </span>
              )}
              <button onClick={e => { e.stopPropagation(); setDetailId(c.id); }}>Abrir</button>
              <button className="danger" onClick={e => { e.stopPropagation(); setRemoveTarget(c); }}>Remover</button>
            </div>
          </div>
        ))}
        {!visible.length && <Empty>Nenhuma empresa encontrada.</Empty>}
      </div>

      {adminAccess && (
        <Dialog open={adminImportOpen} onOpenChange={setAdminImportOpen}>
          <DialogContent className="extractor-dark-dialog max-h-[86vh] overflow-y-auto sm:max-w-2xl">
            <DialogTitle>Importar empresa do painel</DialogTitle>
            <DialogDescription>
              Use um cliente que já existe no Painel do Administrador. Aqui aparecem somente empresas com certificado A1 ativo e dentro da validade.
            </DialogDescription>

            <div className="extractor-admin-import-search">
              <input
                value={adminImportTerm}
                onChange={event => setAdminImportTerm(event.target.value)}
                placeholder="Buscar por empresa ou CNPJ"
              />
            </div>

            {adminImportError && (
              <p className="extractor-admin-import-error">{adminImportError}</p>
            )}

            {adminImportLoading ? (
              <p className="extractor-helper">Carregando clientes do painel...</p>
            ) : (
              <div className="extractor-admin-import-list">
                {selectableAdminOfficeCompanies.length > 0 && (
                  <label className="extractor-admin-import-select-all">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllAdminImports}
                      disabled={Boolean(adminImportBusy)}
                    />
                    <span>Selecionar todas as empresas visíveis</span>
                  </label>
                )}
                {filteredAdminOfficeCompanies.map((row: any) => {
                  const id = String(row.office_company_id);
                  const checked = adminImportSelected.includes(id);
                  return (
                    <article
                      key={id}
                      className={`extractor-admin-import-row ${checked ? 'is-selected' : ''}`}
                      onClick={() => !row.already_linked && !adminImportBusy && toggleAdminImport(id)}
                    >
                      <label className="extractor-admin-import-check" onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={row.already_linked || Boolean(adminImportBusy)}
                          onChange={() => toggleAdminImport(id)}
                        />
                      </label>
                      <div>
                        <strong>{row.trade_name || row.company_name}</strong>
                        <span>{row.company_name}</span>
                        <small>
                          {formatCnpj(row.cnpj)}
                          {row.state ? ` · ${row.state}` : ''}
                          {row.certificate?.configured
                            ? ` · A1 até ${formatDate(row.certificate.valid_until)}`
                            : ''}
                        </small>
                      </div>
                      <span className="extractor-admin-import-status">
                        {row.already_linked ? 'Já vinculada' : checked ? 'Selecionada' : 'Disponível'}
                      </span>
                    </article>
                  );
                })}
                {!adminOfficeCompanies.length && (
                  <Empty>Nenhuma empresa com certificado A1 válido está disponível para importação.</Empty>
                )}
              </div>
            )}

            <div className="extractor-dialog-actions">
              <button className="extractor-secondary" onClick={() => setAdminImportOpen(false)} disabled={Boolean(adminImportBusy)}>
                Fechar
              </button>
              <button
                className="extractor-primary"
                disabled={!adminImportSelected.length || Boolean(adminImportBusy)}
                onClick={() => void importSelectedOfficeClients()}
              >
                {adminImportBusy ? 'Importando e iniciando busca...' : `Importar selecionadas (${adminImportSelected.length})`}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
  const [xmlRetrying, setXmlRetrying] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { sales: number; purchases: number }>>({});
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [coverageGate, setCoverageGate] = useState<CoverageGate | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [referenceBusy, setReferenceBusy] = useState(false);
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
      const ordered = [...map.values()].sort((left, right) => {
        const leftTime = left.issueDate ? Date.parse(left.issueDate) : 0;
        const rightTime = right.issueDate ? Date.parse(right.issueDate) : 0;
        if (leftTime !== rightTime) return rightTime - leftTime;

        const leftNumber = Number(left.number || 0);
        const rightNumber = Number(right.number || 0);
        return rightNumber - leftNumber;
      });
      setDocs(ordered);
    } catch {
      if (sequence === requestSequence.current)
        setNotice({ tone: 'error', text: 'Não foi possível carregar os documentos. Tente novamente.' });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [preview, company?.id, start, end]);

  const loadMonthlyStats = useCallback(async () => {
    if (preview || !company) return;
    setAvailableFrom('');
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: { action: 'monthly_stats', company_id: company.id, year },
      });
      if (!error && data?.months) {
        setMonthlyStats(data.months);
        setAvailableFrom(String(data?.available_from || ''));
      }
    } catch {
      // Os documentos continuam disponíveis mesmo se os contadores mensais não atualizarem.
    }
  }, [preview, company?.id, year]);

  const loadCoverage = useCallback(async () => {
    if (preview || !company) {
      setCoverage([]);
      setCoverageGate(preview ? {
        ready: true,
        status: 'ready',
        title: 'Ambiente de demonstração',
        message: '',
        automatic_discovery: false,
        accepts_reference: false,
      } : null);
      setCoverageLoading(false);
      return;
    }
    setCoverageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: { action: 'coverage_status', company_id: company.id },
      });
      if (error) throw error;
      setCoverage(Array.isArray(data?.coverage) ? data.coverage : []);
      setCoverageGate(data?.gate || null);
    } catch {
      setCoverageGate(current => current || {
        ready: false,
        status: 'checking',
        title: 'Verificando as fontes fiscais',
        message: 'Aguarde enquanto confirmamos se compras e vendas estão sendo capturadas corretamente.',
        automatic_discovery: true,
        accepts_reference: false,
      });
    } finally {
      setCoverageLoading(false);
    }
  }, [preview, company?.id]);

  useEffect(() => {
    void loadDocs();
    return () => { requestSequence.current++; };
  }, [loadDocs]);
  useEffect(() => { void loadMonthlyStats(); }, [loadMonthlyStats]);
  useEffect(() => {
    setCoverage([]);
    setCoverageGate(null);
    setCoverageLoading(true);
    void loadCoverage();
    if (preview || !company?.id) return;
    const timer = window.setInterval(() => void loadCoverage(), 60000);
    return () => window.clearInterval(timer);
  }, [preview, company?.id, loadCoverage]);
  useEffect(() => {
    if (!availableFrom) return;
    const minimumYear = Number(availableFrom.slice(0, 4));
    if (Number.isFinite(minimumYear) && year < minimumYear) setYear(minimumYear);
  }, [availableFrom, year]);
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
  const pendingSalesValues = sales.filter(d => d.value == null).length;
  const cancelledDocs = fiscal.filter(cancelled);
  const manifestationDocs = fiscal.filter(
    d => d.parseError === 'xml_requires_manifestation' || d.parseError === 'xml_retry:manifestation_sent'
  );
  const nfe = fiscal.filter(d => type(d) === 'NF-e').length;
  const nfce = fiscal.filter(d => type(d) === 'NFC-e').length;
  const nfse = fiscal.filter(d => type(d) === 'NFS-e').length;
  const coverageBlocker = coverage.find(row =>
    ['required', 'observed'].includes(row.applicability) &&
    ['nfe55', 'nfce65', 'nfse'].includes(row.document_type) &&
    (row.coverage_status !== 'covered' || row.source_confirmed !== true)
  );
  const documentsLocked = !preview && !coverageGate?.ready;

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
      const data = await resolveExtractorPreview({ ...document, companyId: company.id });
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

  const retrySalesXml = async () => {
    if (preview) return setNotice({ tone: 'warning', text: 'A nova busca fica disponível no ambiente autenticado.' });
    if (!company || xmlRetrying) return;
    setXmlRetrying(true);
    try {
      const { data, error } = await (supabase as any).rpc('extractor_queue_sync', { _company_id: company.id });
      if (error) throw error;
      if (data?.ok === false) throw new Error(String(data?.error || 'sync_not_queued'));
      setNotice({ tone: 'success', text: 'Nova busca iniciada. Os valores serão atualizados assim que a SEFAZ liberar os XMLs.' });
      window.setTimeout(() => {
        void loadDocs();
        void loadMonthlyStats();
        void loadCoverage();
      }, 10000);
    } catch {
      setNotice({ tone: 'error', text: 'Não foi possível iniciar uma nova busca agora. Tente novamente em alguns minutos.' });
    } finally {
      setXmlRetrying(false);
    }
  };

  const submitSalesReference = async (candidate: {
    accessKey: string;
    method: SalesReferenceMethod;
    xml?: string;
  }) => {
    if (!company || referenceBusy) return;
    setReferenceBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: {
          action: 'sales_reference',
          company_id: company.id,
          access_key: candidate.accessKey,
          method: candidate.method,
          xml: candidate.xml || null,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(String(data?.error || 'reference_not_accepted'));
      setNotice({
        tone: 'success',
        text: `Referência confirmada: modelo ${data.model}, série ${data.series}, nota ${data.note_number}. A busca completa já foi iniciada.`,
      });
      setCoverageGate(data.gate || {
        ready: false,
        status: 'syncing',
        title: 'Referência recebida',
        message: 'Estamos localizando as demais notas e validando o período completo.',
        automatic_discovery: true,
        accepts_reference: false,
      });
      window.setTimeout(() => {
        void loadCoverage();
        void loadDocs();
        void loadMonthlyStats();
      }, 4000);
    } catch (caught) {
      setNotice({
        tone: 'error',
        text: caught instanceof Error && caught.message && !/FunctionsHttpError|non-2xx/i.test(caught.message)
          ? caught.message
          : 'Não foi possível validar essa referência. Confira se a nota pertence à empresa selecionada.',
      });
    } finally {
      setReferenceBusy(false);
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
  const minimumHistoryYear = availableFrom ? Number(availableFrom.slice(0, 4)) : now.getFullYear();
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

      <div className={`extractor-documents-coverage-shell ${documentsLocked ? 'is-locked' : ''}`}>
      <div
        className="extractor-documents-coverage-content"
        aria-hidden={documentsLocked ? 'true' : undefined}
        inert={documentsLocked ? true : undefined}
      >
      <section className="extractor-period-v2">
        <div className="extractor-period-year">
          <small>Ano</small>
          <div>
            <button
              disabled={year <= minimumHistoryYear}
              onClick={() => setYear(value => value - 1)}
            >‹</button>
            <strong>{year}</strong>
            <button disabled={year >= now.getFullYear()} onClick={() => setYear(value => value + 1)}>›</button>
          </div>
        </div>
        <div className="extractor-period-months">
          {MONTHS.filter(item => item !== 'Ano').map(item => {
            const future = year === now.getFullYear() && MONTH_INDEX[item] > now.getMonth();
            const periodStart = iso(new Date(year, MONTH_INDEX[item], 1));
            const periodEnd = iso(new Date(year, MONTH_INDEX[item] + 1, 0));
            const unavailable = Boolean(availableFrom && periodEnd < availableFrom);
            const partial = Boolean(availableFrom && periodStart < availableFrom && periodEnd >= availableFrom);
            const stat = statsFor(item);
            return (
              <button
                key={item}
                disabled={future || unavailable}
                title={unavailable
                  ? `Histórico disponível a partir de ${formatDate(availableFrom)}`
                  : partial
                    ? `Período parcial: disponível desde ${formatDate(availableFrom)}`
                    : undefined}
                className={`extractor-period-month ${!customOpen && month === item ? 'active' : ''}`}
                onClick={() => { setMonth(item); setCustomOpen(false); setCustomStart(''); setCustomEnd(''); }}
              >
                <b>{item}</b>
                <span>
                  {unavailable
                    ? '—'
                    : <>{stat.sales}V · <em>{stat.purchases}C</em>{partial ? ' *' : ''}</>}
                </span>
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

      {availableFrom && (
        <div className="extractor-history-window-note">
          Histórico fiscal disponível neste Extrator desde <strong>{formatDate(availableFrom)}</strong>.
          {availableFrom.slice(8, 10) !== '01' ? ' O primeiro mês exibido é parcial.' : ''}
        </div>
      )}

      {customOpen && (
        <section className="extractor-custom-dates">
          <label>De <input type="date" value={customStart} min={availableFrom || undefined} max={customEnd || undefined} onChange={event => setCustomStart(event.target.value)} /></label>
          <label>Até <input type="date" value={customEnd} min={customStart || undefined} onChange={event => setCustomEnd(event.target.value)} /></label>
          <button onClick={() => { setCustomOpen(false); setCustomStart(''); setCustomEnd(''); }}>Voltar ao mês</button>
        </section>
      )}

      {pendingSalesValues > 0 && (
        <section className="extractor-sales-value-warning" role="status">
          <Info aria-hidden="true" />
          <div>
            <strong>Faturamento ainda pode mudar</strong>
            <span>
              {pendingSalesValues} {pendingSalesValues === 1 ? 'saída aguarda' : 'saídas aguardam'} o XML completo da SEFAZ e ainda {pendingSalesValues === 1 ? 'não possui' : 'não possuem'} valor.
            </span>
          </div>
          <button onClick={() => void retrySalesXml()} disabled={xmlRetrying}>
            {xmlRetrying ? <Loader2 className="animate-spin" /> : <AnimatedExtractorIcon name="refresh" />}
            {xmlRetrying ? 'Iniciando busca...' : 'Tentar buscar XMLs novamente'}
          </button>
        </section>
      )}

      <section className="extractor-doc-kpis">
        <Metric label="Total notas" value={String(fiscal.length)} detail="Documentos fiscais" icon="document" />
        <Metric label="Vendas" value={String(sales.length)} detail="Saídas" icon="upload" />
        <Metric label="Compras" value={String(purchases.length)} detail="Entradas" icon="download" />
        <Metric
          label="Faturamento conhecido"
          value={currency.format(sales.reduce((sum, document) => sum + Number(document.value || 0), 0))}
          detail={pendingSalesValues > 0
            ? `${pendingSalesValues} saída${pendingSalesValues === 1 ? '' : 's'} aguardando XML`
            : `Entradas: ${currency.format(purchases.reduce((sum, document) => sum + Number(document.value || 0), 0))}`}
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
                      <td className="extractor-doc-value">
                        {document.value == null
                          ? <span className="extractor-value-pending">Aguardando XML</span>
                          : <strong>{currency.format(Number(document.value))}</strong>}
                      </td>
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
      </div>
      {documentsLocked && (
        <FiscalCoverageGate
          company={company}
          gate={coverageGate}
          blocker={coverageBlocker}
          loading={coverageLoading}
          busy={referenceBusy || xmlRetrying}
          onRetry={() => void retrySalesXml()}
          onSubmit={candidate => void submitSalesReference(candidate)}
        />
      )}
      </div>

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

export function FiscalCoverageGate({
  company,
  gate,
  blocker,
  loading,
  busy,
  onRetry,
  onSubmit,
}: {
  company: Company;
  gate: CoverageGate | null;
  blocker?: CoverageRow;
  loading: boolean;
  busy: boolean;
  onRetry: () => void;
  onSubmit: (candidate: { accessKey: string; method: SalesReferenceMethod; xml?: string }) => void;
}) {
  const [manualKey, setManualKey] = useState('');
  const [localError, setLocalError] = useState('');
  const xmlInput = useRef<HTMLInputElement>(null);
  const danfeInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const submitKey = () => {
    const accessKey = accessKeyFromText(manualKey);
    if (!accessKey) {
      setLocalError('Cole a chave de acesso completa, com 44 dígitos.');
      return;
    }
    setLocalError('');
    onSubmit({ accessKey, method: 'key' });
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    setLocalError('');
    try {
      onSubmit(await salesReferenceFromFile(file));
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Não foi possível ler esse arquivo.');
    }
  };

  const current = gate || {
    ready: false,
    status: 'checking' as const,
    title: 'Verificando as fontes fiscais',
    message: 'Aguarde enquanto confirmamos se compras e vendas estão sendo capturadas corretamente.',
    automatic_discovery: true,
    accepts_reference: false,
  };
  const showReference = current.accepts_reference || current.status === 'needs_reference';

  return (
    <section className="extractor-coverage-gate" role="region" aria-live="polite" aria-label="Situação da cobertura fiscal">
      <span className={`extractor-coverage-gate-icon ${loading || current.automatic_discovery ? 'is-loading' : ''}`}>
        {loading || current.automatic_discovery ? <Loader2 /> : <AlertTriangle />}
      </span>
      <small>{current.status === 'needs_reference' ? 'Só falta uma referência' : 'Proteção de cobertura fiscal'}</small>
      <h2>{current.title}</h2>
      <p>{current.message}</p>

      {showReference ? (
        <div className="extractor-reference-box">
          <label>
            <span>Chave ou link do QR Code</span>
            <div>
              <KeyRound />
              <input
                value={manualKey}
                onChange={event => setManualKey(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') submitKey(); }}
                placeholder="Cole os 44 dígitos"
                inputMode="numeric"
                autoComplete="off"
              />
              <button type="button" onClick={submitKey} disabled={busy}>Usar nota</button>
            </div>
          </label>

          <div className="extractor-reference-methods">
            <button type="button" onClick={() => xmlInput.current?.click()} disabled={busy}>
              <FileText /><span><b>XML</b><small>Enviar arquivo</small></span>
            </button>
            <button type="button" onClick={() => danfeInput.current?.click()} disabled={busy}>
              <Upload /><span><b>DANFE</b><small>PDF ou imagem</small></span>
            </button>
            <button type="button" onClick={() => cameraInput.current?.click()} disabled={busy}>
              <Camera /><span><b>QR Code</b><small>Fotografar agora</small></span>
            </button>
          </div>
          <input ref={xmlInput} className="sr-only" type="file" accept=".xml,text/xml,application/xml" onChange={event => void readFile(event.target.files?.[0])} />
          <input ref={danfeInput} className="sr-only" type="file" accept=".pdf,application/pdf,image/*" onChange={event => void readFile(event.target.files?.[0])} />
          <input ref={cameraInput} className="sr-only" type="file" accept="image/*" capture="environment" onChange={event => void readFile(event.target.files?.[0])} />
          {localError && <p className="extractor-reference-error">{localError}</p>}
          <small className="extractor-reference-privacy">A referência serve apenas para identificar modelo, série e numeração. Depois disso, a busca continua sozinha.</small>
        </div>
      ) : (
        <button className="extractor-coverage-gate-primary" type="button" onClick={onRetry} disabled={busy || loading}>
          {busy || loading ? <Loader2 className="is-spinning" /> : <CheckCircle2 />}
          {current.status === 'needs_certificate' ? 'Verificar certificado novamente' : 'Tentar busca automática novamente'}
        </button>
      )}

      {busy && <span className="extractor-reference-progress"><Loader2 /> Validando a referência e iniciando a busca…</span>}
      {!busy && blocker?.last_verified_at && <span>Última verificação: {formatDate(blocker.last_verified_at, true)}</span>}
    </section>
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

function HistorySection({ companies, selectedCompanyId, preview, setNotice }: any) {
  const [scope, setScope] = useState<'last_30_days' | 'full'>('last_30_days');
  const [health, setHealth] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const company =
    companies.find((item: Company) => item.id === selectedCompanyId) || companies[0] || null;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(
      () => setCooldownSeconds(current => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [cooldownSeconds > 0]);

  const loadHealth = useCallback(async (
    record = false,
    origin: 'manual_check' | 'post_sync' | 'automatic' = 'automatic'
  ) => {
    if (!company) return null;
    if (preview) {
      const now = new Date();
      const start = scope === 'last_30_days'
        ? iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))
        : iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const mock = {
        state: 'healthy',
        checked_at: now.toISOString(),
        scope,
        period: { start, end: iso(now) },
        purchases: { expected: company.entries, stored: company.entries },
        sales: { expected: company.exits, stored: company.exits },
        history: [{
          id: 'preview',
          scope,
          period_start: start,
          period_end: iso(now),
          purchases_expected: company.entries,
          purchases_present: company.entries,
          sales_expected: company.exits,
          sales_present: company.exits,
          state: 'healthy',
          origin: 'automatic',
          checked_at: now.toISOString(),
        }],
      };
      setHealth(mock);
      return mock;
    }

    if (record) setChecking(true);
    else setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('extractor-fiscal-health', {
        body: {
          action: record ? 'check' : 'health',
          company_id: company.id,
          scope,
          origin,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setHealth(data);
      return data;
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error
          ? error.message
          : 'Não foi possível conferir os documentos desta empresa agora.',
      });
      return null;
    } finally {
      setBusy(false);
      setChecking(false);
    }
  }, [company?.id, preview, scope]);

  useEffect(() => {
    let alive = true;
    setHealth(null);
    void (async () => {
      const data = await loadHealth(false);
      if (!alive || !data) return;
      if (!Array.isArray(data.history) || data.history.length === 0) {
        await loadHealth(true, 'automatic');
      }
    })();
    return () => { alive = false; };
  }, [loadHealth]);

  const requestCheck = async () => {
    if (!company || checking) return;
    const result = await loadHealth(true, 'manual_check');
    if (result) {
      setNotice({
        tone: result.state === 'healthy' ? 'success' : 'warning',
        text: result.state === 'healthy'
          ? 'Conferência concluída. As quantidades esperadas e presentes estão alinhadas.'
          : 'Conferência registrada. Revise as diferenças indicadas na tabela.',
      });
    }
  };

  const requestRepair = async () => {
    if (!company || repairing || cooldownSeconds > 0) return;
    if (preview) {
      setNotice({ tone: 'warning', text: 'A busca manual fica disponível no ambiente autenticado.' });
      return;
    }
    setRepairing(true);
    try {
      const { data, error } = await (supabase as any).rpc('extractor_queue_sync', {
        _company_id: company.id,
      });
      if (error) throw error;
      if (!data?.ok) {
        const retry = Math.max(0, Number(data?.retry_after_seconds || 0));
        if (retry) setCooldownSeconds(retry);
        setNotice({
          tone: 'warning',
          text: data?.message || 'Aguarde um pouco antes de solicitar outra busca.',
        });
        return;
      }
      setCooldownSeconds(300);
      setNotice({
        tone: 'success',
        text: `${company.tradeName}: nova busca iniciada. A conferência será registrada quando a primeira atualização chegar.`,
      });
      window.setTimeout(() => void loadHealth(true, 'post_sync'), 10000);
    } catch {
      setNotice({
        tone: 'error',
        text: 'Não foi possível iniciar a busca agora. Tente novamente em alguns instantes.',
      });
    } finally {
      setRepairing(false);
    }
  };

  if (!company) {
    return (
      <div className="extractor-page">
        <PageHeading title="Histórico" icon="history" description="Conferência das buscas fiscais." />
        <Empty>Nenhuma empresa adicionada ao Extrator.</Empty>
      </div>
    );
  }

  const expected = (value: unknown) => value == null ? null : Number(value);
  const present = (value: unknown) => Number(value || 0);
  const purchaseExpected = expected(health?.purchases?.expected);
  const purchasePresent = present(health?.purchases?.stored ?? company.entries);
  const salesExpected = expected(health?.sales?.expected);
  const salesPresent = present(health?.sales?.stored ?? company.exits);

  const compare = (exp: number | null, got: number, sourceComplete = true) => {
    if (exp == null) return { state: 'attention' as const, label: 'Sem referência', delta: null as number | null };
    const delta = got - exp;
    if (delta === 0) return sourceComplete
      ? { state: 'ok' as const, label: 'Conferido', delta: 0 }
      : { state: 'attention' as const, label: 'Fonte em verificação', delta: 0 };
    return delta < 0
      ? { state: 'error' as const, label: `Faltam ${integer.format(Math.abs(delta))}`, delta }
      : { state: 'attention' as const, label: `${integer.format(delta)} a mais`, delta };
  };
  const purchaseCompare = compare(purchaseExpected, purchasePresent, health?.purchases?.source_checked === true);
  const salesCompare = compare(salesExpected, salesPresent, health?.sales?.source_complete === true);
  const missingDocuments =
    (purchaseCompare.delta != null && purchaseCompare.delta < 0) ||
    (salesCompare.delta != null && salesCompare.delta < 0);
  const cooldownText = cooldownSeconds > 0
    ? `${String(Math.floor(cooldownSeconds / 60)).padStart(2, '0')}:${String(cooldownSeconds % 60).padStart(2, '0')}`
    : '';
  const rows = Array.isArray(health?.history) ? health.history : [];
  const originLabel = (value: string) =>
    value === 'post_sync' ? 'Após busca' : value === 'automatic' ? 'Automática' : 'Manual';
  const rowState = (row: any) => {
    const pe = expected(row.purchases_expected);
    const pp = present(row.purchases_present);
    const se = expected(row.sales_expected);
    const sp = present(row.sales_present);
    if (pe == null || se == null) return { label: 'Parcial', state: 'attention' as const };
    if (pe === pp && se === sp) return { label: 'Conferido', state: 'ok' as const };
    return { label: 'Diferença', state: 'error' as const };
  };
  const periodText = health?.period?.start && health?.period?.end
    ? `${formatDate(health.period.start)} a ${formatDate(health.period.end)}`
    : scope === 'last_30_days' ? 'Últimos 30 dias' : 'Período completo';

  return (
    <div className="extractor-page extractor-history-table-page">
      <PageHeading
        title="Histórico"
        icon="history"
        description="Cada conferência fica registrada para você comparar o que a fonte fiscal esperava com o que chegou ao Extrator."
      />

      <div className="extractor-history-periodbar">
        <div>
          <CalendarDays />
          <span><small>Período analisado</small><strong>{periodText}</strong></span>
        </div>
        <div className="extractor-history-scope" role="group" aria-label="Período da conferência">
          <button
            type="button"
            className={scope === 'last_30_days' ? 'active' : ''}
            onClick={() => setScope('last_30_days')}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className={scope === 'full' ? 'active' : ''}
            onClick={() => setScope('full')}
          >
            Período completo
          </button>
        </div>
      </div>

      <div className="extractor-history-current">
        <div>
          <small>Empresa conferida</small>
          <strong>{company.tradeName}</strong>
          <span>{company.name} · {formatCnpj(company.cnpj)}</span>
        </div>
        <div className="extractor-history-current-status">
          <span>Entradas</span>
          <b>{purchaseExpected == null ? '—' : integer.format(purchaseExpected)} / {integer.format(purchasePresent)}</b>
          <small className="extractor-history-count-caption">Fonte fiscal / Extrator</small>
          <div className="extractor-history-breakdown">
            <i>NF-e {integer.format(Number(health?.purchases?.models?.nfe55 || 0))}</i>
            {Number(health?.purchases?.models?.other || 0) > 0 && <i>Outras {integer.format(Number(health.purchases.models.other))}</i>}
          </div>
          <HealthState label={purchaseCompare.label} state={purchaseCompare.state} />
        </div>
        <div className="extractor-history-current-status">
          <span>Saídas</span>
          <b>{salesExpected == null ? '—' : integer.format(salesExpected)} / {integer.format(salesPresent)}</b>
          <small className="extractor-history-count-caption">Fonte fiscal / Extrator</small>
          <div className="extractor-history-breakdown">
            <i>NF-e {integer.format(Number(health?.sales?.models?.nfe55 || 0))}</i>
            <i>NFC-e {integer.format(Number(health?.sales?.models?.nfce65 || 0))}</i>
            {Number(health?.sales?.models?.other || 0) > 0 && <i>Outras {integer.format(Number(health.sales.models.other))}</i>}
          </div>
          <HealthState label={salesCompare.label} state={salesCompare.state} />
        </div>
        <div className="extractor-history-actions">
          <button type="button" onClick={() => void requestCheck()} disabled={checking || busy}>
            {checking ? 'Conferindo...' : 'Conferir agora'}
          </button>
          {missingDocuments && (
            <button
              type="button"
              className="secondary"
              onClick={() => void requestRepair()}
              disabled={repairing || cooldownSeconds > 0}
            >
              {repairing
                ? 'Iniciando busca...'
                : cooldownSeconds > 0
                  ? `Nova busca em ${cooldownText}`
                  : 'Buscar documentos'}
            </button>
          )}
        </div>
      </div>

      <section className="extractor-history-ledger">
        <header>
          <div>
            <small>Registro de conferências</small>
            <h3>Últimas buscas</h3>
          </div>
          <span>{busy ? 'Atualizando...' : `${rows.length} registro${rows.length === 1 ? '' : 's'}`}</span>
        </header>
        <div className="extractor-history-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data / hora</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Entradas na fonte</th>
                <th>Entradas no Extrator</th>
                <th>Saídas na fonte</th>
                <th>Saídas no Extrator</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row: any) => {
                const state = rowState(row);
                return (
                  <tr key={row.id}>
                    <td>{formatDate(row.checked_at, true)}</td>
                    <td>{originLabel(String(row.origin || 'manual_check'))}</td>
                    <td>{formatDate(row.period_start)} a {formatDate(row.period_end)}</td>
                    <td>{row.purchases_expected == null ? '—' : integer.format(Number(row.purchases_expected))}</td>
                    <td>{integer.format(Number(row.purchases_present || 0))}</td>
                    <td>{row.sales_expected == null ? '—' : integer.format(Number(row.sales_expected))}</td>
                    <td>{integer.format(Number(row.sales_present || 0))}</td>
                    <td><HealthState label={state.label} state={state.state} /></td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="empty">Nenhuma conferência registrada neste período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="extractor-health-simple-note">
        “Esperado” e “presente” sempre usam o mesmo período e o mesmo tipo de documento. A conferência soma
        as NF-e/NFC-e verificáveis nas fontes fiscais e os demais modelos já confirmados no Extrator, evitando
        comparar, por exemplo, apenas NFC-e esperada contra todas as vendas armazenadas.
      </p>
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
  const [usageOpen, setUsageOpen] = useState(false);

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

  const order: Record<string, number> = {
    extractor_commercial: 1,
    extractor_pro: 2,
    extractor_enterprise: 3,
  };
  const upgradePlans = plans.filter(
    (item: any) => (order[String(item?.code || '')] || 0) > (order[currentPlanCode] || 0)
  );

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

          <section className="extractor-billing-grid extractor-billing-grid-compact">
            <button
              type="button"
              className="extractor-billing-usage-compact"
              onClick={() => setUsageOpen(true)}
            >
              <span>
                <small>Uso do plano</small>
                <strong>{enterpriseCapacity ? 'Consumo por empresa' : `${integer.format(usage.used)} de ${usageLimitLabel} XML`}</strong>
                <em>{enterpriseCapacity ? `${integer.format(monthlyPerCompany)} XML por empresa/mês` : `${usage.percent}% do ciclo utilizado`}</em>
              </span>
              <b>Ver detalhes</b>
            </button>

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

          {upgradePlans.length > 0 && (
            <section className="extractor-upgrade-section">
              <div className="extractor-section-copy">
                <div><small>Upgrade</small><h2>Mais capacidade para o escritório</h2></div>
                <span>Seu plano atual continua ativo até você solicitar uma alteração.</span>
              </div>
              <div className={`extractor-upgrade-grid count-${upgradePlans.length}`}>
                {upgradePlans.map((item: any) => {
                  const itemLimit = Number(item?.limits?.monthly_xml || 0);
                  const itemPerCompany = Number(item?.limits?.monthly_xml_per_company || 0);
                  const capacity = itemPerCompany > 0
                    ? `${integer.format(itemPerCompany)} XML por empresa/mês`
                    : `${integer.format(itemLimit)} XML por mês`;
                  const companyCopy = item.code === 'extractor_enterprise'
                    ? 'Estrutura Enterprise'
                    : `Até ${integer.format(Number(item?.limits?.companies || 0))} empresas`;
                  return (
                    <article key={item.code} className="extractor-upgrade-card">
                      <small>{item.code === 'extractor_enterprise' ? 'Maior capacidade' : 'Próximo nível'}</small>
                      <h3>{item.name}</h3>
                      <strong>{centsMoney(item.price_cents)}<span>/mês</span></strong>
                      <ul>
                        <li>{capacity}</li>
                        <li>{companyCopy}</li>
                        <li>Compras e vendas</li>
                        <li>XML e documentos fiscais</li>
                      </ul>
                      <button onClick={() => requestUpgrade(item)}>Fazer upgrade</button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="extractor-invoice-list">
            <div className="extractor-section-copy invoice-copy">
              <div><small>Histórico financeiro</small><h2>Faturas e comprovantes</h2></div>
              <span>
                Comprovantes oficiais aparecem aqui somente quando o provedor de pagamento ou a WS disponibiliza um documento oficial.
              </span>
            </div>
            <div className="extractor-invoice-head">
              <span>Fatura</span><span>Descrição</span><span>Vencimento</span><span>Valor</span><span>Pagamento</span><span>Documentos</span>
            </div>
            {invoices.length ? invoices.map((invoice: any) => {
              const tone = invoiceTone(invoice.status || invoice.provider_status);
              const paymentUrl = String(invoice.checkout_url || '');
              const officialReceiptUrl = String(invoice.receipt_url || invoice.provider_receipt_url || '');
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
                    {officialReceiptUrl && <a href={officialReceiptUrl} target="_blank" rel="noopener noreferrer">Comprovante oficial</a>}
                    {fiscalNoteUrl && <a href={fiscalNoteUrl} target="_blank" rel="noopener noreferrer">Nota fiscal</a>}
                    {tone === 'paid' && !officialReceiptUrl && !fiscalNoteUrl && <small>Pagamento confirmado · comprovante oficial não fornecido pelo provedor</small>}
                    {tone !== 'paid' && !paymentUrl && !officialReceiptUrl && <small>Sem ação pendente</small>}
                  </span>
                </div>
              );
            }) : <Empty>Nenhuma fatura registrada para esta conta.</Empty>}
          </section>
        </>
      )}

      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="extractor-dark-dialog extractor-plan-usage-modal">
          <DialogTitle>Uso do plano</DialogTitle>
          <DialogDescription>
            {enterpriseCapacity
              ? `${integer.format(monthlyPerCompany)} XML por empresa no ciclo atual.`
              : `Consumo compartilhado do ${plan?.name || planLabel}.`}
          </DialogDescription>

          {enterpriseCapacity && usage.mode === 'per_company' && usage.companies?.length ? (
            <div className="extractor-plan-usage-modal-list">
              {usage.companies.map((companyUsage: UsageCompany) => (
                <div className="extractor-plan-usage-modal-row" key={companyUsage.company_id}>
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
            </div>
          ) : (
            <div className="extractor-plan-usage-modal-summary">
              <div><span>Processados</span><b>{integer.format(usage.used)}</b></div>
              <div><span>Limite do ciclo</span><b>{usageLimitLabel}</b></div>
              <div><span>Restantes</span><b>{integer.format(usage.remaining)}</b></div>
              <div><span>Consumo</span><b>{usage.percent}%</b></div>
              <div className="extractor-billing-progress"><i style={{ width: `${Math.min(100, Math.max(0, usage.percent))}%` }} /></div>
            </div>
          )}
          <div className="extractor-plan-usage-modal-cycle">
            Ciclo: {formatDate(usage.period_start)} a {formatDate(usage.period_end)}
          </div>
        </DialogContent>
      </Dialog>
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
          O CNPJ é identificado pelo certificado. Compras e vendas começam a ser buscadas automaticamente, sem exigir cadastro ou senha do portal estadual.
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
  return <AppLoadingScreen mode="standard" />;
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
