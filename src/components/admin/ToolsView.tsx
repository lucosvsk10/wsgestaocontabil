
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ToolsView = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Ferramentas Administrativas
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Acesse ferramentas úteis para administração
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadoras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-[#b3b3b3] mb-4">
              Acesse calculadoras fiscais e tributárias
            </p>
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Acessar
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-[#b3b3b3] mb-4">
              Gere relatórios personalizados
            </p>
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Gerar
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-[#b3b3b3] mb-4">
              Configure parâmetros do sistema
            </p>
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Configurar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
