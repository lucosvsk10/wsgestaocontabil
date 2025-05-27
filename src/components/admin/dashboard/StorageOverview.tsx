
import { HardDrive, FileText, Users, BarChart3, Download, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStorageStats } from "@/hooks/useStorageStats";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useEffect } from "react";

interface StorageOverviewProps {
  documents?: any[];
  users?: any[];
}

export const StorageOverview = ({ documents = [], users = [] }: StorageOverviewProps) => {
  const { storageStats, isLoading, fetchStorageStats } = useStorageStats();

  useEffect(() => {
    fetchStorageStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const totalStorageMB = storageStats?.totalStorageMB || 0;
  const storageLimitMB = 100;
  const usagePercentage = (totalStorageMB / storageLimitMB) * 100;
  const remainingMB = Math.max(0, storageLimitMB - totalStorageMB);

  // Mock data for categories - you can replace with real data
  const categoryData = [
    { name: "IRPF", size: totalStorageMB * 0.4, color: "#3b82f6" },
    { name: "Contratos", size: totalStorageMB * 0.25, color: "#10b981" },
    { name: "Certidões", size: totalStorageMB * 0.2, color: "#f59e0b" },
    { name: "Outros", size: totalStorageMB * 0.15, color: "#ef4444" }
  ];

  const topUsers = storageStats?.userStorage?.slice(0, 5) || [];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Gerenciamento de Armazenamento
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Visão detalhada do uso de armazenamento e documentos do sistema
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-transparent border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Espaço Utilizado
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {totalStorageMB.toFixed(1)} MB
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <HardDrive className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Total de Documentos
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {documents.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <FileText className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Usuários Ativos
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {users.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <Users className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] mb-1">
                  Espaço Disponível
                </p>
                <p className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {remainingMB.toFixed(1)} MB
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10">
                <BarChart3 className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              Uso do Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-[#b3b3b3]">
                  {totalStorageMB.toFixed(1)} MB de {storageLimitMB} MB usados
                </span>
                <span className="text-[#020817] dark:text-[#f4f4f4]">
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className="h-3 bg-gray-200 dark:bg-[#020817]"
              />
              {usagePercentage > 80 && (
                <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Espaço quase esgotado</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                    {category.size.toFixed(1)} MB
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
              Usuários com Maior Uso
            </CardTitle>
            <Select>
              <SelectTrigger className="w-48 bg-transparent border-[#efc349]/30">
                <SelectValue placeholder="Filtrar por período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#020817]/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#efc349]/20 flex items-center justify-center">
                    <span className="text-sm font-extralight text-[#020817] dark:text-[#efc349]">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-extralight text-[#020817] dark:text-[#f4f4f4]">
                      Usuário {user.userId?.substring(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                      {user.documentCount} documentos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extralight text-[#020817] dark:text-[#f4f4f4]">
                    {user.sizeMB.toFixed(1)} MB
                  </p>
                  <Badge 
                    variant="outline" 
                    className="text-xs border-[#efc349] text-[#efc349]"
                  >
                    {((user.sizeMB / totalStorageMB) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
