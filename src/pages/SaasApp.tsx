import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  FileInput,
  FileText,
  FolderSearch2,
  Home,
  Menu,
  Package2,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Truck,
  UsersRound,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';
import SaasCadastros, { CadastroSection } from '@/components/saas/SaasCadastros';
import SaasEmission from '@/components/saas/SaasEmission';
import SaasCompanyProfile from '@/components/saas/SaasCompanyProfile';
import SaasReports from '@/components/saas/SaasReports';
import SaasDashboard from '@/components/saas/SaasDashboard';
import SaasProductsPremium from '@/components/saas/SaasProductsPremium';
import SaasDfeManager from '@/components/saas/SaasDfeManager';
import SaasMyNotes, { DraftResumeBanner } from '@/components/saas/SaasDrafts';
import { useEmissionDrafts } from '@/hooks/useEmissionDrafts';
import SaasSetupGuide from '@/components/saas/SaasSetupGuide';
import AccountDrawer from '@/components/account/AccountDrawer';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import '@/styles/saas-admin-light.css';
import '@/styles/saas-premium-v3.css';
import '@/styles/saas-admin-reconciliation.css';
import '@/styles/saas-native-font.css';
import '@/styles/saas-mobile-polish.css';
import '@/styles/saas-user-polish.css';
import '@/styles/fiscal-studio.css';

const WS_LOGO = '/assets/ws-emissor-fiscal.png';
const TEST_TRANSPORT_ORG_ID = 'c77c4620-fbbb-4f03-9e32-ab48d25bb0cf';
const TEST_TRANSPORT_ORG_NAME = 'MSILVA TRANSPORTES';
const cadastroSections = new Set([
  'Clientes',
  'Fornecedores',
  'Produtos',
  'Serviços',
  'Transportadoras',
]);
const groups = [
  {
    title: 'Notas de produtos',
    tone: 'product',
    display: 'Emitir produtos',
    icon: ReceiptText,
    items: [
      { label: 'Emitir NF-e', icon: FileText },
      { label: 'Emitir NFC-e', icon: FileInput },
    ],
  },
  {
    title: 'Notas de serviços',
    tone: 'service',
    display: 'Emitir serviços',
    icon: ShoppingBag,
    items: [{ label: 'Emitir NFS-e', icon: ReceiptText }],
  },
  {
    title: 'Notas de transportes',
    tone: 'transport',
    display: 'Emitir transportes',
    icon: Truck,
    items: [
      { label: 'Emitir CT-e', icon: FileText },
      { label: 'Emitir MDF-e', icon: FileText },
    ],
  },
  {
    title: 'Cadastros',
    tone: 'registry',
    display: 'Cadastros',
    icon: Boxes,
    items: [
      { label: 'Clientes', icon: UsersRound },
      { label: 'Fornecedores', icon: Building2 },
      { label: 'Produtos', icon: Package2 },
      { label: 'Serviços', icon: ShoppingBag },
      { label: 'Transportadoras', icon: Truck },
    ],
  },
];
const lightVars: any = {
  '--background': '220 14% 96%',
  '--foreground': '222 47% 11%',
  '--card': '220 13% 92%',
  '--card-foreground': '222 47% 11%',
  '--popover': '220 13% 94%',
  '--popover-foreground': '222 47% 11%',
  '--primary': '220 12% 87%',
  '--primary-foreground': '222 47% 11%',
  '--secondary': '220 12% 89%',
  '--secondary-foreground': '222 47% 11%',
  '--muted': '220 12% 90%',
  '--muted-foreground': '215 16% 40%',
  '--accent': '220 12% 87%',
  '--accent-foreground': '222 47% 11%',
  '--border': '220 12% 82%',
  '--input': '220 12% 84%',
  '--ring': '215 16% 40%',
};
const formatCnpj = (value: any) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length !== 14) return String(value || '');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const emissionTypeLabel = (emission: any) =>
  (
    ({ nfe: 'NF-e', nfce: 'NFC-e', nfse: 'NFS-e', cte: 'CT-e', mdfe: 'MDF-e' }) as Record<
      string,
      string
    >
  )[String(emission?.document_type || '').toLowerCase()] || null;

