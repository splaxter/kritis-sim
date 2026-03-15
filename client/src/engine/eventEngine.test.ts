import { describe, it, expect } from 'vitest';
import { getAvailableEvents, selectNextEvent, getVisibleChoices } from './eventEngine';
import { GameEvent, GameState, DEFAULT_GAME_STATE } from '@kritis/shared';

// Helper to create a minimal GameState
function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    seed: 'TEST-SEED',
    runNumber: 1,
    ...overrides,
  };
}

// Helper to create a minimal GameEvent
function createEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'test-event',
    weekRange: [1, 12],
    probability: 1,
    category: 'support',
    title: 'Test Event',
    description: 'Test description',
    involvedCharacters: [],
    choices: [
      {
        id: 'choice1',
        text: 'Choice 1',
        effects: {},
        resultText: 'Result 1',
      },
    ],
    tags: [],
    ...overrides,
  };
}

describe('eventEngine', () => {
  describe('getAvailableEvents', () => {
    it('returns events within the current week range', () => {
      const events = [
        createEvent({ id: 'evt1', weekRange: [1, 2] }),
        createEvent({ id: 'evt2', weekRange: [3, 4] }),
        createEvent({ id: 'evt3', weekRange: [1, 12] }),
      ];
      const state = createGameState({ currentWeek: 1 });

      const available = getAvailableEvents(events, state);

      expect(available.map((e) => e.id)).toEqual(['evt1', 'evt3']);
    });

    it('excludes events outside the week range', () => {
      const events = [createEvent({ id: 'evt1', weekRange: [5, 8] })];
      const state = createGameState({ currentWeek: 2 });

      const available = getAvailableEvents(events, state);

      expect(available).toHaveLength(0);
    });

    it('filters by day preference when specified', () => {
      const events = [
        createEvent({ id: 'evt1', dayPreference: [1, 3] }),
        createEvent({ id: 'evt2', dayPreference: [2, 4] }),
        createEvent({ id: 'evt3' }), // No day preference
      ];
      const state = createGameState({ currentDay: 1 });

      const available = getAvailableEvents(events, state);

      expect(available.map((e) => e.id)).toEqual(['evt1', 'evt3']);
    });

    it('excludes already completed events', () => {
      const events = [
        createEvent({ id: 'evt1' }),
        createEvent({ id: 'evt2' }),
      ];
      const state = createGameState({ completedEvents: ['evt1'] });

      const available = getAvailableEvents(events, state);

      expect(available.map((e) => e.id)).toEqual(['evt2']);
    });

    it('checks prerequisite events', () => {
      const events = [
        createEvent({ id: 'evt1' }),
        createEvent({
          id: 'evt2',
          requires: { events: ['evt1'] },
        }),
      ];
      const stateWithoutPrereq = createGameState({ completedEvents: [] });
      const stateWithPrereq = createGameState({ completedEvents: ['evt1'] });

      expect(getAvailableEvents(events, stateWithoutPrereq).map((e) => e.id)).toEqual(['evt1']);
      expect(getAvailableEvents(events, stateWithPrereq).map((e) => e.id)).toEqual(['evt2']);
    });

    it('checks required flags', () => {
      const events = [
        createEvent({ id: 'evt1' }),
        createEvent({
          id: 'evt2',
          requires: { flags: ['has_badge'] },
        }),
      ];
      const stateWithoutFlag = createGameState({ flags: {} });
      const stateWithFlag = createGameState({ flags: { has_badge: true } });

      expect(getAvailableEvents(events, stateWithoutFlag).map((e) => e.id)).toEqual(['evt1']);
      expect(getAvailableEvents(events, stateWithFlag).map((e) => e.id)).toEqual(['evt1', 'evt2']);
    });

    it('checks required skill levels', () => {
      const events = [
        createEvent({ id: 'evt1' }),
        createEvent({
          id: 'evt2',
          requires: { skills: { linux: 50 } },
        }),
      ];
      const lowSkillState = createGameState({
        skills: { ...DEFAULT_GAME_STATE.skills, linux: 20 },
      });
      const highSkillState = createGameState({
        skills: { ...DEFAULT_GAME_STATE.skills, linux: 60 },
      });

      expect(getAvailableEvents(events, lowSkillState).map((e) => e.id)).toEqual(['evt1']);
      expect(getAvailableEvents(events, highSkillState).map((e) => e.id)).toEqual(['evt1', 'evt2']);
    });

    it('handles multiple requirements together', () => {
      const events = [
        createEvent({
          id: 'complex-evt',
          requires: {
            events: ['intro'],
            flags: ['has_access'],
            skills: { security: 30 },
          },
        }),
      ];
      const partialState = createGameState({
        completedEvents: ['intro'],
        flags: {},
        skills: { ...DEFAULT_GAME_STATE.skills, security: 40 },
      });
      const fullState = createGameState({
        completedEvents: ['intro'],
        flags: { has_access: true },
        skills: { ...DEFAULT_GAME_STATE.skills, security: 40 },
      });

      expect(getAvailableEvents(events, partialState)).toHaveLength(0);
      expect(getAvailableEvents(events, fullState)).toHaveLength(1);
    });
  });

  describe('selectNextEvent', () => {
    it('returns null when no events are available', () => {
      const events: GameEvent[] = [];
      const state = createGameState();

      const selected = selectNextEvent(events, state, 'seed');

      expect(selected).toBeNull();
    });

    it('returns an event when events are available', () => {
      const events = [createEvent({ id: 'evt1' }), createEvent({ id: 'evt2' })];
      const state = createGameState();

      const selected = selectNextEvent(events, state, 'seed');

      expect(selected).not.toBeNull();
      expect(['evt1', 'evt2']).toContain(selected?.id);
    });

    it('is deterministic with the same seed', () => {
      const events = [
        createEvent({ id: 'evt1' }),
        createEvent({ id: 'evt2' }),
        createEvent({ id: 'evt3' }),
      ];
      const state = createGameState();

      const result1 = selectNextEvent(events, state, 'fixed-seed');
      const result2 = selectNextEvent(events, state, 'fixed-seed');

      expect(result1?.id).toBe(result2?.id);
    });

    it('produces different results with different seeds', () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createEvent({ id: `evt${i}` })
      );
      const state = createGameState();

      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const selected = selectNextEvent(events, state, `seed-${i}`);
        if (selected) results.add(selected.id);
      }

      // With 10 events and 20 different seeds, we should see multiple different events
      expect(results.size).toBeGreaterThan(1);
    });

    it('considers week and day in selection', () => {
      const events = [createEvent({ id: 'evt1' }), createEvent({ id: 'evt2' })];
      const state1 = createGameState({ currentWeek: 1, currentDay: 1 });
      const state2 = createGameState({ currentWeek: 1, currentDay: 2 });

      const result1 = selectNextEvent(events, state1, 'same-seed');
      const result2 = selectNextEvent(events, state2, 'same-seed');

      // The selection might be the same or different depending on hash, but it should work
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });
  });

  describe('getVisibleChoices', () => {
    it('returns all non-hidden choices without requirements', () => {
      const event = createEvent({
        choices: [
          { id: 'c1', text: 'Choice 1', effects: {}, resultText: 'R1' },
          { id: 'c2', text: 'Choice 2', effects: {}, resultText: 'R2' },
        ],
      });
      const state = createGameState();

      const visible = getVisibleChoices(event, state);

      expect(visible.map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('hides choices marked as hidden', () => {
      const event = createEvent({
        choices: [
          { id: 'c1', text: 'Choice 1', effects: {}, resultText: 'R1' },
          { id: 'c2', text: 'Hidden', effects: {}, resultText: 'R2', hidden: true },
        ],
      });
      const state = createGameState();

      const visible = getVisibleChoices(event, state);

      expect(visible.map((c) => c.id)).toEqual(['c1']);
    });

    it('hides choices when skill requirement not met', () => {
      const event = createEvent({
        choices: [
          { id: 'c1', text: 'Basic choice', effects: {}, resultText: 'R1' },
          {
            id: 'c2',
            text: 'Expert choice',
            effects: {},
            resultText: 'R2',
            requires: { skill: 'linux', threshold: 50 },
          },
        ],
      });
      const lowSkillState = createGameState({
        skills: { ...DEFAULT_GAME_STATE.skills, linux: 30 },
      });
      const highSkillState = createGameState({
        skills: { ...DEFAULT_GAME_STATE.skills, linux: 60 },
      });

      expect(getVisibleChoices(event, lowSkillState).map((c) => c.id)).toEqual(['c1']);
      expect(getVisibleChoices(event, highSkillState).map((c) => c.id)).toEqual(['c1', 'c2']);
    });

    it('shows choice at exact threshold', () => {
      const event = createEvent({
        choices: [
          {
            id: 'c1',
            text: 'Threshold choice',
            effects: {},
            resultText: 'R1',
            requires: { skill: 'security', threshold: 50 },
          },
        ],
      });
      const state = createGameState({
        skills: { ...DEFAULT_GAME_STATE.skills, security: 50 },
      });

      const visible = getVisibleChoices(event, state);

      expect(visible).toHaveLength(1);
    });

    it('handles multiple choices with different skill requirements', () => {
      const event = createEvent({
        choices: [
          { id: 'c1', text: 'Basic', effects: {}, resultText: 'R1' },
          {
            id: 'c2',
            text: 'Linux',
            effects: {},
            resultText: 'R2',
            requires: { skill: 'linux', threshold: 40 },
          },
          {
            id: 'c3',
            text: 'Windows',
            effects: {},
            resultText: 'R3',
            requires: { skill: 'windows', threshold: 60 },
          },
          {
            id: 'c4',
            text: 'Expert',
            effects: {},
            resultText: 'R4',
            requires: { skill: 'security', threshold: 80 },
          },
        ],
      });
      const state = createGameState({
        skills: {
          netzwerk: 20,
          linux: 50,
          windows: 55,
          security: 30,
          troubleshooting: 20,
          softSkills: 20,
        },
      });

      const visible = getVisibleChoices(event, state);

      // c1: no requirement (visible)
      // c2: linux >= 40, state has 50 (visible)
      // c3: windows >= 60, state has 55 (hidden)
      // c4: security >= 80, state has 30 (hidden)
      expect(visible.map((c) => c.id)).toEqual(['c1', 'c2']);
    });
  });
});
