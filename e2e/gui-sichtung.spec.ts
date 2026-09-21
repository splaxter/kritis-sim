import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Alle GUI-Level einmal aufmachen.
 *
 * Gesucht wird das, was beim Bauen durchrutscht und beim Spielen sofort
 * auffaellt: eine App, die gar nicht gerendert wird (`WindowsLevel` hat einen
 * Platzhalter „noch nicht implementiert" fuer unbekannte App-Namen), ein
 * leeres Briefing, oder ein Level, das schon offen ist, bevor jemand klickt.
 */

const gui = levelKatalog().filter((l) => l.art === 'gui');

test('jedes GUI-Level rendert seine App und ist noch nicht geloest @sichtung', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const kaputt: string[] = [];
  const bericht: string[] = [];

  for (const l of gui) {
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    const knopf = page.getByRole('button', { name: `Öffnen: ${l.id}` });
    await knopf.click();
    await page.waitForTimeout(1200);

    const text = await page.locator('body').innerText().catch(() => '');
    if (/noch nicht implementiert/i.test(text)) {
      kaputt.push(`${l.id}: App „${l.guiContext?.app}" rendert nur den Platzhalter`);
      continue;
    }
    if (/AUFGABE ABGESCHLOSSEN/i.test(text)) {
      kaputt.push(`${l.id}: GELOEST OHNE KLICK`);
      continue;
    }
    const briefing = l.guiContext?.briefing ?? '';
    if (briefing.length > 0 && !text.includes(briefing.slice(0, 40))) {
      kaputt.push(`${l.id}: Briefing steht nicht auf dem Schirm`);
    }
    // Es muss ueberhaupt etwas zu bedienen geben.
    const knoepfe = await page.getByRole('button').count();
    if (knoepfe < 3) kaputt.push(`${l.id}: nur ${knoepfe} Schaltflaechen — nichts zu bedienen?`);
    bericht.push(`ok  ${l.id} (${l.guiContext?.app}, ${knoepfe} Schaltflaechen, ${l.bedingungen} Interaktionen)`);
  }

  writeFileSync('/tmp/gui.txt', [...bericht, '', `${gui.length} GUI-Level, ${kaputt.length} auffaellig`, ...kaputt].join('\n'));
  expect(kaputt, `${kaputt.length} auffaellig — siehe /tmp/gui.txt`).toEqual([]);
});
