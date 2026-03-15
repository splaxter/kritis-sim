import { Skills } from './skills';
import { EventEffects } from './events';

export type TerminalType = 'linux' | 'windows';

export interface TerminalCommand {
  pattern: string;
  patternRegex?: string;
  output: string;
  teachesCommand?: string;
  skillGain?: Partial<Skills>;
  isPartialSolution?: boolean;
  wrongApproachFeedback?: string;
  isSolution?: boolean;
}

export interface TerminalSolution {
  commands: string[];
  allRequired: boolean;
  resultText: string;
  skillGain: Partial<Skills>;
  effects: EventEffects;
}

export interface VFSOverlay {
  files?: { path: string; content: string }[];
  directories?: string[];
}

/** Template identifiers for VFS configuration */
export type VFSTemplateId =
  | 'linux-webserver'
  | 'linux-database'
  | 'linux-mail'
  | 'linux-firewall'
  | 'windows-dc'
  | 'windows-fileserver'
  | 'scada'
  | 'monitoring';

export interface TerminalContext {
  type: TerminalType;
  hostname: string;
  username: string;
  currentPath: string;
  commands: TerminalCommand[];
  solutions: TerminalSolution[];
  hints: string[];
  /** Optional VFS overlay for scenario-specific files */
  vfsOverlay?: VFSOverlay;
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Template IDs to apply to the VFS */
  templateIds?: VFSTemplateId[];
}
