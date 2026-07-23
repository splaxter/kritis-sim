import { describe, it, expect } from 'vitest';
import { formatNarrativeText } from './formatNarrativeText';

const tokens = { chef: 'Bert', player: 'Alex' };

describe('formatNarrativeText', () => {
  it('replaces {player} and {chef}', () => {
    expect(formatNarrativeText('Hallo {player}, sagt {chef}.', tokens)).toBe('Hallo Alex, sagt Bert.');
  });
  it('replaces every occurrence (global)', () => {
    expect(formatNarrativeText('{player} und {player}', tokens)).toBe('Alex und Alex');
  });
  it('leaves a name containing $&, $-backtick, $$ LITERAL (callback replacement, not $-syntax)', () => {
    expect(formatNarrativeText('Hi {player}!', { player: '$&$`$$' })).toBe('Hi $&$`$$!');
  });
  it('leaves unknown tokens untouched', () => {
    expect(formatNarrativeText('{gf} kommt', tokens)).toBe('{gf} kommt');
  });
  it('returns the text unchanged when there are no tokens', () => {
    expect(formatNarrativeText('kein Token hier', tokens)).toBe('kein Token hier');
  });
});
