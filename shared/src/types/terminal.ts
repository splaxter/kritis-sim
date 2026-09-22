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
  /**
   * Ordnet jedem Hinweis den Loesungsschritt zu, zu dem er FUEHRT.
   *
   * `hintFor[i]` ist das Token aus `solutions[].commands`, das der Hinweis i
   * erarbeiten soll; `null` markiert einen Zusatztipp ohne eigenen Schritt.
   *
   * WARUM ES DAS GIBT: Die automatische Hilfe im Einsteigermodus braucht eine
   * Antwort auf „welcher Hinweis gehoert zum aktuellen Schritt?". Ohne
   * Zuordnung gibt es nur zwei schlechte Regeln — nach der Uhr weiterzaehlen
   * (dann lobt der Mentor Schritte, die es nicht gab) oder die Zahl der
   * erfuellten Tokens als Index nehmen (dann bleibt die Hilfe stehen, sobald
   * Hinweise und Schritte nicht 1:1 stehen: das Netzwerk-Tutorial hat fuenf
   * Hinweise fuer drei Schritte, und der noetige Port-Hinweis war automatisch
   * NIE erreichbar).
   *
   * Fehlt das Feld, faellt die Automatik auf „hoechstens ein Hinweis je
   * tatsaechlich ausgefuehrtem Befehl" zurueck.
   */
  hintFor?: (string | null)[];
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
  /** nftables ruleset seeded onto the PRIMARY host. */
  nft?: TerminalNftSpec;
  /** Listening sockets seeded onto the PRIMARY host (single-host net levels). */
  listeners?: NetListener[];
  /** Established connections seeded onto the PRIMARY host (single-host net levels). */
  connections?: NetConnection[];
  /** Exchange mailboxes seeded onto the PRIMARY host (EXCH01 audit levels). */
  mailboxes?: TerminalMailboxSpec[];
  /** Prozesstabelle des PRIMAeR-Hosts (`ps`, `Get-Process`). */
  processes?: TerminalProcessSpec[];
  /** Das Netzbild des Levels — Erreichbarkeit und Namensaufloesung. */
  net?: TerminalNetSpec;
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
  /**
   * Die Sockets, die dieser Dienst oeffnet. Sie werden beim Start angelegt und
   * beim Stoppen entfernt — und beim Saeen nur dann, wenn die Einheit aktiv
   * ist.
   *
   * WARUM: Dienst und Port sind EIN Ding. Wer beide getrennt pflegt, kann sie
   * auseinanderlaufen lassen: ein Level mit totem Dienst und offenem Port ist
   * eine Messung, die der Spieler nicht erklaeren kann, und ein Neustart, nach
   * dem der Port zu bleibt, macht die Reparatur unbeweisbar.
   */
  listens?: { proto?: 'tcp' | 'udp'; port: number; address?: string }[];
}

export interface TerminalFirewallSpec {
  enabled?: boolean;
  defaultIncoming?: 'allow' | 'deny';
  rules?: { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }[];
}

/**
 * A chain in a seeded nftables ruleset. `base` makes it a BASE chain: it hangs
 * on a netfilter hook and has a policy, which is what decides a packet that no
 * rule matched. A chain without `base` is a regular chain — only reachable via
 * `jump`/`goto`, which is exactly the shape that makes a rule invisible to a
 * management UI while still being reached (or not) by traffic.
 */
export interface TerminalNftChainSpec {
  name: string;
  base?: { hook: 'input' | 'output' | 'forward'; priority?: number; policy: 'accept' | 'drop' };
  /**
   * Rule bodies in REAL nft syntax, e.g.
   * `'ip saddr 203.0.113.0/24 tcp dport 3389 accept'` or `'jump webadmin'`.
   * They are parsed by the same parser `nft add rule` uses, so a level cannot
   * seed a ruleset the player could not have typed. An unparseable seed throws
   * at build time — content bug, caught by the level guards.
   */
  rules?: string[];
}

/** An nftables ruleset seeded onto a host (one table; that is what levels need). */
export interface TerminalNftSpec {
  family?: 'inet' | 'ip' | 'ip6';
  /** Table name; defaults to 'filter'. */
  table?: string;
  chains: TerminalNftChainSpec[];
}

/**
 * Ein Ziel, das KEINE eigene Maschine des Levels ist — eine Internet-Adresse,
 * ein Geraet ohne Shell, eine Gegenstelle. Registrierte Hosts brauchen keinen
 * Eintrag: fuer die entscheidet ihr eigener Zustand (Regelwerk und Lauscher).
 */
