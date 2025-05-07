
import { describe, it, expect } from 'vitest';
import { isDocumentExpired, daysUntilExpiration } from '../documentCleanup';

describe('Document utilities', () => {
  describe('isDocumentExpired', () => {
    it('should return false for null expiration date', () => {
      expect(isDocumentExpired(null)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // yesterday
      expect(isDocumentExpired(pastDate.toISOString())).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // tomorrow
      expect(isDocumentExpired(futureDate.toISOString())).toBe(false);
    });
  });

  describe('daysUntilExpiration', () => {
    it('should return "Sem validade" for null expiration date', () => {
      expect(daysUntilExpiration(null)).toBe('Sem validade');
    });

    it('should return "Expirado" for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // yesterday
      expect(daysUntilExpiration(pastDate.toISOString())).toBe('Expirado');
    });

    it('should return "Amanhã" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(daysUntilExpiration(tomorrow.toISOString())).toBe('Amanhã');
    });

    it('should return "X dias" for dates in the future', () => {
      const futureDays = 5;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + futureDays);
      expect(daysUntilExpiration(futureDate.toISOString())).toBe(`${futureDays} dias`);
    });
  });
});
