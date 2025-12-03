import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ClientStatusList } from "@/components/admin/lancamentos/ClientStatusList";
import { ClientLancamentosDetail } from "@/components/admin/lancamentos/ClientLancamentosDetail";
import { motion } from "framer-motion";
import { MousePointerClick } from "lucide-react";

const AdminLancamentos = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 p-1"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Lançamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe os documentos enviados pelos clientes
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Client List */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <ClientStatusList
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
            />
          </div>

          {/* Client Detail */}
          <div className="xl:col-span-8 2xl:col-span-9">
            {selectedClientId ? (
              <ClientLancamentosDetail clientId={selectedClientId} />
            ) : (
              <div className="bg-card rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MousePointerClick className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Selecione um cliente para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
