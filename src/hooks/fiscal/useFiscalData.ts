
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FiscalStats {
  totalCompanies: number;
  totalDocuments: number;
  documentsThisMonth: number;
  totalValueThisMonth: number;
  totalSyncs: number;
  failedSyncs: number;
}

interface MonthlyData {
  month: string;
  documents: number;
}

interface DocumentType {
  name: string;
  value: number;
}

interface RecentActivity {
  id: string;
  type: 'sync' | 'company' | 'error';
  message: string;
  details: string;
  timestamp: string;
}

export const useFiscalData = () => {
  const [stats, setStats] = useState<FiscalStats>({
    totalCompanies: 0,
    totalDocuments: 0,
    documentsThisMonth: 0,
    totalValueThisMonth: 0,
    totalSyncs: 0,
    failedSyncs: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMonthlyData();
    fetchDocumentTypes();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch companies count
      const { count: companiesCount } = await supabase
        .from('fiscal_companies')
        .select('*', { count: 'exact', head: true });

      // Fetch documents count
      const { count: documentsCount } = await supabase
        .from('fiscal_documents')
        .select('*', { count: 'exact', head: true });

      // Fetch documents this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: documentsThisMonth } = await supabase
        .from('fiscal_documents')
        .select('*', { count: 'exact', head: true })
        .gte('data_emissao', startOfMonth.toISOString());

      // Fetch total value this month
      const { data: monthlyValues } = await supabase
        .from('fiscal_documents')
        .select('valor_total')
        .gte('data_emissao', startOfMonth.toISOString());

      const totalValueThisMonth = monthlyValues?.reduce((sum, doc) => sum + Number(doc.valor_total), 0) || 0;

      // Fetch sync stats
      const { count: totalSyncs } = await supabase
        .from('fiscal_sync_logs')
        .select('*', { count: 'exact', head: true });

      const { count: failedSyncs } = await supabase
        .from('fiscal_sync_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'erro');

      setStats({
        totalCompanies: companiesCount || 0,
        totalDocuments: documentsCount || 0,
        documentsThisMonth: documentsThisMonth || 0,
        totalValueThisMonth,
        totalSyncs: totalSyncs || 0,
        failedSyncs: failedSyncs || 0
      });
    } catch (error) {
      console.error('Error fetching fiscal stats:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const { data } = await supabase
        .from('fiscal_documents')
        .select('data_emissao')
        .order('data_emissao', { ascending: true });

      if (data && data.length > 0) {
        const monthlyStats = data.reduce((acc, doc) => {
          const month = new Date(doc.data_emissao).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(monthlyStats).map(([month, documents]) => ({
          month,
          documents
        }));

        setMonthlyData(chartData);
      } else {
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setMonthlyData([]);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const { data } = await supabase
        .from('fiscal_documents')
        .select('tipo_documento');

      if (data && data.length > 0) {
        const typeStats = data.reduce((acc, doc) => {
          acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(typeStats).map(([name, value]) => ({
          name,
          value
        }));

        setDocumentTypes(chartData);
      } else {
        setDocumentTypes([]);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
      setDocumentTypes([]);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Fetch recent sync logs
      const { data: syncLogs } = await supabase
        .from('fiscal_sync_logs')
        .select(`
          id,
          status,
          created_at,
          documentos_processados,
          mensagem_erro,
          fiscal_companies (razao_social)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (syncLogs) {
        syncLogs.forEach(log => {
          const companyName = (log as any).fiscal_companies?.razao_social || 'Empresa';
          if (log.status === 'concluido') {
            activities.push({
              id: log.id,
              type: 'sync',
              message: `Sincronização concluída - ${companyName}`,
              details: `${log.documentos_processados || 0} documentos coletados • ${getTimeAgo(log.created_at)}`,
              timestamp: log.created_at
            });
          } else if (log.status === 'erro') {
            activities.push({
              id: log.id,
              type: 'error',
              message: `Erro na sincronização - ${companyName}`,
              details: `${log.mensagem_erro || 'Erro desconhecido'} • ${getTimeAgo(log.created_at)}`,
              timestamp: log.created_at
            });
          }
        });
      }

      // Fetch recent companies
      const { data: companies } = await supabase
        .from('fiscal_companies')
        .select('id, razao_social, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (companies) {
        companies.forEach(company => {
          activities.push({
            id: company.id,
            type: 'company',
            message: `Nova empresa cadastrada - ${company.razao_social}`,
            details: `Certificado digital configurado • ${getTimeAgo(company.created_at)}`,
            timestamp: company.created_at
          });
        });
      }

      // Sort all activities by timestamp and take the most recent ones
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Há menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    }
  };

  return {
    stats,
    monthlyData,
    documentTypes,
    recentActivity,
    isLoading
  };
};
