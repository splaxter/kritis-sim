import { describe, it, expect } from 'vitest';
import { GameEvent, flagsInCondition } from '@kritis/shared';
import { auditTrailCampaign } from './index';
import { auditTrailChapters } from './chapters';
import { auditTrailStoryEvents } from './events';
import { AUDIT_DOMAINS, RAECHER_FLAGS, AuditDomain } from './domains';
import { buildAuditTrailEpilogue } from './endings';
import { AUDIT_TRAIL_CHARACTERS } from './characters';
import { adventureStoryEvents } from '../../adventure/story-events';
import { adventureSidequestEvents } from '../../adventure/sidequest-events';
import { adventureChapters } from '../../adventure/chapters';

// GameEvent doesn't type the level payloads — the flag collector needs them.
type AnyEvent = GameEvent & {
  terminalContext?: { commands?: { setsFlags?: string[] }[] };
  guiContext?: { solutions?: { setsFlags?: string[] }[] };
  chainTriggers?: unknown[];
};

const atEvents = auditTrailStoryEvents as AnyEvent[];
const atEventIds = new Set(atEvents.map((e) => e.id));

// ── flag universes ─────────────────────────────────────────────────────────
/** Every flag an AUDIT TRAIL event can set, from ALL three source kinds:
 *  choice.setsFlags, terminal command setsFlags (honeypot), GUI solution
 *  setsFlags (Explorer). mailCompose events set flags through their choices. */
function collectSetFlags(events: AnyEvent[]): Set<string> {
  const set = new Set<string>();
  for (const e of events) {
    for (const c of e.choices ?? []) for (const f of c.setsFlags ?? []) set.add(f);
    for (const cmd of e.terminalContext?.commands ?? []) for (const f of cmd.setsFlags ?? []) set.add(f);
    for (const s of e.guiContext?.solutions ?? []) for (const f of s.setsFlags ?? []) set.add(f);
  }
  return set;
}

const atSetFlags = collectSetFlags(atEvents);

const atBranchFlags = new Set<string>();
for (const ch of auditTrailChapters) {
  for (const beat of ch.storyBeats) {
    for (const f of flagsInCondition(beat.branchCondition)) atBranchFlags.add(f);
  }
}

const domainFlags = new Set<string>();
for (const d of Object.values(AUDIT_DOMAINS)) {
  for (const f of flagsInCondition(d.condition)) domainFlags.add(f);
}

// Read anywhere = beat branches + domain conditions + Rächer collapse +
// the one epilogue-only read (bastion_live, functionally verified below).
const atReadFlags = new Set<string>([...atBranchFlags, ...domainFlags, ...RAECHER_FLAGS, 'bastion_live']);

// Design §5.1 — the authoritative flag table. If a flag is added/renamed in
// content, this list (and the design doc) must move with it.
const SPEC_FLAGS: string[] = [
  'onboarding_documented',
  'shared_account_documented',
  'ticket_tamper_documented',
  'mailbox_auditing_enabled',
  'authorization_documented',
  'finding_reported',
  'evidence_hashed',
  'export_documented',
  'mailbox_scope_exceeded',
  'personal_data_shared_broadly',
  'bastion_delivery_found',
  'handover_mail_sent',
  'bastion_live',
  'bjorg_provoked',
  'bjorg_warning_preserved',
];

// Set by content but read by no condition — documented markers, not wiring
// bugs. audit_mandate_accepted: both intro choices set it (the player accepted
// the mandate either way); it exists as a save-state marker only. If a flag
// leaves this list, wire it up or delete it consciously.
const KNOWN_WRITE_ONLY_FLAGS: string[] = ['audit_mandate_accepted'];

