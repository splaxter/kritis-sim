/**
 * Declarative stateGoal evaluation — checks authored StateGoals against the
 * live host state of a ShellEngine. Every set field must hold (AND); the
 * evaluator never throws, bad input just yields false.
 */
import { StateGoal } from '@kritis/shared';
import { ShellEngine } from './ShellEngine';
import { HostState, UfwRule, canonicalUnitName } from './hosts';
import { attemptMatches } from './feedback';
import { sha256Hex, toBytes } from './commands/linux/extended';

/** Compile an authored regex; invalid patterns yield null instead of throwing. */
function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'm');
  } catch {
    return null;
  }
}

/**
 * A goal must anchor at least one real assertion — `{}`, a bare `file`, or a
 * `matches` without its `file` are authoring mistakes and never count as met.
 */
function hasAssertion(goal: StateGoal): boolean {
  const fileAssertion = goal.file !== undefined && (
    goal.matches !== undefined
    || goal.absentMatches !== undefined
    || goal.fileExists !== undefined
    || goal.fileAbsent !== undefined
    || goal.sameContentAs !== undefined
    || goal.sha256Of !== undefined
  );
  // serviceEnabled: false is a legal assertion — check "given", not truthiness.
  const serviceAssertion = goal.service !== undefined && (
    goal.serviceState !== undefined || goal.serviceEnabled !== undefined
  );
  // auditEnabled: false is a legal assertion — check "given", not truthiness.
  const mailboxAssertion = goal.mailbox !== undefined && goal.auditEnabled !== undefined;
  return fileAssertion
    || serviceAssertion
    || mailboxAssertion
    || goal.firewallRule !== undefined
    || goal.firewallDefaultIncoming !== undefined
    || goal.firewallEnabled !== undefined
    || goal.listenerAbsent !== undefined
    || goal.listenerPresent !== undefined
    // loggedIn/sshdEffective/ansibleRan are non-vacuous even with empty
    // sub-objects: a bare `{loggedIn:{}}` asserts "logged into any host",
    // `{ansibleRan:{}}` asserts "ran any playbook" — both must be evaluated,
    // not rejected as shapeless.
    || goal.loggedIn !== undefined
    || goal.sshdEffective !== undefined
    || goal.ansibleRan !== undefined
    || goal.commandRan !== undefined
    || goal.fileRead !== undefined
    // A bare {} for these is non-vacuous ("any copy happened") like ansibleRan.
    || goal.fileCopied !== undefined
    || goal.hashComputed !== undefined
    || goal.mailboxInspected !== undefined;
}

const warnedGoals = new Set<string>();

/** Warn once per unique malformed goal so authoring bugs surface without spam. */
function warnVacuousGoal(goal: StateGoal): void {
  const key = JSON.stringify(goal);
  if (warnedGoals.has(key)) return;
  warnedGoals.add(key);
  console.warn(`stateGoals: goal has no evaluable assertion, treated as unmet: ${key}`);
}

