import { describe, it, expect } from 'vitest';
import { checkFlagCondition } from '@kritis/shared';
import {
  AUDIT_DOMAINS,
  satisfiedDomains,
  isDomainSatisfied,
  deriveAuditTrailEnding,
  AuditDomain,
} from './domains';
import { buildAuditTrailEpilogue } from './endings';

const flags = (...set: string[]): Record<string, boolean> =>
  Object.fromEntries(set.map(f => [f, true]));

// Minimal flag sets that satisfy each domain in isolation.
const D1 = ['shared_account_documented', 'mailbox_auditing_enabled'];
const D2 = ['finding_reported', 'authorization_documented', 'export_documented', 'evidence_hashed'];
const D3 = ['bastion_delivery_found', 'handover_mail_sent'];
const D4 = ['onboarding_documented', 'ticket_tamper_documented'];
const D5 = ['bjorg_warning_preserved'];

describe('audit domains', () => {
  it('each domain holds exactly when its flags are present', () => {
    expect(isDomainSatisfied('D1', flags(...D1))).toBe(true);
    expect(isDomainSatisfied('D1', flags('shared_account_documented'))).toBe(false);
    expect(isDomainSatisfied('D2', flags(...D2))).toBe(true);
    expect(isDomainSatisfied('D3', flags(...D3))).toBe(true);
    expect(isDomainSatisfied('D4', flags(...D4))).toBe(true);
    expect(isDomainSatisfied('D5', flags(...D5))).toBe(true);
  });

  it('D2 is broken by either negative flag even with all positives', () => {
    expect(isDomainSatisfied('D2', flags(...D2, 'mailbox_scope_exceeded'))).toBe(false);
    expect(isDomainSatisfied('D2', flags(...D2, 'personal_data_shared_broadly'))).toBe(false);
  });

  it('D5 is broken by bjorg_provoked', () => {
    expect(isDomainSatisfied('D5', flags(...D5, 'bjorg_provoked'))).toBe(false);
  });

  it('satisfiedDomains returns the holding domains in D1..D5 order', () => {
    expect(satisfiedDomains(flags(...D4, ...D1))).toEqual(['D1', 'D4']);
  });

  it('the domain conditions are the objects the Act-4 beats branch on', () => {
    // Sanity: a beat using AUDIT_DOMAINS.D1.condition branches identically to
    // isDomainSatisfied — no divergence between branching and ending logic.
    const f = flags(...D1);
    expect(checkFlagCondition(AUDIT_DOMAINS.D1.condition, f)).toBe(isDomainSatisfied('D1', f));
  });
});

describe('deriveAuditTrailEnding (priority §5.3)', () => {
  const all = (...groups: string[][]) => flags(...groups.flat());

  it('Rächer wins whenever a scope/broad-share flag is set — even with a perfect case', () => {
    expect(deriveAuditTrailEnding(all(D1, D2, D3, D4, D5, ['mailbox_scope_exceeded']))).toBe('rache');
    expect(deriveAuditTrailEnding(all(D1, D2, D3, D4, D5, ['personal_data_shared_broadly']))).toBe('rache');
  });

  it('Stille when fewer than 2 domains hold', () => {
    expect(deriveAuditTrailEnding(flags())).toBe('stille');
    expect(deriveAuditTrailEnding(flags(...D4))).toBe('stille'); // exactly 1
  });

  it('Profi needs ≥4 domains including D1 and D2', () => {
    expect(deriveAuditTrailEnding(all(D1, D2, D3, D4))).toBe('profi'); // 4 incl D1+D2
    expect(deriveAuditTrailEnding(all(D1, D2, D3, D4, D5))).toBe('profi'); // all 5
  });

  it('4 domains WITHOUT D1 or D2 is not Profi (falls to Stille lower variant)', () => {
    // D2,D3,D4,D5 hold, D1 missing → 4 domains but not D1 → not Profi.
    expect(deriveAuditTrailEnding(all(D2, D3, D4, D5))).toBe('stille');
  });

  it('2–3 domains is the lower Stille variant', () => {
    expect(deriveAuditTrailEnding(all(D1, D4))).toBe('stille'); // 2
    expect(deriveAuditTrailEnding(all(D1, D3, D4))).toBe('stille'); // 3
  });
});

describe('buildAuditTrailEpilogue', () => {
  it('Rächer epilogue names the three concrete damages + Art. 33 DSGVO wording', () => {
    const text = buildAuditTrailEpilogue(flags('mailbox_scope_exceeded', ...D1, ...D4));
    expect(text).toContain('Vertrauensschaden');
    expect(text).toContain('Datenschutzvorfall');
    expect(text).toContain('Art. 33 DSGVO');
    expect(text).toContain('Eskalationsschaden');
  });

  it('D1 epilogue only claims the retirement is decided, never that the account is gone', () => {
    const text = buildAuditTrailEpilogue(flags(...D1, ...D2, ...D3, ...D4)); // profi
    expect(text).toContain('Abstellung');
    expect(text).not.toMatch(/Konto ist (weg|entfernt|gelöscht)/i);
  });

  it('D3 base text says "freigegeben"; bastion_live upgrades to "in Betrieb"', () => {
    const base = buildAuditTrailEpilogue(flags(...D1, ...D2, ...D3, ...D4));
    expect(base).toContain('freigegeben');
    expect(base).not.toContain('in Betrieb');
    const live = buildAuditTrailEpilogue(flags(...D1, ...D2, ...D3, ...D4, 'bastion_live'));
    expect(live).toContain('in Betrieb');
  });

  it('the <2-domain Stille epilogue is the "wer nicht dokumentiert" beat', () => {
    const text = buildAuditTrailEpilogue(flags());
    expect(text).toContain('Wer nicht dokumentiert, existiert nicht');
  });

  it('the 2–3-domain Stille epilogue names both what held and the gaps', () => {
    const text = buildAuditTrailEpilogue(flags(...D1, ...D4)); // D1+D4 hold
    expect(text).toContain('Was fehlt, bleibt hängen');
    expect(text).toContain('BASTION'); // an unsatisfied domain label is listed
  });
});
