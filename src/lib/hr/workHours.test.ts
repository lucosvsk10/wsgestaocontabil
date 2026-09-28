import { describe, expect, it } from 'vitest';
import {
  calculateWorkHours,
  emptyWeeklySchedule,
  emptyWorkHoursForm,
  formatMinutes,
  parseHoursToMinutes,
  scheduleDayMinutes,
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
