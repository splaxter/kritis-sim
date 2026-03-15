// Scenario Engine - Handles scenario selection and effects
import { Scenario, ScenarioChoice, GameState, EventEffects, getGameModeConfig } from '@kritis/shared';

export interface ScenarioResult {
  scenario: Scenario;
  choice: ScenarioChoice;
  effects: EventEffects;
}

// Get available scenarios based on game state
export function getAvailableScenarios(
  scenarios: Scenario[],
  state: GameState
): Scenario[] {
  const config = getGameModeConfig(state.gameMode);
  const modeMaxDifficulty = config.difficulty.maxScenarioDifficulty;

  return scenarios.filter((scenario) => {
    // Check if already completed
    if ((state.completedScenarios || []).includes(scenario.id)) {
      return false;
    }

    // Start with mode's max difficulty cap
    let maxDifficulty = modeMaxDifficulty;

    // Further limit based on progression (within mode limits)
    // Early game: start lower, scale up to mode max
    const week = state.currentWeek;
    const totalWeeks = config.gameLength.totalWeeks;
    const progressRatio = week / totalWeeks;

    if (progressRatio < 0.33) {
      // Early game: cap at 2 or mode max, whichever is lower
      maxDifficulty = Math.min(2, modeMaxDifficulty);
    } else if (progressRatio < 0.66) {
      // Mid game: cap at 3 or mode max, whichever is lower
      maxDifficulty = Math.min(3, modeMaxDifficulty);
    }
    // Late game: use full mode max difficulty

    if (scenario.difficulty > maxDifficulty) {
      return false;
    }

    return true;
  });
}

// Select next scenario with weighted random based on urgency
export function selectNextScenario(
  scenarios: Scenario[],
  state: GameState,
  seed: string
): Scenario | null {
  const available = getAvailableScenarios(scenarios, state);
  if (available.length === 0) return null;

  // Weight by urgency - critical scenarios more likely to appear
  const weights = available.map((s) => {
    switch (s.urgency) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const hashInput = seed + state.currentWeek + state.currentDay + state.completedEvents.length;
  const hash = simpleHash(hashInput);
  let target = hash % totalWeight;

  for (let i = 0; i < available.length; i++) {
    target -= weights[i];
    if (target < 0) {
      return available[i];
    }
  }

  return available[0];
}

// Calculate effects from scenario choice
export function calculateScenarioEffects(choice: ScenarioChoice): EventEffects {
  const effects: EventEffects = {};

  // Convert scoreChange to skill improvements
  if (choice.scoreChange > 0) {
    // Positive score = skill gain
    const skillGain = Math.floor(choice.scoreChange / 20);
    effects.skills = {
      troubleshooting: skillGain,
      security: Math.floor(skillGain / 2),
    };
    effects.stress = -Math.floor(choice.scoreChange / 50);
  } else if (choice.scoreChange < 0) {
    // Negative score = stress increase
    effects.stress = Math.abs(Math.floor(choice.scoreChange / 25));
  }

  // Convert reputationChange to relationship effects
  if (choice.reputationChange !== 0) {
    effects.relationships = {
      chef: Math.floor(choice.reputationChange / 2),
      kollegen: Math.floor(choice.reputationChange / 3),
    };
  }

  return effects;
}

// Get outcome color for UI
export function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'PERFECT':
    case 'PERFECT_ALTERNATIVE':
      return 'text-green-400';
    case 'SUCCESS':
      return 'text-green-300';
    case 'PARTIAL_SUCCESS':
      return 'text-yellow-400';
    case 'FAIL':
      return 'text-red-400';
    case 'CRITICAL_FAIL':
      return 'text-red-600';
    default:
      return 'text-terminal-green';
  }
}

// Get outcome label in German
export function getOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'PERFECT':
      return '★ Perfekt';
    case 'PERFECT_ALTERNATIVE':
      return '★ Alternative Lösung';
    case 'SUCCESS':
      return '✓ Erfolg';
    case 'PARTIAL_SUCCESS':
      return '◐ Teilerfolg';
    case 'FAIL':
      return '✗ Fehlschlag';
    case 'CRITICAL_FAIL':
      return '✗✗ Kritischer Fehler';
    default:
      return outcome;
  }
}

// Get urgency color for UI
export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'text-red-500 animate-pulse';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-terminal-green-dim';
    default:
      return 'text-terminal-green';
  }
}

// Get urgency label in German
export function getUrgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'KRITISCH';
    case 'high':
      return 'Hoch';
    case 'medium':
      return 'Mittel';
    case 'low':
      return 'Niedrig';
    default:
      return urgency;
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
