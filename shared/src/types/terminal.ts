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
  /** `mode` is an optional 3-digit octal string (e.g. '600') applied via chmod
   *  after the file is written — needed to seed mode-600 SSH private keys. */
  files?: { path: string; content: string; mode?: string }[];
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
  /**
   * Custom systemd services seeded onto the PRIMARY (local) host — single-host
   * levels that need a failing/inactive service without declaring a separate
   * `hosts` entry. Merged over the default unit table.
   */
  services?: TerminalServiceSpec[];
  /** Journal entries seeded onto the PRIMARY host (single-host forensic levels). */
  journal?: TerminalJournalEntry[];
  /** Firewall state seeded onto the PRIMARY host. */
  firewall?: TerminalFirewallSpec;
  /** Listening sockets seeded onto the PRIMARY host (single-host net levels). */
  listeners?: NetListener[];
  /** Established connections seeded onto the PRIMARY host (single-host net levels). */
  connections?: NetConnection[];
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
  /**
   * Files created (empty) on the host VFS when this unit starts successfully.
   * Lets one service provide a resource (e.g. a DB socket) that another unit's
   * `startRequires` depends on — powers dependency-chain levels.
   */
  createsOnStart?: string[];
}

export interface TerminalFirewallSpec {
  enabled?: boolean;
  defaultIncoming?: 'allow' | 'deny';
  rules?: { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }[];
}

/** A listening socket shown by `ss`/`netstat` — a level can author a rogue one. */
export interface NetListener {
  proto: 'tcp' | 'udp';
  port: number;
  /** Bind address; defaults to '0.0.0.0' (all interfaces). */
  address?: string;
  pid?: number;
  program?: string;
}

/** An established connection shown by `ss -tp`/`netstat` — e.g. a backchannel. */
export interface NetConnection {
  proto: 'tcp' | 'udp';
  localPort: number;
  /** Remote endpoint as 'ip:port'. */
  peer: string;
  /** Socket state; defaults to 'ESTAB'. */
  state?: string;
  pid?: number;
  program?: string;
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
  /** Listening sockets on this host; when omitted a default table is used. */
  listeners?: NetListener[];
  /** Established connections on this host; when omitted a default table is used. */
  connections?: NetConnection[];
}

/** Declarative win condition, checked against live engine state after every command. */
export interface StateGoal {
  /**
   * Host addressed by id, full hostname, short hostname (before the first
   * '.'), or IP. Defaults to the primary (base) host.
   */
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
  /**
   * Asserts the firewall's enabled state (`ufw enable` / `ufw disable`). Rules
   * and the default policy are only CONFIGURATION until the firewall is
   * enabled — a hardening level uses `firewallEnabled: true` to require the
   * player to actually activate the wall.
   */
  firewallEnabled?: boolean;
  /** True iff NO listener on the host binds this port (e.g. a killed rogue). */
  listenerAbsent?: { port: number };
  /** True iff at least one listener on the host binds this port. */
  listenerPresent?: { port: number };
  /**
   * Session-aware: the player must have successfully SSH-logged into a host
   * during this terminal session. `host` names the login TARGET (id, hostname,
   * short hostname or IP); when omitted, any recorded login satisfies the goal.
   * `method` pins the auth method — a `publickey`-required goal is NOT met by a
   * password login, which is what makes "log in without a password" a real win
   * condition. Logins persist after `exit` (you still logged in).
   */
  loggedIn?: { host?: string; method?: 'publickey' | 'password' };
  /**
   * The RUNNING sshd's effective config on the host (defaults to the base
   * host). Editing /etc/ssh/sshd_config hardens the file, but the daemon only
   * picks it up on `systemctl restart/reload ssh` — so this goal is unmet until
   * the service is restarted, unlike a file-content goal. Each provided field
   * is compared for equality.
   */
  sshdEffective?: { host?: string; permitRootLogin?: boolean; passwordAuthentication?: boolean };
  /**
   * Session-aware: the player must have invoked `ansible-playbook` during this
   * terminal session with a matching recorded run. `playbook` matches on the
   * file's basename (e.g. 'harden-fleet.yml', however the player typed the
   * path); `mode` distinguishes `--syntax-check` / `--check` / a real apply;
   * `ok` pins the exit status (true = exit 0). Every provided field must
   * match one single recorded run; omitted fields match anything.
   */
  ansibleRan?: { playbook?: string; mode?: 'syntax-check' | 'check' | 'apply'; ok?: boolean };
}
