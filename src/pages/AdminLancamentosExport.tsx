import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Building2, Calendar, FileSpreadsheet, ListChecks, Hash, FileDown } from "lucide-react";
import { exportCalimaXlsx } from "@/components/admin/lancamentos/exportCalima";
import * as XLSX from "xlsx";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpreadsheetEditor } from "@/components/admin/lancamentos/SpreadsheetEditor";
import { QuickEditPanel } from "@/components/admin/lancamentos/QuickEditPanel";
import {
  buildSheetData,
  MODE_LABELS,
  type ExportMode,
  type Lancamento,
  type SheetData,
} from "@/components/admin/lancamentos/exportBuilders";
import type { PlanoContasMap } from "@/components/admin/lancamentos/LancamentosTable";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const slug = (s: string) => s.replace(/\s+/g, "_").replace(/[^\w-]/g, "").toLowerCase();

// Auto-limpeza: remove "(-)" e espaços iniciais de células de texto
const autoCleanSheet = (data: SheetData): SheetData => ({
  headers: data.headers.map((h) => h.replace(/\(-\)/g, "").replace(/^\s+/, "")),
  rows: data.rows.map((row) =>
    row.map((cell) => {
      if (cell.numeric) return cell;
      const v = String(cell.value ?? "");
      const cleaned = v.replace(/\(-\)/g, "").replace(/^\s+/, "");
      return cleaned === v ? cell : { ...cell, value: cleaned };
    })
  ),
});

// Padrões pré-definidos para o modo "Saldo por Conta" baseado no código da conta débito
const SALDO_DEFAULTS: Record<string, (mmYYYY: string) => string> = {
  "823": (p) => `PAGTO. SALARIOS E REMUNERAÇÕES ${p}`,
  "826": (p) => `PAGTO. FGTS MÊS ${p}`,
  "777": () => `PAGTO. FORNECEDORES`,
  "111": () => `DEMAIS IMPOSTOS, TAXAS E CONTRIBUIÇÕES, EXCETO IRE CSLL`,
  "114": () => `DESPESAS COM VEÍCULOS, CONSERVAÇÃO DE BENS E NSTALAÇÕES`,
  "134": () => `DESPESAS COM TELEFONEE INTERNET`,
};

// Aplica defaults do modo Saldo: uppercase em tudo + substitui histórico por padrão da conta
const applySaldoDefaults = (data: SheetData, competencia: string): SheetData => {
  const [y, m] = competencia.split("-");
  const mmYYYY = `${m}/${y}`;
  return {
    headers: data.headers.map((h) => h.toUpperCase()),
    rows: data.rows.map((row) => {
      // row layout: [data, debito, historico, valor, credito]
      const debCell = row[1];
      const debCode = String(debCell?.value ?? "").trim();
      const preset = SALDO_DEFAULTS[debCode];
      return row.map((cell, idx) => {
        if (cell.numeric) return cell;
        let v = String(cell.value ?? "");
        if (preset && idx === 2) {
          v = preset(mmYYYY);
        } else {
          v = v.toUpperCase();
        }
        return v === cell.value ? cell : { ...cell, value: v };
      });
    }),
  };
};

