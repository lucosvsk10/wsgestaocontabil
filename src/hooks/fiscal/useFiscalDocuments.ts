
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/utils/edgeFunctions";

interface FiscalDocument {
  id: string;
  chave_acesso: string;
  numero_nota: string;
  serie: string;
  tipo_documento: string;
  tipo_operacao: string;
  data_emissao: string;
  valor_total: number;
  valor_impostos?: number;
  cnpj_emitente: string;
  nome_emitente: string;
  cnpj_destinatario?: string;
  nome_destinatario?: string;
  cfop?: string;
  natureza_operacao?: string;
  pdf_url?: string;
  status: string;
  created_at: string;
}

interface FiscalCompany {
  id: string;
  razao_social: string;
  cnpj: string;
}

interface DocumentFilters {
  search: string;
  tipo: string;
  operacao: string;
  dateRange: any;
  company: string;
}

export const useFiscalDocuments = (filters: DocumentFilters) => {
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [companies, setCompanies] = useState<FiscalCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
    fetchDocuments();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_companies')
        .select('id, razao_social, cnpj')
        .order('razao_social');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('fiscal_documents')
        .select('*')
        .order('data_emissao', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`chave_acesso.ilike.%${filters.search}%,numero_nota.ilike.%${filters.search}%,cnpj_emitente.ilike.%${filters.search}%`);
      }

      if (filters.tipo) {
        query = query.eq('tipo_documento', filters.tipo);
      }

      if (filters.operacao) {
        query = query.eq('tipo_operacao', filters.operacao);
      }

      if (filters.company) {
        query = query.eq('company_id', filters.company);
      }

      if (filters.dateRange?.from) {
        query = query.gte('data_emissao', filters.dateRange.from.toISOString());
      }

      if (filters.dateRange?.to) {
        query = query.lte('data_emissao', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async (documentId: string, type: 'xml' | 'pdf') => {
    try {
      const response = await callEdgeFunction('download-fiscal-document', {
        documentId,
        type
      });

      // Create download link
      const blob = new Blob([response.content], { type: response.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  };

  const downloadReport = async (filters: DocumentFilters) => {
    try {
      const response = await callEdgeFunction('generate-fiscal-report', {
        filters
      });

      // Create download link
      const blob = new Blob([response.content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_fiscal_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  };

  return {
    documents,
    companies,
    isLoading,
    downloadDocument,
    downloadReport,
    refreshDocuments: fetchDocuments
  };
};
