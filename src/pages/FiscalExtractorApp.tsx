import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Upload,
  UsersRound,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/fiscal-extractor.css';

type ExtractorSection =
  | 'Visão geral'
  | 'Empresas'
  | 'Documentos'
  | 'Relatórios'
  | 'Certificados'
  | 'Histórico'
  | 'Configurações';

type Company = {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  uf: string;
  status: 'active' | 'attention';
  documents: number;
  lastSync: string;
  certificateUntil: string;
  certificateDays: number;
};

type FiscalDocument = {
  id: string;
  company: string;
  number: string;
  model: 'NF-e' | 'NFC-e' | 'NFS-e';
  direction: 'Entrada' | 'Saída';
  party: string;
  issueDate: string;
  value: number;
  status: 'Autorizada' | 'Cancelada';
};

type Snapshot = {
  account?: { name?: string; plan_code?: string; monthly_xml_limit?: number };
  companies?: Array<Record<string, any>>;
  documents?: Array<Record<string, any>>;
  totals?: { documents?: number; entries?: number; exits?: number; value?: number };
};

const demoCompanies: Company[] = [
  { id: '1', name: 'Sertão Verde Agrícola Ltda', tradeName: 'Sertão Verde', cnpj: '••.•••.•••/••••-••', uf: 'AL', status: 'active', documents: 486, lastSync: 'Hoje, 08:42', certificateUntil: '18 nov. 2026', certificateDays: 71 },
  { id: '2', name: 'Rota Norte Transportes Ltda', tradeName: 'Rota Norte', cnpj: '••.•••.•••/••••-••', uf: 'AL', status: 'active', documents: 352, lastSync: 'Hoje, 08:36', certificateUntil: '09 jan. 2027', certificateDays: 123 },
  { id: '3', name: 'Horizonte Serviços de Redes Ltda', tradeName: 'Horizonte Redes', cnpj: '••.•••.•••/••••-••', uf: 'AL', status: 'attention', documents: 218, lastSync: 'Hoje, 07:58', certificateUntil: '22 set. 2026', certificateDays: 14 },
  { id: '4', name: 'Vila Comércio de Alimentos Ltda', tradeName: 'Vila Alimentos', cnpj: '••.•••.•••/••••-••', uf: 'PE', status: 'active', documents: 604, lastSync: 'Ontem, 23:17', certificateUntil: '11 mar. 2027', certificateDays: 184 },
];

const demoDocuments: FiscalDocument[] = [
  { id: '1', company: 'Sertão Verde', number: '000.013.842', model: 'NF-e', direction: 'Entrada', party: 'Agro Nordeste Insumos', issueDate: '08 set. 2026, 08:31', value: 12840.5, status: 'Autorizada' },
  { id: '2', company: 'Rota Norte', number: '000.004.291', model: 'NFS-e', direction: 'Saída', party: 'Cooperativa Vale Verde', issueDate: '08 set. 2026, 08:12', value: 4780, status: 'Autorizada' },
  { id: '3', company: 'Vila Alimentos', number: '000.087.614', model: 'NFC-e', direction: 'Saída', party: 'Consumidor final', issueDate: '08 set. 2026, 07:49', value: 184.9, status: 'Autorizada' },
  { id: '4', company: 'Horizonte Redes', number: '000.001.937', model: 'NF-e', direction: 'Entrada', party: 'Conecta Distribuidora', issueDate: '07 set. 2026, 17:26', value: 3250, status: 'Autorizada' },
  { id: '5', company: 'Sertão Verde', number: '000.013.790', model: 'NF-e', direction: 'Entrada', party: 'Máquinas do Sertão', issueDate: '07 set. 2026, 14:08', value: 22900, status: 'Cancelada' },
  { id: '6', company: 'Vila Alimentos', number: '000.087.553', model: 'NFC-e', direction: 'Saída', party: 'Consumidor final', issueDate: '07 set. 2026, 12:44', value: 96.7, status: 'Autorizada' },
];

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
const number = new Intl.NumberFormat('pt-BR');
const shortCurrency = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')} mil`;
  return currency.format(value);
};

