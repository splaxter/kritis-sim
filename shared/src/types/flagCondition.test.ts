import { describe, it, expect } from 'vitest';
import { checkFlagCondition, FlagCondition } from './flagCondition';

const flags = (...set: string[]): Record<string, boolean> =>
  Object.fromEntries(set.map(f => [f, true]));

describe('checkFlagCondition', () => {
  it('undefined condition is always true (unconditional beat)', () => {
    expect(checkFlagCondition(undefined, {})).toBe(true);
    expect(checkFlagCondition(undefined, flags('a'))).toBe(true);
  });

  describe('string form (backward compatible with single-flag branchCondition)', () => {
    it('true when the flag is set', () => {
      expect(checkFlagCondition('a', flags('a'))).toBe(true);
    });
    it('false when the flag is missing or explicitly false', () => {
      expect(checkFlagCondition('a', {})).toBe(false);
      expect(checkFlagCondition('a', { a: false })).toBe(false);
    });
  });

  describe('all', () => {
    it('true only when every flag is set', () => {
      expect(checkFlagCondition({ all: ['a', 'b'] }, flags('a', 'b'))).toBe(true);
      expect(checkFlagCondition({ all: ['a', 'b'] }, flags('a'))).toBe(false);
    });
    it('empty all is vacuously true', () => {
      expect(checkFlagCondition({ all: [] }, {})).toBe(true);
    });
  });

  describe('any', () => {
    it('true when at least one flag is set', () => {
      expect(checkFlagCondition({ any: ['a', 'b'] }, flags('b'))).toBe(true);
      expect(checkFlagCondition({ any: ['a', 'b'] }, {})).toBe(false);
    });
    it('omitted/empty any does not constrain (stays true)', () => {
      expect(checkFlagCondition({ any: [] }, {})).toBe(true);
      expect(checkFlagCondition({ all: ['a'] }, flags('a'))).toBe(true);
    });
  });

  describe('none', () => {
    it('true only when no listed flag is set', () => {
      expect(checkFlagCondition({ none: ['x'] }, {})).toBe(true);
      expect(checkFlagCondition({ none: ['x'] }, flags('x'))).toBe(false);
    });
  });

  describe('combined (the D2 shape: all + none)', () => {
    const d2: FlagCondition = {
      all: ['finding_reported', 'authorization_documented', 'export_documented', 'evidence_hashed'],
      none: ['mailbox_scope_exceeded', 'personal_data_shared_broadly'],
    };
    it('true when all present and no negative flag set', () => {
      expect(
        checkFlagCondition(d2, flags(
          'finding_reported', 'authorization_documented', 'export_documented', 'evidence_hashed',
        )),
      ).toBe(true);
    });
    it('false when a negative flag is set even if all positives present', () => {
      expect(
        checkFlagCondition(d2, flags(
          'finding_reported', 'authorization_documented', 'export_documented', 'evidence_hashed',
          'mailbox_scope_exceeded',
        )),
      ).toBe(false);
    });
    it('false when a required positive is missing', () => {
      expect(
        checkFlagCondition(d2, flags(
          'finding_reported', 'authorization_documented', 'export_documented',
        )),
      ).toBe(false);
    });
  });

  it('empty object constrains nothing', () => {
    expect(checkFlagCondition({}, {})).toBe(true);
  });
});
