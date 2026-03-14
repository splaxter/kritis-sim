import {
  GameState,
  DEFAULT_GAME_STATE,
  Skills,
  Relationships,
  EventEffects,
} from '@kritis/shared';

export function createInitialState(seed?: string): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    seed: seed || generateSeed(),
    runNumber: 1,
  };
}

export function generateSeed(): string {
  return `KRITIS-${Date.now().toString(36).toUpperCase()}`;
}

export function applyEffects(state: GameState, effects: EventEffects): GameState {
  const newState = { ...state };

  if (effects.skills) {
    newState.skills = { ...state.skills };
    for (const [key, value] of Object.entries(effects.skills)) {
      if (value !== undefined) {
        newState.skills[key as keyof Skills] = Math.max(
          0,
          Math.min(100, state.skills[key as keyof Skills] + value)
        );
      }
    }
  }

  if (effects.relationships) {
    newState.relationships = { ...state.relationships };
    for (const [key, value] of Object.entries(effects.relationships)) {
      if (value !== undefined) {
        newState.relationships[key as keyof Relationships] = Math.max(
          -100,
          Math.min(100, state.relationships[key as keyof Relationships] + value)
        );
      }
    }
  }

  if (effects.stress !== undefined) {
    newState.stress = Math.max(0, Math.min(100, state.stress + effects.stress));
  }

  if (effects.budget !== undefined) {
    newState.budget = Math.max(0, state.budget + effects.budget);
  }

  if (effects.compliance !== undefined) {
    newState.compliance = Math.max(0, Math.min(100, state.compliance + effects.compliance));
  }

  return newState;
}

export function advanceDay(state: GameState): GameState {
  const newDay = state.currentDay + 1;
  if (newDay > 5) {
    return {
      ...state,
      currentDay: 1,
      currentWeek: state.currentWeek + 1,
    };
  }
  return { ...state, currentDay: newDay };
}

export function checkGameOver(state: GameState): { isOver: boolean; reason?: string } {
  if (state.stress >= 100) {
    return { isOver: true, reason: 'burnout' };
  }
  if (state.relationships.chef <= -100) {
    return { isOver: true, reason: 'fired' };
  }
  if (state.compliance <= 0) {
    return { isOver: true, reason: 'bsi_bussgeld' };
  }
  if (state.currentWeek > 12) {
    return { isOver: true, reason: 'probezeit_complete' };
  }
  return { isOver: false };
}
