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
  /** Run flags set the moment this command matches — immediately and
   *  independent of solving the level (survives cancel/ESC). Used for
   *  "the player looked at X" markers, e.g. the AUDIT TRAIL mailbox honeypot. */
  setsFlags?: string[];
}

/**
 * Matches an entry in the shell's execution log (`CommandAttempt`). Plain
 * serializable data so content stays data.
 */
export interface CommandMatcher {
  /** Regex tested against the recorded `CommandAttempt.command`. */
  pattern: string;
  /** attempted (default) = any exit; succeeded = exit 0; failed = exit ≠ 0. */
  outcome?: 'attempted' | 'succeeded' | 'failed';
  /** When set, the matched attempt must have opened an SSH session with this auth method. */
  authMethod?: 'publickey' | 'password';
  /**
   * Compile the pattern case-insensitively. Use for PowerShell command
   * assertions — real PowerShell resolves `get-mailbox` and `Get-Mailbox`
   * alike, and the execution log records commands AS TYPED.
   */
  ignoreCase?: boolean;
}

/**
 * One authored after-action rule. All declared `when` sub-conditions are
 * AND-verknüpft; rules are evaluated top-to-bottom and the first match wins
 * (author orders risk before praise). See `selectFeedback`.
 */
export interface FeedbackRule {
  when: {
    /** At least one attempt matches. */
    commandMatches?: CommandMatcher;
    /** No attempt matches. */
    commandAbsent?: CommandMatcher;
    /** Each pair holds iff `first` and `second` both match and first.sequence < second.sequence. */
    commandBefore?: Array<{ first: CommandMatcher; second: CommandMatcher }>;
    /** Count of matching attempts must fall within [min, max]. */
    commandCount?: { matcher: CommandMatcher; min?: number; max?: number };
  };
  /** The line appended to the solve banner (emoji ⚠/⚡/✓ live in the text). */
  text: string;
}

