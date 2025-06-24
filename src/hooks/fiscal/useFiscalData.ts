
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchMonthlyData();
    fetchDocumentTypes();
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

      if (data) {
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
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const { data } = await supabase
        .from('fiscal_documents')
        .select('tipo_documento');

      if (data) {
        const typeStats = data.reduce((acc, doc) => {
          acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(typeStats).map(([name, value]) => ({
          name,
          value
        }));

        setDocumentTypes(chartData);
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    stats,
    monthlyData,
    documentTypes,
    isLoading
  };
};
