
import React from "react";

export const INSSHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-extralight text-[#020817] dark:text-gold mb-4 print:text-foreground print:text-3xl md:text-3xl">
        Calculadora INSS
      </h1>
      <p className="text-muted-foreground font-extralight print:text-gray-600 text-lg">
        Calcule sua contribuição para o INSS conforme sua categoria
      </p>
    </div>
  );
};
