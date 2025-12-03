import { useState } from "react";
import { motion } from "framer-motion";
import { DocumentUploadArea } from "@/components/lancamentos/DocumentUploadArea";
import { DocumentList } from "@/components/lancamentos/DocumentList";
import { MonthSelector } from "@/components/lancamentos/MonthSelector";
import { CloseMonthButton } from "@/components/lancamentos/CloseMonthButton";
import { MonthHistory } from "@/components/lancamentos/MonthHistory";
import { useLancamentosData } from "@/hooks/lancamentos/useLancamentosData";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FileText } from "lucide-react";

export const LancamentosSection = () => {
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      {/* Header minimalista */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-1">
          Lançamentos Mensais
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Envie seus documentos de compras, extratos e comprovantes
        </p>
      </div>

      {/* Seletor de mês */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      {/* Conteúdo principal */}
      <div className="space-y-8 mt-8">
        {/* Upload */}
        <DocumentUploadArea
          userId={user.id}
          competencia={competencia}
          onUploadComplete={refetch}
          isMonthClosed={!!fechamento}
        />

        {/* Lista de documentos */}
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          onDelete={deleteDocument}
          deletingIds={deletingIds}
        />

        {/* Status do mês - apenas visualização para cliente */}
        {documents.length > 0 && (
          <CloseMonthButton
            userId={user.id}
            competencia={competencia}
            documents={documents}
            fechamento={fechamento}
            onClose={refetch}
            isAdmin={false}
          />
        )}

        {/* Histórico */}
        <MonthHistory userId={user.id} />
      </div>
    </motion.div>
  );
};
