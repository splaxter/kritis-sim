import { describe, it, expect } from 'vitest';
import { createInitialState } from './gameState';

describe('createInitialState — campaign-seeded story state', () => {
  it('defaults a story run to probation', () => {
    const s = createInitialState('seed-a', 'story');
    expect(s.storyState?.campaignId).toBe('probation');
    expect(s.storyState?.currentChapter).toBe('ch01_first_day');
  });

  it('seeds an AUDIT TRAIL run at its own campaign + start chapter', () => {
    const s = createInitialState('seed-b', 'story', 'audit-trail');
    expect(s.storyState?.campaignId).toBe('audit-trail');
    expect(s.storyState?.currentChapter).toBe('at_ch01_onboarding');
  });

  it('a fresh AUDIT TRAIL run carries NO probation flags or relationship/character state', () => {
    const s = createInitialState('seed-c', 'story', 'audit-trail');
    // No story flags leaked in.
    expect(Object.keys(s.flags)).toHaveLength(0);
    // Empty character memory — nothing imported from any other run/campaign.
    expect(s.storyState?.characterMemory).toEqual({});
    expect(s.storyState?.completedChapters).toEqual([]);
    expect(s.storyState?.completedSidequests).toEqual([]);
    expect(s.storyState?.endingFlags).toEqual([]);
  });

  it('non-story modes are unaffected (no storyState)', () => {
    const s = createInitialState('seed-d', 'kritis');
    expect(s.storyState).toBeUndefined();
  });
});
