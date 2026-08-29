import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccountingCompany { id: string; name: string; tradeName?: string | null; cnpj?: string; chartModel: string; }

const LEGACY_STORAGE_KEY = "ws-accounting-company";
const STORAGE_ID_KEY = "ws-accounting-company-id";
const GLOBAL_SELECTION_KEY = "ws_selected_company_id";
const GLOBAL_CONTEXT_KEY = "ws:lancamentos:last-context";
const EMPTY_COMPANY: AccountingCompany = { id: "", name: "Selecione uma empresa", chartModel: "" };
const companyContextKey = (companyId: string) => `ws:lancamentos:last-context:${companyId}`;

function readSelectedCompanyId() {
  return localStorage.getItem(GLOBAL_SELECTION_KEY) || localStorage.getItem(STORAGE_ID_KEY) || "";
}

function persistAccountingCompatibility(company: AccountingCompany) {
  if (!company.id) return;
  localStorage.setItem(STORAGE_ID_KEY, company.id);
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(company));
  try {
    const current = JSON.parse(localStorage.getItem(GLOBAL_CONTEXT_KEY) || "{}") as Record<string, unknown>;
    localStorage.setItem(GLOBAL_CONTEXT_KEY, JSON.stringify({ ...current, companyId: company.id }));
  } catch {
    localStorage.setItem(GLOBAL_CONTEXT_KEY, JSON.stringify({ companyId: company.id }));
  }
}

export function useAccountingCompany() {
  const [companies, setCompanies] = useState<AccountingCompany[]>([]);
  const [company, setCompanyState] = useState<AccountingCompany>(EMPTY_COMPANY);

  useEffect(() => {
    void supabase.from("companies").select("id,company_name,trade_name,cnpj").order("company_name").then(result => {
      if (result.error) {
        console.error("Não foi possível carregar as empresas contábeis.", result.error);
        return;
      }
      const next = (result.data ?? []).map(item => ({
        id: item.id,
        name: item.company_name,
        tradeName: item.trade_name,
        cnpj: item.cnpj,
        chartModel: "Plano próprio da empresa",
      }));
      setCompanies(next);
      const selected = next.find(item => item.id === readSelectedCompanyId()) ?? next[0] ?? EMPTY_COMPANY;
      setCompanyState(selected);
      persistAccountingCompatibility(selected);
    });
  }, []);

  useEffect(() => {
    const sync = () => {
      const selected = companies.find(item => item.id === readSelectedCompanyId());
      if (selected) {
        setCompanyState(selected);
        persistAccountingCompatibility(selected);
      }
    };
    const storageSync = (event: StorageEvent) => {
      if ([GLOBAL_SELECTION_KEY, STORAGE_ID_KEY].includes(event.key || "")) sync();
    };
    window.addEventListener("storage", storageSync);
    window.addEventListener("ws:company-changed", sync as EventListener);
    return () => {
      window.removeEventListener("storage", storageSync);
      window.removeEventListener("ws:company-changed", sync as EventListener);
    };
  }, [companies]);

  const selectCompany = useCallback((next: AccountingCompany) => {
    if (!next.id) return;
    if (company.id && company.id !== next.id) {
      const currentContext = localStorage.getItem(companyContextKey(company.id));
      if (currentContext) localStorage.setItem(companyContextKey(next.id), currentContext);
    }
    localStorage.setItem(GLOBAL_SELECTION_KEY, next.id);
    setCompanyState(next);
    persistAccountingCompatibility(next);
    window.dispatchEvent(new CustomEvent("ws:company-changed", { detail: next }));
  }, [company.id]);

  return { company, companies, selectCompany };
}
