import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Jeder Aufgabentext bei 320 px — die Breite, an der zweimal etwas abgeschnitten
 * wurde.
 *
 * `aufgabenfeld.spec.ts` prueft sieben Level; erst mit der Level-Ansicht laesst
 * sich das fuer ALLE machen. Gemessen wird, was `boundingBox()` nicht sieht:
 * ob der Text im Feld ueberlaeuft, ohne dass es eine Moeglichkeit zum
 * Aufklappen gaebe.
 */

const alle = levelKatalog().filter((l) => l.art !== 'gui');

test('kein Aufgabentext ist bei 320 px unerreichbar @sichtung', async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  await page.setViewportSize({ width: 320, height: 568 });
  const kaputt: string[] = [];
  const bericht: string[] = [];

  for (const l of alle) {
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    await page.getByRole('button', { name: `Öffnen: ${l.id}` }).click();
    await page.locator('.xterm').waitFor({ state: 'visible', timeout: 15000 });

    const feld = page.getByTestId('aufgabentext');
    if (!(await feld.isVisible())) { kaputt.push(`${l.id}: kein Aufgabenfeld`); continue; }

    const mass = await feld.evaluate((el) => ({
      scroll: el.scrollHeight, sicht: el.clientHeight, text: (el.textContent ?? '').length,
    }));
    const gekuerzt = mass.scroll > mass.sicht + 1;
    const knopf = page.getByRole('button', { name: /Ganze Aufgabe anzeigen|Aufgabe einklappen/ });
    const knopfDa = await knopf.isVisible().catch(() => false);

    if (gekuerzt && !knopfDa) {
      kaputt.push(`${l.id}: ${mass.scroll}px Text in ${mass.sicht}px sichtbar, KEIN Aufklapp-Knopf`);
    }
    if (mass.text === 0) kaputt.push(`${l.id}: Aufgabenfeld ist leer`);
    bericht.push(`${gekuerzt ? (knopfDa ? 'gek.+Knopf' : 'ABGESCHNITTEN') : 'ganz      '} ${l.id} ${mass.scroll}/${mass.sicht}px, ${mass.text} Zeichen`);
  }

  writeFileSync('/tmp/aufgabenfeld.txt', [...bericht, '', ...kaputt].join('\n'));
  expect(kaputt, `${kaputt.length} Auffaelligkeiten — siehe /tmp/aufgabenfeld.txt`).toEqual([]);
});
