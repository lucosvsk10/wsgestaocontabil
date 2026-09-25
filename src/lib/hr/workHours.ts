export type EmploymentType = 'monthly' | 'hourly';

export type MoneyAdjustment = {
  id: string;
  label: string;
  amount: number;
};

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

export function formatCurrency(value: number) {
  return money(Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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
  const dailyRate = money(
    form.employmentType === 'monthly'
      ? baseSalary / absenceDayDivisor
      : dailyHours * hourlyRate,
  );

  const additions = {
    overtime50: money(overtime50Hours * hourlyRate * (1 + overtime50Percent / 100)),
    overtime100: money(overtime100Hours * hourlyRate * (1 + overtime100Percent / 100)),
    nightPremium: money(nightHours * hourlyRate * (nightPercent / 100)),
    holidayPremium: money(holidayHours * hourlyRate * (holidayPercent / 100)),
    bankPositive: money(form.settleBank ? bankPositiveHours * hourlyRate : 0),
    other: money(
      (form.otherAdditions || []).reduce((sum, item) => sum + Math.max(0, safeNumber(item.amount)), 0),
    ),
  };

  const deductions = {
    absenceDays: money(Math.max(0, safeNumber(form.absenceDays)) * dailyRate),
    absenceHours: money(absenceHours * hourlyRate),
    lateHours: money(lateHours * hourlyRate),
    bankNegative: money(form.settleBank ? bankNegativeHours * hourlyRate : 0),
    other: money(
      (form.otherDeductions || []).reduce((sum, item) => sum + Math.max(0, safeNumber(item.amount)), 0),
    ),
  };

  const additionsTotal = money(Object.values(additions).reduce((sum, value) => sum + value, 0));
  const deductionsTotal = money(Object.values(deductions).reduce((sum, value) => sum + value, 0));
  const total = money(basePay + additionsTotal - deductionsTotal);

  const memory: string[] = [];
  if (form.employmentType === 'monthly') {
    memory.push(
      `Valor da hora: ${formatCurrency(baseSalary)} ÷ ${monthlyHours}h = ${formatCurrency(hourlyRate)}`,
    );
  } else {
    memory.push(`Valor da hora informado: ${formatCurrency(hourlyRate)}`);
    memory.push(
      `Horas normais: ${formatMinutes(normalMinutes)} × ${formatCurrency(hourlyRate)} = ${formatCurrency(basePay)}`,
    );
  }
  if (overtime50Minutes) {
    memory.push(
      `HE ${overtime50Percent}%: ${formatMinutes(overtime50Minutes)} × ${formatCurrency(hourlyRate)} × ${(
        1 + overtime50Percent / 100
      ).toFixed(2)} = ${formatCurrency(additions.overtime50)}`,
    );
  }
  if (overtime100Minutes) {
    memory.push(
      `HE ${overtime100Percent}%: ${formatMinutes(overtime100Minutes)} × ${formatCurrency(hourlyRate)} × ${(
        1 + overtime100Percent / 100
      ).toFixed(2)} = ${formatCurrency(additions.overtime100)}`,
    );
  }
  if (nightMinutes) {
    memory.push(
      `Adicional noturno: ${formatMinutes(nightMinutes)} × ${formatCurrency(hourlyRate)} × ${nightPercent}% = ${formatCurrency(
        additions.nightPremium,
      )}`,
    );
  }
  if (holidayMinutes) {
    memory.push(
      `Adicional domingo/feriado: ${formatMinutes(holidayMinutes)} × ${formatCurrency(hourlyRate)} × ${holidayPercent}% = ${formatCurrency(
        additions.holidayPremium,
      )}`,
    );
  }
  if (safeNumber(form.absenceDays) > 0) {
    memory.push(
      `Faltas em dias: ${safeNumber(form.absenceDays)} × ${formatCurrency(dailyRate)} = -${formatCurrency(
        deductions.absenceDays,
      )}`,
    );
  }
  if (absenceMinutes) {
    memory.push(
      `Faltas em horas: ${formatMinutes(absenceMinutes)} × ${formatCurrency(hourlyRate)} = -${formatCurrency(
        deductions.absenceHours,
      )}`,
    );
  }
  if (lateMinutes) {
    memory.push(
      `Atrasos/saídas: ${formatMinutes(lateMinutes)} × ${formatCurrency(hourlyRate)} = -${formatCurrency(
        deductions.lateHours,
      )}`,
    );
  }
  if (form.settleBank && bankPositiveMinutes) {
    memory.push(
      `Banco positivo liquidado: ${formatMinutes(bankPositiveMinutes)} × ${formatCurrency(hourlyRate)} = ${formatCurrency(
        additions.bankPositive,
      )}`,
    );
  }
  if (form.settleBank && bankNegativeMinutes) {
    memory.push(
      `Banco negativo liquidado: ${formatMinutes(bankNegativeMinutes)} × ${formatCurrency(hourlyRate)} = -${formatCurrency(
        deductions.bankNegative,
      )}`,
    );
  }

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
    baseSalary: 0,
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
    otherAdditions: [],
    otherDeductions: [],
  };
}
