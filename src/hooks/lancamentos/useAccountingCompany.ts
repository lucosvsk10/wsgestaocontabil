import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccountingCompany { id: string; name: string; tradeName?: string | null; cnpj?: string; chartModel: string; }

const LEGACY_STORAGE_KEY = "ws-accounting-company";
const STORAGE_ID_KEY = "ws-accounting-company-id";
const GLOBAL_CONTEXT_KEY = "ws:lancamentos:last-context";
const EMPTY_COMPANY: AccountingCompany = { id: "", name: "Carregando empresas…", chartModel: "" };
const companyContextKey = (companyId: string) => `ws:lancamentos:last-context:${companyId}`;

function readSavedCompanyId() {
  try {
    const direct = localStorage.getItem(STORAGE_ID_KEY);
    if (direct) return direct;

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null") as Partial<AccountingCompany> | null;
    if (legacy?.id && legacy.id !== "el-da-silva") return legacy.id;

    const context = JSON.parse(localStorage.getItem(GLOBAL_CONTEXT_KEY) || "null") as { companyId?: string } | null;
    return context?.companyId || "";
  } catch {
    return "";
  }
}

function persistCompany(company: AccountingCompany) {
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
  const [company, setCompanyState] = useState<AccountingCompany>(() => {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null") as AccountingCompany | null;
      return legacy?.id && legacy.id !== "el-da-silva" ? legacy : EMPTY_COMPANY;
    } catch {
      return EMPTY_COMPANY;
    }
  });

  useEffect(() => {
    void Promise.all([
      supabase.from("company_data").select("id, user_id, name, fantasy_name, cnpj, tax_regime").order("name"),
      supabase.from("companies").select("id, company_name, trade_name, cnpj").order("company_name"),
    ]).then(([clientResult, fiscalResult]) => {
      const clients = (clientResult.data ?? []).map(item => ({
        id: item.user_id || item.id,
        name: item.name,
        tradeName: item.fantasy_name,
        cnpj: item.cnpj,
        chartModel: item.tax_regime ? `Plano próprio · ${item.tax_regime}` : "Plano próprio da empresa",
      }));
      const fiscal = (fiscalResult.data ?? []).map(item => ({
        id: item.id,
        name: item.company_name,
        tradeName: item.trade_name,
        cnpj: item.cnpj,
        chartModel: "Plano próprio da empresa",
      }));
      const next = Array.from(new Map([...clients, ...fiscal].map(item => [item.id, item])).values());
      setCompanies(next);
      if (!next.length) {
        setCompanyState(EMPTY_COMPANY);
        return;
      }

      const savedId = readSavedCompanyId();
      const selected = next.find(item => item.id === savedId) ?? next[0];
      setCompanyState(selected);
      persistCompany(selected);
    });
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (![STORAGE_ID_KEY, LEGACY_STORAGE_KEY, GLOBAL_CONTEXT_KEY].includes(event.key || "")) return;
      const savedId = readSavedCompanyId();
      const selected = companies.find(item => item.id === savedId);
      if (selected) setCompanyState(selected);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [companies]);

  const selectCompany = useCallback((next: AccountingCompany) => {
    if (!next.id) return;

    // A competência/módulo/aba visualizada agora acompanha a troca de empresa.
    // Isso evita que mudar a empresa jogue o usuário para "hoje" ou para um mês antigo daquela empresa.
    if (company.id && company.id !== next.id) {
      const currentContext = localStorage.getItem(companyContextKey(company.id));
      if (currentContext) localStorage.setItem(companyContextKey(next.id), currentContext);
    }

    setCompanyState(next);
    persistCompany(next);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_ID_KEY, newValue: next.id }));
  }, [company.id]);

  return { company, companies, selectCompany };
}
