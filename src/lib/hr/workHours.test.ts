import { describe, expect, it } from 'vitest';
import { calculateWorkHours, emptyWorkHoursForm, formatMinutes, parseHoursToMinutes } from './workHours';

describe('workHours', () => {
  it('parses HH:MM and decimal hours', () => {
    expect(parseHoursToMinutes('08:30')).toBe(510);
    expect(parseHoursToMinutes('1h15')).toBe(75);
    expect(parseHoursToMinutes('2,5')).toBe(150);
    expect(formatMinutes(510)).toBe('08:30');
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
