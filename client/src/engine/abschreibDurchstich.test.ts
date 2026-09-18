import { describe, it, expect } from 'vitest';
import type { GameEvent, TerminalContext } from '@kritis/shared';
import { alleTerminalLevel } from './terminalLevelRegistry';
import { sollpfad } from './sollpfad';
import { fahreSollpfad } from './sollpfadFahrer';

/**
 * Der Abschreib-Durchstich: Was auf dem Bildschirm steht, muss funktionieren.
 *
 * Fuer jedes Terminal-Level des Spiels — Ereignisse, Lernpfad, Kampagnen und
 * Anbieter-Packs — wird der Sollpfad hergeleitet und gegen die ECHTE Shell
 * gefahren. „Sollpfad" heisst streng: nur Zeilen, die im Level woertlich zu
 * sehen sind. Kein Fremdwissen, keine Interpretation.
 *
 * Anlass: Ein Hinweis mit `printf 'a\\nb\\n' > datei` machte sein Level
 * unloesbar, weil diese Shell `\\n` woertlich schreibt. Niemand hatte den
 * Hinweis je ausgefuehrt.
 *
 * Die erste Fassung des Fahrers hat sich dabei selbst belogen — siehe
 * `sollpfadFahrer.ts`. Vier Level galten faelschlich als nicht abschreibbar.
 */

const level = alleTerminalLevel();

/** Der Bestand, gegen den die drei Mengen unten gelten. Waechst oder schrumpft
 *  er, muessen die Mengen neu bestimmt werden — sonst behauptet dieser Test
 *  Deckung, die er nicht mehr hat. */
const LEVEL_GESAMT = 91;

/**
 * Level, deren sichtbare Zeilen den Sollpfad NICHT vollstaendig hergeben.
 * Zwei Gruende: die Hinweise nennen einen Befehl, aber der konkrete Pfad steht
 * in Prosa; oder das Level spielt ueber mehrere Rechner und braucht Zustand,
 * den eine einzelne Zeile nicht herstellt.
 */
const NICHT_ABSCHREIBBAR = new Set([
  'learn_00_einstufung', 'learn_nis2_05_belastbar',
  'learn_ssh_01_first_key', 'learn_ssh_02_open_door', 'learn_ssh_03_jumphost',
  'learn_ssh_04_key_graveyard', 'learn_net_03_the_wall', 'learn_net_04_spider',
  'at_l2_inventory', 'at_l3_ticket_diff', 'at_l4_iis_log', 'at_l5_evidence_chain',
  'at_l6_enable_auditing', 'at_l8_bastion_live',
  'kt_l3_null_von_280', 'kt_l4_acht_monate', 'kt_l5_verweis_ins_leere',
  'kt_l6_erinnerung', 'kt_l8_fristen',
]);

/**
 * Level, aus denen sich ueberhaupt keine tippbare Zeile ableiten laesst: ihre
 * Beats sind Muster (`passwd.*switch|switch.*passwd`) und ihre Hinweise setzen
 * keine Backticks. Eine Aussage ueber die Pruefbarkeit, nicht ueber Qualitaet.
 */
const OHNE_SOLLPFAD = new Set([
  'evt_kritis_audit_prep', 'blk_c1_hunt_cli',
  'AMSE-SC-001', 'AMSE-SC-002', 'AMSE-SC-004', 'AMSE-SC-007', 'AMSE-SC-008',
  'KRITIS-SC-001', 'KRITIS-SC-002', 'KRITIS-SC-008',
]);

const ohneSollpfad = new Set(level.filter((e) => sollpfad(e)!.quelle === 'keine').map((e) => e.id));
const gefahren = level
  .filter((e) => !ohneSollpfad.has(e.id))
  .map((e) => ({ id: e.id, ...fahreSollpfad(e) }));
const geloest = new Set(gefahren.filter((f) => f.geloest).map((f) => f.id));
const ungeloest = new Set(gefahren.filter((f) => !f.geloest).map((f) => f.id));

const sortiert = (menge: Iterable<string>) => [...menge].sort();

