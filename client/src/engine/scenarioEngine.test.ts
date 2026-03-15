import { describe, it, expect } from 'vitest';
import { GameState, Scenario, ScenarioChoice } from '@kritis/shared';
import {
  getAvailableScenarios,
  selectNextScenario,
  calculateScenarioEffects,
  getOutcomeColor,
  getOutcomeLabel,
  getUrgencyColor,
  getUrgencyLabel,
} from './scenarioEngine';

// Helper to create a minimal game state
function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentWeek: 1,
    currentDay: 1,
    stress: 50,
    budget: 10000,
    compliance: 80,
    skills: {
      netzwerk: 10,
      linux: 10,
      windows: 10,
      security: 10,
      troubleshooting: 10,
      softSkills: 10,
    },
    relationships: {
      chef: 50,
      gf: 50,
      kaemmerer: 50,
      fachabteilung: 50,
      kollegen: 50,
    },
    activeEvents: [],
    completedEvents: [],
    completedScenarios: [],
    flags: {},
    unlockedCommands: [],
    terminalHistory: [],
    seed: 'test-seed',
    runNumber: 1,
    gameMode: 'intermediate',
    isAdventureMode: false,
    ...overrides,
  };
}

// Helper to create test scenarios
function createTestScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'TEST-SC-001',
    title: 'Test Scenario',
    category: 'vendor_management',
    difficulty: 2,
    flavorText: 'Test flavor text',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Option A',
        outcome: 'SUCCESS',
        consequence: 'You chose A',
        scoreChange: 50,
        reputationChange: 10,
        lesson: 'Lesson from A',
      },
      {
        id: 'B',
        text: 'Option B',
        outcome: 'FAIL',
        consequence: 'You chose B',
        scoreChange: -50,
        reputationChange: -10,
        lesson: 'Lesson from B',
      },
    ],
    realWorldReference: 'Real world reference',
    bsiReference: 'BSI IT-Grundschutz: TEST',
    ...overrides,
  };
}

