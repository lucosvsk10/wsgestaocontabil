import {
  formatMinutes,
  formatSignedMinutes,
  summarizePunchPeriod,
  type PunchDayInput,
  type WeeklyDaySchedule,
} from '@/lib/hr/workHours';

type Props = {
  punches: PunchDayInput[];
  dailyHours: number;
  weeklySchedule: WeeklyDaySchedule[];
};

const formatDate = (value: string) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function DailyPunchSummary({ punches, dailyHours, weeklySchedule }: Props) {
  const summary = summarizePunchPeriod(punches, dailyHours, weeklySchedule);

  return (
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Apuração do ponto importado</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Cada par de marcações é somado como tempo trabalhado. A referência da apuração é fixa:
            <b className="text-foreground"> 08:00 de segunda a sexta, 04:00 no sábado e 00:00 no domingo</b>.
            As batidas importadas nunca alteram essa referência.
          </p>
        </div>
        <p className="text-[10px] leading-4 text-muted-foreground">
          Saldo de tempo bruto para conferência; não vira hora extra ou desconto automaticamente.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Trabalhado', formatMinutes(summary.workedMinutes)],
          ['Referência apurada', formatMinutes(summary.referenceMinutes)],
          ['Acima da referência', formatMinutes(summary.excessMinutes)],
          ['Abaixo da referência', formatMinutes(summary.deficitMinutes)],
          ['Saldo líquido', formatSignedMinutes(summary.netMinutes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-transparent bg-muted/15 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
              {label}
            </span>
            <b className="mt-1 block text-xl tabular-nums">{value}</b>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl bg-muted/[0.04]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-muted/15 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3">Marcações</th>
              <th className="px-4 py-3 text-right">Trabalhado</th>
              <th className="px-4 py-3 text-right">Referência</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent">
            {summary.days.map((day, index) => {
              const status =
                day.status === 'complete'
                  ? day.referenceMinutes === 0 && day.workedMinutes > 0
                    ? 'Trabalho em folga'
                    : day.balanceMinutes === 0
                      ? 'Completo'
                      : day.balanceMinutes! > 0
                        ? 'Acima da referência'
                        : 'Abaixo da referência'
                  : day.status === 'incomplete'
                    ? 'Marcação incompleta'
                    : day.referenceMinutes === 0
                      ? 'Folga'
                      : 'Sem marcação';

              return (
                <tr key={`${day.date || 'day'}-${index}`} className="hover:bg-muted/[0.04]">
                  <td className="px-4 py-3 font-medium">{formatDate(day.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{day.weekdayLabel || '—'}</td>
                  <td className="px-4 py-3">
                    {day.punches.length ? (
                      <span className="font-medium tabular-nums">{day.punches.join(' · ')}</span>
                    ) : (
                      <span className="text-muted-foreground">Sem marcação</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {day.punches.length ? formatMinutes(day.workedMinutes) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMinutes(day.referenceMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {day.balanceMinutes === null ? '—' : formatSignedMinutes(day.balanceMinutes)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(summary.incompleteDays > 0 || summary.noPunchDays > 0) && (
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          {summary.incompleteDays > 0
            ? `${summary.incompleteDays} dia(s) têm número ímpar ou inválido de marcações; apenas intervalos completos foram somados e o saldo diário não foi inventado. `
            : ''}
          {summary.noPunchDays > 0
            ? `${summary.noPunchDays} dia(s) estão sem marcação; dias de folga permanecem com referência 00:00 e dias previstos não viram falta automaticamente.`
            : ''}
        </p>
      )}
    </section>
  );
}
