
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Users, DollarSign } from "lucide-react";
import IRPFCalculator from "./IRPFCalculator";
import INSSCalculator from "./INSSCalculator";
import ProLaboreCalculator from "./ProLaboreCalculator";
import SimulationHistory from "./SimulationHistory";

export const SimulationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState("irpf");

  const calculators = [
    {
      id: "irpf",
      label: "IRPF",
      icon: <Calculator className="h-4 w-4" />,
      description: "Simulador de Imposto de Renda Pessoa Física",
    },
    {
      id: "inss",
      label: "INSS",
      icon: <Users className="h-4 w-4" />,
      description: "Calculadora de contribuição INSS",
    },
    {
      id: "prolabore",
      label: "Pró-Labore",
      icon: <DollarSign className="h-4 w-4" />,
      description: "Simulador de Pró-Labore",
    },
  ];

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
          Simulações Tributárias
        </h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">
          Acesse as calculadoras e visualize o histórico de simulações
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          {calculators.map((calc) => (
            <TabsTrigger
              key={calc.id}
              value={calc.id}
              className="flex items-center gap-2 font-extralight"
            >
              {calc.icon}
              <span className="hidden sm:inline">{calc.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="irpf" className="space-y-6">
          <IRPFCalculator />
        </TabsContent>

        <TabsContent value="inss" className="space-y-6">
          <INSSCalculator />
        </TabsContent>

        <TabsContent value="prolabore" className="space-y-6">
          <ProLaboreCalculator />
        </TabsContent>
      </Tabs>

      <SimulationHistory activeCalculator={activeTab} />
    </div>
  );
};
