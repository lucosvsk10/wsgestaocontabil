import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Building2, Calendar, FileSpreadsheet, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpreadsheetEditor } from "@/components/admin/lancamentos/SpreadsheetEditor";
import { QuickEditPanel } from "@/components/admin/lancamentos/QuickEditPanel";
import type { SheetCell, SheetData } from "@/components/admin/lancamentos/exportBuilders";
import { fetchPlanoContas } from "@/lib/planoContas";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Row {
  id?: string;
  data: string | null;
  conta_debito: string | null;
  conta_credito: string | null;
  historico: string | null;
  valor: number | null;
  ordem: number;
}

const cell = (value: string | number, extra: Partial<SheetCell> = {}): SheetCell => ({ value, ...extra });

const formatDate = (d: string | null) => {
  if (!d) return "";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

const parseDateBR = (s: string): string | null => {
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const buildSheet = (rows: Row[], planoMap: Record<string, string>): SheetData => {
  const headers = ["Data","Conta Débito","Desc. Débito","CC Débito","Conta Crédito","Desc. Crédito","CC Crédito","Histórico","Valor"];
  const body: SheetCell[][] = rows.map((r) => {
    const debDesc = (r.conta_debito && planoMap[r.conta_debito]) || "";
    const credDesc = (r.conta_credito && planoMap[r.conta_credito]) || "";
    const ccDeb = /\(-\)/.test(debDesc) ? "100" : "";
    const ccCred = /\(-\)/.test(credDesc) ? "100" : "";
    return [
      cell(formatDate(r.data)),
      cell(r.conta_debito || ""),
      cell(debDesc.replace(/\(-\)/g, "").replace(/^\s+/, "")),
      cell(ccDeb),
      cell(r.conta_credito || ""),
      cell(credDesc.replace(/\(-\)/g, "").replace(/^\s+/, "")),
      cell(ccCred),
      cell((r.historico || "").toUpperCase()),
      cell(r.valor ?? 0, { numeric: true }),
    ];
  });
  return { headers, rows: body };
};

const slug = (s: string) => s.replace(/\s+/g, "_").replace(/[^\w-]/g, "").toLowerCase();

const AdminFolhaEditor = () => {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [params] = useSearchParams();
  const competencia = params.get("competencia") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("Cliente");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [filename, setFilename] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!clientId || !competencia) {
        toast.error("Parâmetros inválidos");
        navigate(-1);
        return;
      }
      setLoading(true);
      try {
        const [{ data: userData }, { data: rows }, planoRes] = await Promise.all([
          supabase.from("users").select("name").eq("id", clientId).maybeSingle(),
          supabase.from("folha_lancamentos").select("*").eq("client_id", clientId).eq("competencia", competencia).order("ordem", { ascending: true }),
          fetchPlanoContas(clientId),
        ]);
        const name = userData?.name || "Cliente";
        setClientName(name);
        const list = ((rows || []) as any[]).map((r, i) => ({
          id: r.id,
          data: r.data,
          conta_debito: r.conta_debito,
          conta_credito: r.conta_credito,
          historico: r.historico,
          valor: r.valor != null ? Number(r.valor) : null,
          ordem: r.ordem ?? i,
        })) as Row[];
        setSheet(buildSheet(list, planoRes.map));
        setFilename(`folha_${slug(name)}_${competencia}.xlsx`);
      } catch (e: any) {
        toast.error("Erro ao carregar: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, competencia, navigate]);

  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  const onChange = (next: SheetData) => { setSheet(next); setIsDirty(true); };

  const attemptLeave = () => { if (isDirty) setLeaveOpen(true); else navigate(-1); };

  const total = useMemo(() => {
    if (!sheet) return 0;
    return sheet.rows.reduce((s, r) => s + (r[8]?.numeric ? Number(r[8].value) || 0 : 0), 0);
  }, [sheet]);

  const monthLabel = useMemo(() => {
    const [y, m] = competencia.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1] || m} / ${y}`;
  }, [competencia]);

  const handleSave = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      const newRows = sheet.rows.map((r, idx) => ({
        client_id: clientId,
        competencia,
        ordem: idx,
        data: parseDateBR(String(r[0].value ?? "")),
        conta_debito: String(r[1].value ?? "").trim() || null,
        conta_credito: String(r[4].value ?? "").trim() || null,
        historico: String(r[7].value ?? "").trim() || null,
        valor: r[8].numeric ? Number(r[8].value) || 0 : Number(String(r[8].value).replace(/\./g, "").replace(",", ".")) || 0,
      }));
      await supabase.from("folha_lancamentos").delete().eq("client_id", clientId).eq("competencia", competencia);
      if (newRows.length) {
        const { error } = await supabase.from("folha_lancamentos").insert(newRows);
        if (error) throw error;
      }
      toast.success("Lançamentos salvos");
      setIsDirty(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!sheet) return;
    const aoa: (string | number)[][] = [sheet.headers, ...sheet.rows.map((r) => r.map((c) => c.value))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = sheet.headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Folha");
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    toast.success("Download iniciado");
  };

  return (
    <AdminLayout>
      <div className="p-1 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-lg" onClick={attemptLeave}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-light text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" /> Folha de Pagamento — Editor
              </h1>
              <p className="text-xs text-muted-foreground">Revise os lançamentos gerados pela IA antes de salvar ou exportar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || loading || !sheet}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />} Salvar
            </Button>
            <Button size="sm" className="rounded-lg" onClick={handleDownload} disabled={loading || !sheet}>
              <Download className="w-4 h-4 mr-1.5" /> Baixar XLSX
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden h-[calc(100vh-200px)]">
            {loading || !sheet ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : (
              <SpreadsheetEditor
                data={sheet}
                onChange={onChange}
                selectedRow={selectedRow}
                selectedCol={selectedCol}
                onSelectRow={setSelectedRow}
                onSelectCol={setSelectedCol}
              />
            )}
          </div>

          <aside className="space-y-3">
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Building2 className="w-3.5 h-3.5" /> Empresa
                </div>
                <p className="text-sm font-medium text-foreground">{clientName}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Competência
                </div>
                <p className="text-sm font-medium text-foreground">{monthLabel}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Linhas</span>
                <span className="text-sm font-medium text-foreground">{sheet?.rows.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-medium text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                </span>
              </div>
            </div>

            {sheet && <QuickEditPanel data={sheet} selectedCol={selectedCol} onChange={onChange} />}

            <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border">
              <label className="text-xs text-muted-foreground">Nome do arquivo</label>
              <Input value={filename} onChange={(e) => setFilename(e.target.value)} className="h-9 text-xs" />
            </div>
          </aside>
        </div>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>Você tem alterações não salvas. Se sair agora, todas as edições serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaveOpen(false)}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setLeaveOpen(false); setIsDirty(false); navigate(-1); }}>
              Sair e descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminFolhaEditor;