function checkFileGoals(host: HostState, goal: StateGoal): boolean {
  if (!goal.file) return true;
  const { vfs } = host;

  // Explicit false inverts the assertion: fileExists:false ⇔ must NOT exist,
  // fileAbsent:false ⇔ MUST exist. Undefined means "not asserted".
  if (goal.fileExists !== undefined && vfs.exists(goal.file) !== goal.fileExists) return false;
  if (goal.fileAbsent !== undefined && vfs.exists(goal.file) === goal.fileAbsent) return false;

  if (goal.matches !== undefined || goal.absentMatches !== undefined) {
    // Goal evaluation is omniscient: stat bypasses in-game read permissions,
    // so a root-owned 600 file is still checkable from an unprivileged session.
    const st = vfs.stat(goal.file);
    // NOTE: absentMatches requires the file to EXIST and be clean — a missing
    // file fails the goal. A level that wants "file is gone" uses fileAbsent.
    if (!st.ok || st.value.type === 'directory') return false;
    const content = st.value.content ?? '';
    if (goal.matches !== undefined) {
      const re = safeRegex(goal.matches);
      if (!re || !re.test(content)) return false;
    }
    if (goal.absentMatches !== undefined) {
      const re = safeRegex(goal.absentMatches);
      if (!re || re.test(content)) return false;
    }
  }

  // Chain-of-custody: `file` must be byte-equal to this second path. Both
  // must exist as regular files — a forged `echo fake > kopie` never passes.
  if (goal.sameContentAs !== undefined) {
    const a = vfs.stat(goal.file);
    const b = vfs.stat(goal.sameContentAs);
    if (!a.ok || a.value.type === 'directory') return false;
    if (!b.ok || b.value.type === 'directory') return false;
    if ((a.value.content ?? '') !== (b.value.content ?? '')) return false;
  }

  // Hash-list integrity: `file` must contain a LINE carrying both the ACTUAL
  // SHA-256 hex digest of the target's CURRENT content AND the target's name
  // (basename or full path — sha256sum writes the path as typed). Computed
  // live, so an invented 64-hex string never matches, and a bare digest
  // without the filename is not a protocol entry.
  if (goal.sha256Of !== undefined) {
    const list = vfs.stat(goal.file);
    const target = vfs.stat(goal.sha256Of);
    if (!list.ok || list.value.type === 'directory') return false;
    if (!target.ok || target.value.type === 'directory') return false;
    const digest = sha256Hex(toBytes(target.value.content ?? ''));
    const base = goal.sha256Of.split(/[/\\]/).filter(Boolean).pop() ?? '';
    const hasEntry = (list.value.content ?? '')
      .split('\n')
      .some((line) => line.includes(digest) && base !== '' && line.includes(base));
    if (!hasEntry) return false;
  }

  return true;
}

function checkServiceGoals(host: HostState, goal: StateGoal): boolean {
  if (!goal.service) return true;
  const wanted = canonicalUnitName(goal.service);
  const unit = host.services.find(s => canonicalUnitName(s.unit) === wanted);
  if (!unit) return false;
  if (goal.serviceState !== undefined && unit.active !== goal.serviceState) return false;
  if (goal.serviceEnabled !== undefined) {
    const isEnabled = unit.enabled === 'enabled';
    if (isEnabled !== goal.serviceEnabled) return false;
  }
  return true;
}

function checkMailboxGoals(host: HostState, goal: StateGoal): boolean {
  if (!goal.mailbox) return true;
  const mb = host.mailboxes.find(m => m.name.toLowerCase() === goal.mailbox!.toLowerCase());
  if (!mb) return false;
  if (goal.auditEnabled !== undefined && mb.auditEnabled !== goal.auditEnabled) return false;
  return true;
}

/**
 * Goals have no proto field — matching is proto-insensitive by design: a
 * proto-less stored rule and a 22/tcp rule both satisfy a port-22 goal.
 */
function ruleMatches(rule: UfwRule, goal: NonNullable<StateGoal['firewallRule']>): boolean {
  return rule.action === goal.action && rule.port === goal.port;
}

function checkFirewallGoals(host: HostState, goal: StateGoal): boolean {
  if (goal.firewallRule) {
    const fwGoal = goal.firewallRule;
    const present = fwGoal.present ?? true;
    const matching = host.firewall.rules.filter(r => ruleMatches(r, fwGoal));
    if (present) {
      // A from-scoped rule (`allow from 10.0.30.5 to any port 22`) does NOT
      // count as "port 22 open" — present:true needs a global rule.
      if (!matching.some(r => !r.from)) return false;
    } else {
      // present:false means the hole is fully closed: ANY matching rule —
      // from-scoped included — leaves the goal unmet.
      if (matching.length > 0) return false;
    }
  }
  // Checks the CONFIGURED default policy; pair with `firewallEnabled: true`
  // when the level requires the wall to actually be up.
  if (goal.firewallDefaultIncoming !== undefined
      && host.firewall.defaultIncoming !== goal.firewallDefaultIncoming) {
    return false;
  }
  if (goal.firewallEnabled !== undefined && host.firewall.enabled !== goal.firewallEnabled) {
    return false;
  }
  return true;
}

