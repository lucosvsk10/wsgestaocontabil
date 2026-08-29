import { Building2, CreditCard, Search, ShieldCheck, UsersRound } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminPage } from "@/components/admin/ui/AdminPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AdminSubscribers = () => {
  return (
    <AdminLayout>
      <AdminPage>
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">SaaS</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assinantes</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Organizações que utilizam o produto de emissão fiscal, separadas dos clientes do escritório.</p>
            </div>
            <Button className="gap-2" disabled><Building2 size={16} /> Novo assinante</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Assinantes ativos", value: "0", icon: Building2 },
              { label: "Usuários SaaS", value: "0", icon: UsersRound },
              { label: "Assinaturas", value: "0", icon: CreditCard },
              { label: "Ambientes isolados", value: "Pronto", icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{item.label}</p><item.icon className="h-4 w-4 text-muted-foreground" /></div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
              <div><h2 className="font-semibold">Organizações assinantes</h2><p className="mt-0.5 text-xs text-muted-foreground">Esta área usará a base multi-tenant de organizações e assinaturas já preparada.</p></div>
              <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input readOnly className="pl-9" placeholder="Buscar assinante..." /></div>
            </div>
            <div className="grid min-h-64 place-items-center p-10 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Building2 size={21} /></div>
                <p className="mt-4 text-sm font-medium">Estrutura pronta para receber assinantes</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">Na próxima etapa conectamos onboarding, criação de organização, plano e gestão de equipe.</p>
              </div>
            </div>
          </div>
        </div>
      </AdminPage>
    </AdminLayout>
  );
};

export default AdminSubscribers;
