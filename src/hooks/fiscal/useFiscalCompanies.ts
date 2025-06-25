
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
      const { data: companyData, error: companyError } = await supabase
        .from('fiscal_companies')
        .insert({
          cnpj: formData.cnpj,
          razao_social: formData.razaoSocial,
          nome_fantasia: formData.nomeFantasia || null,
          inscricao_estadual: formData.inscricaoEstadual || null,
          inscricao_municipal: formData.inscricaoMunicipal || null,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (companyError) throw companyError;

      const certificateBase64 = await fileToBase64(certificateFile);

      const { error: certError } = await supabase
        .from('fiscal_certificates')
        .insert({
          company_id: companyData.id,
          certificate_name: certificateFile.name,
          certificate_data: certificateBase64,
          password_hash: password,
          valid_from: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (certError) throw certError;

      await fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  };

  const updateCompany = async (companyId: string, formData: CompanyFormData, certificateFile?: File, password?: string) => {
    try {
      const { error: companyError } = await supabase
        .from('fiscal_companies')
        .update({
          cnpj: formData.cnpj,
          razao_social: formData.razaoSocial,
          nome_fantasia: formData.nomeFantasia || null,
          inscricao_estadual: formData.inscricaoEstadual || null,
          inscricao_municipal: formData.inscricaoMunicipal || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (companyError) throw companyError;

      if (certificateFile && password) {
        const certificateBase64 = await fileToBase64(certificateFile);
        
        const { error: certError } = await supabase
          .from('fiscal_certificates')
          .update({
            certificate_name: certificateFile.name,
            certificate_data: certificateBase64,
            password_hash: password,
            valid_from: new Date().toISOString().split('T')[0],
            valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .eq('company_id', companyId);

        if (certError) throw certError;
      }

      await fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      // First delete certificates
      const { error: certError } = await supabase
        .from('fiscal_certificates')
        .delete()
        .eq('company_id', companyId);

      if (certError) throw certError;

      // Delete fiscal documents
      const { error: docsError } = await supabase
        .from('fiscal_documents')
        .delete()
        .eq('company_id', companyId);

      if (docsError) throw docsError;

      // Delete sync logs
      const { error: logsError } = await supabase
        .from('fiscal_sync_logs')
        .delete()
        .eq('company_id', companyId);

      if (logsError) throw logsError;

      // Finally delete the company
      const { error: companyError } = await supabase
        .from('fiscal_companies')
        .delete()
        .eq('id', companyId);

      if (companyError) throw companyError;

      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  };

  const syncCompanyDocuments = async (companyId: string, cnpj: string) => {
    try {
      const { data: syncLog, error: syncError } = await supabase
        .from('fiscal_sync_logs')
        .insert({
          company_id: companyId,
          sync_type: 'manual',
          periodo_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          periodo_fim: new Date().toISOString().split('T')[0],
          status: 'iniciado',
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (syncError) throw syncError;

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
    updateCompany,
    deleteCompany,
    syncCompanyDocuments,
    refreshCompanies: fetchCompanies
  };
};