function checkNetworkGoals(host: HostState, goal: StateGoal): boolean {
  if (goal.listenerAbsent) {
    const { port } = goal.listenerAbsent;
    if (host.listeners.some(l => l.port === port)) return false;
  }
  if (goal.listenerPresent) {
    const { port } = goal.listenerPresent;
    if (!host.listeners.some(l => l.port === port)) return false;
  }
  return true;
}

/**
 * Effective (running) sshd config on the host — proves `systemctl restart ssh`
 * was actually run. A file-content goal is met by editing sshd_config alone;
 * this one only flips after the daemon reloaded (host.refreshSshdEffective).
 * An inner `sshdEffective.host` overrides the goal-level host (like loggedIn).
 */
function checkSshdEffectiveGoal(engine: ShellEngine, host: HostState, goal: StateGoal): boolean {
  if (!goal.sshdEffective) return true;
  const g = goal.sshdEffective;
  const target = g.host !== undefined ? engine.resolveHost(g.host) : host;
  if (!target) return false;
  const eff = target.sshdEffective;
  if (g.permitRootLogin !== undefined && eff.permitRootLogin !== g.permitRootLogin) return false;
  if (g.passwordAuthentication !== undefined && eff.passwordAuthentication !== g.passwordAuthentication) return false;
  return true;
}

/**
 * Session-aware login goal. `host` names the login TARGET (resolved to its id);
 * when omitted, ANY recorded login matching `method` satisfies the goal. A
 * `publickey` method is not met by a password login and vice versa.
 */
function checkLoggedInGoal(engine: ShellEngine, goal: StateGoal): boolean {
  if (!goal.loggedIn) return true;
  const { host, method } = goal.loggedIn;
  if (host !== undefined) {
    const resolved = engine.resolveHost(host);
    if (!resolved) return false;
    return engine.hasLoggedIn(resolved.id, method);
  }
  return engine.hasLoggedIn(undefined, method);
}

/**
 * Session-aware ansible goal: ONE recorded ansible-playbook run must match all
 * provided fields (playbook is basename-matched; omitted fields match any).
 */
function checkAnsibleRanGoal(engine: ShellEngine, goal: StateGoal): boolean {
  if (!goal.ansibleRan) return true;
  return engine.hasAnsibleRun(goal.ansibleRan);
}

/**
 * Session-aware command goal: at least one actually-EXECUTED pipeline command
 * in the REAL execution log matches (pattern AND outcome AND authMethod — same
 * matcher semantics as FeedbackRule). Matching is per STAGE — one individual
 * pipe command with its own exit code and host: a chained decoy
 * (`ok-cmd || echo target-name`) never executes its second segment, and a
 * pipeline decoy (`cat missing-target | echo ok`) records the failing cat and
 * the succeeding echo SEPARATELY, so neither can satisfy the matcher via a
 * combined command string. `outcome: 'succeeded'` inherits true cwd/path
 * semantics — a relative read only counts after a matching `cd`. Canned
 * scenario commands never appear in this log.
 *
 * Host: like the other session-aware goals (loggedIn), an UNSET goal.host means
 * "any host"; a set host restricts matching to stages executed ON that host.
 */
