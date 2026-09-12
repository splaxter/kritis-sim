import { describe, it, expect } from 'vitest';
import { GameEvent, flagsInCondition } from '@kritis/shared';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';
import { KATASTER_CHARACTERS } from './characters';
import {
  KATASTER_DOMAINS,
  KatasterDomain,
  ORPHAN_FLAGS,
  GRUENE_LISTE_FLAGS,
  BONUS_FLAGS,
} from './domains';
import { probationCampaign } from '../probation';
import { auditTrailCampaign } from '../audit-trail';

const ALL_DOMAINS: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];
const allBeats = katasterChapters.flatMap((c) => c.storyBeats);
const eventIds = new Set(katasterStoryEvents.map((e) => e.id));

/** Jedes Flag, das irgendein Content-Stück dieser Kampagne setzt. */
function flagsSetByContent(events: GameEvent[]): Set<string> {
  const out = new Set<string>();
  for (const ev of events) {
    for (const c of ev.choices) for (const f of c.setsFlags ?? []) out.add(f);
    for (const cmd of ev.terminalContext?.commands ?? []) for (const f of cmd.setsFlags ?? []) out.add(f);
    for (const sol of ev.guiContext?.solutions ?? []) for (const f of sol.setsFlags ?? []) out.add(f);
  }
  return out;
}

const setFlags = flagsSetByContent(katasterStoryEvents);
const domainFlags = new Set(ALL_DOMAINS.flatMap((d) => flagsInCondition(KATASTER_DOMAINS[d].condition)));
const beatFlags = new Set(allBeats.flatMap((b) => flagsInCondition(b.branchCondition)));

describe('DAS KATASTER — Flag-Kreislauf ist geschlossen', () => {
  it('jedes Flag, auf das gebrancht oder ausgewertet wird, wird irgendwo gesetzt', () => {
    const gelesen = new Set([...domainFlags, ...beatFlags]);
    const tot = [...gelesen].filter((f) => !setFlags.has(f));
    expect(tot, 'tote Bedingung: wird gelesen, aber nie gesetzt').toEqual([]);
  });

  it('jedes gesetzte Flag wird auch gelesen — kein Sammelobjekt ohne Bedeutung', () => {
    const gelesen = new Set([
      ...domainFlags,
      ...beatFlags,
      // kat_reminder_live wird bewusst NUR vom Epilog gelesen (Bonus aus L8 ★).
      ...BONUS_FLAGS,
    ]);
    const ungelesen = [...setFlags].filter((f) => !gelesen.has(f));
    expect(ungelesen, 'gesetzt, aber von niemandem ausgewertet').toEqual([]);
  });

  it('jedes Domänen-Flag ist genau einer Domäne zugeordnet', () => {
    const zuordnung = new Map<string, KatasterDomain[]>();
    for (const d of ALL_DOMAINS) {
      for (const f of flagsInCondition(KATASTER_DOMAINS[d].condition)) {
        zuordnung.set(f, [...(zuordnung.get(f) ?? []), d]);
      }
    }
    for (const [flag, domains] of zuordnung) {
      // Die beiden Lügen-Flags stehen bewusst in K4 (als none-Klausel) und
      // zusätzlich in der Ending-Priorität — aber in nur EINER Domäne.
      expect(domains.length, `${flag} hängt an ${domains.join('/')}`).toBe(1);
    }
  });

  it('Verwaisungs- und Bonus-Flags gehören keiner Domäne an', () => {
    for (const f of [...ORPHAN_FLAGS, ...BONUS_FLAGS]) {
      expect(domainFlags.has(f), `${f}`).toBe(false);
    }
  });

  it('die Lügen-Flags werden von K4 gelesen und kippen das Ende', () => {
    for (const f of GRUENE_LISTE_FLAGS) {
      expect(domainFlags.has(f), `${f} muss in K4 stehen`).toBe(true);
    }
  });
});

describe('DAS KATASTER — in sich geschlossen', () => {
  it('alle Beats zeigen auf Events dieser Kampagne', () => {
    for (const b of allBeats) {
      expect(eventIds.has(b.eventId), `${b.id} → ${b.eventId}`).toBe(true);
      if (b.alternateEventId) {
        expect(eventIds.has(b.alternateEventId), `${b.id} → ${b.alternateEventId}`).toBe(true);
      }
    }
  });

  it('jedes Event wird von genau einem Beat gespielt — kein toter Content', () => {
    const referenziert = new Set(
      allBeats.flatMap((b) => [b.eventId, b.alternateEventId].filter(Boolean) as string[])
    );
    const verwaist = [...eventIds].filter((id) => !referenziert.has(id));
    expect(verwaist, 'Event ohne Beat').toEqual([]);
    expect(referenziert.size).toBe(eventIds.size);
  });

  it('Event-Ids sind eindeutig und kt_*-namespaced', () => {
    const ids = katasterStoryEvents.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^kt_/);
  });

  it('alle Flags sind kat_*-namespaced', () => {
    for (const f of [...setFlags, ...domainFlags, ...beatFlags]) expect(f).toMatch(/^kat_/);
  });

  it('nur bekannte Figuren treten auf', () => {
    const bekannt = new Set(KATASTER_CHARACTERS.map((c) => c.id));
    for (const ev of katasterStoryEvents) {
      for (const c of ev.involvedCharacters ?? []) {
        expect(bekannt.has(c), `${ev.id}: unbekannte Figur "${c}"`).toBe(true);
      }
    }
  });

  /**
   * Story-Mode serviert `pendingChainEvents` nie: getActivatedChainEvents hängt
   * am eventEngine, den der Story-Pfad nicht benutzt. Ein chainTrigger wäre
   * damit ein Payoff, der garantiert nie eintritt.
   */
  it('keine chainTriggers — die Uhr läuft über authored Beats', () => {
    for (const ev of katasterStoryEvents) {
      expect(ev.chainTriggers, ev.id).toBeUndefined();
      for (const c of ev.choices) expect(c.chainTriggers, `${ev.id}/${c.id}`).toBeUndefined();
    }
  });
});

describe('DAS KATASTER — frischer Zustand, kein Import aus anderen Kampagnen', () => {
  const fremdFlags = new Set(
    [probationCampaign, auditTrailCampaign].flatMap((c) => [
      ...flagsSetByContent(c.storyEvents),
      ...flagsSetByContent(c.sidequestEvents),
    ])
  );

  it('KATASTER-Flags sind disjunkt zu Probezeit und AUDIT TRAIL', () => {
    const kollision = [...setFlags].filter((f) => fremdFlags.has(f));
    expect(kollision).toEqual([]);
  });

  it('… und umgekehrt: keine fremde Kampagne setzt ein kat_*-Flag', () => {
    expect([...fremdFlags].filter((f) => f.startsWith('kat_'))).toEqual([]);
  });

  it('keine Abhängigkeit von fremden Handlungssträngen', () => {
    const blob = JSON.stringify(katasterStoryEvents).toLowerCase();
    for (const alien of ['fenris', 'bastion-01', 'volker', 'silke']) {
      expect(blob, `Verweis auf ${alien}`).not.toContain(alien);
    }
  });

  it('keine Beat-Bedingung hängt an einer fremden Kampagne', () => {
    for (const f of beatFlags) expect(fremdFlags.has(f), f).toBe(false);
  });
});
