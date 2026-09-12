import { describe, it, expect } from 'vitest';
import { flagsInCondition } from '@kritis/shared';
import { katasterChapters } from './chapters';
import { KATASTER_DOMAINS, KatasterDomain, ORPHAN_FLAGS, GRUENE_LISTE_FLAGS } from './domains';
import { KATASTER_ACT_BREAKS } from './actBreaks';
import { KATASTER_CHARACTERS } from './characters';

const ALL_DOMAINS: KatasterDomain[] = ['K1', 'K2', 'K3', 'K4', 'K5'];
const chapterIds = katasterChapters.map((c) => c.id);
const allBeats = katasterChapters.flatMap((c) => c.storyBeats);

describe('DAS KATASTER — Kapitelraster', () => {
  it('6 Kapitel über 4 Akte, Verteilung 1/3/1/1', () => {
    expect(katasterChapters).toHaveLength(6);
    const perAct = [1, 2, 3, 4].map((a) => katasterChapters.filter((c) => c.act === a).length);
    expect(perAct).toEqual([1, 3, 1, 1]);
  });

  it('Kapitel- und Beat-Ids sind eindeutig und kt_*-namespaced', () => {
    expect(new Set(chapterIds).size).toBe(chapterIds.length);
    const beatIds = allBeats.map((b) => b.id);
    expect(new Set(beatIds).size).toBe(beatIds.length);
    for (const id of [...chapterIds, ...beatIds]) expect(id).toMatch(/^kt_/);
    for (const b of allBeats) expect(b.eventId).toMatch(/^kt_/);
  });

  it('completionUnlocks und previousChapter zeigen auf echte Kapitel', () => {
    for (const c of katasterChapters) {
      for (const next of c.completionUnlocks) expect(chapterIds, c.id).toContain(next);
      const prev = c.unlockConditions.previousChapter;
      if (prev) expect(chapterIds, c.id).toContain(prev);
    }
  });

  it('die Kette ist lückenlos: jedes Kapitel außer dem ersten wird freigeschaltet', () => {
    const unlocked = new Set(katasterChapters.flatMap((c) => c.completionUnlocks));
    for (const c of katasterChapters.slice(1)) expect(unlocked, c.id).toContain(c.id);
    expect(unlocked.has(katasterChapters[0].id)).toBe(false);
  });

  it('nur das optionale Bonus-Level ist isOptional', () => {
    const optional = allBeats.filter((b) => b.isOptional).map((b) => b.eventId);
    expect(optional).toEqual(['kt_l8_fristen']);
  });
});

describe('Akt-3-Payoffs branchen auf echte Zustands-Flags', () => {
  it('jeder Payoff-Beat hat beide Varianten', () => {
    const payoffs = allBeats.filter((b) => b.branchCondition);
    expect(payoffs.length).toBeGreaterThanOrEqual(3);
    for (const b of payoffs) {
      expect(b.alternateEventId, `${b.id} ohne Gegenvariante`).toBeDefined();
      expect(b.alternateEventId).not.toBe(b.eventId);
    }
  });

  /**
   * Akt 3 und Akt 4 branchen auf VERSCHIEDENE Dinge, und das ist der Kern des
   * Aufbaus: Akt 3 reagiert auf einen ZUSTAND (eine Zeile blieb verwaist, eine
   * Lücke wurde kaschiert), Akt 4 prüft eine LEISTUNG (hält die Domäne?).
   * Würde Akt 3 auf Domänen branchen, käme die Rechnung erst, wenn schon alles
   * entschieden ist; würde Akt 4 auf Zustände branchen, wäre die Auditfrage
   * nicht dieselbe Bedingung wie das Ende.
   */
  it('Akt 3 branched nur auf Zustands-Flags (Verwaisung, Lüge)', () => {
    const stateFlags = new Set<string>([...ORPHAN_FLAGS, ...GRUENE_LISTE_FLAGS]);
    const akt3 = katasterChapters.filter((c) => c.act === 3).flatMap((c) => c.storyBeats);
    for (const b of akt3.filter((x) => x.branchCondition)) {
      for (const f of flagsInCondition(b.branchCondition)) {
        expect(stateFlags.has(f), `${b.id} branched auf ${f}`).toBe(true);
      }
    }
  });

  it('Akt 4 branched ausschließlich auf die Domänen-Objekte selbst', () => {
    const akt4 = katasterChapters.filter((c) => c.act === 4).flatMap((c) => c.storyBeats);
    const domainConditions = ALL_DOMAINS.map((d) => KATASTER_DOMAINS[d].condition);
    expect(akt4.filter((b) => b.branchCondition)).toHaveLength(ALL_DOMAINS.length);
    for (const b of akt4) {
      // Identität, nicht Gleichheit: die Bedingung muss DAS Objekt aus
      // domains.ts sein, keine Kopie — sonst driften Szene und Ende auseinander.
      expect(domainConditions.includes(b.branchCondition as never), `${b.id}`).toBe(true);
    }
    // Jede Domäne kommt genau einmal vor: fünf Fragen, fünf Domänen.
    expect(new Set(akt4.map((b) => b.branchCondition)).size).toBe(ALL_DOMAINS.length);
  });
});

