import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, FileText, Landmark, LockKeyhole, Settings2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminPage } from '@/components/admin/ui/AdminPage';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';
import { getAdminEnvironment } from '@/config/adminEnvironments';

const modules = ['Despesas', 'Folha', 'Compras', 'Faturamento'];

export default function AdminAccountingOverview() {
  const { selectedCompany, companies } = useCompanySelection();
  const environment = getAdminEnvironment('contabil');
  const competency = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <AdminLayout>
      <AdminPage className="space-y-6 pb-10">
        <section
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-6 shadow-sm sm:p-8"
          style={{ boxShadow: `inset 4px 0 0 ${environment.accent}` }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
            style={{ background: `linear-gradient(180deg, ${environment.soft}, transparent)` }}
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Ambiente Contábil
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Visão geral contábil</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Acompanhe a competência, abra os lançamentos e acesse os documentos do cliente sem misturar a rotina contábil com o restante do painel.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 lg:min-w-64">
              <small className="block text-[10px] uppercase tracking-[.12em] text-muted-foreground">Empresa ativa</small>
              <strong className="mt-1 block truncate text-sm">
                {selectedCompany?.trade_name || selectedCompany?.company_name || 'Selecione uma empresa no topo'}
              </strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {companies.length} cliente{companies.length === 1 ? '' : 's'} disponível{companies.length === 1 ? '' : 'is'}
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/admin/lancamentos"
            className="group rounded-2xl border border-border/60 bg-card/80 p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: environment.soft }}>
                <BookOpenCheck className="h-5 w-5" style={{ color: environment.accent }} strokeWidth={1.8} />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <strong className="mt-6 block text-base">Lançamentos</strong>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Despesas, folha, compras, faturamento, conferência e exportação da competência.
            </p>
          </Link>

          <Link
            to="/admin/documentos"
            className="group rounded-2xl border border-border/60 bg-card/80 p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: environment.soft }}>
                <FileText className="h-5 w-5" style={{ color: environment.accent }} strokeWidth={1.8} />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <strong className="mt-6 block text-base">Documentos do cliente</strong>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Consulte os arquivos enviados pelo cliente e mantenha a documentação próxima da execução contábil.
            </p>
          </Link>

          <article className="rounded-2xl border border-border/60 bg-card/80 p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: environment.soft }}>
                <Landmark className="h-5 w-5" style={{ color: environment.accent }} strokeWidth={1.8} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Competência</span>
            </div>
            <strong className="mt-6 block text-base capitalize">{competency}</strong>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              A seleção de mês continua dentro de Lançamentos; esta visão funciona como ponto de partida da rotina.
            </p>
          </article>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card/75 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Fluxo mensal</p>
              <h2 className="mt-1 text-lg font-semibold">Quatro frentes, uma competência</h2>
            </div>
            <span className="text-xs text-muted-foreground">A execução detalhada permanece em Lançamentos</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module, index) => (
              <div key={module} className="rounded-xl border border-border/55 bg-background/60 px-4 py-4">
                <span className="text-[10px] font-semibold text-muted-foreground">0{index + 1}</span>
                <strong className="mt-2 block text-sm">{module}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">Transcrição · Lançamento · Conferência</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link to="/admin/lancamentos/balancete" className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-4 text-sm font-medium hover:bg-muted/35">
            <Landmark className="h-4 w-4 text-muted-foreground" /> Balancete
          </Link>
          <Link to="/admin/lancamentos/plano-contas" className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-4 text-sm font-medium hover:bg-muted/35">
            <Settings2 className="h-4 w-4 text-muted-foreground" /> Plano de contas
          </Link>
          <Link to="/admin/lancamentos/engine" className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-4 text-sm font-medium hover:bg-muted/35">
            <LockKeyhole className="h-4 w-4 text-muted-foreground" /> Engine contábil
          </Link>
        </section>
      </AdminPage>
    </AdminLayout>
  );
}