function checkCommandRanGoal(engine: ShellEngine, goal: StateGoal): boolean {
  if (!goal.commandRan) return true;
  const matcher = goal.commandRan;
  const targetHost = goal.host ? engine.resolveHost(goal.host)?.id : undefined;
  if (goal.host && !targetHost) return false;
  // NOTE: for "player really read file X" proofs use `fileRead` — a regex over
  // raw command lines cannot know a filename token's role (grep pattern vs
  // read operand).
  return engine.getExecutionLog().some((a) => {
    // Attempts hand-built without stages (tests, legacy) fall back to the
    // outer entry; engine-recorded attempts always carry their stages.
    const stages = a.stages?.length
      ? a.stages
      : [{ command: a.command, exitCode: a.exitCode, host: a.hostBefore }];
    return stages.some(
      (s) =>
        (!targetHost || s.host === targetHost) &&
        attemptMatches({ ...a, command: s.command, exitCode: s.exitCode }, matcher)
    );
  });
}

/**
 * Session-aware SEMANTIC read proof: the engine's file-read record contains
 * every successful content read a command performed (canonical path + host),
 * so this is independent of command-line phrasing — the only way to satisfy
 * it is an actual read of the actual file. Host follows the session-aware
 * convention: unset = any host, set = reads ON that host.
 */
function checkFileReadGoal(engine: ShellEngine, goal: StateGoal): boolean {
  if (!goal.fileRead) return true;
  const targetHost = goal.host ? engine.resolveHost(goal.host)?.id : undefined;
  if (goal.host && !targetHost) return false;
  return engine.hasFileRead(goal.fileRead, targetHost);
}

/** Resolve goal.host to an id for session-aware records; null = unresolvable. */
function resolveGoalHostId(engine: ShellEngine, goal: StateGoal): string | null | undefined {
  if (!goal.host) return undefined; // unset = any host
  return engine.resolveHost(goal.host)?.id ?? null;
}

/**
 * Operand-bound tool records — the goals bind to what cp / the hash tools /
 * Get-Mailbox ACTUALLY operated on, so an unrelated invocation of the same
 * tool can never stand in for the required one.
 */
function checkToolRecordGoals(engine: ShellEngine, goal: StateGoal): boolean {
  if (goal.fileCopied === undefined && goal.hashComputed === undefined && goal.mailboxInspected === undefined) {
    return true;
  }
  const hostId = resolveGoalHostId(engine, goal);
  if (hostId === null) return false;
  if (goal.fileCopied !== undefined) {
    if (!engine.hasFileCopy(goal.fileCopied.from, goal.fileCopied.to, hostId)) return false;
  }
  if (goal.hashComputed !== undefined) {
    if (!engine.hasHashComputed(goal.hashComputed.path, goal.hashComputed.algorithm, hostId)) {
      return false;
    }
  }
  if (goal.mailboxInspected !== undefined) {
    if (!engine.hasMailboxInspected(goal.mailboxInspected, hostId)) return false;
  }
  return true;
}

/** True iff every set field of the goal holds on the addressed host. */
export function checkStateGoal(engine: ShellEngine, goal: StateGoal): boolean {
  try {
    if (!hasAssertion(goal)) {
      warnVacuousGoal(goal);
      return false;
    }
    // goal.host may be an id, hostname, short hostname, or IP; unset → base host.
    const host = goal.host ? engine.resolveHost(goal.host) : engine.getBaseHost();
    if (!host) return false;
    return checkFileGoals(host, goal)
      && checkServiceGoals(host, goal)
      && checkMailboxGoals(host, goal)
      && checkFirewallGoals(host, goal)
      && checkNetworkGoals(host, goal)
      // sshdEffective and loggedIn may name their OWN target host, falling
      // back to goal.host / the base host like the checks above.
      && checkSshdEffectiveGoal(engine, host, goal)
      && checkLoggedInGoal(engine, goal)
      && checkAnsibleRanGoal(engine, goal)
      && checkCommandRanGoal(engine, goal)
      && checkFileReadGoal(engine, goal)
      && checkToolRecordGoals(engine, goal);
  } catch {
    return false;
  }
}

/** All goals must hold; an empty list never counts as solved. */
export function checkStateGoals(engine: ShellEngine, goals: StateGoal[]): boolean {
  return goals.length > 0 && goals.every(goal => checkStateGoal(engine, goal));
}
