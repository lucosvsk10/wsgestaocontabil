import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface SystemSummaryProps {
  clientsCount: number;
  documentsCount: number;
  storageUsed: string;
  appVersion: string;
}
export const SystemSummary = ({
  clientsCount,
  documentsCount,
  storageUsed,
  appVersion
}: SystemSummaryProps) => {
  return <Card className="bg-white dark:bg-navy-medium border border-gray-200 dark:border-navy-lighter/30">
      <CardHeader className="border-b border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-dark">
        <CardTitle className="text-lg font-semibold text-navy-dark dark:text-gold">
          Resumo do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-white dark:bg-navy-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-dark border border-gray-100 dark:border-navy-lighter/30">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de clientes</p>
            <p className="text-xl font-bold text-navy-dark dark:text-white">{clientsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-dark border border-gray-100 dark:border-navy-lighter/30">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de documentos</p>
            <p className="text-xl font-bold text-navy-dark dark:text-white">{documentsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-dark border border-gray-100 dark:border-navy-lighter/30">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Espaço utilizado</p>
            <p className="text-xl font-bold text-navy-dark dark:text-white">
              {storageUsed}
            </p>
          </div>
          
        </div>
      </CardContent>
    </Card>;
};