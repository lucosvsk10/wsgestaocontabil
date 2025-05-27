
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardDrive, FileText, Users, Download, Search, Filter, PieChart, BarChart3, Calendar } from "lucide-react";
import { useStorageStats } from "@/hooks/useStorageStats";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useState } from "react";
import { StorageDistributionChart } from "./StorageDistributionChart";
import { StorageUsageList } from "./StorageUsageList";

export const StorageView = () => {
  const { storageStats, isLoading } = useStorageStats();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("usage");
  const [filterType, setFilterType] = useState("all");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const usedPercentage = storageStats ? (storageStats.totalStorageMB / 100) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
              Gerenciamento de Armazenamento
            </h1>
            <p className="text-gray-600 dark:text-[#b3b3b3]">
              Monitore o uso de espaço e gerencie documentos do sistema
            </p>
          </div>
          <Button className="bg-[#020817] border border-[#efc349] text-white dark:bg-transparent dark:border-[#efc349] dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10">
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-[#0b0f1c] border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
                <HardDrive className="h-5 w-5" />
                Espaço Utilizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {storageStats ? formatSize(storageStats.totalStorageBytes) : "0 B"}
                </div>
                <Progress value={usedPercentage} className="h-2" />
                <p className="text-sm text-gray-600 dark:text-[#b3b3b3]">
                  {usedPercentage.toFixed(1)}% de 100 MB utilizados
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#0b0f1c] border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
                <FileText className="h-5 w-5" />
                Total de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                {storageStats ? storageStats.userStorage.length : 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-[#b3b3b3] mt-2">
                Arquivos no sistema
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#0b0f1c] border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
                <Users className="h-5 w-5" />
                Usuários Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                {storageStats ? storageStats.userStorage.filter(u => u.sizeBytes > 0).length : 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-[#b3b3b3] mt-2">
                Com documentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usage">Maior uso</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="recent">Mais recente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-48 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="irpf">IRPF</SelectItem>
              <SelectItem value="contracts">Contratos</SelectItem>
              <SelectItem value="certificates">Certidões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white dark:bg-[#0b0f1c] border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
                <PieChart className="h-5 w-5" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StorageDistributionChart />
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#0b0f1c] border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
                <BarChart3 className="h-5 w-5" />
                Maiores Consumidores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StorageUsageList 
                userStorage={storageStats?.userStorage || []}
                searchTerm={searchTerm}
                sortBy={sortBy}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
