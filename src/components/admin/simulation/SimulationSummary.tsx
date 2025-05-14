
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { currencyFormat } from "@/utils/taxCalculations";
import { TaxSimulation } from "@/types/taxSimulation";

interface SimulationSummaryProps {
  filteredSimulations: TaxSimulation[];
}

export const SimulationSummary = ({ filteredSimulations }: SimulationSummaryProps) => {
  return (
    <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
      <CardHeader className="pb-3">
        <CardTitle className="dark:text-gold">Resumo</CardTitle>
        <CardDescription className="dark:text-gray-300">
          Total de {filteredSimulations.length} simulação(ões) encontrada(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">A Pagar</p>
            <p className="text-xl font-bold text-red-500 dark:text-red-400">
              {filteredSimulations.filter(s => s.tipo_simulacao === "a pagar").length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">Restituição</p>
            <p className="text-xl font-bold text-green-500 dark:text-green-400">
              {filteredSimulations.filter(s => s.tipo_simulacao === "restituição").length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">Valor Médio</p>
            <p className="text-xl font-bold dark:text-white">
              {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0) / filteredSimulations.length || 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-navy-dark rounded-xl p-4 text-center border border-gray-100 dark:border-navy-lighter/20 shadow-sm">
            <p className="text-sm font-medium mb-1 dark:text-gray-300">Rendimento Médio</p>
            <p className="text-xl font-bold dark:text-white">
              {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.rendimento_bruto, 0) / filteredSimulations.length || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
