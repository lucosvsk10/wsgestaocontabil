import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, FileSearch, ReceiptText, Send, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminPage } from '@/components/admin/ui/AdminPage';
import { getAdminEnvironment } from '@/config/adminEnvironments';
import { supabase } from '@/integrations/supabase/client';

type FiscalWorkspaceState = {
  loading: boolean;
  issuerOrganizationId: string | null;
  issuerConfigured: boolean;
  extractorAccountId: string | null;
  extractorCompanies: number;
};

const initialState: FiscalWorkspaceState = {
  loading: true,
  issuerOrganizationId: null,
  issuerConfigured: false,
  extractorAccountId: null,
  extractorCompanies: 0,
};

export default function AdminFiscalOverview() {
  const navigate = useNavigate();
  const environment = getAdminEnvironment('fiscal');
  const [state, setState] = useState<FiscalWorkspaceState>(initialState);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: rows, error } = await (supabase as any)
        .from('admin_product_workspaces')
        .select('product_code,organization_id,extractor_account_id,status')
        .eq('status', 'active');

      if (!active) return;
      if (error) {
        setState({ ...initialState, loading: false });
        return;
      }

      const issuer = (rows || []).find((row: any) => row.product_code === 'issuer');
      const extractor = (rows || []).find((row: any) => row.product_code === 'extractor');

      const [issuerProfile, extractorCount] = await Promise.all([
        issuer?.organization_id
          ? (supabase as any)
              .from('saas_company_fiscal_profiles')
              .select('id,tax_id')
              .eq('organization_id', issuer.organization_id)
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        extractor?.extractor_account_id
          ? (supabase as any)
              .from('extractor_companies')
              .select('id', { count: 'exact', head: true })
              .eq('account_id', extractor.extractor_account_id)
              .eq('status', 'active')
          : Promise.resolve({ count: 0 }),
      ]);

      if (!active) return;
      setState({
        loading: false,
        issuerOrganizationId: issuer?.organization_id || null,
        issuerConfigured: Boolean((issuerProfile as any)?.data?.tax_id),
        extractorAccountId: extractor?.extractor_account_id || null,
        extractorCompanies: Number((extractorCount as any)?.count || 0),
      });
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const openIssuer = () => {
    if (!state.issuerOrganizationId) return;
    localStorage.setItem('ws_saas_selected_organization', state.issuerOrganizationId);
    navigate('/app?source=admin-fiscal&workspace=issuer');
  };

  const openExtractor = () => {
    if (!state.extractorAccountId) return;
    localStorage.setItem('ws_internal_extractor_account_id', state.extractorAccountId);
    navigate('/extrator?source=admin-fiscal&workspace=extractor');
  };

  const readyProducts = Number(Boolean(state.issuerOrganizationId)) + Number(Boolean(state.extractorAccountId));

  return (
    <AdminLayout>
      <AdminPage className="space-y-6 pb-10">
        <section
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-6 shadow-sm sm:p-8"
          style={{ boxShadow: `inset 4px 0 0 ${environment.accent}` }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
            style={{ background: `linear-gradient(180deg, ${environment.soft}, transparent)` }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Centro Fiscal WS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Emissor e Extrator, uma conta interna</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Este ambiente usa workspaces internos da WS. Não depende de trial, assinatura do Mercado Pago ou das contas criadas para teste.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs font-medium">
                <ShieldCheck className="h-4 w-4" style={{ color: environment.accent }} />
                Acesso administrativo integral
              </span>
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                Sem cobrança interna
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <button
            type="button"
            onClick={openIssuer}
            disabled={state.loading || !state.issuerOrganizationId}
            className="group min-h-[270px] rounded-3xl border border-border/60 bg-card/85 p-6 text-left transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: environment.soft }}>
                <Send className="h-6 w-6" style={{ color: environment.accent }} strokeWidth={1.7} />
              </span>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Produto fiscal</p>
            <h2 className="mt-1 text-xl font-semibold">Emissor Fiscal</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Entre no painel completo de emissão com NF-e, NFC-e, NFS-e, CT-e, MDF-e, cadastros e histórico.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/60 px-3 py-1.5">Conta interna WS</span>
              <span className="rounded-full border border-border/60 px-3 py-1.5 text-muted-foreground">
                {state.loading ? 'Verificando...' : state.issuerConfigured ? 'Empresa fiscal configurada' : 'Pronto para configurar'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={openExtractor}
            disabled={state.loading || !state.extractorAccountId}
            className="group min-h-[270px] rounded-3xl border border-border/60 bg-card/85 p-6 text-left transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: environment.soft }}>
                <FileSearch className="h-6 w-6" style={{ color: environment.accent }} strokeWidth={1.7} />
              </span>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Produto fiscal</p>
            <h2 className="mt-1 text-xl font-semibold">Extrator Fiscal</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Entre no painel completo de empresas, compras, vendas, XML, relatórios, histórico e downloads em lote.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/60 px-3 py-1.5">Conta interna WS</span>
              <span className="rounded-full border border-border/60 px-3 py-1.5 text-muted-foreground">
                {state.loading ? 'Verificando...' : `${state.extractorCompanies} empresa${state.extractorCompanies === 1 ? '' : 's'}`} 
              </span>
            </div>
          </button>
        </div>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-border/60 bg-card/75 p-5">
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            <strong className="mt-4 block text-2xl font-semibold">{state.loading ? '—' : readyProducts}</strong>
            <span className="mt-1 block text-xs text-muted-foreground">produtos internos disponíveis</span>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/75 p-5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <strong className="mt-4 block text-2xl font-semibold">{state.loading ? '—' : state.extractorCompanies}</strong>
            <span className="mt-1 block text-xs text-muted-foreground">empresas no novo Extrator interno</span>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/75 p-5">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <strong className="mt-4 block text-base font-semibold">Isolado dos testes</strong>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Mercado Pago e contas de teste continuam separados.</span>
          </article>
        </section>
      </AdminPage>
    </AdminLayout>
  );
}