import { useState } from "react";
import { motion } from "framer-motion";
import { ClientDashboardLayout } from "@/components/client/dashboard/ClientDashboardLayout";
import { DocumentUploadArea } from "@/components/lancamentos/DocumentUploadArea";
import { DocumentList } from "@/components/lancamentos/DocumentList";
import { MonthSelector } from "@/components/lancamentos/MonthSelector";
import { CloseMonthButton } from "@/components/lancamentos/CloseMonthButton";
import { MonthHistory } from "@/components/lancamentos/MonthHistory";
import { useLancamentosData } from "@/hooks/lancamentos/useLancamentosData";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ClientLancamentos = () => {
  const [activeTab, setActiveTab] = useState("lancamentos");
  const { user } = useAuth();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const competencia = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  
  const {
    documents,
    fechamento,
    isLoading,
    deletingIds,
    deleteDocument,
    refetch
  } = useLancamentosData(user?.id, competencia);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ClientDashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto space-y-8 pb-8"
      >
        {/* Header - Minimalista */}
        <div className="text-center space-y-1 pt-4">
          <h1 className="text-xl font-semibold text-foreground">
            Lançamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Envie seus documentos mensais
          </p>
        </div>

        {/* Month Selector */}
        <MonthSelector
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />

        {/* Main Content Card */}
        <div className="space-y-6 p-6 rounded-2xl bg-card/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
          {/* Upload */}
          <DocumentUploadArea
            userId={user.id}
            competencia={competencia}
            onUploadComplete={refetch}
            isMonthClosed={!!fechamento}
          />

          {/* Separator */}
          {documents.length > 0 && (
            <div className="border-t border-gray-100 dark:border-white/5" />
          )}

          {/* Documents */}
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            onDelete={deleteDocument}
            deletingIds={deletingIds}
          />

          {/* Status do mês - apenas visualização para cliente */}
          {documents.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-white/5" />
              <CloseMonthButton
                userId={user.id}
                competencia={competencia}
                documents={documents}
                fechamento={fechamento}
                onClose={refetch}
                isAdmin={false}
              />
            </>
          )}
        </div>

        {/* History */}
        <MonthHistory userId={user.id} />
      </motion.div>
    </ClientDashboardLayout>
  );
};

export default ClientLancamentos;
