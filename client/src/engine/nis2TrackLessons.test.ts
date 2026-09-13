import { describe, it, expect } from 'vitest';
import { nis2Events } from '../content/events/learning-path-nis2';
import { createShellFromContext, checkStateGoals } from './shell';
import { ShellEngine } from './shell/ShellEngine';
import { GameEvent, TerminalContext } from '@kritis/shared';

/**
 * Durchstich durch die CLI-Level des Tracks „Pflicht & Nachweis" mit der ECHTEN
 * Shell: fuer jedes Level den Sollpfad fahren und die authored stateGoals
 * pruefen, dazu je ein Negativtest. Ein Lerninhalt, der sich nicht loesen
 * laesst, ist schlimmer als keiner.
 */

const byId = (id: string): GameEvent => {
  const ev = nis2Events.find((e) => e.id === id);
  if (!ev) throw new Error(`Level ${id} nicht vorhanden`);
  return ev;
};
const ctxOf = (id: string): TerminalContext => byId(id).terminalContext!;
const goalsOf = (id: string) => ctxOf(id).solutions[0].stateGoals!;
const shellOf = (id: string): ShellEngine => createShellFromContext(ctxOf(id));

const run = (shell: ShellEngine, cmd: string) => {
  const r = shell.execute(cmd);
  expect(shell.hasPendingInput(), `unerwartete Eingabeaufforderung nach "${cmd}"`).toBe(false);
  return r;
};

describe('L1 — Ist das meldepflichtig?', () => {
  const id = 'learn_nis2_01_schwelle';

  it('der Sollpfad loest: Detailbericht lesen, dann einstufen', () => {
    const sh = shellOf(id);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);

    run(sh, 'cat meldungen_2026-09.csv');
    run(sh, 'cat VF-2026-033.txt');
    run(sh, 'echo "meldepflichtig: VF-2026-032, VF-2026-033" > /home/timo/einstufung.md');

    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Die Lektion: wer nur die Uebersicht liest, stuft VF-2026-033 falsch ein. */
  it('ohne den Detailbericht loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat meldungen_2026-09.csv');
    run(sh, 'echo "meldepflichtig: VF-2026-032, VF-2026-033" > /home/timo/einstufung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'Detailbericht ungelesen').toBe(false);
  });

  it('den Drucker mitzumelden loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat VF-2026-033.txt');
    run(sh, 'echo "meldepflichtig: VF-2026-031, VF-2026-032, VF-2026-033" > /home/timo/einstufung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'alles melden ist nicht einstufen').toBe(false);
  });

  it('nur den offensichtlichen Vorfall zu melden loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat VF-2026-033.txt');
    run(sh, 'echo "meldepflichtig: VF-2026-032" > /home/timo/einstufung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'VF-2026-033 fehlt').toBe(false);
  });
});

describe('L4 — Wer war das?', () => {
  const id = 'learn_nis2_04_wer_war_das';

  it('der Sollpfad loest: Spur verfolgen, Nichtzuordenbarkeit benennen', () => {
    const sh = shellOf(id);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);

    run(sh, 'grep -n warm-admin /srv/logs/auth.log');
    run(sh, 'cat /srv/inventar/konten_warm-waage.csv');
    run(sh, 'echo "warm-admin, gemeinsam genutzt — nicht zuordenbar" > /home/timo/zurechnung.md');

    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Der Kern des Levels: ein Name ist keine Zurechnung. */
  it('einen Namen zu raten loest nicht', () => {
    const sh = shellOf(id);
    run(sh, 'grep -n warm-admin /srv/logs/auth.log');
    run(sh, 'cat /srv/inventar/konten_warm-waage.csv');
    run(sh, 'echo "warm-admin — das war Bjoern" > /home/timo/zurechnung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'Vermutung statt Befund').toBe(false);
  });

  it('ohne Blick in die Kontoliste loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'grep -n warm-admin /srv/logs/auth.log');
    run(sh, 'echo "warm-admin, nicht zuordenbar" > /home/timo/zurechnung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'Kontoliste ungelesen').toBe(false);
  });
});

describe('L5 ★ — Was im Audit haelt', () => {
  const id = 'learn_nis2_05_belastbar';

  it('der Sollpfad loest: beide Fassungen und den Beleg pruefen', () => {
    const sh = shellOf(id);
    expect(checkStateGoals(sh, goalsOf(id))).toBe(false);

    run(sh, 'cat /srv/doku/wiederanlauf_2026-08.txt');
    run(sh, 'cat /srv/nachweise/wiederanlauf_2026-08.txt');
    run(sh, 'echo "belastbar: wiederanlauf_2026-08" > /home/timo/bewertung.md');

    expect(checkStateGoals(sh, goalsOf(id))).toBe(true);
  });

  /** Wer den Verweis nicht prueft, glaubt ihn nur. */
  it('ohne den Beleg zu oeffnen loest es nicht', () => {
    const sh = shellOf(id);
    run(sh, 'cat /srv/doku/wiederanlauf_2026-08.txt');
    run(sh, 'echo "belastbar: wiederanlauf_2026-08" > /home/timo/bewertung.md');
    expect(checkStateGoals(sh, goalsOf(id)), 'Protokoll ungelesen').toBe(false);
  });
});

describe('Track-Aufbau — dieselben Regeln wie ueberall', () => {
  for (const ev of nis2Events) {
    it(`${ev.id}: zwei ungated Optionen, Hinweise eskalieren`, () => {
      const offen = ev.choices.filter((c) => !c.requires && !c.hidden);
      expect(offen.length, 'jedes Level muss ablehnbar sein').toBeGreaterThanOrEqual(2);

      // Der Track mischt CLI und GUI — die Hinweise haengen je nachdem am
      // terminalContext oder am guiContext.
      const hints = (ev.terminalContext ?? ev.guiContext)!.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0].includes('`'), `erster Hinweis nennt einen Befehl: ${hints[0]}`).toBe(false);
      // Bei GUI-Leveln gibt es keine Syntax — dort muss der letzte Hinweis
      // stattdessen die konkrete Handlung nennen.
      const letzter = hints[hints.length - 1];
      if (ev.terminalContext) {
        expect(letzter.includes('`'), 'letzter Hinweis muss die Syntax geben').toBe(true);
      } else {
        expect(letzter.length, 'letzter Hinweis muss konkret werden').toBeGreaterThan(40);
      }
    });

    /**
     * Die Falle aus dem Kataster-Bau: seedVfsFromScenario materialisiert jeden
     * in taskText/hints genannten Pfad und fuellt ihn mit dem Dateinamen.
     */
    it(`${ev.id}: kein Inhaltsziel wird vom Platzhalter erfuellt`, () => {
      if (!ev.terminalContext) return; // GUI-Level schreiben keine Dateien
      for (const goal of ev.terminalContext.solutions[0].stateGoals ?? []) {
        const g = goal as { file?: string; matches?: string };
        if (!g.file || !g.matches) continue;
        const name = g.file.split('/').pop()!;
        expect(
          new RegExp(g.matches).test(name),
          `${g.file}: der Dateiname erfuellt sein eigenes Inhaltsziel`
        ).toBe(false);
      }
    });

    it(`${ev.id}: zitiert nur geltendes Recht`, () => {
      const blob = JSON.stringify(ev);
      expect(blob, '§ 8a/§ 8b sind Altrecht').not.toMatch(/§\s*8[ab]/);
    });
  }
});

