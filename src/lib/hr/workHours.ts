export type EmploymentType = 'monthly' | 'hourly';

export const NATIONAL_MINIMUM_WAGE_2026 = 1621;

export type AdjustmentMode = 'fixed' | 'percent';

export type MoneyAdjustment = {
  id: string;
  label: string;
  amount: number;
  category?: string;
  mode?: AdjustmentMode;
};

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type WeeklyDaySchedule = {
  key: WeekdayKey;
  active: boolean;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
};

export type PunchDayInput = {
  date?: string;
  weekdayLabel?: string;
  punches?: string[];
};

export type PunchDaySummary = {
  date: string;
  weekdayLabel: string;
  punches: string[];
  workedMinutes: number;
  referenceMinutes: number;
  balanceMinutes: number | null;
  excessMinutes: number;
  deficitMinutes: number;
  status: 'complete' | 'incomplete' | 'no_punches';
};

export type PunchPeriodSummary = {
  days: PunchDaySummary[];
  workedMinutes: number;
  referenceMinutes: number;
  excessMinutes: number;
  deficitMinutes: number;
  netMinutes: number;
  completeDays: number;
  incompleteDays: number;
  noPunchDays: number;
};

export const WEEKDAYS: Array<{ key: WeekdayKey; label: string; short: string }> = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

export type WorkHoursForm = {
  employmentType: EmploymentType;
  baseSalary: number;
  hourlyRate: number;
  monthlyHours: number;
  dailyHours: number;
  absenceDayDivisor: number;
  normalHours: string;
  overtime50: string;
  overtime100: string;
  overtime50Percent: number;
  overtime100Percent: number;
  nightHours: string;
  nightPercent: number;
  holidayHours: string;
  holidayPercent: number;
  absenceDays: number;
  absenceHours: string;
  lateHours: string;
  bankPositive: string;
  bankNegative: string;
  settleBank: boolean;
  weeklySchedule: WeeklyDaySchedule[];
  otherAdditions: MoneyAdjustment[];
  otherDeductions: MoneyAdjustment[];
};

export type WorkHoursResult = {
  hourlyRate: number;
  dailyRate: number;
  basePay: number;
  additions: {
    overtime50: number;
    overtime100: number;
    nightPremium: number;
    holidayPremium: number;
    bankPositive: number;
    other: number;
  };
  deductions: {
    absenceDays: number;
    absenceHours: number;
    lateHours: number;
    bankNegative: number;
    other: number;
  };
  additionsTotal: number;
  deductionsTotal: number;
  total: number;
  minutes: {
    normal: number;
    overtime50: number;
    overtime100: number;
    night: number;
    holiday: number;
    absence: number;
    late: number;
    bankPositive: number;
    bankNegative: number;
  };
  memory: string[];
};

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function resolveMoneyAdjustment(item: MoneyAdjustment, basePay: number) {
  const amount = Math.max(0, safeNumber(item?.amount));
  return money(item?.mode === 'percent' ? (Math.max(0, basePay) * amount) / 100 : amount);
}

export function parseHoursToMinutes(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value * 60));

  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 0;

  const normalized = raw.replace(/\s+/g, '').replace('h', ':').replace(',', '.');
  if (normalized.includes(':')) {
    const [hoursRaw, minutesRaw = '0'] = normalized.split(':', 2);
    const hours = Number(hoursRaw || 0);
    const minutes = Number(minutesRaw || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) return 0;
    return Math.max(0, Math.round(hours * 60 + minutes));
  }

  const decimal = Number(normalized);
  return Number.isFinite(decimal) && decimal >= 0 ? Math.round(decimal * 60) : 0;
}

export function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function formatSignedMinutes(minutes: number) {
  const safe = Math.round(Number.isFinite(minutes) ? minutes : 0);
  if (safe === 0) return '00:00';
  const sign = safe > 0 ? '+' : '-';
  return `${sign}${formatMinutes(Math.abs(safe))}`;
}

export function clockTimeToMinutes(value: string) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function intervalClockMinutes(start: string, end: string) {
  const from = clockTimeToMinutes(start);
  const to = clockTimeToMinutes(end);
  if (from === null || to === null) return 0;
  return to >= from ? to - from : 24 * 60 - from + to;
}

const JS_WEEKDAY_TO_KEY: WeekdayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const SHORT_WEEKDAY_TO_KEY: Record<string, WeekdayKey> = {
  seg: 'monday',
  ter: 'tuesday',
  qua: 'wednesday',
  qui: 'thursday',
  sex: 'friday',
  sab: 'saturday',
  sáb: 'saturday',
  dom: 'sunday',
};

