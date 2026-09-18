import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileSearch, Send } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AccountDrawer from '@/components/account/AccountDrawer';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { adminEnvironments } from '@/config/adminEnvironments';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';

export default function AdminEnvironments({ fiscalModal = false }: { fiscalModal?: boolean }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [openingIssuer, setOpeningIssuer] = useState(false);
  const logo = theme === 'light' ? LIGHT_LOGO : STANDARD_LOGO;

  const openIssuer = async () => {
    if (openingIssuer) return;
    setOpeningIssuer(true);
    try {
      const { data } = await (supabase as any)
        .from('saas_subscriptions')
        .select('organization_id,status,trial_ends_at,access_expires_at,saas_plans(product_code)')
        .in('status', ['trialing', 'active', 'past_due'])
        .order('created_at', { ascending: false });

      const now = Date.now();
      const issuer = (data || []).find((row: any) => {
        const plan = Array.isArray(row.saas_plans) ? row.saas_plans[0] : row.saas_plans;
        if (plan?.product_code !== 'issuer') return false;
        const boundary = row.status === 'trialing' ? row.trial_ends_at : row.access_expires_at;
        return !boundary || new Date(boundary).getTime() > now;
      });

      if (issuer?.organization_id) {
        localStorage.setItem('ws_saas_selected_organization', String(issuer.organization_id));
      }
    } finally {
      navigate('/app?source=admin-fiscal');
      setOpeningIssuer(false);
    }
  };

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
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Painel do Administrador
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Escolha o ambiente de trabalho
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Cada ambiente mantém apenas as ferramentas da sua área. Você pode trocar de ambiente a qualquer momento.
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
                className="group min-h-[190px] rounded-2xl border border-border bg-card p-6 text-left transition hover:border-foreground/30 hover:bg-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.7} />
                  {environment.status ? (
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                      {environment.status}
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  )}
                </div>
                <h2 className="mt-8 text-lg font-semibold">{environment.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {environment.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <Dialog
        open={fiscalModal}
        onOpenChange={open => {
          if (!open) navigate('/admin/ambientes');
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Ambiente Fiscal</DialogTitle>
          <DialogDescription>
            Escolha qual ferramenta fiscal deseja abrir com a conta administrativa atual.
          </DialogDescription>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={openingIssuer}
              onClick={() => void openIssuer()}
              className="rounded-2xl border border-border bg-background p-5 text-left transition hover:bg-muted/40 disabled:opacity-60"
            >
              <Send className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
              <strong className="mt-6 block text-base">Emissor Fiscal</strong>
              <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                Emissão, cadastros, histórico e gestão dos documentos fiscais.
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/extrator?source=admin-fiscal')}
              className="rounded-2xl border border-border bg-background p-5 text-left transition hover:bg-muted/40"
            >
              <FileSearch className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
              <strong className="mt-6 block text-base">Extrator Fiscal</strong>
              <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                Consulta, organização, visualização e download de compras e vendas.
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
