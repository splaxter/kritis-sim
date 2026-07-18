/**
 * Shared unit-mutation core: systemctl start/stop/restart and the ansible
 * service module both apply unit state through here so preconditions,
 * journal writes and sshdEffective refresh stay in one place.
 */
import { TerminalUnitPrecondition } from '@kritis/shared';
import { HostState, SystemdUnitState, canonicalUnitName, derivedUnitPid } from './hosts';

export type UnitTargetState = 'started' | 'stopped' | 'restarted';

export interface UnitActionOutcome {
  ok: boolean;
  changed: boolean;
  failMessage?: string;
}

const shortUnitName = (unit: string): string => unit.replace(/\.service$/, '');

// Deterministic journal clock: fixed in-game date, minutes advance per entry.
// Starts AFTER the newest seeded entry so appended lines always sort last.
// Clamped at 23:59 — the clock must never roll into an hour-24 timestamp.
const LAST_MINUTE = 23 * 60 + 59;
const journalClocks = new WeakMap<HostState, number>();

function seedJournalClock(host: HostState): number {
  let mins = 9 * 60 + 15;
  for (const e of host.journal) {
    const m = e.ts.match(/(\d{2}):(\d{2}):\d{2}$/);
    if (m) mins = Math.max(mins, parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + 1);
  }
  return Math.min(mins, LAST_MINUTE);
}

export function nextJournalTs(host: HostState): string {
  const totalMins = journalClocks.get(host) ?? seedJournalClock(host);
  journalClocks.set(host, Math.min(totalMins + 1, LAST_MINUTE));
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `2026-07-18 ${hh}:${mm}:00`;
}

/** True when the precondition HOLDS (the unit may start). */
function preconditionHolds(host: HostState, unit: SystemdUnitState, pre: TerminalUnitPrecondition): boolean {
  if (pre.unitFileMatches !== undefined) {
    // Checked against the LOADED snapshot — daemon-reload refreshes it.
    const matched = new RegExp(pre.unitFileMatches, 'm').test(unit.loadedUnitContent ?? '');
    return pre.absent ? !matched : matched;
  }
  if (pre.file) {
    const read = host.vfs.readFile(pre.file);
    if (!read.ok) return pre.absent === true;
    if (pre.matches !== undefined) {
      const matched = new RegExp(pre.matches, 'm').test(read.value);
      return pre.absent ? !matched : matched;
    }
    return pre.absent !== true;
  }
  return true;
}

/**
 * Attempt to start (or restart) a unit: evaluates startRequires, mutates
 * active/sub/pid, writes the journal, refreshes sshdEffective for ssh.
 * Always attempts — callers decide whether an already-active unit skips.
 */
export function attemptStart(host: HostState, unit: SystemdUnitState): { ok: boolean; failMessage?: string } {
  const failing = (unit.startRequires ?? []).find(p => !preconditionHolds(host, unit, p));
  if (failing) {
    unit.active = 'failed';
    unit.sub = 'failed';
    unit.pid = undefined;
    host.appendJournal({
      ts: nextJournalTs(host),
      unit: shortUnitName(unit.unit),
      priority: 'err',
      message: failing.failMessage,
    });
    return { ok: false, failMessage: failing.failMessage };
  }
  unit.active = 'active';
  unit.sub = 'running';
  // Restore a pid after stop→start; derived so status and journalctl agree.
  unit.pid ??= derivedUnitPid(unit.unit);
  host.appendJournal({
    ts: nextJournalTs(host),
    unit: shortUnitName(unit.unit),
    priority: 'info',
    message: `Started ${unit.desc}.`,
  });
  if (unit.unit === 'ssh.service') {
    host.refreshSshdEffective();
  }
  return { ok: true };
}

/** Stop a running unit: mutates state and journals. */
export function stopUnit(host: HostState, unit: SystemdUnitState): void {
  unit.active = 'inactive';
  unit.sub = 'dead';
  unit.pid = undefined;
  host.appendJournal({
    ts: nextJournalTs(host),
    unit: shortUnitName(unit.unit),
    priority: 'info',
    message: `Stopped ${unit.desc}.`,
  });
}

/**
 * Idempotent state application (ansible semantics): started skips an active
 * unit, stopped skips an inactive one, restarted always attempts.
 */
export function applyUnitState(host: HostState, unitName: string, target: UnitTargetState): UnitActionOutcome {
  const unit = host.services.find(u => u.unit === canonicalUnitName(unitName));
  if (!unit) {
    return { ok: false, changed: false, failMessage: `Could not find the requested service ${unitName}: host` };
  }

  if (target === 'stopped') {
    if (unit.active !== 'active') return { ok: true, changed: false };
    stopUnit(host, unit);
    return { ok: true, changed: true };
  }

  if (target === 'started' && unit.active === 'active') {
    return { ok: true, changed: false };
  }

  const start = attemptStart(host, unit);
  if (!start.ok) {
    return { ok: false, changed: false, failMessage: start.failMessage };
  }
  return { ok: true, changed: true };
}
