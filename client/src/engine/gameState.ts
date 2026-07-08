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
    // Initialize story state if story mode
    ...(mode === 'story' ? {
      isStoryMode: true,
      storyState: createInitialAdventureState(),
    } : {}),
    // Initialize KRITIS mode flag for special events
    ...(mode === 'kritis' ? {
      flags: { kritis_mode: true },
    } : {}),
    // Initialize learning state for learning mode (topic-selection progress)
    ...(mode === 'learning' ? {
      learningState: {},
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

// Stress recovers a little every day (passive) plus an extra chunk over the
// weekend. Both scale with the mode's stressDecayRate. This continuous recovery
// is what keeps the stress economy solvent: event stress income runs ~+12–30
// per week, so a weekend-only trickle (the old 5×rate) guaranteed burnout in
// the harder modes regardless of skill. See the balance analysis / gameMode
// difficulty config.
const PER_DAY_STRESS_DECAY = 4;   // passive recovery applied every advanceDay
const WEEKEND_STRESS_BONUS = 4;   // extra recovery when the week rolls over

export function advanceDay(state: GameState): GameState {
  const config = getGameModeConfig(state.gameMode);
  const rate = config.difficulty.stressDecayRate;
  const newDay = state.currentDay + 1;
  const isWeekend = newDay > 5;

  const decay =
    Math.round(PER_DAY_STRESS_DECAY * rate) +
    (isWeekend ? Math.round(WEEKEND_STRESS_BONUS * rate) : 0);
  const newStress = Math.max(0, state.stress - decay);

  if (isWeekend) {
    // Weekend - advance to next week
    return {
      ...state,
      currentDay: 1,
      currentWeek: state.currentWeek + 1,
      stress: newStress,
    };
  }
  return { ...state, currentDay: newDay, stress: newStress };
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
