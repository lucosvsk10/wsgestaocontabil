import { describe, expect, it } from 'vitest';
import {
  calculateWorkHours,
  emptyWeeklySchedule,
  emptyWorkHoursForm,
  formatMinutes,
  parseHoursToMinutes,
  scheduleDayMinutes,
  summarizePunchDay,
  summarizePunchPeriod,
  weeklyScheduleMinutes,
} from './workHours';

describe('workHours', () => {
  it('starts monthly calculations with the 2026 national minimum wage', () => {
    expect(emptyWorkHoursForm().baseSalary).toBe(1621);
  });

  it('parses HH:MM and decimal hours', () => {
    expect(parseHoursToMinutes('08:30')).toBe(510);
    expect(parseHoursToMinutes('1h15')).toBe(75);
    expect(parseHoursToMinutes('2,5')).toBe(150);
    expect(formatMinutes(510)).toBe('08:30');
  });

  it('calculates a weekly schedule day by day', () => {
    const schedule = emptyWeeklySchedule().map(day => ({
      ...day,
      entry1: day.active ? '08:00' : '',
      exit1: day.active ? '12:00' : '',
      entry2: day.active ? '13:00' : '',
      exit2: day.active ? '17:00' : '',
    }));

    expect(scheduleDayMinutes(schedule[0])).toBe(480);
    expect(weeklyScheduleMinutes(schedule)).toBe(2400);
    expect(formatMinutes(weeklyScheduleMinutes(schedule))).toBe('40:00');

    const saturday = schedule.find(day => day.key === 'saturday')!;
    expect(scheduleDayMinutes(saturday)).toBe(0);
  });

  it('supports a shift that crosses midnight', () => {
    const day = {
      ...emptyWeeklySchedule()[0],
      active: true,
      entry1: '22:00',
      exit1: '02:00',
      entry2: '',
      exit2: '',
    };

    expect(scheduleDayMinutes(day)).toBe(240);
  });

  it('calculates monthly salary, overtime and deductions', () => {
    const form = {
      ...emptyWorkHoursForm(),
      baseSalary: 2200,
      monthlyHours: 220,
      overtime50: '02:00',
      overtime100: '01:00',
      absenceDays: 1,
      lateHours: '00:30',
    };

    const result = calculateWorkHours(form);
    expect(result.hourlyRate).toBe(10);
    expect(result.basePay).toBe(2200);
    expect(result.additions.overtime50).toBe(30);
    expect(result.additions.overtime100).toBe(20);
    expect(result.deductions.absenceDays).toBe(73.33);
    expect(result.deductions.lateHours).toBe(5);
    expect(result.total).toBe(2171.67);
  });

  it('calculates hourly employee base from normal hours', () => {
    const form = {
      ...emptyWorkHoursForm(),
      employmentType: 'hourly' as const,
      hourlyRate: 15,
      normalHours: '100:00',
    };

    const result = calculateWorkHours(form);
    expect(result.basePay).toBe(1500);
    expect(result.total).toBe(1500);
  });

  it('calculates fixed and percentage additions and deductions', () => {
    const form = {
      ...emptyWorkHoursForm(),
      baseSalary: 2000,
      otherAdditions: [
        { id: 'a1', label: 'Comissão', amount: 10, mode: 'percent' as const },
        { id: 'a2', label: 'Prêmio', amount: 150 },
      ],
      otherDeductions: [
        { id: 'd1', label: 'Vale-transporte', amount: 6, mode: 'percent' as const },
        { id: 'd2', label: 'Adiantamento salarial', amount: 200 },
      ],
    };

    const result = calculateWorkHours(form);
    expect(result.additions.other).toBe(350);
    expect(result.deductions.other).toBe(320);
    expect(result.total).toBe(2030);
    expect(result.memory.some(line => line.startsWith('Comissão: 10%') && line.includes('200,00'))).toBe(true);
  });

  it('keeps legacy adjustment rows as fixed amounts', () => {
    const form = {
      ...emptyWorkHoursForm(),
      baseSalary: 2000,
      otherDeductions: [{ id: 'legacy', label: 'Desconto antigo', amount: 75 }],
    };

    expect(calculateWorkHours(form).deductions.other).toBe(75);
  });

  it('sums paired punches and compares the day against the daily reference', () => {
    const exact = summarizePunchDay(
      {
        date: '2026-08-03',
        weekdayLabel: 'Seg',
        punches: ['08:00', '12:00', '13:00', '17:00'],
      },
      8,
    );
    expect(exact.workedMinutes).toBe(480);
    expect(exact.balanceMinutes).toBe(0);

    const extra = summarizePunchDay(
      {
        date: '2026-08-04',
        weekdayLabel: 'Ter',
        punches: ['08:00', '12:00', '13:00', '18:00'],
      },
      8,
    );
    expect(extra.workedMinutes).toBe(540);
    expect(extra.balanceMinutes).toBe(60);
    expect(extra.excessMinutes).toBe(60);

    const short = summarizePunchDay(
      {
        date: '2026-08-05',
        weekdayLabel: 'Qua',
        punches: ['08:00', '12:00', '13:00', '16:30'],
      },
      8,
    );
    expect(short.workedMinutes).toBe(450);
    expect(short.balanceMinutes).toBe(-30);
    expect(short.deficitMinutes).toBe(30);
  });

  it('does not invent a missing punch when a day has an odd number of marks', () => {
    const incomplete = summarizePunchDay(
      {
        date: '2026-08-06',
        weekdayLabel: 'Qui',
        punches: ['08:00', '12:00', '13:00'],
      },
      8,
    );

    expect(incomplete.workedMinutes).toBe(240);
    expect(incomplete.balanceMinutes).toBeNull();
    expect(incomplete.status).toBe('incomplete');
  });

  it('summarizes worked, reference, excess and deficit only from complete days', () => {
    const period = summarizePunchPeriod(
      [
        { date: '2026-08-03', weekdayLabel: 'Seg', punches: ['08:00', '12:00', '13:00', '17:00'] },
        { date: '2026-08-04', weekdayLabel: 'Ter', punches: ['08:00', '12:00', '13:00', '18:00'] },
        { date: '2026-08-05', weekdayLabel: 'Qua', punches: ['08:00', '12:00', '13:00', '16:30'] },
        { date: '2026-08-06', weekdayLabel: 'Qui', punches: ['08:00', '12:00', '13:00'] },
        { date: '2026-08-07', weekdayLabel: 'Sex', punches: [] },
      ],
      8,
    );

    expect(period.workedMinutes).toBe(1710);
    expect(period.referenceMinutes).toBe(1440);
    expect(period.excessMinutes).toBe(60);
    expect(period.deficitMinutes).toBe(30);
    expect(period.netMinutes).toBe(30);
    expect(period.completeDays).toBe(3);
    expect(period.incompleteDays).toBe(1);
    expect(period.noPunchDays).toBe(1);
  });

  it('keeps bank hours informational until liquidation is enabled', () => {
    const form = {
      ...emptyWorkHoursForm(),
      baseSalary: 2200,
      bankPositive: '05:00',
      bankNegative: '02:00',
      settleBank: false,
    };

    const pending = calculateWorkHours(form);
    expect(pending.additions.bankPositive).toBe(0);
    expect(pending.deductions.bankNegative).toBe(0);

    const settled = calculateWorkHours({ ...form, settleBank: true });
    expect(settled.additions.bankPositive).toBe(50);
    expect(settled.deductions.bankNegative).toBe(20);
  });
});
