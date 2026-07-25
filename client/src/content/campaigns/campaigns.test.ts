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

  it('falls back to probation for a campaign not yet registered', () => {
    // 'audit-trail' content ships in Phase D; until then the lookup must never
    // return undefined (a stale save carrying that id must not crash).
    expect(getCampaign('audit-trail').id).toBe('probation');
  });
});
