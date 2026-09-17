import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, EyeOff, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySelection } from "@/contexts/CompanySelectionContext";

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

  const load = useCallback(async () => {
    if (!user?.id || !fiscalCompanyId) {
      setAlerts([]);
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
    () => alerts.filter((alert) => !temporaryHidden.has(alert.id)).slice(0, 3),
    [alerts, temporaryHidden]
  );

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

  return (
    <div className="fixed bottom-5 right-5 z-[170] w-[min(350px,calc(100vw-2rem))] space-y-2">
      {visible.map((alert) => {
        const manifestation =
          alert.issue_code === "MANIFESTATION_REQUIRED" ||
          alert.issue_code === "MANIFESTATION_XML_PENDING";

        return (
          <div
            key={alert.id}
            className={`rounded-xl border bg-background/95 p-3.5 shadow-xl backdrop-blur-md ${
              alert.severity === "error" ? "border-red-500/30" : "border-amber-500/30"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  alert.severity === "error"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {alert.severity === "error" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5">{alert.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{alert.message}</p>
              </div>

              <button
                title="Ocultar até a próxima sessão"
                onClick={() => hideTemporarily(alert.id)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  navigate("/admin/feature");
                  hideTemporarily(alert.id);
                }}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {manifestation ? "Ver manifestação" : "Ver notas"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={saving === alert.id}
                onClick={() => void neverShowAgain(alert)}
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                {saving === alert.id ? "Salvando..." : "Não mostrar novamente"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
