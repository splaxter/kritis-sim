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
    // Am Flag festgemacht, nicht am Wortlaut: die Formulierung der Option hat
    // sich in Runde 2 geändert, die Mechanik nicht.
    const uebertreibung = offen.choices.find((c) =>
      (c.setsFlags ?? []).includes('kat_owner_fabricated')
    );
    expect(uebertreibung, 'die belastende Option muss es weiterhin geben').toBeDefined();
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

/**
 * Zweite Review-Runde zu #13: die beiden Szenen, die aus MEHREREN Ursachen
 * erreichbar sind, dürfen nichts behaupten, was nur für eine davon gilt.
 * Die Engine lässt hier keine feinere Verzweigung zu — EventChoice.requires
 * ist ein SkillCheck, kein Flag-Test, und ein Beat hat genau zwei Fassungen.
 * Also muss der Text in jedem erreichbaren Zweig wahr sein.
 */
describe('Review-Runde 2 — Frage 5 trifft auch den, der eskaliert hat', () => {
  const offen = byId.get('kt_audit_q5_offen')!;

  /** Alle drei Zustände, aus denen die offene Fassung erreichbar ist. */
  const wege: Array<[string, Record<string, boolean>]> = [
    ['gar nichts übergeben', {}],
    ['nur eskaliert, Einkauf fehlt', { kat_gaps_escalated: true }],
    ['nur Einkauf, nie eskaliert', { kat_purchasing_informed: true }],
  ];

  it.each(wege)('%s führt in die offene Fassung', (_l, flags) => {
    expect(checkFlagCondition(KATASTER_DOMAINS.K5.condition, flags)).toBe(false);
  });

  it('behauptet nirgends, dass niemand etwas weiß', () => {
    const blob = offen.description + offen.choices.map((c) => c.resultText).join(' ');
    expect(blob).not.toMatch(/zum ersten Mal/i);
    expect(blob).not.toMatch(/Es gibt keine Mail/i);
    expect(blob).not.toMatch(/hört (sie )?von den vier Punkten/i);
  });

  /** Der Befund ist die fehlende ÜBERGABE, nicht fehlendes Wissen. */
  it('benennt die fehlende Übergabe als den eigentlichen Befund', () => {
    const blob = offen.description + offen.choices.map((c) => c.resultText).join(' ');
    expect(blob).toMatch(/Empfänger|angenommen|Übergabe/i);
  });

  it('die belastende Option behauptet etwas, das in ALLEN drei Wegen falsch ist', () => {
    const luege = offen.choices.find((c) => (c.setsFlags ?? []).includes('kat_owner_fabricated'))!;
    // „liegt alles bei jemandem" ist genau dann falsch, wenn K5 offen ist —
    // und K5 ist offen, sonst spielte diese Fassung nicht.
    expect(luege.text).toMatch(/liegt alles bei jemandem/i);
    for (const [, flags] of wege) {
      expect(checkFlagCondition(KATASTER_DOMAINS.K5.condition, flags)).toBe(false);
    }
  });

  it('es bleibt eine Option ohne Lügen-Flag', () => {
    const ehrlich = offen.choices.filter((c) => !(c.setsFlags ?? []).includes('kat_owner_fabricated'));
    expect(ehrlich.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Review-Runde 2 — Frage 2 nennt kein Dokument, das gemeldet sein kann', () => {
  const offen = byId.get('kt_audit_q2_offen')!;

  /** Die vier Wege, auf denen K4 kippen kann. */
  const ursachen: Array<[string, Record<string, boolean>]> = [
    ['Lücke nie gemeldet', {}],
    ['Aufpasser erfunden', { kat_gap_reported: true, kat_owner_fabricated: true }],
    ['Handbuch verschwiegen', { kat_gap_concealed: true }],
    ['Waagenwartung grün gelassen', { kat_gap_reported: true, kat_stale_concealed: true }],
  ];

  it.each(ursachen)('%s lässt K4 kippen', (_l, flags) => {
    expect(checkFlagCondition(KATASTER_DOMAINS.K4.condition, flags)).toBe(false);
  });

  /**
   * Das Repro des Reviews: Waagen grün, Handbuch gemeldet, L7 ehrlich. Die
   * Szene darf dann nicht behaupten, zum Handbuch stehe nichts im Kataster.
   */
  it('behauptet nicht, das Notfallhandbuch fehle im Kataster', () => {
    expect(offen.description).not.toMatch(/im Kataster steht davon nichts/i);
    expect(offen.description).not.toMatch(/Notfallhandbuch/i);
    expect(offen.title).not.toMatch(/Notfallhandbuch/i);
  });

  it('der Vorwurf ist die unzutreffende Zeile — das trifft alle vier Ursachen', () => {
    expect(offen.description).toMatch(/stimmt|ob sie stimmt/i);
  });

  it('die Waagen-Verschweigung verschlechtert K4 und ist damit Gegenstand des Vorwurfs', () => {
    const waagen = { kat_gap_reported: true, kat_stale_concealed: true };
    expect(checkFlagCondition(KATASTER_DOMAINS.K4.condition, waagen)).toBe(false);
    // … und die Szene benennt keine Ursache, die hier nicht zuträfe.
    expect(offen.description).not.toMatch(/Dienstvereinbarung|§ 7/i);
  });
});
