
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import { ProLaboreHeader } from "@/components/calculators/ProLaboreHeader";
import { ProLaboreForm } from "@/components/calculators/ProLaboreForm";
import { ProLaboreResult } from "@/components/calculators/ProLaboreResult";
import { useProLaboreCalculation } from "@/components/calculators/hooks/useProLaboreCalculation";

const ProLaboreCalculator = () => {
  const {
    valorBruto,
    setValorBruto,
    resultado,
    loading,
    calcularProLabore,
    formatCurrency,
    resetForm
  } = useProLaboreCalculation();

  return (
    <div className="min-h-screen bg-background text-foreground font-prompt print:bg-white">
      <div className="print:hidden">
        <SimpleNavbar title="Simulação Pró-labore" />
      </div>
      
      <div className="container mx-auto px-4 py-[100px] print:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <ProLaboreHeader />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProLaboreForm
              valorBruto={valorBruto}
              setValorBruto={setValorBruto}
              loading={loading}
              onCalculate={calcularProLabore}
              onReset={resetForm}
            />

            {resultado && (
              <ProLaboreResult
                resultado={resultado}
                formatCurrency={formatCurrency}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProLaboreCalculator;
