import { describe, it, expect } from 'vitest';
import { allEvents } from '../index';

/**
 * Integrity guard for the chain system. A typo'd targetEventId only surfaces at
 * runtime as a console.warn + a silently-skipped consequence, so lock it down:
 * every chain trigger must point at a real event, and every consequence event
 * must be reachable from at least one trigger.
 */
const ids = new Set(allEvents.map((e) => e.id));

function allTriggerTargets(): { from: string; target: string }[] {
  const out: { from: string; target: string }[] = [];
  for (const e of allEvents) {
    for (const t of e.chainTriggers ?? []) out.push({ from: e.id, target: t.targetEventId });
    for (const c of e.choices) {
      for (const t of c.chainTriggers ?? []) out.push({ from: `${e.id}:${c.id}`, target: t.targetEventId });
    }
  }
  return out;
}

describe('chain integrity', () => {
  it('every chainTrigger targets an existing event', () => {
    const broken = allTriggerTargets().filter((t) => !ids.has(t.target));
    expect(broken, `dangling chain targets: ${JSON.stringify(broken)}`).toEqual([]);
  });

  it('every isChainEvent consequence is reachable from at least one trigger', () => {
    const targeted = new Set(allTriggerTargets().map((t) => t.target));
    const orphans = allEvents.filter((e) => e.isChainEvent && !targeted.has(e.id)).map((e) => e.id);
    expect(orphans, `orphan chain consequences (never triggered): ${JSON.stringify(orphans)}`).toEqual([]);
  });

  it('the backup red-thread wires start → payoff/disaster', () => {
    const audit = allEvents.find((e) => e.id === 'evt_backup_audit');
    expect(audit, 'evt_backup_audit missing').toBeTruthy();
    const targets = (audit!.choices ?? []).flatMap((c) => (c.chainTriggers ?? []).map((t) => t.targetEventId));
    expect(targets).toContain('evt_backup_payoff');
    expect(targets).toContain('evt_backup_disaster');
  });

  it('the audit-prep red-thread wires start → payoff/blamage', () => {
    const start = allEvents.find((e) => e.id === 'evt_auditprep_start');
    expect(start, 'evt_auditprep_start missing').toBeTruthy();
    expect(start!.requiredModes).toEqual(['kritis']);
    const targets = (start!.choices ?? []).flatMap((c) => (c.chainTriggers ?? []).map((t) => t.targetEventId));
    expect(targets).toContain('evt_auditprep_payoff');
    expect(targets).toContain('evt_auditprep_blamage');
  });

  it('the supply-chain red-thread wires start → payoff/kompromittiert', () => {
    const start = allEvents.find((e) => e.id === 'evt_lieferkette_start');
    expect(start, 'evt_lieferkette_start missing').toBeTruthy();
    expect(start!.requiredModes).toEqual(['kritis']);
    const targets = (start!.choices ?? []).flatMap((c) => (c.chainTriggers ?? []).map((t) => t.targetEventId));
    expect(targets).toContain('evt_lieferkette_payoff');
    expect(targets).toContain('evt_lieferkette_kompromittiert');
  });
});
