import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FiscalDocumentPreview, type PreviewDocument } from '@/components/admin/fiscal/FiscalDocumentPreview';
import '@/styles/fiscal-extractor.css';

type ExtractorSection = 'Visão geral' | 'Empresas' | 'Documentos' | 'Relatórios' | 'Certificados' | 'Histórico' | 'Configurações';
type ModelFilter = 'Todos' | 'NF-e' | 'NFC-e' | 'NFS-e';

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
  purchaseLastCompleted: string | null;
  salesLastCompleted: string | null;
  salesXmlPending: number;
  salesXmlFailed: number;
};

type FiscalDocument = {
  id: string;
  companyId: string;
  company: string;
  legalName: string;
  nsu?: string;
  schema?: string;
  documentKind?: string;
  fullXml: boolean;
  accessKey?: string;
  number: string;
  series?: string;
  model: 'NF-e' | 'NFC-e' | 'NFS-e' | 'Documento';
  direction: 'Entrada' | 'Saída' | 'Relacionada';
  party: string;
  issueDate: string | null;
  value: number;
  statusCode?: string;
  statusText: string;
  parseError?: string;
};

type Snapshot = {
  account?: { id?: string; name?: string; plan_code?: string; monthly_xml_limit?: number; base_lookback_days?: number; allowed_from?: string };
  companies?: Array<Record<string, any>>;
  documents?: Array<Record<string, any>>;
  totals?: { documents?: number; entries?: number; exits?: number; value?: number; full_xml?: number; pending_xml?: number };
  models?: { nfe?: number; nfce?: number; nfse?: number; other?: number };
  daily?: Array<{ day?: string; documents?: number }>;
};

type Totals = { documents: number; entries: number; exits: number; value: number; fullXml: number; pendingXml: number };

type Notice = { tone: 'success' | 'warning' | 'error'; text: string } | null;

const navigation: Array<{ label: ExtractorSection; icon: any; group: string }> = [
  { label: 'Visão geral', icon: LayoutDashboard, group: 'Operação' },
  { label: 'Empresas', icon: Building2, group: 'Operação' },
  { label: 'Documentos', icon: FileText, group: 'Fiscal' },
  { label: 'Relatórios', icon: BarChart3, group: 'Fiscal' },
  { label: 'Certificados', icon: ShieldCheck, group: 'Gestão' },
  { label: 'Histórico', icon: History, group: 'Gestão' },
  { label: 'Configurações', icon: Settings, group: 'Gestão' },
];

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');
const onlyDigits = (value: unknown) => String(value || '').replace(/\D/g, '');
const formatCnpj = (value: unknown) => {
  const digits = onlyDigits(value);
  return digits.length === 14 ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : String(value || '—');
};
const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return withTime
    ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : date.toLocaleDateString('pt-BR');
};
const modelFromRow = (row: Record<string, any>): FiscalDocument['model'] => {
  const kind = String(row.document_kind || '').toLowerCase();
  const model = String(row.model || '');
  if (kind === 'nfse' || /nfse|nfs-e/i.test(model)) return 'NFS-e';
  if (model === '65') return 'NFC-e';
  if (model === '55') return 'NF-e';
  return 'Documento';
};
const statusLabel = (row: Record<string, any>) => {
  const raw = String(row.status_text || row.status_code || '').trim();
  if (/cancel/i.test(raw) || ['101', '151', '155'].includes(String(row.status_code || ''))) return 'Cancelada';
  if (/deneg/i.test(raw) || ['110', '301', '302'].includes(String(row.status_code || ''))) return 'Denegada';
  if (/autoriz|ativa/i.test(raw) || ['1', '100', '150'].includes(String(row.status_code || ''))) return 'Autorizada';
  return raw || 'Fiscal';
};
const statusTone = (status: string) => /cancel|deneg/i.test(status) ? 'danger' : /autoriz|ativa|válid/i.test(status) ? 'success' : 'neutral';
const syncLabel = (value?: string | null) => {
  const raw = String(value || '').toLowerCase();
  if (['running', 'queued', 'reconciling', 'bootstrap_window', 'retrying'].includes(raw)) return 'Sincronizando';
  if (['idle', 'completed', 'success'].includes(raw)) return 'Ativa';
  if (!raw) return 'Não iniciada';
  return raw.replaceAll('_', ' ');
};

