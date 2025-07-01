import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OptimizedFiscalNote {
  id: string;
  access_key: string;
  note_type: string;
  issue_date: string;
  value: number;
  status: string;
  issuer_cnpj: string;
  recipient_cnpj: string;
  xml_url?: string;
  pdf_url?: string;
}

interface UsePaginatedFiscalNotesParams {
  pageSize?: number;
  searchTerm?: string;
  periodFilter?: string;
}

export const usePaginatedFiscalNotes = ({ 
  pageSize = 20, 
  searchTerm = '', 
  periodFilter = 'month' 
}: UsePaginatedFiscalNotesParams = {}) => {
  const [notes, setNotes] = useState<OptimizedFiscalNote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('fiscal_notes')
      .select(`
        id,
        access_key,
        note_type,
        issue_date,
        value,
        status,
        issuer_cnpj,
        recipient_cnpj,
        xml_url,
        pdf_url
      `, { count: 'exact' });

    // Add company filter if user is not admin
    if (userData?.role !== 'admin') {
      query = query.eq('company_id', userData?.id);
    }

    // Add search filter
    if (searchTerm) {
      query = query.or(`
        access_key.ilike.%${searchTerm}%,
        issuer_cnpj.ilike.%${searchTerm}%,
        recipient_cnpj.ilike.%${searchTerm}%,
        note_type.ilike.%${searchTerm}%
      `);
    }

    // Add period filter
    const now = new Date();
    let startDate: Date;
    
    switch (periodFilter) {
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    query = query.gte('issue_date', startDate.toISOString().split('T')[0]);

    return query;
  }, [userData, searchTerm, periodFilter]);

  const fetchNotes = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('issue_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setNotes(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, pageSize]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const query = buildQuery();
      const from = (nextPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await query
        .order('issue_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setNotes(prev => [...prev, ...(data || [])]);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more notes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mais notas');
    } finally {
      setLoading(false);
    }
  }, [loading, currentPage, buildQuery, pageSize]);

  const refresh = useCallback(() => {
    fetchNotes(1);
  }, [fetchNotes]);

  useEffect(() => {
    if (userData) {
      fetchNotes(1);
    }
  }, [userData, searchTerm, periodFilter, fetchNotes]);

  const hasMore = notes.length < totalCount;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    notes,
    totalCount,
    currentPage,
    totalPages,
    loading,
    error,
    hasMore,
    fetchNotes,
    loadMore,
    refresh
  };
};