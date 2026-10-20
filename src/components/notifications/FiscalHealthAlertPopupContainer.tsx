import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, ChevronRight, EyeOff, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySelection } from "@/contexts/CompanySelectionContext";
import { cn } from "@/lib/utils";

type FiscalAlert = {
  id: string;
  company_id: string;
  issue_code: string;
  severity: "attention" | "error";
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
};

type AlertArea = "compras" | "vendas" | "geral";

const SESSION_KEY = "ws_fiscal_health_alerts_hidden";

function readSessionHidden() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "[]");
    return new Set<string>(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeSessionHidden(value: Set<string>) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...value]));
  } catch {
    // Session storage is only a convenience. The persistent dismissal stays in Supabase.
  }
}

function alertArea(alert: FiscalAlert): AlertArea {
  const code = alert.issue_code.toLocaleUpperCase("pt-BR");
  const text = `${alert.title} ${alert.message}`.toLocaleLowerCase("pt-BR");

  if (
    code.includes("PURCHASE") ||
    code.includes("BUY") ||
    code.includes("MANIFESTATION") ||
    text.includes("compra") ||
    text.includes("entrada")
  ) {
    return "compras";
  }

  if (
    code.includes("SALE") ||
    code.includes("SALES") ||
    code.includes("SELL") ||
    text.includes("venda") ||
    text.includes("saída") ||
    text.includes("saida")
  ) {
    return "vendas";
  }

  return "geral";
}

function areaLabel(area: AlertArea) {
  return area === "compras" ? "Compras" : area === "vendas" ? "Vendas" : "Geral";
}

export function FiscalHealthAlertPopupContainer() {
  const db = supabase as any;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompany } = useCompanySelection();
  const fiscalCompanyId = String(selectedCompany?.fiscal_company_id || "");
  const [alerts, setAlerts] = useState<FiscalAlert[]>([]);
  const [temporaryHidden, setTemporaryHidden] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set<string>() : readSessionHidden()
  );
  const [saving, setSaving] = useState<string>("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !fiscalCompanyId) {
      setAlerts([]);
      setOpen(false);
      return;
    }

    const { data, error } = await db
      .from("fiscal_health_alerts")
      .select("id,company_id,issue_code,severity,title,message,data,first_seen_at,last_seen_at")
      .eq("company_id", fiscalCompanyId)
      .is("resolved_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(20);

    if (error) return;
    const rows = (data || []) as FiscalAlert[];
    if (!rows.length) {
      setAlerts([]);
      setOpen(false);
      return;
    }

    const ids = rows.map((row) => row.id);
    const { data: dismissed } = await db
      .from("fiscal_health_alert_dismissals")
      .select("alert_id")
      .eq("user_id", user.id)
      .in("alert_id", ids);

    const dismissedIds = new Set((dismissed || []).map((row: any) => String(row.alert_id)));
    setAlerts(rows.filter((row) => !dismissedIds.has(row.id)));
  }, [db, user?.id, fiscalCompanyId]);

  useEffect(() => {
    void load();
    if (!user?.id || !fiscalCompanyId) return;

    const onFocus = () => void load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, user?.id, fiscalCompanyId]);

  const visible = useMemo(
    () => alerts.filter((alert) => !temporaryHidden.has(alert.id)),
    [alerts, temporaryHidden]
  );

  const counts = useMemo(() => {
    const next = { compras: 0, vendas: 0, geral: 0, errors: 0 };
    for (const alert of visible) {
      next[alertArea(alert)] += 1;
      if (alert.severity === "error") next.errors += 1;
    }
    return next;
  }, [visible]);

  if (!visible.length) return null;

  const hideTemporarily = (id: string) => {
    setTemporaryHidden((current) => {
      const next = new Set(current);
      next.add(id);
      writeSessionHidden(next);
      return next;
    });
  };

  const neverShowAgain = async (alert: FiscalAlert) => {
    if (!user?.id) return;
    setSaving(alert.id);
    const { error } = await db.from("fiscal_health_alert_dismissals").upsert(
      { alert_id: alert.id, user_id: user.id, dismissed_at: new Date().toISOString() },
      { onConflict: "alert_id,user_id" }
    );
    if (!error) setAlerts((current) => current.filter((item) => item.id !== alert.id));
    setSaving("");
  };

  const openAlert = (alert: FiscalAlert) => {
    const manifestation =
      alert.issue_code === "MANIFESTATION_REQUIRED" ||
      alert.issue_code === "MANIFESTATION_XML_PENDING";

    setOpen(false);
    navigate(manifestation ? "/admin/feature" : "/admin/feature");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[170] w-[min(292px,calc(100vw-2rem))] rounded-xl border border-border/70 bg-background/95 p-3 text-left shadow-xl backdrop-blur-md transition hover:border-border hover:bg-background"
          aria-label="Abrir pendências fiscais"
        >
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              counts.errors > 0
                ? "bg-red-500/10 text-red-500"
                : "bg-amber-500/10 text-amber-500"
            )}>
              {counts.errors > 0 ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[13px] font-semibold text-foreground">Pendências fiscais</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {visible.length}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {visible.length === 1 ? "1 item exige atenção" : `${visible.length} itens exigem atenção`}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            {counts.compras > 0 && <span className="rounded-md bg-muted/70 px-2 py-1">Compras {counts.compras}</span>}
            {counts.vendas > 0 && <span className="rounded-md bg-muted/70 px-2 py-1">Vendas {counts.vendas}</span>}
            {counts.geral > 0 && <span className="rounded-md bg-muted/70 px-2 py-1">Geral {counts.geral}</span>}
          </div>
        </button>
      )}

      {open && (
        <aside className="pointer-events-auto fixed inset-y-0 right-0 z-[180] flex w-[min(390px,calc(100vw-1rem))] flex-col border-l border-border/80 bg-background shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Pendências fiscais</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {visible.length === 1 ? "1 item ativo" : `${visible.length} itens ativos`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Fechar pendências"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {visible.map((alert) => {
                const area = alertArea(alert);
                return (
                  <article
                    key={alert.id}
                    className="rounded-lg border border-border/70 bg-muted/[0.18] p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        alert.severity === "error"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                      )}>
                        {alert.severity === "error"
                          ? <AlertTriangle className="h-3.5 w-3.5" />
                          : <BellRing className="h-3.5 w-3.5" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-foreground">{alert.title}</p>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            {areaLabel(area)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{alert.message}</p>
                      </div>

                      <button
                        type="button"
                        title="Ocultar nesta sessão"
                        onClick={() => hideTemporarily(alert.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openAlert(alert)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Ver detalhes
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted-foreground"
                        disabled={saving === alert.id}
                        onClick={() => void neverShowAgain(alert)}
                      >
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                        {saving === alert.id ? "Salvando..." : "Dispensar"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <footer className="border-t border-border px-5 py-3">
            <p className="text-[10px] leading-4 text-muted-foreground">
              Pendências não bloqueiam o uso do painel. Abra apenas quando quiser revisar os detalhes.
            </p>
          </footer>
        </aside>
      )}
    </>
  );
}
