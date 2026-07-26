import { describe, it, expect } from 'vitest';
import { getCampaign } from './index';
import { adventureChapters } from '../adventure/chapters';
import { adventureSidequests } from '../adventure/sidequests';

describe('campaign registry', () => {
  it('getCampaign("probation") wraps the existing content verbatim', () => {
    const c = getCampaign('probation');
    expect(c.id).toBe('probation');
    expect(c.startChapterId).toBe('ch01_first_day');
    expect(c.chapters).toBe(adventureChapters);
    expect(c.sidequests).toBe(adventureSidequests);
  });

  it('resolves the registered audit-trail campaign', () => {
    const c = getCampaign('audit-trail');
    expect(c.id).toBe('audit-trail');
    expect(c.startChapterId).toBe('at_ch01_onboarding');
    expect(c.deriveEnding).toBeTypeOf('function');
  });

  it('both campaigns carry the wiring App relies on (tokens, deriveEnding)', () => {
    for (const id of ['probation', 'audit-trail'] as const) {
      const c = getCampaign(id);
      expect(c.deriveEnding).toBeTypeOf('function');
      expect(c.characterTokens.chef).toBeTruthy();
      expect(Object.keys(c.endingTexts).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('audit-trail declares a modular epilogue; probation does not (static text)', () => {
    expect(getCampaign('audit-trail').buildEpilogue).toBeTypeOf('function');
    expect(getCampaign('probation').buildEpilogue).toBeUndefined();
  });
});
