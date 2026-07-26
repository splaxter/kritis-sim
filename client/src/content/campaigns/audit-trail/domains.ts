/**
 * AUDIT TRAIL — the five audit domains and the ending derivation.
 *
 * The domain conditions are the SINGLE source of truth: the Act-4 audit-question
 * beats branch on these exact objects (branchCondition), and the ending is
 * derived from how many of them hold. See design §5.2 / §5.3.
 */
import { FlagCondition, checkFlagCondition } from '@kritis/shared';

export type AuditDomain = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

/** The negative flags that, on their own, collapse the whole case (Rächer). */
export const RAECHER_FLAGS = ['mailbox_scope_exceeded', 'personal_data_shared_broadly'] as const;

export interface AuditDomainDef {
  label: string;
  condition: FlagCondition;
}

export const AUDIT_DOMAINS: Record<AuditDomain, AuditDomainDef> = {
  D1: {
    label: 'Zurechenbarkeit',
    condition: { all: ['shared_account_documented', 'mailbox_auditing_enabled'] },
  },
  D2: {
    label: 'Beweiskette',
    condition: {
      all: ['finding_reported', 'authorization_documented', 'export_documented', 'evidence_hashed'],
      none: ['mailbox_scope_exceeded', 'personal_data_shared_broadly'],
    },
  },
  D3: {
    label: 'BASTION',
    condition: { all: ['bastion_delivery_found', 'handover_mail_sent'] },
  },
  D4: {
    label: 'Dokumentation',
    condition: { all: ['onboarding_documented', 'ticket_tamper_documented'] },
  },
  D5: {
    label: 'Deeskalation',
    condition: { all: ['bjorg_warning_preserved'], none: ['bjorg_provoked'] },
  },
};

const DOMAIN_ORDER: AuditDomain[] = ['D1', 'D2', 'D3', 'D4', 'D5'];

export function isDomainSatisfied(domain: AuditDomain, flags: Record<string, boolean>): boolean {
  return checkFlagCondition(AUDIT_DOMAINS[domain].condition, flags);
}

/** The domains that hold, in D1…D5 order. */
export function satisfiedDomains(flags: Record<string, boolean>): AuditDomain[] {
  return DOMAIN_ORDER.filter(d => isDomainSatisfied(d, flags));
}

// Slug is 'rache' so the internal id carries no ASCII umlaut digraph — keeps
// the orthography guard strong. The display title is still "Der Rächer"
// (see endings.ts).
export type AuditTrailEnding = 'rache' | 'stille' | 'profi';

/**
 * Ending derivation (design §5.3), by priority:
 *  1. Rächer — any Scope-/broad-share flag set (collapses the case regardless
 *     of how good the rest of the documentation is).
 *  2. Stille — fewer than 2 domains hold (nothing to show).
 *  3. Profi — at least 4 of 5 domains hold, D1 AND D2 among them.
 *  4. Stille (lower variant) — the remaining 2–3-domain cases; same ending id,
 *     a different epilogue distinguishes it (see buildEpilogue).
 */
export function deriveAuditTrailEnding(flags: Record<string, boolean>): AuditTrailEnding {
  if (RAECHER_FLAGS.some(f => flags[f])) return 'rache';
  const domains = satisfiedDomains(flags);
  if (domains.length < 2) return 'stille';
  if (domains.length >= 4 && domains.includes('D1') && domains.includes('D2')) return 'profi';
  return 'stille';
}
