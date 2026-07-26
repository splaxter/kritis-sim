import { describe, it, expect } from 'vitest';
import { createInitialAdventureState } from './adventure';

describe('createInitialAdventureState — campaign parameter', () => {
  it('defaults to the probation campaign when called with no argument', () => {
    const state = createInitialAdventureState();
    expect(state.campaignId).toBe('probation');
    expect(state.currentChapter).toBe('ch01_first_day');
    expect(state.currentBeatIndex).toBe(0);
  });

  it('uses the given campaign id and start chapter', () => {
    const state = createInitialAdventureState({ id: 'audit-trail', startChapterId: 'at_ch01_onboarding' });
    expect(state.campaignId).toBe('audit-trail');
    expect(state.currentChapter).toBe('at_ch01_onboarding');
    expect(state.currentBeatIndex).toBe(0);
  });

  it('still initialises the rest of the adventure state cleanly', () => {
    const state = createInitialAdventureState();
    expect(state.completedChapters).toEqual([]);
    expect(state.activeSidequests).toEqual([]);
    expect(state.storyPath).toBe('neutral');
    expect(state.totalBeatsCompleted).toBe(0);
  });
});
