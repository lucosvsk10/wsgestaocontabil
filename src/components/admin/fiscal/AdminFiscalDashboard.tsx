
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalData } from '@/hooks/fiscal/useFiscalData';
import { Loader2, TrendingUp, TrendingDown, FileText, RefreshCw, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export const AdminFiscalDashboard = () => {
  const { fiscalSummary, loading, error, refetch, syncFiscalData } = useFiscalData();
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const { toast } = useToast();

  const handleSync = async () => {
    if (!selectedCompany) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa para sincronizar",
        variant: "destructive"
      });
      return;
    }

    try {
      setSyncLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = subDays(new Date(), 30).toISOString().split('T')[0];
      
      const result = await syncFiscalData(selectedCompany, startDate, endDate);
      
      toast({
        title: "Sincronização concluída",
        description: `${result.processedCount} notas processadas com sucesso`,
      });
    } catch (err) {
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar dados fiscais",
        variant: "destructive"
      });
    } finally {
      setSyncLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-navy dark:text-white">Dashboard Fiscal - Admin</h1>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização de Dados</CardTitle>
          <CardDescription>
            Sincronize dados fiscais das empresas cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Empresa</label>
              <Input
                placeholder="ID da empresa..."
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSync} 
              disabled={syncLoading || !selectedCompany}
            >
              {syncLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(fiscalSummary.totalSalesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as empresas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras (Mês)</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(fiscalSummary.totalPurchasesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as empresas
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
              Notas no sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Notas Fiscais (Sistema)</CardTitle>
          <CardDescription>
            Últimas notas fiscais processadas no sistema
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
                      De: {note.issuer_cnpj} • Para: {note.recipient_cnpj}
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
