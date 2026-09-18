import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AccountDrawer from '@/components/account/AccountDrawer';
import { adminEnvironments } from '@/config/adminEnvironments';
import { useTheme } from '@/contexts/ThemeContext';

const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';

export default function AdminEnvironments() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const logo = theme === 'light' ? LIGHT_LOGO : STANDARD_LOGO;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-20 items-center justify-between border-b border-border/60 px-6 lg:px-10">
        <img src={logo} alt="WS Gestão Contábil" className="h-8 object-contain" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountDrawer
            accessLabel="Administrador"
            planLabel="Ambientes WS"
            usageRows={[{ label: 'Acesso', value: 'Todos os ambientes internos' }]}
          />
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Painel do Administrador
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Onde você vai trabalhar agora?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            A conta é a mesma. O que muda é o contexto: cada ambiente abre apenas as ferramentas daquela rotina e mantém uma identidade própria dentro do Painel WS.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {adminEnvironments.map(environment => {
            const Icon = environment.icon;
            return (
              <button
                key={environment.id}
                type="button"
                onClick={() => navigate(environment.route)}
                className="group relative min-h-[220px] overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-6 text-left transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md sm:p-7"
                style={{ boxShadow: `inset 4px 0 0 ${environment.accent}` }}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-80"
                  style={{ background: `linear-gradient(180deg, ${environment.soft}, transparent)` }}
                />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-2xl"
                      style={{ background: environment.soft }}
                    >
                      <Icon className="h-6 w-6" style={{ color: environment.accent }} strokeWidth={1.75} />
                    </span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-auto pt-8">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{environment.title}</h2>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em]"
                        style={{ color: environment.accent, background: environment.soft }}
                      >
                        {environment.summary}
                      </span>
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      {environment.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Os ambientes compartilham login e segurança, mas não misturam navegação.</span>
          <span>Você pode trocar de ambiente pela sidebar a qualquer momento.</span>
        </div>
      </section>
    </main>
  );
}