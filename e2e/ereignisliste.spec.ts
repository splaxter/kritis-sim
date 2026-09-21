import { test, expect } from '@playwright/test';

/**
 * Die Ereignisliste muss Zeilen zeigen — nicht Bruchstücke davon.
 *
 * Beim Probespielen gefunden: Die Liste war auf JEDEM Bildschirm genau ihre
 * Mindesthöhe von 44 px, und die Zeilen sind 55 bis 117 px hoch. Der Spieler
 * sah also ein Bruchstück einer Zeile und sollte darin ein bestimmtes Ereignis
 * am Zeitstempel erkennen.
 *
 * Die Ursache war strukturell, nicht eine Zahl: `flexBasis: 0` mit
 * `flexGrow: 1` verteilt nur FREIEN Platz — und das Fenster hatte gar keine
 * Höhe, nur eine Obergrenze. Es gab nie freien Platz zu verteilen. Die 44 px
 * stammten aus einem früheren Fix für das Querformat, wo die Fußleiste aus dem
 * Fenster gedrängt wurde; sie waren als Notbremse gedacht und wurden zur Regel.
 *
 * Deshalb prüft dieser Test BEIDES gegeneinander: genug Liste UND die
 * Fußleiste im Rahmen. Wer das eine repariert und das andere vergisst, fällt
 * hier auf.
 */

const FORMATE = [
  { name: 'schmal hoch', width: 320, height: 568 },
  { name: 'hoch', width: 375, height: 667 },
  { name: 'quer', width: 667, height: 375 },
  { name: 'Desktop', width: 1280, height: 800 },
];

for (const f of FORMATE) {
  test(`Ereignisliste zeigt ganze Zeilen und behält die Fußleiste — ${f.name}`, async ({ page }) => {
    await page.setViewportSize({ width: f.width, height: f.height });
    await page.goto('/?level');
    await page.getByLabel('Suche').fill('blk_c1_logread');
    await page.getByRole('button', { name: 'Öffnen: blk_c1_logread' }).click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 10000 });

    // Auswählen, damit die Detailansicht erscheint — das ist der enge Fall.
    await page.getByRole('option').first().click();
    await expect(page.getByRole('button', { name: /Als Vorfall melden/i })).toBeVisible();

    const mass = await page.evaluate(() => {
      const liste = document.querySelector('[role="listbox"]') as HTMLElement;
      const zeile = document.querySelector('[role="option"]') as HTMLElement;
      return { liste: liste.clientHeight, zeile: zeile.getBoundingClientRect().height };
    });
    const zeilen = mass.liste / mass.zeile;
    expect(
      zeilen,
      `nur ${zeilen.toFixed(1)} Zeilen sichtbar (${Math.round(mass.liste)}px Liste, ${Math.round(mass.zeile)}px Zeile) — ` +
        'darin lässt sich kein Ereignis am Zeitstempel erkennen'
    ).toBeGreaterThanOrEqual(1.5);

    // Und die Bedingung, gegen die das früher eingetauscht wurde: Der
    // Meldeknopf darf nicht aus dem Fensterrahmen gedrängt werden.
    const knopfDrin = await page
      .getByRole('button', { name: /Als Vorfall melden/i })
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        let n = el.parentElement;
        while (n) {
          const cs = getComputedStyle(n);
          if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
            return r.bottom <= n.getBoundingClientRect().bottom + 1;
          }
          n = n.parentElement;
        }
        return true;
      });
    expect(knopfDrin, 'der Meldeknopf wurde aus dem Fensterrahmen gedrängt').toBe(true);
  });
}
