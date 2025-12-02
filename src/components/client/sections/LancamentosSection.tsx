import { useState } from "react";
import { motion } from "framer-motion";
import { DocumentUploadArea } from "@/components/lancamentos/DocumentUploadArea";
import { DocumentList } from "@/components/lancamentos/DocumentList";
import { MonthSelector } from "@/components/lancamentos/MonthSelector";
import { CloseMonthButton } from "@/components/lancamentos/CloseMonthButton";
import { MonthHistory } from "@/components/lancamentos/MonthHistory";
import { useLancamentosData } from "@/hooks/lancamentos/useLancamentosData";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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
    refetch
  } = useLancamentosData(user?.id, competencia);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Lançamentos Mensais
        </h1>
        <p className="text-muted-foreground">
          Envie seus documentos de compras, extratos e comprovantes
        </p>
      </div>

      {/* Month Selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      {/* Upload Area */}
      <DocumentUploadArea
        userId={user.id}
        competencia={competencia}
        onUploadComplete={refetch}
        isMonthClosed={!!fechamento}
      />

      {/* Document List */}
      <DocumentList
        documents={documents}
        isLoading={isLoading}
      />

      {/* Close Month Button */}
      <CloseMonthButton
        userId={user.id}
        competencia={competencia}
        documents={documents}
        fechamento={fechamento}
        onClose={refetch}
      />

      {/* Month History */}
      <MonthHistory userId={user.id} />
    </motion.div>
  );
};
