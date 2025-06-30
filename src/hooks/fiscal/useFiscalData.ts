
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FiscalNote {
  id: string;
  company_id: string;
  note_type: string;
  access_key: string;
  xml_url?: string;
  pdf_url?: string;
  issue_date: string;
  value: number;
  cfop?: string;
  issuer_cnpj: string;
  recipient_cnpj: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FiscalSummary {
  totalSalesMonth: number;
  totalPurchasesMonth: number;
  totalNotes: number;
  recentNotes: FiscalNote[];
}

export const useFiscalData = () => {
  const [fiscalNotes, setFiscalNotes] = useState<FiscalNote[]>([]);
  const [fiscalSummary, setFiscalSummary] = useState<FiscalSummary>({
    totalSalesMonth: 0,
    totalPurchasesMonth: 0,
    totalNotes: 0,
    recentNotes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  const fetchFiscalNotes = async (limit?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('fiscal_notes')
        .select('*')
        .order('issue_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setFiscalNotes(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching fiscal notes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas fiscais');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchFiscalSummary = async () => {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];

      // Get current user's company CNPJ
      let userCompanyCnpj = '';
      if (userData?.role !== 'admin') {
        const { data: companyData } = await supabase
          .from('company_data')
          .select('cnpj')
          .eq('user_id', userData?.id)
          .single();
        
        if (companyData) {
          userCompanyCnpj = companyData.cnpj;
        }
      }

      // Fetch notes for current month
      let notesQuery = supabase
        .from('fiscal_notes')
        .select('*')
        .gte('issue_date', firstDayOfMonthStr);

      const { data: monthlyNotes, error } = await notesQuery;
      
      if (error) throw error;

      const notes = monthlyNotes || [];
      
      // Calculate sales and purchases based on CNPJ
      let totalSales = 0;
      let totalPurchases = 0;

      notes.forEach(note => {
        if (userData?.role === 'admin' || note.issuer_cnpj === userCompanyCnpj) {
          totalSales += Number(note.value);
        }
        if (userData?.role === 'admin' || note.recipient_cnpj === userCompanyCnpj) {
          totalPurchases += Number(note.value);
        }
      });

      // Get recent notes
      const { data: recentNotes } = await supabase
        .from('fiscal_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setFiscalSummary({
        totalSalesMonth: totalSales,
        totalPurchasesMonth: totalPurchases,
        totalNotes: notes.length,
        recentNotes: recentNotes || []
      });

    } catch (err) {
      console.error('Error fetching fiscal summary:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo fiscal');
    }
  };

  const syncFiscalData = async (companyId: string, startDate: string, endDate: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('fiscal-sync', {
        body: { companyId, startDate, endDate }
      });

      if (error) throw error;

      // Refresh data after sync
      await fetchFiscalNotes();
      await fetchFiscalSummary();

      return data;
    } catch (err) {
      console.error('Error syncing fiscal data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao sincronizar dados fiscais');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchFiscalNotes();
      fetchFiscalSummary();
    }
  }, [userData]);

  return {
    fiscalNotes,
    fiscalSummary,
    loading,
    error,
    fetchFiscalNotes,
    fetchFiscalSummary,
    syncFiscalData,
    refetch: () => {
      fetchFiscalNotes();
      fetchFiscalSummary();
    }
  };
};
