import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccountingCompany { id: string; name: string; tradeName?: string | null; cnpj?: string; chartModel: string; }

const LEGACY_STORAGE_KEY = "ws-accounting-company";
const STORAGE_ID_KEY = "ws-accounting-company-id";
const GLOBAL_SELECTION_KEY = "ws_selected_company_id";
const GLOBAL_CONTEXT_KEY = "ws:lancamentos:last-context";
const EMPTY_COMPANY: AccountingCompany = { id: "", name: "Selecione uma empresa", chartModel: "" };
const companyContextKey = (companyId: string) => `ws:lancamentos:last-context:${companyId}`;
const digits = (value?: string | null) => String(value || "").replace(/\D/g, "");
const normalize = (value?: string | null) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();

function readLegacyIdentity() {
  try { return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}") as { id?: string; name?: string; tradeName?: string | null; cnpj?: string }; }
  catch { return {}; }
}

function resolveCompany(companies: AccountingCompany[], candidate?: { id?: string; name?: string; tradeName?: string | null; cnpj?: string } | null) {
  if (!candidate) return null;
  if (candidate.id) {
    const byId = companies.find(item => item.id === candidate.id);
    if (byId) return byId;
  }
  const cnpj = digits(candidate.cnpj);
  if (cnpj) {
    const byCnpj = companies.find(item => digits(item.cnpj) === cnpj);
    if (byCnpj) return byCnpj;
  }
  const aliases = new Set([normalize(candidate.name), normalize(candidate.tradeName)].filter(Boolean));
  if (!aliases.size) return null;
  const matches = companies.filter(item => aliases.has(normalize(item.name)) || aliases.has(normalize(item.tradeName)));
  return matches.length === 1 ? matches[0] : null;
}

function readSelectedCompany(companies: AccountingCompany[]) {
  const selectedId = localStorage.getItem(GLOBAL_SELECTION_KEY) || localStorage.getItem(STORAGE_ID_KEY) || "";
  return resolveCompany(companies, { id: selectedId, ...readLegacyIdentity() });
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
      const selected = readSelectedCompany(next) ?? next[0] ?? EMPTY_COMPANY;
      setCompanyState(selected);
      persistAccountingCompatibility(selected);
    });
  }, []);

  useEffect(() => {
    const sync = (candidate?: { id?: string; name?: string; tradeName?: string | null; cnpj?: string } | null) => {
      const selected = resolveCompany(companies, candidate) ?? readSelectedCompany(companies);
      if (selected) {
        setCompanyState(selected);
        persistAccountingCompatibility(selected);
      }
    };
    const storageSync = (event: StorageEvent) => {
      if ([GLOBAL_SELECTION_KEY, STORAGE_ID_KEY].includes(event.key || "")) sync();
    };
    const companySync = (event: Event) => sync((event as CustomEvent).detail || null);
    window.addEventListener("storage", storageSync);
    window.addEventListener("ws:company-changed", companySync as EventListener);
    return () => {
      window.removeEventListener("storage", storageSync);
      window.removeEventListener("ws:company-changed", companySync as EventListener);
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
