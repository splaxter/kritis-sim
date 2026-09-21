import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Bedienung ohne Maus.
 *
 * Das Haus ist tastatur-first (CLAUDE.md: „arrows/Enter/Escape drive all menus
 * and modals with focus traps"), fuer die GUI-Level war das aber nie geprueft.
 *
 * Geprueft wird der Vertrag, den die Apps selbst ankuendigen: Wer
 * `role="listbox"` schreibt, verspricht Pfeilnavigation. `EventViewer` und
 * `TaskManager` haben sie nicht gehabt — im Explorer und im Kataster sehr
 * wohl. Fuer den Spieler fuehlt sich so ein Unterschied an, als waere die
 * Tastatur in dieser einen App kaputt.
 */

const gui = levelKatalog().filter((l) => l.art === 'gui');

const fokusRolle = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('role') ?? '-');

const fokusText = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText?.trim().slice(0, 60) ?? '');

test('jede Liste laesst sich mit den Pfeiltasten bedienen @sichtung', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const kaputt: string[] = [];
  const bericht: string[] = [];

  for (const l of gui) {
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    await page.getByRole('button', { name: `Öffnen: ${l.id}` }).click();
    await page.waitForTimeout(900);

    const listen = await page.getByRole('listbox').count();
    const eintraege = await page.getByRole('option').count();
    // Eine leere Liste hat nichts zu navigieren — `kt_l2_erster_eintrag` faengt
    // mit einem leeren Kataster an und wird ueber den Fundstapel daneben
    // bedient. Das ist kein Befund, sondern der Aufbau des Levels.
    if (listen === 0 || eintraege === 0) {
      bericht.push(`—    ${l.id} (${l.guiContext?.app}): ${listen} Listen, ${eintraege} Eintraege — nichts zu navigieren`);
      continue;
    }

    // Bis in die Liste tabben.
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    let drin = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      if ((await fokusRolle(page)) === 'option') { drin = true; break; }
    }
    if (!drin) {
      kaputt.push(`${l.id} (${l.guiContext?.app}): die Liste ist per Tab nicht erreichbar`);
      continue;
    }

    const erste = await fokusText(page);
    await page.keyboard.press('ArrowDown');
    const zweite = await fokusText(page);
    const optionen = await page.getByRole('option').count();

    if (optionen > 1 && zweite === erste) {
      kaputt.push(`${l.id} (${l.guiContext?.app}): ${optionen} Eintraege, aber Pfeil runter bewegt nichts`);
    }
    // Home/End muessen an die Enden springen.
    await page.keyboard.press('End');
    const letzte = await fokusText(page);
    await page.keyboard.press('Home');
    const zurueck = await fokusText(page);
    if (optionen > 1 && (letzte === erste || zurueck !== erste)) {
      kaputt.push(`${l.id} (${l.guiContext?.app}): Home/Ende springen nicht an die Enden`);
    }
    bericht.push(`ok   ${l.id} (${l.guiContext?.app}): ${optionen} Eintraege, Pfeile und Home/Ende tragen`);
  }

  writeFileSync('/tmp/tastatur.txt', [...bericht, '', `${gui.length} GUI-Level, ${kaputt.length} auffaellig`, ...kaputt].join('\n'));
  expect(kaputt, 'siehe /tmp/tastatur.txt').toEqual([]);
});
