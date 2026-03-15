/**
 * Game Mode Type Definitions
 * Defines the different game modes and their configurations
 */

export type GameModeId = 'beginner' | 'intermediate' | 'hard' | 'kritis' | 'arcade' | 'adventure';

export interface GameModeStartingStats {
  skills: number;
  stress: number;
  budget: number;
  compliance: number;
}

export interface GameModeStartingRelationships {
  chef: number;
  kaemmerer: number;
  kollegen: number;
}

export interface GameModeDifficulty {
  maxScenarioDifficulty: number;
  effectMultiplier: number;
  stressDecayRate: number;
}

export interface GameModeLength {
  totalWeeks: number;
  daysPerWeek: number;
}

export interface GameModeThresholds {
  stressGameOver: number;
  complianceGameOver: number;
  chefRelationshipGameOver: number;
}

export interface GameModeFeatures {
  showHints: boolean;
  timerEnabled: boolean;
  timerSeconds?: number;
  comboScoringEnabled: boolean;
}

export interface GameModeConfig {
  id: GameModeId;
  name: string;
  description: string;
  icon: string;
  startingStats: GameModeStartingStats;
  startingRelationships: GameModeStartingRelationships;
  difficulty: GameModeDifficulty;
  gameLength: GameModeLength;
  thresholds: GameModeThresholds;
  features: GameModeFeatures;
}