export interface TerminalSolution {
  commands: string[];
  allRequired: boolean;
  resultText: string;
  skillGain: Partial<Skills>;
  effects: EventEffects;
  /** When set, these state conditions must ALL hold (in addition to `commands`, which may be []). */
  stateGoals?: StateGoal[];
  /** Optional after-action feedback: a narrative line reflecting HOW the level was solved. */
  feedback?: FeedbackRule[];
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
  /** Exchange mailboxes seeded onto the PRIMARY host (EXCH01 audit levels). */
  mailboxes?: TerminalMailboxSpec[];
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

/** Seeds one Exchange mailbox onto a host. auditEnabled defaults to false. */
export interface TerminalMailboxSpec {
  name: string;
  displayName?: string;
  auditEnabled?: boolean;
  auditLogAgeLimit?: string;
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
  /**
   * Owning user of the process behind this socket; defaults to 'root' when
   * materialised. A non-root shell cannot `kill` a socket it does not own
   * (needs `sudo`) — mirrors real signal permissions.
   */
  user?: string;
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
  /** Owning user of the process; defaults to 'root'. See NetListener.user. */
  user?: string;
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
  /** Exchange mailboxes on this host. */
  mailboxes?: TerminalMailboxSpec[];
}

/** Declarative win condition, checked against live engine state after every command. */
export interface StateGoal {
  /**
   * Asserts BYTE EQUALITY between `file` and this second path (both must
   * exist and be regular files on the goal's host). The chain-of-custody
   * check: a secured copy only counts when it really equals the original —
   * `echo fake > kopie` can never satisfy it.
   */
  sameContentAs?: string;
  /**
   * Asserts that `file` (the hash list) contains a LINE carrying both the
   * ACTUAL SHA-256 hex digest of this path's CURRENT content AND the file's
   * name (basename or full path — sha256sum writes the path as typed). The
   * digest is computed live by the evaluator, so a hand-invented 64-hex
   * string never matches, and a bare digest without the filename is not a
   * protocol entry.
   */
  sha256Of?: string;
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
  /**
   * `from` scopes the assertion: undefined keeps the legacy semantics
   * (present:true needs a GLOBAL rule; present:false fails on ANY matching
   * rule, scoped included). A string requires a rule scoped to exactly that
   * source ("the bastion door exists"). `null` matches only UNSCOPED rules —
   * `{ action:'allow', port:22, from:null, present:false }` asserts "no
   * globally open SSH" while a bastion-scoped allow may remain.
   */
  firewallRule?: { action: 'allow' | 'deny'; port: number; present?: boolean; from?: string | null };
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
  /**
   * Exchange mailbox audit state on the host (defaults to the base host). Names
   * the mailbox identity; `auditEnabled` pins whether audit logging is on. On
   * on-prem Exchange this is toggled per mailbox via `Set-Mailbox -AuditEnabled`,
   * so a level requires `{ mailbox: 'm.mueller', auditEnabled: true }`.
   */
  mailbox?: string;
  auditEnabled?: boolean;
  /**
   * Session-aware: at least one actually-EXECUTED pipeline command in the REAL
   * shell's execution log must match. Matching is per stage — one individual
   * pipe command with its OWN exit code and host — so neither a short-circuited
   * decoy (`ok-cmd || echo target-name`) nor a pipeline decoy
   * (`cat missing-target | echo ok`) can satisfy the matcher via a combined
   * command string. With `outcome: 'succeeded'` a `cat notizen.txt` from the
   * wrong directory exits non-zero and does NOT satisfy the goal — the same
   * command after a proper `cd` (or with a valid absolute path) does. This is
   * the mechanism for "the player really read/inspected X" win conditions.
   * Canned scenario commands bypass the shell and are never in this log.
   *
   * Authoring note: a raw command-line regex cannot know the ROLE of a
   * filename token (`grep -v ziel.txt andere.txt` uses the target as a search
   * PATTERN and never reads it) — for "the player really read file X" goals
   * use `fileRead` instead; `commandRan` is for command-shaped assertions
   * (specific tool invoked, a restart ran, an option was used).
   *
   * `host` semantics follow the session-aware convention (like `loggedIn`):
   * UNSET means "on any host"; a set `host` counts only stages executed there.
   */
  commandRan?: CommandMatcher;
  /**
   * Operand-bound copy proof: met iff cp/Copy-Item ACTUALLY copied matching
   * canonical paths (a directory destination is recorded as its final
   * dest/basename form). Omitted fields match any — but a bound goal like
   * `{ fileCopied: { from: original, to: kopie } }` is only satisfied by THE
   * copy, never by copying some unrelated file. Host follows the
   * session-aware convention (unset = any host).
   */
  fileCopied?: { from?: string; to?: string };
  /**
   * Operand-bound hash proof: met iff a hash tool (sha256sum family,
   * Get-FileHash) ACTUALLY digested this canonical path — with the named
   * algorithm when `algorithm` is set (normalized: 'sha256' | 'sha1' | 'md5';
   * omitted = any), and with its stdout redirected into exactly the canonical
   * `writtenTo` file when that is set (`>` or `>>` — the link between "digest
   * was computed" and "the digest landed in THIS hash list"). Hashing a
   * different file — even one with identical content — a different algorithm,
   * or into a throwaway file does not satisfy it; pair with `sha256Of` to
   * also pin the digest's presence and labelling in the list.
   */
  hashComputed?: { path: string; algorithm?: string; writtenTo?: string };
  /**
   * Operand-bound inspection proof: met iff Get-Mailbox actually RESOLVED
   * this identity (case-insensitive). Extra positional arguments the cmdlet
   * ignores are never recorded, so 'Get-Mailbox other target' does not count
   * as inspecting 'target'.
   */
  mailboxInspected?: string;
  /**
   * Session-aware, SEMANTIC read proof: met iff a command successfully read
   * THIS file's content during the terminal session. `fileRead` is the
   * canonical absolute path. The engine records reads at the vfs boundary
   * commands actually read through (cat/tac/head/tail/nl/less/grep/awk/sed/
   * Get-Content/Select-String/…, plus `< file` input redirection), so the
   * proof is independent of how the command line was phrased: `grep -v
   * ziel.txt andere.txt` does NOT satisfy a goal on ziel.txt (the name is
   * only a search pattern), while any real read — relative after `cd`,
   * absolute, piped onward, via awk — does. Failed reads (wrong cwd, missing
   * file, permission denied) are never recorded. `host` follows the
   * session-aware convention: UNSET = any host, set = reads ON that host.
   */
  fileRead?: string;
}
