
import { useState } from "react";
import { StepIndicator } from "@/components/tax-calculator/StepIndicator";
import TaxCalculatorForm from "@/components/tax-calculator/TaxCalculatorForm";

const TaxCalculator = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy dark:text-gold">Simulador de Imposto de Renda</h1>
          <p className="text-muted-foreground dark:text-gray-300 mt-2">
            Calcule seu imposto de renda e descubra se você terá imposto a pagar ou restituição
          </p>
        </div>

        <StepIndicator step={step} />
        <TaxCalculatorForm />
      </div>
    </div>
  );
};

export default TaxCalculator;
