
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SystemSummaryProps {
  statistics: {
    totalUsers: number;
    totalDocuments: number;
    storageUsed: string;
    fiscalEvents: number;
    newUsersThisMonth: number;
  };
}

export const SystemSummary = ({ statistics }: SystemSummaryProps) => {
  return (
    <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
      <CardHeader className="bg-white dark:bg-[#0b1320]">
        <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
          Resumo do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-white dark:bg-[#0b1320] space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#e6e6e6] dark:border-[#efc349]/20">
            <div>
              <p className="text-sm font-extralight text-gray-600 dark:text-gray-300">Status do Sistema</p>
              <p className="font-extralight text-[#020817] dark:text-white">Operacional</p>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              Online
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#e6e6e6] dark:border-[#efc349]/20">
            <div>
              <p className="text-sm font-extralight text-gray-600 dark:text-gray-300">Novos Usuários (Mês)</p>
              <p className="font-extralight text-[#020817] dark:text-white">{statistics.newUsersThisMonth}</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-extralight">+12%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#e6e6e6] dark:border-[#efc349]/20">
            <div>
              <p className="text-sm font-extralight text-gray-600 dark:text-gray-300">Armazenamento Usado</p>
              <p className="font-extralight text-[#020817] dark:text-white">{statistics.storageUsed}</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-extralight">+5%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
