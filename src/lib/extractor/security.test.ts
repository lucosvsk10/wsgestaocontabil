// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  readJsonLimited,
  validateCertificateInput,
  safeCsvCell,
  validDateRange,
} from '../../../supabase/functions/_shared/request-guards';
describe('proteções de entrada e exportação', () => {
  it('recusa JSON grande mesmo sem content-length', async () => {
    await expect(
      readJsonLimited(
        new Request('https://example.test', {
          method: 'POST',
          body: JSON.stringify({ text: 'a'.repeat(100) }),
        }),
        40
      )
    ).rejects.toMatchObject({ status: 413 });
  });
  it('recusa conteúdo não-objeto', async () => {
    await expect(
      readJsonLimited(new Request('https://example.test', { method: 'POST', body: '[]' }))
    ).rejects.toMatchObject({ status: 400 });
  });
  it('aceita objeto limitado', async () => {
    expect(
      await readJsonLimited(
        new Request('https://example.test', { method: 'POST', body: '{"a":1}' })
      )
    ).toEqual({ a: 1 });
  });
  it('recusa extensão e base64 inválidos', () => {
    expect(() => validateCertificateInput('AQID', 'password', 'test.txt')).toThrow('.pfx');
    expect(() => validateCertificateInput('%%%', 'password', 'test.pfx')).toThrow('inválido');
    expect(() => validateCertificateInput('AQID', '', 'test.pfx')).toThrow('senha');
  });
  it('recusa A1 acima de 2MB e senha excessiva', () => {
    expect(() => validateCertificateInput('A'.repeat(2900000), 'pass', 'a.pfx')).toThrow('2 MB');
    expect(() => validateCertificateInput('AQID', 'p'.repeat(1025), 'a.pfx')).toThrow('longa');
  });
  it('aceita PFX e P12, sem considerar isso validação criptográfica', () => {
    expect(() => validateCertificateInput('AQID', 'password', 'A.PFX')).not.toThrow();
    expect(() => validateCertificateInput('AQID', 'password', 'A.p12')).not.toThrow();
  });
  it.each(['=HYPERLINK("https://example.test")', '+cmd', '-2+3', '@SUM(A1)', ' \t=cmd'])(
    'neutraliza fórmula CSV %s',
    v => {
      expect(safeCsvCell(v).startsWith('"\'')).toBe(true);
    }
  );
  it('preserva texto e escapa aspas no CSV', () => {
    expect(safeCsvCell('José "A"')).toBe('"José ""A"""');
  });
  it('valida datas reais, ordem, ano bissexto e intervalo', () => {
    expect(validDateRange('2026-02-30', '2026-03-01')).toBe(false);
    expect(validDateRange('2024-02-29', '2024-03-01')).toBe(true);
    expect(validDateRange('2026-03-02', '2026-03-01')).toBe(false);
    expect(validDateRange('2024-01-01', '2026-03-01')).toBe(false);
  });
});
