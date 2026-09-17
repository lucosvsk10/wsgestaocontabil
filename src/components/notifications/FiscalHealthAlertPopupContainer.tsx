import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, EyeOff, FileText, X } from "lucide-react";
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
  resolved_at: string | null;
};

export function FiscalHealthAlertPopupContainer() {
  const db = supabase as any;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompany } = useCompanySelection();
  const fiscalCompanyId = String(selectedCompany?.fiscal_company_id || "");
  const [alerts, setAlerts] = useState<FiscalAlert[]>([]);
  const [temporaryHidden, setTemporaryHidden] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string>("");

  const load = useCallback(async () => {
    if (!user?.id || !fiscalCompanyId) {
      setAlerts([]);
      return;
    }
    const { data, error } = await db.from("fiscal_health_alerts")
      .select("id,company_id,issue_code,severity,title,message,data,first_seen_at,last_seen_at,resolved_at")
      .eq("company_id", fiscalCompanyId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return;
    const rows = (data || []) as FiscalAlert[];
    if (!rows.length) {
      setAlerts([]);
      return;
    }
    const ids = rows.map((row) => row.id);
    const { data: dismissed } = await db.from("fiscal_health_alert_dismissals")
      .select("alert_id")
      .eq("user_id", user.id)
      .in("alert_id", ids);
    const dismissedIds = new Set((dismissed || []).map((row: any) => String(row.alert_id)));
    setAlerts(rows.filter((row) => !dismissedIds.has(row.id)));
  }, [user?.id, fiscalCompanyId]);

  useEffect(() => {
    setTemporaryHidden(new Set());
    void load();
    if (!user?.id || !fiscalCompanyId) return;
    const onFocus = () => void load();
    const timer = window.setInterval(() => void load(), 60000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, user?.id, fiscalCompanyId]);

  const visible = useMemo(() => alerts.filter((alert) => !temporaryHidden.has(alert.id)).slice(0, 5), [alerts, temporaryHidden]);
  if (!visible.length) return null;

  const hideTemporarily = (id: string) => setTemporaryHidden((current) => new Set([...current, id]));
  const neverShowAgain = async (alert: FiscalAlert) => {
    if (!user?.id) return;
    setSaving(alert.id);
    const { error } = await db.from("fiscal_health_alert_dismissals").upsert({ alert_id: alert.id, user_id: user.id, dismissed_at: new Date().toISOString() }, { onConflict: "alert_id,user_id" });
    if (!error) setAlerts((current) => current.filter((item) => item.id !== alert.id));
    setSaving("");
  };

  return (
    <div className="fixed right-5 top-20 z-[170] w-[min(390px,calc(100vw-2rem))] space-y-3">
      {visible.map((alert) => {
        const resolved = Boolean(alert.resolved_at);
        const manifestation = alert.issue_code === "MANIFESTATION_REQUIRED" || alert.issue_code === "MANIFESTATION_XML_PENDING";
        return (
          <div key={alert.id} className={`rounded-2xl border bg-background p-4 shadow-2xl ${resolved ? "border-emerald-500/25" : alert.severity === "error" ? "border-red-500/30" : "border-amber-500/35"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${resolved ? "bg-emerald-500/10 text-emerald-600" : alert.severity === "error" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                {resolved ? <CheckCircle2 className="h-4 w-4" /> : alert.severity === "error" ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.message}</p>
                {resolved && <p className="mt-2 text-[11px] font-medium text-emerald-600">Já não aparece na verificação mais recente, mas este aviso fica salvo até você dispensá-lo.</p>}
              </div>
              <button title="Lembrar depois" onClick={() => hideTemporarily(alert.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { navigate("/admin/feature"); hideTemporarily(alert.id); }}><FileText className="mr-1.5 h-3.5 w-3.5" />{manifestation ? "Ver manifestação" : "Ver notas"}</Button>
              <Button variant="outline" size="sm" disabled={saving === alert.id} onClick={() => void neverShowAgain(alert)}><EyeOff className="mr-1.5 h-3.5 w-3.5" />{saving === alert.id ? "Salvando..." : "Não mostrar novamente"}</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