export interface TerminalNetTargetSpec {
  /** Adresse oder Name, so wie der Spieler ihn tippt. */
  host: string;
  /** Adresse, falls `host` ein Name ist. */
  ip?: string;
  /** Antwortet auf ICMP? Ohne Angabe: ja. */
  ping?: boolean;
  /** Offene TCP-Ports; alles andere gilt als abgelehnt (RST). */
  openPorts?: number[];
  /** Ports, die schweigen statt abzulehnen — davor haengt ein Filter. */
  filteredPorts?: number[];
  /** Dienstnamen je Port, wo der Standard nicht passt. */
  dienste?: Record<number, string>;
}

/**
 * Das Netzbild eines Levels: was erreichbar ist und wie Namen aufgeloest
 * werden. Befragt von `ping`, `nc`, `Test-NetConnection`, `nslookup` und
 * `Resolve-DnsName` — EIN Modell fuer alle, damit eine Messung nicht davon
 * abhaengt, mit welchem Werkzeug sie gemacht wurde.
 *
 * ACHTUNG: Saeht ein Level dieses Feld, gehoert ihm das Bild GANZ. Was hier
 * nicht steht und kein registrierter Host ist, ist unerreichbar — dieselbe
 * Regel wie bei `listeners`.
 */
export interface TerminalNetSpec {
  /** Namensaufloesung: Name -> Adresse. */
  records?: Record<string, string>;
  /** Die befragten Resolver; ohne Angabe 8.8.8.8. */
  dnsServers?: string[];
  /** Resolver, die nicht antworten — `nslookup` laeuft in den Timeout. */
  dnsDown?: string[];
  targets?: TerminalNetTargetSpec[];
}

/** Ein Prozess, wie das Spiel ihn modelliert: Kennung, Name, Eigentuemer. */
export interface TerminalProcessSpec {
  pid: number;
  /** Prozessname ohne Pfad ('PsExec64', 'mysqld'). */
  name: string;
  /** Eigentuemer; ohne Angabe 'root' (Linux) bzw. der angemeldete Nutzer. */
  user?: string;
  /** Vollstaendige Befehlszeile, wie `ps -f` sie zeigt. */
  cmd?: string;
  /** CPU-Zeit in Sekunden, fuer die Anzeige. */
  cpu?: number;
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
  /** nftables ruleset on this host (`nft list ruleset`). */
  nft?: TerminalNftSpec;
  /** Listening sockets on this host; when omitted a default table is used. */
  listeners?: NetListener[];
  /** Established connections on this host; when omitted a default table is used. */
  connections?: NetConnection[];
  /** Exchange mailboxes on this host. */
  mailboxes?: TerminalMailboxSpec[];
  /** Prozesstabelle dieser Maschine (`ps`, `Get-Process`). */
  processes?: TerminalProcessSpec[];
}

