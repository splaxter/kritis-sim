import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createInitialState,
  generateSeed,
  applyEffects,
  advanceDay,
  checkGameOver,
} from './gameState';
import { GameState, DEFAULT_GAME_STATE, EventEffects } from '@kritis/shared';

// Helper to create a test GameState
// Uses intermediate mode for consistent 1.0x effect multiplier in tests
function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    seed: 'TEST-SEED',
    runNumber: 1,
    gameMode: 'intermediate',  // Use intermediate for 1.0x effects in tests
    ...overrides,
  };
}

describe('gameState', () => {
  describe('generateSeed', () => {
    it('generates a seed starting with KRITIS-', () => {
      const seed = generateSeed();
      expect(seed).toMatch(/^KRITIS-[A-Z0-9]+$/);
    });

    it('generates unique seeds when timestamps differ', () => {
      // Mock Date.now to return different values
      const originalNow = Date.now;
      let counter = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => 1700000000000 + counter++);

      const seeds = new Set<string>();
      for (let i = 0; i < 10; i++) {
        seeds.add(generateSeed());
      }
      // All seeds should be unique when timestamps differ
      expect(seeds.size).toBe(10);

      vi.restoreAllMocks();
    });
  });

  describe('createInitialState', () => {
    it('creates state with default beginner mode values', () => {
      const state = createInitialState();

      expect(state.currentWeek).toBe(1);
      expect(state.currentDay).toBe(1);
      expect(state.stress).toBe(15);
      expect(state.budget).toBe(20000);
      expect(state.compliance).toBe(60);
      expect(state.runNumber).toBe(1);
      expect(state.gameMode).toBe('beginner');
      expect(state.mentorModeEnabled).toBe(true);
    });

    it('creates state with provided seed', () => {
      const state = createInitialState('CUSTOM-SEED-123');

      expect(state.seed).toBe('CUSTOM-SEED-123');
    });

    it('generates seed when not provided', () => {
      const state = createInitialState();

      expect(state.seed).toMatch(/^KRITIS-[A-Z0-9]+$/);
    });

    it('initializes skills at mode-specific levels', () => {
      const state = createInitialState(undefined, 'intermediate');

      expect(state.skills.netzwerk).toBe(20);
      expect(state.skills.linux).toBe(20);
      expect(state.skills.windows).toBe(20);
      expect(state.skills.security).toBe(20);
      expect(state.skills.troubleshooting).toBe(20);
      expect(state.skills.softSkills).toBe(20);
    });

    it('initializes relationships at mode-specific levels', () => {
      const state = createInitialState(undefined, 'intermediate');

      expect(state.relationships.chef).toBe(0);
      expect(state.relationships.gf).toBe(0);
      expect(state.relationships.kaemmerer).toBe(-10);
      expect(state.relationships.fachabteilung).toBe(0);
      expect(state.relationships.kollegen).toBe(10);
    });

    it('initializes empty event arrays', () => {
      const state = createInitialState();

      expect(state.activeEvents).toEqual([]);
      expect(state.completedEvents).toEqual([]);
    });

    it('initializes with default unlocked commands', () => {
      const state = createInitialState();

      expect(state.unlockedCommands).toContain('help');
      expect(state.unlockedCommands).toContain('ls');
      expect(state.unlockedCommands).toContain('cd');
      expect(state.unlockedCommands).toContain('pwd');
    });

    it('creates beginner mode with easier starting values', () => {
      const state = createInitialState(undefined, 'beginner');

      expect(state.gameMode).toBe('beginner');
      expect(state.skills.netzwerk).toBe(30);
      expect(state.stress).toBe(15);
      expect(state.budget).toBe(20000);
      expect(state.compliance).toBe(60);
      expect(state.relationships.chef).toBe(10);
    });

    it('creates hard mode with harder starting values', () => {
      const state = createInitialState(undefined, 'hard');

      expect(state.gameMode).toBe('hard');
      expect(state.skills.netzwerk).toBe(15);
      expect(state.stress).toBe(30);
      expect(state.budget).toBe(12000);
      expect(state.compliance).toBe(40);
    });

    it('creates arcade mode with arcade-specific fields', () => {
      const state = createInitialState(undefined, 'arcade');

      expect(state.gameMode).toBe('arcade');
      expect(state.arcadeScore).toBe(0);
      expect(state.comboMultiplier).toBe(1);
      expect(state.comboStreak).toBe(0);
    });

    it('creates kritis mode with 24 week configuration', () => {
      const state = createInitialState(undefined, 'kritis');

      expect(state.gameMode).toBe('kritis');
      expect(state.stress).toBe(25);
      expect(state.budget).toBe(10000);
      expect(state.compliance).toBe(45);
      expect(state.flags.kritis_mode).toBe(true);
    });

    it('creates learning mode with mentor mode forced on', () => {
      const state = createInitialState(undefined, 'learning');

      expect(state.gameMode).toBe('learning');
      expect(state.mentorModeEnabled).toBe(true);
      expect(state.skills.netzwerk).toBe(25);
      expect(state.stress).toBe(20);
      expect(state.budget).toBe(15000);
      expect(state.compliance).toBe(50);
    });

    it('enables mentor mode for beginner, disables for arcade', () => {
      const beginnerState = createInitialState(undefined, 'beginner');
      const arcadeState = createInitialState(undefined, 'arcade');

      expect(beginnerState.mentorModeEnabled).toBe(true);
      expect(arcadeState.mentorModeEnabled).toBe(false);
    });
  });

  describe('applyEffects', () => {
    describe('skills', () => {
      it('increases skills', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, linux: 30 },
        });
        const effects: EventEffects = {
          skills: { linux: 10 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.linux).toBe(40);
      });

      it('decreases skills', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, security: 50 },
        });
        const effects: EventEffects = {
          skills: { security: -20 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.security).toBe(30);
      });

      it('clamps skills at 0 minimum', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, windows: 10 },
        });
        const effects: EventEffects = {
          skills: { windows: -50 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.windows).toBe(0);
      });

      it('clamps skills at 100 maximum', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, netzwerk: 90 },
        });
        const effects: EventEffects = {
          skills: { netzwerk: 20 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.netzwerk).toBe(100);
      });

      it('modifies multiple skills at once', () => {
        const state = createGameState({
          skills: {
            netzwerk: 30,
            linux: 40,
            windows: 50,
            security: 60,
            troubleshooting: 70,
            softSkills: 80,
          },
        });
        const effects: EventEffects = {
          skills: {
            linux: 10,
            security: -15,
            troubleshooting: 5,
          },
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.linux).toBe(50);
        expect(newState.skills.security).toBe(45);
        expect(newState.skills.troubleshooting).toBe(75);
        // Unchanged skills
        expect(newState.skills.netzwerk).toBe(30);
        expect(newState.skills.windows).toBe(50);
        expect(newState.skills.softSkills).toBe(80);
      });

      it('does not mutate original state', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, linux: 30 },
        });
        const effects: EventEffects = { skills: { linux: 10 } };

        applyEffects(state, effects);

        expect(state.skills.linux).toBe(30);
      });
    });

    describe('relationships', () => {
      it('increases relationships', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 0 },
        });
        const effects: EventEffects = {
          relationships: { chef: 15 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.relationships.chef).toBe(15);
      });

      it('decreases relationships', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, kollegen: 20 },
        });
        const effects: EventEffects = {
          relationships: { kollegen: -30 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.relationships.kollegen).toBe(-10);
      });

      it('clamps relationships at -100 minimum', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, gf: -80 },
        });
        const effects: EventEffects = {
          relationships: { gf: -50 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.relationships.gf).toBe(-100);
      });

      it('clamps relationships at 100 maximum', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, fachabteilung: 80 },
        });
        const effects: EventEffects = {
          relationships: { fachabteilung: 50 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.relationships.fachabteilung).toBe(100);
      });

      it('handles negative relationship values correctly', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, kaemmerer: -50 },
        });
        const effects: EventEffects = {
          relationships: { kaemmerer: 30 },
        };

        const newState = applyEffects(state, effects);

        expect(newState.relationships.kaemmerer).toBe(-20);
      });
    });

    describe('stress', () => {
      it('increases stress', () => {
        const state = createGameState({ stress: 30 });
        const effects: EventEffects = { stress: 15 };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(45);
      });

      it('decreases stress', () => {
        const state = createGameState({ stress: 50 });
        const effects: EventEffects = { stress: -20 };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(30);
      });

      it('clamps stress at 0 minimum', () => {
        const state = createGameState({ stress: 10 });
        const effects: EventEffects = { stress: -50 };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(0);
      });

      it('clamps stress at 100 maximum', () => {
        const state = createGameState({ stress: 90 });
        const effects: EventEffects = { stress: 20 };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(100);
      });
    });

    describe('budget', () => {
      it('increases budget', () => {
        const state = createGameState({ budget: 10000 });
        const effects: EventEffects = { budget: 5000 };

        const newState = applyEffects(state, effects);

        expect(newState.budget).toBe(15000);
      });

      it('decreases budget', () => {
        const state = createGameState({ budget: 10000 });
        const effects: EventEffects = { budget: -3000 };

        const newState = applyEffects(state, effects);

        expect(newState.budget).toBe(7000);
      });

      it('clamps budget at 0 minimum', () => {
        const state = createGameState({ budget: 5000 });
        const effects: EventEffects = { budget: -10000 };

        const newState = applyEffects(state, effects);

        expect(newState.budget).toBe(0);
      });

      it('has no upper limit for budget', () => {
        const state = createGameState({ budget: 100000 });
        const effects: EventEffects = { budget: 500000 };

        const newState = applyEffects(state, effects);

        expect(newState.budget).toBe(600000);
      });
    });

    describe('compliance', () => {
      it('increases compliance', () => {
        const state = createGameState({ compliance: 50 });
        const effects: EventEffects = { compliance: 10 };

        const newState = applyEffects(state, effects);

        expect(newState.compliance).toBe(60);
      });

      it('decreases compliance', () => {
        const state = createGameState({ compliance: 50 });
        const effects: EventEffects = { compliance: -20 };

        const newState = applyEffects(state, effects);

        expect(newState.compliance).toBe(30);
      });

      it('clamps compliance at 0 minimum', () => {
        const state = createGameState({ compliance: 10 });
        const effects: EventEffects = { compliance: -50 };

        const newState = applyEffects(state, effects);

        expect(newState.compliance).toBe(0);
      });

      it('clamps compliance at 100 maximum', () => {
        const state = createGameState({ compliance: 90 });
        const effects: EventEffects = { compliance: 20 };

        const newState = applyEffects(state, effects);

        expect(newState.compliance).toBe(100);
      });
    });

    describe('combined effects', () => {
      it('applies all effect types together', () => {
        const state = createGameState({
          skills: { ...DEFAULT_GAME_STATE.skills, linux: 40 },
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 10 },
          stress: 30,
          budget: 10000,
          compliance: 50,
        });
        const effects: EventEffects = {
          skills: { linux: 5, security: 3 },
          relationships: { chef: -10 },
          stress: 10,
          budget: -2000,
          compliance: -5,
        };

        const newState = applyEffects(state, effects);

        expect(newState.skills.linux).toBe(45);
        expect(newState.skills.security).toBe(23);
        expect(newState.relationships.chef).toBe(0);
        expect(newState.stress).toBe(40);
        expect(newState.budget).toBe(8000);
        expect(newState.compliance).toBe(45);
      });

      it('handles empty effects', () => {
        const state = createGameState();
        const effects: EventEffects = {};

        const newState = applyEffects(state, effects);

        expect(newState).toEqual(state);
      });
    });

    describe('mode-based effect multiplier', () => {
      it('applies 1.5x multiplier in hard mode for negative effects', () => {
        const state = createGameState({
          gameMode: 'hard',
          stress: 30,
          compliance: 50,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 20 },
        });
        const effects: EventEffects = {
          stress: 10,      // Should become 15 (10 * 1.5)
          compliance: -10, // Should become -15 (10 * 1.5)
          relationships: { chef: -10 }, // Should become -15
        };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(45); // 30 + 15
        expect(newState.compliance).toBe(35); // 50 - 15
        expect(newState.relationships.chef).toBe(5); // 20 - 15
      });

      it('applies 0.7x multiplier in beginner mode for negative effects', () => {
        const state = createGameState({
          gameMode: 'beginner',
          stress: 30,
          compliance: 50,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 20 },
        });
        const effects: EventEffects = {
          stress: 10,      // Should become 7 (10 * 0.7)
          compliance: -10, // Should become -7
          relationships: { chef: -10 }, // Should become -7
        };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(37); // 30 + 7
        expect(newState.compliance).toBe(43); // 50 - 7
        expect(newState.relationships.chef).toBe(13); // 20 - 7
      });

      it('does not apply multiplier to positive effects', () => {
        const state = createGameState({
          gameMode: 'hard',
          stress: 30,
          compliance: 50,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 10 },
        });
        const effects: EventEffects = {
          stress: -10,     // Should stay -10 (stress decrease is good)
          compliance: 10,  // Should stay +10 (compliance increase is good)
          relationships: { chef: 10 }, // Should stay +10
        };

        const newState = applyEffects(state, effects);

        expect(newState.stress).toBe(20); // 30 - 10
        expect(newState.compliance).toBe(60); // 50 + 10
        expect(newState.relationships.chef).toBe(20); // 10 + 10
      });
    });
  });

  describe('advanceDay', () => {
    it('increments day within the same week', () => {
      const state = createGameState({ currentWeek: 1, currentDay: 1 });

      const newState = advanceDay(state);

      expect(newState.currentDay).toBe(2);
      expect(newState.currentWeek).toBe(1);
    });

    it('advances day from 1 to 5', () => {
      let state = createGameState({ currentWeek: 1, currentDay: 1 });

      for (let expectedDay = 2; expectedDay <= 5; expectedDay++) {
        state = advanceDay(state);
        expect(state.currentDay).toBe(expectedDay);
        expect(state.currentWeek).toBe(1);
      }
    });

    it('wraps to next week after day 5', () => {
      const state = createGameState({ currentWeek: 1, currentDay: 5 });

      const newState = advanceDay(state);

      expect(newState.currentDay).toBe(1);
      expect(newState.currentWeek).toBe(2);
    });

    it('handles week progression correctly', () => {
      const state = createGameState({ currentWeek: 12, currentDay: 5 });

      const newState = advanceDay(state);

      expect(newState.currentDay).toBe(1);
      expect(newState.currentWeek).toBe(13);
    });

    it('does not mutate original state', () => {
      const state = createGameState({ currentWeek: 1, currentDay: 3 });

      advanceDay(state);

      expect(state.currentDay).toBe(3);
      expect(state.currentWeek).toBe(1);
    });

    it('preserves other state properties', () => {
      const state = createGameState({
        currentWeek: 2,
        currentDay: 4,
        stress: 50,
        budget: 8000,
        completedEvents: ['evt1', 'evt2'],
      });

      const newState = advanceDay(state);

      expect(newState.stress).toBe(50);
      expect(newState.budget).toBe(8000);
      expect(newState.completedEvents).toEqual(['evt1', 'evt2']);
    });
  });

  describe('checkGameOver', () => {
    it('returns not over for normal state', () => {
      const state = createGameState({
        stress: 50,
        relationships: { ...DEFAULT_GAME_STATE.relationships, chef: 0 },
        compliance: 50,
        currentWeek: 6,
      });

      const result = checkGameOver(state);

      expect(result.isOver).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    describe('burnout', () => {
      it('triggers at stress 100 (intermediate mode)', () => {
        const state = createGameState({ stress: 100 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('burnout');
        expect(result.isVictory).toBe(false);
      });

      it('triggers at stress 90 (hard mode)', () => {
        const state = createGameState({ stress: 90, gameMode: 'hard' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('burnout');
      });

      it('does not trigger at stress 89 in hard mode', () => {
        const state = createGameState({ stress: 89, gameMode: 'hard' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });

      it('does not trigger at stress 99', () => {
        const state = createGameState({ stress: 99 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });
    });

    describe('fired', () => {
      it('triggers at chef relationship -100 (intermediate mode)', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -100 },
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('fired');
        expect(result.isVictory).toBe(false);
      });

      it('triggers at chef relationship -80 (hard mode)', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -80 },
          gameMode: 'hard',
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('fired');
      });

      it('does not trigger at chef relationship -99', () => {
        const state = createGameState({
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -99 },
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });
    });

    describe('compliance violation', () => {
      it('triggers at compliance 0 (intermediate mode)', () => {
        const state = createGameState({ compliance: 0 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('bsi_bussgeld');
        expect(result.isVictory).toBe(false);
      });

      it('triggers at compliance 10 (hard mode)', () => {
        const state = createGameState({ compliance: 10, gameMode: 'hard' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('bsi_bussgeld');
      });

      it('does not trigger at compliance 1', () => {
        const state = createGameState({ compliance: 1 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });
    });

    describe('probezeit complete (win)', () => {
      it('triggers after week 12 (intermediate mode)', () => {
        const state = createGameState({ currentWeek: 13, gameMode: 'intermediate' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('probezeit_complete');
        expect(result.isVictory).toBe(true);
      });

      it('triggers after week 24 (kritis mode)', () => {
        const state = createGameState({ currentWeek: 25, gameMode: 'kritis' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('probezeit_complete');
        expect(result.isVictory).toBe(true);
      });

      it('triggers after week 8 (arcade mode)', () => {
        const state = createGameState({ currentWeek: 9, gameMode: 'arcade' });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('probezeit_complete');
        expect(result.isVictory).toBe(true);
      });

      it('does not trigger at week 12', () => {
        const state = createGameState({ currentWeek: 12 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });

      it('does not trigger at week 1', () => {
        const state = createGameState({ currentWeek: 1 });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(false);
      });
    });

    describe('priority of conditions', () => {
      it('burnout takes precedence', () => {
        const state = createGameState({
          stress: 100,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -100 },
          compliance: 0,
          currentWeek: 13,
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('burnout');
      });

      it('fired comes second', () => {
        const state = createGameState({
          stress: 50,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -100 },
          compliance: 0,
          currentWeek: 13,
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('fired');
      });

      it('compliance comes third', () => {
        const state = createGameState({
          stress: 50,
          relationships: { ...DEFAULT_GAME_STATE.relationships, chef: -50 },
          compliance: 0,
          currentWeek: 13,
        });

        const result = checkGameOver(state);

        expect(result.isOver).toBe(true);
        expect(result.reason).toBe('bsi_bussgeld');
      });
    });
  });
});
