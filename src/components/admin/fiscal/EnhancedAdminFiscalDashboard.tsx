import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalData } from '@/hooks/fiscal/useFiscalData';
import { Loader2, TrendingUp, TrendingDown, FileText, RefreshCw, Calendar, BarChart3, Calculator } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiscalFeedbackHelp } from '@/components/fiscal/FiscalFeedbackHelp';
import { FiscalSEO } from '@/components/fiscal/FiscalSEO';

const COLORS = ['#F5C441', '#0b1320', '#4F46E5', '#059669', '#DC2626'];

export const EnhancedAdminFiscalDashboard = () => {
  const { fiscalSummary, loading, error, refetch, syncFiscalData } = useFiscalData();
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [periodFilter, setPeriodFilter] = useState('month');
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
      let startDate, endDate;
      const now = new Date();
      
      switch (periodFilter) {
        case 'quarter':
          startDate = startOfQuarter(now).toISOString().split('T')[0];
          endDate = endOfQuarter(now).toISOString().split('T')[0];
          break;
        case 'year':
          startDate = startOfYear(now).toISOString().split('T')[0];
          endDate = endOfYear(now).toISOString().split('T')[0];
          break;
        default:
          startDate = startOfMonth(now).toISOString().split('T')[0];
          endDate = endOfMonth(now).toISOString().split('T')[0];
      }
      
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

  // Dados simulados para gráficos
  const noteTypeData = [
    { name: 'NF-e', value: 45, count: 120 },
    { name: 'NFC-e', value: 30, count: 80 },
    { name: 'NFS-e', value: 25, count: 65 }
  ];

  const monthlyTrendData = [
    { month: 'Jan', vendas: 250000, compras: 180000 },
    { month: 'Fev', vendas: 310000, compras: 220000 },
    { month: 'Mar', vendas: 380000, compras: 280000 },
    { month: 'Abr', vendas: 420000, compras: 320000 },
    { month: 'Mai', vendas: 480000, compras: 350000 },
    { month: 'Jun', vendas: 520000, compras: 390000 }
  ];

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
    <>
      <FiscalSEO 
        title="Dashboard Fiscal Admin" 
        description="Painel administrativo para gestão e análise de dados fiscais de todas as empresas" 
        keywords="dashboard fiscal, administração, notas fiscais, análise fiscal"
      />
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy dark:text-white">Dashboard Fiscal - Admin</h1>
        <div className="flex gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(fiscalSummary.totalSalesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(fiscalSummary.totalPurchasesMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
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
              Notas processadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimativa de Impostos</CardTitle>
            <Calculator className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">
              {formatCurrency(fiscalSummary.totalSalesMonth * 0.15)}
            </div>
            <p className="text-xs text-muted-foreground">
              Placeholder - Cálculo futuro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendência de Valores
            </CardTitle>
            <CardDescription>
              Vendas vs Compras ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="vendas" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="compras" stroke="#DC2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Nota</CardTitle>
            <CardDescription>
              Percentual de notas por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={noteTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {noteTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
      
      <FiscalFeedbackHelp />
    </div>
    </>
  );
};