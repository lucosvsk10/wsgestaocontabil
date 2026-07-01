import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { SheetCell, SheetData } from "@/components/admin/lancamentos/exportBuilders";
import { lookupPlanoContasDescricao } from "@/lib/planoContas";

interface Props {
  data: SheetData;
  selectedRow: number | null;
  planoMap: Record<string, string>;
  competencia: string;
  onChange: (d: SheetData) => void;
  onSelectRow: (r: number | null) => void;
}

const cloneData = (d: SheetData): SheetData => ({
  headers: [...d.headers],
  rows: d.rows.map((r) => r.map((c) => ({ ...c }))),
});

// Sheet columns: 0=Data 1=Conta Débito 2=Desc Débito 3=CC Débito 4=Conta Crédito 5=Desc Crédito 6=CC Crédito 7=Histórico 8=Valor
const COL_DEB = 1, COL_DEB_DESC = 2, COL_CRED = 4, COL_CRED_DESC = 5, COL_HIST = 7, COL_VALOR = 8;

const buildHistoricos = (competencia: string): string[] => {
  const m = competencia.match(/^(\d{4})-(\d{2})/);
  const mmAaaa = m ? `${m[2]}/${m[1]}` : "MM/AAAA";
  return [
    "SALARIOS E REMUNERAÇÕES A PAGAR",
    `PRO-LABORE A PAGAR MÊS ${mmAaaa}`,
    `INSS S/SALÁRIOS A PAGAR MÊS ${mmAaaa}`,
    `INSS S/PRO-LABORE (SOCIO) A PAGAR MÊS ${mmAaaa}`,
    `INSS S/13º SALARIO - RECISÃO A PAGAR MÊS DE ${mmAaaa}`,
    `FGTS A PAGAR MÊS ${mmAaaa}`,
    `IRRF S/SALÁRIOS A PAGAR MÊS ${mmAaaa}`,
    `RECISAO A PAGAR MÊS ${mmAaaa}`,
    `FERIAS A PAGAR MÊS DE ${mmAaaa} (RECISÃO)`,
    `EMPRESTIMO CONSIGNADO EM FOLHA MÊS ${mmAaaa}`,
    `PENSAO ALIMENTICIA EM FOLHA MÊS ${mmAaaa}`,
    `CONTRIBUIÇÃO SINDICAL EM FOLHA MÊS ${mmAaaa}`,
  ];
};

