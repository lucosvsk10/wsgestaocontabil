
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import TaxCalculatorForm from "@/components/tax-calculator/TaxCalculatorForm";

const TaxCalculator = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy dark:text-gold">Simulador de Imposto de Renda</h1>
          <p className="text-muted-foreground dark:text-gray-300 mt-2">
            Calcule seu imposto de renda e descubra se você terá imposto a pagar ou restituição
          </p>
        </div>

        <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-lg dark:bg-navy-deeper overflow-hidden">
          <CardContent className="p-0">
            <TaxCalculatorForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaxCalculator;
