import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { ConciliacaoStats as StatsType } from '@/types/conciliacao';

interface ConciliacaoStatsProps {
  stats: StatsType;
}

export const ConciliacaoStats = ({ stats }: ConciliacaoStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {stats.totalTransacoes}
              </p>
            </div>
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400">Pendentes de Comprovante</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-500 mt-2">
                {stats.pendentesComprovante}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-400">Conciliados</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">
                {stats.conciliados}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
