/**
 * Game Mode Configurations
 * Defines all 5 game modes with their specific settings
 */

import { GameModeConfig, GameModeId, VISIBLE_MODES } from '../types/gameMode';

export const GAME_MODES: Record<GameModeId, GameModeConfig> = {
  beginner: {
    id: 'beginner',
    name: 'Einsteiger',
    description: 'Für Neulinge: Hilfreiche Hinweise, verzeihende Werte und leichtere Szenarien.',
    icon: '📚',
    startingStats: {
      skills: 30,
      stress: 15,
      budget: 20000,
      compliance: 60,
    },
    startingRelationships: {
      chef: 10,
      kaemmerer: 0,
      kollegen: 15,
    },
    difficulty: {
      maxScenarioDifficulty: 2,
      effectMultiplier: 0.7,
      stressDecayRate: 1.5,
    },
    gameLength: {
      totalWeeks: 12,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 100,
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: true,
      timerEnabled: false,
      comboScoringEnabled: false,
    },
  },

  learning: {
    id: 'learning',
    name: 'Lernmodus',
    description: 'CLI-Training: 11 progressive Terminal-Lektionen von Basics bis Incident Response.',
    icon: '🎓',
    startingStats: {
      skills: 15,  // Start lower, learn through practice
      stress: 10,
      budget: 15000,
      compliance: 50,
    },
    startingRelationships: {
      chef: 10,
      kaemmerer: 0,
      kollegen: 15,  // Bjorg helps you learn
    },
    difficulty: {
      maxScenarioDifficulty: 4,
      effectMultiplier: 0.8,  // Forgiving for learning
      stressDecayRate: 1.5,   // Stress recovers faster
    },
    gameLength: {
      totalWeeks: 12,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 120,    // Very forgiving
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: true,
      timerEnabled: false,
      comboScoringEnabled: false,
      cliOnly: true,  // Only CLI/terminal events
    },
  },

  intermediate: {
    id: 'intermediate',
    name: 'Standard',
    description: 'Das klassische Spielerlebnis: Ausgewogene Herausforderung für alle.',
    icon: '💼',
    startingStats: {
      skills: 20,
      stress: 20,
      budget: 15000,
      compliance: 50,
    },
    startingRelationships: {
      chef: 0,
      kaemmerer: -10,
      kollegen: 10,
    },
    difficulty: {
      maxScenarioDifficulty: 5,
      effectMultiplier: 1.0,
      stressDecayRate: 1.0,
    },
    gameLength: {
      totalWeeks: 12,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 100,
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: false,
      timerEnabled: false,
      comboScoringEnabled: false,
    },
  },

  hard: {
    id: 'hard',
    name: 'Schwer',
    description: 'Für Profis: Strengere Konsequenzen und schnellerer Stressaufbau.',
    icon: '🔥',
    startingStats: {
      skills: 15,
      stress: 30,
      budget: 12000,
      compliance: 40,
    },
    startingRelationships: {
      chef: -10,
      kaemmerer: -20,
      kollegen: 5,
    },
    difficulty: {
      maxScenarioDifficulty: 5,
      effectMultiplier: 1.5,
      stressDecayRate: 0.5,
    },
    gameLength: {
      totalWeeks: 12,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 90,
      complianceGameOver: 10,
      chefRelationshipGameOver: -80,
    },
    features: {
      showHints: false,
      timerEnabled: false,
      comboScoringEnabled: false,
    },
  },

  kritis: {
    id: 'kritis',
    name: 'KRITIS',
    description: 'Realistische Simulation: 24 Wochen, NIS2-Audits und Kettenreaktionen.',
    icon: '🏛️',
    startingStats: {
      skills: 20,
      stress: 25,
      budget: 10000,
      compliance: 45,
    },
    startingRelationships: {
      chef: 0,
      kaemmerer: -15,
      kollegen: 10,
    },
    difficulty: {
      maxScenarioDifficulty: 5,
      effectMultiplier: 1.3,
      stressDecayRate: 0.8,
    },
    gameLength: {
      totalWeeks: 24,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 100,
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: false,
      timerEnabled: false,
      comboScoringEnabled: false,
    },
  },

  arcade: {
    id: 'arcade',
    name: 'Arcade',
    description: 'Schneller Spaß: 8 Wochen, 30 Sekunden Timer und Combo-Scoring!',
    icon: '🕹️',
    startingStats: {
      skills: 25,
      stress: 10,
      budget: 8000,
      compliance: 50,
    },
    startingRelationships: {
      chef: 5,
      kaemmerer: 0,
      kollegen: 15,
    },
    difficulty: {
      maxScenarioDifficulty: 5,
      effectMultiplier: 1.0,
      stressDecayRate: 1.2,
    },
    gameLength: {
      totalWeeks: 8,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 100,
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: false,
      timerEnabled: true,
      timerSeconds: 30,
      comboScoringEnabled: true,
    },
  },

  story: {
    id: 'story',
    name: 'Story: Die Probezeit',
    description: 'Ein IT-Krimi in 12 Kapiteln. The Office meets Mr. Robot.',
    icon: '📖',
    startingStats: {
      skills: 20,
      stress: 15,
      budget: 15000,
      compliance: 50,
    },
    startingRelationships: {
      chef: 0,
      kaemmerer: 0,
      kollegen: 5,
    },
    difficulty: {
      maxScenarioDifficulty: 4,
      effectMultiplier: 1.0,
      stressDecayRate: 1.0,
    },
    gameLength: {
      totalWeeks: 12,
      daysPerWeek: 5,
    },
    thresholds: {
      stressGameOver: 100,
      complianceGameOver: 0,
      chefRelationshipGameOver: -100,
    },
    features: {
      showHints: true,
      timerEnabled: false,
      comboScoringEnabled: false,
    },
  },
};

export function getGameModeConfig(modeId: GameModeId): GameModeConfig {
  return GAME_MODES[modeId];
}

export function getAllGameModes(): GameModeConfig[] {
  return Object.values(GAME_MODES);
}

export function getVisibleGameModes(): GameModeConfig[] {
  return VISIBLE_MODES.map(id => GAME_MODES[id]);
}

export { VISIBLE_MODES };
