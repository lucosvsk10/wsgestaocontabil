import { describe, expect, it } from 'vitest';
import { inferWeeklySchedule, parsePointMirrorPage } from './pointMirrorImport';

describe('pointMirrorImport', () => {
  it('parses employee identity, employer, period and daily punches', () => {
    const text = [
      'Relatório Espelho Ponto 01/09/2026 09:52',
      'Nome: Caroline Gois de Oliveira',
      'Matricula: 1234563',
      'Horário: Carga Horária',
      'Data de início BH: 01/01/2024',
      'Cargo: Vendedor',
      'CPF: 074.748.975-04',
      'PIS: 209.88671.16-4',
      'Data de Admissão: 13/01/2023',
      'Empresa: Batista e Silva LTDA',
      'CNPJ: 29.995.298/0001-07',
      'Período consultado: 01/08/2026 à 31/08/2026',
      'Sab - 01/08 08:02 12:16',
      'Dom - 02/08',
      'Seg - 03/08 08:00 13:07 14:03 17:56',
      'Ter - 04/08 08:00 11:54 14:00 17:54',
      'Qua - 05/08 08:00 12:00 14:00 18:02',
    ].join('\n');

    const result = parsePointMirrorPage(text, 1);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Caroline Gois de Oliveira');
    expect(result?.cpf).toBe('07474897504');
    expect(result?.registration).toBe('1234563');
    expect(result?.role).toBe('Vendedor');
    expect(result?.employerName).toBe('Batista e Silva LTDA');
    expect(result?.employerCnpj).toBe('29995298000107');
    expect(result?.periodStart).toBe('2026-08-01');
    expect(result?.periodEnd).toBe('2026-08-31');
    expect(result?.punches).toHaveLength(5);
    expect(result?.punches[2].punches).toEqual(['08:00', '13:07', '14:03', '17:56']);
  });

  it('infers an editable weekly schedule from recurring punches', () => {
    const schedule = inferWeeklySchedule([
      { date: '2026-08-03', weekdayLabel: 'Seg', punches: ['08:00', '12:00', '14:00', '18:00'] },
      { date: '2026-08-10', weekdayLabel: 'Seg', punches: ['08:02', '11:58', '14:02', '18:02'] },
      { date: '2026-08-01', weekdayLabel: 'Sab', punches: ['08:01', '12:03'] },
    ]);

    const monday = schedule.find(day => day.key === 'monday');
    const saturday = schedule.find(day => day.key === 'saturday');
    const sunday = schedule.find(day => day.key === 'sunday');

    expect(monday?.active).toBe(true);
    expect(monday?.entry1).toBe('08:01');
    expect(monday?.exit1).toBe('11:59');
    expect(monday?.entry2).toBe('14:01');
    expect(monday?.exit2).toBe('18:01');
    expect(saturday?.active).toBe(true);
    expect(sunday?.active).toBe(false);
  });
});
