import { useEffect, useMemo, useState } from "react";
import { CalendarRange, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiCompetenceOption {
  competence: string;
  entryCount: number;
  totalInCents?: number;
  existing: boolean;
}

export interface UndatedImportBlock {
  id: string;
  label: string;
  entryCount: number;
  totalInCents?: number;
  suggestedCompetence?: string;
}

export interface MultiCompetenceDecision {
  selected: string[];
  replace: string[];
  manualCompetences: Record<string, string>;
}

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  fileNames: string[];
  options: MultiCompetenceOption[];
  undatedBlocks?: UndatedImportBlock[];
  currentCompetence?: string;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (decision: MultiCompetenceDecision) => void | Promise<void>;
}

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const competencePattern = /^(0[1-9]|1[0-2])\/(20\d{2})$/;

export function MultiCompetenceImportDialog({ open, title = "Competências identificadas", description, fileNames, options, undatedBlocks = [], currentCompetence, saving = false, onCancel, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replace, setReplace] = useState<Set<string>>(new Set());
  const [manualCompetences, setManualCompetences] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(options.filter(option => !option.existing).map(option => option.competence)));
    setReplace(new Set());
    setManualCompetences(Object.fromEntries(undatedBlocks.map(block => [block.id, block.suggestedCompetence || ""])));
  }, [open, options, undatedBlocks]);

  const invalidManual = undatedBlocks.filter(block => !competencePattern.test(manualCompetences[block.id] || ""));
  const unresolvedExisting = [...selected].filter(competence => options.find(option => option.competence === competence)?.existing && !replace.has(competence));
  const canConfirm = (selected.size > 0 || undatedBlocks.length > 0) && unresolvedExisting.length === 0 && invalidManual.length === 0 && !saving;

  const groupedYears = useMemo(() => {
    const years = new Map<string, MultiCompetenceOption[]>();
    options.forEach(option => {
      const year = option.competence.split("/")[1] || "Outros";
      years.set(year, [...(years.get(year) ?? []), option]);
    });
    return [...years.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [options]);

  const toggle = (competence: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(competence)) {
        next.delete(competence);
        setReplace(replacements => {
          const replacementNext = new Set(replacements);
          replacementNext.delete(competence);
          return replacementNext;
        });
      } else next.add(competence);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(options.map(option => option.competence)));
    setReplace(new Set(options.filter(option => option.existing).map(option => option.competence)));
  };

  const selectOnlyCurrent = () => {
    if (!currentCompetence || !options.some(option => option.competence === currentCompetence)) return;
    const option = options.find(item => item.competence === currentCompetence)!;
    setSelected(new Set([currentCompetence]));
    setReplace(option.existing ? new Set([currentCompetence]) : new Set());
  };

  const toggleReplace = (competence: string) => {
    setSelected(current => new Set(current).add(competence));
    setReplace(current => {
      const next = new Set(current);
      if (next.has(competence)) next.delete(competence); else next.add(competence);
      return next;
    });
  };

  return <Dialog open={open} onOpenChange={value => !value && !saving && onCancel()}>
    <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden border-border bg-background p-0">
      <DialogHeader className="border-b border-border px-6 py-5 text-left">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"><CalendarRange className="h-5 w-5" /></div>
          <div><DialogTitle>{title}</DialogTitle><DialogDescription className="mt-1 leading-5">{description || "Revise os meses identificados antes de salvar. Nenhuma competência é alterada até sua confirmação."}</DialogDescription></div>
        </div>
      </DialogHeader>

      <div className="max-h-[67vh] overflow-y-auto px-6 py-5">
        <div className="mb-5 flex items-start gap-2 rounded-md border border-border bg-muted/25 px-4 py-3 text-xs text-muted-foreground"><FileText className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0"><p className="font-medium text-foreground">{fileNames.length === 1 ? fileNames[0] : `${fileNames.length} documentos analisados`}</p>{fileNames.length > 1 && <p className="mt-1 truncate" title={fileNames.join(", ")}>{fileNames.join(", ")}</p>}</div></div>

        {options.length > 0 && <>
          <div className="mb-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={selectAll}>Selecionar todos</Button>{currentCompetence && options.some(option => option.competence === currentCompetence) && <Button type="button" variant="outline" size="sm" onClick={selectOnlyCurrent}>Somente {currentCompetence}</Button>}</div>
          <div className="space-y-5">{groupedYears.map(([year, yearOptions]) => <div key={year}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{year}</p><div className="grid gap-2 sm:grid-cols-2">{yearOptions.map(option => {
            const checked = selected.has(option.competence);
            const replacing = replace.has(option.competence);
            return <div key={option.competence} className={cn("rounded-md border p-3", checked ? "border-cyan-500/40 bg-cyan-500/5" : "border-border")}>
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(option.competence)} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-medium tabular-nums">{option.competence}</span>{option.existing && <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">Já possui dados</span>}</div><p className="mt-1 text-xs text-muted-foreground">{option.entryCount} lançamento(s){option.totalInCents !== undefined ? ` · ${money(option.totalInCents)}` : ""}</p></div></label>
              {checked && option.existing && <div className="mt-3 border-t border-border pt-3"><label className="flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={replacing} onChange={() => toggleReplace(option.competence)} /><span>Substituir o que já existe neste mês</span></label>{!replacing && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Para salvar este mês, confirme a substituição ou desmarque-o.</p>}</div>}
            </div>;
          })}</div></div>)}</div>
        </>}

        {undatedBlocks.length > 0 && <div className="mt-6 border-t border-border pt-5"><div className="mb-3"><p className="font-medium text-foreground">Blocos sem data identificável</p><p className="mt-1 text-xs text-muted-foreground">O documento contém lançamentos agrupados, mas não informa o mês de forma confiável. Informe manualmente a competência de cada bloco no formato MM/AAAA. O sistema não vai inventar datas.</p></div><div className="space-y-2">{undatedBlocks.map(block => {
          const value = manualCompetences[block.id] || "";
          const invalid = Boolean(value) && !competencePattern.test(value);
          return <div key={block.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_180px] sm:items-center"><div><p className="text-sm font-medium">{block.label}</p><p className="mt-1 text-xs text-muted-foreground">{block.entryCount} lançamento(s){block.totalInCents !== undefined ? ` · ${money(block.totalInCents)}` : ""}</p></div><div><Input value={value} placeholder="MM/AAAA" onChange={event => setManualCompetences(current => ({ ...current, [block.id]: event.target.value }))} className={cn(invalid && "border-destructive")} />{invalid && <p className="mt-1 text-[10px] text-destructive">Use MM/AAAA.</p>}</div></div>;
        })}</div></div>}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{selected.size} competência(s) selecionada(s){undatedBlocks.length ? ` · ${undatedBlocks.length} bloco(s) com competência manual` : ""}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={onCancel}>Cancelar</Button><Button disabled={!canConfirm} onClick={() => void onConfirm({ selected: [...selected], replace: [...replace], manualCompetences })}>{saving ? "Salvando..." : "Salvar competências selecionadas"}</Button></div></div>
    </DialogContent>
  </Dialog>;
}
