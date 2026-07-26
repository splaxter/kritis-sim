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

  it('applies the campaign start relationships over the mode defaults', () => {
    const prob = createInitialState('seed-r1', 'story');            // probation: mode defaults
    const at = createInitialState('seed-r2', 'story', 'audit-trail'); // audit-trail overrides
    // AUDIT TRAIL declares its own starting relationships → they differ from
    // probation's mode-default values (proves the override actually applies).
    expect(at.relationships.chef).toBe(0);
    expect(at.relationships.kollegen).toBe(10);
    expect(at.relationships).not.toEqual(prob.relationships);
  });

  it('non-story modes are unaffected (no storyState)', () => {
    const s = createInitialState('seed-d', 'kritis');
    expect(s.storyState).toBeUndefined();
  });
});