describe('L2/L3 — die Meldekaskade', () => {
  const l2 = byId('learn_nis2_02_erstmeldung');
  const l3 = byId('learn_nis2_03_folgemeldung');

  /**
   * Beide Loesungen verlangen `submit`. Beurteilt wird, was ABGESCHICKT wurde —
   * nicht, was zwischendurch angeklickt war. Sonst wuerde ein einziger
   * Probeklick auf „nein" das Level sofort mit der Falle beenden, und die
   * Ruecknahme (useGuiLevel.retract) waere wirkungslos.
   */
  it.each([['L2', l2], ['L3', l3]])('%s: jede Loesung verlangt submit', (_l, ev) => {
    for (const sol of ev.guiContext!.solutions) {
      expect(sol.interactions, `${ev.id}`).toContain('submit');
      expect(sol.allRequired, 'sonst genuegt ein einzelner Klick').toBe(true);
    }
  });

  it('L2: die Falle steht VOR dem ehrlichen Weg (Risiko vor Lob)', () => {
    const sols = l2.guiContext!.solutions;
    expect(sols[0].setsFlags).toContain('nis2_claimed_certainty');
    expect(sols[sols.length - 1].setsFlags).toContain('nis2_first_report_filed');
  });

  /**
   * Der ehrliche Weg darf nicht von der Falle verdeckt werden: keine
   * Fallen-Loesung darf eine Teilmenge des ehrlichen Wegs sein.
   */
  it.each([['L2', l2], ['L3', l3]])('%s: die Falle verdeckt den ehrlichen Weg nicht', (_l, ev) => {
    const sols = ev.guiContext!.solutions;
    const ehrlich = sols[sols.length - 1];
    for (const falle of sols.slice(0, -1)) {
      const teilmenge = falle.interactions.every((i) => ehrlich.interactions.includes(i));
      expect(teilmenge, `${ev.id}: Falle ist Teilmenge des ehrlichen Wegs`).toBe(false);
    }
  });

  it('L2: „noch unbekannt" ist der ehrliche Weg, „nein" die Falle', () => {
    const sols = l2.guiContext!.solutions;
    expect(sols[0].interactions).toContain('set:grenz:nein');
    expect(sols[sols.length - 1].interactions).toContain('set:grenz:unbekannt');
  });

  it('L3 benennt den Widerspruch, wenn in L2 Gewissheit behauptet wurde', () => {
    const varianten = l3.guiContext!.briefingVariants ?? [];
    const v = varianten.find((x) => x.flag === 'nis2_claimed_certainty');
    expect(v, 'ohne Variante bliebe der Widerspruch unbemerkt').toBeDefined();
    expect(v!.briefing).toMatch(/Erstmeldung/);
  });

  it('L3: an der Falschangabe festhalten ist eine eigene, schlechtere Loesung', () => {
    const sols = l3.guiContext!.solutions;
    expect(sols[0].setsFlags).toContain('nis2_doubled_down');
    expect(sols[sols.length - 1].setsFlags).toContain('nis2_followup_filed');
  });

  /** Pflichtfelder nach § 32 — ohne sie ist die Frist nicht pruefbar. */
  it('L2 verlangt Kenntniszeitpunkt und die kritische Dienstleistung', () => {
    const felder = l2.guiContext!.state.meldung!.felder;
    const pflicht = felder.filter((f) => f.required).map((f) => f.id);
    expect(pflicht).toContain('kenntnis');
    expect(pflicht).toContain('dienstleistung');
    expect(pflicht).toContain('grenz');
  });

  it('die Meldung geht an die gemeinsame Meldestelle, nicht nur ans BSI', () => {
    for (const ev of [l2, l3]) {
      expect(ev.guiContext!.state.meldung!.meldestelle).toMatch(/BSI/);
      expect(ev.guiContext!.state.meldung!.meldestelle, 'das BBK fehlt').toMatch(/BBK/);
    }
  });
});