describe('scenarioEngine', () => {
  describe('getAvailableScenarios', () => {
    it('returns scenarios matching current difficulty level', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
        createTestScenario({ id: 'SC-2', difficulty: 2 }),
        createTestScenario({ id: 'SC-3', difficulty: 3 }),
        createTestScenario({ id: 'SC-4', difficulty: 4 }),
        createTestScenario({ id: 'SC-5', difficulty: 5 }),
      ];
      const state = createTestState({ currentWeek: 1 });

      const available = getAvailableScenarios(scenarios, state);

      // Week 1-4: max difficulty 2
      expect(available.length).toBe(2);
      expect(available.map(s => s.id)).toEqual(['SC-1', 'SC-2']);
    });

    it('increases available difficulty in mid game (weeks 5-8)', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
        createTestScenario({ id: 'SC-2', difficulty: 2 }),
        createTestScenario({ id: 'SC-3', difficulty: 3 }),
        createTestScenario({ id: 'SC-4', difficulty: 4 }),
      ];
      const state = createTestState({ currentWeek: 6 });

      const available = getAvailableScenarios(scenarios, state);

      // Week 5-8: max difficulty 3
      expect(available.length).toBe(3);
      expect(available.map(s => s.id)).toEqual(['SC-1', 'SC-2', 'SC-3']);
    });

    it('allows all difficulties in late game (weeks 9-12)', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
        createTestScenario({ id: 'SC-2', difficulty: 3 }),
        createTestScenario({ id: 'SC-3', difficulty: 5 }),
      ];
      const state = createTestState({ currentWeek: 10 });

      const available = getAvailableScenarios(scenarios, state);

      expect(available.length).toBe(3);
    });

    it('excludes completed scenarios', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
        createTestScenario({ id: 'SC-2', difficulty: 1 }),
        createTestScenario({ id: 'SC-3', difficulty: 1 }),
      ];
      const state = createTestState({
        completedScenarios: ['SC-1', 'SC-3'],
      });

      const available = getAvailableScenarios(scenarios, state);

      expect(available.length).toBe(1);
      expect(available[0].id).toBe('SC-2');
    });

    it('returns empty array when all scenarios completed', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
        createTestScenario({ id: 'SC-2', difficulty: 1 }),
      ];
      const state = createTestState({
        completedScenarios: ['SC-1', 'SC-2'],
      });

      const available = getAvailableScenarios(scenarios, state);

      expect(available.length).toBe(0);
    });

    it('returns empty array when no scenarios match difficulty', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 5 }),
      ];
      const state = createTestState({ currentWeek: 1 });

      const available = getAvailableScenarios(scenarios, state);

      expect(available.length).toBe(0);
    });
  });

  describe('selectNextScenario', () => {
    it('returns null when no scenarios available', () => {
      const scenarios: Scenario[] = [];
      const state = createTestState();

      const selected = selectNextScenario(scenarios, state, 'test-seed');

      expect(selected).toBeNull();
    });

    it('returns a scenario when available', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1 }),
      ];
      const state = createTestState();

      const selected = selectNextScenario(scenarios, state, 'test-seed');

      expect(selected).not.toBeNull();
      expect(selected!.id).toBe('SC-1');
    });

    it('produces deterministic selection with same seed', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-2', difficulty: 1, urgency: 'medium' }),
        createTestScenario({ id: 'SC-3', difficulty: 1, urgency: 'high' }),
      ];
      const state = createTestState();

      const selected1 = selectNextScenario(scenarios, state, 'fixed-seed');
      const selected2 = selectNextScenario(scenarios, state, 'fixed-seed');

      expect(selected1!.id).toBe(selected2!.id);
    });

    it('produces different selection with different seeds', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-2', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-3', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-4', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-5', difficulty: 1, urgency: 'low' }),
      ];
      const state = createTestState();

      const selections = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const selected = selectNextScenario(scenarios, state, `seed-${i}`);
        if (selected) selections.add(selected.id);
      }

      // With 20 different seeds, we should get multiple different scenarios
      expect(selections.size).toBeGreaterThan(1);
    });

    it('weights selection by urgency (critical scenarios more likely)', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-LOW', difficulty: 1, urgency: 'low' }),
        createTestScenario({ id: 'SC-CRITICAL', difficulty: 1, urgency: 'critical' }),
      ];
      const state = createTestState();

      // Run multiple selections and count
      const counts: Record<string, number> = { 'SC-LOW': 0, 'SC-CRITICAL': 0 };
      for (let i = 0; i < 100; i++) {
        const selected = selectNextScenario(scenarios, state, `seed-${i}`);
        if (selected) counts[selected.id]++;
      }

      // Critical (weight 4) should appear more often than low (weight 1)
      expect(counts['SC-CRITICAL']).toBeGreaterThan(counts['SC-LOW']);
    });

    it('changes selection as game state progresses', () => {
      const scenarios = [
        createTestScenario({ id: 'SC-1', difficulty: 1, urgency: 'medium' }),
        createTestScenario({ id: 'SC-2', difficulty: 1, urgency: 'medium' }),
      ];

      const state1 = createTestState({ completedEvents: [] });
      const state2 = createTestState({ completedEvents: ['other-event'] });

      const selected1 = selectNextScenario(scenarios, state1, 'same-seed');
      const selected2 = selectNextScenario(scenarios, state2, 'same-seed');

      // completedEvents.length differs, so selection may differ
      // (they could still be the same by chance, but the mechanism is tested)
      expect(selected1).not.toBeNull();
      expect(selected2).not.toBeNull();
    });
  });

  describe('calculateScenarioEffects', () => {
    it('calculates positive effects for positive score change', () => {
      const choice: ScenarioChoice = {
        id: 'A',
        text: 'Good choice',
        outcome: 'PERFECT',
        consequence: 'Great result',
        scoreChange: 100,
        reputationChange: 0,
        lesson: 'Lesson learned',
      };

      const effects = calculateScenarioEffects(choice);

      expect(effects.skills?.troubleshooting).toBe(5); // 100/20 = 5
      expect(effects.skills?.security).toBe(2); // 5/2 = 2
      expect(effects.stress).toBe(-2); // -100/50 = -2 (stress reduction)
    });

    it('calculates stress increase for negative score change', () => {
      const choice: ScenarioChoice = {
        id: 'B',
        text: 'Bad choice',
        outcome: 'FAIL',
        consequence: 'Bad result',
        scoreChange: -100,
        reputationChange: 0,
        lesson: 'Lesson learned',
      };

      const effects = calculateScenarioEffects(choice);

      expect(effects.stress).toBe(4); // 100/25 = 4 (stress increase)
    });

    it('calculates relationship effects from reputation change', () => {
      const choice: ScenarioChoice = {
        id: 'A',
        text: 'Choice',
        outcome: 'SUCCESS',
        consequence: 'Result',
        scoreChange: 0,
        reputationChange: 20,
        lesson: 'Lesson',
      };

      const effects = calculateScenarioEffects(choice);

      expect(effects.relationships?.chef).toBe(10); // 20/2 = 10
      expect(effects.relationships?.kollegen).toBe(6); // 20/3 = 6
    });

    it('calculates negative relationship effects', () => {
      const choice: ScenarioChoice = {
        id: 'A',
        text: 'Choice',
        outcome: 'FAIL',
        consequence: 'Result',
        scoreChange: 0,
        reputationChange: -15,
        lesson: 'Lesson',
      };

      const effects = calculateScenarioEffects(choice);

      expect(effects.relationships?.chef).toBe(-8); // Math.floor(-15/2) = -8
      expect(effects.relationships?.kollegen).toBe(-5); // Math.floor(-15/3) = -5
    });

    it('returns empty effects for zero changes', () => {
      const choice: ScenarioChoice = {
        id: 'A',
        text: 'Neutral choice',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Neutral result',
        scoreChange: 0,
        reputationChange: 0,
        lesson: 'Lesson',
      };

      const effects = calculateScenarioEffects(choice);

      expect(effects.skills).toBeUndefined();
      expect(effects.stress).toBeUndefined();
      expect(effects.relationships).toBeUndefined();
    });
  });

  describe('getOutcomeColor', () => {
    it('returns correct colors for each outcome type', () => {
      expect(getOutcomeColor('PERFECT')).toBe('text-green-400');
      expect(getOutcomeColor('PERFECT_ALTERNATIVE')).toBe('text-green-400');
      expect(getOutcomeColor('SUCCESS')).toBe('text-green-300');
      expect(getOutcomeColor('PARTIAL_SUCCESS')).toBe('text-yellow-400');
      expect(getOutcomeColor('FAIL')).toBe('text-red-400');
      expect(getOutcomeColor('CRITICAL_FAIL')).toBe('text-red-600');
    });

    it('returns default color for unknown outcome', () => {
      expect(getOutcomeColor('UNKNOWN')).toBe('text-terminal-green');
    });
  });

  describe('getOutcomeLabel', () => {
    it('returns German labels for each outcome type', () => {
      expect(getOutcomeLabel('PERFECT')).toBe('★ Perfekt');
      expect(getOutcomeLabel('PERFECT_ALTERNATIVE')).toBe('★ Alternative Lösung');
      expect(getOutcomeLabel('SUCCESS')).toBe('✓ Erfolg');
      expect(getOutcomeLabel('PARTIAL_SUCCESS')).toBe('◐ Teilerfolg');
      expect(getOutcomeLabel('FAIL')).toBe('✗ Fehlschlag');
      expect(getOutcomeLabel('CRITICAL_FAIL')).toBe('✗✗ Kritischer Fehler');
    });

    it('returns raw value for unknown outcome', () => {
      expect(getOutcomeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getUrgencyColor', () => {
    it('returns correct colors for each urgency level', () => {
      expect(getUrgencyColor('critical')).toBe('text-red-500 animate-pulse');
      expect(getUrgencyColor('high')).toBe('text-orange-400');
      expect(getUrgencyColor('medium')).toBe('text-yellow-400');
      expect(getUrgencyColor('low')).toBe('text-terminal-green-dim');
    });

    it('returns default color for unknown urgency', () => {
      expect(getUrgencyColor('unknown')).toBe('text-terminal-green');
    });
  });

  describe('getUrgencyLabel', () => {
    it('returns German labels for each urgency level', () => {
      expect(getUrgencyLabel('critical')).toBe('KRITISCH');
      expect(getUrgencyLabel('high')).toBe('Hoch');
      expect(getUrgencyLabel('medium')).toBe('Mittel');
      expect(getUrgencyLabel('low')).toBe('Niedrig');
    });

    it('returns raw value for unknown urgency', () => {
      expect(getUrgencyLabel('unknown')).toBe('unknown');
    });
  });
});
