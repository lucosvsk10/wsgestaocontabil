import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ChartOfAccountsWorkspace } from "@/components/admin/lancamentos/ChartOfAccountsWorkspace";
import { CompanySelector } from "@/components/admin/lancamentos/CompanySelector";
import { CostCentersWorkspace } from "@/components/admin/lancamentos/CostCentersWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";

export default function AdminPlanoContas() {
  const { company, companies, selectCompany } = useAccountingCompany();
  return <AdminLayout>
    <main className="mx-auto w-full max-w-[1720px] px-6 py-6">
      <header className="mb-6 flex items-end justify-between border-b border-border pb-5">
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Operação contábil</p><h1 className="mt-1 text-3xl font-semibold text-foreground">Plano de contas</h1></div>
        <CompanySelector company={company} companies={companies} onSelect={selectCompany} />
      </header>
      <Tabs defaultValue="contas" className="space-y-5">
        <TabsList className="h-10">
          <TabsTrigger value="contas">Plano de contas</TabsTrigger>
          <TabsTrigger value="centros">Centros de custo</TabsTrigger>
        </TabsList>
        <TabsContent value="contas"><ChartOfAccountsWorkspace company={company.id} companyName={company.name} /></TabsContent>
        <TabsContent value="centros"><CostCentersWorkspace company={company.id} /></TabsContent>
      </Tabs>
    </main>
  </AdminLayout>;
}
