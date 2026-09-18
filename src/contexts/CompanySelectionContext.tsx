import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type OfficeCompanySelection = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string | null;
  document_type?: 'cnpj' | 'cpf' | 'other' | null;
  document_number?: string | null;
  logo_url?: string | null;
  fiscal_company_id?: string | null;
  portal_user_id?: string | null;
  certificate_status?: 'valid' | 'expired' | 'missing';
  certificate_valid_until?: string | null;
  company_size?: string | null;
  state_registration?: string | null;
  registration_status?: string | null;
  tax_regime?: string | null;
  email?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  registry_updated_at?: string | null;
  portal_username?: string | null;
  portal_email?: string | null;
  portal_must_change_password?: boolean | null;
  portal_password_changed_at?: string | null;
};

type CompanySelectionContextValue = {
  companies: OfficeCompanySelection[];
  selectedCompany: OfficeCompanySelection | null;
  selectedCompanyId: string;
  loading: boolean;
  selectCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
};

type FiscalIdentityRow = {
  id: string;
  company_id: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
};

const STORAGE_KEY = 'ws_selected_company_id';
const CompanySelectionContext = createContext<CompanySelectionContextValue | undefined>(undefined);

const digits = (value?: string | null) => String(value || '').replace(/\D/g, '');
const normalizeName = (value?: string | null) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();

function resolveFiscalCompanyId(company: OfficeCompanySelection, fiscalRows: FiscalIdentityRow[]) {
  const byCompanyId = fiscalRows.find(row => row.company_id === company.id);
  if (byCompanyId) return byCompanyId.id;

  const companyCnpj = digits(company.cnpj);
  if (companyCnpj) {
    const byCnpj = fiscalRows.find(row => digits(row.cnpj) === companyCnpj);
    if (byCnpj) return byCnpj.id;
  }

  const aliases = new Set([normalizeName(company.company_name), normalizeName(company.trade_name)].filter(Boolean));
  if (!aliases.size) return null;
  const byAlias = fiscalRows.filter(row => aliases.has(normalizeName(row.razao_social)) || aliases.has(normalizeName(row.nome_fantasia)));
  return byAlias.length === 1 ? byAlias[0].id : null;
}

function clearCompatibility() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('ws_office_client_company_id');
  localStorage.removeItem('ws-accounting-company-id');
  localStorage.removeItem('ws-accounting-company');
  localStorage.removeItem('ws_company_legal_name');
  localStorage.removeItem('ws_company_trade_name');
  localStorage.removeItem('ws_fiscal_company_id');
  localStorage.removeItem('ws_fiscal_company_name');
  localStorage.removeItem('ws_fiscal_company_trade_name');
  localStorage.removeItem('ws_portal_user_id');
}

function persistCompatibility(company: OfficeCompanySelection | null) {
  if (!company) return;
  localStorage.setItem(STORAGE_KEY, company.id);
  localStorage.setItem('ws_office_client_company_id', company.id);
  localStorage.setItem('ws-accounting-company-id', company.id);
  localStorage.setItem('ws-accounting-company', JSON.stringify({
    id: company.id,
    name: company.company_name,
    tradeName: company.trade_name,
    cnpj: company.cnpj || '',
    chartModel: 'Plano próprio da empresa',
  }));
  localStorage.setItem('ws_company_legal_name', company.company_name);
  if (company.trade_name) localStorage.setItem('ws_company_trade_name', company.trade_name);
  else localStorage.removeItem('ws_company_trade_name');
  if (company.fiscal_company_id) {
    localStorage.setItem('ws_fiscal_company_id', company.fiscal_company_id);
    localStorage.setItem('ws_fiscal_company_name', company.company_name);
    if (company.trade_name) localStorage.setItem('ws_fiscal_company_trade_name', company.trade_name);
    else localStorage.removeItem('ws_fiscal_company_trade_name');
  } else {
    localStorage.removeItem('ws_fiscal_company_id');
    localStorage.removeItem('ws_fiscal_company_name');
    localStorage.removeItem('ws_fiscal_company_trade_name');
  }
  if (company.portal_user_id) localStorage.setItem('ws_portal_user_id', company.portal_user_id);
  else localStorage.removeItem('ws_portal_user_id');
  window.dispatchEvent(new CustomEvent('ws:company-changed', { detail: company }));
}

