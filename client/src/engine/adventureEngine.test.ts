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
  getSidequestRewards,
  findSidequestByEvent,
  advanceStoryBeat,
  getStoryProgress,
  getNextStoryContent,
  pickSidequestToStart,
} from './adventureEngine';
import { GameEvent, GameState, SidequestDefinition, createInitialAdventureState, determineEnding } from '@kritis/shared';

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 'test-seed',
    runNumber: 1,
    gameMode: 'story',
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
    isStoryMode: true,
    storyState: createInitialAdventureState(),
    decisions: [],
    pendingChainEvents: [],
    ...overrides,
  };
}

describe('Sidequest Triggers', () => {
  it('triggers sidequest when relationship threshold is met', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      storyState: {
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
      storyState: {
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
      storyState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch03_first_crisis',
      },
    });

    const available = getAvailableSidequests(state);
    const networkQuest = available.find(sq => sq.id === 'sq_network_optimization');

    expect(networkQuest).toBeDefined();
  });

  it('triggers flag-based sidequest when flag is set', () => {
    const flagQuest: SidequestDefinition = {
      id: 'sq_test_flag',
      title: 't',
      description: 't',
      triggerCondition: { flags: ['some_flag'] },
      events: ['x'],
      rewards: {},
    };
    const stateWithFlag = createTestState({ flags: { some_flag: true } });

    expect(checkSidequestTrigger(flagQuest, stateWithFlag)).toBe(true);
  });

  it('respects chapter bounds', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      storyState: {
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
    const initialAdvState = state.storyState!;

    const updatedAdvState = advanceSidequest(state, 'sq_coffee_machine');

    expect(updatedAdvState.activeSidequests).toContain('sq_coffee_machine');
    expect(updatedAdvState.sidequestProgress['sq_coffee_machine']).toBe(1);
  });

  it('completes sidequest after all events', () => {
    const state = createTestState({
      storyState: {
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
      storyState: {
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
      storyState: {
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

describe('Story Progression', () => {
  it('advances story beat within chapter', () => {
    const state = createTestState({
      storyState: {
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
      storyState: {
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
      storyState: {
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

describe('Sidequest Serving', () => {
  const stubEvent = (id: string): GameEvent => ({
    id,
    title: id,
    category: 'story',
    weekRange: [1, 12],
    probability: 1,
    description: id,
    involvedCharacters: [],
    tags: [],
    choices: [],
  });

  it('serves the active sidequest event BEFORE the current story beat', () => {
    const state = createTestState({
      storyState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch03_first_crisis',
        currentBeatIndex: 0,
        activeSidequests: ['sq_haunted_printer'],
        sidequestProgress: { sq_haunted_printer: 1 },
      },
    });
    const events = [stubEvent('adv_printer_emergency'), stubEvent('adv_sq_printer_2')];
    const result = getNextStoryContent(state, events, []);
    expect(result.type).toBe('sidequest');
    expect((result.content as GameEvent).id).toBe('adv_sq_printer_2');
  });

  it('falls back to the story beat when no sidequest is active or startable', () => {
    const state = createTestState({
      relationships: { chef: 0, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 0 },
      skills: { netzwerk: 0, linux: 0, windows: 0, security: 0, troubleshooting: 0, softSkills: 0 },
      storyState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch01_first_day',
        currentBeatIndex: 0,
      },
    });
    const events = [stubEvent('adv_welcome')];
    expect(getNextStoryContent(state, events, []).type).toBe('story');
  });

  it('pickSidequestToStart is deterministic for a given state', () => {
    const state = createTestState({
      storyState: {
        ...createInitialAdventureState(),
        currentChapter: 'ch03_first_crisis',
        currentBeatIndex: 0,
      },
    });
    const a = pickSidequestToStart(state);
    const b = pickSidequestToStart(state);
    expect(a?.id).toBe(b?.id); // includes the both-null case
  });
});

describe('Ending Gate', () => {
  // Act 3 removed the sidequest hard-gate: the good ending is score-only
  // (>= 65), because the sidequest layer ships separately and the campaign must
  // resolve without it. Sidequests still contribute +10 each to the score.
  it('grants the good ending on score alone (no sidequests required)', () => {
    expect(determineEnding(75, 0, 'official')).toBe('good');
    expect(determineEnding(65, 0, 'official')).toBe('good');
  });
  it('falls to neutral / bad on lower scores regardless of sidequests', () => {
    expect(determineEnding(64, 3, 'official')).toBe('neutral');
    expect(determineEnding(34, 3, 'official')).toBe('bad');
  });
});
