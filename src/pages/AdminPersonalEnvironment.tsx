import { BriefcaseBusiness, CalendarDays, Clock3, UsersRound } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminPage } from '@/components/admin/ui/AdminPage';
import { getAdminEnvironment } from '@/config/adminEnvironments';

export default function AdminPersonalEnvironment() {
  const environment = getAdminEnvironment('pessoal');

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
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Ambiente Pessoal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Departamento Pessoal</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              O ambiente já está separado e pronto para receber as rotinas de folha, colaboradores, obrigações e RH sem contaminar a navegação dos outros setores.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-border/80 bg-card/55 p-8 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: environment.soft }}>
              <UsersRound className="h-6 w-6" style={{ color: environment.accent }} strokeWidth={1.8} />
            </span>
            <h2 className="mt-5 text-xl font-semibold">Estrutura pronta, conteúdo ainda não definido</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Quando o escopo do Departamento Pessoal for definido, as novas funções entram aqui mantendo o mesmo seletor de ambientes e a mesma conta administrativa.
            </p>
          </div>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center opacity-65">
              <BriefcaseBusiness className="mx-auto h-4 w-4 text-muted-foreground" />
              <strong className="mt-3 block text-sm">Rotinas</strong>
              <span className="mt-1 block text-[11px] text-muted-foreground">A definir</span>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center opacity-65">
              <CalendarDays className="mx-auto h-4 w-4 text-muted-foreground" />
              <strong className="mt-3 block text-sm">Agenda do DP</strong>
              <span className="mt-1 block text-[11px] text-muted-foreground">A definir</span>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center opacity-65">
              <Clock3 className="mx-auto h-4 w-4 text-muted-foreground" />
              <strong className="mt-3 block text-sm">Obrigações</strong>
              <span className="mt-1 block text-[11px] text-muted-foreground">A definir</span>
            </div>
          </div>
        </section>
      </AdminPage>
    </AdminLayout>
  );
}