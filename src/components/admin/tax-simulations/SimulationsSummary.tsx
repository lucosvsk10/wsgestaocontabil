
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxSimulation } from "@/types/tax-simulations";
import { currencyFormat } from "@/utils/taxCalculations";

interface SimulationsSummaryProps {
  simulations: TaxSimulation[];
}

const SimulationsSummary = ({ simulations }: SimulationsSummaryProps) => {
  return (
    <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
      <CardHeader className="pb-3">
        <CardTitle className="dark:text-gold">Resumo</CardTitle>
        <CardDescription className="dark:text-gray-300">
          Total de {simulations.length} simulação(ões) encontrada(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">A Pagar</p>
            <p className="text-xl font-bold text-red-500 dark:text-red-400">
              {simulations.filter(s => s.tipo_simulacao === "a pagar").length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">Restituição</p>
            <p className="text-xl font-bold text-green-500 dark:text-green-400">
              {simulations.filter(s => s.tipo_simulacao === "restituição").length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">Valor Médio</p>
            <p className="text-xl font-bold dark:text-white">
              {currencyFormat(simulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0) / simulations.length)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulationsSummary;
