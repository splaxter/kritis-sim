import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameState } from '@kritis/shared';
import { useGame } from './useGame';
import { getCampaign } from '../content/campaigns';
import { isAdventureModeComplete } from '../engine/adventureEngine';

/**
 * A story run must not be cut short by the calendar. Both halves of the bug this
 * guards: the campaign needs more day-slots than the mode's week budget offers,
 * and a campaign finished ON the last day used to hit the week-limit game-over
 * before the ending screen could ever be routed to.
 */
function parkOnLastDay(state: GameState, atFinalBeat: boolean): GameState {
  const campaign = getCampaign('probation');
  const finale = campaign.chapters[campaign.chapters.length - 1];
  return {
    ...state,
    currentWeek: 12, // last week of the story mode's budget
    currentDay: 5, // last working day
    storyState: {
      ...state.storyState!,
      currentChapter: finale.id,
      currentBeatIndex: atFinalBeat ? finale.storyBeats.length - 1 : 0,
      completedChapters: campaign.chapters.slice(0, -1).map((c) => c.id),
    },
  };
}

describe('useGame — story runs end with their story, not the calendar', () => {
  it('finishing the final chapter on the last day does NOT end the run as a game over', () => {
    const campaign = getCampaign('probation');
    const finale = campaign.chapters[campaign.chapters.length - 1];
    const lastBeat = finale.storyBeats[finale.storyBeats.length - 1];
    const event = campaign.storyEvents.find((e) => e.id === lastBeat.eventId)!;

    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('budget-seed', 'story', 'probation'));
    act(() => result.current.loadState(parkOnLastDay(result.current.state, true)));

    act(() => result.current.setEvent(event));
    act(() => result.current.makeChoice(event.choices[0]));
    expect(isAdventureModeComplete(result.current.state)).toBe(true);

    // The day advance crosses the week budget — previously this landed on
    // 'gameover' (reason 'probezeit_complete'), so the campaign's ending screen
    // was never reached. The run stays playable; App then routes to the ending.
    act(() => result.current.continueGame());

    expect(result.current.state.currentWeek).toBe(13);
    expect(result.current.phase).not.toBe('gameover');
    expect(result.current.gameOverReason).toBeNull();
    expect(isAdventureModeComplete(result.current.state)).toBe(true);
  });

  it('an UNFINISHED campaign keeps playing past the week budget instead of ending', () => {
    const campaign = getCampaign('probation');
    const finale = campaign.chapters[campaign.chapters.length - 1];
    const firstBeat = finale.storyBeats[0];
    const event = campaign.storyEvents.find((e) => e.id === firstBeat.eventId)!;

    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('budget-seed-2', 'story', 'probation'));
    act(() => result.current.loadState(parkOnLastDay(result.current.state, false)));

    act(() => result.current.setEvent(event));
    act(() => result.current.makeChoice(event.choices[0]));
    act(() => result.current.continueGame());

    // Mid-finale in week 13: the remaining beats must still be reachable.
    expect(isAdventureModeComplete(result.current.state)).toBe(false);
    expect(result.current.phase).toBe('playing');
    expect(result.current.gameOverReason).toBeNull();
  });

  it('a non-story run still ends on its week budget', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('int-seed', 'intermediate'));
    act(() => result.current.loadState({ ...result.current.state, currentWeek: 12, currentDay: 5 }));

    act(() => result.current.continueGame());

    expect(result.current.phase).toBe('gameover');
    expect(result.current.gameOverReason).toBe('probezeit_complete');
  });
});
