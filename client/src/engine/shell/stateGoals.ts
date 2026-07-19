/**
 * Declarative stateGoal evaluation — checks authored StateGoals against the
 * live host state of a ShellEngine. Every set field must hold (AND); the
 * evaluator never throws, bad input just yields false.
 */
import { StateGoal } from '@kritis/shared';
import { ShellEngine } from './ShellEngine';
import { HostState, UfwRule, canonicalUnitName } from './hosts';

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
  );
  // serviceEnabled: false is a legal assertion — check "given", not truthiness.
  const serviceAssertion = goal.service !== undefined && (
    goal.serviceState !== undefined || goal.serviceEnabled !== undefined
  );
  return fileAssertion
    || serviceAssertion
    || goal.firewallRule !== undefined
    || goal.firewallDefaultIncoming !== undefined
    || goal.listenerAbsent !== undefined
    || goal.listenerPresent !== undefined;
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
  // Checks the CONFIGURED default policy; firewall.enabled is deliberately
  // not part of the goal (levels gate enablement via commands/flags instead).
  if (goal.firewallDefaultIncoming !== undefined
      && host.firewall.defaultIncoming !== goal.firewallDefaultIncoming) {
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
      && checkFirewallGoals(host, goal)
      && checkNetworkGoals(host, goal);
  } catch {
    return false;
  }
}

/** All goals must hold; an empty list never counts as solved. */
export function checkStateGoals(engine: ShellEngine, goals: StateGoal[]): boolean {
  return goals.length > 0 && goals.every(goal => checkStateGoal(engine, goal));
}