/** Ein Feld eines `schluessel: wert`-Berichts (siehe StateGoal.reportFields). */
export interface ReportField {
  /** Der Schluessel, wie er im Auftrag angesagt ist (klein, ASCII). */
  key: string;
  /** Regex, auf den der WERT passen muss. */
  matches?: string;
  /** Regex, den der Wert NICHT enthalten darf. */
  absentMatches?: string;
  /** Der Wert als kommagetrennte Liste: diese Eintraege muessen vorkommen. */
  requiredItems?: string[];
  /** ... und diese nicht. */
  forbiddenItems?: string[];
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
   *
   * `exclusive: true` (only with `present:true`) additionally requires the
   * scoped set to be the ONLY allow rules for this port: no global door AND no
   * second scoped source. `{ action:'allow', port:22, from:'10.0.30.10',
   * present:true, exclusive:true }` asserts "port 22 is reachable from exactly
   * this one source" — a second `allow from <other>` leaves it unsatisfied.
   */
  firewallRule?: { action: 'allow' | 'deny'; port: number; present?: boolean; from?: string | null; exclusive?: boolean };
  firewallDefaultIncoming?: 'allow' | 'deny';
  /**
   * Asserts the firewall's enabled state (`ufw enable` / `ufw disable`). Rules
   * and the default policy are only CONFIGURATION until the firewall is
   * enabled — a hardening level uses `firewallEnabled: true` to require the
   * player to actually activate the wall.
   */
  firewallEnabled?: boolean;
  /**
   * Sends a PACKET through the host's nftables ruleset and asserts the verdict.
   *
   * This is a semantic goal on purpose: it asks what the box would DO, not how
   * the player phrased the change. Deleting the offending rule, overruling it
   * with a `drop` in front of it, or moving the jump — all three are right,
   * because all three change the verdict. The counterpart matters just as
   * much: pairing a `drop` expectation with an `accept` one for the traffic
   * that must survive is what stops `nft flush ruleset` from passing as a fix.
   *
   * `state` defaults to 'new' (a fresh connection attempt), `proto` to 'tcp',
   * `hook` to 'input'.
   */
  nftVerdict?: {
    from: string;
    /**
     * Destination address. Needed at a ZONE BOUNDARY, where the question is
     * never just "may this source in" but "may this source reach THAT". A rule
     * carrying a destination does not match a packet without one.
     */
    to?: string;
    port: number;
    proto?: 'tcp' | 'udp';
    state?: string;
    hook?: 'input' | 'output' | 'forward';
    expect: 'accept' | 'drop' | 'reject';
  };
  /** True iff NO listener on the host binds this port (e.g. a killed rogue). */
  listenerAbsent?: { port: number };
  /** True iff at least one listener on the host binds this port. */
  listenerPresent?: { port: number };
  /**
   * Bestehende Verbindungen des Hosts. `peer` vergleicht die Gegenstelle —
   * als 'ip:port' oder nur als IP, dann zaehlt jede Verbindung dorthin.
   * `port` meint den LOKALEN Port, `program` den Prozessnamen.
   *
   * Das Gegenstueck zu listenerAbsent: Eine offene Sitzung kappt man nicht,
   * indem man einen Port schliesst, sondern indem man den Prozess beendet —
   * und genau das soll die Bedingung pruefen, nicht die Schreibweise des
   * Befehls.
   */
  connectionAbsent?: { peer?: string; port?: number; program?: string };
  /** Dieselbe Auswahl, aber es muss mindestens eine solche Verbindung GEBEN. */
  connectionPresent?: { peer?: string; port?: number; program?: string };
  /**
   * Prozesstabelle des Hosts. `name` vergleicht ohne Ruecksicht auf Gross-
   * schreibung und ohne Pfad ('PsExec64'), `pid` die Kennung.
   */
  processAbsent?: { name?: string; pid?: number };
  /** Dieselbe Auswahl, aber der Prozess muss LAUFEN (bewahrende Bedingung). */
  processPresent?: { name?: string; pid?: number };
  /**
   * Session-aware: the player must have successfully SSH-logged into a host
   * during this terminal session. `host` names the login TARGET (id, hostname,
   * short hostname or IP); when omitted, any recorded login satisfies the goal.
   * `method` pins the auth method — a `publickey`-required goal is NOT met by a
   * password login, which is what makes "log in without a password" a real win
   * condition. `fromHost` pins the SOURCE the login was made from (id/hostname/
   * IP) — the win condition for "reach the target THROUGH the bastion": an ssh
   * to waage01 launched from bastion01 counts, a direct one does not.
   * `viaScopedRule` requires the login to have been admitted specifically by a
   * source-SCOPED firewall allow (target enabled, default deny, NO global
   * allow) — i.e. the target was ALREADY locked to bastion-only when the login
   * happened. This makes the proof order-aware: a hop made BEFORE the lockdown
   * (while the port was globally open) does not count. Logins persist after
   * `exit` (you still logged in).
   */
  loggedIn?: {
    host?: string;
    method?: 'publickey' | 'password';
    fromHost?: string;
    viaScopedRule?: boolean;
  };
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
   * Prueft `file` als BERICHT aus `schluessel: wert`-Zeilen statt als Fliesstext.
   *
   * WARUM ES DAS GIBT: Ein `matches` laeuft ueber die ganze Datei. Damit laesst
   * sich nicht ausdruecken, was ein Bericht ausmacht — dass jede Angabe GENAU
   * EINMAL dasteht und fuer sich stimmt. Eine Regex-Pruefung nahm deshalb
   * Berichte an, die sich selbst widersprachen („clients: fehlgeschlagen" und
   * darunter „clients: ok"), liess EINE Zeile ZWEI Bedingungen erfuellen
   * („offen: Nachweis des Wiederherstellungstests" galt als zwei Befunde) und
   * verlangte an anderer Stelle eine Wortstellung, die der Auftrag gar nicht
   * fordert.
   *
   * Regeln:
   * - Eine Zeile ist ein Feld, wenn sie auf `schluessel: wert` passt. Der
   *   Schluessel wird klein geschrieben verglichen.
   * - Jeder hier genannte Schluessel muss GENAU EINMAL vorkommen. Zweimal ist
   *   ein Widerspruch, keinmal eine fehlende Angabe — beides faellt durch.
   * - `matches`/`absentMatches` pruefen den WERT (ohne Schluessel, getrimmt),
   *   nicht die ganze Datei. Sie sind daher frei von Wortstellung.
   * - `items` liest den Wert als kommagetrennte LISTE und vergleicht die
   *   Eintraege als Ganzes (klein geschrieben, getrimmt). So zaehlt
   *   „nachweis des wiederherstellungstests" nicht als Eintrag
   *   „wiederherstellungstest".
   */
  reportFields?: ReportField[];
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
