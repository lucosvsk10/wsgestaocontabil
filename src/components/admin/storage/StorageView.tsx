
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { StorageUsageSummary } from "./StorageUsageSummary";
import { StorageDistributionChart } from "./StorageDistributionChart";
import { StorageUsageList } from "./StorageUsageList";
import { StorageDetailsTable } from "./StorageDetailsTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatSize } from "@/utils/storage/formatSize";

interface StorageViewProps {
  documents: any[];
  users: any[];
}

export const StorageView = ({ documents, users }: StorageViewProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [storageData, setStorageData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const processStorageData = async () => {
      try {
        // Fetch documents with category information
        const { data: documentsWithCategories, error } = await supabase
          .from('documents')
          .select(`
            *,
            users!inner(name, email),
            document_categories!inner(name, color)
          `);

        if (error) {
          console.error('Error fetching documents with categories:', error);
          return;
        }

        // Process user storage data
        const userStorageMap = new Map();
        documentsWithCategories?.forEach(doc => {
          const userId = doc.user_id;
          const userInfo = doc.users;
          const size = doc.size || 0;
          
          if (!userStorageMap.has(userId)) {
            userStorageMap.set(userId, {
              userId,
              userName: userInfo?.name || userInfo?.email || 'Usuário desconhecido',
              totalSize: 0,
              documentCount: 0,
              documents: []
            });
          }
          
          const userData = userStorageMap.get(userId);
          userData.totalSize += size;
          userData.documentCount += 1;
          userData.documents.push(doc);
        });

        // Process category data
        const categoryMap = new Map();
        documentsWithCategories?.forEach(doc => {
          const category = doc.document_categories?.name || 'Outros';
          const size = doc.size || 0;
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              name: category,
              value: size,
              color: doc.document_categories?.color || '#6B7280'
            });
          } else {
            const categoryData = categoryMap.get(category);
            categoryData.value += size;
          }
        });

        setStorageData(Array.from(userStorageMap.values()));
        setCategoryData(Array.from(categoryMap.values()));

      } catch (error) {
        console.error('Error processing storage data:', error);
      }
    };

    processStorageData();
  }, [documents]);

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const csvHeader = 'Usuário,Total de Documentos,Tamanho Total (MB),Última Atividade\n';
      const csvRows = storageData.map(user => {
        const latestDoc = user.documents.sort((a: any, b: any) => 
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )[0];
        
        const sizeInMB = (user.totalSize / (1024 * 1024)).toFixed(2);
        const lastActivity = latestDoc ? new Date(latestDoc.uploaded_at).toLocaleDateString('pt-BR') : 'N/A';
        
        return `${user.userName},${user.documentCount},${sizeInMB},${lastActivity}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_armazenamento_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Relatório exportado",
        description: "O relatório de armazenamento foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalStorage = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-white">
            Armazenamento
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-extralight mt-2">
            Análise do uso de armazenamento e distribuição de documentos
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleExportReport}
            disabled={isExporting}
            className="bg-[#020817] hover:bg-[#020817]/90 text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Storage Summary */}
      <div className="text-center p-6 bg-white dark:bg-[#0b1320] rounded-lg border border-[#e6e6e6] dark:border-[#efc349]/20 shadow-md">
        <h3 className="text-lg font-extralight text-[#020817] dark:text-[#efc349] mb-3">
          Uso Total de Armazenamento
        </h3>
        <p className="text-3xl font-extralight text-[#020817] dark:text-white">
          {formatSize(totalStorage)}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Total de Documentos</p>
            <p className="text-xl font-extralight text-[#020817] dark:text-white">{documents.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Total de Usuários</p>
            <p className="text-xl font-extralight text-[#020817] dark:text-white">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
          <CardHeader className="bg-white dark:bg-[#0b1320]">
            <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320]">
            <StorageDistributionChart data={categoryData} />
          </CardContent>
        </Card>

        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
          <CardHeader className="bg-white dark:bg-[#0b1320]">
            <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
              Uso por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320]">
            <StorageUsageList userStorage={storageData} searchTerm="" sortBy="usage" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
        <CardHeader className="bg-white dark:bg-[#0b1320]">
          <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
            Detalhes do Armazenamento
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white dark:bg-[#0b1320]">
          <StorageDetailsTable storageData={storageData} formatSize={formatSize} />
        </CardContent>
      </Card>
    </div>
  );
};
