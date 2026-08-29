import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ChartOfAccountsWorkspace } from "@/components/admin/lancamentos/ChartOfAccountsWorkspace";
import { CostCentersWorkspace } from "@/components/admin/lancamentos/CostCentersWorkspace";
import { SpedRelationshipWorkspace } from "@/components/admin/lancamentos/SpedRelationshipWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";

export default function AdminPlanoContas() {
  const { company } = useAccountingCompany();
  return <AdminLayout>
    <div className="lancamentos-clean">
      <main className="mx-auto w-full max-w-[1720px] px-6 py-6">
        <header className="mb-6 pb-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Operação contábil</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Plano de contas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{company.tradeName || company.name}</p>
        </header>
        <Tabs defaultValue="contas" className="space-y-5">
          <TabsList className="h-10">
            <TabsTrigger value="contas">Plano de contas</TabsTrigger>
            <TabsTrigger value="centros">Centros de custo</TabsTrigger>
            <TabsTrigger value="sped">Relacionamento SPED</TabsTrigger>
          </TabsList>
          <TabsContent value="contas"><ChartOfAccountsWorkspace company={company.id} companyName={company.name} /></TabsContent>
          <TabsContent value="centros"><CostCentersWorkspace company={company.id} /></TabsContent>
          <TabsContent value="sped"><SpedRelationshipWorkspace company={company.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  </AdminLayout>;
}
