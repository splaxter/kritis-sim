import { describe, it, expect } from 'vitest';
import { checkFlagCondition } from '@kritis/shared';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';
import { KATASTER_DOMAINS, KatasterDomain, deriveKatasterEnding } from './domains';

const byId = new Map(katasterStoryEvents.map((e) => [e.id, e]));
const audit = katasterChapters.find((c) => c.id === 'kt_ch06_audit')!;
const ALL: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];

/** Flags, die genau die genannten Domänen erfüllen. */
function flagsFor(domains: KatasterDomain[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const d of domains) {
    const cond = KATASTER_DOMAINS[d].condition;
    const positive = typeof cond === 'string' ? [cond] : (cond.all ?? []);
    for (const f of positive) out[f] = true;
  }
  return out;
}

/** Welche Event-Id spielt dieser Beat bei diesem Flag-Zustand? */
function playedEvents(flags: Record<string, boolean>): string[] {
  return audit.storyBeats.map((b) =>
    checkFlagCondition(b.branchCondition, flags) ? b.eventId : b.alternateEventId!
  );
}

describe('Akt 4 — fünf Fragen, fünf Domänen', () => {
  it('fünf Beats, jeder mit beiden Fassungen authored', () => {
    expect(audit.storyBeats).toHaveLength(5);
    for (const b of audit.storyBeats) {
      expect(byId.get(b.eventId), `${b.id}: erfüllte Fassung fehlt`).toBeDefined();
      expect(byId.get(b.alternateEventId!), `${b.id}: offene Fassung fehlt`).toBeDefined();
    }
  });

  it.each([
    ['kt_audit_q1', 'K3', 'Nachweisfähigkeit'],
    ['kt_audit_q2', 'K4', 'Ehrlichkeit'],
    ['kt_audit_q3', 'K2', 'Zurechenbarkeit'],
    ['kt_audit_q4', 'K1', 'Vollständigkeit'],
    ['kt_audit_q5', 'K5', 'Eskalation'],
  ])('%s prüft %s (%s) — genau wie im Rückwärts-Design', (eventId, domain) => {
    const beat = audit.storyBeats.find((b) => b.eventId === eventId)!;
    expect(beat.branchCondition).toBe(KATASTER_DOMAINS[domain as KatasterDomain].condition);
  });

  it('alle Domänen erfüllt → jede Frage bekommt eine belastbare Antwort', () => {
    expect(playedEvents(flagsFor(ALL))).toEqual([
      'kt_audit_q1',
      'kt_audit_q2',
      'kt_audit_q3',
      'kt_audit_q4',
      'kt_audit_q5',
    ]);
  });

  it('keine Domäne erfüllt → jede Frage läuft ins Offene', () => {
    expect(playedEvents({})).toEqual([
      'kt_audit_q1_offen',
      'kt_audit_q2_offen',
      'kt_audit_q3_offen',
      'kt_audit_q4_offen',
      'kt_audit_q5_offen',
    ]);
  });

  /** Der Showdown muss granular sein: eine fehlende Domäne kippt genau eine Frage. */
  it.each(ALL)('ohne %s kippt genau eine einzige Frage', (dropped) => {
    const played = playedEvents(flagsFor(ALL.filter((d) => d !== dropped)));
    const offen = played.filter((id) => id.endsWith('_offen'));
    expect(offen).toHaveLength(1);
  });

  /**
   * Die belastenden Flags wirken schon VOR der Auswertung: ein kaschierter
   * Mangel oder ein erfundener Aufpasser kippt K4 und damit die Ehrlichkeits-
   * frage — auch dann, wenn sonst alles steht.
   */
  it.each(['kat_gap_concealed', 'kat_owner_fabricated'])(
    '%s kippt Frage 2, egal wie gut der Rest ist',
    (bad) => {
      const played = playedEvents({ ...flagsFor(ALL), [bad]: true });
      expect(played[1]).toBe('kt_audit_q2_offen');
      expect(deriveKatasterEnding({ ...flagsFor(ALL), [bad]: true })).toBe('gruene_liste');
    }
  );
});

describe('Akt 4 — Szenenqualität', () => {
  const alle = audit.storyBeats.flatMap((b) => [
    byId.get(b.eventId)!,
    byId.get(b.alternateEventId!)!,
  ]);

  it('jede Fassung bietet zwei ungated Optionen mit Konsequenztext', () => {
    for (const ev of alle) {
      const open = ev.choices.filter((c) => !c.requires && !c.hidden);
      expect(open.length, ev.id).toBeGreaterThanOrEqual(2);
      for (const c of ev.choices) {
        expect(c.resultText.length, `${ev.id}/${c.id}`).toBeGreaterThan(60);
      }
    }
  });

  it('jede Fassung lehrt etwas — auch die, in der es schlecht läuft', () => {
    for (const ev of alle) {
      expect(ev.mentorNote, `${ev.id} ohne Lektion`).toBeTruthy();
      expect(ev.mentorNote!.length).toBeGreaterThan(80);
    }
  });

  /**
   * Im Audit zu lügen ist eine eigene Handlung mit eigener Folge — deshalb
   * setzt jede offene Fassung, in der man behaupten statt einräumen kann, das
   * Lügen-Flag. Wer erst hier die Nerven verliert, landet im selben Ende wie
   * jemand, der schon in Akt 2 geschönt hat.
   */
  it('behaupten statt einräumen setzt auch im Audit noch das Lügen-Flag', () => {
    const luegen = alle
      .flatMap((ev) => ev.choices.map((c) => [ev.id, c] as const))
      .filter(([, c]) => (c.setsFlags ?? []).includes('kat_owner_fabricated'));
    expect(luegen.length, 'in keiner offenen Fassung kann man sich verschlechtern').toBeGreaterThanOrEqual(3);
    for (const [evId] of luegen) expect(evId).toMatch(/_offen$/);
  });

  it('die erfüllten Fassungen bieten keine Selbstsabotage an', () => {
    const erfuellt = audit.storyBeats.map((b) => byId.get(b.eventId)!);
    for (const ev of erfuellt) {
      for (const c of ev.choices) {
        expect(c.setsFlags ?? [], `${ev.id}/${c.id}`).not.toContain('kat_owner_fabricated');
      }
    }
  });

  it('Michael bleibt Prüfer, nicht Gegner: keine Fassung endet in einer Drohung', () => {
    for (const ev of alle) {
      const blob = ev.description + ev.choices.map((c) => c.resultText).join(' ');
      expect(blob, ev.id).not.toMatch(/Abmahnung|Kündigung|Anzeige erstatt|Bußgeld/i);
    }
  });
});
