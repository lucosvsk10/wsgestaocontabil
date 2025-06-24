
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/utils/edgeFunctions";

interface FiscalCompany {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco?: any;
  created_at: string;
  updated_at: string;
}

interface CompanyFormData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
}

export const useFiscalCompanies = () => {
  const [companies, setCompanies] = useState<FiscalCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching fiscal companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCompany = async (formData: CompanyFormData, certificateFile: File, password: string) => {
    try {
      // First, create the company record
      const { data: companyData, error: companyError } = await supabase
        .from('fiscal_companies')
        .insert({
          cnpj: formData.cnpj,
          razao_social: formData.razaoSocial,
          nome_fantasia: formData.nomeFantasia || null,
          inscricao_estadual: formData.inscricaoEstadual || null,
          inscricao_municipal: formData.inscricaoMunicipal || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Convert certificate file to base64
      const certificateBase64 = await fileToBase64(certificateFile);

      // Store the certificate - using correct property names
      const { error: certError } = await supabase
        .from('fiscal_certificates')
        .insert({
          company_id: companyData.id,
          certificate_name: certificateFile.name,
          certificate_data: certificateBase64,
          password_hash: password, // In production, this should be encrypted
          valid_from: new Date(),
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (certError) throw certError;

      await fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  };

  const syncCompanyDocuments = async (companyId: string, cnpj: string) => {
    try {
      // Create sync log entry - using correct property names
      const { data: syncLog, error: syncError } = await supabase
        .from('fiscal_sync_logs')
        .insert({
          company_id: companyId,
          sync_type: 'manual',
          periodo_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          periodo_fim: new Date(),
          status: 'iniciado',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (syncError) throw syncError;

      // Call the edge function to sync documents
      await callEdgeFunction('fiscal-sync', {
        companyId,
        cnpj,
        syncLogId: syncLog.id
      });

    } catch (error) {
      console.error('Error syncing documents:', error);
      throw error;
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return {
    companies,
    isLoading,
    createCompany,
    syncCompanyDocuments,
    refreshCompanies: fetchCompanies
  };
};