describe('Begleitmaterial', () => {
  it('für jeden Akt-Übergang gibt es Text (1–3, nicht nach dem Finale)', () => {
    expect(Object.keys(KATASTER_ACT_BREAKS).sort()).toEqual(['1', '2', '3']);
    for (const paras of Object.values(KATASTER_ACT_BREAKS)) {
      expect(paras.length).toBeGreaterThanOrEqual(3);
      expect(paras.some((p) => p.tagline)).toBe(true);
    }
  });

  it('die Besetzung enthält den ISB und den Vorgänger', () => {
    const ids = KATASTER_CHARACTERS.map((c) => c.id);
    expect(ids).toContain('isb');
    expect(ids).toContain('kalb');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kein Probezeit-/AUDIT-TRAIL-Ballast in der Besetzung', () => {
    const blob = JSON.stringify(KATASTER_CHARACTERS).toLowerCase();
    for (const alien of ['fenris', 'stefan', 'volker', 'silke', 'bastion']) {
      expect(blob, alien).not.toContain(alien);
    }
  });
});

describe('Registrierung', () => {
  /**
   * Das Gate aus Phase B ist gefallen: der Content steht, also ist die
   * Kampagne registriert. `campaignBudget.test.ts` prüft ab jetzt automatisch
   * mit, dass sie im Tagesbudget ihr Ende erreicht.
   */
  it('ist im Picker registriert und sichtbar', async () => {
    const { listCampaigns, listVisibleCampaigns } = await import('../index');
    expect(listCampaigns().map((c) => c.id)).toContain('kataster');
    expect(listVisibleCampaigns().map((c) => c.id)).toContain('kataster');
  });

  it('startet im ersten Kapitel und hat keine Sidequests', async () => {
    const { getCampaign } = await import('../index');
    const c = getCampaign('kataster');
    expect(c.startChapterId).toBe(katasterChapters[0].id);
    expect(c.sidequests).toEqual([]);
    expect(c.sidequestEvents).toEqual([]);
  });

  it('die Domänen sind vollständig und werden von Akt 4 gebraucht', () => {
    for (const d of ALL_DOMAINS) {
      expect(KATASTER_DOMAINS[d].label.length).toBeGreaterThan(0);
      expect(flagsInCondition(KATASTER_DOMAINS[d].condition).length).toBeGreaterThan(0);
    }
    // Fünf Domänen, fünf Auditfragen — das Rückwärts-Design aus §4.
    const auditBeats = katasterChapters.find((c) => c.act === 4)?.storyBeats ?? [];
    expect(auditBeats).toHaveLength(ALL_DOMAINS.length);
  });
});
