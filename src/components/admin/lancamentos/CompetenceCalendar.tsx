import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CompetenciaOverview,
  CompetenciaStatus,
} from '@/hooks/lancamentos/useLancamentosOverview';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const statusConfig: Record<CompetenciaStatus, { label: string; dot: string }> = {
  fechado: { label: 'Fechado', dot: 'bg-emerald-500' },
  erro: { label: 'Revisar', dot: 'bg-rose-500' },
  processando: { label: 'Processando', dot: 'bg-amber-500' },
  em_andamento: { label: 'Em andamento', dot: 'bg-blue-500' },
  vazio: { label: 'Sem movimento', dot: 'bg-slate-300 dark:bg-slate-600' },
};

interface CompetenceCalendarProps {
  year: string;
  items: CompetenciaOverview[];
  selectedCompetencia: string;
  isLoading: boolean;
  disabled?: boolean;
  onSelect: (competencia: string) => void;
}

export const CompetenceCalendar = ({
  year,
  items,
  selectedCompetencia,
  isLoading,
  disabled,
  onSelect,
}: CompetenceCalendarProps) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#a47b13] dark:text-[#efc349]">
          Calendário contábil
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
          Competências de {year}
        </h2>
      </div>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {MONTHS.map((month, index) => {
        const competencia = `${year}-${String(index + 1).padStart(2, '0')}`;
        const item = items.find(entry => entry.competencia === competencia);
        const status = item?.status || 'vazio';
        const config = statusConfig[status];
        const selected = selectedCompetencia === competencia;

        return (
          <button
            key={competencia}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(competencia)}
            className={cn(
              'min-h-[92px] rounded-xl border p-3 text-left transition-all duration-200',
              selected
                ? 'border-[#d7aa2f] bg-[#fff8e6] shadow-[0_8px_24px_rgba(180,132,17,0.12)] dark:border-[#efc349] dark:bg-[#efc349]/10'
                : 'border-slate-200 bg-slate-50/70 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:border-white/15 dark:hover:bg-white/[0.05]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{month}</span>
              <span className={cn('mt-1 h-2 w-2 rounded-full', config.dot)} />
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {config.label}
            </p>
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              {item && (item.documentos > 0 || item.lancamentos > 0)
                ? `${item.documentos} doc. • ${item.lancamentos} lanç.`
                : 'Nenhum registro'}
            </p>
          </button>
        );
      })}
    </div>
  </section>
);