const AdminLancamentosExport = () => {
  const { clientId = "", modo = "data" } = useParams<{ clientId: string; modo: ExportMode }>();
  const [params] = useSearchParams();
  const competencia = params.get("competencia") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("Cliente");
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [planoMap, setPlanoMap] = useState<PlanoContasMap>({});
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [filename, setFilename] = useState("");

  const mode = (["data", "conta", "saldo"].includes(modo) ? modo : "data") as ExportMode;
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!clientId || !competencia) {
        toast.error("Parâmetros inválidos");
        navigate(-1);
        return;
      }
      setLoading(true);
      try {
        const [{ data: userData }, { data: lancData }, { data: planoData }] = await Promise.all([
          supabase.from("users").select("name").eq("id", clientId).single(),
          supabase
            .from("lancamentos_alinhados")
            .select("*")
            .eq("user_id", clientId)
            .eq("competencia", competencia)
            .order("data", { ascending: true }),
          supabase.from("planos_contas").select("conteudo").eq("user_id", clientId).maybeSingle(),
        ]);

        const name = userData?.name || "Cliente";
        setClientName(name);
        const lancs = (lancData || []) as Lancamento[];
        setLancamentos(lancs);

        let map: PlanoContasMap = {};
        if (planoData?.conteudo) {
          try {
            const parsed = JSON.parse(planoData.conteudo);
            if (Array.isArray(parsed) && parsed.length > 0 && "codigo" in parsed[0]) {
              for (const item of parsed) {
                const code = String(item.codigo || "").trim();
                if (code) map[code] = String(item.descricao || "").trim();
              }
            } else {
              const items = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : Array.isArray(parsed) ? parsed : [];
              for (const item of items) {
                const code = String(item["Codigo reduzido"] || item["codigo_reduzido"] || "");
                const desc = item["Descrição"] || item["descricao"] || item["Descrição da conta"] || "";
                if (code) map[code] = desc;
              }
            }
          } catch {
            map = {};
          }
        }
        setPlanoMap(map);
        const base = autoCleanSheet(buildSheetData(mode, lancs, map, competencia));
        setSheet(mode === "saldo" ? applySaldoDefaults(base, competencia) : base);
        setFilename(`lancamentos_${slug(name)}_${competencia}_${mode}.xlsx`);
      } catch (e: any) {
        console.error(e);
        toast.error("Erro ao carregar dados: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, competencia, mode]);

  const total = useMemo(
    () => lancamentos.reduce((s, l) => s + (l.valor || 0), 0),
    [lancamentos]
  );

  const monthLabel = useMemo(() => {
    const [y, m] = competencia.split("-");
    const idx = parseInt(m, 10) - 1;
    return `${MONTH_NAMES[idx] || m} / ${y}`;
  }, [competencia]);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasTotalRow = useMemo(
    () => !!sheet?.rows.some((row) => row.some((c) => c.isTotal)),
    [sheet]
  );

  const performDownload = (includeTotal: boolean) => {
    if (!sheet) return;
    const rowsToExport = includeTotal
      ? sheet.rows
      : sheet.rows.filter((row) => !row.some((c) => c.isTotal));
    const aoa: (string | number)[][] = [sheet.headers];
    const merges: XLSX.Range[] = [];
    rowsToExport.forEach((row, rIdx) => {
      const flat: (string | number)[] = [];
      let colCursor = 0;
      row.forEach((cell) => {
        flat.push(cell.value);
        const span = cell.colSpan || 1;
        if (span > 1) {
          merges.push({
            s: { r: rIdx + 1, c: colCursor },
            e: { r: rIdx + 1, c: colCursor + span - 1 },
          });
          for (let i = 1; i < span; i++) flat.push("");
        }
        colCursor += span;
      });
      while (flat.length < sheet.headers.length) flat.push("");
      aoa.push(flat);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (merges.length) ws["!merges"] = merges;
    ws["!cols"] = sheet.headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, name);
    toast.success("Download iniciado");
  };

  const handleDownload = () => {
    if (!sheet) return;
    if (hasTotalRow) {
      setConfirmOpen(true);
    } else {
      performDownload(false);
    }
  };

  const handleDownloadCalima = () => {
    const rows = lancamentos.map((l) => ({
      data: l.data,
      valor: l.valor,
      conta_debito: l.conta_debito,
      conta_credito: l.conta_credito,
      historico: l.historico,
    }));
    const base = filename.replace(/\.xlsx$/i, "");
    exportCalimaXlsx(rows, planoMap, `${base}_calima.xlsx`);
    toast.success("Exportado para Calima ERP");
  };

  // Dirty state + leave guard
  const [isDirty, setIsDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const handleSheetChange = (next: SheetData) => {
    setSheet(next);
    setIsDirty(true);
  };
  const attemptLeave = () => {
    if (isDirty) setLeaveOpen(true);
    else navigate(-1);
  };

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Editor de Exportação
              </h1>
              <p className="text-xs text-muted-foreground">
                Edite o conteúdo antes de baixar o arquivo XLSX
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={attemptLeave}>
              Cancelar
            </Button>
            <Button size="sm" className="rounded-lg" onClick={handleDownload} disabled={loading || !sheet}>
              <Download className="w-4 h-4 mr-1.5" /> Baixar XLSX
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Editor */}
          <div className="bg-card rounded-xl border border-border overflow-hidden h-[calc(100vh-200px)]">
            {loading || !sheet ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : (
              <SpreadsheetEditor
                data={sheet}
                onChange={handleSheetChange}
                selectedRow={selectedRow}
                selectedCol={selectedCol}
                onSelectRow={setSelectedRow}
                onSelectCol={setSelectedCol}
              />
            )}
          </div>

          {/* Sidebar */}
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
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ListChecks className="w-3.5 h-3.5" /> Formato
                </div>
                <p className="text-sm font-medium text-foreground">{MODE_LABELS[mode]}</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Lançamentos
                </span>
                <span className="text-sm font-medium text-foreground">{lancamentos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Linhas no editor</span>
                <span className="text-sm font-medium text-foreground">{sheet?.rows.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-medium text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                </span>
              </div>
            </div>

            {sheet && <QuickEditPanel data={sheet} selectedCol={selectedCol} onChange={handleSheetChange} />}

            <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border">
              <label className="text-xs text-muted-foreground">Nome do arquivo</label>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <Button className="w-full rounded-lg" onClick={handleDownload} disabled={loading || !sheet}>
              <Download className="w-4 h-4 mr-1.5" /> Baixar XLSX
            </Button>
          </aside>
        </div>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas no editor. Se sair agora, todas as edições serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaveOpen(false)}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLeaveOpen(false);
                setIsDirty(false);
                navigate(-1);
              }}
            >
              Sair e descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incluir linha de Total Geral?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja incluir a linha de total geral no arquivo XLSX? Por padrão, ela não é incluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                performDownload(false);
              }}
            >
              Sem total
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                performDownload(true);
              }}
            >
              Incluir total
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminLancamentosExport;
