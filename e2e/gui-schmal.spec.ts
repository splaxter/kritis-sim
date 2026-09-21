import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Alle GUI-Level bei 320 px: Laesst sich jede Schaltflaeche in den Blick holen?
 *
 * Zwei Fassungen dieses Pruefers lagen vorher daneben, beide auf dieselbe
 * Weise — sie haben SCROLLBAR mit ABGESCHNITTEN verwechselt:
 *
 *  1. `overflow-x: hidden` zusammen mit `overflow-y: auto` ist ein scrollbarer
 *     Kasten. Wer nur auf „hidden" prueft, meldet jede Liste.
 *  2. Und selbst wenn kein Kasten scrollt, scrollt immer noch die SEITE.
 *
 * Beide Male meldete er 22 bis 25 von 26 Leveln, und die Bildschirmfotos
 * zeigten: alles in Ordnung. Deshalb fragt er jetzt das, worauf es ankommt —
 * ob der Browser das Element in den Sichtbereich bringen kann. Was danach
 * immer noch draussen liegt, ist wirklich unerreichbar.
 */

const gui = levelKatalog().filter((l) => l.art === 'gui');

test('jede Schaltflaeche laesst sich bei 320 px in den Blick holen @sichtung', async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  await page.setViewportSize({ width: 320, height: 568 });
  const kaputt: string[] = [];
  const bericht: string[] = [];

  for (const l of gui) {
    await page.goto('/?level');
    await page.getByLabel('Suche').fill(l.id);
    await page.getByRole('button', { name: `Öffnen: ${l.id}` }).click();
    await page.waitForTimeout(900);

    const bedienbar = await page.locator('button:visible, [role="option"]:visible').all();
    let geprueft = 0;
    for (const el of bedienbar) {
      const name = ((await el.getAttribute('aria-label')) ?? (await el.innerText().catch(() => ''))).trim().slice(0, 40).replace(/\n/g, ' ');
      if (!name || (await el.isDisabled().catch(() => false))) continue;
      // Fensterdeko (Minimieren/Maximieren) ist absichtlich nicht bedienbar.
      if (await el.evaluate((e) => (e as HTMLElement).tabIndex === -1 && e.tagName === 'BUTTON')) continue;

      await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      const lage = await el.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          drin: r.top >= -1 && r.left >= -1 && r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1,
          rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          fenster: `${window.innerWidth}x${window.innerHeight}`,
        };
      });
      geprueft++;
      if (!lage.drin) kaputt.push(`${l.id} (${l.guiContext?.app}): „${name}" bleibt draussen [${lage.rect} in ${lage.fenster}]`);
    }
    bericht.push(`ok  ${l.id} (${l.guiContext?.app}): ${geprueft} Schaltflaechen erreichbar`);
  }

  writeFileSync('/tmp/schmal.txt', [...bericht, '', `${gui.length} GUI-Level, ${kaputt.length} auffaellig`, ...kaputt].join('\n'));
  expect(kaputt, 'siehe /tmp/schmal.txt').toEqual([]);
});
