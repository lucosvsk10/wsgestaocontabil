import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MonthSelector = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange
}: MonthSelectorProps) => {
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(12);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(1);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={goToPreviousMonth}
        className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center min-w-[160px]">
        <div className="text-xl font-medium text-foreground">
          {MONTHS[selectedMonth - 1]}
        </div>
        <div className="text-sm text-muted-foreground font-light">
          {selectedYear}
        </div>
      </div>

      <button
        onClick={goToNextMonth}
        className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};
