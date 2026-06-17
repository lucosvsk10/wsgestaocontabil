import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ClientLancamentosDetail } from "@/components/admin/lancamentos/ClientLancamentosDetail";
import { CompanySelectorTop } from "@/components/admin/lancamentos/CompanySelectorTop";
import { LancamentoModulesGrid } from "@/components/admin/lancamentos/LancamentoModulesGrid";
import { FolhaPagamentoDetail } from "@/components/admin/lancamentos/folha/FolhaPagamentoDetail";
import { ComprasDetail } from "@/components/admin/lancamentos/compras/ComprasDetail";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "admin.lancamentos.selectedClientId";

type View = "hub" | "despesas" | "folha" | "compras";

const AdminLancamentos = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [view, setView] = useState<View>("hub");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedClientId(stored);
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", selectedClientId)
        .maybeSingle();
      if (cancelled) return;
      setSelectedClientName(data?.name || data?.email || "Empresa");
    })();
    return () => { cancelled = true; };
  }, [selectedClientId]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    localStorage.setItem(STORAGE_KEY, clientId);
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 p-1"
      >
        <div className="text-center">
          <h1 className="text-2xl font-light text-foreground">Gestão de Lançamentos</h1>
          <p className="text-muted-foreground text-sm">
            {view === "hub"
              ? "Selecione a empresa e o módulo desejado"
              : view === "despesas"
              ? "Lançamentos de despesas da empresa selecionada"
              : view === "folha"
              ? "Folha de pagamento da empresa selecionada"
              : "Compras (Registro de Entradas por CFOP)"}
          </p>
        </div>

        <CompanySelectorTop
          selectedClientId={selectedClientId}
          selectedClientName={selectedClientName}
          onSelectClient={handleSelectClient}
        />

        {view === "hub" ? (
          <div className="max-w-5xl mx-auto w-full pt-2">
            <LancamentoModulesGrid
              disabled={!selectedClientId}
              onOpenDespesas={() => selectedClientId && setView("despesas")}
              onOpenFolha={() => selectedClientId && setView("folha")}
              onOpenCompras={() => selectedClientId && setView("compras")}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-start">
              <Button variant="ghost" size="sm" onClick={() => setView("hub")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar aos módulos
              </Button>
            </div>
            {selectedClientId && view === "despesas" && (
              <ClientLancamentosDetail clientId={selectedClientId} />
            )}
            {selectedClientId && view === "folha" && (
              <FolhaPagamentoDetail
                clientId={selectedClientId}
                clientName={selectedClientName || "Empresa"}
              />
            )}
            {selectedClientId && view === "compras" && (
              <ComprasDetail
                clientId={selectedClientId}
                clientName={selectedClientName || "Empresa"}
              />
            )}
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
