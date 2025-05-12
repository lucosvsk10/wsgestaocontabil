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
      <CardHeader className="border-b border-gray-200 dark:border-navy-lighter/30 bg-navy-dark">
        <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
          Resumo do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-navy-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-navy-dark">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de clientes</p>
            <p className="text-xl font-bold text-navy dark:text-white">{clientsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-navy-dark">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de documentos</p>
            <p className="text-xl font-bold text-navy dark:text-white">{documentsCount}</p>
          </div>
          <div className="p-4 rounded-lg bg-navy-dark">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Espaço utilizado</p>
            <p className="text-xl font-bold text-navy dark:text-white">
              {storageUsed}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-navy-dark">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Versão da aplicação</p>
            <p className="text-xl font-bold text-navy dark:text-white">{appVersion}</p>
          </div>
        </div>
      </CardContent>
    </Card>;
};