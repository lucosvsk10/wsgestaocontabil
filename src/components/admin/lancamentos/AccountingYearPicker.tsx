import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (year: string) => void;
}

const PAGE_SIZE = 9;

function centeredStart(year: number) {
  return year - 4;
}

export function AccountingYearPicker({ value, onChange }: Props) {
  const selected = Number(value) || new Date().getFullYear();
  const [startYear, setStartYear] = useState(() => centeredStart(selected));

  useEffect(() => {
    if (selected < startYear || selected >= startYear + PAGE_SIZE) setStartYear(centeredStart(selected));
  }, [selected, startYear]);

  const years = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, index) => startYear + index), [startYear]);

  return <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" className="h-8 min-w-24 justify-between gap-2 border-border bg-transparent px-2.5 text-xs shadow-none">
        <span>{value}</span><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-64 p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStartYear(current => current - PAGE_SIZE)} title="Anos anteriores"><ChevronLeft className="h-4 w-4" /></Button>
        <p className="text-xs font-medium text-muted-foreground">{startYear} — {startYear + PAGE_SIZE - 1}</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStartYear(current => current + PAGE_SIZE)} title="Próximos anos"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {years.map(year => <Button key={year} type="button" variant="ghost" className={cn("h-9 text-xs", year === selected && "bg-foreground text-background hover:bg-foreground/90 hover:text-background")} onClick={() => onChange(String(year))}>{year}</Button>)}
      </div>
      <div className="mt-3 border-t border-border pt-2 text-center">
        <button type="button" className="text-[11px] text-muted-foreground underline-offset-4 hover:underline" onClick={() => { const current = new Date().getFullYear(); setStartYear(centeredStart(current)); onChange(String(current)); }}>Ir para o ano atual</button>
      </div>
    </PopoverContent>
  </Popover>;
}