export function CompanySelectionProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<OfficeCompanySelection[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ws_office_client_company_id') || '');
  const [loading, setLoading] = useState(true);

  const refreshCompanies = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!session?.user) {
      setCompanies([]);
      setSelectedCompanyId('');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const companiesResult = await (supabase as any)
        .from('companies')
        .select('id,company_name,trade_name,cnpj,document_type,document_number,logo_url,company_size,state_registration,registration_status,tax_regime,email,phone,postal_code,city,state,registry_updated_at')
        .order('company_name');

      if (companiesResult.error) {
        console.error('[CompanySelection] Falha ao carregar empresas:', companiesResult.error);
        return;
      }

      const baseCompanies = ((companiesResult.data || []) as unknown as Array<{
        id: string; company_name: string; trade_name: string | null; cnpj: string | null;
        document_type?: 'cnpj' | 'cpf' | 'other' | null; document_number?: string | null; logo_url?: string | null;
        company_size?: string | null; state_registration?: string | null; registration_status?: string | null;
        tax_regime?: string | null; email?: string | null; phone?: string | null; postal_code?: string | null;
        city?: string | null; state?: string | null; registry_updated_at?: string | null;
      }>);

      let next: OfficeCompanySelection[] = baseCompanies.map(company => ({
        ...company,
        fiscal_company_id: null,
        portal_user_id: null,
        certificate_status: 'missing',
        certificate_valid_until: null,
        portal_username: null,
        portal_email: null,
        portal_must_change_password: null,
        portal_password_changed_at: null,
      }));
      setCompanies(next);

      const [fiscalResult, portalResult, certificateResult] = await Promise.all([
        supabase.from('fiscal_companies').select('id,company_id,cnpj,razao_social,nome_fantasia'),
        supabase.from('company_user_links' as never).select('company_id,user_id,is_primary'),
        supabase.from('fiscal_certificates').select('company_id,valid_until,is_active').eq('is_active', true),
      ]);

      const fiscalRows = fiscalResult.error ? [] : ((fiscalResult.data || []) as FiscalIdentityRow[]);
      const portalRows = portalResult.error ? [] : ((portalResult.data || []) as unknown as Array<{ company_id: string; user_id: string; is_primary: boolean }>);
      const certificateRows = certificateResult.error ? [] : ((certificateResult.data || []) as unknown as Array<{ company_id: string; valid_until: string | null; is_active: boolean }>);
      const portalUserIds = [...new Set(portalRows.map(item => item.user_id).filter(Boolean))];
      let portalUsers: Array<{ id: string; username: string | null; email: string | null; must_change_password: boolean | null; password_changed_at: string | null }> = [];
      if (portalUserIds.length) {
        const usersResult = await (supabase as any)
          .from('users')
          .select('id,username,email,must_change_password,password_changed_at')
          .in('id', portalUserIds);
        if (!usersResult.error) portalUsers = usersResult.data || [];
      }
      const portalUserById = new Map(portalUsers.map(item => [item.id, item]));
      const portalByCompany = new Map<string, { user_id: string; is_primary: boolean }>();
      for (const item of portalRows) {
        const current = portalByCompany.get(item.company_id);
        if (!current || item.is_primary) portalByCompany.set(item.company_id, item);
      }
      const certificateByFiscalCompany = new Map(certificateRows.map(item => [item.company_id, item]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      next = baseCompanies.map(company => {
        const fiscalCompanyId = resolveFiscalCompanyId(company, fiscalRows);
        const certificate = fiscalCompanyId ? certificateByFiscalCompany.get(fiscalCompanyId) : undefined;
        const validUntil = certificate?.valid_until || null;
        const expiry = validUntil ? new Date(`${validUntil}T23:59:59`) : null;
        const certificateStatus: OfficeCompanySelection['certificate_status'] = !certificate
          ? 'missing'
          : expiry && expiry.getTime() >= today.getTime() ? 'valid' : 'expired';
        const portalLink = portalByCompany.get(company.id);
        const portalUser = portalLink ? portalUserById.get(portalLink.user_id) : undefined;
        return {
          ...company,
          fiscal_company_id: fiscalCompanyId,
          portal_user_id: portalLink?.user_id || null,
          portal_username: portalUser?.username || null,
          portal_email: portalUser?.email || null,
          portal_must_change_password: portalUser?.must_change_password ?? null,
          portal_password_changed_at: portalUser?.password_changed_at || null,
          certificate_status: certificateStatus,
          certificate_valid_until: validUntil,
        };
      });
      setCompanies(next);

      const savedId = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ws_office_client_company_id') || '';
      const selected = next.find(company => company.id === savedId) || null;
      if (selected) {
        setSelectedCompanyId(selected.id);
        persistCompatibility(selected);
      } else {
        setSelectedCompanyId('');
        clearCompatibility();
      }
    } catch (error) {
      console.error('[CompanySelection] Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading, session?.user?.id]);

  useEffect(() => {
    if (!authLoading) void refreshCompanies();
  }, [authLoading, session?.user?.id, refreshCompanies]);

  useEffect(() => {
    if (authLoading || !session?.user) return;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshCompanies();
    };
    const channel = supabase
      .channel(`ws-admin-company-selection-live-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_companies' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_certificates' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_user_links' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refresh)
      .subscribe();

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [authLoading, session?.user?.id, refreshCompanies]);

  const selectedCompany = useMemo(
    () => companies.find(company => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId],
  );

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
