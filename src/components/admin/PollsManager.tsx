
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PollsManager = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Gerenciamento de Enquetes
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Crie e gerencie enquetes para seus clientes
          </p>
        </div>
        <Button className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
          <Plus className="h-4 w-4 mr-2" />
          Nova Enquete
        </Button>
      </div>

      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Enquetes Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-[#b3b3b3]">
            Nenhuma enquete encontrada
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
