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

function checkFileGoals(host: HostState, goal: StateGoal): boolean {
  if (!goal.file) return true;
  const { vfs } = host;

  if (goal.fileExists === true && !vfs.exists(goal.file)) return false;
  if (goal.fileAbsent === true && vfs.exists(goal.file)) return false;

  if (goal.matches !== undefined || goal.absentMatches !== undefined) {
    const read = vfs.readFile(goal.file);
    // NOTE: absentMatches requires the file to EXIST and be clean — a missing
    // file fails the goal. A level that wants "file is gone" uses fileAbsent.
    if (!read.ok) return false;
    if (goal.matches !== undefined) {
      const re = safeRegex(goal.matches);
      if (!re || !re.test(read.value)) return false;
    }
    if (goal.absentMatches !== undefined) {
      const re = safeRegex(goal.absentMatches);
      if (!re || re.test(read.value)) return false;
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
function ruleMatches(rule: UfwRule, goal: { action: 'allow' | 'deny'; port: number }): boolean {
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

/** True iff every set field of the goal holds on the addressed host. */
export function checkStateGoal(engine: ShellEngine, goal: StateGoal): boolean {
  try {
    // goal.host may be an id, hostname, short hostname, or IP; unset → base host.
    const host = goal.host ? engine.resolveHost(goal.host) : engine.getBaseHost();
    if (!host) return false;
    return checkFileGoals(host, goal)
      && checkServiceGoals(host, goal)
      && checkFirewallGoals(host, goal);
  } catch {
    return false;
  }
}

/** All goals must hold; an empty list never counts as solved. */
export function checkStateGoals(engine: ShellEngine, goals: StateGoal[]): boolean {
  return goals.length > 0 && goals.every(goal => checkStateGoal(engine, goal));
}
