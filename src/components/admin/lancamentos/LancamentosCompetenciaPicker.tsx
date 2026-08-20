import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface LancamentosCompetenciaPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const shiftCompetencia = (competencia: string, amount: number) => {
  const [year, month] = competencia.split('-').map(Number);
  const shifted = new Date(year, month - 1 + amount, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

export const LancamentosCompetenciaPicker = ({
  value,
  onChange,
}: LancamentosCompetenciaPickerProps) => {
  const [year, month] = value.split('-');
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, index) => String(currentYear - 5 + index));

  return (
    <div className="flex items-center border border-border bg-background">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-10 border-r border-border"
        onClick={() => onChange(shiftCompetencia(value, -1))}
        aria-label="Competência anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 px-2">
        <CalendarDays className="hidden h-4 w-4 text-muted-foreground sm:block" />
        <Select value={month} onValueChange={nextMonth => onChange(`${year}-${nextMonth}`)}>
          <SelectTrigger className="h-10 w-[125px] border-0 bg-transparent px-2 shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((label, index) => {
              const monthValue = String(index + 1).padStart(2, '0');
              return (
                <SelectItem key={monthValue} value={monthValue}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={nextYear => onChange(`${nextYear}-${month}`)}>
          <SelectTrigger className="h-10 w-[82px] border-0 bg-transparent px-2 shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(yearOption => (
              <SelectItem key={yearOption} value={yearOption}>
                {yearOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-10 border-l border-border"
        onClick={() => onChange(shiftCompetencia(value, 1))}
        aria-label="Próxima competência"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