export default function SaasApp() {
  const { user, isAdmin } = useAuth();
  const { companies: officeCompanies, loading: officeCompaniesLoading } = useCompanySelection();
  const fromAdmin =
    isAdmin && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('source') === 'admin';
  const [active, setActive] = useState('Início');
  const [organization, setOrganization] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [certificateConfigured, setCertificateConfigured] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [emissions, setEmissions] = useState<any[]>([]);
  const [planLabel, setPlanLabel] = useState('Plano fiscal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [organizationChoices, setOrganizationChoices] = useState<any[]>([]);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState('');
  const [reusableEmission, setReusableEmission] = useState<any>(null);
  const [pendingCadastroCreate, setPendingCadastroCreate] = useState<CadastroSection | null>(null);
  const organizationRequest = useRef(0);
  const drafts = useEmissionDrafts(organization?.id || null);
  const [notesView, setNotesView] = useState<'issued' | 'drafts'>('issued');
  const adminIssuerCompanies = fromAdmin
    ? officeCompanies
        .filter(
          company =>
            String(company.cnpj || company.document_number || '').replace(/\D/g, '').length === 14 &&
            Boolean(company.fiscal_company_id) &&
            company.certificate_status === 'valid',
        )
        .map(company => ({
          id: company.id,
          office_company_id: company.id,
          name: company.trade_name || company.company_name,
          legal_name: company.company_name,
          cnpj: company.cnpj || company.document_number || '',
          fiscal_company_id: company.fiscal_company_id,
        }))
    : [];

  const resumeDraft = (document: string) => {
    setReusableEmission(null);
    setSelectedDocument(document);
    setActive('Emissão');
  };
  const openDrafts = () => { setNotesView('drafts'); setActive('Minhas notas'); setSelectedDocument(null); };

  const hydrateOrganization = async (org: any, requestId: number) => {
    if (!org?.id) return;
    setOrganization(org);
    const storageKey = fromAdmin ? 'ws_admin_issuer_organization_id' : 'ws_saas_selected_organization';
    localStorage.setItem(storageKey, org.id);

    const testTransport = !fromAdmin && org?.id === TEST_TRANSPORT_ORG_ID;
    if (testTransport) setOrganization({ ...org, name: TEST_TRANSPORT_ORG_NAME });
    setSetupDismissed(localStorage.getItem(`ws_fiscal_setup_dismissed_${org.id}`) === '1');

    await supabase.functions
      .invoke('saas-sales-history-sync', { body: { organization_id: org.id, mode: 'auto' } })
      .catch(() => null);

    const subscriptionPromise = fromAdmin
      ? Promise.resolve({ data: null })
      : (supabase as any)
          .from('saas_subscriptions')
          .select('status,saas_plans(name)')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

    const [{ data: config }, { data: e }, { data: s }] = await Promise.all([
      supabase.functions.invoke('saas-fiscal-config', {
        body: { action: 'get', organization_id: org.id },
      }),
      (supabase as any)
        .from('saas_fiscal_emissions')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(800),
      subscriptionPromise,
    ]);
    if (requestId !== organizationRequest.current) return;

    setEmissions(e || []);
    const p = config?.profile || null;
    setProfile(p);
    setCertificateConfigured(Boolean(config?.certificate_configured));

    if (testTransport) {
      setOrganization((current: any) => ({ ...current, name: TEST_TRANSPORT_ORG_NAME }));
    } else if (p?.trade_name || p?.legal_name) {
      setOrganization((current: any) => ({
        ...current,
        name: p.trade_name || p.legal_name,
      }));
    }

    if (p?.logo_path) {
      const { data: signed } = await supabase.storage
        .from('saas-private')
        .createSignedUrl(p.logo_path, 3600);
      setLogoUrl(signed?.signedUrl || null);
    }

    if (fromAdmin) setPlanLabel('Emissão pelo escritório');
    else if (s?.saas_plans?.name) setPlanLabel(s.saas_plans.name);
  };

  const loadOrg = async (preferredSelectionId?: string) => {
    if (!user) return;
    const requestId = ++organizationRequest.current;
    setOrganizationLoading(true);
    setOrganizationError('');
    try {
      setEmissions([]);
      setProfile(null);
      setCertificateConfigured(false);
      setLogoUrl(null);

      if (fromAdmin) {
        const choices = adminIssuerCompanies;
        setOrganizationChoices(choices);
        const storedCompanyId =
          preferredSelectionId || localStorage.getItem('ws_admin_issuer_company_id') || '';
        const selectedCompany =
          choices.find((value: any) => value.id === storedCompanyId) ||
          (choices.length === 1 ? choices[0] : null);

        if (!selectedCompany) {
          setOrganization(null);
          setPlanLabel('Emissão pelo escritório');
          return;
        }

        const { data: issuerContext, error: issuerError } = await supabase.functions.invoke(
          'admin-issuer-context',
          { body: { company_id: selectedCompany.id } },
        );
        if (issuerError) {
          let issuerMessage = issuerError.message || 'Não foi possível preparar o emitente.';
          try {
            const response = (issuerError as any)?.context;
            if (response?.clone && response?.json) {
              const payload = await response.clone().json();
              if (payload?.error) issuerMessage = String(payload.error);
            }
          } catch {
            // Mantém a mensagem original quando o corpo da resposta não estiver disponível.
          }
          throw new Error(issuerMessage);
        }
        if (!issuerContext?.organization?.id) {
          throw new Error(issuerContext?.error || 'Não foi possível preparar o emitente.');
        }

        localStorage.setItem('ws_admin_issuer_company_id', selectedCompany.id);
        const org = {
          ...issuerContext.organization,
          office_company_id: selectedCompany.id,
          name: selectedCompany.name,
          cnpj: selectedCompany.cnpj,
        };
        await hydrateOrganization(org, requestId);
        return;
      }

      const { data } = await (supabase as any)
        .from('organization_members')
        .select('organization_id, organizations(id,name,slug)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (requestId !== organizationRequest.current) return;

      const membershipChoices = (data || [])
        .map((row: any) => row.organizations || null)
        .filter((value: any) => Boolean(value?.id));
      const organizationIds = membershipChoices.map((value: any) => String(value.id));
      let choices = membershipChoices;

      if (organizationIds.length) {
        const { data: subscriptions, error: subscriptionsError } = await (supabase as any)
          .from('saas_subscriptions')
          .select('organization_id,status,trial_ends_at,access_expires_at,saas_plans(product_code)')
          .in('organization_id', organizationIds)
          .in('status', ['trialing', 'active', 'past_due']);

        if (!subscriptionsError) {
          const now = Date.now();
          const issuerOrganizations = new Set(
            (subscriptions || [])
              .filter((row: any) => {
                const plan = Array.isArray(row.saas_plans) ? row.saas_plans[0] : row.saas_plans;
                if (plan?.product_code !== 'issuer') return false;
                const boundary =
                  row.status === 'trialing' ? row.trial_ends_at : row.access_expires_at;
                return !boundary || new Date(boundary).getTime() > now;
              })
              .map((row: any) => String(row.organization_id)),
          );
          choices = membershipChoices.filter((value: any) =>
            issuerOrganizations.has(String(value.id)),
          );
        }
      }

      setOrganizationChoices(choices);
      const storedId =
        preferredSelectionId || localStorage.getItem('ws_saas_selected_organization');
      const org =
        choices.find((value: any) => value.id === storedId) ||
        (choices.length === 1 ? choices[0] : null);
      if (!org?.id) {
        setOrganization(null);
        setPlanLabel('Plano fiscal');
        return;
      }
      await hydrateOrganization(org, requestId);
    } catch (error: any) {
      console.error('[AdminIssuer] Falha ao carregar emitente:', error);
      if (requestId === organizationRequest.current) {
        setOrganization(null);
        setOrganizationError(
          error?.message || 'Não foi possível preparar esta empresa para emissão agora.',
        );
      }
    } finally {
      if (requestId === organizationRequest.current) setOrganizationLoading(false);
    }
  };

  useEffect(() => {
    if (fromAdmin && officeCompaniesLoading) return;
    void loadOrg();
  }, [user?.id, fromAdmin, officeCompaniesLoading, adminIssuerCompanies.length]);

  const chooseNav = (item: string) => {
    setMobileMenuOpen(false);
    setPendingCadastroCreate(null);
    if (item === 'Gerenciar DF-e') {
      setSelectedDocument(null);
      setActive('Gerenciar DF-e');
      return;
    }
    if (item.startsWith('Emitir ')) {
      setReusableEmission(null);
      setSelectedDocument(item.replace('Emitir ', ''));
      setActive('Emissão');
      return;
    }
    setSelectedDocument(null);
    setReusableEmission(null);
    setActive(item);
  };

  const openCadastroCreate = (section: CadastroSection) => {
    setSelectedDocument(null);
    setReusableEmission(null);
    setPendingCadastroCreate(section);
    setActive(section);
  };

  const reuseEmission = (emission: any) => {
    const type = emissionTypeLabel(emission);
    if (!type) return;
    setReusableEmission(emission);
    setSelectedDocument(type);
    setActive('Emissão');
  };

  const isItemActive = (label: string) =>
    label.startsWith('Emitir ')
      ? active === 'Emissão' && selectedDocument === label.replace('Emitir ', '')
      : active === label;
  const isGroupActive = (title: string) =>
    groups.find(x => x.title === title)?.items.some(x => isItemActive(x.label)) || false;
  const setupComplete = Boolean(
    profile?.tax_id &&
    profile?.legal_name &&
    profile?.city_ibge_code &&
      profile?.tax_regime &&
      profile?.crt &&
      certificateConfigured
  );
  const showSetup = false;
  const dismissSetup = () => {
    if (organization?.id) localStorage.setItem(`ws_fiscal_setup_dismissed_${organization.id}`, '1');
    setSetupDismissed(true);
  };

  let content: any;
  if (organizationLoading) return <AppLoadingScreen mode="light" />;

  if (fromAdmin && !organization) {
    content = (
      <section className="mx-auto max-w-4xl rounded-xl border border-[#cfd6de] bg-white p-8 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#697586]">
          Emissão pelo escritório
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172033]">
          Selecione a empresa emitente
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
          No acesso administrativo, a WS não é o emitente. Escolha no topo um cliente do escritório
          com certificado A1 válido. Todos os dados, numeração, cadastros e histórico ficarão
          isolados na empresa selecionada.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#d6dce3] bg-[#f5f7f9] px-3 py-1.5 text-xs font-medium text-[#475467]">
            {adminIssuerCompanies.length} empresa{adminIssuerCompanies.length === 1 ? '' : 's'} com A1 válido
          </span>
          <a
            href="/admin/clientes"
            className="text-xs font-semibold text-[#344054] underline decoration-[#98a2b3] underline-offset-4"
          >
            Gerenciar clientes e certificados
          </a>
        </div>
        {organizationError && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {organizationError}
          </p>
        )}
      </section>
    );
  } else if (active === 'Início')
    content = (
      <SaasDashboard
        organizationId={organization?.id || null}
        organizationName={organization?.name}
        emissions={emissions}
        onNew={() => {
          setReusableEmission(null);
          setSelectedDocument(null);
          setActive('Emissão');
        }}
        onReports={() => setActive('Relatórios')}
      />
    );
  else if (active === 'Produtos')
    content = <SaasProductsPremium organizationId={organization?.id || null} />;
  else if (cadastroSections.has(active))
    content = (
      <SaasCadastros
        organizationId={organization?.id || null}
        section={active as CadastroSection}
        autoCreate={pendingCadastroCreate === active}
        onAutoCreateConsumed={() => setPendingCadastroCreate(null)}
      />
    );
  else if (active === 'Emissão')
    content = (
      <SaasEmission
        organizationId={organization?.id || null}
        documentType={selectedDocument}
        onChoose={document => {
          setReusableEmission(null);
          setSelectedDocument(document);
        }}
        emissions={emissions}
        reusableEmission={reusableEmission}
        onReuseConsumed={() => setReusableEmission(null)}
        onOpenCadastro={openCadastroCreate}
      />
    );
  else if (active === 'Gerenciar DF-e') content = <SaasDfeManager />;
  else if (active === 'Minhas notas')
    content = (
      <SaasMyNotes
        key={notesView}
        emissions={emissions}
        drafts={drafts}
        initialTab={notesView}
        onResume={resumeDraft}
        onNew={() => {
          setReusableEmission(null);
          setSelectedDocument(null);
          setActive('Emissão');
        }}
        onReuse={reuseEmission}
      />
    );
  else if (active === 'Minha Empresa')
    content = (
      <SaasCompanyProfile
        organizationId={organization?.id || null}
        organizationName={organization?.name}
        onLogoChanged={url => {
          setLogoUrl(url);
          void loadOrg();
        }}
      />
    );
  else if (active === 'Relatórios')
    content = <SaasReports organizationId={organization?.id || null} />;

  const accountNotifications = [
    ...(!setupComplete
      ? [
          {
            title: 'Termine sua configuração fiscal',
            text: 'Preencha os dados obrigatórios e adicione o certificado A1 antes de emitir em produção.',
          },
        ]
      : []),
    {
      title: 'Primeiros passos',
      text: 'Cadastre clientes, produtos ou serviços e faça a primeira emissão em ambiente de homologação.',
    },
    {
      title: 'Documentos emitidos',
      text: 'Minhas notas reúne documentos emitidos e rascunhos em andamento.',
    },
  ];

  return (
    <div className="saas-admin-light min-h-screen bg-background text-foreground" style={lightVars}>
      <header className="saas-topbar fixed inset-x-0 top-0 z-[90] flex h-[72px] items-center border-b">
        <div className="saas-brand flex h-full w-72 shrink-0 items-center justify-center border-r px-5">
          <button
            type="button"
            className="saas-mobile-menu"
            aria-label="Abrir menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={WS_LOGO} alt="WS Emissor Fiscal" className="saas-product-logo object-contain" />
        </div>
        <div className="saas-topbar-content flex min-w-0 flex-1 items-center px-6">
          <div className="saas-page-context flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[.12em]">
              {fromAdmin ? (
                <a href="/admin" className="transition-opacity hover:opacity-70">
                  ← Painel do administrador
                </a>
              ) : (
                'WS Gestão Contábil'
              )}
            </p>
            <span>
              {active === 'Emissão' && selectedDocument ? `Emissão de ${selectedDocument}` : active}
            </span>
          </div>
          <div className="saas-company-context min-w-0 flex-1 text-center">
            {organizationChoices.length > 1 ? (
              <select
                aria-label="Empresa selecionada"
                value={fromAdmin ? organization?.office_company_id || '' : organization?.id || ''}
                onChange={event => void loadOrg(event.target.value)}
              >
                <option value="" disabled>
                  {fromAdmin ? 'Selecione o emitente' : 'Selecione a empresa'}
                </option>
                {organizationChoices.map((choice: any) => (
                  <option
                    key={choice.office_company_id || choice.id}
                    value={fromAdmin ? choice.office_company_id || choice.id : choice.id}
                  >
                    {choice.name}{fromAdmin && choice.cnpj ? ` · ${formatCnpj(choice.cnpj)}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-sm font-medium">
                {organization?.name || (fromAdmin ? 'Selecione uma empresa emitente' : 'Nenhuma empresa selecionada')}
              </p>
            )}
            <p className="saas-company-tax-id mt-0.5 text-[10px] tracking-[.06em]">{profile?.tax_id ? formatCnpj(profile.tax_id) : 'CNPJ não informado'}</p>
          </div>
          <div className="flex flex-1 justify-end">
            <AccountDrawer
              darkTrigger
              avatarUrl={logoUrl}
              accessLabel={isAdmin ? 'Administrador' : 'Assinante do emissor fiscal'}
              planLabel={planLabel}
              notifications={accountNotifications}
              usageRows={[
                { label: 'Notas emitidas', value: String(emissions.length) },
                { label: 'Organização', value: organization?.name || 'Nenhuma empresa' },
              ]}
            />
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="saas-sidebar-scrim"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`saas-sidebar fixed bottom-0 left-0 top-[72px] z-50 flex w-72 flex-col border-r border-border bg-white ${
          mobileMenuOpen ? 'is-open' : ''
        }`}
      >
        <button
          type="button"
          className="saas-mobile-close"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="border-b border-border px-5 py-4">
          <button
            onClick={() => setActive('Minha Empresa')}
            className="mx-auto flex h-[104px] w-full items-center justify-center bg-transparent px-4 transition-opacity hover:opacity-80"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo da empresa"
                className="max-h-[76px] max-w-[190px] object-contain"
              />
            ) : (
              <span className="text-center text-xs font-medium text-muted-foreground">
                Adicionar logomarca
              </span>
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <section>
            <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              Visão geral
            </p>
            <NavButton icon={Home} active={active === 'Início'} onClick={() => chooseNav('Início')}>
              Início
            </NavButton>
            <NavButton
              icon={FileText}
              active={active === 'Minhas notas'}
              onClick={() => { setNotesView('issued'); chooseNav('Minhas notas'); }}
            >
              Minhas notas
            </NavButton>
          </section>
          <div className="mt-5 space-y-5">
            {groups.map(group => {
              const expanded = Boolean(openGroups[group.title]),
                groupActive = isGroupActive(group.title),
                emission = group.title.startsWith('Notas de '),
                GroupIcon = group.icon;
              return (
                <section key={group.title} className="saas-nav-group" data-tone={group.tone}>
                  <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                    {group.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenGroups(p => ({ ...p, [group.title]: !p[group.title] }))}
                    className={`flex w-full items-center gap-3 rounded-md border-l-2 px-4 py-3 text-left transition-colors ${
                      emission ? 'saas-emission-group' : 'saas-neutral-group'
                    } ${
                      groupActive
                        ? 'is-active border-[#202833] bg-[#e8edf3] text-[#111827]'
                        : emission
                        ? 'border-[#8794a5] bg-[#e9edf2] text-[#172033] hover:bg-[#e1e6ec]'
                        : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <GroupIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    <span
                      className={`flex-1 text-sm tracking-tight ${
                        emission ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {group.display}
                    </span>
                    <span className="text-xs text-muted-foreground">{expanded ? '−' : '+'}</span>
                  </button>
                  <div
                    className={`saas-nav-children ml-7 overflow-hidden border-l border-border pl-3 transition-all duration-200 ${
                      expanded ? 'mt-1 max-h-80 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {group.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          type="button"
                          key={item.label}
                          onClick={() => chooseNav(item.label)}
                          className={`saas-nav-subitem flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                            isItemActive(item.label) ? 'is-active' : ''
                          }`}
                        >
                          <ItemIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <section className="mt-5 border-t border-border pt-4">
            <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              Documentos
            </p>
            <NavButton
              icon={FolderSearch2}
              active={active === 'Gerenciar DF-e'}
              onClick={() => chooseNav('Gerenciar DF-e')}
            >
              Gerenciar DF-e
            </NavButton>
          </section>
          <section className="mt-5 border-t border-border pt-4">
            <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              Gestão
            </p>
            <NavButton
              icon={BarChart3}
              active={active === 'Relatórios'}
              onClick={() => chooseNav('Relatórios')}
            >
              Relatórios
            </NavButton>
            <NavButton
              icon={Settings2}
              active={active === 'Minha Empresa'}
              onClick={() => chooseNav('Minha Empresa')}
            >
              Minha Empresa
            </NavButton>
          </section>
        </nav>
      </aside>

      <main className="saas-main-content min-h-screen pl-72 pt-[72px]">
        <div className="mx-auto w-full max-w-[1680px] px-5 py-6 lg:px-8 xl:px-10">
          {active !== 'Emissão' && active !== 'Minhas notas' && <DraftResumeBanner drafts={drafts} onResume={resumeDraft} onAll={openDrafts} />}
          {content}
        </div>
      </main>
      {showSetup && (
        <SaasSetupGuide
          organizationId={organization.id}
          organizationName={organization?.name}
          profile={profile}
          certificateConfigured={certificateConfigured}
          emissionsCount={emissions.length}
          onOpenCompany={() => setActive('Minha Empresa')}
          onStartEmission={() => {
            setSelectedDocument(null);
            setActive('Emissão');
          }}
          onDismiss={dismissSetup}
        />
      )}
    </div>
  );
}

function NavButton({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: any;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`saas-nav-item mb-1 flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors ${
        active
          ? 'border-[#202833] bg-muted text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      <span className="text-sm font-medium tracking-tight">{children}</span>
    </button>
  );
}
