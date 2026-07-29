import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { getAllScenarios } from '../content/packs';
import { getCampaign, listCampaigns } from '../content/campaigns';
import { createInitialState, applyEffects, advanceDay, checkGameOver } from './gameState';
import { getVisibleChoices } from './eventEngine';
import {
  getNextStoryContent,
  advanceStoryBeat,
  advanceSidequest,
  findSidequestByEvent,
  isAdventureModeComplete,
  isAtAuthoredStoryEnd,
} from './adventureEngine';
import { CampaignId, GameEvent, GameState, EventChoice } from '@kritis/shared';

/**
 * Budget audit: can a campaign actually be PLAYED to its ending?
 *
 * Story mode serves exactly one content item per day (App.tsx's story branch),
 * and story beats share those day-slots with sidequest events. This walks that
 * day-loop with the real engine functions and asserts every campaign reaches its
 * ending — the regression that produced a live run with `outcome: victory` and no
 * ending at all: 12 weeks × 5 days = 60 slots against probation's 51 beats plus
 * 9–14 sidequest days, so the calendar ended the run mid-finale.
 *
 * Hands-on beats (every choice opens a terminal/GUI) resolve through
 * closeTerminal in the app; here the choice is applied and the beat advances,
 * which mirrors a SOLVED level — same simplification as campaignPacing.test.ts.
 *
 * Run with BUDGET_TRACE=1 to print the day/beat/sidequest totals per campaign —
 * the numbers to look at when authoring changes a campaign's length.
 */
type Strategy = 'first' | 'calmest' | 'hardest';

interface WalkResult {
  end: 'ending' | 'act-break' | 'gameover' | 'stuck';
  reason?: string;
  week: number;
  days: number;
  beats: number;
  sidequestEvents: number;
  chaptersCompleted: number;
  totalChapters: number;
}

const stressOf = (c: EventChoice) => c.effects?.stress ?? 0;

function pickChoice(choices: EventChoice[], strategy: Strategy): EventChoice {
  if (strategy === 'calmest') return [...choices].sort((a, b) => stressOf(a) - stressOf(b))[0];
  if (strategy === 'hardest') return [...choices].sort((a, b) => stressOf(b) - stressOf(a))[0];
  return choices[0];
}

function walk(campaignId: CampaignId, strategy: Strategy, seed = 'BUDGET'): WalkResult {
  const campaign = getCampaign(campaignId);
  const events = [...allEvents, ...campaign.storyEvents, ...campaign.sidequestEvents];
  const scenarios = getAllScenarios();
  let state: GameState = { ...createInitialState(seed, 'story', campaignId), flags: {} };

  let beats = 0;
  let sidequestEvents = 0;
  let days = 0;

  const snapshot = (end: WalkResult['end'], reason?: string): WalkResult => ({
    end,
    reason,
    week: state.currentWeek,
    days,
    beats,
    sidequestEvents,
    chaptersCompleted: state.storyState!.completedChapters.length,
    totalChapters: campaign.chapters.length,
  });

  // Generous guard: ~4× the longest campaign's day budget, so a real regression
  // reports as 'stuck' instead of hanging the suite.
  for (let guard = 0; guard < 400; guard++) {
    if (isAdventureModeComplete(state)) return snapshot('ending');
    if (isAtAuthoredStoryEnd(state, events, scenarios)) return snapshot('act-break');

    const next = getNextStoryContent(state, events, scenarios);
    if (!next.content) {
      // App's fallback: no content → skip the day.
      state = advanceDay(state);
      days++;
      const over = checkGameOver(state);
      if (over.isOver) return snapshot('gameover', over.reason);
      continue;
    }

    const event = next.content as GameEvent;
    const choice = pickChoice(getVisibleChoices(event, state), strategy);

    let after = applyEffects(state, choice.effects ?? {});
    if (choice.setsFlags) {
      after.flags = { ...after.flags };
      for (const flag of choice.setsFlags) after.flags[flag] = true;
    }
    after.completedEvents = [...state.completedEvents, event.id];

    // Mirrors applyStoryProgression in useGame: a sidequest event advances the
    // quest, anything else advances the story beat.
    const sidequest = findSidequestByEvent(event.id, campaignId);
    if (sidequest) {
      after = { ...after, storyState: advanceSidequest(state, sidequest.id) };
      sidequestEvents++;
    } else {
      after = { ...after, storyState: advanceStoryBeat(state) };
      beats++;
    }

    state = advanceDay(after);
    days++;
    const over = checkGameOver(state);
    if (over.isOver) return snapshot('gameover', over.reason);
  }
  return snapshot('stuck');
}

const STRATEGIES: Strategy[] = ['first', 'calmest', 'hardest'];

describe('campaign fits its day budget', () => {
  for (const campaign of listCampaigns()) {
    for (const strategy of STRATEGIES) {
      it(`${campaign.id} reaches its ending playing "${strategy}"`, () => {
        const r = walk(campaign.id, strategy);
        const detail =
          `${r.end}${r.reason ? `:${r.reason}` : ''} in Woche ${r.week} · ${r.days} Tage · ` +
          `${r.beats} Beats + ${r.sidequestEvents} Sidequest-Events · ` +
          `Kapitel ${r.chaptersCompleted}/${r.totalChapters}`;

        // The calendar must never cut a campaign short — that is the bug this
        // audit exists for.
        if (process.env.BUDGET_TRACE) console.log(`${campaign.id}/${strategy}: ${detail}`);
        expect(r.end, detail).toBe('ending');
        expect(r.chaptersCompleted, detail).toBe(r.totalChapters);
      });
    }
  }

  it('the week budget alone does NOT fit probation — the campaign length is what ends the run', () => {
    // Documents WHY the calendar rule was lifted for story mode: even the
    // best-paced line needs the full 60 slots, and rougher play needs more.
    const days = STRATEGIES.map((s) => walk('probation', s).days);
    expect(Math.max(...days)).toBeGreaterThan(60);
  });

  it('a story run can still FAIL — the other game-over rules keep working', () => {
    const state: GameState = {
      ...createInitialState('FAIL', 'story', 'probation'),
      currentWeek: 20, // past the lifted week limit
      stress: 100,
    };
    expect(checkGameOver(state)).toMatchObject({ reason: 'burnout', isOver: true });
  });

  it('a story run stays bounded if it somehow never ends', () => {
    // Backstop, not a normal path: twice the mode's week budget.
    const state: GameState = { ...createInitialState('LOOP', 'story', 'probation'), currentWeek: 25 };
    expect(checkGameOver(state)).toMatchObject({ isOver: true, reason: 'probezeit_complete' });
  });
});
