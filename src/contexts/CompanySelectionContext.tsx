import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OfficeCompanySelection = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  logo_url?: string | null;
  fiscal_company_id?: string | null;
  portal_user_id?: string | null;
};

type CompanySelectionContextValue = {
  companies: OfficeCompanySelection[];
  selectedCompany: OfficeCompanySelection | null;
  selectedCompanyId: string;
  loading: boolean;
  selectCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
};

const STORAGE_KEY = 'ws_selected_company_id';

const CompanySelectionContext = createContext<CompanySelectionContextValue | undefined>(undefined);

function persistCompatibility(company: OfficeCompanySelection | null) {
  if (!company) return;
  localStorage.setItem(STORAGE_KEY, company.id);
  localStorage.setItem('ws_office_client_company_id', company.id);
  localStorage.setItem('ws-accounting-company-id', company.id);
  localStorage.setItem('ws-accounting-company', JSON.stringify({
    id: company.id,
    name: company.company_name,
    tradeName: company.trade_name,
    cnpj: company.cnpj,
    chartModel: 'Plano próprio da empresa',
  }));
  if (company.fiscal_company_id) {
    localStorage.setItem('ws_fiscal_company_id', company.fiscal_company_id);
    localStorage.setItem('ws_fiscal_company_name', company.trade_name || company.company_name);
  } else {
    localStorage.removeItem('ws_fiscal_company_id');
    localStorage.removeItem('ws_fiscal_company_name');
  }
  if (company.portal_user_id) localStorage.setItem('ws_portal_user_id', company.portal_user_id);
  else localStorage.removeItem('ws_portal_user_id');

  window.dispatchEvent(new CustomEvent('ws:company-changed', { detail: company }));
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: company.id }));
  window.dispatchEvent(new StorageEvent('storage', { key: 'ws-accounting-company-id', newValue: company.id }));
}

export function CompanySelectionProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<OfficeCompanySelection[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ws_office_client_company_id') || '');
  const [loading, setLoading] = useState(true);

  const refreshCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesResult, fiscalResult, portalResult] = await Promise.all([
        supabase.from('companies').select('id,company_name,trade_name,cnpj,logo_url').order('company_name'),
        supabase.from('fiscal_companies').select('id,company_id'),
        supabase.from('company_user_links' as never).select('company_id,user_id'),
      ]);
      if (companiesResult.error) throw companiesResult.error;
      if (fiscalResult.error) throw fiscalResult.error;
      if (portalResult.error) throw portalResult.error;

      const fiscalByCompany = new Map(((fiscalResult.data || []) as Array<{ id: string; company_id: string | null }>).filter(item => item.company_id).map(item => [item.company_id as string, item.id]));
      const portalByCompany = new Map(((portalResult.data || []) as unknown as Array<{ company_id: string; user_id: string }>).map(item => [item.company_id, item.user_id]));
      const next = ((companiesResult.data || []) as unknown as Array<{ id: string; company_name: string; trade_name: string | null; cnpj: string; logo_url?: string | null }>).map(company => ({
        ...company,
        fiscal_company_id: fiscalByCompany.get(company.id) || null,
        portal_user_id: portalByCompany.get(company.id) || null,
      }));
      setCompanies(next);

      const savedId = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ws_office_client_company_id') || '';
      const selected = next.find(company => company.id === savedId) || next[0] || null;
      if (selected) {
        setSelectedCompanyId(selected.id);
        persistCompatibility(selected);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshCompanies(); }, [refreshCompanies]);

  const selectedCompany = useMemo(() => companies.find(company => company.id === selectedCompanyId) || null, [companies, selectedCompanyId]);

  const selectCompany = useCallback((companyId: string) => {
    const company = companies.find(item => item.id === companyId);
    if (!company) return;
    setSelectedCompanyId(company.id);
    persistCompatibility(company);
  }, [companies]);

  return (
    <CompanySelectionContext.Provider value={{ companies, selectedCompany, selectedCompanyId, loading, selectCompany, refreshCompanies }}>
      {children}
    </CompanySelectionContext.Provider>
  );
}

export function useCompanySelection() {
  const context = useContext(CompanySelectionContext);
  if (!context) throw new Error('useCompanySelection must be used within CompanySelectionProvider');
  return context;
}
