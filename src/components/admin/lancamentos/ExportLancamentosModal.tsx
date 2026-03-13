import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, SortAsc, List, Calculator } from "lucide-react";
import * as XLSX from "xlsx";
import type { PlanoContasMap } from "./LancamentosTable";

interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  created_at: string;
}

interface ExportLancamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamentos: Lancamento[];
  planoContas: PlanoContasMap;
  clientName: string;
  competencia: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return dateStr;
};

const getDescricao = (codigo: string | null, planoContas: PlanoContasMap) => {
  if (!codigo) return "-";
  return planoContas[codigo] || "-";
};

const getLastDayOfMonth = (competencia: string): string => {
  const [year, month] = competencia.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(lastDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

export const ExportLancamentosModal = ({
  isOpen,
  onClose,
  lancamentos,
  planoContas,
  clientName,
  competencia,
}: ExportLancamentosModalProps) => {
  const [mode, setMode] = useState<"data" | "conta" | "saldo">("data");

  const exportByDate = () => {
    const rows = lancamentos.map((l) => ({
      Data: formatDate(l.data),
      Histórico: l.historico || "-",
      Débito: l.debito || "-",
      "Desc. Débito": getDescricao(l.debito, planoContas),
      Crédito: l.credito || "-",
      "Desc. Crédito": getDescricao(l.credito, planoContas),
      Valor: l.valor ?? 0,
    }));

    const total = lancamentos.reduce((s, l) => s + (l.valor || 0), 0);
    rows.push({
      Data: "",
      Histórico: `Total (${lancamentos.length} lançamentos)`,
      Débito: "",
      "Desc. Débito": "",
      Crédito: "",
      "Desc. Crédito": "",
      Valor: total,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 35 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, `lancamentos_${clientName.replace(/\s+/g, "_")}_${competencia}_por_data.xlsx`);
    onClose();
  };

  const exportByAccount = () => {
    const groups: Record<string, { conta: string; descricao: string; items: Lancamento[] }> = {};
    for (const l of lancamentos) {
      const key = l.debito || "sem-conta";
      if (!groups[key]) {
        groups[key] = {
          conta: l.debito || "Sem conta",
          descricao: getDescricao(l.debito, planoContas),
          items: [],
        };
      }
      groups[key].items.push(l);
    }
    const sorted = Object.values(groups).sort((a, b) =>
      a.conta.localeCompare(b.conta, undefined, { numeric: true })
    );

    const allRows: Record<string, any>[] = [];
    const merges: XLSX.Range[] = [];
    let row = 0;

    for (const group of sorted) {
      allRows.push({
        Data: `Conta: ${group.conta} | ${group.descricao !== "-" ? group.descricao : "Sem descrição"}`,
        Histórico: "",
        Débito: "",
        "Desc. Débito": "",
        Crédito: "",
        "Desc. Crédito": "",
        Valor: "",
      });
      merges.push({ s: { r: row + 1, c: 0 }, e: { r: row + 1, c: 6 } });
      row++;

      for (const l of group.items) {
        allRows.push({
          Data: formatDate(l.data),
          Histórico: l.historico || "-",
          Débito: l.debito || "-",
          "Desc. Débito": getDescricao(l.debito, planoContas),
          Crédito: l.credito || "-",
          "Desc. Crédito": getDescricao(l.credito, planoContas),
          Valor: l.valor ?? 0,
        });
        row++;
      }

      const subtotal = group.items.reduce((s, l) => s + (l.valor || 0), 0);
      allRows.push({
        Data: "",
        Histórico: `Subtotal: ${group.items.length} lançamento(s)`,
        Débito: "",
        "Desc. Débito": "",
        Crédito: "",
        "Desc. Crédito": "",
        Valor: subtotal,
      });
      row++;

      allRows.push({ Data: "", Histórico: "", Débito: "", "Desc. Débito": "", Crédito: "", "Desc. Crédito": "", Valor: "" });
      row++;
    }

    const grandTotal = lancamentos.reduce((s, l) => s + (l.valor || 0), 0);
    allRows.push({
      Data: "",
      Histórico: `Total Geral (${lancamentos.length} lançamentos)`,
      Débito: "",
      "Desc. Débito": "",
      Crédito: "",
      "Desc. Crédito": "",
      Valor: grandTotal,
    });

    const ws = XLSX.utils.json_to_sheet(allRows);
    ws["!merges"] = merges;
    ws["!cols"] = [
      { wch: 12 }, { wch: 35 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Por Conta");
    XLSX.writeFile(wb, `lancamentos_${clientName.replace(/\s+/g, "_")}_${competencia}_por_conta.xlsx`);
    onClose();
  };

  const exportBalanceByAccount = () => {
    const lastDay = getLastDayOfMonth(competencia);

    // Group by debit account and sum values
    const groups: Record<string, { conta: string; descricao: string; total: number }> = {};
    for (const l of lancamentos) {
      const key = l.debito || "sem-conta";
      if (!groups[key]) {
        groups[key] = {
          conta: l.debito || "Sem conta",
          descricao: getDescricao(l.debito, planoContas),
          total: 0,
        };
      }
      groups[key].total += l.valor || 0;
    }

    const sorted = Object.values(groups).sort((a, b) =>
      a.conta.localeCompare(b.conta, undefined, { numeric: true })
    );

    const rows = sorted.map((g) => ({
      Data: lastDay,
      Débito: g.conta,
      Histórico: `(-) ${g.descricao !== "-" ? g.descricao : "Sem descrição"}`,
      Valor: g.total,
      Crédito: "374",
    }));

    // Grand total
    const grandTotal = sorted.reduce((s, g) => s + g.total, 0);
    rows.push({
      Data: "",
      Débito: "",
      Histórico: `Total Geral (${sorted.length} contas)`,
      Valor: grandTotal,
      Crédito: "",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saldo por Conta");
    XLSX.writeFile(wb, `lancamentos_${clientName.replace(/\s+/g, "_")}_${competencia}_saldo_por_conta.xlsx`);
    onClose();
  };

  const handleExport = () => {
    if (mode === "data") exportByDate();
    else if (mode === "conta") exportByAccount();
    else exportBalanceByAccount();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar Lista
          </DialogTitle>
          <DialogDescription>
            Escolha o formato de classificação para exportar os {lancamentos.length} lançamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <button
            onClick={() => setMode("data")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              mode === "data"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              mode === "data" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <SortAsc className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Por Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lista única ordenada cronologicamente
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("conta")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              mode === "conta"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              mode === "conta" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <List className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Por Conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agrupado por conta contábil com subtotais
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("saldo")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              mode === "saldo"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              mode === "saldo" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Saldo por Conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resumo com total por conta (Data, Débito, Histórico, Valor, Crédito)
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleExport} disabled={lancamentos.length === 0} className="rounded-lg">
            <Download className="w-4 h-4 mr-1.5" />
            Exportar XLSX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};