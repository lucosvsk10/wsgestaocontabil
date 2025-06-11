
import React from "react";

export const ProLaboreHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extralight text-[#020817] dark:text-gold mb-4 print:text-foreground print:text-3xl md:text-3xl">
        Simulação Pró-labore
      </h1>
      <p className="text-muted-foreground font-extralight print:text-gray-600 text-lg">
        Calcule os descontos e valor líquido do seu pró-labore
      </p>
    </div>
  );
};
