/**
 * Regressionen aus dem PR-Review zu #13. Jeder Test hier stand fuer einen
 * Fehler, der die Kampagne inhaltlich unfair oder unwahr gemacht hat —
 * gefunden beim gezielten Durchspielen, nicht beim Lesen.
 */
import { describe, it, expect } from 'vitest';
import { checkFlagCondition } from '@kritis/shared';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';
import { KATASTER_DOMAINS, GRUENE_LISTE_FLAGS, deriveKatasterEnding } from './domains';
import { isGuiSolutionMet, findMetGuiSolution } from '../../../components/WindowsLevel/guiSolution';

const byId = new Map(katasterStoryEvents.map((e) => [e.id, e]));
const l7 = byId.get('kt_l7_kataster')!;
const solutions = l7.guiContext!.solutions;

/** Die ehrliche Loesung ist die letzte — sie darf nie von einer Falle verdeckt werden. */
const honest = solutions[solutions.length - 1];

describe('Befund 1 — Frage 5 hat in jeder Teil-Eskalation eine wahre Antwort', () => {
  const offen = byId.get('kt_audit_q5_offen')!;

  /**
   * K5 verlangt BEIDE Eskalationen. Wer schriftlich an die GF gegangen ist,
   * den Einkauf aber nicht eingebunden hat, landet trotzdem hier — der Text
   * darf dann nicht behaupten, es gebe ueberhaupt keine Weitergabe.
   */
  it('der offene Fall trifft auch jemanden, der nachweislich eskaliert hat', () => {
    const nurEskaliert = { kat_gaps_escalated: true };
    expect(checkFlagCondition(KATASTER_DOMAINS.K5.condition, nurEskaliert)).toBe(false);
  });

  it('behauptet nicht pauschal, dass nichts weitergegeben wurde', () => {
    expect(offen.description).not.toMatch(/Es gibt keine Mail/i);
    expect(offen.description).not.toMatch(/kein Datum, keinen Verteiler/i);
  });

  it('keine Antwortoption leugnet eine Weitergabe, die stattgefunden haben kann', () => {
    const leugnend = offen.choices.filter((c) => /Weitergegeben habe ich sie nicht/i.test(c.text));
    expect(leugnend, 'Option waere fuer einen Eskalierer gelogen').toEqual([]);
  });

  it('die ehrliche Option bleibt ohne Luegen-Flag, nur die Uebertreibung kippt das Ende', () => {
    const ehrlich = offen.choices.find((c) => !(c.setsFlags ?? []).includes('kat_owner_fabricated'));
    expect(ehrlich, 'es muss eine Option ohne Luegen-Flag geben').toBeDefined();
    const uebertreibung = offen.choices.find((c) => /alles bekannt/i.test(c.text));
    expect(uebertreibung?.setsFlags).toContain('kat_owner_fabricated');
  });
});

describe('Befund 3 — L7 bewertet den aktuellen Registerzustand, nicht vergangene Klicks', () => {
  /**
   * Der Verlauf ist kein Zustand: „Henry eintragen, Henry entfernen" darf die
   * ehrliche Loesung nicht erfuellen. Die App nimmt den ueberholten Token
   * zurueck (useGuiLevel.retract) — hier geprueft als das, was danach in
   * `performed` steht.
   */
  it('zurueckgenommene Zuweisung erfuellt die ehrliche Loesung nicht', () => {
    const nachRuecknahme = [
      'evidence:sla_bericht:bericht_08',
      'owner:lizenznachweis:petersen',
      'gap:notfallhandbuch',
      'gap:info_postfach',
      // 'owner:sla_bericht:henry' wurde emittiert UND wieder zurueckgenommen
    ];
    expect(isGuiSolutionMet(honest, nachRuecknahme)).toBe(false);
  });

  it('mit bestehender Zuweisung ist sie erfuellt', () => {
    const vollstaendig = [
      'owner:sla_bericht:henry',
      'evidence:sla_bericht:bericht_08',
      'owner:lizenznachweis:petersen',
      'gap:notfallhandbuch',
      'gap:info_postfach',
    ];
    expect(isGuiSolutionMet(honest, vollstaendig)).toBe(true);
  });
});