describe('Der Bestand, auf den sich die Mengen beziehen', () => {
  /**
   * Ohne diese Pruefung faellt ein VERSCHWUNDENES Level durch alle Maschen: die
   * uebrigen Zusicherungen gelten nur fuer das, was gerade gefunden wurde. Im
   * Review liess sich ein loesbares Level und eine benannte Ausnahme aus der
   * Registry entfernen, ohne dass irgendetwas rot wurde.
   */
  it('die Registry findet genau den erwarteten Bestand', () => {
    expect(
      level.length,
      'Level dazugekommen oder verschwunden — die drei Mengen unten neu bestimmen'
    ).toBe(LEVEL_GESAMT);
  });

  it('keine der drei Mengen nennt ein Level, das es nicht gibt', () => {
    const vorhanden = new Set(level.map((e) => e.id));
    const verwaist = [...NICHT_ABSCHREIBBAR, ...OHNE_SOLLPFAD].filter((id) => !vorhanden.has(id));
    expect(verwaist, 'diese Ausnahmen zeigen ins Leere').toEqual([]);
  });

  it('die drei Mengen decken den Bestand luecken- und ueberschneidungsfrei', () => {
    expect(sortiert([...geloest, ...ungeloest, ...ohneSollpfad])).toEqual(
      sortiert(level.map((e) => e.id))
    );
    expect([...geloest].filter((id) => ungeloest.has(id))).toEqual([]);
  });
});

describe('Abschreib-Durchstich ueber alle Terminal-Level', () => {
  it('genau die benannten Level haben keinen herleitbaren Sollpfad', () => {
    expect(sortiert(ohneSollpfad)).toEqual(sortiert(OHNE_SOLLPFAD));
  });

  it('genau die benannten Level sind nicht durch Abschreiben loesbar', () => {
    // Beide Richtungen: ein Level, das neu durchfaellt, ist ein Fehler — eines,
    // das jetzt loest, macht die Liste veraltet.
    expect(sortiert(ungeloest)).toEqual(sortiert(NICHT_ABSCHREIBBAR));
  });

  it.each(
    level.filter((e) => !OHNE_SOLLPFAD.has(e.id) && !NICHT_ABSCHREIBBAR.has(e.id)).map((e) => [e.id] as const)
  )('%s bleibt durch Abschreiben loesbar', (id) => {
    expect(geloest.has(id), `${id} war abschreibbar loesbar und ist es nicht mehr`).toBe(true);
  });
});

/**
 * Der Fahrer selbst — gepruefte Gegenprobe statt Vertrauen.
 *
 * Genau dieser Fall stand im Review: Wer die laufende Ausgabe nicht abwartet
 * und nach dem Erfolg weitertippt, sieht den Erfolg nicht. Dann bleibt der Test
 * gruen, auch wenn ein sichtbarer Hinweis auf eine falsche PID zeigt.
 */
describe('Der Fahrer merkt, wenn ein sichtbarer Hinweis falsch wird', () => {
  const mitVeraendertemHinweis = (id: string, von: string, nach: string): GameEvent => {
    const original = level.find((e) => e.id === id)!;
    const ctx = original.terminalContext!;
    const kopie: TerminalContext = {
      ...ctx,
      hints: (ctx.hints ?? []).map((h) => h.replaceAll(von, nach)),
      taskText: ctx.taskText?.replaceAll(von, nach),
    };
    return { ...original, terminalContext: kopie };
  };

  it('learn_net_01_open_doors loest — mit falscher PID nicht mehr', () => {
    const original = level.find((e) => e.id === 'learn_net_01_open_doors')!;
    expect(fahreSollpfad(original).geloest, 'Vorbedingung: das Level loest').toBe(true);

    const kaputt = mitVeraendertemHinweis('learn_net_01_open_doors', 'kill 6666', 'kill 7777');
    expect(
      fahreSollpfad(kaputt).geloest,
      'ein Hinweis auf die falsche PID muss auffallen'
    ).toBe(false);
  });

  it('haelt einen Erfolg fest, statt ihn durch Weitertippen zu verlieren', () => {
    // `learn_ans_04_fleet_hardening` loest MITTEN im Pfad; das naechste Enter
    // waere die Bestaetigung und wuerde `solved` zuruecksetzen.
    const fahrt = fahreSollpfad(level.find((e) => e.id === 'learn_ans_04_fleet_hardening')!);
    expect(fahrt.geloest).toBe(true);
    expect(fahrt.zeilenGetippt, 'nach dem Erfolg wird nicht weitergetippt')
      .toBeLessThan(fahrt.pfad.zeilen.length + 1);
  });

  it('wartet gestreamte Ausgabe ab, statt in eine beschaeftigte Sitzung zu tippen', () => {
    // `evt_tutorial_network` streamt drei ping-Antworten ueber Timer. Ohne
    // Ticks fielen die naechsten Befehle ins Leere und das Level galt als
    // nicht abschreibbar.
    expect(fahreSollpfad(level.find((e) => e.id === 'evt_tutorial_network')!).geloest).toBe(true);
  });
});
