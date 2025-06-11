
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import { TaxHeader } from "@/components/tax-calculator/TaxHeader";
import { TaxForm } from "@/components/tax-calculator/TaxForm";
import { TaxResult } from "@/components/tax-calculator/TaxResult";
import { useTaxCalculation } from "@/components/tax-calculator/hooks/useTaxCalculation";

const TaxCalculator = () => {
  const {
    formData,
    resultado,
    loading,
    handleInputChange,
    calcularIRPF,
    formatCurrency
  } = useTaxCalculation();

  return (
    <div className="min-h-screen bg-background text-foreground font-prompt print:bg-white">
      <div className="print:hidden">
        <SimpleNavbar title="Simulador IRPF 2024" />
      </div>
      
      <div className="container mx-auto px-4 py-[100px] print:py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }} 
          className="max-w-4xl mx-auto"
        >
          <TaxHeader />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TaxForm
              formData={formData}
              loading={loading}
              onInputChange={handleInputChange}
              onCalculate={calcularIRPF}
            />

            {resultado && (
              <TaxResult
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

export default TaxCalculator;
