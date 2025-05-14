
import { Card, CardContent } from "@/components/ui/card";
import { ChartPie } from "lucide-react";

interface EmptySimulationsProps {
  searchTerm: string;
  timeFilter: string;
  typeFilter: string;
}

export const EmptySimulations = ({ searchTerm, timeFilter, typeFilter }: EmptySimulationsProps) => {
  return (
    <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-medium">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <ChartPie className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2 dark:text-white">Nenhuma simulação encontrada</p>
        <p className="text-muted-foreground dark:text-gray-300 text-center max-w-md">
          {searchTerm || timeFilter !== "all" || typeFilter !== "all" ? 
            "Nenhuma simulação corresponde aos filtros aplicados." : 
            "Ainda não há simulações de imposto de renda registradas."}
        </p>
      </CardContent>
    </Card>
  );
};
