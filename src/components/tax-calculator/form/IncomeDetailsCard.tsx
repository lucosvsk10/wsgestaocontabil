
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from './CurrencyInput';
import { RetirementStatus } from './RetirementStatus';
import { TaxDeclarationType } from './TaxDeclarationType';

export const IncomeDetailsCard: React.FC = () => {
  return (
    <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-md bg-white dark:bg-navy-deeper">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold dark:text-gold mb-4">Rendimentos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CurrencyInput 
            name="rendimentosTributaveis" 
            label="Rendimentos Tributáveis" 
            required={true} 
          />
          
          <CurrencyInput 
            name="rendimentosIsentos" 
            label="Rendimentos Isentos" 
          />
          
          <CurrencyInput 
            name="impostoRetidoFonte" 
            label="Imposto Retido na Fonte" 
          />

          <RetirementStatus />
        </div>
        
        <div className="mt-6">
          <TaxDeclarationType />
        </div>
      </CardContent>
    </Card>
  );
};
