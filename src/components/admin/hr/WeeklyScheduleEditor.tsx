import { Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  WEEKDAYS,
  emptyWeeklySchedule,
  formatMinutes,
  scheduleDayMinutes,
  weeklyScheduleMinutes,
  type WeekdayKey,
  type WeeklyDaySchedule,
} from '@/lib/hr/workHours';

type Props = {
  value: WeeklyDaySchedule[];
  onChange: (value: WeeklyDaySchedule[]) => void;
};

const emptyDay = (key: WeekdayKey): WeeklyDaySchedule => ({
  key,
  active: false,
  entry1: '',
  exit1: '',
  entry2: '',
  exit2: '',
});

function normalized(value: WeeklyDaySchedule[]) {
  return WEEKDAYS.map(({ key }) => value.find(day => day.key === key) || emptyDay(key));
}

export default function WeeklyScheduleEditor({ value, onChange }: Props) {
  const schedule = normalized(value);
  const total = weeklyScheduleMinutes(schedule);
  const activeDays = schedule.filter(day => day.active).length;

  const updateDay = (key: WeekdayKey, patch: Partial<WeeklyDaySchedule>) => {
    onChange(schedule.map(day => (day.key === key ? { ...day, ...patch } : day)));
  };

  const copyMondayToWeekdays = () => {
    const monday = schedule.find(day => day.key === 'monday');
    if (!monday) return;
    onChange(
      schedule.map(day =>
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day.key)
          ? {
              ...day,
              active: true,
              entry1: monday.entry1,
              exit1: monday.exit1,
              entry2: monday.entry2,
              exit2: monday.exit2,
            }
          : day,
      ),
    );
  };

  const reset = () => onChange(emptyWeeklySchedule());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-transparent pb-3">
        <div>
          <p className="text-sm font-semibold">Jornada padrão da semana</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ative os dias trabalhados e informe as marcações padrão de cada um.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={copyMondayToWeekdays}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar segunda para seg–sex
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Limpar horários
          </Button>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] table-fixed text-left">
          <thead className="border-b border-transparent text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
            <tr>
              <th className="w-[170px] px-2 py-2">Dia</th>
              <th className="px-2 py-2">Entrada</th>
              <th className="px-2 py-2">Saída intervalo</th>
              <th className="px-2 py-2">Retorno</th>
              <th className="px-2 py-2">Saída</th>
              <th className="w-[110px] px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {schedule.map(day => {
              const meta = WEEKDAYS.find(item => item.key === day.key)!;
              const minutes = scheduleDayMinutes(day);
              return (
                <tr key={day.key} className={day.active ? 'bg-muted/[0.06]' : 'bg-transparent opacity-70'}>
                  <td className="px-2 py-2.5">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={day.active}
                        onChange={event => updateDay(day.key, { active: event.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className={day.active ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
                        {meta.label}
                      </span>
                    </label>
                  </td>
                  {(['entry1', 'exit1', 'entry2', 'exit2'] as const).map(field => (
                    <td key={field} className="px-2 py-2.5">
                      <Input
                        type="time"
                        value={day[field]}
                        disabled={!day.active}
                        onChange={event => updateDay(day.key, { [field]: event.target.value })}
                        className="h-9 min-w-0 border-transparent bg-muted/20 text-sm disabled:opacity-35"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums">
                    {day.active ? formatMinutes(minutes) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {schedule.map(day => {
          const meta = WEEKDAYS.find(item => item.key === day.key)!;
          const minutes = scheduleDayMinutes(day);
          return (
            <div key={day.key} className="border-b border-transparent py-3 last:border-b-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.active}
                    onChange={event => updateDay(day.key, { active: event.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{meta.label}</span>
                </label>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {day.active ? formatMinutes(minutes) : 'Folga'}
                </span>
              </div>
              {day.active && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['entry1', 'Entrada'],
                    ['exit1', 'Saída interv.'],
                    ['entry2', 'Retorno'],
                    ['exit2', 'Saída'],
                  ].map(([field, label]) => (
                    <label key={field} className="min-w-0">
                      <span className="mb-1 block text-[10px] text-muted-foreground">{label}</span>
                      <Input
                        type="time"
                        value={day[field as 'entry1' | 'exit1' | 'entry2' | 'exit2']}
                        onChange={event => updateDay(day.key, { [field]: event.target.value })}
                        className="h-10 border-transparent bg-muted/20"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-transparent pt-3">
        <span className="text-xs text-muted-foreground">
          {activeDays} dia{activeDays === 1 ? '' : 's'} de trabalho configurado{activeDays === 1 ? '' : 's'}
        </span>
        <span className="text-sm">
          Jornada semanal: <b className="tabular-nums">{formatMinutes(total)}</b>
        </span>
      </div>
    </div>
  );
}
