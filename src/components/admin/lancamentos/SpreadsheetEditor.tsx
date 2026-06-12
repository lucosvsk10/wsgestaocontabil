import { useCallback, useMemo, useRef, useState } from "react";
import { Bold, Plus, Minus, Undo2, Palette, PaintBucket, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SheetCell, SheetData } from "./exportBuilders";

interface Props {
  data: SheetData;
  onChange: (d: SheetData) => void;
}

const COLORS = ["#0b1320", "#dc2626", "#16a34a", "#2563eb", "#9333ea", "#ea580c", "#64748b", "#ffffff"];
const BG_COLORS = ["transparent", "#fef3c7", "#dcfce7", "#dbeafe", "#fee2e2", "#f3e8ff", "#f3f4f6", "#1f2937"];

const cloneData = (d: SheetData): SheetData => ({
  headers: [...d.headers],
  rows: d.rows.map((r) => r.map((c) => ({ ...c }))),
});

export const SpreadsheetEditor = ({ data, onChange }: Props) => {
  const ncols = data.headers.length;
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const undoStack = useRef<SheetData[]>([]);

  const pushUndo = useCallback(() => {
    undoStack.current.push(cloneData(data));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, [data]);

  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) onChange(prev);
  };

  const updateCell = (r: number, c: number, value: string) => {
    pushUndo();
    const next = cloneData(data);
    const cell = next.rows[r][c];
    const isNum = cell.numeric;
    if (isNum) {
      const parsed = Number(value.replace(/\./g, "").replace(",", "."));
      cell.value = isNaN(parsed) ? value : parsed;
    } else {
      cell.value = value;
    }
    onChange(next);
  };

  const applyToSelection = (mut: (c: SheetCell) => void) => {
    if (selectedRow === null) return;
    pushUndo();
    const next = cloneData(data);
    if (selectedCol !== null) {
      const cell = next.rows[selectedRow]?.[selectedCol];
      if (cell) mut(cell);
    } else {
      next.rows[selectedRow]?.forEach(mut);
    }
    onChange(next);
  };

  const toggleBold = () => applyToSelection((c) => (c.bold = !c.bold));
  const setColor = (color: string) => applyToSelection((c) => (c.color = color));
  const setBg = (bg: string) => applyToSelection((c) => (c.bg = bg === "transparent" ? undefined : bg));

  const addRow = (above: boolean) => {
    pushUndo();
    const next = cloneData(data);
    const idx = selectedRow ?? next.rows.length;
    const insertAt = above ? idx : idx + 1;
    const blank: SheetCell[] = Array.from({ length: ncols }, () => ({ value: "" }));
    next.rows.splice(insertAt, 0, blank);
    onChange(next);
    setSelectedRow(insertAt);
  };

  const removeRow = () => {
    if (selectedRow === null) return;
    pushUndo();
    const next = cloneData(data);
    next.rows.splice(selectedRow, 1);
    onChange(next);
    setSelectedRow(null);
  };

  const fmtDisplay = (cell: SheetCell): string => {
    if (cell.numeric && typeof cell.value === "number") {
      return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cell.value);
    }
    return String(cell.value ?? "");
  };

  const headerCells = useMemo(() => data.headers, [data.headers]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={toggleBold} title="Negrito">
          <Bold className="w-4 h-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cor do texto">
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded border border-border"
                  style={{ background: c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cor de fundo">
              <PaintBucket className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className="w-6 h-6 rounded border border-border"
                  style={{ background: c === "transparent" ? "repeating-linear-gradient(45deg,#eee,#eee 3px,#fff 3px,#fff 6px)" : c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="w-px h-5 bg-border mx-1" />
        <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={() => addRow(true)} title="Adicionar linha acima">
          <ArrowUp className="w-3.5 h-3.5" /> <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={() => addRow(false)} title="Adicionar linha abaixo">
          <ArrowDown className="w-3.5 h-3.5" /> <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={removeRow} disabled={selectedRow === null} title="Remover linha selecionada">
          <Minus className="w-3.5 h-3.5" /> Linha
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs" onClick={undo} disabled={undoStack.current.length === 0}>
          <Undo2 className="w-3.5 h-3.5" /> Desfazer
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {selectedRow !== null ? `Linha ${selectedRow + 1}` : "Clique em uma linha para selecioná-la"}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-muted z-10">
            <tr>
              <th className="w-10 border border-border px-2 py-1.5 text-center text-muted-foreground font-medium">#</th>
              {headerCells.map((h, i) => (
                <th key={i} className="border border-border px-2 py-1.5 text-left font-semibold text-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr
                key={r}
                className={selectedRow === r ? "bg-primary/5" : "hover:bg-muted/30"}
              >
                <td
                  className="w-10 border border-border px-2 py-1 text-center text-muted-foreground cursor-pointer select-none"
                  onClick={() => {
                    setSelectedRow(r);
                    setSelectedCol(null);
                  }}
                >
                  {r + 1}
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    colSpan={cell.colSpan || 1}
                    className={`border border-border px-2 py-1 align-top ${
                      selectedRow === r && selectedCol === c ? "ring-2 ring-primary ring-inset" : ""
                    }`}
                    style={{
                      color: cell.color,
                      background: cell.bg,
                      fontWeight: cell.bold ? 600 : undefined,
                      textAlign: cell.numeric ? "right" : "left",
                      minWidth: 80,
                    }}
                    onClick={() => {
                      setSelectedRow(r);
                      setSelectedCol(c);
                    }}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="outline-none whitespace-pre-wrap break-words"
                      onBlur={(e) => {
                        const v = e.currentTarget.textContent ?? "";
                        if (v !== fmtDisplay(cell)) updateCell(r, c, v);
                      }}
                    >
                      {fmtDisplay(cell)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
