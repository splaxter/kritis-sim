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
  | 'story';

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
  involvedCharacters: string[];
  choices: EventChoice[];
  terminalContext?: TerminalContext;
  tags: string[];
}
