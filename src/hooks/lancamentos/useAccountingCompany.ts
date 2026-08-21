import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AccountingCompany { id: string; name: string; tradeName?: string | null; cnpj?: string; chartModel: string; }
const STORAGE_KEY = "ws-accounting-company";
const FALLBACK: AccountingCompany = { id: "el-da-silva", name: "E L DA SILVA SERVIÇOS DE REDES", chartModel: "Plano próprio" };

export function useAccountingCompany() {
  const [companies, setCompanies] = useState<AccountingCompany[]>([FALLBACK]);
  const [company, setCompanyState] = useState<AccountingCompany>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || FALLBACK; } catch { return FALLBACK; }
  });
  useEffect(() => {
    void Promise.all([
      supabase.from("company_data").select("id, user_id, name, fantasy_name, cnpj, tax_regime").order("name"),
      supabase.from("companies").select("id, company_name, trade_name, cnpj").order("company_name"),
    ]).then(([clientResult, fiscalResult]) => {
      const clients = (clientResult.data ?? []).map(item => ({ id: item.user_id || item.id, name: item.name, tradeName: item.fantasy_name, cnpj: item.cnpj, chartModel: item.tax_regime ? `Plano próprio · ${item.tax_regime}` : "Plano próprio da empresa" }));
      const fiscal = (fiscalResult.data ?? []).map(item => ({ id: item.id, name: item.company_name, tradeName: item.trade_name, cnpj: item.cnpj, chartModel: "Plano próprio da empresa" }));
      const next = Array.from(new Map([...clients, ...fiscal].map(item => [item.id, item])).values());
      if (!next.length) return;
      setCompanies(next);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setCompanyState(next[0]);
    });
  }, []);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY && event.newValue) setCompanyState(JSON.parse(event.newValue)); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  const selectCompany = useCallback((next: AccountingCompany) => { setCompanyState(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(next) })); }, []);
  return { company, companies, selectCompany };
}
