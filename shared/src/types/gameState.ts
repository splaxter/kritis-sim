import { Skills } from './skills';
import { GameModeId } from './gameMode';
import { AdventureState } from './adventure';

export interface Relationships {
  chef: number;
  gf: number;
  kaemmerer: number;
  fachabteilung: number;
  kollegen: number;
}

export interface DecisionRecord {
  eventId: string;
  choiceIndex: number;
  choiceId: string;
  week: number;
  day: number;
  tags: string[];
}

export interface PendingChainEvent {
  eventId: string;
  availableWeek: number;
  sourceEventId: string;
  sourceChoiceId: string;
  triggeredAt: { week: number; day: number };
}

export interface GameState {
  currentWeek: number;
  currentDay: number;
  skills: Skills;
  relationships: Relationships;
  stress: number;
  budget: number;
  compliance: number;
  activeEvents: string[];
  completedEvents: string[];
  completedScenarios: string[];
  flags: Record<string, boolean>;
  unlockedCommands: string[];
  terminalHistory: string[];
  seed: string;
  runNumber: number;
  gameMode: GameModeId;
  // Arcade mode specific
  arcadeScore?: number;
  comboMultiplier?: number;
  comboStreak?: number;
  // Story mode specific
  isStoryMode: boolean;
  storyState?: AdventureState;
  // Chain system
  decisions: DecisionRecord[];           // All decisions made
  pendingChainEvents: PendingChainEvent[];  // Scheduled consequences
  // Mentor mode
  mentorModeEnabled?: boolean;
}

export const DEFAULT_RELATIONSHIPS: Relationships = {
  chef: 0,
  gf: 0,
  kaemmerer: -10,
  fachabteilung: 0,
  kollegen: 10,
};

export const DEFAULT_GAME_STATE: Omit<GameState, 'seed' | 'runNumber'> = {
  currentWeek: 1,
  currentDay: 1,
  skills: {
    netzwerk: 20,
    linux: 20,
    windows: 20,
    security: 20,
    troubleshooting: 20,
    softSkills: 20,
  },
  relationships: DEFAULT_RELATIONSHIPS,
  stress: 20,
  budget: 15000,
  compliance: 50,
  activeEvents: [],
  completedEvents: [],
  completedScenarios: [],
  flags: {},
  unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
  terminalHistory: [],
  gameMode: 'beginner',
  isStoryMode: false,
  // Chain system
  decisions: [],
  pendingChainEvents: [],
};
