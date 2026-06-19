import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2,
  FileText,
  Save,
  Upload,
  Plus,
  Trash2,
  Search,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  parsePlanoContasContent,
  serializePlanoContas,
  type PlanoContasItem,
  type PlanoContasPreferencia,
} from "@/lib/planoContas";

interface PlanoContasModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

interface PendingImport {
  headers: string[];
  headerRowIdx: number;
  rows: any[][];
  crIdx: number;
  completoIdx: number; // -1 = não usar
  descricaoIdx: number;
  autoDetected: boolean;
}

const normalize = (name: string): string =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s.]+/g, " ").trim();

const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
  const normalizedHeaders = headers.map((h) => (h ? normalize(String(h)) : ""));
  const normalizedNames = possibleNames.map(normalize);
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex((h) => h.startsWith(name));
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
};

const CR_NAMES = [
  "c.r.",
  "cr",
  "c.r",
  "codigo reduzido",
  "código reduzido",
  "cod reduzido",
  "numero da conta",
  "número da conta",
  "conta reduzida",
  "reduzido",
];
const COMPLETO_NAMES = [
  "codigo completo",
  "código completo",
  "codigo contabil",
  "código contábil",
  "conta completa",
  "codigo analitico",
  "código analítico",
  "classificacao",
  "classificação",
  "conta contabil",
  "conta contábil",
];
const DESC_NAMES = [
  "descrição",
  "descricao",
  "descrição da conta",
  "descricao da conta",
  "desc",
  "desc.",
  "nome",
];

const emptyItem = (): PlanoContasItem => ({ cr: "", codigo_completo: "", descricao: "", codigo: "" });

