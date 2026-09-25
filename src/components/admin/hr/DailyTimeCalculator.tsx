import { useMemo, useState } from 'react';
import { Clock3, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMinutes, parseHoursToMinutes } from '@/lib/hr/workHours';

type Props = {
  dailyHours: number;
  onAddOvertime: (minutes: number, kind: '50' | '100') => void;
  onAddDeficit: (minutes: number) => void;
};

const clockMinutes = (value: string) => {
  if (!value) return null;
  const minutes = parseHoursToMinutes(value);
  return Number.isFinite(minutes) ? minutes : null;
};

const intervalMinutes = (start: string, end: string) => {
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  if (from === null || to === null) return 0;
  return to >= from ? to - from : 24 * 60 - from + to;
};

export default function DailyTimeCalculator({ dailyHours, onAddOvertime, onAddDeficit }: Props) {
  const [entry1, setEntry1] = useState('');
  const [exit1, setExit1] = useState('');
  const [entry2, setEntry2] = useState('');
  const [exit2, setExit2] = useState('');

  const worked = useMemo(
    () => intervalMinutes(entry1, exit1) + intervalMinutes(entry2, exit2),
    [entry1, exit1, entry2, exit2],
  );
  const expected = Math.max(0, Math.round(Number(dailyHours || 0) * 60));
  const balance = worked - expected;
  const complete = Boolean(entry1 && exit1);

  const clear = () => {
    setEntry1('');
    setExit1('');
    setEntry2('');
    setExit2('');
  };

  return (
    <details className="overflow-hidden rounded-2xl border border-border/55 bg-card text-card-foreground shadow-sm">
      <summary className="cursor-pointer select-none px-4 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          Calcular pelas marcações de um dia
        </span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          opcional, para conferir ponto sem fazer conta manual
        </span>
      </summary>

      <div className="border-t border-border/50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="text-[11px] font-medium">Entrada</span>
            <Input type="time" value={entry1} onChange={event => setEntry1(event.target.value)} className="mt-1.5 h-10" />
          </label>
          <label>
            <span className="text-[11px] font-medium">Saída intervalo</span>
            <Input type="time" value={exit1} onChange={event => setExit1(event.target.value)} className="mt-1.5 h-10" />
          </label>
          <label>
            <span className="text-[11px] font-medium">Retorno</span>
            <Input type="time" value={entry2} onChange={event => setEntry2(event.target.value)} className="mt-1.5 h-10" />
          </label>
          <label>
            <span className="text-[11px] font-medium">Saída</span>
            <Input type="time" value={exit2} onChange={event => setExit2(event.target.value)} className="mt-1.5 h-10" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>
              <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">Trabalhado</small>
              <b>{complete ? formatMinutes(worked) : '00:00'}</b>
            </span>
            <span>
              <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">Previsto</small>
              <b>{formatMinutes(expected)}</b>
            </span>
            <span>
              <small className="block text-[10px] uppercase tracking-[.08em] text-muted-foreground">Diferença</small>
              <b className={balance > 0 ? 'text-emerald-600 dark:text-emerald-300' : balance < 0 ? 'text-red-600 dark:text-red-300' : ''}>
                {!complete ? '00:00' : balance > 0 ? `+${formatMinutes(balance)}` : balance < 0 ? `-${formatMinutes(Math.abs(balance))}` : '00:00'}
              </b>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {complete && balance > 0 && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => onAddOvertime(balance, '50')}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Somar em HE 50%
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onAddOvertime(balance, '100')}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Somar em HE 100%
                </Button>
              </>
            )}
            {complete && balance < 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => onAddDeficit(Math.abs(balance))}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Somar em atrasos
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          Aceita dois períodos no mesmo dia. Em jornadas que atravessam a meia-noite, a saída é interpretada como pertencente ao dia seguinte.
        </p>
      </div>
    </details>
  );
}
