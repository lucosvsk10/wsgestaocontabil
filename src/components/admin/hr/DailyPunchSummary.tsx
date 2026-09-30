import {
  formatMinutes,
  formatSignedMinutes,
  summarizePunchPeriod,
  type PunchDayInput,
} from '@/lib/hr/workHours';

type Props = {
  punches: PunchDayInput[];
  dailyHours: number;
};

const formatDate = (value: string) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export default function DailyPunchSummary({ punches, dailyHours }: Props) {
  const summary = summarizePunchPeriod(punches, dailyHours);

  return (
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Apuração do ponto importado</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Cada par de marcações é somado como tempo trabalhado. A comparação usa a referência diária de{' '}
            <b className="text-foreground">{formatMinutes(Math.round(Math.max(0, dailyHours) * 60))}</b>.
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
                  ? day.balanceMinutes === 0
                    ? 'Completo'
                    : day.balanceMinutes! > 0
                      ? 'Acima da referência'
                      : 'Abaixo da referência'
                  : day.status === 'incomplete'
                    ? 'Marcação incompleta'
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
                    {day.status === 'no_punches' ? '—' : formatMinutes(day.referenceMinutes)}
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
            ? `${summary.noPunchDays} dia(s) estão sem marcação e não entram automaticamente como falta.`
            : ''}
        </p>
      )}
    </section>
  );
}
