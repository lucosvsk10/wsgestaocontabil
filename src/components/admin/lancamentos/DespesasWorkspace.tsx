import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExpenseEntry,
  ExpenseGroupSide,
  ExpenseImportIssue,
  exportGroupedExpenses,
  groupExpenseEntries,
  readExpenseWorkbook,
} from "@/lib/lancamentos/expenseWorkbook";
import { cn } from "@/lib/utils";

interface DespesasWorkspaceProps {
  month: string;
  year: string;
}

const tableInputClass =
  "h-8 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30 dark:bg-transparent";

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountInCents / 100);
}

function lastDayOfCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month), 0);
  return `${String(date.getDate()).padStart(2, "0")}/${month}/${year}`;
}

function countDescriptionConflicts(entries: ExpenseEntry[]) {
  const descriptions = new Map<string, Set<string>>();
  entries.forEach((entry) => {
    [
      [`D:${entry.debitCode}`, entry.debitDescription],
      [`C:${entry.creditCode}`, entry.creditDescription],
    ].forEach(([key, description]) => {
      if (!description) return;
      const values = descriptions.get(key) ?? new Set<string>();
      values.add(description.trim().toLocaleLowerCase("pt-BR"));
      descriptions.set(key, values);
    });
  });
  return Array.from(descriptions.values()).filter((values) => values.size > 1).length;
}

