import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from './shell';
import { TerminalSession } from '../components/Terminal/session/TerminalSession';
import { alleTerminalLevel } from './terminalLevelRegistry';
import { sollpfad } from './sollpfad';

/**
 * Der Abschreib-Durchstich: Was auf dem Bildschirm steht, muss funktionieren.
 *
 * Fuer jedes Terminal-Level des Spiels — Ereignisse, Lernpfad, Kampagnen und
 * Anbieter-Packs, 87 an der Zahl — wird der Sollpfad hergeleitet und gegen die
 * ECHTE Shell gefahren. „Sollpfad" heisst hier streng: nur Zeilen, die im Level
 * woertlich zu sehen sind (gescriptete Beats oder Befehlszeilen in Backticks).
 * Kein Fremdwissen, keine Interpretation.
 *
 * Das ist der Anlass: Ein Hinweis, der `printf 'a\\nb\\n' > datei` empfahl, machte
 * sein Level unloesbar, weil diese Shell `\\n` woertlich schreibt. Der Fehler
 * stand monatelang da; niemand hatte den Hinweis je ausgefuehrt.
 *
 * Was dieser Test NICHT behauptet: dass jedes Level durch blosses Abschreiben
 * loesbar sein muesste. Die Hinweise eskalieren absichtlich — der erste
 * orientiert, erst der letzte nennt die Syntax — und manche Schritte stehen in
 * Prosa („den Treffer mit `cat` lesen"). Solche Level stehen unten namentlich.
 */

const level = alleTerminalLevel();

/**
 * Level, deren sichtbare Zeilen den Sollpfad NICHT vollstaendig hergeben.
 * Ueberwiegend zwei Gruende: die Hinweise nennen einen Befehl, aber der Pfad
 * dazu steht in Prosa; oder das Level spielt ueber mehrere Rechner und braucht
 * Zustand, den eine Zeile allein nicht herstellt.
 *
 * Die Liste ist eine Ratsche, kein Freibrief: faellt ein Level heraus (es wird
 * loesbar), muss es hier gestrichen werden — dann ist die Liste veraltet.
 */
const NICHT_ABSCHREIBBAR = new Set([
  // Hinweise nennen Befehle, der konkrete Pfad steht in Prosa
  'evt_tutorial_network', 'learn_00_einstufung', 'learn_nis2_05_belastbar',
  'at_l2_inventory', 'at_l3_ticket_diff', 'at_l4_iis_log', 'at_l5_evidence_chain',
  'at_l6_enable_auditing', 'kt_l3_null_von_280', 'kt_l4_acht_monate',
  'kt_l5_verweis_ins_leere', 'kt_l6_erinnerung', 'kt_l8_fristen',
  // Mehrere Rechner / Zustand ueber mehrere Schritte
  'learn_ssh_01_first_key', 'learn_ssh_02_open_door', 'learn_ssh_03_jumphost',
  'learn_ssh_04_key_graveyard', 'learn_net_01_open_doors', 'learn_net_03_the_wall',
  'learn_net_04_spider', 'learn_ans_02_drift', 'learn_ans_04_fleet_hardening',
  'at_l8_bastion_live',
]);

/**
 * Level, aus denen sich ueberhaupt keine tippbare Zeile ableiten laesst: ihre
 * Beats sind Muster (`passwd.*switch|switch.*passwd`) und ihre Hinweise setzen
 * keine Backticks. Sie sind damit nicht automatisch pruefbar — was eine
 * Aussage ueber die Pruefbarkeit ist, nicht ueber die Qualitaet.
 */
const OHNE_SOLLPFAD = new Set([
  'evt_kritis_audit_prep', 'blk_c1_hunt_cli',
  'AMSE-SC-001', 'AMSE-SC-002', 'AMSE-SC-004', 'AMSE-SC-007', 'AMSE-SC-008',
  'KRITIS-SC-001', 'KRITIS-SC-002', 'KRITIS-SC-008',
]);

function fahre(event: (typeof level)[number]) {
  const ctx = event.terminalContext!;
  const pfad = sollpfad(event)!;
  const shell = createShellFromContext(ctx);
  const session = new TerminalSession({
    shell, context: ctx, gameMode: 'learning', onSolved: vi.fn(), onFlagsSet: vi.fn(),
  });
  for (const zeile of pfad.zeilen) {
    for (const zeichen of zeile) session.handleData(zeichen);
    session.handleData('\r');
    if (shell.hasPendingInput()) {
      for (const zeichen of 'ja') session.handleData(zeichen);
      session.handleData('\r');
    }
  }
  return { pfad, geloest: session.getSnapshot().solved };
}

describe('Abschreib-Durchstich ueber alle Terminal-Level', () => {
  it('die Registry findet ueberhaupt Level (sonst prueft der Rest nichts)', () => {
    expect(level.length, 'keine Terminal-Level gefunden').toBeGreaterThan(80);
  });

  it('nur die benannten Level haben keinen herleitbaren Sollpfad', () => {
    const ohne = level.filter((e) => sollpfad(e)!.quelle === 'keine').map((e) => e.id).sort();
    expect(ohne).toEqual([...OHNE_SOLLPFAD].sort());
  });

  it.each(
    level.filter((e) => !OHNE_SOLLPFAD.has(e.id)).map((e) => [e.id, e] as const)
  )('%s: der sichtbare Pfad laeuft und loest, soweit er reicht', (id, event) => {
    const { pfad, geloest } = fahre(event);
    expect(pfad.zeilen.length, 'kein Sollpfad, aber nicht als Ausnahme benannt').toBeGreaterThan(0);

    if (NICHT_ABSCHREIBBAR.has(id)) {
      // Ratsche: wird ein solches Level doch abschreibbar, gehoert es aus der
      // Liste gestrichen — sonst verliert sie ihre Aussagekraft.
      expect(
        geloest,
        `${id} ist jetzt durch Abschreiben loesbar — aus NICHT_ABSCHREIBBAR streichen`
      ).toBe(false);
      return;
    }
    expect(
      geloest,
      `${id} war durch Abschreiben loesbar und ist es nicht mehr.\n` +
        `Sollpfad (${pfad.quelle}): ${JSON.stringify(pfad.zeilen)}`
    ).toBe(true);
  });
});
