import { useCallback, useRef } from "react";
import { Bold, Plus, Minus, Undo2, Palette, PaintBucket, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SheetCell, SheetData } from "./exportBuilders";

interface Props {
  data: SheetData;
  onChange: (d: SheetData) => void;
  selectedRow: number | null;
  selectedCol: number | null;
  onSelectRow: (r: number | null) => void;
  onSelectCol: (c: number | null) => void;
}

const COLORS = ["#000000", "#c00000", "#00b050", "#0070c0", "#7030a0", "#ed7d31", "#595959", "#ffffff"];
const BG_COLORS = ["transparent", "#fff2cc", "#e2efda", "#deebf7", "#fce4d6", "#ead1dc", "#d9d9d9", "#ffe699"];

const colLetter = (n: number) => {
  let s = "";
  n = n + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const cloneData = (d: SheetData): SheetData => ({
  headers: [...d.headers],
  rows: d.rows.map((r) => r.map((c) => ({ ...c }))),
});

export const SpreadsheetEditor = ({
  data,
  onChange,
  selectedRow,
  selectedCol,
  onSelectRow,
  onSelectCol,
}: Props) => {
  const ncols = data.headers.length;
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
    if (cell.numeric) {
      const parsed = Number(value.replace(/\./g, "").replace(",", "."));
      cell.value = isNaN(parsed) ? value : parsed;
    } else {
      cell.value = value;
    }
    onChange(next);
  };

  const applyToSelection = (mut: (c: SheetCell) => void) => {
    pushUndo();
    const next = cloneData(data);
    if (selectedRow !== null && selectedCol !== null) {
      const cell = next.rows[selectedRow]?.[selectedCol];
      if (cell) mut(cell);
    } else if (selectedRow !== null) {
      next.rows[selectedRow]?.forEach(mut);
    } else if (selectedCol !== null) {
      next.rows.forEach((row) => row[selectedCol] && mut(row[selectedCol]));
    } else {
      return;
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
    onSelectRow(insertAt);
  };

  const removeRow = () => {
    if (selectedRow === null) return;
    pushUndo();
    const next = cloneData(data);
    next.rows.splice(selectedRow, 1);
    onChange(next);
    onSelectRow(null);
  };

  const fmtDisplay = (cell: SheetCell): string => {
    if (cell.numeric && typeof cell.value === "number") {
      return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cell.value);
    }
    return String(cell.value ?? "");
  };

  // Excel-like palette
  const FONT = `"Calibri", "Segoe UI", "Arial", sans-serif`;
  const HEADER_BG = "#f3f3f3";
  const HEADER_BORDER = "#d4d4d4";
  const GRID = "#d4d4d4";
  const SELECTED_BG = "#e7f1fb";
  const SELECTED_BORDER = "#217346"; // Excel green

  return (
    <div className="flex flex-col h-full min-h-0 bg-white text-[#000]" style={{ fontFamily: FONT }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 shrink-0"
        style={{ background: "#f9f9f9", borderBottom: `1px solid ${HEADER_BORDER}` }}
      >
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#000] hover:bg-[#e7f1fb]" onClick={toggleBold} title="Negrito">
          <Bold className="w-4 h-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#000] hover:bg-[#e7f1fb]" title="Cor do texto">
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-sm border border-[#d4d4d4]" style={{ background: c }} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#000] hover:bg-[#e7f1fb]" title="Cor de fundo">
              <PaintBucket className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className="w-6 h-6 rounded-sm border border-[#d4d4d4]"
                  style={{ background: c === "transparent" ? "repeating-linear-gradient(45deg,#eee,#eee 3px,#fff 3px,#fff 6px)" : c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="w-px h-5 bg-[#d4d4d4] mx-1" />
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-[#000] hover:bg-[#e7f1fb]" onClick={() => addRow(true)} title="Adicionar linha acima">
          <ArrowUp className="w-3.5 h-3.5" /> <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-[#000] hover:bg-[#e7f1fb]" onClick={() => addRow(false)} title="Adicionar linha abaixo">
          <ArrowDown className="w-3.5 h-3.5" /> <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-[#000] hover:bg-[#e7f1fb]" onClick={removeRow} disabled={selectedRow === null} title="Remover linha">
          <Minus className="w-3.5 h-3.5" /> Linha
        </Button>
        <div className="w-px h-5 bg-[#d4d4d4] mx-1" />
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-[#000] hover:bg-[#e7f1fb]" onClick={undo} disabled={undoStack.current.length === 0}>
          <Undo2 className="w-3.5 h-3.5" /> Desfazer
        </Button>
        <div className="ml-auto text-[11px] text-[#444]">
          {selectedRow !== null && selectedCol !== null
            ? `${colLetter(selectedCol)}${selectedRow + 2}`
            : selectedCol !== null
            ? `Coluna ${colLetter(selectedCol)}`
            : selectedRow !== null
            ? `Linha ${selectedRow + 2}`
            : "Clique em uma célula"}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0 bg-white">
        <table
          className="border-collapse text-[13px]"
          style={{ fontFamily: FONT, color: "#000" }}
        >
          <thead className="sticky top-0 z-10">
            {/* Column letters */}
            <tr>
              <th
                className="w-10 px-1 py-0.5 text-center text-[11px] font-normal"
                style={{ background: HEADER_BG, border: `1px solid ${HEADER_BORDER}`, color: "#555" }}
              />
              {data.headers.map((_, i) => (
                <th
                  key={i}
                  onClick={() => {
                    onSelectCol(i);
                    onSelectRow(null);
                  }}
                  className="px-2 py-0.5 text-center text-[11px] font-normal cursor-pointer select-none"
                  style={{
                    background: selectedCol === i ? "#cfe2f3" : HEADER_BG,
                    border: `1px solid ${HEADER_BORDER}`,
                    color: "#555",
                    minWidth: 110,
                  }}
                >
                  {colLetter(i)}
                </th>
              ))}
            </tr>
            {/* Field names (row 1) */}
            <tr>
              <th
                className="w-10 px-1 py-0.5 text-center text-[11px] font-normal"
                style={{ background: HEADER_BG, border: `1px solid ${HEADER_BORDER}`, color: "#555" }}
              >
                1
              </th>
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1 text-left font-semibold whitespace-nowrap"
                  style={{
                    background: selectedCol === i ? "#e7f1fb" : "#fafafa",
                    border: `1px solid ${GRID}`,
                    color: "#000",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={r}>
                <td
                  onClick={() => {
                    onSelectRow(r);
                    onSelectCol(null);
                  }}
                  className="px-1 py-0.5 text-center text-[11px] font-normal cursor-pointer select-none"
                  style={{
                    background: selectedRow === r ? "#cfe2f3" : HEADER_BG,
                    border: `1px solid ${HEADER_BORDER}`,
                    color: "#555",
                    width: 40,
                  }}
                >
                  {r + 2}
                </td>
                {row.map((cell, c) => {
                  const isSel = selectedRow === r && selectedCol === c;
                  const isColSel = selectedCol === c && selectedRow === null;
                  const isRowSel = selectedRow === r && selectedCol === null;
                  return (
                    <td
                      key={c}
                      colSpan={cell.colSpan || 1}
                      className="px-2 py-1 align-top"
                      style={{
                        border: isSel ? `2px solid ${SELECTED_BORDER}` : `1px solid ${GRID}`,
                        color: cell.color || "#000",
                        background: cell.bg || (isColSel || isRowSel ? SELECTED_BG : "#fff"),
                        fontWeight: cell.bold ? 700 : 400,
                        textAlign: cell.numeric ? "right" : "left",
                        minWidth: 110,
                      }}
                      onClick={() => {
                        onSelectRow(r);
                        onSelectCol(c);
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
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