export const PlanoContasModal = ({ isOpen, onClose, clientId, clientName }: PlanoContasModalProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<PlanoContasItem[]>([]);
  const [preferencia, setPreferencia] = useState<PlanoContasPreferencia>("cr");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchPlanoContas();
      setSearchTerm("");
      setPendingImport(null);
    }
  }, [isOpen, clientId]);

  const fetchPlanoContas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("planos_contas")
        .select("id, conteudo")
        .eq("user_id", clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsed = parsePlanoContasContent(data.conteudo);
        setItems(parsed.items);
        setPreferencia(parsed.preferencia);
        setExistingId(data.id);
      } else {
        setItems([]);
        setPreferencia("cr");
        setExistingId(null);
      }
    } catch (error) {
      console.error("Error fetching plano de contas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportXlsx = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

        if (rows.length < 2) {
          toast.error("Planilha vazia ou sem dados suficientes");
          return;
        }

        let headerRowIdx = 0;
        let bestHeaders: string[] = rows[0].map(String);

        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const rowHeaders = rows[i].map(String);
          const crIdx = findColumnIndex(rowHeaders, CR_NAMES);
          const completoIdx = findColumnIndex(rowHeaders, COMPLETO_NAMES);
          const descIdx = findColumnIndex(rowHeaders, DESC_NAMES);
          if ((crIdx !== -1 || completoIdx !== -1) && descIdx !== -1) {
            headerRowIdx = i;
            bestHeaders = rowHeaders;
            break;
          }
        }

        const crIdx = findColumnIndex(bestHeaders, CR_NAMES);
        const completoIdx = findColumnIndex(bestHeaders, COMPLETO_NAMES);
        const descricaoIdx = findColumnIndex(bestHeaders, DESC_NAMES);

        setPendingImport({
          headers: bestHeaders,
          headerRowIdx,
          rows,
          crIdx: crIdx !== -1 ? crIdx : 0,
          completoIdx, // pode ser -1 (ignorar)
          descricaoIdx: descricaoIdx !== -1 ? descricaoIdx : Math.min(1, bestHeaders.length - 1),
          autoDetected: (crIdx !== -1 || completoIdx !== -1) && descricaoIdx !== -1,
        });
      } catch (err) {
        console.error("Error importing XLSX:", err);
        toast.error("Erro ao ler a planilha");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const confirmImport = () => {
    if (!pendingImport) return;
    const { rows, headerRowIdx, crIdx, completoIdx, descricaoIdx } = pendingImport;

    const imported: PlanoContasItem[] = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const cr = String(row[crIdx] || "").trim();
      const codigo_completo = completoIdx >= 0 ? String(row[completoIdx] || "").trim() : "";
      const descricao = String(row[descricaoIdx] || "").trim();
      if (cr || codigo_completo) {
        imported.push({ cr, codigo_completo, descricao, codigo: cr || codigo_completo });
      }
    }

    if (imported.length === 0) {
      toast.error("Nenhuma conta encontrada com as colunas selecionadas");
      return;
    }

    setItems(imported);
    setPendingImport(null);
    toast.success(`${imported.length} contas importadas com sucesso!`);
  };

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: handleImportXlsx,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const handleSave = async () => {
    const valid = items.filter((i) => i.cr || i.codigo_completo);
    if (valid.length === 0) {
      toast.error("O plano de contas não pode estar vazio");
      return;
    }
    if (preferencia === "cr" && valid.every((i) => !i.cr)) {
      toast.error("Nenhuma linha tem C.R. preenchido — não dá pra usar essa preferência");
      return;
    }
    if (preferencia === "completo" && valid.every((i) => !i.codigo_completo)) {
      toast.error("Nenhuma linha tem Código Completo — não dá pra usar essa preferência");
      return;
    }

    setIsSaving(true);
    try {
      const conteudo = serializePlanoContas(valid, preferencia);

      if (existingId) {
        const { error } = await supabase
          .from("planos_contas")
          .update({ conteudo, updated_at: new Date().toISOString() })
          .eq("id", existingId);
        if (error) throw error;
        toast.success("Plano de contas atualizado!");
      } else {
        const { error } = await supabase
          .from("planos_contas")
          .insert({ user_id: clientId, conteudo, created_by: user?.id });
        if (error) throw error;
        toast.success("Plano de contas cadastrado!");
      }

      onClose();
    } catch (error: any) {
      console.error("Error saving plano de contas:", error);
      toast.error("Erro ao salvar plano de contas");
    } finally {
      setIsSaving(false);
    }
  };

  const addRow = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "cr" | "codigo_completo" | "descricao", value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.cr.toLowerCase().includes(term) ||
        item.codigo_completo.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term),
    );
  }, [items, searchTerm]);

  const isFiltered = searchTerm.trim().length > 0;

  const previewRows = useMemo(() => {
    if (!pendingImport) return [];
    const { rows, headerRowIdx, crIdx, completoIdx, descricaoIdx } = pendingImport;
    const preview: { cr: string; codigo_completo: string; descricao: string }[] = [];
    for (let i = headerRowIdx + 1; i < Math.min(headerRowIdx + 6, rows.length); i++) {
      const row = rows[i];
      preview.push({
        cr: String(row[crIdx] || "").trim(),
        codigo_completo: completoIdx >= 0 ? String(row[completoIdx] || "").trim() : "",
        descricao: String(row[descricaoIdx] || "").trim(),
      });
    }
    return preview;
  }, [pendingImport]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Plano de Contas - {clientName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : pendingImport ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                {pendingImport.autoDetected ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <h3 className="font-medium text-sm">
                  {pendingImport.autoDetected
                    ? "Colunas identificadas automaticamente — confirme ou altere antes de importar"
                    : "Não foi possível identificar automaticamente — selecione as colunas corretas"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">C.R. (reduzido)</label>
                  <Select
                    value={String(pendingImport.crIdx)}
                    onValueChange={(v) =>
                      setPendingImport((prev) => (prev ? { ...prev, crIdx: parseInt(v) } : null))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingImport.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}: {h || "(vazio)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Código Completo <span className="text-muted-foreground/70">(opcional)</span>
                  </label>
                  <Select
                    value={String(pendingImport.completoIdx)}
                    onValueChange={(v) =>
                      setPendingImport((prev) => (prev ? { ...prev, completoIdx: parseInt(v) } : null))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">— Não usar —</SelectItem>
                      {pendingImport.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}: {h || "(vazio)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
                  <Select
                    value={String(pendingImport.descricaoIdx)}
                    onValueChange={(v) =>
                      setPendingImport((prev) => (prev ? { ...prev, descricaoIdx: parseInt(v) } : null))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingImport.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}: {h || "(vazio)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização (primeiras linhas):</p>
            <div className="border rounded-lg overflow-auto flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[140px]">Código Completo</th>
                    <th className="text-left px-3 py-2 font-medium w-[110px]">C.R.</th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-3 py-2 font-mono text-xs">{row.codigo_completo || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.cr || "—"}</td>
                      <td className="px-3 py-2 text-xs">{row.descricao || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {pendingImport.rows.length - pendingImport.headerRowIdx - 1} linhas de dados encontradas
            </p>

            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setPendingImport(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmImport}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmar e Importar
              </Button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`flex-1 overflow-hidden flex flex-col min-h-0 ${
              isDragActive ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""
            }`}
          >
            <input {...getInputProps()} />

            {/* IA preferencia */}
            <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">IA vai ler:</p>
                  <p className="text-xs text-muted-foreground truncate">
                    A IA recebe apenas o campo selecionado para reduzir custo.
                  </p>
                </div>
              </div>
              <ToggleGroup
                type="single"
                value={preferencia}
                onValueChange={(v) => {
                  if (v === "cr" || v === "completo") setPreferencia(v);
                }}
                className="shrink-0"
              >
                <ToggleGroupItem value="cr" size="sm" className="text-xs px-3">
                  C.R.
                </ToggleGroupItem>
                <ToggleGroupItem value="completo" size="sm" className="text-xs px-3">
                  Código Completo
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={openFileDialog}>
                <Upload className="h-4 w-4 mr-1" />
                Importar XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Linha
              </Button>
              <div className="flex-1" />
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar conta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-52"
                />
              </div>
            </div>

            {isDragActive && (
              <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center mb-3 bg-primary/5">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-primary font-medium">Solte o arquivo XLSX aqui</p>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-lg min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[180px]">
                      Código Completo
                      {preferencia === "completo" && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">• IA</span>
                      )}
                    </th>
                    <th className="text-left px-3 py-2 font-medium w-[120px]">
                      C.R.
                      {preferencia === "cr" && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">• IA</span>
                      )}
                    </th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-muted-foreground">
                        {isFiltered
                          ? "Nenhuma conta encontrada"
                          : "Nenhuma conta cadastrada. Importe um arquivo XLSX ou adicione manualmente."}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, displayIdx) => {
                      const realIdx = isFiltered ? items.indexOf(item) : displayIdx;
                      return (
                        <tr key={realIdx} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="px-2 py-1">
                            <Input
                              value={item.codigo_completo}
                              onChange={(e) => updateRow(realIdx, "codigo_completo", e.target.value)}
                              className="h-8 text-xs font-mono border-0 bg-transparent shadow-none focus:ring-1"
                              placeholder="Ex: 1.1.01.001"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={item.cr}
                              onChange={(e) => updateRow(realIdx, "cr", e.target.value)}
                              className="h-8 text-xs font-mono border-0 bg-transparent shadow-none focus:ring-1"
                              placeholder="Ex: 370"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={item.descricao}
                              onChange={(e) => updateRow(realIdx, "descricao", e.target.value)}
                              className="h-8 text-xs border-0 bg-transparent shadow-none focus:ring-1"
                              placeholder="Ex: ATIVO"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(realIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {items.length} conta(s) cadastrada(s)
              {isFiltered && ` • ${filteredItems.length} exibida(s)`}
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          {!pendingImport && (
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {existingId ? "Atualizar" : "Salvar"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