export function punchDayWeekdayKey(day: PunchDayInput): WeekdayKey | null {
  const rawDate = String(day?.date || '');
  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const date = new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])));
    if (!Number.isNaN(date.getTime())) return JS_WEEKDAY_TO_KEY[date.getUTCDay()] || null;
  }

  const normalizedLabel = String(day?.weekdayLabel || '')
    .trim()
    .toLowerCase()
    .slice(0, 3);
  return SHORT_WEEKDAY_TO_KEY[normalizedLabel] || null;
}

export function punchDayReferenceMinutes(
  day: PunchDayInput,
  weeklySchedule: WeeklyDaySchedule[] = [],
  fallbackDailyHours = 8,
) {
  const key = punchDayWeekdayKey(day);
  const scheduledDay = key ? (weeklySchedule || []).find(item => item?.key === key) : null;

  if (scheduledDay) {
    if (!scheduledDay.active) return 0;
    const configuredMinutes = scheduleDayMinutes(scheduledDay);
    if (configuredMinutes > 0) return configuredMinutes;
  }

  return Math.max(0, Math.round(safeNumber(fallbackDailyHours, 8) * 60));
}

export function summarizePunchDay(
  day: PunchDayInput,
  dailyHours = 8,
  weeklySchedule: WeeklyDaySchedule[] = [],
): PunchDaySummary {
  const punches = Array.isArray(day?.punches)
    ? day.punches.map(value => String(value || '').trim()).filter(Boolean)
    : [];
  const referenceMinutes = punchDayReferenceMinutes(day, weeklySchedule, dailyHours);

  if (!punches.length) {
    return {
      date: String(day?.date || ''),
      weekdayLabel: String(day?.weekdayLabel || ''),
      punches,
      workedMinutes: 0,
      referenceMinutes,
      balanceMinutes: null,
      excessMinutes: 0,
      deficitMinutes: 0,
      status: 'no_punches',
    };
  }

  let workedMinutes = 0;
  let invalidPair = false;
  const completePairCount = Math.floor(punches.length / 2);

  for (let index = 0; index < completePairCount * 2; index += 2) {
    const start = punches[index];
    const end = punches[index + 1];
    if (clockTimeToMinutes(start) === null || clockTimeToMinutes(end) === null) {
      invalidPair = true;
      continue;
    }
    workedMinutes += intervalClockMinutes(start, end);
  }

  const incomplete = punches.length % 2 !== 0 || invalidPair;
  const balanceMinutes = incomplete ? null : workedMinutes - referenceMinutes;

  return {
    date: String(day?.date || ''),
    weekdayLabel: String(day?.weekdayLabel || ''),
    punches,
    workedMinutes,
    referenceMinutes,
    balanceMinutes,
    excessMinutes: balanceMinutes !== null ? Math.max(0, balanceMinutes) : 0,
    deficitMinutes: balanceMinutes !== null ? Math.max(0, -balanceMinutes) : 0,
    status: incomplete ? 'incomplete' : 'complete',
  };
}

export function summarizePunchPeriod(
  days: PunchDayInput[],
  dailyHours = 8,
  weeklySchedule: WeeklyDaySchedule[] = [],
): PunchPeriodSummary {
  const summaries = (Array.isArray(days) ? days : []).map(day =>
    summarizePunchDay(day, dailyHours, weeklySchedule),
  );

  const workedMinutes = summaries.reduce((sum, day) => sum + day.workedMinutes, 0);
  const completeDays = summaries.filter(day => day.status === 'complete').length;
  const incompleteDays = summaries.filter(day => day.status === 'incomplete').length;
  const noPunchDays = summaries.filter(day => day.status === 'no_punches').length;
  const referenceMinutes = summaries
    .filter(day => day.status === 'complete')
    .reduce((sum, day) => sum + day.referenceMinutes, 0);
  const excessMinutes = summaries.reduce((sum, day) => sum + day.excessMinutes, 0);
  const deficitMinutes = summaries.reduce((sum, day) => sum + day.deficitMinutes, 0);

  return {
    days: summaries,
    workedMinutes,
    referenceMinutes,
    excessMinutes,
    deficitMinutes,
    netMinutes: excessMinutes - deficitMinutes,
    completeDays,
    incompleteDays,
    noPunchDays,
  };
}

export function scheduleDayMinutes(day: WeeklyDaySchedule) {
  if (!day?.active) return 0;
  return intervalClockMinutes(day.entry1, day.exit1) + intervalClockMinutes(day.entry2, day.exit2);
}

export function weeklyScheduleMinutes(schedule: WeeklyDaySchedule[]) {
  return (schedule || []).reduce((sum, day) => sum + scheduleDayMinutes(day), 0);
}

