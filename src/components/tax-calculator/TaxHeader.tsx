
import React from "react";

export const TaxHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extralight text-[#020817] dark:text-gold mb-4 print:text-foreground print:text-3xl md:text-3xl">
        Simulador IRPF 
      </h1>
      <p className="text-muted-foreground font-extralight print:text-gray-600 text-lg">
        Calcule seu Imposto de Renda com base na tabela oficial da Receita Federal
      </p>
    </div>
  );
};
