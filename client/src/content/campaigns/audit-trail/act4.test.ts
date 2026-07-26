import { describe, it, expect } from 'vitest';
import { checkFlagCondition, GameEvent, StoryBeat } from '@kritis/shared';
import { auditTrailStoryEvents } from './events';
import { auditTrailChapters } from './chapters';
import { AUDIT_TRAIL_CHARACTERS } from './characters';
import { AUDIT_DOMAINS, AuditDomain, deriveAuditTrailEnding } from './domains';

const byId = new Map(auditTrailStoryEvents.map((e) => [e.id, e]));
const characterIds = new Set(AUDIT_TRAIL_CHARACTERS.map((c) => c.id));

// The five audit-question beats, in play order, with the domain each branches on.
const AUDIT_BEATS: { beatId: string; domain: AuditDomain; success: string; fail: string }[] = [
  { beatId: 'at_b0501', domain: 'D1', success: 'at_audit_f1', fail: 'at_audit_f1_fail' },
  { beatId: 'at_b0502', domain: 'D2', success: 'at_audit_f2', fail: 'at_audit_f2_fail' },
  { beatId: 'at_b0503', domain: 'D3', success: 'at_audit_f3', fail: 'at_audit_f3_fail' },
  { beatId: 'at_b0601', domain: 'D4', success: 'at_audit_f4', fail: 'at_audit_f4_fail' },
  { beatId: 'at_b0602', domain: 'D5', success: 'at_audit_f5', fail: 'at_audit_f5_fail' },
];

const allBeats: StoryBeat[] = auditTrailChapters.flatMap((c) => c.storyBeats);
const beatById = (id: string) => allBeats.find((b) => b.id === id)!;

const flags = (...set: string[]): Record<string, boolean> =>
  Object.fromEntries(set.map((f) => [f, true]));

/** A minimal flag set that satisfies exactly one domain (its `all` positives). */
function satisfy(domain: AuditDomain): string[] {
  const cond = AUDIT_DOMAINS[domain].condition;
  return typeof cond === 'string' ? [cond] : cond.all ?? [];
}

const act4Events = (): GameEvent[] =>
  AUDIT_BEATS.flatMap((b) => [byId.get(b.success)!, byId.get(b.fail)!]);

describe('AUDIT TRAIL Act 4 — the five audit questions', () => {
  it('all ten audit events exist (success + fail per question)', () => {
    for (const { success, fail } of AUDIT_BEATS) {
      expect(byId.has(success), `${success} missing`).toBe(true);
      expect(byId.has(fail), `${fail} missing`).toBe(true);
    }
  });

  it('every audit event is well-formed dialogue (text-only, ≥2 real choices)', () => {
    for (const e of act4Events()) {
      expect(e.category).toBe('story');
      expect(e.image, `${e.id} must be text-only`).toBeUndefined();
      // Pure dialogue: no level attached.
      expect((e as { terminalContext?: unknown }).terminalContext).toBeUndefined();
      expect((e as { guiContext?: unknown }).guiContext).toBeUndefined();
      expect(e.tags).toContain('act4');
      expect(e.choices.length, `${e.id} needs ≥2 choices`).toBeGreaterThanOrEqual(2);
      for (const c of e.choices) {
        expect(c.text.trim().length, `${e.id}/${c.id} empty text`).toBeGreaterThan(0);
        expect((c.resultText ?? '').trim().length, `${e.id}/${c.id} empty resultText`).toBeGreaterThan(0);
      }
    }
  });

  it('references only known campaign characters', () => {
    for (const e of act4Events()) {
      for (const ch of e.involvedCharacters ?? []) {
        expect(characterIds.has(ch), `${e.id} references unknown character "${ch}"`).toBe(true);
      }
    }
    // The ISB is the audit's questioner — present in every scene.
    for (const e of act4Events()) {
      expect(e.involvedCharacters, `${e.id} must involve the ISB`).toContain('isb');
    }
  });

  // The ending is derived from Acts 1–3 flags (design §5). Act 4 is the reveal,
  // not a decision point — no choice here may set a flag, or it could silently
  // rewrite the derived ending after the branch already resolved.
  it('no Act-4 choice sets any flag (the ending is already written)', () => {
    const offenders: string[] = [];
    for (const e of act4Events()) {
      for (const c of e.choices) {
        if (c.setsFlags && c.setsFlags.length > 0) offenders.push(`${e.id}/${c.id}`);
      }
    }
    expect(offenders, `Act-4 choices must not set flags:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the chapter beats pair each question with its success/fail event ids', () => {
    for (const { beatId, domain, success, fail } of AUDIT_BEATS) {
      const beat = beatById(beatId);
      expect(beat.eventId).toBe(success);
      expect(beat.alternateEventId).toBe(fail);
      // Reference identity: the branch reads the SAME object the ending derives from.
      expect(beat.branchCondition).toBe(AUDIT_DOMAINS[domain].condition);
    }
  });
});

describe('Act-4 branch routing matches the domain (engine logic)', () => {
  // Mirrors adventureEngine getNextStoryContent: condition true → primary event,
  // false → the _fail alternate.
  const routed = (beat: StoryBeat, f: Record<string, boolean>) =>
    checkFlagCondition(beat.branchCondition, f) ? beat.eventId : beat.alternateEventId;

  it('a satisfied domain routes to the belastbare-Antwort event; an empty run routes to _fail', () => {
    for (const { beatId, domain, success, fail } of AUDIT_BEATS) {
      const beat = beatById(beatId);
      expect(routed(beat, flags(...satisfy(domain)))).toBe(success);
      expect(routed(beat, {})).toBe(fail);
    }
  });

  it('a full clean run: every question routes to success AND the ending is Profi', () => {
    const perfect = flags(
      ...satisfy('D1'), ...satisfy('D2'), ...satisfy('D3'), ...satisfy('D4'), ...satisfy('D5')
    );
    for (const { beatId, success } of AUDIT_BEATS) {
      expect(routed(beatById(beatId), perfect)).toBe(success);
    }
    expect(deriveAuditTrailEnding(perfect)).toBe('profi');
  });

  it('a scope violation routes F2 to its confrontation AND yields the Rächer ending', () => {
    // Everything documented, but M.s mailbox export was opened (honeypot flag).
    const scoped = flags(
      ...satisfy('D1'), ...satisfy('D2'), ...satisfy('D3'), ...satisfy('D4'), ...satisfy('D5'),
      'mailbox_scope_exceeded'
    );
    expect(routed(beatById('at_b0502'), scoped)).toBe('at_audit_f2_fail');
    expect(deriveAuditTrailEnding(scoped)).toBe('rache');
  });
});