const normalizeCompany = (row: Record<string, any>, index: number): Company => ({
  id: String(row.id || index),
  name: row.razao_social || row.name || 'Empresa sem nome',
  tradeName: row.nome_fantasia || row.trade_name || row.razao_social || 'Empresa',
  cnpj: row.cnpj || 'CNPJ não informado',
  uf: row.uf || '—',
  status: Number(row.certificate_days ?? 999) <= 30 ? 'attention' : 'active',
  documents: Number(row.documents || row.document_count || 0),
  lastSync: row.last_sync_at ? new Date(row.last_sync_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Aguardando sincronização',
  certificateUntil: row.certificate_until ? new Date(`${row.certificate_until}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Não configurado',
  certificateDays: Number(row.certificate_days ?? 999),
});

const normalizeDocument = (row: Record<string, any>, index: number): FiscalDocument => ({
  id: String(row.id || index),
  company: row.company_name || row.nome_fantasia || 'Empresa',
  number: row.note_number || row.document_number || '—',
  model: row.model === '65' ? 'NFC-e' : row.model === 'NFSE' || row.model === 'NFS-e' ? 'NFS-e' : 'NF-e',
  direction: row.direction === 'saida' || row.direction === 'outbound' ? 'Saída' : 'Entrada',
  party: row.counterparty_name || row.issuer_name || row.recipient_name || 'Não identificado',
  issueDate: row.issue_date ? new Date(row.issue_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—',
  value: Number(row.value || row.total_value || 0),
  status: /cancel/i.test(row.status_text || row.status || '') ? 'Cancelada' : 'Autorizada',
});

export default function FiscalExtractorApp({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ExtractorSection>('Visão geral');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('Todas as empresas');
  const [directionFilter, setDirectionFilter] = useState('Todos');
  const [modal, setModal] = useState<'company' | 'history' | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (preview || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc('extractor_workspace_snapshot');
      if (!cancelled) {
        if (!error && data) setSnapshot(data as Snapshot);
        else setAccessDenied(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [preview, user?.id]);

  const companies = useMemo(
    () => snapshot?.companies?.length ? snapshot.companies.map(normalizeCompany) : demoCompanies,
    [snapshot],
  );
  const documents = useMemo(
    () => snapshot?.documents?.length ? snapshot.documents.map(normalizeDocument) : demoDocuments,
    [snapshot],
  );
  const filteredDocuments = useMemo(() => documents.filter(doc => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${doc.company} ${doc.number} ${doc.party} ${doc.model}`.toLowerCase().includes(term);
    const matchesCompany = companyFilter === 'Todas as empresas' || doc.company === companyFilter;
    const matchesDirection = directionFilter === 'Todos' || doc.direction === directionFilter;
    return matchesSearch && matchesCompany && matchesDirection;
  }), [documents, search, companyFilter, directionFilter]);

  const totals = useMemo(() => ({
    documents: snapshot?.totals?.documents ?? companies.reduce((sum, item) => sum + item.documents, 0),
    entries: snapshot?.totals?.entries ?? 978,
    exits: snapshot?.totals?.exits ?? 682,
    value: snapshot?.totals?.value ?? 1_284_760.9,
  }), [snapshot, companies]);

  const navigate = (section: ExtractorSection) => {
    setActive(section);
    setMobileOpen(false);
  };

  if (loading) return <ExtractorLoading />;
  if (!preview && accessDenied) return <ExtractorAccessPending />;

  return (
    <div className="extractor-app">
      <header className="extractor-topbar">
        <div className="extractor-topbar-brand">
          <button className="extractor-mobile-trigger" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu /></button>
          <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
          <span className="extractor-product-name">Extrator Fiscal</span>
        </div>
        <div className="extractor-topbar-center">
          <button className="extractor-company-picker">
            <span className="extractor-company-mark">WS</span>
            <span><small>Escritório</small><strong>{snapshot?.account?.name || 'Escritório demonstração'}</strong></span>
            <ChevronDown />
          </button>
        </div>
        <div className="extractor-topbar-actions">
          {preview && <span className="extractor-preview-badge">Prévia</span>}
          <button className="extractor-icon-button" aria-label="Notificações"><Bell /><i /></button>
          <button className="extractor-avatar" aria-label="Abrir conta">WS</button>
        </div>
      </header>

      {mobileOpen && <button className="extractor-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`extractor-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <button className="extractor-sidebar-close" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X /></button>
        <div className="extractor-sidebar-intro">
          <span>EF</span>
          <div><strong>Extrator Fiscal</strong><small>Gestão de documentos</small></div>
        </div>
        <nav>
          {['Operação', 'Fiscal', 'Gestão'].map(group => (
            <section key={group}>
              <p>{group}</p>
              {navigation.filter(item => item.group === group).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} className={active === item.label ? 'is-active' : ''} onClick={() => navigate(item.label)}>
                    <Icon /><span>{item.label}</span>{item.label === 'Histórico' && <em>PRO</em>}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="extractor-plan-card">
          <div><Sparkles /><span>Plano Escritório</span></div>
          <strong>{number.format(totals.documents)} <small>/ {number.format(snapshot?.account?.monthly_xml_limit || 20000)} XML</small></strong>
          <div className="extractor-usage-bar"><i /></div>
          <button onClick={() => setModal('history')}>Ver recursos do plano</button>
        </div>
        <div className="extractor-sidebar-user"><span>WS</span><div><strong>Equipe fiscal</strong><small>Administrador</small></div><MoreHorizontal /></div>
      </aside>

      <main className="extractor-main">
        {active === 'Visão geral' && <Overview companies={companies} documents={documents} totals={totals} onNavigate={navigate} />}
        {active === 'Empresas' && <Companies companies={companies} onAdd={() => setModal('company')} />}
        {active === 'Documentos' && <Documents documents={filteredDocuments} companies={companies} search={search} onSearch={setSearch} companyFilter={companyFilter} onCompanyFilter={setCompanyFilter} directionFilter={directionFilter} onDirectionFilter={setDirectionFilter} onHistory={() => setModal('history')} />}
        {active === 'Relatórios' && <Reports companies={companies} totals={totals} />}
        {active === 'Certificados' && <Certificates companies={companies} />}
        {active === 'Histórico' && <HistorySection onOpen={() => setModal('history')} />}
        {active === 'Configurações' && <SettingsSection />}
      </main>

      {modal === 'company' && <AddCompanyModal onClose={() => setModal(null)} />}
      {modal === 'history' && <HistoryModal preview={preview} onClose={() => setModal(null)} />}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="extractor-page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="extractor-heading-actions">{actions}</div>}</div>;
}

function Overview({ companies, documents, totals, onNavigate }: { companies: Company[]; documents: FiscalDocument[]; totals: { documents: number; entries: number; exits: number; value: number }; onNavigate: (section: ExtractorSection) => void }) {
  return <div className="extractor-page">
    <PageHeading eyebrow="Visão geral" title="Sua operação fiscal, em ordem." description="A carteira está atualizada. Veja o que exige atenção hoje." actions={<><button className="extractor-period"><CalendarDays />Últimos 30 dias<ChevronDown /></button><button className="extractor-primary"><RefreshCw />Sincronizar agora</button></>} />
    <section className="extractor-kpis">
      <Kpi icon={FileCheck2} label="Documentos capturados" value={number.format(totals.documents)} detail="+12,4% no período" tone="blue" />
      <Kpi icon={ArrowDownToLine} label="Notas de entrada" value={number.format(totals.entries)} detail="59% dos documentos" tone="violet" />
      <Kpi icon={TrendingUp} label="Notas de saída" value={number.format(totals.exits)} detail="41% dos documentos" tone="green" />
      <Kpi icon={CircleDollarSign} label="Movimentação total" value={shortCurrency(totals.value)} detail="Entradas e saídas" tone="gold" />
    </section>
    <section className="extractor-dashboard-grid">
      <div className="extractor-panel extractor-chart-panel">
        <PanelHeader title="Capturas por dia" subtitle="Documentos processados automaticamente" action={<button>30 dias<ChevronDown /></button>} />
        <div className="extractor-chart-summary"><strong>1.660</strong><span><TrendingUp />12,4% comparado ao período anterior</span></div>
        <SimpleChart />
      </div>
      <div className="extractor-panel extractor-composition">
        <PanelHeader title="Composição fiscal" subtitle="Distribuição por modelo" />
        <div className="extractor-donut"><div><strong>1.660</strong><span>documentos</span></div></div>
        <ul><li><i className="nfe" /><span>NF-e</span><strong>854</strong><small>51%</small></li><li><i className="nfce" /><span>NFC-e</span><strong>621</strong><small>37%</small></li><li><i className="nfse" /><span>NFS-e</span><strong>185</strong><small>12%</small></li></ul>
      </div>
      <div className="extractor-panel extractor-attention">
        <PanelHeader title="Precisa de atenção" subtitle="Pendências da carteira" action={<button onClick={() => onNavigate('Certificados')}>Ver todas</button>} />
        <div className="extractor-alert-row"><span className="warning"><AlertTriangle /></span><div><strong>Certificado próximo do vencimento</strong><p>EL Redes vence em 14 dias.</p></div><button onClick={() => onNavigate('Certificados')}>Resolver</button></div>
        <div className="extractor-alert-row"><span className="neutral"><Clock3 /></span><div><strong>1 empresa com captura atrasada</strong><p>Última consulta há mais de 12 horas.</p></div><button onClick={() => onNavigate('Empresas')}>Revisar</button></div>
      </div>
      <div className="extractor-panel extractor-recent">
        <PanelHeader title="Documentos recentes" subtitle="Últimas notas encontradas" action={<button onClick={() => onNavigate('Documentos')}>Ver documentos</button>} />
        <DocumentTable documents={documents.slice(0, 4)} compact />
      </div>
    </section>
  </div>;
}

function Kpi({ icon: Icon, label, value, detail, tone }: { icon: any; label: string; value: string; detail: string; tone: string }) {
  return <article className={`extractor-kpi ${tone}`}><div className="extractor-kpi-top"><span><Icon /></span><small>30 dias</small></div><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <header className="extractor-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>;
}

function SimpleChart() {
  return <div className="extractor-chart"><div className="extractor-chart-grid"><i /><i /><i /><i /></div><svg viewBox="0 0 720 190" preserveAspectRatio="none" role="img" aria-label="Documentos capturados nos últimos 30 dias"><defs><linearGradient id="extractorArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d8fff" stopOpacity=".34"/><stop offset="1" stopColor="#4d8fff" stopOpacity="0"/></linearGradient></defs><path d="M0 157 C42 145 61 150 92 128 S146 112 177 123 S233 92 270 103 S324 76 358 85 S417 64 450 80 S509 52 545 58 S600 24 634 39 S687 19 720 25 L720 190 L0 190 Z" fill="url(#extractorArea)"/><path d="M0 157 C42 145 61 150 92 128 S146 112 177 123 S233 92 270 103 S324 76 358 85 S417 64 450 80 S509 52 545 58 S600 24 634 39 S687 19 720 25" fill="none" stroke="#5a95ff" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx="634" cy="39" r="5" fill="#071525" stroke="#82adff" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="extractor-chart-labels"><span>10 ago.</span><span>17 ago.</span><span>24 ago.</span><span>31 ago.</span><span>8 set.</span></div></div>;
}

function Companies({ companies, onAdd }: { companies: Company[]; onAdd: () => void }) {
  const [term, setTerm] = useState('');
  const visible = companies.filter(item => `${item.name} ${item.cnpj}`.toLowerCase().includes(term.toLowerCase()));
  return <div className="extractor-page">
    <PageHeading eyebrow="Carteira" title="Empresas" description="Acompanhe a captura, os certificados e a situação de cada CNPJ." actions={<button className="extractor-primary" onClick={onAdd}><Plus />Adicionar empresa</button>} />
    <div className="extractor-toolbar"><label><Search /><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Buscar por nome ou CNPJ" /></label><button><SlidersHorizontal />Filtros</button></div>
    <div className="extractor-company-list">
      <div className="extractor-list-head"><span>Empresa</span><span>Documentos — 30 dias</span><span>Certificado A1</span><span>Última captura</span><span>Situação</span><span /></div>
      {visible.map(company => <div className="extractor-company-row" key={company.id}><div className="extractor-company-cell"><span>{company.tradeName.slice(0, 2).toUpperCase()}</span><div><strong>{company.tradeName}</strong><small>{company.cnpj} · {company.uf}</small></div></div><div data-label="Documentos"><strong>{number.format(company.documents)}</strong><small>XML capturados</small></div><div data-label="Certificado"><strong className={company.status === 'attention' ? 'is-warning' : ''}>{company.certificateUntil}</strong><small>{company.certificateDays === 999 ? 'Sem certificado' : `${company.certificateDays} dias restantes`}</small></div><div data-label="Última captura"><strong>{company.lastSync}</strong><small>Consulta automática</small></div><div data-label="Situação"><span className={`extractor-status ${company.status}`}>{company.status === 'active' ? 'Ativa' : 'Atenção'}</span></div><button className="extractor-row-menu"><MoreHorizontal /></button></div>)}
    </div>
  </div>;
}

function Documents({ documents, companies, search, onSearch, companyFilter, onCompanyFilter, directionFilter, onDirectionFilter, onHistory }: { documents: FiscalDocument[]; companies: Company[]; search: string; onSearch: (value: string) => void; companyFilter: string; onCompanyFilter: (value: string) => void; directionFilter: string; onDirectionFilter: (value: string) => void; onHistory: () => void }) {
  return <div className="extractor-page">
    <PageHeading eyebrow="Fiscal" title="Documentos" description="Notas de entrada e saída encontradas nos últimos 30 dias." actions={<><button className="extractor-secondary" onClick={onHistory}><History />Consultar período anterior</button><button className="extractor-primary"><FileArchive />Baixar XML</button></>} />
    <div className="extractor-filter-strip"><label className="extractor-search"><Search /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Número, empresa ou participante" /></label><select value={companyFilter} onChange={event => onCompanyFilter(event.target.value)}><option>Todas as empresas</option>{companies.map(item => <option key={item.id}>{item.tradeName}</option>)}</select><select value={directionFilter} onChange={event => onDirectionFilter(event.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select><button><CalendarDays />10 ago. — 8 set.</button></div>
    <div className="extractor-panel extractor-documents-panel"><div className="extractor-document-tabs"><button className="is-active">Todos <span>{documents.length}</span></button><button>NF-e</button><button>NFC-e</button><button>NFS-e</button><div /><button><Download />Exportar</button></div><DocumentTable documents={documents} /></div>
  </div>;
}

function DocumentTable({ documents, compact = false }: { documents: FiscalDocument[]; compact?: boolean }) {
  return <div className={`extractor-table-wrap ${compact ? 'is-compact' : ''}`}><table className="extractor-doc-table"><thead><tr><th>Documento</th><th>Empresa</th><th>Participante</th><th>Emissão</th><th>Valor</th><th>Status</th><th /></tr></thead><tbody>{documents.map(doc => <tr key={doc.id}><td><div className="extractor-document-id"><span className={doc.direction === 'Entrada' ? 'in' : 'out'}>{doc.direction === 'Entrada' ? 'E' : 'S'}</span><div><strong>{doc.model} · {doc.number}</strong><small>{doc.direction}</small></div></div></td><td><strong>{doc.company}</strong></td><td><span>{doc.party}</span></td><td><span>{doc.issueDate}</span></td><td><strong>{currency.format(doc.value)}</strong></td><td><span className={`extractor-status ${doc.status === 'Autorizada' ? 'active' : 'cancelled'}`}>{doc.status}</span></td><td><button className="extractor-row-menu"><MoreHorizontal /></button></td></tr>)}</tbody></table>{documents.length === 0 && <div className="extractor-empty"><Search /><strong>Nenhum documento encontrado</strong><span>Tente alterar os filtros da consulta.</span></div>}</div>;
}

function Reports({ companies, totals }: { companies: Company[]; totals: { documents: number; entries: number; exits: number; value: number } }) {
  return <div className="extractor-page"><PageHeading eyebrow="Análises" title="Relatórios" description="Transforme a movimentação fiscal da carteira em informações prontas para conferência." actions={<button className="extractor-primary"><Download />Exportar relatório</button>} />
    <div className="extractor-report-grid"><article className="extractor-report-feature"><div><span>Resumo da carteira</span><h2>Movimentação fiscal consolidada</h2><p>Entradas, saídas e documentos por empresa nos últimos 30 dias.</p><button>Gerar relatório <Download /></button></div><ReportBars /></article><article className="extractor-report-card"><span><Building2 /></span><div><small>Empresas monitoradas</small><strong>{companies.length}</strong><p>100% com captura ativa</p></div></article><article className="extractor-report-card"><span><FileCheck2 /></span><div><small>XML disponíveis</small><strong>{number.format(totals.documents)}</strong><p>Prontos para exportação</p></div></article></div>
    <div className="extractor-panel extractor-company-performance"><PanelHeader title="Movimentação por empresa" subtitle="Consolidado do período atual" /><div className="extractor-performance-head"><span>Empresa</span><span>Documentos</span><span>Participação</span><span>Última captura</span></div>{companies.map((company, index) => <div className="extractor-performance-row" key={company.id}><div><span>{company.tradeName.slice(0, 2).toUpperCase()}</span><strong>{company.tradeName}</strong></div><strong>{number.format(company.documents)}</strong><div><i style={{ width: `${[79, 63, 46, 88][index % 4]}%` }} /><small>{[29, 21, 15, 35][index % 4]}%</small></div><span>{company.lastSync}</span></div>)}</div>
  </div>;
}

function ReportBars() { return <div className="extractor-report-bars">{[48, 65, 43, 76, 59, 88, 72, 94, 68, 84].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>; }

function Certificates({ companies }: { companies: Company[] }) {
  return <div className="extractor-page"><PageHeading eyebrow="Segurança fiscal" title="Certificados digitais" description="Controle validade e vínculo dos certificados A1 sem expor arquivos ou senhas." actions={<button className="extractor-primary"><Upload />Enviar certificado</button>} />
    <div className="extractor-certificate-summary"><article><span className="ok"><Check /></span><div><strong>{companies.filter(item => item.status === 'active').length} certificados válidos</strong><p>Captura funcionando normalmente.</p></div></article><article><span className="warn"><AlertTriangle /></span><div><strong>{companies.filter(item => item.status === 'attention').length} exige atenção</strong><p>Vencimento dentro de 30 dias.</p></div></article><article><span className="secure"><LockKeyhole /></span><div><strong>Arquivos protegidos</strong><p>Dados criptografados e acesso restrito.</p></div></article></div>
    <div className="extractor-company-list extractor-certificate-list"><div className="extractor-list-head"><span>Empresa</span><span>Titular</span><span>Validade</span><span>Captura</span><span>Situação</span><span /></div>{companies.map(company => <div className="extractor-company-row" key={company.id}><div className="extractor-company-cell"><span><ShieldCheck /></span><div><strong>{company.tradeName}</strong><small>{company.cnpj}</small></div></div><div data-label="Titular"><strong>{company.name}</strong><small>Certificado A1</small></div><div data-label="Validade"><strong className={company.status === 'attention' ? 'is-warning' : ''}>{company.certificateUntil}</strong><small>{company.certificateDays === 999 ? 'Não configurado' : `${company.certificateDays} dias restantes`}</small></div><div data-label="Captura"><strong>Automática</strong><small>{company.lastSync}</small></div><div data-label="Situação"><span className={`extractor-status ${company.status}`}>{company.status === 'active' ? 'Válido' : 'Renovar'}</span></div><button className="extractor-row-menu"><MoreHorizontal /></button></div>)}</div>
  </div>;
}

function HistorySection({ onOpen }: { onOpen: () => void }) {
  return <div className="extractor-page"><PageHeading eyebrow="Recurso adicional" title="Histórico retroativo" description="Encontre documentos anteriores à janela padrão de 30 dias quando precisar." />
    <section className="extractor-history-hero"><div className="extractor-history-copy"><span><History /></span><small>Consulta sob demanda</small><h2>Busque meses anteriores sem alterar sua rotina mensal.</h2><p>Escolha as empresas e o período. Antes de iniciar, você vê a estimativa de volume e o valor da consulta.</p><ul><li><Check />Consulta por CNPJ e competência</li><li><Check />XML organizados por empresa e período</li><li><Check />Processamento acompanhado pelo painel</li></ul><button className="extractor-primary" onClick={onOpen}>Simular consulta histórica</button></div><div className="extractor-history-visual"><div className="extractor-history-months"><span>MAR</span><span>ABR</span><span>MAI</span><span>JUN</span><span>JUL</span><span>AGO</span></div><div className="extractor-history-window"><LockKeyhole /><strong>30 dias incluídos</strong><small>Períodos anteriores disponíveis sob demanda</small></div></div></section>
  </div>;
}

function SettingsSection() {
  return <div className="extractor-page"><PageHeading eyebrow="Conta" title="Configurações" description="Preferências da carteira, equipe e automações de captura." />
    <div className="extractor-settings-grid"><section className="extractor-panel"><PanelHeader title="Captura automática" subtitle="Rotina padrão das empresas" /><SettingRow title="Sincronização automática" description="Consultar novas notas de todas as empresas." enabled /><SettingRow title="Aviso de certificado" description="Notificar quando faltarem 30 dias para vencer." enabled /><SettingRow title="Resumo semanal" description="Enviar o relatório consolidado por e-mail." /></section><section className="extractor-panel"><PanelHeader title="Equipe" subtitle="Pessoas com acesso ao extrator" /><div className="extractor-team-row"><span>WS</span><div><strong>Wilson Souza</strong><small>Administrador · acesso completo</small></div><span className="extractor-status active">Ativo</span></div><button className="extractor-add-member"><UsersRound />Convidar integrante</button></section></div>
  </div>;
}

function SettingRow({ title, description, enabled = false }: { title: string; description: string; enabled?: boolean }) { const [on, setOn] = useState(enabled); return <div className="extractor-setting-row"><div><strong>{title}</strong><small>{description}</small></div><button className={on ? 'is-on' : ''} onClick={() => setOn(value => !value)} aria-label={`${on ? 'Desativar' : 'Ativar'} ${title}`}><i /></button></div>; }

function AddCompanyModal({ onClose }: { onClose: () => void }) {
  return <div className="extractor-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="extractor-modal" role="dialog" aria-modal="true" aria-label="Adicionar empresa"><header><div><span><Building2 /></span><div><h2>Adicionar empresa</h2><p>Inclua um CNPJ na carteira de captura.</p></div></div><button onClick={onClose}><X /></button></header><div className="extractor-modal-body"><label>CNPJ<input placeholder="00.000.000/0000-00" /></label><label>Razão social<input placeholder="Nome empresarial" /></label><div className="extractor-form-row"><label>UF<select><option>AL</option><option>PE</option><option>SE</option><option>BA</option></select></label><label>Ambiente<select><option>Produção</option><option>Homologação</option></select></label></div><div className="extractor-info-note"><ShieldCheck /><p><strong>Próximo passo</strong><span>Depois do cadastro, você poderá vincular o certificado A1 e iniciar a captura.</span></p></div></div><footer><button className="extractor-secondary" onClick={onClose}>Cancelar</button><button className="extractor-primary" onClick={onClose}>Adicionar empresa</button></footer></div></div>;
}

function HistoryModal({ preview, onClose }: { preview: boolean; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const request = async () => {
    if (!preview) await (supabase as any).from('extractor_history_requests').insert({ requested_from: '2026-01-01', requested_to: '2026-07-31', estimated_xml: 4800 });
    setSent(true);
  };
  return <div className="extractor-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="extractor-modal extractor-history-modal" role="dialog" aria-modal="true" aria-label="Consulta histórica"><header><div><span><History /></span><div><h2>Consulta histórica</h2><p>Documentos anteriores aos últimos 30 dias.</p></div></div><button onClick={onClose}><X /></button></header>{sent ? <div className="extractor-success-state"><span><Check /></span><h3>Solicitação registrada</h3><p>Vamos analisar o volume do período e apresentar o valor antes de iniciar a consulta.</p><button className="extractor-primary" onClick={onClose}>Concluir</button></div> : <><div className="extractor-modal-body"><label>Empresas<select><option>Toda a carteira — 4 empresas</option><option>Selecionar empresas</option></select></label><div className="extractor-form-row"><label>De<input type="month" defaultValue="2026-01" /></label><label>Até<input type="month" defaultValue="2026-07" /></label></div><div className="extractor-history-estimate"><div><small>Estimativa de volume</small><strong>≈ 4.800 XML</strong></div><span>Valor calculado após análise</span></div><p className="extractor-modal-disclaimer">Nenhuma busca será iniciada sem sua confirmação do valor.</p></div><footer><button className="extractor-secondary" onClick={onClose}>Cancelar</button><button className="extractor-primary" onClick={request}>Solicitar estimativa</button></footer></>}</div></div>;
}

function ExtractorLoading() { return <div className="extractor-loading"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /><span><i /></span><p>Preparando sua carteira fiscal...</p></div>; }

function ExtractorAccessPending() {
  return <div className="extractor-access-pending"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /><div><span><LockKeyhole /></span><h1>Extrator ainda não habilitado</h1><p>Seu acesso existe, mas nenhuma carteira do Extrator Fiscal foi vinculada a esta conta.</p><a href="/extrator-preview">Abrir demonstração</a></div></div>;
}
