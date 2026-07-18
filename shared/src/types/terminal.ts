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
  /** When set, these state conditions must ALL hold (in addition to `commands`, which may be []). */
  stateGoals?: StateGoal[];
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
  /**
   * Short task summary shown in a persistent panel while the terminal is
   * open. If omitted, the client falls back to the "**Deine Aufgabe:**"
   * block of the event description / scenario flavor text.
   */
  taskText?: string;
  commands: TerminalCommand[];
  solutions: TerminalSolution[];
  hints: string[];
  /** Optional VFS overlay for scenario-specific files */
  vfsOverlay?: VFSOverlay;
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Template IDs to apply to the VFS */
  templateIds?: VFSTemplateId[];
  /** Multi-host levels: first entry is the primary host the player starts on. */
  hosts?: TerminalHostSpec[];
  /** Live skill drip: first successful use (exit 0) of a command name grants this. */
  commandSkillGain?: Record<string, Partial<Skills>>;
}

// ============================================================================
// Multi-host terminal levels
// ============================================================================

export interface TerminalJournalEntry {
  /** 'YYYY-MM-DD HH:MM:SS' — string-comparable, no Date parsing needed */
  ts: string;
  unit: string;
  priority?: 'err' | 'warning' | 'info';
  message: string;
}

export interface TerminalUnitPrecondition {
  /** Check the CURRENT content of this file on the host ... */
  file?: string;
  /** ... or check the LOADED unit-file content (daemon-reload semantics). */
  unitFileMatches?: string;
  /** Regex the file content must match (multiline). */
  matches?: string;
  /** Invert: precondition holds when file/matches is absent. */
  absent?: boolean;
  /** Journal line appended when the precondition fails on start/restart. */
  failMessage: string;
}

export interface TerminalServiceSpec {
  unit: string; // 'telemetryd.service'
  active?: 'active' | 'inactive' | 'failed';
  enabled?: 'enabled' | 'disabled' | 'static';
  desc?: string;
  exec?: string;
  /** Path of the unit file; enables daemon-reload semantics. */
  unitFile?: string;
  startRequires?: TerminalUnitPrecondition[];
}

export interface TerminalFirewallSpec {
  enabled?: boolean;
  defaultIncoming?: 'allow' | 'deny';
  rules?: { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }[];
}

export interface TerminalHostSpec {
  id: string;               // 'web01'
  hostname: string;         // 'web01.stadtwerke.local'
  ip?: string;              // '10.0.20.11'
  templateIds?: VFSTemplateId[];
  vfsOverlay?: VFSOverlay;
  /** Login accounts; password only where a level teaches password auth. */
  accounts?: { name: string; password?: string }[];
  services?: TerminalServiceSpec[];
  journal?: TerminalJournalEntry[];
  firewall?: TerminalFirewallSpec;
}

/** Declarative win condition, checked against live engine state after every command. */
export interface StateGoal {
  /** Host id; defaults to the primary (first) host. */
  host?: string;
  file?: string;
  /** Regex (multiline) the file must match. */
  matches?: string;
  /** Regex the file must NOT match. */
  absentMatches?: string;
  fileExists?: boolean;
  fileAbsent?: boolean;
  service?: string;
  serviceState?: 'active' | 'inactive' | 'failed';
  serviceEnabled?: boolean;
  firewallRule?: { action: 'allow' | 'deny'; port: number; present?: boolean };
  firewallDefaultIncoming?: 'allow' | 'deny';
}
