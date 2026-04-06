import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportXlsxModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  competencia: string;
  onSuccess: () => void;
}

type ColumnMapping = {
  data: string;
  historico: string;
  debito: string;
  credito: string;
  valor: string;
  centro_custo_debito: string;
  centro_custo_credito: string;
};

const SYSTEM_COLUMNS: { key: keyof ColumnMapping; label: string; mappedLabel: string; required: boolean }[] = [
  { key: "data", label: "Data", mappedLabel: "Data", required: false },
  { key: "historico", label: "Histórico", mappedLabel: "Histórico", required: false },
  { key: "debito", label: "Débito", mappedLabel: "Conta de débito", required: false },
  { key: "credito", label: "Crédito", mappedLabel: "Conta de crédito", required: false },
  { key: "valor", label: "Valor", mappedLabel: "Valor", required: true },
  { key: "centro_custo_debito", label: "CC Débito", mappedLabel: "Centro de custo débito", required: false },
  { key: "centro_custo_credito", label: "CC Crédito", mappedLabel: "Centro de custo crédito", required: false },
];

const IGNORE_VALUE = "__ignore__";

export const ImportXlsxModal = ({ isOpen, onClose, clientId, competencia, onSuccess }: ImportXlsxModalProps) => {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, any>[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    data: IGNORE_VALUE,
    historico: IGNORE_VALUE,
    debito: IGNORE_VALUE,
    credito: IGNORE_VALUE,
    valor: IGNORE_VALUE,
    centro_custo_debito: IGNORE_VALUE,
    centro_custo_credito: IGNORE_VALUE,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setSheetNames([]);
    setSelectedSheet("");
    setSheetColumns([]);
    setSheetData([]);
    setWorkbook(null);
    setMapping({ data: IGNORE_VALUE, historico: IGNORE_VALUE, debito: IGNORE_VALUE, credito: IGNORE_VALUE, valor: IGNORE_VALUE, centro_custo_debito: IGNORE_VALUE, centro_custo_credito: IGNORE_VALUE });
    setPreviewRows([]);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Formato não suportado. Use .xlsx, .xls ou .csv");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        if (wb.SheetNames.length === 1) {
          selectSheet(wb, wb.SheetNames[0]);
        } else {
          setStep("mapping");
        }
      } catch (err: any) {
        toast.error("Erro ao ler arquivo: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const selectSheet = (wb: XLSX.WorkBook, name: string) => {
    setSelectedSheet(name);
    const sheet = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    setSheetData(json);

    if (json.length > 0) {
      const cols = Object.keys(json[0]);
      setSheetColumns(cols);
      
      // Auto-map columns by name similarity
      const autoMapping: ColumnMapping = {
        data: IGNORE_VALUE,
        historico: IGNORE_VALUE,
        debito: IGNORE_VALUE,
        credito: IGNORE_VALUE,
        valor: IGNORE_VALUE,
        centro_custo_debito: IGNORE_VALUE,
        centro_custo_credito: IGNORE_VALUE,
      };

      for (const col of cols) {
        const lower = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (lower.includes("data") || lower.includes("date")) autoMapping.data = col;
        else if (lower.includes("historic") || lower.includes("descri") || lower.includes("memo")) autoMapping.historico = col;
        else if (lower.includes("debit") || lower.includes("debito")) autoMapping.debito = col;
        else if (lower.includes("credit") || lower.includes("credito")) autoMapping.credito = col;
        else if (lower.includes("valor") || lower.includes("value") || lower.includes("amount") || lower.includes("total")) {
          if (autoMapping.valor === IGNORE_VALUE) autoMapping.valor = col;
        }
        else if ((lower.includes("centro") || lower.includes("cc")) && lower.includes("debit")) autoMapping.centro_custo_debito = col;
        else if ((lower.includes("centro") || lower.includes("cc")) && lower.includes("credit")) autoMapping.centro_custo_credito = col;
      }

      setMapping(autoMapping);
    }
    setStep("mapping");
  };

  const handleSheetChange = (name: string) => {
    if (workbook) selectSheet(workbook, name);
  };

  const goToPreview = () => {
    if (mapping.valor === IGNORE_VALUE) {
      toast.error("A coluna 'Valor' é obrigatória para importação");
      return;
    }

    // Build preview
    const mapped = sheetData.map((row) => ({
      data: mapping.data !== IGNORE_VALUE ? String(row[mapping.data] ?? "") : null,
      historico: mapping.historico !== IGNORE_VALUE ? String(row[mapping.historico] ?? "") : null,
      debito: mapping.debito !== IGNORE_VALUE ? String(row[mapping.debito] ?? "") : null,
      credito: mapping.credito !== IGNORE_VALUE ? String(row[mapping.credito] ?? "") : null,
      valor: mapping.valor !== IGNORE_VALUE ? row[mapping.valor] : null,
      centro_custo_debito: mapping.centro_custo_debito !== IGNORE_VALUE ? String(row[mapping.centro_custo_debito] ?? "") : null,
      centro_custo_credito: mapping.centro_custo_credito !== IGNORE_VALUE ? String(row[mapping.centro_custo_credito] ?? "") : null,
    }));

    setPreviewRows(mapped);
    setStep("preview");
  };

  const parseDate = (raw: any): string | null => {
    if (!raw) return null;
    // If it's a number (Excel serial date)
    if (typeof raw === "number") {
      const excelDate = XLSX.SSF.parse_date_code(raw);
      if (excelDate) {
        const y = excelDate.y;
        const m = String(excelDate.m).padStart(2, "0");
        const d = String(excelDate.d).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
    const str = String(raw).trim();
    // DD/MM/YYYY
    const brMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    return null;
  };

  const parseValor = (raw: any): number | null => {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return raw;
    let str = String(raw).trim();
    // Remove currency symbols and spaces
    str = str.replace(/[R$\s]/g, "");
    // Handle Brazilian format: 1.234,56 -> 1234.56
    if (str.includes(",")) {
      str = str.replace(/\./g, "").replace(",", ".");
    }
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const handleImport = async () => {
    setIsSaving(true);
    setStep("importing");

    try {
      const records = previewRows
        .map((row) => ({
          user_id: clientId,
          competencia,
          data: parseDate(row.data),
          historico: row.historico || null,
          debito: row.debito || null,
          credito: row.credito || null,
          valor: parseValor(row.valor),
          centro_custo_debito: row.centro_custo_debito || null,
          centro_custo_credito: row.centro_custo_credito || null,
        }))
        .filter((r) => r.valor !== null && r.valor !== 0);

      if (records.length === 0) {
        toast.error("Nenhum registro válido encontrado para importar");
        setStep("preview");
        setIsSaving(false);
        return;
      }

      // Insert in batches of 100
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from("lancamentos_alinhados")
          .insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      toast.success(`${inserted} lançamento(s) importado(s) com sucesso!`);
      onSuccess();
      resetState();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
      setStep("preview");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPreviewValue = (val: any) => {
    if (val === null || val === undefined || val === "") return "-";
    return String(val);
  };

  const validPreviewCount = previewRows.filter((r) => parseValor(r.valor) !== null && parseValor(r.valor) !== 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetState(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Planilha
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Selecione uma planilha</p>
                <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .xlsx, .xls, .csv</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === "mapping" && (
          <div className="space-y-5 py-2">
            {/* File info */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground truncate">{fileName}</span>
              <span className="text-xs text-muted-foreground ml-auto">{sheetData.length} linhas</span>
            </div>

            {/* Sheet selector (if multiple) */}
            {sheetNames.length > 1 && (
              <div className="space-y-1.5">
                <Label>Selecione a aba</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Column mapping */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Mapeamento de colunas</Label>
              <p className="text-xs text-muted-foreground">
                Associe as colunas do seu arquivo com os campos do sistema
              </p>

              <div className="space-y-2.5">
                {SYSTEM_COLUMNS.map((col) => (
                  <div key={col.key} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-right">
                      <span className="text-sm text-foreground">{col.label}</span>
                      {col.required && <span className="text-destructive ml-0.5">*</span>}
                    </div>
                    <div className="text-muted-foreground text-xs">→</div>
                    <Select
                      value={mapping[col.key]}
                      onValueChange={(v) => setMapping((prev) => ({ ...prev, [col.key]: v }))}
                    >
                      <SelectTrigger className="flex-1 bg-background h-9 text-sm">
                        <SelectValue placeholder={col.mappedLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE_VALUE}>
                          <span className="text-muted-foreground italic">Ignorar</span>
                        </SelectItem>
                        {sheetColumns.map((sc) => (
                          <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[col.key] !== IGNORE_VALUE && (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample data preview */}
            {sheetData.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prévia dos dados (3 primeiras linhas)</Label>
                <div className="overflow-x-auto rounded-lg border border-border/30">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {sheetColumns.slice(0, 8).map((c) => (
                          <th key={c} className="py-2 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {sheetData.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {sheetColumns.slice(0, 8).map((c) => (
                            <td key={c} className="py-1.5 px-3 text-foreground whitespace-nowrap max-w-[120px] truncate">
                              {formatPreviewValue(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-sm text-foreground">
                {validPreviewCount} lançamento(s) válido(s) de {previewRows.length} linha(s)
              </span>
            </div>

            {previewRows.length - validPreviewCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {previewRows.length - validPreviewCount} linha(s) serão ignorada(s) (valor inválido ou zero)
                </span>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border/30 max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-muted/50">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Histórico</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Débito</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">Crédito</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">CC Déb.</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">CC Créd.</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {previewRows.slice(0, 20).map((row, i) => {
                    const val = parseValor(row.valor);
                    const isValid = val !== null && val !== 0;
                    return (
                      <tr key={i} className={!isValid ? "opacity-40" : ""}>
                        <td className="py-1.5 px-3 text-foreground whitespace-nowrap">{formatPreviewValue(row.data)}</td>
                        <td className="py-1.5 px-3 text-foreground max-w-[150px] truncate">{formatPreviewValue(row.historico)}</td>
                        <td className="py-1.5 px-3 font-mono text-muted-foreground">{formatPreviewValue(row.debito)}</td>
                        <td className="py-1.5 px-3 font-mono text-muted-foreground">{formatPreviewValue(row.credito)}</td>
                        <td className="py-1.5 px-3 text-muted-foreground text-xs">{formatPreviewValue(row.centro_custo_debito)}</td>
                        <td className="py-1.5 px-3 text-muted-foreground text-xs">{formatPreviewValue(row.centro_custo_credito)}</td>
                        <td className="py-1.5 px-3 text-right font-medium text-foreground">{formatPreviewValue(row.valor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {previewRows.length > 20 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 20 de {previewRows.length} linhas
              </p>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando lançamentos...</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => { resetState(); }}>Voltar</Button>
              <Button onClick={goToPreview} disabled={mapping.valor === IGNORE_VALUE}>
                Pré-visualizar
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={handleImport} disabled={isSaving || validPreviewCount === 0}>
                Importar {validPreviewCount} lançamento(s)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
