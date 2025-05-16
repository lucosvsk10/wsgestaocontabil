
import React from "react";
import { Button } from "@/components/ui/button";
import { TaxResult } from "@/types/tax-simulations";
import { currencyFormat } from "@/utils/taxCalculations";

interface TaxResultDisplayProps {
  result: TaxResult;
}

const TaxResultDisplay: React.FC<TaxResultDisplayProps> = ({ result }) => {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-navy dark:text-gold mb-2">
        Resultado da Simulação
      </h2>
      <p className="text-lg text-navy/90 dark:text-white/90">
        Com base nas informações fornecidas, você teria:
      </p>
      <div className="mt-4 mb-8">
        <p className="text-3xl font-bold mb-1 text-navy dark:text-gold">
          {currencyFormat(result.total)}
        </p>
        <p className="text-lg text-navy/80 dark:text-white/80">
          a {result.tipoSimulacao}
        </p>
      </div>
    </div>
  );
};

export default TaxResultDisplay;
