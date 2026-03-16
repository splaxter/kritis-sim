import {
  GameState,
  DEFAULT_GAME_STATE,
  Skills,
  Relationships,
  EventEffects,
  GameModeId,
  getGameModeConfig,
  createInitialAdventureState,
} from '@kritis/shared';

export function createInitialState(seed?: string, mode: GameModeId = 'beginner'): GameState {
  const config = getGameModeConfig(mode);

  return {
    ...DEFAULT_GAME_STATE,
    seed: seed || generateSeed(),
    runNumber: 1,
    gameMode: mode,
    // Apply mode-specific starting stats
    skills: {
      netzwerk: config.startingStats.skills,
      linux: config.startingStats.skills,
      windows: config.startingStats.skills,
      security: config.startingStats.skills,
      troubleshooting: config.startingStats.skills,
      softSkills: config.startingStats.skills,
    },
    stress: config.startingStats.stress,
    budget: config.startingStats.budget,
    compliance: config.startingStats.compliance,
    relationships: {
      chef: config.startingRelationships.chef,
      gf: 0,
      kaemmerer: config.startingRelationships.kaemmerer,
      fachabteilung: 0,
      kollegen: config.startingRelationships.kollegen,
    },
    // Initialize arcade fields if arcade mode
    ...(mode === 'arcade' ? {
      arcadeScore: 0,
      comboMultiplier: 1,
      comboStreak: 0,
    } : {}),
    // Initialize story state if story mode
    ...(mode === 'story' ? {
      isStoryMode: true,
      storyState: createInitialAdventureState(),
    } : {}),
    // Initialize KRITIS mode flag for special events
    ...(mode === 'kritis' ? {
      flags: { kritis_mode: true },
    } : {}),
    // Chain system - always initialize
    decisions: [],
    pendingChainEvents: [],
    // Mentor mode: enabled for beginner, forced for learning
    mentorModeEnabled: mode === 'beginner' || mode === 'learning',
  };
}

export function generateSeed(): string {
  return `KRITIS-${Date.now().toString(36).toUpperCase()}`;
}

export function applyEffects(state: GameState, effects: EventEffects): GameState {
  const newState = { ...state };
  const config = getGameModeConfig(state.gameMode);
  const multiplier = config.difficulty.effectMultiplier;

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
        // Apply multiplier to negative relationship changes
        const adjustedValue = value < 0 ? Math.round(value * multiplier) : value;
        newState.relationships[key as keyof Relationships] = Math.max(
          -100,
          Math.min(100, state.relationships[key as keyof Relationships] + adjustedValue)
        );
      }
    }
  }

  if (effects.stress !== undefined) {
    // Apply multiplier to stress increases
    const adjustedStress = effects.stress > 0
      ? Math.round(effects.stress * multiplier)
      : effects.stress;
    newState.stress = Math.max(0, Math.min(100, state.stress + adjustedStress));
  }

  if (effects.budget !== undefined) {
    newState.budget = Math.max(0, state.budget + effects.budget);
  }

  if (effects.compliance !== undefined) {
    // Apply multiplier to compliance decreases
    const adjustedCompliance = effects.compliance < 0
      ? Math.round(effects.compliance * multiplier)
      : effects.compliance;
    newState.compliance = Math.max(0, Math.min(100, state.compliance + adjustedCompliance));
  }

  return newState;
}

export function advanceDay(state: GameState): GameState {
  const newDay = state.currentDay + 1;
  if (newDay > 5) {
    // Weekend - advance to next week and apply stress decay
    const config = getGameModeConfig(state.gameMode);
    const baseStressDecay = 5; // Base stress reduction per weekend
    const stressDecay = Math.round(baseStressDecay * config.difficulty.stressDecayRate);
    const newStress = Math.max(0, state.stress - stressDecay);

    return {
      ...state,
      currentDay: 1,
      currentWeek: state.currentWeek + 1,
      stress: newStress,
    };
  }
  return { ...state, currentDay: newDay };
}

export function checkGameOver(state: GameState): { isOver: boolean; reason?: string; isVictory?: boolean } {
  const config = getGameModeConfig(state.gameMode);
  const thresholds = config.thresholds;
  const totalWeeks = config.gameLength.totalWeeks;

  if (state.stress >= thresholds.stressGameOver) {
    return { isOver: true, reason: 'burnout', isVictory: false };
  }
  if (state.relationships.chef <= thresholds.chefRelationshipGameOver) {
    return { isOver: true, reason: 'fired', isVictory: false };
  }
  if (state.compliance <= thresholds.complianceGameOver) {
    return { isOver: true, reason: 'bsi_bussgeld', isVictory: false };
  }
  if (state.currentWeek > totalWeeks) {
    return { isOver: true, reason: 'probezeit_complete', isVictory: true };
  }
  return { isOver: false };
}
