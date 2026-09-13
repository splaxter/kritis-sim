import { describe, it, expect } from 'vitest';
import { LEGAL_OWNER, LEGAL_DATA_IS_PLACEHOLDER, hasLegalPlaceholders } from './legal';

/**
 * Pflichtangaben nach § 5 TMG. Dieser Guard laeuft dauerhaft und bricht den
 * Build, falls je wieder ein Platzhalter einzieht — eine Seite, die ein
 * Impressum VERSPRICHT und dann „TODO" zeigt, ist schlechter als gar keine.
 *
 * Bewusst ohne Rendering: die Angaben sind Konfiguration, kein JSX.
 */
describe('Betreiberangaben', () => {
  it('traegt keine Platzhalter', () => {
    expect(LEGAL_DATA_IS_PLACEHOLDER).toBe(false);
  });

  it.each(['name', 'street', 'city', 'country', 'email'] as const)(
    '%s ist gefuellt',
    (feld) => {
      expect(LEGAL_OWNER[feld].trim().length, feld).toBeGreaterThan(0);
    }
  );

  it('die E-Mail ist syntaktisch brauchbar', () => {
    expect(LEGAL_OWNER.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });

  /** Die Telefonnummer ist nach § 5 TMG optional — leer ist erlaubt. */
  it('eine leere Telefonnummer gilt nicht als Platzhalter', () => {
    expect(hasLegalPlaceholders({ ...LEGAL_OWNER, phone: '' })).toBe(false);
  });

  it.each(['TODO', 'XXX', 'kontakt@example.com'])('erkennt „%s" als Platzhalter', (wert) => {
    expect(hasLegalPlaceholders({ ...LEGAL_OWNER, street: wert })).toBe(true);
  });
});
