import { CheckCircle2, ExternalLink, FileText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RevenueBatchResult } from "@/lib/lancamentos/revenueBatch";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

interface Props {
  result: RevenueBatchResult | null;
  open: boolean;
  onClose: () => void;
  onOpenCompetence: (competence: string) => void;
}

export function RevenueImportSummaryDialog({ result, open, onClose, onOpenCompetence }: Props) {
  if (!result) return null;
  const totalEntries = result.periods.reduce((sum, period) => sum + period.entries.length, 0);
  const allOk = result.periods.every(period => period.referenceVerified && !period.validationIssues.length && !period.warnings.length);

  return <Dialog open={open} onOpenChange={value => !value && onClose()}>
    <DialogContent className="max-h-[86vh] w-[94vw] max-w-4xl overflow-hidden border-border bg-background p-0">
      <DialogHeader className="border-b border-border px-6 py-5 text-left">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            {allOk ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <TriangleAlert className="h-5 w-5 text-amber-500" />}
          </div>
          <div>
            <DialogTitle>Resumo da importação de faturamento</DialogTitle>
            <DialogDescription className="mt-1">
              {result.periods.length} competência(s) identificada(s) · {totalEntries} lançamento(s) gerado(s) · ano(s) {result.years.join(", ")}.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[66vh] overflow-auto px-6 py-5">
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate" title={result.sourceFiles.join(", ")}>{result.sourceFiles.join(", ")}</span>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-muted/50 text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Competência</th>
                <th className="px-3 py-2">Linhas importadas</th>
                <th className="px-3 py-2 text-right">Total faturado</th>
                <th className="px-3 py-2">Situação</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {result.periods.map(period => {
                const ok = period.referenceVerified && !period.validationIssues.length && !period.warnings.length;
                return <tr key={period.competence} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums">{period.competence}</td>
                  <td className="px-3 py-3">
                    {period.entries.length ? <div className="space-y-1">
                      {period.entries.map(entry => <div key={entry.id} className="flex items-center justify-between gap-4"><span className="truncate text-muted-foreground" title={entry.history}>{entry.history}</span><span className="whitespace-nowrap tabular-nums text-foreground">{money(entry.amountInCents)}</span></div>)}
                    </div> : <span className="text-muted-foreground">Nenhum lançamento necessário</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{money(period.reference.totalAmountInCents)}</td>
                  <td className="px-3 py-3">{ok ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Importado</span> : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><TriangleAlert className="h-3.5 w-3.5" />Revisar</span>}</td>
                  <td className="px-2 py-2"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={`Abrir ${period.competence}`} onClick={() => onOpenCompetence(period.competence)}><ExternalLink className="h-3.5 w-3.5" /></Button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        {(result.warnings.length > 0 || result.validationIssues.length > 0) && <div className="mt-4 rounded-md border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-muted-foreground">
          {[...new Set([...result.warnings, ...result.validationIssues])].map(issue => <p key={issue} className="mt-1 first:mt-0">• {issue}</p>)}
        </div>}
      </div>

      <div className="flex justify-end border-t border-border px-6 py-4"><Button onClick={onClose}>Fechar</Button></div>
    </DialogContent>
  </Dialog>;
}