export function emptyWeeklySchedule(): WeeklyDaySchedule[] {
  return WEEKDAYS.map((day, index) => ({
    key: day.key,
    active: index < 5,
    entry1: '',
    exit1: '',
    entry2: '',
    exit2: '',
  }));
}

export function formatCurrency(value: number) {
  return money(Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatRate(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function calculateWorkHours(form: WorkHoursForm): WorkHoursResult {
  const monthlyHours = Math.max(0.01, safeNumber(form.monthlyHours, 220));
  const dailyHours = Math.max(0, safeNumber(form.dailyHours, 8));
  const baseSalary = Math.max(0, safeNumber(form.baseSalary));
  const configuredHourly = Math.max(0, safeNumber(form.hourlyRate));
  const hourlyRate =
    form.employmentType === 'monthly'
      ? baseSalary / monthlyHours
      : configuredHourly;

  const normalMinutes = parseHoursToMinutes(form.normalHours);
  const overtime50Minutes = parseHoursToMinutes(form.overtime50);
  const overtime100Minutes = parseHoursToMinutes(form.overtime100);
  const nightMinutes = parseHoursToMinutes(form.nightHours);
  const holidayMinutes = parseHoursToMinutes(form.holidayHours);
  const absenceMinutes = parseHoursToMinutes(form.absenceHours);
  const lateMinutes = parseHoursToMinutes(form.lateHours);
  const bankPositiveMinutes = parseHoursToMinutes(form.bankPositive);
  const bankNegativeMinutes = parseHoursToMinutes(form.bankNegative);

  const normalHours = normalMinutes / 60;
  const overtime50Hours = overtime50Minutes / 60;
  const overtime100Hours = overtime100Minutes / 60;
  const nightHours = nightMinutes / 60;
  const holidayHours = holidayMinutes / 60;
  const absenceHours = absenceMinutes / 60;
  const lateHours = lateMinutes / 60;
  const bankPositiveHours = bankPositiveMinutes / 60;
  const bankNegativeHours = bankNegativeMinutes / 60;

  const overtime50Percent = Math.max(0, safeNumber(form.overtime50Percent, 50));
  const overtime100Percent = Math.max(0, safeNumber(form.overtime100Percent, 100));
  const nightPercent = Math.max(0, safeNumber(form.nightPercent, 20));
  const holidayPercent = Math.max(0, safeNumber(form.holidayPercent, 100));
  const absenceDayDivisor = Math.max(1, safeNumber(form.absenceDayDivisor, 30));

  const basePay = money(form.employmentType === 'monthly' ? baseSalary : normalHours * hourlyRate);
  const dailyRateRaw =
    form.employmentType === 'monthly'
      ? baseSalary / absenceDayDivisor
      : dailyHours * hourlyRate;
  const dailyRate = money(dailyRateRaw);

  const additions = {
    overtime50: money(overtime50Hours * hourlyRate * (1 + overtime50Percent / 100)),
    overtime100: money(overtime100Hours * hourlyRate * (1 + overtime100Percent / 100)),
    nightPremium: money(nightHours * hourlyRate * (nightPercent / 100)),
    holidayPremium: money(holidayHours * hourlyRate * (holidayPercent / 100)),
    bankPositive: money(form.settleBank ? bankPositiveHours * hourlyRate : 0),
    other: money(
      (form.otherAdditions || []).reduce((sum, item) => sum + resolveMoneyAdjustment(item, basePay), 0),
    ),
  };

  const deductions = {
    absenceDays: money(Math.max(0, safeNumber(form.absenceDays)) * dailyRateRaw),
    absenceHours: money(absenceHours * hourlyRate),
    lateHours: money(lateHours * hourlyRate),
    bankNegative: money(form.settleBank ? bankNegativeHours * hourlyRate : 0),
    other: money(
      (form.otherDeductions || []).reduce((sum, item) => sum + resolveMoneyAdjustment(item, basePay), 0),
    ),
  };

  const additionsTotal = money(Object.values(additions).reduce((sum, value) => sum + value, 0));
  const deductionsTotal = money(Object.values(deductions).reduce((sum, value) => sum + value, 0));
  const total = money(basePay + additionsTotal - deductionsTotal);

  const memory: string[] = [];
  if (form.employmentType === 'monthly') {
    memory.push(
      `Valor da hora: ${formatCurrency(baseSalary)} ÷ ${monthlyHours}h = ${formatRate(hourlyRate)}`,
    );
  } else {
    memory.push(`Valor da hora informado: ${formatRate(hourlyRate)}`);
    memory.push(
      `Horas normais: ${formatMinutes(normalMinutes)} × ${formatRate(hourlyRate)} = ${formatCurrency(basePay)}`,
    );
  }
  if (overtime50Minutes) {
    memory.push(
      `HE ${overtime50Percent}%: ${formatMinutes(overtime50Minutes)} × ${formatRate(hourlyRate)} × ${(
        1 + overtime50Percent / 100
      ).toFixed(2)} = ${formatCurrency(additions.overtime50)}`,
    );
  }
  if (overtime100Minutes) {
    memory.push(
      `HE ${overtime100Percent}%: ${formatMinutes(overtime100Minutes)} × ${formatRate(hourlyRate)} × ${(
        1 + overtime100Percent / 100
      ).toFixed(2)} = ${formatCurrency(additions.overtime100)}`,
    );
  }
  if (nightMinutes) {
    memory.push(
      `Adicional noturno: ${formatMinutes(nightMinutes)} × ${formatRate(hourlyRate)} × ${nightPercent}% = ${formatCurrency(
        additions.nightPremium,
      )}`,
    );
  }
  if (holidayMinutes) {
    memory.push(
      `Adicional domingo/feriado: ${formatMinutes(holidayMinutes)} × ${formatRate(hourlyRate)} × ${holidayPercent}% = ${formatCurrency(
        additions.holidayPremium,
      )}`,
    );
  }
  if (safeNumber(form.absenceDays) > 0) {
    memory.push(
      `Faltas em dias: ${safeNumber(form.absenceDays)} × ${formatRate(dailyRateRaw)} = -${formatCurrency(
        deductions.absenceDays,
      )}`,
    );
  }
  if (absenceMinutes) {
    memory.push(
      `Faltas em horas: ${formatMinutes(absenceMinutes)} × ${formatRate(hourlyRate)} = -${formatCurrency(
        deductions.absenceHours,
      )}`,
    );
  }
  if (lateMinutes) {
    memory.push(
      `Atrasos/saídas: ${formatMinutes(lateMinutes)} × ${formatRate(hourlyRate)} = -${formatCurrency(
        deductions.lateHours,
      )}`,
    );
  }
  if (form.settleBank && bankPositiveMinutes) {
    memory.push(
      `Banco positivo liquidado: ${formatMinutes(bankPositiveMinutes)} × ${formatRate(hourlyRate)} = ${formatCurrency(
        additions.bankPositive,
      )}`,
    );
  }
  if (form.settleBank && bankNegativeMinutes) {
    memory.push(
      `Banco negativo liquidado: ${formatMinutes(bankNegativeMinutes)} × ${formatRate(hourlyRate)} = -${formatCurrency(
        deductions.bankNegative,
      )}`,
    );
  }

  (form.otherAdditions || []).forEach(item => {
    const resolved = resolveMoneyAdjustment(item, basePay);
    if (!resolved) return;
    const label = String(item.label || 'Acréscimo');
    memory.push(
      item.mode === 'percent'
        ? `${label}: ${safeNumber(item.amount)}% de ${formatCurrency(basePay)} = ${formatCurrency(resolved)}`
        : `${label}: ${formatCurrency(resolved)}`,
    );
  });
  (form.otherDeductions || []).forEach(item => {
    const resolved = resolveMoneyAdjustment(item, basePay);
    if (!resolved) return;
    const label = String(item.label || 'Desconto');
    memory.push(
      item.mode === 'percent'
        ? `${label}: ${safeNumber(item.amount)}% de ${formatCurrency(basePay)} = -${formatCurrency(resolved)}`
        : `${label}: -${formatCurrency(resolved)}`,
    );
  });

  return {
    hourlyRate,
    dailyRate,
    basePay,
    additions,
    deductions,
    additionsTotal,
    deductionsTotal,
    total,
    minutes: {
      normal: normalMinutes,
      overtime50: overtime50Minutes,
      overtime100: overtime100Minutes,
      night: nightMinutes,
      holiday: holidayMinutes,
      absence: absenceMinutes,
      late: lateMinutes,
      bankPositive: bankPositiveMinutes,
      bankNegative: bankNegativeMinutes,
    },
    memory,
  };
}

export function emptyWorkHoursForm(): WorkHoursForm {
  return {
    employmentType: 'monthly',
    baseSalary: NATIONAL_MINIMUM_WAGE_2026,
    hourlyRate: 0,
    monthlyHours: 220,
    dailyHours: 8,
    absenceDayDivisor: 30,
    normalHours: '',
    overtime50: '',
    overtime100: '',
    overtime50Percent: 50,
    overtime100Percent: 100,
    nightHours: '',
    nightPercent: 20,
    holidayHours: '',
    holidayPercent: 100,
    absenceDays: 0,
    absenceHours: '',
    lateHours: '',
    bankPositive: '',
    bankNegative: '',
    settleBank: false,
    weeklySchedule: emptyWeeklySchedule(),
    otherAdditions: [],
    otherDeductions: [],
  };
}
