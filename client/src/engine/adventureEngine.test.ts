/**
 * Adventure Engine Tests
 * Verifies sidequest triggers, rewards, and story effects
 */

import { describe, it, expect } from 'vitest';
import {
  checkSidequestTrigger,
  getAvailableSidequests,
  advanceSidequest,
  isDialogueUnlocked,
  getUnlockedAbilities,
  hasAbility,
  getNpcBehaviorState,
  getSidequestRewards,
  findSidequestByEvent,
  advanceStoryBeat,
  getStoryProgress,
} from './adventureEngine';
import { GameState, createInitialAdventureState } from '@kritis/shared';

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 'test-seed',
    runNumber: 1,
    gameMode: 'adventure',
    currentWeek: 2,
    currentDay: 1,
    skills: {
      netzwerk: 30,
      linux: 30,
      windows: 30,
      security: 40,
      troubleshooting: 45,
      softSkills: 25,
    },
    stress: 20,
    budget: 15000,
    compliance: 50,
    relationships: {
      chef: 10,
      gf: 0,
      kaemmerer: 5,
      fachabteilung: 0,
      kollegen: 25,
    },
    flags: {},
    activeEvents: [],
    completedEvents: [],
    completedScenarios: [],
    unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
    terminalHistory: [],
    isAdventureMode: true,
    adventureState: createInitialAdventureState(),
    ...overrides,
  };
}

describe('Sidequest Triggers', () => {
  it('triggers sidequest when relationship threshold is met', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch02_settling_in',
      },
    });

    const available = getAvailableSidequests(state);
    const coffeeQuest = available.find(sq => sq.id === 'sq_coffee_machine');

    expect(coffeeQuest).toBeDefined();
    expect(coffeeQuest?.title).toBe('Der Kaffeemaschinenflüsterer');
  });

  it('does not trigger sidequest when relationship is too low', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 5 },
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch02_settling_in',
      },
    });

    const available = getAvailableSidequests(state);
    const coffeeQuest = available.find(sq => sq.id === 'sq_coffee_machine');

    expect(coffeeQuest).toBeUndefined();
  });

  it('triggers skill-based sidequest when skill threshold is met', () => {
    const state = createTestState({
      skills: { netzwerk: 40, linux: 45, windows: 30, security: 40, troubleshooting: 45, softSkills: 25 },
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch03_first_crisis',
      },
    });

    const available = getAvailableSidequests(state);
    const legacyQuest = available.find(sq => sq.id === 'sq_legacy_code');

    expect(legacyQuest).toBeDefined();
  });

  it('triggers flag-based sidequest when flag is set', () => {
    const state = createTestState({
      flags: { found_mysterious_note: true },
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch04_the_file',
      },
    });

    const available = getAvailableSidequests(state);
    const trailQuest = available.find(sq => sq.id === 'sq_predecessor_trail');

    expect(trailQuest).toBeDefined();
  });

  it('respects chapter bounds', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch01_first_day', // Too early for coffee quest
      },
    });

    const available = getAvailableSidequests(state);
    const coffeeQuest = available.find(sq => sq.id === 'sq_coffee_machine');

    expect(coffeeQuest).toBeUndefined();
  });
});

describe('Sidequest Progression', () => {
  it('advances sidequest progress', () => {
    const state = createTestState();
    const initialAdvState = state.adventureState!;

    const updatedAdvState = advanceSidequest(state, 'sq_coffee_machine');

    expect(updatedAdvState.activeSidequests).toContain('sq_coffee_machine');
    expect(updatedAdvState.sidequestProgress['sq_coffee_machine']).toBe(1);
  });

  it('completes sidequest after all events', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        activeSidequests: ['sq_coffee_machine'],
        sidequestProgress: { 'sq_coffee_machine': 2 }, // Already at event 3 (0-indexed: 2)
      },
    });

    const updatedAdvState = advanceSidequest(state, 'sq_coffee_machine');

    expect(updatedAdvState.completedSidequests).toContain('sq_coffee_machine');
    expect(updatedAdvState.activeSidequests).not.toContain('sq_coffee_machine');
  });

  it('does not add duplicate active sidequests', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        activeSidequests: ['sq_coffee_machine'],
        sidequestProgress: { 'sq_coffee_machine': 1 },
      },
    });

    const updatedAdvState = advanceSidequest(state, 'sq_coffee_machine');

    expect(updatedAdvState.activeSidequests.filter(id => id === 'sq_coffee_machine').length).toBe(1);
  });
});

