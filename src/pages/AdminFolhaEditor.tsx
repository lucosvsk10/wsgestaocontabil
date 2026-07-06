import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Building2, Calendar, FileSpreadsheet, Save, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { exportCalimaXlsx } from "@/components/admin/lancamentos/exportCalima";
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
import { FolhaRowEditor } from "@/components/admin/lancamentos/folha/FolhaRowEditor";
import type { SheetCell, SheetData } from "@/components/admin/lancamentos/exportBuilders";
import { fetchPlanoContas, lookupPlanoContasDescricao } from "@/lib/planoContas";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Row {
  id?: string;
  data: string | null;
  conta_debito: string | null;
  conta_credito: string | null;
  historico: string | null;
  valor: number | null;
  ordem: number;
  justificativa: string | null;
}

interface DocumentoTotals {
  rendimentos: number | null;
  descontos: number | null;
  liquido: number | null;
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

const buildSheet = (rows: Row[], planoMap: Record<string, string>, observacoesIA: string = ""): SheetData => {
  const headers = ["Data","Conta Débito","Desc. Débito","CC Débito","Conta Crédito","Desc. Crédito","CC Crédito","Histórico","Valor","Justificativa IA","Observações IA"];
  const body: SheetCell[][] = rows.map((r, idx) => {
    const debDesc = lookupPlanoContasDescricao(planoMap, r.conta_debito);
    const credDesc = lookupPlanoContasDescricao(planoMap, r.conta_credito);
    const ccDeb = /\(-\)/.test(debDesc) ? "100" : "";
    const ccCred = /\(-\)/.test(credDesc) ? "100" : "";
    const hist = (r.historico || "").toUpperCase();
    // Cores por status do histórico
    let bg: string | undefined;
    if (/^\s*\[REVISAR\]/.test(hist)) bg = "#fde2e2";
    else if (/^\s*\[SUGERIDO\]/.test(hist)) bg = "#fff2cc";
    const withBg = (c: SheetCell): SheetCell => (bg ? { ...c, bg } : c);
    return [
      withBg(cell(formatDate(r.data))),
      withBg(cell(r.conta_debito || "")),
      withBg(cell(debDesc.replace(/\(-\)/g, "").replace(/^\s+/, ""))),
      withBg(cell(ccDeb)),
      withBg(cell(r.conta_credito || "")),
      withBg(cell(credDesc.replace(/\(-\)/g, "").replace(/^\s+/, ""))),
      withBg(cell(ccCred)),
      withBg(cell(hist)),
      withBg(cell(r.valor ?? 0, { numeric: true })),
      withBg(cell(r.justificativa || "")),
      withBg(cell(idx === 0 ? observacoesIA : "")),
    ];
  });
  return { headers, rows: body };
};

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const parseMoneyCell = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").trim().replace(/R\$|\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized = lastComma > -1 && lastDot > -1
    ? lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "")
    : cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
  return Number(normalized) || 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const classifyFolhaLine = (historico: string): "rendimento" | "desconto" | "encargo" => {
  const normalized = historico.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/(INSS\s*S\/|IRRF|CONSIGN|PENSAO|SINDICAL|CONVENIO|EMPRESTIMO|VALE|^\s*DESC)/.test(normalized)) return "desconto";
  if (/(FGTS|INSS\s+PATRONAL|INSS\s+EMPRESA|CONTRIBUICAO\s+PREVIDENCIARIA.*EMPRESA)/.test(normalized)) return "encargo";
  return "rendimento";
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
  const [planoMap, setPlanoMap] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [justificativas, setJustificativas] = useState<(string | null)[]>([]);
  const [observacoesIA, setObservacoesIA] = useState<string>("");
  const [documentoTotals, setDocumentoTotals] = useState<DocumentoTotals>({ rendimentos: null, descontos: null, liquido: null });

  useEffect(() => {
    (async () => {
      if (!clientId || !competencia) {
        toast.error("Parâmetros inválidos");
        navigate(-1);
        return;
      }
      setLoading(true);
      try {
        const [{ data: userData }, { data: rows }, { data: uploads }, planoRes] = await Promise.all([
          supabase.from("users").select("name").eq("id", clientId).maybeSingle(),
          supabase.from("folha_lancamentos").select("*").eq("client_id", clientId).eq("competencia", competencia).order("ordem", { ascending: true }),
          supabase.from("folha_uploads").select("observacoes_ia,total_rendimentos_documento,total_descontos_documento,total_liquido_documento").eq("client_id", clientId).eq("competencia", competencia),
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
          justificativa: r.justificativa ?? null,
        })) as Row[];
        const obs = (uploads || [])
          .map((u: any) => String(u.observacoes_ia || "").trim())
          .filter(Boolean)
          .join("\n\n");
        const sumUploadTotal = (key: string) => {
          const values = (uploads || [])
            .map((u: any) => u[key])
            .filter((v: any) => v != null && Number.isFinite(Number(v)))
            .map((v: any) => Number(v));
          return values.length ? values.reduce((acc, v) => acc + v, 0) : null;
        };
        setDocumentoTotals({
          rendimentos: sumUploadTotal("total_rendimentos_documento"),
          descontos: sumUploadTotal("total_descontos_documento"),
          liquido: sumUploadTotal("total_liquido_documento"),
        });
        setObservacoesIA(obs);
        setSheet(buildSheet(list, planoRes.map, obs));
        setJustificativas(list.map((r) => r.justificativa));
        setPlanoMap(planoRes.map);
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

  const onChange = (next: SheetData) => {
    setSheet(next);
    setIsDirty(true);
    // Mantém o array de justificativas com o mesmo tamanho da planilha
    setJustificativas((prev) => {
      if (next.rows.length === prev.length) return prev;
      if (next.rows.length > prev.length) {
        return [...prev, ...Array(next.rows.length - prev.length).fill(null)];
      }
      return prev.slice(0, next.rows.length);
    });
  };

  const attemptLeave = () => { if (isDirty) setLeaveOpen(true); else navigate(-1); };

  const { rendimentos, descontos, encargos } = useMemo(() => {
    if (!sheet) return { rendimentos: 0, descontos: 0, encargos: 0 };
    let r = 0, d = 0, e = 0;
    for (const row of sheet.rows) {
      const v = row[8]?.numeric ? Number(row[8].value) || 0 : parseMoneyCell(row[8]?.value);
      if (!v) continue;
      const hist = String(row[7]?.value ?? "");
      const tipo = classifyFolhaLine(hist);
      if (tipo === "desconto") d += v;
      else if (tipo === "encargo") e += v;
      else r += v;
    }
    return { rendimentos: round2(r), descontos: round2(d), encargos: round2(e) };
  }, [sheet]);
  const liquido = round2(rendimentos - descontos);

  const conferencia = useMemo(() => {
    const items = [
      { label: "Rendimentos", doc: documentoTotals.rendimentos, planilha: rendimentos, tone: "text-emerald-600 dark:text-emerald-400" },
      { label: "Descontos", doc: documentoTotals.descontos, planilha: descontos, tone: "text-red-600 dark:text-red-400" },
      { label: "Líquido", doc: documentoTotals.liquido, planilha: liquido, tone: "text-foreground" },
    ].filter((item) => item.doc != null) as { label: string; doc: number; planilha: number; tone: string }[];
    return items.map((item) => ({ ...item, diff: round2(item.planilha - item.doc), ok: Math.abs(round2(item.planilha - item.doc)) <= 0.01 }));
  }, [documentoTotals, descontos, liquido, rendimentos]);
  const hasDocumentoTotals = conferencia.length > 0;
  const hasDivergencia = conferencia.some((item) => !item.ok);

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
        valor: r[8].numeric ? Number(r[8].value) || 0 : parseMoneyCell(r[8].value),
        justificativa: (String(r[9]?.value ?? "").trim() || justificativas[idx]) ?? null,
      }));
      await supabase.from("folha_lancamentos").delete().eq("client_id", clientId).eq("competencia", competencia);
      const totalsLancamentos = {
        total_rendimentos_lancamentos: rendimentos,
        total_descontos_lancamentos: descontos,
        total_liquido_lancamentos: liquido,
      };
      if (newRows.length) {
        const { error } = await supabase.from("folha_lancamentos").insert(newRows);
        if (error) throw error;
      }
      await supabase.from("folha_uploads").update(totalsLancamentos).eq("client_id", clientId).eq("competencia", competencia);
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
    // Remove as duas últimas colunas (Justificativa IA e Observações IA) da exportação
    const headers = sheet.headers.slice(0, 9);
    const rows = sheet.rows.map((r) => r.slice(0, 9));
    const aoa: (string | number)[][] = [headers, ...rows.map((r) => r.map((c) => c.value))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Folha");
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    toast.success("Download iniciado");
  };

  const handleDownloadCalima = () => {
    if (!sheet) return;
    // sheet layout: [data, debito, descDeb, ccDeb, credito, descCred, ccCred, historico, valor]
    const rows = sheet.rows.map((r) => ({
      data: String(r[0].value ?? ""),
      conta_debito: String(r[1].value ?? "").trim() || null,
      cc_debito: String(r[3].value ?? "").trim() || null,
      conta_credito: String(r[4].value ?? "").trim() || null,
      cc_credito: String(r[6].value ?? "").trim() || null,
      historico: String(r[7].value ?? ""),
      valor: r[8].numeric ? Number(r[8].value) || 0 : parseMoneyCell(r[8].value),
    }));
    const base = filename.replace(/\.xlsx$/i, "");
    exportCalimaXlsx(rows, planoMap, `${base}_calima.xlsx`);
    toast.success("Exportado para Calima ERP");
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
            <Button size="sm" variant="outline" className="rounded-lg" onClick={handleDownloadCalima} disabled={loading || !sheet}>
              <FileDown className="w-4 h-4 mr-1.5" /> Para o Calima ERP
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
                <span className="text-xs text-muted-foreground">Rendimentos</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtBRL(rendimentos)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Descontos</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {fmtBRL(descontos)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Líquido</span>
                <span className="text-sm font-medium text-foreground">
                  {fmtBRL(liquido)}
                </span>
              </div>
              {encargos > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Encargos fora do total</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {fmtBRL(encargos)}
                  </span>
                </div>
              )}
            </div>

            {hasDocumentoTotals && (
              <div className={`rounded-xl p-4 space-y-3 border ${hasDivergencia ? "bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-900" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"}`}>
                <div className={`flex items-center gap-2 text-xs font-semibold ${hasDivergencia ? "text-red-800 dark:text-red-200" : "text-emerald-800 dark:text-emerald-200"}`}>
                  {hasDivergencia ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Conferência com o documento
                </div>
                <div className="space-y-2">
                  {conferencia.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className={`text-xs font-semibold ${item.tone}`}>{item.ok ? "OK" : `Dif. ${fmtBRL(item.diff)}`}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span>Documento: {fmtBRL(item.doc)}</span>
                        <span>Planilha: {fmtBRL(item.planilha)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {hasDivergencia
                    ? "Divergência detectada. Estes dados foram gerados antes da validação rígida ou precisam ser revisados/reprocessados; não exporte sem corrigir os valores."
                    : "Valores conferidos com o documento original."}
                </p>
              </div>
            )}


            {observacoesIA && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 space-y-2 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Observações da IA
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                  {observacoesIA}
                </p>
              </div>
            )}

            {sheet && (
              <FolhaRowEditor
                data={sheet}
                selectedRow={selectedRow}
                planoMap={planoMap}
                competencia={competencia}
                justificativa={selectedRow != null ? justificativas[selectedRow] ?? null : null}
                onChange={onChange}
                onSelectRow={setSelectedRow}
              />
            )}
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