const AccountCombobox = ({
  value, planoMap, onPick,
}: { value: string; planoMap: Record<string, string>; onPick: (cr: string, desc: string) => void }) => {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const seen = new Set<string>();
    return Object.entries(planoMap)
      .filter(([cr]) => /^\d+$/.test(cr) || /^[A-Z0-9.\-/]+$/i.test(cr))
      .filter(([cr]) => { if (seen.has(cr)) return false; seen.add(cr); return true; })
      .map(([cr, desc]) => ({ cr, desc: desc.replace(/\(-\)/g, "").trim() }))
      .sort((a, b) => a.cr.localeCompare(b.cr, undefined, { numeric: true }));
  }, [planoMap]);

  const currentDesc = value ? lookupPlanoContasDescricao(planoMap, value).replace(/\(-\)/g, "").trim() : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" size="sm" className="w-full justify-between h-9 font-normal">
          <span className="truncate text-left">
            {value ? <><span className="font-mono">{value}</span> <span className="text-muted-foreground">— {currentDesc || "sem descrição"}</span></> : <span className="text-muted-foreground">Selecionar conta…</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por CR ou descrição…" />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.cr} value={`${o.cr} ${o.desc}`} onSelect={() => { onPick(o.cr, o.desc); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.cr ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs w-16 shrink-0">{o.cr}</span>
                  <span className="text-xs truncate">{o.desc}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const FolhaRowEditor = ({ data, selectedRow, planoMap, competencia, onChange, onSelectRow }: Props) => {
  const historicos = useMemo(() => buildHistoricos(competencia), [competencia]);

  if (selectedRow === null || !data.rows[selectedRow]) {
    return (
      <div className="bg-muted/30 rounded-xl p-4 border border-border text-xs text-muted-foreground">
        Clique numa linha da planilha para editar com autocomplete do plano de contas.
      </div>
    );
  }

  const row = data.rows[selectedRow];
  const getVal = (c: number) => String(row[c]?.value ?? "");

  const setCell = (mut: (next: SheetData) => void) => {
    const next = cloneData(data);
    mut(next);
    onChange(next);
  };

  const pickAccount = (side: "deb" | "cred", cr: string, desc: string) => {
    setCell((next) => {
      const cCol = side === "deb" ? COL_DEB : COL_CRED;
      const dCol = side === "deb" ? COL_DEB_DESC : COL_CRED_DESC;
      const ccCol = side === "deb" ? 3 : 6;
      next.rows[selectedRow][cCol] = { ...next.rows[selectedRow][cCol], value: cr };
      next.rows[selectedRow][dCol] = { ...next.rows[selectedRow][dCol], value: desc };
      // CC padrão: 100 se a descrição indicar (-)
      const original = lookupPlanoContasDescricao(planoMap, cr);
      next.rows[selectedRow][ccCol] = { ...next.rows[selectedRow][ccCol], value: /\(-\)/.test(original) ? "100" : "" };
    });
  };

  const setHist = (v: string) => setCell((next) => {
    next.rows[selectedRow][COL_HIST] = { ...next.rows[selectedRow][COL_HIST], value: v.toUpperCase() };
  });

  const setValor = (v: string) => setCell((next) => {
    const parsed = Number(v.replace(/\./g, "").replace(",", "."));
    next.rows[selectedRow][COL_VALOR] = { ...next.rows[selectedRow][COL_VALOR], value: isNaN(parsed) ? v : parsed };
  });

  const setData = (v: string) => setCell((next) => {
    next.rows[selectedRow][0] = { ...next.rows[selectedRow][0], value: v };
  });

  const duplicateRow = () => {
    const next = cloneData(data);
    const clone: SheetCell[] = next.rows[selectedRow].map((c) => ({ ...c }));
    next.rows.splice(selectedRow + 1, 0, clone);
    onChange(next);
    onSelectRow(selectedRow + 1);
  };

  const hist = getVal(COL_HIST);
  const isRevisar = /^\s*\[REVISAR\]/i.test(hist);
  const isSugerido = /^\s*\[SUGERIDO\]/i.test(hist);

  return (
    <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linha {selectedRow + 2}</h3>
        <div className="flex items-center gap-2">
          {isRevisar && <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Revisar</span>}
          {isSugerido && <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Sugerido</span>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={duplicateRow} title="Duplicar linha">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground">Data (DD/MM/AAAA)</label>
        <Input value={getVal(0)} onChange={(e) => setData(e.target.value)} className="h-9 text-xs" />
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground">Conta Débito</label>
        <AccountCombobox value={getVal(COL_DEB)} planoMap={planoMap} onPick={(cr, desc) => pickAccount("deb", cr, desc)} />
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground">Conta Crédito</label>
        <AccountCombobox value={getVal(COL_CRED)} planoMap={planoMap} onPick={(cr, desc) => pickAccount("cred", cr, desc)} />
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Histórico</label>
        <Input value={getVal(COL_HIST)} onChange={(e) => setHist(e.target.value)} className="h-9 text-xs" />
        <div className="mt-1 flex flex-wrap gap-1">
          {historicos.map((h) => (
            <button key={h} type="button" onClick={() => setHist(h)} className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent">
              {h.length > 32 ? h.slice(0, 30) + "…" : h}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground">Valor</label>
        <Input value={getVal(COL_VALOR)} onChange={(e) => setValor(e.target.value)} className="h-9 text-xs text-right font-mono" />
      </div>
    </div>
  );
};