const normalizeCompany = (row: Record<string, any>, index: number): Company => ({
  id: String(row.id || index),
  extractorCompanyId: String(row.extractor_company_id || ''),
  name: row.razao_social || 'Empresa sem razão social',
  tradeName: row.nome_fantasia || row.razao_social || 'Empresa',
  cnpj: row.cnpj || '',
  uf: row.uf || '—',
  documents: Number(row.documents || 0),
  entries: Number(row.entries || 0),
  exits: Number(row.exits || 0),
  fullXml: Number(row.full_xml || 0),
  pendingXml: Number(row.pending_xml || 0),
  lastSync: row.last_sync_at || null,
  automaticSync: row.automatic_sync !== false,
  certificateUntil: row.certificate_until || null,
  certificateDays: row.certificate_days == null ? null : Number(row.certificate_days),
  purchaseStatus: row.purchase_status || null,
  salesStatus: row.sales_status || null,
  purchaseLastCompleted: row.purchase_last_completed_at || null,
  salesLastCompleted: row.sales_last_completed_at || null,
  salesXmlPending: Number(row.sales_xml_pending || 0),
  salesXmlFailed: Number(row.sales_xml_failed || 0),
});

const normalizeDocument = (row: Record<string, any>, index: number): FiscalDocument => ({
  id: String(row.id || index),
  companyId: String(row.company_id || ''),
  company: row.company_name || row.company_legal_name || 'Empresa',
  legalName: row.company_legal_name || row.company_name || 'Empresa',
  nsu: row.nsu || undefined,
  schema: row.schema_name || undefined,
  documentKind: row.document_kind || undefined,
  fullXml: Boolean(row.full_xml),
  accessKey: row.access_key || undefined,
  number: row.note_number || '—',
  series: row.series || undefined,
  model: modelFromRow(row),
  direction: row.direction === 'saida' || row.direction === 'outbound' ? 'Saída' : row.direction === 'entrada' || row.direction === 'inbound' ? 'Entrada' : 'Relacionada',
  party: row.counterparty_name || row.issuer_name || row.recipient_cnpj || 'Não identificado',
  issueDate: row.issue_date || null,
  value: Number(row.value || 0),
  statusCode: row.status_code || undefined,
  statusText: statusLabel(row),
  parseError: row.parse_error || undefined,
});

const previewCompanies: Company[] = [
  { id: 'preview-1', extractorCompanyId: '', name: 'Empresa de demonstração', tradeName: 'Empresa demonstração', cnpj: '00000000000000', uf: 'AL', documents: 326, entries: 55, exits: 271, fullXml: 266, pendingXml: 60, lastSync: new Date().toISOString(), automaticSync: true, certificateUntil: '2027-08-25', certificateDays: 351, purchaseStatus: 'idle', salesStatus: 'idle', purchaseLastCompleted: new Date().toISOString(), salesLastCompleted: new Date().toISOString(), salesXmlPending: 60, salesXmlFailed: 0 },
];
const previewDocuments: FiscalDocument[] = [
  { id: 'preview-doc-1', companyId: 'preview-1', company: 'Empresa demonstração', legalName: 'Empresa de demonstração', number: '001234', model: 'NF-e', direction: 'Entrada', party: 'Fornecedor exemplo', issueDate: new Date().toISOString(), value: 1840.5, statusText: 'Autorizada', fullXml: true },
  { id: 'preview-doc-2', companyId: 'preview-1', company: 'Empresa demonstração', legalName: 'Empresa de demonstração', number: '004521', model: 'NFC-e', direction: 'Saída', party: 'Consumidor final', issueDate: new Date(Date.now() - 3600000).toISOString(), value: 96.7, statusText: 'Autorizada', fullXml: false },
];

