import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CompetenciaOverview,
  CompetenciaStatus,
} from '@/hooks/lancamentos/useLancamentosOverview';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
  <section className="admin-surface">
    <div className="admin-surface-header">
      <div>
        <h2 className="admin-section-title">Calendário de competências · {year}</h2>
        <p className="admin-section-description">Selecione um mês para abrir e acompanhar o processamento contábil.</p>
      </div>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <div className="hidden items-center gap-4 text-[10px] text-[var(--admin-muted)] md:flex"><span className="admin-status admin-status-green">Fechado</span><span className="admin-status admin-status-blue">Em andamento</span><span className="admin-status admin-status-amber">Revisar</span></div>}
    </div>

    <div className="grid grid-cols-2 border-[var(--admin-line)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
              'relative min-h-[104px] border-b border-r border-[var(--admin-line)] p-3.5 text-left transition-colors duration-150',
              selected
                ? 'z-10 bg-[var(--admin-blue-soft)] text-blue-700 ring-1 ring-inset ring-blue-500 dark:text-blue-300'
                : 'bg-[var(--admin-panel)] hover:bg-[var(--admin-blue-soft)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--admin-ink)]">{month}</span>
              <span className={cn('mt-1 h-2 w-2 rounded-full', config.dot)} />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-muted)]">
              {config.label}
            </p>
            <p className="mt-1.5 text-[10px] text-[var(--admin-muted)]">
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
