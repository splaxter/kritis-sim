// client/src/config/legal.test.ts
import { describe, it, expect } from 'vitest';
import { LEGAL_OWNER, LEGAL_DATA_IS_PLACEHOLDER, hasLegalPlaceholders } from './legal';

describe('legal owner config', () => {
  it('detects TODO placeholders in any field', () => {
    expect(
      hasLegalPlaceholders({
        name: 'TODO Vorname Nachname',
        street: 'Musterweg 1',
        city: '12345 Musterstadt',
        country: 'Deutschland',
        email: 'kontakt@betreiber.example',
        phone: '',
      }),
    ).toBe(true);
  });

  it('accepts fully filled data (fixture, never shipped)', () => {
    expect(
      hasLegalPlaceholders({
        name: 'Erika Mustermann',
        street: 'Musterweg 1',
        city: '12345 Musterstadt',
        country: 'Deutschland',
        email: 'kontakt@betreiber.example',
        phone: '', // optional — empty is a valid final state
      }),
    ).toBe(false);
  });

  it('derives the shipped flag from the shipped data (stays consistent either way)', () => {
    expect(LEGAL_DATA_IS_PLACEHOLDER).toBe(hasLegalPlaceholders(LEGAL_OWNER));
  });
});
