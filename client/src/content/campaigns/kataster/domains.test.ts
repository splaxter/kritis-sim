import { describe, it, expect } from 'vitest';
import { flagsInCondition } from '@kritis/shared';
import {
  KATASTER_DOMAINS,
  KatasterDomain,
  GRUENE_LISTE_FLAGS,
  BONUS_FLAGS,
  ORPHAN_FLAGS,
  deriveKatasterEnding,
  satisfiedDomains,
  isDomainSatisfied,
} from './domains';

const ALL: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];

/** Flags that make exactly the named domains hold, and nothing else. */
function flagsFor(domains: KatasterDomain[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const d of domains) {
    // Only positive clauses need setting; `none` clauses hold by absence.
    const cond = KATASTER_DOMAINS[d].condition;
    const positive = typeof cond === 'string' ? [cond] : (cond.all ?? []);
    for (const f of positive) out[f] = true;
  }
  return out;
}

describe('Kataster-Domänen — Bedingungen', () => {
  it('jede Domäne ist genau dann erfüllt, wenn ihre Flags gesetzt sind', () => {
    for (const d of ALL) {
      expect(isDomainSatisfied(d, {}), `${d} ohne Flags`).toBe(false);
      expect(isDomainSatisfied(d, flagsFor([d])), `${d} mit Flags`).toBe(true);
    }
  });

  it('K4 kippt durch JEDES der beiden Lügen-Flags', () => {
    expect(isDomainSatisfied('K4', flagsFor(['K4']))).toBe(true);
    for (const bad of GRUENE_LISTE_FLAGS) {
      expect(isDomainSatisfied('K4', { ...flagsFor(['K4']), [bad]: true }), bad).toBe(false);
    }
  });

  it('Verwaisungs- und Bonus-Flags gehören KEINER Domäne an', () => {
    const domainFlags = new Set(ALL.flatMap((d) => flagsInCondition(KATASTER_DOMAINS[d].condition)));
    for (const f of [...ORPHAN_FLAGS, ...BONUS_FLAGS]) {
      expect(domainFlags.has(f), `${f} darf keine Domäne beeinflussen`).toBe(false);
    }
  });

  it('satisfiedDomains liefert K1…K5 in Reihenfolge', () => {
    expect(satisfiedDomains(flagsFor(['K3', 'K1', 'K5']))).toEqual(['K1', 'K3', 'K5']);
  });
});

describe('Ending-Ableitung — Prioritätsreihenfolge', () => {
  it('„Die grüne Liste" schlägt alles, auch ein perfektes Kataster', () => {
    for (const bad of GRUENE_LISTE_FLAGS) {
      const flags = { ...flagsFor(ALL), [bad]: true };
      expect(deriveKatasterEnding(flags), bad).toBe('gruene_liste');
    }
  });

  it('weniger als 2 Domänen → „Der halb leere Ordner"', () => {
    expect(deriveKatasterEnding({})).toBe('ordner');
    for (const d of ALL) {
      expect(deriveKatasterEnding(flagsFor([d])), d).toBe('ordner');
    }
  });

  it('2–3 Domänen → weiterhin „Der halb leere Ordner"', () => {
    expect(deriveKatasterEnding(flagsFor(['K1', 'K2']))).toBe('ordner');
    expect(deriveKatasterEnding(flagsFor(['K2', 'K4', 'K5']))).toBe('ordner');
  });

  it('4–5 Domänen mit K2 UND K4 → „Der Aufpasser"', () => {
    expect(deriveKatasterEnding(flagsFor(['K1', 'K2', 'K3', 'K4']))).toBe('aufpasser');
    expect(deriveKatasterEnding(flagsFor(ALL))).toBe('aufpasser');
  });

  /** K2 und K4 sind nicht verhandelbar — Fleiß allein kauft das gute Ende nicht. */
  it('4 Domänen OHNE K2 oder OHNE K4 reichen NICHT', () => {
    expect(deriveKatasterEnding(flagsFor(['K1', 'K3', 'K4', 'K5']))).toBe('ordner'); // kein K2
    expect(deriveKatasterEnding(flagsFor(['K1', 'K2', 'K3', 'K5']))).toBe('ordner'); // kein K4
  });

  it('das Bonus-Flag verändert das Ending nicht', () => {
    const base = flagsFor(['K1', 'K2', 'K3', 'K4']);
    expect(deriveKatasterEnding({ ...base, kat_reminder_live: true })).toBe(
      deriveKatasterEnding(base)
    );
  });
});
