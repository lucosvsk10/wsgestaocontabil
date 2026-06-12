import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Trash2, ArrowLeftToLine, ArrowRightToLine, Type, ChevronDown, ChevronUp } from "lucide-react";
import type { SheetData, SheetCell } from "./exportBuilders";

interface Props {
  data: SheetData;
  selectedCol: number | null;
  onChange: (d: SheetData) => void;
}

type Scope = "selected" | "all";

const cloneData = (d: SheetData): SheetData => ({
  headers: [...d.headers],
  rows: d.rows.map((r) => r.map((c) => ({ ...c }))),
});

const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|\s|[\-/])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

const capitalizeFirst = (s: string) => {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const QuickEditPanel = ({ data, selectedCol, onChange }: Props) => {
  const [scope, setScope] = useState<Scope>("selected");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const mutate = (fn: (val: string) => string) => {
    const next = cloneData(data);
    const inScope = (c: number) => (scope === "all" ? true : selectedCol !== null && c === selectedCol);
    next.rows.forEach((row) =>
      row.forEach((cell, c) => {
        if (!inScope(c)) return;
        if (cell.numeric) return;
        const s = String(cell.value ?? "");
        const out = fn(s);
        if (out !== s) cell.value = out;
      })
    );
    onChange(next);
  };

  const scopeLabel = scope === "selected"
    ? selectedCol === null
      ? "Selecione uma coluna"
      : `Coluna selecionada`
    : "Todas as colunas de texto";

  const disabled = scope === "selected" && selectedCol === null;

  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Edição rápida</h3>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Aplicar em</label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="h-9 mt-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected">Coluna selecionada</SelectItem>
            <SelectItem value="all">Todas as colunas de texto</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">{scopeLabel}</p>
      </div>

      {/* Buscar e substituir */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Buscar e substituir</label>
        <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Buscar" className="h-8 text-xs" />
        <Input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Substituir por (vazio = excluir)" className="h-8 text-xs" />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 rounded-lg text-xs"
            disabled={disabled || !find}
            onClick={() => mutate((s) => s.split(find).join(replace))}
          >
            Substituir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={disabled || !find}
            onClick={() => mutate((s) => s.split(find).join(""))}
            title="Excluir todas as ocorrências"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Prefixo / Sufixo */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Início (prefixo)</label>
        <div className="flex gap-2">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Texto" className="h-8 text-xs" />
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={disabled || !prefix}
            onClick={() => mutate((s) => (s ? prefix + s : s))}
            title="Adicionar no início"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={disabled || !prefix}
            onClick={() => mutate((s) => (s.startsWith(prefix) ? s.slice(prefix.length) : s))}
            title="Remover do início"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Final (sufixo)</label>
        <div className="flex gap-2">
          <Input value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="Texto" className="h-8 text-xs" />
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={disabled || !suffix}
            onClick={() => mutate((s) => (s ? s + suffix : s))}
            title="Adicionar no final"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={disabled || !suffix}
            onClick={() => mutate((s) => (s.endsWith(suffix) ? s.slice(0, -suffix.length) : s))}
            title="Remover do final"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Caps */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Type className="w-3.5 h-3.5" /> Capitalização
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate((s) => s.toUpperCase())}>
            MAIÚSCULAS
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate((s) => s.toLowerCase())}>
            minúsculas
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate(capitalizeWords)}>
            Cada Palavra
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate(capitalizeFirst)}>
            Primeira letra
          </Button>
        </div>
      </div>

      {/* Trim helpers */}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate((s) => s.trim())}>
          Remover espaços
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={disabled} onClick={() => mutate((s) => s.replace(/\s+/g, " "))}>
          Compactar espaços
        </Button>
      </div>
    </div>
  );
};
