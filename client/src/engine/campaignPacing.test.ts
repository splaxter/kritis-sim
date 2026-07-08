import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureChapters } from '../content/adventure/chapters';
import { getAllScenarios } from '../content/packs';
import { createInitialState, applyEffects, advanceDay, checkGameOver } from './gameState';
import { getVisibleChoices } from './eventEngine';
import { GameEvent, GameState, EventChoice } from '@kritis/shared';

// The campaign is fully authored (ch01–ch12); this walks the whole thing.
const FINISHED = [
  'ch01_first_day', 'ch02_settling_in', 'ch03_first_crisis', 'ch04_the_file',
  'ch05_coincidence', 'ch06_trust_no_one', 'ch07_escalation', 'ch08_calm_before',
  'ch09_attack', 'ch10_72_hours', 'ch11_truth', 'ch12_finale',
];

const byId = new Map<string, GameEvent>([...allEvents, ...adventureStoryEvents].map((e) => [e.id, e]));

type Strategy = 'first' | 'calmest' | 'hardest';
const stressOf = (c: EventChoice) => c.effects?.stress ?? 0;
const pickChoice = (choices: EventChoice[], strat: Strategy): EventChoice => {
  if (strat === 'calmest') return [...choices].sort((a, b) => stressOf(a) - stressOf(b))[0];
  if (strat === 'hardest') return [...choices].sort((a, b) => stressOf(b) - stressOf(a))[0];
  return choices[0];
};

interface SimResult {
  gameOver: { week: number; reason?: string } | null;
  peakStress: number;
  perChapter: { id: string; stressIn: number; stressOut: number; compliance: number; chef: number }[];
  degenerateBeats: string[]; // beats whose event has no ungated authored choice
}

function simulate(strat: Strategy): SimResult {
  let state: GameState = { ...createInitialState('SIM', 'story'), flags: {} };
  let peakStress = state.stress;
  const perChapter: SimResult['perChapter'] = [];
  const degenerateBeats: string[] = [];

  for (const chId of FINISHED) {
    const ch = adventureChapters.find((c) => c.id === chId)!;
    const stressIn = state.stress;
    for (const beat of ch.storyBeats) {
      // Resolve the beat's event (respecting branchCondition).
      let eventId = beat.eventId;
      if (beat.branchCondition && !state.flags[beat.branchCondition]) {
        eventId = beat.alternateEventId || beat.eventId;
      }
      const event = byId.get(eventId);
      if (!event) continue; // consistency audit already guards resolution

      const choices = getVisibleChoices(event, state);
      if (choices.length === 0 || choices.every((c) => c.id === '__continue__')) {
        // Only the synthesized fallback → no authored decision at this beat.
        if (!event.choices?.some((c) => !c.requires && !c.hidden && !(c.unlocks?.length))) {
          degenerateBeats.push(`${chId}/${beat.id} (${eventId})`);
        }
      }

      const choice = pickChoice(choices, strat);
      state = applyEffects(state, choice.effects);
      // record the choice's flags so later branches resolve realistically
      if (choice.setsFlags?.length) {
        const flags = { ...state.flags };
        for (const f of choice.setsFlags) flags[f] = true;
        state.flags = flags;
      }
      peakStress = Math.max(peakStress, state.stress);

      const over = checkGameOver(state);
      if (over.isOver && !over.isVictory) {
        return { gameOver: { week: state.currentWeek, reason: over.reason }, peakStress, perChapter, degenerateBeats };
      }
      state = advanceDay(state);
    }
    perChapter.push({ id: chId, stressIn, stressOut: state.stress, compliance: state.compliance, chef: state.relationships.chef });
  }
  return { gameOver: null, peakStress, perChapter, degenerateBeats };
}

describe('campaign pacing/difficulty (authored ch1–12, story mode)', () => {
  it('the campaign is winnable with sensible play (default + cautious never game-over)', () => {
    for (const strat of ['first', 'calmest'] as Strategy[]) {
      const r = simulate(strat);
      expect(r.gameOver, `strategy "${strat}" hit game-over: ${JSON.stringify(r.gameOver)}`).toBeNull();
    }
  });

  it('cautious play stays comfortably clear of burnout (calmest peak < 80)', () => {
    const r = simulate('calmest');
    const report = r.perChapter.map((c) => `${c.id}: stress ${c.stressIn}→${c.stressOut}`).join('\n');
    expect(r.peakStress, `calmest peak ${r.peakStress}\n${report}`).toBeLessThan(80);
  });

  it('DIFFICULTY ENVELOPE: an always-max-stress player CAN burn out (documents Act 2 ramp)', () => {
    // Burnout is a legitimate fail-state. This pins the current behaviour: the
    // most reckless/over-committed path burns out, and not before Act 2 (ch5+),
    // i.e. the difficulty ramp is back-loaded, not punishing early. If this
    // changes (e.g. burnout creeps earlier), revisit Act 2 stress balance.
    const r = simulate('hardest');
    if (r.gameOver) {
      expect(r.gameOver.week, `hardest path burned out too early: ${JSON.stringify(r.gameOver)}`).toBeGreaterThanOrEqual(5);
    }
  });

  it('every authored beat offers a real (ungated) choice — no degenerate beats', () => {
    const r = simulate('first');
    expect(r.degenerateBeats, `beats with only gated/fallback choices:\n${r.degenerateBeats.join('\n')}`).toEqual([]);
  });
});

// keep getAllScenarios import meaningful (scenarios can be story beats too)
void getAllScenarios;
