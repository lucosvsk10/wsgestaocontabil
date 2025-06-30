
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFiscalData } from '@/hooks/fiscal/useFiscalData';
import { Loader2, TrendingUp, TrendingDown, FileText, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FiscalDashboard = () => {
  const { fiscalSummary, loading, error, refetch } = useFiscalData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy dark:text-white">Dashboard Fiscal</h1>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(fiscalSummary.totalSalesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Notas fiscais emitidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(fiscalSummary.totalPurchasesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Notas fiscais recebidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Notas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {fiscalSummary.totalNotes}
            </div>
            <p className="text-xs text-muted-foreground">
              Notas no mês atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Notas Fiscais</CardTitle>
          <CardDescription>
            Últimas notas fiscais processadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fiscalSummary.recentNotes.length > 0 ? (
            <div className="space-y-4">
              {fiscalSummary.recentNotes.map((note) => (
                <div 
                  key={note.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{note.note_type}</span>
                      <span className="text-sm text-muted-foreground">
                        {note.access_key.slice(-8)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(note.issue_date), 'dd/MM/yyyy', { locale: ptBR })} • 
                      CNPJ: {note.issuer_cnpj}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-lg">
                      {formatCurrency(note.value)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {note.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma nota fiscal encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
