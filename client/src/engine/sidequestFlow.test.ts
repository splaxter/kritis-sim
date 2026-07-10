/**
 * End-to-end sidequest flow — proves the whole chain with the REAL content and
 * REAL engine functions (no stubs): trigger → serve every event in order →
 * complete → apply rewards → unlock the hidden payoff dialogue in the main story.
 */
import { describe, it, expect } from 'vitest';
import {
  getAvailableSidequests,
  getNextStoryContent,
  advanceSidequest,
  getSidequestRewards,
  isDialogueUnlocked,
  pickSidequestToStart,
} from './adventureEngine';
import { getVisibleChoices } from './eventEngine';
import { getSidequestById } from '../content/adventure/sidequests';
import { allEvents } from '../content/events';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureSidequestEvents } from '../content/adventure/sidequest-events';
import { GameEvent, GameState, createInitialAdventureState } from '@kritis/shared';

const combined: GameEvent[] = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];
const findEvent = (id: string) => combined.find((e) => e.id === id)!;

function baseState(chapter: string): GameState {
  return {
    seed: 'test-seed',
    runNumber: 1,
    gameMode: 'story',
    currentWeek: 3,
    currentDay: 1,
    skills: { netzwerk: 0, linux: 0, windows: 0, security: 0, troubleshooting: 0, softSkills: 0 },
    stress: 20,
    budget: 15000,
    compliance: 50,
    relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 0 },
    flags: {},
    activeEvents: [],
    completedEvents: [],
    completedScenarios: [],
    unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
    terminalHistory: [],
    isStoryMode: true,
    storyState: { ...createInitialAdventureState(), currentChapter: chapter },
    decisions: [],
    pendingChainEvents: [],
  };
}

describe.each([
  {
    quest: 'sq_haunted_printer',
    chapter: 'ch03_first_crisis',
    setup: (s: GameState) => s, // no stat gate
    payoff: { eventId: 'adv_pattern_recognition', optionId: 'printer_connection' },
  },
  {
    quest: 'sq_network_optimization',
    chapter: 'ch02_settling_in',
    setup: (s: GameState) => ({ ...s, skills: { ...s.skills, netzwerk: 35 } }),
    payoff: { eventId: 'adv_security_lockdown', optionId: 'segment_network' },
  },
  {
    quest: 'sq_coffee_machine',
    chapter: 'ch02_settling_in',
    setup: (s: GameState) => ({ ...s, relationships: { ...s.relationships, kollegen: 10 } }),
    payoff: { eventId: 'adv_team_rally', optionId: 'coffee_speech' },
  },
  {
    quest: 'sq_legacy_code',
    chapter: 'ch03_first_crisis',
    setup: (s: GameState) => ({ ...s, skills: { ...s.skills, linux: 40 } }),
    payoff: { eventId: 'adv_initial_response', optionId: 'use_legacy_knowledge' },
  },
  {
    quest: 'sq_predecessor_trail',
    chapter: 'ch04_the_file',
    setup: (s: GameState) => ({ ...s, flags: { ...s.flags, found_mysterious_note: true } }),
    payoff: { eventId: 'adv_predecessor_truth', optionId: 'show_evidence' },
  },
  {
    quest: 'sq_external_contact',
    chapter: 'ch05_coincidence',
    setup: (s: GameState) => ({ ...s, flags: { ...s.flags, started_investigation: true } }),
    payoff: { eventId: 'adv_attacker_identity', optionId: 'reveal_source' },
  },
])('sidequest end-to-end: $quest', ({ quest, chapter, setup, payoff }) => {
  it('triggers, serves every event in order, applies rewards, unlocks the payoff dialogue', () => {
    const def = getSidequestById(quest)!;
    expect(def).toBeDefined();

    // 1. TRIGGER
    let state = setup(baseState(chapter));
    const available = getAvailableSidequests(state);
    expect(available.map((sq) => sq.id)).toContain(quest);

    // 2. SERVE every event in order
    state = {
      ...state,
      storyState: {
        ...state.storyState!,
        activeSidequests: [quest],
        sidequestProgress: { [quest]: 0 },
      },
    };
    for (let i = 0; i < def.events.length; i++) {
      const result = getNextStoryContent(state, combined, []);
      expect(result.type).toBe('sidequest');
      expect((result.content as GameEvent).id).toBe(def.events[i]);
      // Player resolves this sidequest event → progress advances.
      state = { ...state, storyState: advanceSidequest(state, quest) };
    }

    // 3. COMPLETE + REWARD
    expect(state.storyState!.completedSidequests).toContain(quest);
    expect(state.storyState!.activeSidequests).not.toContain(quest);

    const rewards = getSidequestRewards(quest)!;
    expect(rewards.flags).toEqual(def.rewards.flags ?? []);
    expect(rewards.skills).toEqual(def.rewards.skills ?? {});
    expect(rewards.relationships).toEqual(def.rewards.relationships ?? {});

    // 4. PAYOFF: hidden dialogue is now unlocked and visible in the main story event.
    expect(isDialogueUnlocked(state, payoff.eventId, payoff.optionId)).toBe(true);
    const payoffEvent = findEvent(payoff.eventId);
    const visibleIds = getVisibleChoices(payoffEvent, state).map((c) => c.id);
    expect(visibleIds).toContain(payoff.optionId);

    // 5. NEGATIVE: without completing the quest, the hidden choice stays hidden.
    const fresh = baseState(chapter);
    const freshVisibleIds = getVisibleChoices(payoffEvent, fresh).map((c) => c.id);
    expect(freshVisibleIds).not.toContain(payoff.optionId);
  });
});

describe('sidequest discovery', () => {
  it('guarantees an eligible sidequest is discoverable without a lottery miss', () => {
    const state = {
      ...baseState('ch03_first_crisis'),
      currentDay: 2,
    };

    expect(getAvailableSidequests(state).length).toBeGreaterThan(0);
    expect(pickSidequestToStart(state)).not.toBeNull();
  });
});
