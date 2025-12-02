import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { ClientStatusList } from "@/components/admin/lancamentos/ClientStatusList";
import { ClientLancamentosDetail } from "@/components/admin/lancamentos/ClientLancamentosDetail";
import { motion } from "framer-motion";

const AdminLancamentos = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Lançamentos
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os documentos enviados pelos clientes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="lg:col-span-1">
            <ClientStatusList
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
            />
          </div>

          {/* Client Detail */}
          <div className="lg:col-span-2">
            {selectedClientId ? (
              <ClientLancamentosDetail clientId={selectedClientId} />
            ) : (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
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