describe('Befund 4 — kat_orphan_sla nur, wenn der Monatsbericht wirklich unbesetzt bleibt', () => {
  it('Fabrikation ohne echten SLA-Aufpasser markiert die Zeile als verwaist', () => {
    const met = findMetGuiSolution(solutions, ['owner:info_postfach:it_abteilung']);
    expect(met?.setsFlags).toContain('kat_owner_fabricated');
    expect(met?.setsFlags, 'SLA ist unbesetzt, die Uhr muss laufen').toContain('kat_orphan_sla');
  });

  it('Fabrikation MIT echtem SLA-Aufpasser markiert sie nicht als verwaist', () => {
    const met = findMetGuiSolution(solutions, [
      'owner:sla_bericht:henry',
      'owner:info_postfach:it_abteilung',
    ]);
    expect(met?.setsFlags).toContain('kat_owner_fabricated');
    expect(met?.setsFlags, 'Henry passt auf — keine Mahnung').not.toContain('kat_orphan_sla');
  });

  /** Die Gutschrift in Akt 3 haengt an genau diesem Flag. */
  it('die Mahnung wird nur abgewendet, wenn die Zeile besetzt ist', () => {
    const beat = katasterChapters
      .find((c) => c.id === 'kt_ch05_uhr')!
      .storyBeats.find((b) => b.eventId === 'kt_mahnung')!;
    expect(checkFlagCondition(beat.branchCondition, { kat_orphan_sla: true })).toBe(true);
    expect(checkFlagCondition(beat.branchCondition, {})).toBe(false);
  });
});

describe('Befund 5 — verschwiegene Luecken werden nicht vermischt', () => {
  const waagen = katasterStoryEvents
    .flatMap((e) => e.choices)
    .find((c) => c.id === 'kt_l4_befund_gruen')!;
  const handbuch = katasterStoryEvents
    .flatMap((e) => e.choices)
    .find((c) => c.id === 'kt_l5_melden_spaeter')!;

  it('Waagenwartung und Notfallhandbuch setzen verschiedene Flags', () => {
    expect(waagen.setsFlags).toEqual(['kat_stale_concealed']);
    expect(handbuch.setsFlags).toEqual(['kat_gap_concealed']);
  });

  /**
   * Die Vorstandsfrage fragt woertlich nach dem Handbuch und wirft vor, das
   * Suchprotokoll nie weitergegeben zu haben. Wer es gemeldet hat, darf sie
   * nicht bekommen — auch nicht, wenn er die Waagen gruen gelassen hat.
   */
  it('wer das Handbuch meldet, wird nicht des Verschweigens bezichtigt', () => {
    const beat = katasterChapters
      .find((c) => c.id === 'kt_ch05_uhr')!
      .storyBeats.find((b) => b.eventId === 'kt_vorstandsfrage')!;
    const gemeldetAberWaagenGruen = { kat_gap_reported: true, kat_stale_concealed: true };
    expect(checkFlagCondition(beat.branchCondition, gemeldetAberWaagenGruen)).toBe(false);
  });

  it('beide Verschweige-Flags kippen weiterhin K4 und das Ende', () => {
    for (const flag of ['kat_gap_concealed', 'kat_stale_concealed']) {
      expect(checkFlagCondition(KATASTER_DOMAINS.K4.condition, { kat_gap_reported: true, [flag]: true })).toBe(false);
      expect(deriveKatasterEnding({ [flag]: true })).toBe('gruene_liste');
      expect(GRUENE_LISTE_FLAGS as readonly string[]).toContain(flag);
    }
  });
});

describe('Befund 6 — L8 akzeptiert nur den richtigen Stichtag', () => {
  const goals = byId.get('kt_l8_fristen')!.terminalContext!.solutions[0].stateGoals!;
  const absent = goals
    .map((g) => (g as { absentMatches?: string }).absentMatches)
    .filter(Boolean) as string[];

  /**
   * Die CSV enthaelt 2026-12-01. Ein Filter „bis Jahresende" zieht ihn mit und
   * bestand vorher, weil nur 2027 ausgeschlossen war.
   */
  it('schliesst auch den Dezember-Termin aus, nicht nur 2027', () => {
    expect(absent).toContain('2026-12-01');
    expect(absent).toContain('2027-');
  });

  it('jedes nicht faellige Datum der CSV ist abgedeckt', () => {
    const csv = byId.get('kt_l8_fristen')!.terminalContext!.vfsOverlay!.files!
      .find((f) => f.path === '/srv/kataster/pflichten.csv')!.content;
    const alleDaten = [...csv.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
    const nichtFaellig = alleDaten.filter((d) => d > '2026-10-11');
    expect(nichtFaellig.length).toBeGreaterThan(0);
    for (const d of nichtFaellig) {
      expect(absent.some((a) => d.startsWith(a) || d === a), `${d} ist nicht ausgeschlossen`).toBe(true);
    }
  });
});