describe('Sidequest Rewards', () => {
  it('returns correct rewards for sidequest', () => {
    const rewards = getSidequestRewards('sq_coffee_machine');

    expect(rewards).not.toBeNull();
    expect(rewards?.relationships).toHaveProperty('kollegen', 20);
    expect(rewards?.flags).toContain('coffee_hero');
  });

  it('returns null for non-existent sidequest', () => {
    const rewards = getSidequestRewards('nonexistent_quest');
    expect(rewards).toBeNull();
  });
});

describe('Dialogue Unlocks', () => {
  it('unlocks dialogue after completing sidequest', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        completedSidequests: ['sq_coffee_machine'],
      },
    });

    const isUnlocked = isDialogueUnlocked(state, 'adv_team_rally', 'coffee_speech');
    expect(isUnlocked).toBe(true);
  });

  it('does not unlock dialogue without completing sidequest', () => {
    const state = createTestState();

    const isUnlocked = isDialogueUnlocked(state, 'adv_team_rally', 'coffee_speech');
    expect(isUnlocked).toBe(false);
  });
});

describe('Granted Abilities', () => {
  it('grants ability after completing sidequest', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        completedSidequests: ['sq_coffee_machine'],
      },
    });

    expect(hasAbility(state, 'team_morale_boost')).toBe(true);
  });

  it('does not grant ability without completing sidequest', () => {
    const state = createTestState();

    expect(hasAbility(state, 'team_morale_boost')).toBe(false);
  });

  it('returns all unlocked abilities', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        completedSidequests: ['sq_coffee_machine', 'sq_basement_server'],
      },
    });

    const abilities = getUnlockedAbilities(state);
    expect(abilities).toContain('team_morale_boost');
    expect(abilities).toContain('secret_backup');
  });
});

describe('NPC Behavior Changes', () => {
  it('changes NPC behavior after completing sidequest', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        completedSidequests: ['sq_coffee_machine'],
      },
    });

    const npcState = getNpcBehaviorState(state, 'kollegen');
    expect(npcState).toBe('grateful');
  });

  it('returns null for unchanged NPC', () => {
    const state = createTestState();

    const npcState = getNpcBehaviorState(state, 'kollegen');
    expect(npcState).toBeNull();
  });
});

describe('Story Progression', () => {
  it('advances story beat within chapter', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch01_first_day',
        currentBeatIndex: 0,
      },
    });

    const updatedAdvState = advanceStoryBeat(state);

    expect(updatedAdvState.currentBeatIndex).toBe(1);
    expect(updatedAdvState.totalBeatsCompleted).toBe(1);
  });

  it('advances to next chapter when current chapter complete', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch01_first_day',
        currentBeatIndex: 3, // Last beat (0-indexed, ch01 has 4 beats)
      },
    });

    const updatedAdvState = advanceStoryBeat(state);

    expect(updatedAdvState.completedChapters).toContain('ch01_first_day');
    expect(updatedAdvState.currentChapter).toBe('ch02_settling_in');
    expect(updatedAdvState.currentBeatIndex).toBe(0);
  });

  it('tracks story progress correctly', () => {
    const state = createTestState({
      adventureState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch03_first_crisis',
        completedChapters: ['ch01_first_day', 'ch02_settling_in'],
      },
    });

    const progress = getStoryProgress(state);

    expect(progress.currentAct).toBe(1);
    expect(progress.chaptersCompleted).toBe(2);
    expect(progress.totalChapters).toBe(12);
    expect(progress.percentComplete).toBe(17); // 2/12 * 100 rounded
  });
});

describe('Sidequest Event Detection', () => {
  it('finds sidequest by event ID', () => {
    const sidequest = findSidequestByEvent('adv_sq_coffee_1');

    expect(sidequest).not.toBeNull();
    expect(sidequest?.id).toBe('sq_coffee_machine');
  });

  it('returns null for non-sidequest event', () => {
    const sidequest = findSidequestByEvent('adv_welcome');
    expect(sidequest).toBeNull();
  });
});
