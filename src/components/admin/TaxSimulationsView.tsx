
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TaxSimulationsView = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Simulações IRPF
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Gerencie simulações de Imposto de Renda
          </p>
        </div>
        <Button className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
          <Calculator className="h-4 w-4 mr-2" />
          Nova Simulação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Simulações Realizadas
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  0
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <Calculator className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Economia Média
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  R$ 0,00
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <TrendingUp className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Relatórios Gerados
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  0
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <FileBarChart className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
            Simulações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-[#b3b3b3]">
            Nenhuma simulação encontrada
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