describe('AUDIT TRAIL campaign consistency', () => {
  it('every flag referenced in a FlagCondition is set by at least one event/level', () => {
    const dead: string[] = [];
    for (const f of [...atBranchFlags, ...domainFlags]) {
      if (!atSetFlags.has(f)) dead.push(f);
    }
    expect(dead, `condition flags never set:\n${dead.join('\n')}`).toEqual([]);
  });

  it('every §5.1 flag is set by content AND read by a domain (bastion_live: epilogue)', () => {
    const unset = SPEC_FLAGS.filter((f) => !atSetFlags.has(f));
    expect(unset, `§5.1 flags never set:\n${unset.join('\n')}`).toEqual([]);
    const unread = SPEC_FLAGS.filter((f) => f !== 'bastion_live' && !domainFlags.has(f));
    expect(unread, `§5.1 flags read by no domain:\n${unread.join('\n')}`).toEqual([]);
  });

  it('bastion_live is really read: it upgrades the D3 epilogue line', () => {
    // The only §5.1 flag outside the domain conditions — prove the read
    // functionally instead of trusting a comment.
    const profiFlags = Object.fromEntries(
      SPEC_FLAGS.filter((f) => !RAECHER_FLAGS.includes(f as (typeof RAECHER_FLAGS)[number]) && f !== 'bastion_live')
        .map((f) => [f, true])
    );
    const withoutBastion = buildAuditTrailEpilogue(profiFlags);
    const withBastion = buildAuditTrailEpilogue({ ...profiFlags, bastion_live: true });
    expect(withBastion).not.toBe(withoutBastion);
  });

  it('flags set by content are read somewhere (or documented write-only)', () => {
    const writeOnly = [...atSetFlags].filter((f) => !atReadFlags.has(f)).sort();
    expect(writeOnly).toEqual(KNOWN_WRITE_ONLY_FLAGS);
  });

  it('all beat eventIds and alternates resolve inside the campaign (self-contained)', () => {
    const dangling: string[] = [];
    for (const ch of auditTrailChapters) {
      for (const beat of ch.storyBeats) {
        if (!atEventIds.has(beat.eventId)) dangling.push(`${ch.id}/${beat.id} → "${beat.eventId}"`);
        if (beat.alternateEventId && !atEventIds.has(beat.alternateEventId)) {
          dangling.push(`${ch.id}/${beat.id} (alt) → "${beat.alternateEventId}"`);
        }
      }
    }
    expect(dangling, `dangling beat refs:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('no sidequests are registered anywhere (V1 scope)', () => {
    expect(auditTrailCampaign.sidequests).toEqual([]);
    expect(auditTrailCampaign.sidequestEvents).toEqual([]);
    for (const ch of auditTrailChapters) {
      expect(ch.sidequests, `${ch.id} embeds sidequests`).toEqual([]);
    }
  });

  it('no chain triggers: story mode never serves pendingChainEvents', () => {
    // getActivatedChainEvents is consumed only by eventEngine.getNextEvent;
    // the App's story path resolves exclusively through getNextStoryContent.
    // A chainTrigger on an AUDIT TRAIL event would schedule an event that can
    // never fire. (The §5.1 "bjorg_provoked → Bert-Vorwarnung" chain idea is
    // therefore consciously NOT built; D5/F5_fail is the payoff.)
    const offenders: string[] = [];
    for (const e of atEvents) {
      if ((e.chainTriggers ?? []).length > 0) offenders.push(e.id);
      for (const c of e.choices ?? []) {
        if ((c as { chainTriggers?: unknown[] }).chainTriggers?.length) offenders.push(`${e.id}/${c.id}`);
      }
    }
    expect(offenders, `chain triggers can never fire in story mode:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('event ids are unique and namespaced at_*', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of atEvents) {
      if (seen.has(e.id)) dupes.push(e.id);
      seen.add(e.id);
      expect(e.id, `"${e.id}" must be at_-namespaced`).toMatch(/^at_/);
    }
    expect(dupes, `duplicate ids:\n${dupes.join('\n')}`).toEqual([]);
  });

  it('references only known campaign characters', () => {
    const known = new Set(AUDIT_TRAIL_CHARACTERS.map((c) => c.id));
    const bad: string[] = [];
    for (const e of atEvents) {
      for (const ch of e.involvedCharacters ?? []) {
        if (!known.has(ch)) bad.push(`${e.id} → "${ch}"`);
      }
    }
    expect(bad, `unknown characters:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('AUDIT TRAIL is a fresh state — no Probezeit carry-over', () => {
  // Probation universe: what probation story content sets and what its
  // chapters branch on. (Approximation: derived-ending reads live in
  // probationEnding.ts and use the same flag names probation sets.)
  const probationSetFlags = collectSetFlags(
    [...adventureStoryEvents, ...adventureSidequestEvents] as AnyEvent[]
  );
  const probationBranchFlags = new Set<string>();
  for (const ch of adventureChapters) {
    for (const beat of ch.storyBeats) {
      for (const f of flagsInCondition(beat.branchCondition)) probationBranchFlags.add(f);
    }
  }

  it('no volker_*/Silke content references', () => {
    const offenders: string[] = [];
    for (const e of atEvents) {
      const blob = JSON.stringify(e);
      if (/volker/i.test(blob) || /silke/i.test(blob)) offenders.push(e.id);
    }
    expect(offenders, `Probezeit cast leaked into:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no FENRIS/Stefan branch condition (Easter egg in text would be fine — gating is not)', () => {
    const offenders = [...atBranchFlags, ...domainFlags].filter((f) => /fenris|stefan/i.test(f));
    expect(offenders).toEqual([]);
  });

  it('AT flags are disjoint from probation flags (both directions)', () => {
    const atUniverse = new Set([...atSetFlags, ...atReadFlags]);
    const probationUniverse = new Set([...probationSetFlags, ...probationBranchFlags]);
    const overlap = [...atUniverse].filter((f) => probationUniverse.has(f)).sort();
    expect(overlap, `flags shared with Probezeit:\n${overlap.join('\n')}`).toEqual([]);
  });
});

describe('§5.1 flag→domain wiring matches the design table', () => {
  // The design table's Domäne column, pinned: a flag drifting into another
  // domain silently changes the ending derivation.
  const TABLE: Record<string, AuditDomain> = {
    onboarding_documented: 'D4',
    shared_account_documented: 'D1',
    ticket_tamper_documented: 'D4',
    mailbox_auditing_enabled: 'D1',
    authorization_documented: 'D2',
    finding_reported: 'D2',
    evidence_hashed: 'D2',
    export_documented: 'D2',
    mailbox_scope_exceeded: 'D2',
    personal_data_shared_broadly: 'D2',
    bastion_delivery_found: 'D3',
    handover_mail_sent: 'D3',
    bjorg_provoked: 'D5',
    bjorg_warning_preserved: 'D5',
  };

  it('each flag appears in exactly its table domain', () => {
    const wrong: string[] = [];
    for (const [flag, domain] of Object.entries(TABLE)) {
      for (const [d, def] of Object.entries(AUDIT_DOMAINS)) {
        const referenced = flagsInCondition(def.condition).includes(flag);
        if (referenced !== (d === domain)) wrong.push(`${flag}: ${d} referenced=${referenced}`);
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([]);
  });
});
