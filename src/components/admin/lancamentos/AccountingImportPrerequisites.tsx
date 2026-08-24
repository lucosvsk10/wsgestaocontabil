import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { CostCenter } from "@/lib/lancamentos/costCenters";
import { loadWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export function AccountingImportPrerequisites({ company }: { company: string }) {
  const [loaded, setLoaded] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [hasCostCenters, setHasCostCenters] = useState(false);
  const [dismissedCostCenters, setDismissedCostCenters] = useState(false);

  const refresh = useCallback(async () => {
    const [accounts, centers] = await Promise.all([
      loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
      loadWorkspaceData<CostCenter[]>(`${company}:cost-centers`),
    ]);
    setHasPlan(Boolean(accounts?.length));
    setHasCostCenters(Boolean(centers?.length));
    setLoaded(true);
  }, [company]);

  useEffect(() => {
    setLoaded(false);
    setDismissedCostCenters(false);
    void refresh();

    const channel = supabase
      .channel(`accounting-import-prerequisites-${company}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_workspace_data", filter: `company_key=eq.${company}` }, () => { void refresh(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [company, refresh]);

  if (!loaded) return null;

  if (!hasPlan) {
    return <div className="mt-5 flex gap-3 rounded-md border border-destructive/30 bg-destructive/[0.05] px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-foreground">Plano de Contas obrigatório para importar</p>
        <p className="mt-1 text-xs text-muted-foreground">Importe o Plano de Contas desta empresa antes de lançar Despesas, Folha de pagamento, Compras ou Faturamento. Enquanto ele não existir, nenhuma dessas importações será processada ou salva.</p>
      </div>
    </div>;
  }

  if (!hasCostCenters && !dismissedCostCenters) {
    return <div className="mt-5 flex items-start gap-3 rounded-md border border-border bg-muted/35 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Centros de custo ainda não foram importados</p>
        <p className="mt-1 text-xs text-muted-foreground">Isso é opcional e não bloqueia os lançamentos. Se a empresa utiliza C.C., é recomendado importá-los também para completar automaticamente as vinculações.</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDismissedCostCenters(true)} title="Ignorar este aviso"><X className="h-4 w-4" /></Button>
    </div>;
  }

  return null;
}