export function DespesasWorkspace({ month, year }: DespesasWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [issues, setIssues] = useState<ExpenseImportIssue[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [ignoredRows, setIgnoredRows] = useState(0);
  const [groupSide, setGroupSide] = useState<ExpenseGroupSide>("debit");
  const [view, setView] = useState("detalhada");
  const [isReading, setIsReading] = useState(false);

  const competence = `${month}/${year}`;
  const exportDate = lastDayOfCompetence(month, year);
  const groupedEntries = useMemo(
    () => groupExpenseEntries(entries, groupSide, exportDate),
    [entries, exportDate, groupSide],
  );
  const detailedTotal = useMemo(
    () => entries.reduce((total, entry) => total + entry.amountInCents, 0),
    [entries],
  );
  const groupedTotal = useMemo(
    () => groupedEntries.reduce((total, entry) => total + entry.amountInCents, 0),
    [groupedEntries],
  );
  const missingDescriptions = useMemo(
    () => entries.filter((entry) => !entry.debitDescription || !entry.creditDescription).length,
    [entries],
  );
  const outsideCompetence = useMemo(
    () => entries.filter((entry) => !entry.date.endsWith(`/${month}/${year}`)).length,
    [entries, month, year],
  );
  const descriptionConflicts = useMemo(() => countDescriptionConflicts(entries), [entries]);
  const totalsMatch = detailedTotal === groupedTotal;
  const canExport = entries.length > 0
    && totalsMatch
    && missingDescriptions === 0
    && outsideCompetence === 0
    && descriptionConflicts === 0;

  const updateEntry = (id: string, field: keyof ExpenseEntry, value: string) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    setIsReading(true);
    const importedEntries: ExpenseEntry[] = [];
    const importedIssues: ExpenseImportIssue[] = [];
    let importedIgnoredRows = 0;

    for (const file of selectedFiles) {
      try {
        const result = await readExpenseWorkbook(file);
        importedEntries.push(...result.entries);
        importedIssues.push(...result.issues);
        importedIgnoredRows += result.ignoredRows;
      } catch {
        importedIssues.push({
          id: `${file.name}-read-error`,
          fileName: file.name,
          sheetName: "",
          row: 0,
          message: "Não foi possível ler o arquivo. Confirme se ele é um Excel válido exportado pelo Calima.",
        });
      }
    }

    setEntries((current) => {
      const existing = new Set(current.map((entry) => entry.id));
      return [...current, ...importedEntries.filter((entry) => !existing.has(entry.id))];
    });
    setIssues((current) => [...current, ...importedIssues]);
    setIgnoredRows((current) => current + importedIgnoredRows);
    setFiles((current) => Array.from(new Set([...current, ...selectedFiles.map((file) => file.name)])));
    setIsReading(false);
  };

  const clearImport = () => {
    setEntries([]);
    setIssues([]);
    setFiles([]);
    setIgnoredRows(0);
    setView("detalhada");
  };

  return (
    <section className="mt-5 space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-md border border-border bg-background p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Importar despesas do Calima</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Selecione o Excel exportado pelo Calima. A leitura é direta e não utiliza inteligência artificial.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isReading}
              onClick={() => inputRef.current?.click()}
              className="border-border bg-transparent text-foreground shadow-none hover:bg-muted dark:border-white/15 dark:hover:bg-white/5"
            >
              {isReading ? "Lendo arquivo..." : files.length ? "Adicionar Excel" : "Selecionar Excel"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={handleFiles}
            />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            {files.length ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {files.map((file) => <span key={file} className="text-foreground">{file}</span>)}
                <button type="button" onClick={clearImport} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Limpar importação
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado nesta competência.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-background p-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Conferência da leitura</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Lançamentos válidos</dt><dd className="font-medium tabular-nums text-foreground">{entries.length}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Linhas com problema</dt><dd className="font-medium tabular-nums text-foreground">{issues.length}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Linhas informativas</dt><dd className="font-medium tabular-nums text-foreground">{ignoredRows}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Fora da competência</dt><dd className="font-medium tabular-nums text-foreground">{outsideCompetence}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Nomes conflitantes</dt><dd className="font-medium tabular-nums text-foreground">{descriptionConflicts}</dd></div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3"><dt className="text-muted-foreground">Total identificado</dt><dd className="font-semibold tabular-nums text-foreground">{formatCurrency(detailedTotal)}</dd></div>
          </dl>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-border bg-muted/25 p-4">
          <h3 className="text-sm font-semibold text-foreground">Linhas que precisam de atenção</h3>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-muted-foreground">
            {issues.map((issue) => (
              <p key={issue.id}>
                <span className="font-medium text-foreground">{issue.fileName}{issue.sheetName ? ` · ${issue.sheetName}` : ""}{issue.row ? ` · linha ${issue.row}` : ""}:</span>{" "}
                {issue.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-background">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="h-9 rounded-sm bg-muted p-1">
              <TabsTrigger value="detalhada" className="h-7 px-3 text-xs">Visão detalhada</TabsTrigger>
              <TabsTrigger value="agrupada" className="h-7 px-3 text-xs">Visão agrupada</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">Agrupar pela conta de</span>
            <div className="flex rounded-sm border border-border p-0.5">
              {(["debit", "credit"] as ExpenseGroupSide[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setGroupSide(side)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-xs transition-colors",
                    groupSide === side ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {side === "debit" ? "Débito" : "Crédito"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "detalhada" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-32 border-b border-r border-border px-3 py-2 font-medium">Data</th>
                  <th className="min-w-[260px] border-b border-r border-border px-3 py-2 font-medium">Histórico</th>
                  <th className="w-24 border-b border-r border-border px-3 py-2 font-medium">Débito</th>
                  <th className="min-w-[190px] border-b border-r border-border px-3 py-2 font-medium">Descrição débito</th>
                  <th className="w-24 border-b border-r border-border px-3 py-2 font-medium">Crédito</th>
                  <th className="min-w-[190px] border-b border-r border-border px-3 py-2 font-medium">Descrição crédito</th>
                  <th className="w-36 border-b border-border px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-b-0">
                    <td className="border-r border-border"><Input value={entry.date} onChange={(event) => updateEntry(entry.id, "date", event.target.value)} className={tableInputClass} /></td>
                    <td className="border-r border-border"><Input value={entry.history} onChange={(event) => updateEntry(entry.id, "history", event.target.value)} className={tableInputClass} /></td>
                    <td className="border-r border-border"><Input value={entry.debitCode} onChange={(event) => updateEntry(entry.id, "debitCode", event.target.value)} className={tableInputClass} /></td>
                    <td className="border-r border-border"><Input value={entry.debitDescription} onChange={(event) => updateEntry(entry.id, "debitDescription", event.target.value)} className={tableInputClass} placeholder="Nome da conta" /></td>
                    <td className="border-r border-border"><Input value={entry.creditCode} onChange={(event) => updateEntry(entry.id, "creditCode", event.target.value)} className={tableInputClass} /></td>
                    <td className="border-r border-border"><Input value={entry.creditDescription} onChange={(event) => updateEntry(entry.id, "creditDescription", event.target.value)} className={tableInputClass} placeholder="Nome da conta" /></td>
                    <td className="px-3 text-right tabular-nums text-foreground">{formatCurrency(entry.amountInCents)}</td>
                  </tr>
                ))}
                {!entries.length && (
                  <tr><td colSpan={7} className="h-40 px-4 text-center text-sm text-muted-foreground">Importe o Excel do Calima para visualizar as despesas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-32 border-b border-r border-border px-3 py-2 font-medium">Data</th>
                  <th className="border-b border-r border-border px-3 py-2 font-medium">Conta agrupada</th>
                  <th className="border-b border-r border-border px-3 py-2 font-medium">Contrapartida</th>
                  <th className="w-28 border-b border-r border-border px-3 py-2 text-center font-medium">Originais</th>
                  <th className="w-40 border-b border-border px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedEntries.map((entry) => {
                  const groupedCode = groupSide === "debit" ? entry.debitCode : entry.creditCode;
                  const groupedDescription = groupSide === "debit" ? entry.debitDescription : entry.creditDescription;
                  const oppositeCode = groupSide === "debit" ? entry.creditCode : entry.debitCode;
                  const oppositeDescription = groupSide === "debit" ? entry.creditDescription : entry.debitDescription;
                  return (
                    <tr key={entry.sourceEntryIds.join("-")} className="border-b border-border last:border-b-0">
                      <td className="border-r border-border px-3 py-3 text-muted-foreground">{entry.date}</td>
                      <td className="border-r border-border px-3 py-3"><span className="font-medium text-foreground">{groupedDescription || `Conta ${groupedCode}`}</span><span className="ml-2 text-xs text-muted-foreground">C.R. {groupedCode}</span></td>
                      <td className="border-r border-border px-3 py-3"><span className="text-foreground">{oppositeDescription || `Conta ${oppositeCode}`}</span><span className="ml-2 text-xs text-muted-foreground">C.R. {oppositeCode}</span></td>
                      <td className="border-r border-border px-3 py-3 text-center tabular-nums text-muted-foreground">{entry.sourceCount}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">{formatCurrency(entry.amountInCents)}</td>
                    </tr>
                  );
                })}
                {!groupedEntries.length && (
                  <tr><td colSpan={5} className="h-40 px-4 text-center text-sm text-muted-foreground">Nenhum lançamento disponível para agrupamento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{entries.length} lançamentos originais → {groupedEntries.length} lançamentos agrupados</p>
            <p>Detalhado {formatCurrency(detailedTotal)} · Agrupado {formatCurrency(groupedTotal)} · Diferença {formatCurrency(groupedTotal - detailedTotal)}</p>
            {missingDescriptions > 0 && <p className="text-foreground">Preencha os nomes das contas em {missingDescriptions} linha(s) antes de exportar.</p>}
            {outsideCompetence > 0 && <p className="text-foreground">Corrija a data de {outsideCompetence} linha(s) que não pertencem a {competence}.</p>}
            {descriptionConflicts > 0 && <p className="text-foreground">Padronize os nomes usados para o mesmo código reduzido antes de exportar.</p>}
          </div>
          <Button
            type="button"
            disabled={!canExport}
            onClick={() => exportGroupedExpenses(groupedEntries, competence)}
            className="bg-foreground text-background shadow-none hover:bg-foreground/90 disabled:opacity-40"
          >
            Exportar agrupado para o Calima
          </Button>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Regra de segurança: o sistema agrupa pela conta escolhida, mas mantém contrapartidas diferentes em linhas separadas. Assim, nenhum lançamento é combinado de forma contabilmente inválida.
      </p>
    </section>
  );
}
