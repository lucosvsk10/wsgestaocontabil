
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { useFiscalData } from "@/hooks/fiscal/useFiscalData";

const FiscalDashboard = () => {
  const { stats, monthlyData, documentTypes, isLoading } = useFiscalData();

  const COLORS = ['#efc349', '#f59e0b', '#d97706', '#b45309'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-[#efc349]/10 to-[#efc349]/5 border-[#efc349]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#020817] dark:text-white">
              Empresas Cadastradas
            </CardTitle>
            <Building className="h-4 w-4 text-[#efc349]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#020817] dark:text-white">
              {stats.totalCompanies}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              +2 este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#020817] dark:text-white">
              Documentos Coletados
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#020817] dark:text-white">
              {stats.totalDocuments}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              +{stats.documentsThisMonth} este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#020817] dark:text-white">
              Valor Total (Mês)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#020817] dark:text-white">
              R$ {stats.totalValueThisMonth.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Vendas + Compras
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#020817] dark:text-white">
              Sincronizações
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#020817] dark:text-white">
              {stats.totalSyncs}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {stats.failedSyncs} com erro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-[#020817] dark:text-white">
              Documentos por Mês
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Evolução mensal de documentos coletados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efc349/20" />
                <XAxis 
                  dataKey="month" 
                  stroke="#020817" 
                  className="dark:stroke-white"
                />
                <YAxis 
                  stroke="#020817" 
                  className="dark:stroke-white"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#020817',
                    border: '1px solid #efc349',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="documents" fill="#efc349" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-[#020817] dark:text-white">
              Tipos de Documentos
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Distribuição por tipo de documento fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={documentTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {documentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#020817',
                    border: '1px solid #efc349',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white">
            Atividade Recente
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Últimas sincronizações e documentos coletados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#020817] dark:text-white">
                  Sincronização concluída - Empresa XYZ Ltda
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  15 documentos coletados • Há 2 horas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg">
              <div className="w-2 h-2 bg-[#efc349] rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#020817] dark:text-white">
                  Nova empresa cadastrada - ABC Comércio
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Certificado digital configurado • Há 4 horas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-[#1a1a2e] rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#020817] dark:text-white">
                  Erro na sincronização - DEF Serviços
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Certificado expirado • Há 6 horas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalDashboard;
