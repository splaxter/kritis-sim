import { Skills, SkillCheck } from './skills';
import { Relationships } from './gameState';
import { TerminalContext } from './terminal';
import { GameModeId } from './gameMode';

export type EventCategory =
  | 'support'
  | 'security'
  | 'compliance'
  | 'politics'
  | 'budget'
  | 'crisis'
  | 'team'
  | 'personal'
  | 'absurd'
  | 'story'
  | 'training';

export interface ChainTrigger {
  targetEventId: string;
  condition?: string;           // JS expression evaluated with choice context
  delayWeeks: number;           // 0 = immediate, 1-4 = delayed
  probability?: number;         // 0-1, default 1.0
  description?: string;         // For debugging/content authoring
}

export interface EventEffects {
  skills?: Partial<Skills>;
  relationships?: Partial<Relationships>;
  stress?: number;
  budget?: number;
  compliance?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  requires?: SkillCheck;
  hidden?: boolean;
  effects: EventEffects;
  resultText: string;
  teachingMoment?: string;
  terminalCommand?: boolean;
  terminalSolution?: string;
  triggersEvent?: string;
  setsFlags?: string[];
  unlocks?: string[];
  // Chain system: per-choice triggers (override event-level)
  chainTriggers?: ChainTrigger[];
  choiceTags?: string[];           // Tags for this specific choice
}

export interface GameEvent {
  id: string;
  weekRange: [number, number];
  dayPreference?: number[];
  probability: number;
  requires?: {
    events?: string[];
    flags?: string[];
    skills?: Partial<Skills>;
    relationships?: Partial<Relationships>;
  };
  requiredModes?: GameModeId[];
  category: EventCategory;
  title: string;
  description: string;
  image?: string; // Path to event illustration (e.g., "/images/events/evt_example.webp")
  involvedCharacters: string[];
  choices: EventChoice[];
  terminalContext?: TerminalContext;
  tags: string[];
  // Chain system
  chainTriggers?: ChainTrigger[];  // Triggers defined at event level
  chainPriority?: number;          // Higher = selected first (default 0)
  isChainEvent?: boolean;          // Marks as consequence event
  // Mentor mode
  mentorNote?: string;             // Educational context for mentor mode
}
