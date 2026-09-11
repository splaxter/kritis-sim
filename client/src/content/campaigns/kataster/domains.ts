/**
 * DAS KATASTER — the five register domains and the ending derivation.
 *
 * The domain conditions are the SINGLE source of truth: the Act-4 audit-question
 * beats branch on these exact objects (branchCondition), and the ending is
 * derived from how many of them hold. See design §5.2 / §5.3.
 *
 * The design point of the split: K1 is the only purely diligent domain (four
 * sources found). K2–K5 each demand a decision against the comfortable option —
 * naming a gap instead of filling a row, handing a duty to the department that
 * actually owes it, getting an assignment confirmed in writing.
 */
import { FlagCondition, checkFlagCondition } from '@kritis/shared';

export type KatasterDomain = 'K1' | 'K2' | 'K3' | 'K4' | 'K5';

/**
 * The flags that, on their own, collapse the whole case. Both are lies rather
 * than gaps: an owner nobody agreed to, and a gap that was smoothed over.
 * A gap is a finding; a false statement is a different category.
 */
export const GRUENE_LISTE_FLAGS = ['kat_owner_fabricated', 'kat_gap_concealed'] as const;

/**
 * Orphan markers. NOT part of any domain — they record a STATE (this duty left
 * Act 2 without an owner and without being flagged), not an achievement. Act 3
 * branches its consequence beats on them.
 */
export const ORPHAN_FLAGS = ['kat_orphan_sla', 'kat_orphan_license'] as const;

/** Bonus flag: read only by the epilogue, never by a domain (see endings.ts). */
export const BONUS_FLAGS = ['kat_reminder_live'] as const;

export interface KatasterDomainDef {
  label: string;
  condition: FlagCondition;
}

export const KATASTER_DOMAINS: Record<KatasterDomain, KatasterDomainDef> = {
  K1: {
    label: 'Vollständigkeit',
    condition: {
      all: ['kat_source_contract', 'kat_source_license', 'kat_source_dv', 'kat_source_law'],
    },
  },
  K2: {
    label: 'Zurechenbarkeit',
    condition: { all: ['kat_no_silent_orphan', 'kat_ownership_confirmed'] },
  },
  K3: {
    label: 'Nachweisfähigkeit',
    condition: { all: ['kat_stale_owner_found', 'kat_evidence_linked'] },
  },
  K4: {
    label: 'Ehrlichkeit',
    condition: {
      all: ['kat_gap_reported'],
      none: ['kat_owner_fabricated', 'kat_gap_concealed'],
    },
  },
  K5: {
    label: 'Eskalation',
    condition: { all: ['kat_gaps_escalated', 'kat_purchasing_informed'] },
  },
};

const DOMAIN_ORDER: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];

export function isDomainSatisfied(
  domain: KatasterDomain,
  flags: Record<string, boolean>
): boolean {
  return checkFlagCondition(KATASTER_DOMAINS[domain].condition, flags);
}

/** The domains that hold, in K1…K5 order. */
export function satisfiedDomains(flags: Record<string, boolean>): KatasterDomain[] {
  return DOMAIN_ORDER.filter((d) => isDomainSatisfied(d, flags));
}

/**
 * Ending ids are ASCII slugs so the orthography guard stays strong; the display
 * titles carry the umlauts ("Die grüne Liste").
 */
export type KatasterEnding = 'gruene_liste' | 'ordner' | 'aufpasser';

/**
 * Ending derivation (design §5.3), by priority:
 *
 *  1. Die grüne Liste — a fabricated owner or a concealed gap. This collapses
 *     the case no matter how good the rest is: the register was green and the
 *     plant was not. The gap would have been a defect; the STATEMENT is a
 *     finding.
 *  2. Der halb leere Ordner — fewer than 2 domains hold. The register exists
 *     and does not describe the operation.
 *  3. Der Aufpasser — at least 4 of 5 domains, K2 AND K4 among them. Owning the
 *     duties (K2) and being honest about the gaps (K4) are the two the good
 *     ending cannot be bought without.
 *  4. Der halb leere Ordner (lower variant) — the remaining 2–3-domain cases;
 *     same ending id, a different epilogue distinguishes it (buildEpilogue).
 */
export function deriveKatasterEnding(flags: Record<string, boolean>): KatasterEnding {
  if (GRUENE_LISTE_FLAGS.some((f) => flags[f])) return 'gruene_liste';
  const domains = satisfiedDomains(flags);
  if (domains.length < 2) return 'ordner';
  if (domains.length >= 4 && domains.includes('K2') && domains.includes('K4')) return 'aufpasser';
  return 'ordner';
}