export default function FiscalExtractorApp({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ExtractorSection>('Visão geral');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<'company' | 'history' | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<PreviewDocument | null>(null);

  const loadSnapshot = useCallback(async (quiet = false) => {
    if (preview || !user) return;
    if (!quiet) setLoading(true);
    const { data, error } = await (supabase as any).rpc('extractor_workspace_snapshot');
    if (error || !data) {
      setAccessDenied(true);
    } else {
      setSnapshot(data as Snapshot);
      setAccessDenied(false);
    }
    if (!quiet) setLoading(false);
  }, [preview, user?.id]);

  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);
  useEffect(() => {
    if (preview || accessDenied) return;
    const timer = window.setInterval(() => void loadSnapshot(true), 30000);
    const onFocus = () => void loadSnapshot(true);
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [preview, accessDenied, loadSnapshot]);

  const companies = useMemo(() => preview ? previewCompanies : (snapshot?.companies || []).map(normalizeCompany), [preview, snapshot]);
  const documents = useMemo(() => preview ? previewDocuments : (snapshot?.documents || []).map(normalizeDocument), [preview, snapshot]);
  const totals: Totals = useMemo(() => preview ? {
    documents: 326, entries: 55, exits: 271, value: 675295.32, fullXml: 266, pendingXml: 60,
  } : {
    documents: Number(snapshot?.totals?.documents || 0),
    entries: Number(snapshot?.totals?.entries || 0),
    exits: Number(snapshot?.totals?.exits || 0),
    value: Number(snapshot?.totals?.value || 0),
    fullXml: Number(snapshot?.totals?.full_xml || 0),
    pendingXml: Number(snapshot?.totals?.pending_xml || 0),
  }, [preview, snapshot]);
  const models = preview ? { nfe: 149, nfce: 169, nfse: 8, other: 0 } : {
    nfe: Number(snapshot?.models?.nfe || 0), nfce: Number(snapshot?.models?.nfce || 0), nfse: Number(snapshot?.models?.nfse || 0), other: Number(snapshot?.models?.other || 0),
  };
  const daily = preview
    ? Array.from({ length: 30 }, (_, index) => ({ day: new Date(Date.now() - (29 - index) * 86400000).toISOString().slice(0, 10), documents: [7, 9, 6, 12, 8, 4, 11, 13, 8, 10][index % 10] }))
    : (snapshot?.daily || []).map(item => ({ day: String(item.day || ''), documents: Number(item.documents || 0) }));

  const navigate = (section: ExtractorSection) => { setActive(section); setMobileOpen(false); setNotice(null); };
  const syncNow = async (companyId?: string) => {
    if (preview) return setNotice({ tone: 'warning', text: 'A sincronização fica disponível no ambiente autenticado.' });
    setBusy('sync'); setNotice(null);
    const { data, error } = await (supabase as any).rpc('extractor_queue_sync', { _company_id: companyId || null });
    if (error || !data?.ok) setNotice({ tone: 'error', text: error?.message || 'Não foi possível colocar a sincronização na fila.' });
    else {
      setNotice({ tone: 'success', text: `${data.queued} empresa(s) enviada(s) para sincronização.` });
      await loadSnapshot(true);
    }
    setBusy('');
  };

  if (loading) return <ExtractorLoading />;
  if (!preview && accessDenied) return <ExtractorAccessPending />;

  return <div className="extractor-app">
    <header className="extractor-topbar">
      <div className="extractor-brand">
        <button className="extractor-mobile-trigger" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu /></button>
        <img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal" />
      </div>
      <div className="extractor-workspace"><small>Carteira fiscal</small><strong>{preview ? 'Demonstração' : snapshot?.account?.name || 'WS Gestão Contábil'}</strong></div>
      <div className="extractor-account"><span>{preview ? 'PR' : (user?.email || 'WS').slice(0, 2).toUpperCase()}</span></div>
    </header>

    {mobileOpen && <button className="extractor-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`extractor-sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <button className="extractor-sidebar-close" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X /></button>
      <div className="extractor-sidebar-title"><strong>Extrato Fiscal</strong><small>Compras e vendas</small></div>
      <nav>{['Operação', 'Fiscal', 'Gestão'].map(group => <section key={group}><p>{group}</p>{navigation.filter(item => item.group === group).map(item => {
        const Icon = item.icon;
        return <button key={item.label} className={active === item.label ? 'is-active' : ''} onClick={() => navigate(item.label)}><span className="extractor-nav-icon"><Icon /></span><span>{item.label}</span></button>;
      })}</section>)}</nav>
      <div className="extractor-usage">
        <small>Documentos no período</small>
        <strong>{integer.format(totals.documents)}</strong>
        {!preview && snapshot?.account?.monthly_xml_limit ? <span>Limite do plano: {integer.format(snapshot.account.monthly_xml_limit)} XML</span> : <span>{preview ? 'Dados demonstrativos' : 'Janela fiscal ativa'}</span>}
      </div>
    </aside>

    <main className="extractor-main">
      {notice && <div className={`extractor-notice ${notice.tone}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}><X /></button></div>}
      {active === 'Visão geral' && <Overview companies={companies} documents={documents} totals={totals} models={models} daily={daily} busy={busy === 'sync'} onSync={() => void syncNow()} onNavigate={navigate} />}
      {active === 'Empresas' && <Companies companies={companies} onAdd={() => setModal('company')} busy={busy === 'sync'} onSync={id => void syncNow(id)} />}
      {active === 'Documentos' && <Documents documents={documents} companies={companies} preview={preview} setBusy={setBusy} busy={busy} setNotice={setNotice} onPreview={setSelectedPreview} />}
      {active === 'Relatórios' && <Reports companies={companies} documents={documents} totals={totals} models={models} />}
      {active === 'Certificados' && <Certificates companies={companies} onCompanies={() => navigate('Empresas')} />}
      {active === 'Histórico' && <HistorySection onOpen={() => setModal('history')} />}
      {active === 'Configurações' && <SettingsSection companies={companies} account={snapshot?.account} preview={preview} />}
    </main>

    {modal === 'company' && <AddCompanyModal preview={preview} onClose={() => setModal(null)} onLinked={async message => { setModal(null); setNotice({ tone: 'success', text: message }); await loadSnapshot(true); }} />}
    {modal === 'history' && <HistoryModal preview={preview} companies={companies} accountId={snapshot?.account?.id} userId={user?.id} onClose={() => setModal(null)} onSaved={message => { setModal(null); setNotice({ tone: 'success', text: message }); }} />}
    {selectedPreview && <FiscalDocumentPreview doc={selectedPreview} onClose={() => setSelectedPreview(null)} />}
  </div>;
}

function PageHeading({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <div className="extractor-page-heading"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="extractor-heading-actions">{actions}</div>}</div>;
}

function Overview({ companies, documents, totals, models, daily, busy, onSync, onNavigate }: { companies: Company[]; documents: FiscalDocument[]; totals: Totals; models: Record<string, number>; daily: Array<{ day: string; documents: number }>; busy: boolean; onSync: () => void; onNavigate: (s: ExtractorSection) => void }) {
  const attention = companies.filter(c => (c.certificateDays != null && c.certificateDays <= 30) || c.pendingXml > 0 || /retry|error|failed/i.test(`${c.purchaseStatus} ${c.salesStatus}`));
  return <div className="extractor-page">
    <PageHeading title="Visão geral" description="Resumo real da carteira no período disponível." actions={<button className="extractor-primary" disabled={busy} onClick={onSync}><RefreshCw className={busy ? 'is-spinning' : ''} />{busy ? 'Sincronizando' : 'Sincronizar agora'}</button>} />
    <section className="extractor-kpis">
      <Metric label="Documentos" value={integer.format(totals.documents)} detail={`${integer.format(totals.fullXml)} com XML integral`} />
      <Metric label="Entradas" value={integer.format(totals.entries)} detail={totals.documents ? `${Math.round(totals.entries / totals.documents * 100)}% do período` : 'Sem documentos'} />
      <Metric label="Saídas" value={integer.format(totals.exits)} detail={totals.documents ? `${Math.round(totals.exits / totals.documents * 100)}% do período` : 'Sem documentos'} />
      <Metric label="Movimentação" value={currency.format(totals.value)} detail={`${integer.format(totals.pendingXml)} XML pendente(s)`} />
    </section>

    <section className="extractor-overview-grid">
      <article className="extractor-panel extractor-chart-panel"><PanelHeader title="Capturas nos últimos 30 dias" subtitle="Quantidade de documentos por dia" /><DailyBars data={daily} /></article>
      <article className="extractor-panel"><PanelHeader title="Documentos por modelo" subtitle="Composição do período" /><ModelComposition models={models} total={totals.documents} /></article>
      <article className="extractor-panel extractor-attention"><PanelHeader title="Pontos de atenção" subtitle="Somente ocorrências encontradas na carteira" />{attention.length ? attention.slice(0, 4).map(company => <button key={company.id} onClick={() => onNavigate(company.certificateDays != null && company.certificateDays <= 30 ? 'Certificados' : 'Empresas')}><div><strong>{company.tradeName}</strong><span>{company.certificateDays != null && company.certificateDays <= 30 ? `Certificado vence em ${company.certificateDays} dia(s)` : company.pendingXml > 0 ? `${company.pendingXml} XML aguardando recuperação` : `Compras: ${syncLabel(company.purchaseStatus)} · Vendas: ${syncLabel(company.salesStatus)}`}</span></div><span>Ver</span></button>) : <EmptyInline text="Nenhuma pendência relevante no período." />}</article>
      <article className="extractor-panel extractor-recent"><PanelHeader title="Documentos recentes" subtitle="Últimos registros encontrados" action={<button onClick={() => onNavigate('Documentos')}>Ver todos</button>} /><DocumentTable documents={documents.slice(0, 6)} compact /></article>
    </section>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="extractor-metric"><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>; }
function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <header className="extractor-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function EmptyInline({ text }: { text: string }) { return <div className="extractor-empty-inline">{text}</div>; }

function DailyBars({ data }: { data: Array<{ day: string; documents: number }> }) {
  const max = Math.max(1, ...data.map(item => item.documents));
  const total = data.reduce((sum, item) => sum + item.documents, 0);
  return <div className="extractor-daily"><div className="extractor-daily-total"><strong>{integer.format(total)}</strong><span>documentos</span></div><div className="extractor-bars">{data.map((item, index) => <span key={`${item.day}-${index}`} title={`${formatDate(item.day)} · ${item.documents}`}><i style={{ height: `${Math.max(item.documents ? 8 : 2, item.documents / max * 100)}%` }} /></span>)}</div><div className="extractor-axis"><span>{data[0]?.day ? formatDate(data[0].day) : '—'}</span><span>{data.at(-1)?.day ? formatDate(data.at(-1)?.day) : '—'}</span></div></div>;
}

function ModelComposition({ models, total }: { models: Record<string, number>; total: number }) {
  const rows = [['NF-e', models.nfe || 0], ['NFC-e', models.nfce || 0], ['NFS-e', models.nfse || 0], ['Outros', models.other || 0]] as const;
  return <div className="extractor-model-list">{rows.filter(([, value]) => value > 0 || total === 0).map(([label, value]) => <div key={label}><div><span>{label}</span><strong>{integer.format(value)}</strong></div><div className="extractor-progress"><i style={{ width: total ? `${value / total * 100}%` : '0%' }} /></div><small>{total ? `${Math.round(value / total * 100)}%` : '0%'}</small></div>)}</div>;
}

function Companies({ companies, onAdd, busy, onSync }: { companies: Company[]; onAdd: () => void; busy: boolean; onSync: (id: string) => void }) {
  const [term, setTerm] = useState('');
  const visible = companies.filter(item => `${item.name} ${item.tradeName} ${item.cnpj}`.toLowerCase().includes(term.toLowerCase()));
  return <div className="extractor-page"><PageHeading title="Empresas" description="CNPJs vinculados ao Extrato e o estado real das rotinas fiscais." actions={<button className="extractor-primary" onClick={onAdd}>Adicionar empresa</button>} />
    <div className="extractor-toolbar"><label><Search /><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar por empresa ou CNPJ" /></label></div>
    <div className="extractor-company-list"><div className="extractor-company-head"><span>Empresa</span><span>Documentos</span><span>XML integral</span><span>Sincronização</span><span>Certificado</span><span /></div>{visible.map(company => <div className="extractor-company-row" key={company.id}>
      <div className="extractor-company-name"><strong>{company.tradeName}</strong><span>{formatCnpj(company.cnpj)} · {company.uf}</span></div>
      <div data-label="Documentos"><strong>{integer.format(company.documents)}</strong><span>{company.entries} entrada(s) · {company.exits} saída(s)</span></div>
      <div data-label="XML integral"><strong>{integer.format(company.fullXml)}</strong><span>{company.pendingXml ? `${company.pendingXml} pendente(s)` : 'Completo no período'}</span></div>
      <div data-label="Sincronização"><strong>{syncLabel(company.purchaseStatus)} / {syncLabel(company.salesStatus)}</strong><span>{company.lastSync ? `Última: ${formatDate(company.lastSync, true)}` : 'Sem sincronização registrada'}</span></div>
      <div data-label="Certificado"><strong>{company.certificateUntil ? formatDate(company.certificateUntil) : 'Não configurado'}</strong><span>{company.certificateDays == null ? '—' : `${company.certificateDays} dia(s)`}</span></div>
      <button className="extractor-text-action" disabled={busy} onClick={() => onSync(company.id)}>Sincronizar</button>
    </div>)}{!visible.length && <EmptyInline text="Nenhuma empresa encontrada." />}</div>
  </div>;
}

function Documents({ documents, companies, preview, setBusy, busy, setNotice, onPreview }: { documents: FiscalDocument[]; companies: Company[]; preview: boolean; setBusy: (v: string) => void; busy: string; setNotice: (n: Notice) => void; onPreview: (d: PreviewDocument) => void }) {
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('Todas');
  const [direction, setDirection] = useState('Todos');
  const [model, setModel] = useState<ModelFilter>('Todos');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const filtered = useMemo(() => documents.filter(doc => {
    const q = search.trim().toLowerCase();
    return (!q || `${doc.company} ${doc.legalName} ${doc.number} ${doc.party} ${doc.accessKey || ''}`.toLowerCase().includes(q))
      && (company === 'Todas' || doc.companyId === company)
      && (direction === 'Todos' || doc.direction === direction)
      && (model === 'Todos' || doc.model === model);
  }), [documents, search, company, direction, model]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);

  useEffect(() => setPage(1), [search, company, direction, model]);

  const openDocument = async (doc: FiscalDocument) => {
    if (preview) return setNotice({ tone: 'warning', text: 'A visualização fiscal usa XML real e fica disponível no ambiente autenticado.' });
    setBusy(`doc:${doc.id}`); setNotice(null);
    const { data, error } = await supabase.functions.invoke('fiscal-document-recover', { body: { company_id: doc.companyId, access_key: doc.accessKey, nsu: doc.nsu } });
    if (error) setNotice({ tone: 'error', text: error.message || 'Não foi possível abrir o documento.' });
    else if (!data?.ready || !data?.document) setNotice({ tone: 'warning', text: data?.reason || 'O XML integral deste documento ainda não está disponível.' });
    else {
      const row = data.document;
      onPreview({ companyId: row.company_id || doc.companyId, nsu: row.nsu, schema: row.schema_name, documentKind: row.document_kind, fullXml: row.full_xml, direction: row.direction, accessKey: row.access_key, issueDate: row.issue_date, value: Number(row.value || 0), issuerCnpj: row.issuer_cnpj, issuerName: row.issuer_name, recipientCnpj: row.recipient_cnpj, number: row.note_number, series: row.series, statusCode: row.status_code, statusText: row.status_text, model: row.model, xml: row.xml, parseError: row.parse_error });
    }
    setBusy('');
  };

  const downloadPackage = async () => {
    if (preview) return setNotice({ tone: 'warning', text: 'O download fiscal fica disponível no ambiente autenticado.' });
    const target = company !== 'Todas' ? companies.find(c => c.id === company) : companies.length === 1 ? companies[0] : null;
    if (!target) return setNotice({ tone: 'warning', text: 'Selecione uma empresa para gerar o pacote fiscal.' });
    setBusy('download'); setNotice(null);
    const end = new Date();
    const start = new Date(Date.now() - 29 * 86400000);
    const date = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const payload = { company_id: target.id, start: date(start), end: date(end), direction: direction === 'Entrada' ? 'entrada' : direction === 'Saída' ? 'saida' : 'todos' };
    const pre = await supabase.functions.invoke('fiscal-bulk-download', { body: { ...payload, action: 'preflight' } });
    if (pre.error) { setNotice({ tone: 'error', text: pre.error.message || 'Falha ao conferir os arquivos.' }); setBusy(''); return; }
    if (!pre.data?.ready) { setNotice({ tone: 'warning', text: `${pre.data?.pending || 0} documento(s) ainda aguardam XML integral. O pacote só é gerado quando estiver completo.` }); setBusy(''); return; }
    const result = await supabase.functions.invoke('fiscal-bulk-download', { body: payload });
    if (result.error) setNotice({ tone: 'error', text: result.error.message || 'Falha ao gerar o pacote fiscal.' });
    else {
      const blob = result.data instanceof Blob ? result.data : new Blob([result.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `extrato-fiscal-${target.tradeName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ tone: 'success', text: 'Pacote fiscal completo gerado.' });
    }
    setBusy('');
  };

  return <div className="extractor-page"><PageHeading title="Documentos" description="Notas reais encontradas na janela disponível. Clique em uma linha para abrir o documento fiscal." actions={<button className="extractor-primary" disabled={busy === 'download'} onClick={() => void downloadPackage()}><Download />{busy === 'download' ? 'Preparando' : 'Baixar pacote'}</button>} />
    <div className="extractor-filter-strip"><label className="extractor-search"><Search /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Número, chave, empresa ou participante" /></label><select value={company} onChange={e => setCompany(e.target.value)}><option value="Todas">Todas as empresas</option>{companies.map(c => <option value={c.id} key={c.id}>{c.tradeName}</option>)}</select><select value={direction} onChange={e => setDirection(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select></div>
    <div className="extractor-doc-tabs">{(['Todos', 'NF-e', 'NFC-e', 'NFS-e'] as ModelFilter[]).map(item => <button key={item} className={model === item ? 'is-active' : ''} onClick={() => setModel(item)}>{item}{item === 'Todos' && <span>{filtered.length}</span>}</button>)}</div>
    <div className="extractor-panel extractor-document-panel"><DocumentTable documents={rows} onOpen={doc => void openDocument(doc)} busy={busy} />{filtered.length > pageSize && <div className="extractor-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {Math.min(page, pages)} de {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</button></div>}</div>
  </div>;
}

function DocumentTable({ documents, compact = false, onOpen, busy = '' }: { documents: FiscalDocument[]; compact?: boolean; onOpen?: (doc: FiscalDocument) => void; busy?: string }) {
  return <div className={`extractor-table-wrap ${compact ? 'is-compact' : ''}`}><table className="extractor-doc-table"><thead><tr><th>Documento</th><th>Empresa</th><th>Participante</th><th>Emissão</th><th>Valor</th><th>Arquivo</th><th>Status</th></tr></thead><tbody>{documents.map(doc => <tr key={doc.id} className={onOpen ? 'is-clickable' : ''} onClick={() => onOpen?.(doc)}><td><strong>{doc.model} · {doc.number}</strong><small>{doc.direction}</small></td><td>{doc.company}</td><td>{doc.party}</td><td>{formatDate(doc.issueDate, true)}</td><td><strong>{currency.format(doc.value)}</strong></td><td><span className={`extractor-file-status ${doc.fullXml ? 'ready' : 'pending'}`}>{busy === `doc:${doc.id}` ? 'Carregando' : doc.fullXml ? 'XML integral' : 'Em recuperação'}</span></td><td><span className={`extractor-status ${statusTone(doc.statusText)}`}>{doc.statusText}</span></td></tr>)}</tbody></table>{!documents.length && <div className="extractor-empty"><strong>Nenhum documento encontrado</strong><span>A consulta não retornou registros para os filtros selecionados.</span></div>}</div>;
}

function Reports({ companies, documents, totals, models }: { companies: Company[]; documents: FiscalDocument[]; totals: Totals; models: Record<string, number> }) {
  const exportCsv = () => {
    const header = ['Empresa', 'CNPJ', 'Documentos', 'Entradas', 'Saídas', 'XML integral', 'XML pendente'];
    const rows = companies.map(c => [c.tradeName, formatCnpj(c.cnpj), c.documents, c.entries, c.exits, c.fullXml, c.pendingXml]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'relatorio-extrato-fiscal.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="extractor-page"><PageHeading title="Relatórios" description="Consolidado gerado somente a partir dos documentos disponíveis no Extrato." actions={<button className="extractor-primary" onClick={exportCsv}><Download />Exportar CSV</button>} />
    <section className="extractor-kpis"><Metric label="Empresas" value={integer.format(companies.length)} detail="CNPJs vinculados" /><Metric label="Documentos" value={integer.format(totals.documents)} detail={`${totals.entries} entradas · ${totals.exits} saídas`} /><Metric label="XML integral" value={integer.format(totals.fullXml)} detail={`${totals.pendingXml} pendente(s)`} /><Metric label="Movimentação" value={currency.format(totals.value)} detail="Soma dos valores disponíveis" /></section>
    <div className="extractor-report-layout"><article className="extractor-panel"><PanelHeader title="Por modelo" subtitle="Quantidade de documentos" /><ModelComposition models={models} total={totals.documents} /></article><article className="extractor-panel"><PanelHeader title="Por empresa" subtitle="Movimentação documental" /><div className="extractor-company-performance">{companies.map(c => <div key={c.id}><span><strong>{c.tradeName}</strong><small>{formatCnpj(c.cnpj)}</small></span><span>{integer.format(c.documents)} documentos</span><span>{c.pendingXml ? `${c.pendingXml} XML pendente(s)` : 'XML do período completo'}</span></div>)}{!companies.length && <EmptyInline text="Nenhuma empresa vinculada." />}</div></article></div>
    {documents.length === 200 && <p className="extractor-footnote">A lista detalhada exibe os 200 documentos mais recentes; os totais consolidados usam toda a janela disponível.</p>}
  </div>;
}

function Certificates({ companies, onCompanies }: { companies: Company[]; onCompanies: () => void }) {
  return <div className="extractor-page"><PageHeading title="Certificados digitais" description="Situação do A1 usado pelas rotinas fiscais. Arquivos e senhas permanecem protegidos e não são expostos no Extrato." actions={<button className="extractor-secondary" onClick={onCompanies}>Ver empresas</button>} />
    <div className="extractor-company-list"><div className="extractor-company-head certificate"><span>Empresa</span><span>Validade</span><span>Dias restantes</span><span>Situação</span></div>{companies.map(c => {
      const state = c.certificateDays == null ? 'Não configurado' : c.certificateDays < 0 ? 'Vencido' : c.certificateDays <= 30 ? 'Atenção' : 'Válido';
      return <div className="extractor-certificate-row" key={c.id}><div><strong>{c.tradeName}</strong><span>{formatCnpj(c.cnpj)}</span></div><span>{c.certificateUntil ? formatDate(c.certificateUntil) : '—'}</span><span>{c.certificateDays == null ? '—' : `${c.certificateDays} dia(s)`}</span><span className={`extractor-status ${state === 'Válido' ? 'success' : state === 'Atenção' ? 'warning' : 'danger'}`}>{state}</span></div>;
    })}{!companies.length && <EmptyInline text="Nenhuma empresa vinculada." />}</div>
  </div>;
}

function HistorySection({ onOpen }: { onOpen: () => void }) {
  return <div className="extractor-page"><PageHeading title="Histórico retroativo" description="Solicite a análise de um período anterior à janela liberada no seu plano." />
    <article className="extractor-history"><div><h2>Consulta de período anterior</h2><p>Informe as competências desejadas. A solicitação é registrada para análise sem iniciar automaticamente uma busca fiscal e sem gerar cobrança automática.</p><ul><li><Check />Período definido por você</li><li><Check />Sem estimativa fictícia de volume</li><li><Check />Busca só começa após o fluxo comercial correspondente</li></ul><button className="extractor-primary" onClick={onOpen}>Solicitar análise</button></div><div className="extractor-history-note"><strong>Janela padrão</strong><span>Os documentos liberados no plano continuam disponíveis normalmente no restante do painel.</span></div></article>
  </div>;
}

function SettingsSection({ companies, account, preview }: { companies: Company[]; account?: Snapshot['account']; preview: boolean }) {
  return <div className="extractor-page"><PageHeading title="Configurações" description="Parâmetros efetivamente aplicados à carteira." />
    <div className="extractor-settings-grid"><article className="extractor-panel"><PanelHeader title="Plano e janela fiscal" subtitle="Configuração atual" /><dl><div><dt>Plano</dt><dd>{preview ? 'Demonstração' : account?.plan_code || '—'}</dd></div><div><dt>Janela padrão</dt><dd>{preview ? '30 dias' : `${account?.base_lookback_days || 0} dias`}</dd></div><div><dt>Início liberado</dt><dd>{preview ? 'Demonstração' : account?.allowed_from ? formatDate(account.allowed_from) : '—'}</dd></div><div><dt>Limite mensal</dt><dd>{preview ? '—' : account?.monthly_xml_limit ? `${integer.format(account.monthly_xml_limit)} XML` : '—'}</dd></div></dl></article>
      <article className="extractor-panel"><PanelHeader title="Rotinas por empresa" subtitle="Leitura do estado fiscal existente" /><div className="extractor-settings-companies">{companies.map(c => <div key={c.id}><span><strong>{c.tradeName}</strong><small>{c.automaticSync ? 'Sincronização automática habilitada' : 'Sincronização automática desabilitada'}</small></span><span>Compras: {syncLabel(c.purchaseStatus)}<br />Vendas: {syncLabel(c.salesStatus)}</span></div>)}</div></article></div>
  </div>;
}

function AddCompanyModal({ preview, onClose, onLinked }: { preview: boolean; onClose: () => void; onLinked: (message: string) => void }) {
  const [cnpj, setCnpj] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (preview) return setError('O vínculo de empresa fica disponível no ambiente autenticado.');
    setBusy(true); setError('');
    const { data, error: rpcError } = await (supabase as any).rpc('extractor_link_company_by_cnpj', { _cnpj: cnpj });
    if (rpcError || !data?.ok) setError(rpcError?.message || data?.message || 'Não foi possível vincular esta empresa.');
    else onLinked(`${data.name || 'Empresa'} vinculada ao Extrato.`);
    setBusy(false);
  };
  return <Modal title="Adicionar empresa" description="Vincule um CNPJ que já possua configuração fiscal válida na WS." onClose={onClose}><div className="extractor-modal-body"><label>CNPJ<input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" autoFocus /></label><p className="extractor-helper">O Extrato não cria configuração fiscal fictícia. Se o CNPJ ainda não estiver preparado, o sistema informa isso antes de qualquer vínculo.</p>{error && <p className="extractor-form-error">{error}</p>}</div><footer><button className="extractor-secondary" onClick={onClose}>Cancelar</button><button className="extractor-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Vinculando' : 'Vincular empresa'}</button></footer></Modal>;
}

function HistoryModal({ preview, companies, accountId, userId, onClose, onSaved }: { preview: boolean; companies: Company[]; accountId?: string; userId?: string; onClose: () => void; onSaved: (message: string) => void }) {
  const now = new Date(); const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; const six = new Date(now.getFullYear(), now.getMonth() - 6, 1); const defaultStart = `${six.getFullYear()}-${String(six.getMonth() + 1).padStart(2, '0')}`;
  const [from, setFrom] = useState(defaultStart); const [to, setTo] = useState(defaultEnd); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (preview) return setError('A solicitação fica disponível no ambiente autenticado.');
    if (!from || !to || from > to) return setError('Informe um período válido.');
    if (!accountId || !userId) return setError('Não foi possível identificar a sua carteira fiscal.');
    setBusy(true); setError('');
    const start = `${from}-01`; const endDate = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)), 0); const end = `${to}-${String(endDate.getDate()).padStart(2, '0')}`;
    const { error: insertError } = await (supabase as any).from('extractor_history_requests').insert({ account_id: accountId, requested_by: userId, requested_from: start, requested_to: end, metadata: { companies: companies.map(c => c.id), source: 'extractor_ui' } });
    if (insertError) setError(insertError.message); else onSaved('Solicitação de histórico registrada para análise.');
    setBusy(false);
  };
  return <Modal title="Histórico retroativo" description="Registre o período que precisa consultar." onClose={onClose}><div className="extractor-modal-body"><div className="extractor-form-row"><label>De<input type="month" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Até<input type="month" value={to} onChange={e => setTo(e.target.value)} /></label></div><p className="extractor-helper">Carteira atual: {companies.length} empresa(s). Nenhuma busca ou cobrança é iniciada por este formulário.</p>{error && <p className="extractor-form-error">{error}</p>}</div><footer><button className="extractor-secondary" onClick={onClose}>Cancelar</button><button className="extractor-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Registrando' : 'Solicitar análise'}</button></footer></Modal>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="extractor-modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }}><div className="extractor-modal" role="dialog" aria-modal="true"><header><div><h2>{title}</h2><p>{description}</p></div><button onClick={onClose}><X /></button></header>{children}</div></div>;
}

function ExtractorLoading() { return <div className="extractor-loading"><img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal" /><span /><p>Carregando dados fiscais...</p></div>; }
function ExtractorAccessPending() { return <div className="extractor-access-pending"><img src="/assets/ws-extrator-fiscal.png" alt="WS Extrator Fiscal" /><div><h1>Extrato Fiscal não habilitado</h1><p>Esta conta ainda não possui uma carteira do Extrato vinculada.</p><a href="/extrator-preview">Abrir demonstração</a></div></div>; }
