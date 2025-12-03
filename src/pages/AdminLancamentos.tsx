import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ClientStatusList } from "@/components/admin/lancamentos/ClientStatusList";
import { ClientLancamentosDetail } from "@/components/admin/lancamentos/ClientLancamentosDetail";
import { motion } from "framer-motion";
import { FileSpreadsheet, MousePointerClick } from "lucide-react";
const AdminLancamentos = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  return <AdminLayout>
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5
    }} className="space-y-6 p-1">
        {/* Header */}
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-2xl font-light text-foreground">
              Gestão de Lançamentos
            </h1>
            <p className="text-muted-foreground text-sm">
              Acompanhe os documentos enviados pelos clientes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Client List */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <ClientStatusList selectedClientId={selectedClientId} onSelectClient={setSelectedClientId} />
          </div>

          {/* Client Detail */}
          <div className="xl:col-span-8 2xl:col-span-9">
            {selectedClientId ? <ClientLancamentosDetail clientId={selectedClientId} /> : <div className="bg-card rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <MousePointerClick className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Selecione um cliente
                </h3>
                <p className="text-xs text-muted-foreground">
                  Escolha um cliente da lista para ver os detalhes dos lançamentos
                </p>
              </div>}
          </div>
        </div>
      </motion.div>
    </AdminLayout>;
};
export default AdminLancamentos;