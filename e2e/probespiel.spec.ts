import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';
import { sollpfad } from '../client/src/engine/sollpfad';
import { alleTerminalLevel } from '../client/src/engine/terminalLevelRegistry';

/**
 * Probespiel: JEDES Terminal-Level mit ableitbarem Weg im echten Browser
 * durchspielen — ueber die Level-Ansicht, damit die Ziehung nicht im Weg steht.
 *
 * Der Node-Durchstich fuhr denselben Weg gegen die Shell und war gruen,
 * waehrend im Spiel 13 Level gegen einen ungesaeten Host liefen. Genau diese
 * Luecke schliesst dieser Lauf: derselbe Weg, aber durch die Oberflaeche.
 */

const eventById = new Map(alleTerminalLevel().map((e) => [e.id, e]));

const kandidaten = levelKatalog()
  .filter((l) => l.art !== 'gui')
  .map((l) => ({ level: l, pfad: sollpfad(eventById.get(l.id)!) }))
  .filter((k) => k.pfad && k.pfad.zeilen.length > 0);

/**
 * Level, deren sichtbare Zeilen den Weg NICHT vollstaendig hergeben — dieselbe
 * Menge wie im Node-Durchstich (`abschreibDurchstich.test.ts`), dort begruendet.
 * Hier stehen sie, damit dieser Lauf eine Aussage trifft statt eine Liste
 * auszugeben: Alles ausserhalb dieser Menge MUSS sich abschreiben lassen.
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

test('Probespiel ueber alle abschreibbaren Terminal-Level @sichtung', async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  const bericht: string[] = [];
  const kaputt: string[] = [];

  for (const { level, pfad } of kandidaten) {
    await page.goto(`/?level`);
    await page.getByLabel('Suche').fill(level.id);
    const knopf = page.getByRole('button', { name: `Öffnen: ${level.id}` });
    if (!(await knopf.isVisible().catch(() => false))) {
      kaputt.push(`${level.id}: nicht in der Ansicht auffindbar`);
      continue;
    }
    await knopf.click();

    const term = page.locator('.xterm');
    // waitFor, nicht isVisible: isVisible() prueft SOFORT und ignoriert eine
    // timeout-Option — es misst dann gegen den noch nicht geladenen Chunk.
    const gestartet = await term
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!gestartet) {
      kaputt.push(`${level.id}: Terminal startet nicht`);
      continue;
    }
    await page.waitForTimeout(300);

    // Schon geloest, bevor irgendwer tippt?
    if (await page.getByText(/AUFGABE ABGESCHLOSSEN/i).isVisible().catch(() => false)) {
      kaputt.push(`${level.id}: GELOEST OHNE EINGABE`);
      continue;
    }

    await term.click();
    for (const zeile of pfad!.zeilen) {
      await page.keyboard.type(zeile);
      await page.keyboard.press('Enter');
      // Gestreamte Ausgabe (ping & Co. tropfen ueber Timer) muss fertig sein,
      // sonst tippt der Lauf in eine beschaeftigte Sitzung — das meldete
      // `evt_tutorial_network` faelschlich als ungeloest.
      await page.waitForTimeout(900);
      if (await page.getByText(/AUFGABE ABGESCHLOSSEN/i).isVisible().catch(() => false)) break;
    }

    const geloest = await page.getByText(/AUFGABE ABGESCHLOSSEN/i).isVisible().catch(() => false);
    bericht.push(`${geloest ? 'ok  ' : 'NEIN'} ${level.id} (${pfad!.quelle}, ${pfad!.zeilen.length} Zeilen) [${level.gruppe}]`);
    if (geloest && NICHT_ABSCHREIBBAR.has(level.id)) {
      kaputt.push(`${level.id}: steht als „nicht abschreibbar", loest aber — Menge veraltet`);
    }
    if (!geloest && NICHT_ABSCHREIBBAR.has(level.id)) continue;
    if (!geloest) {
      const sicht = await page.locator('.xterm').innerText().catch(() => '');
      kaputt.push(`${level.id}: loest nicht.\n    Weg: ${pfad!.zeilen.join(' | ')}\n    Schirm (Ende): ${sicht.split('\n').slice(-12).join(' / ')}`);
    }
  }

  bericht.push('', `${kandidaten.length} Level gefahren, ${kaputt.length} auffaellig`, '', ...kaputt);
  writeFileSync('/tmp/probespiel.txt', bericht.join('\n'));
  expect(kaputt, `${kaputt.length} Level auffaellig — siehe /tmp/probespiel.txt`).toEqual([]);
});
