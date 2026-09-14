import { test, expect, Page } from '@playwright/test';

/**
 * Der Auftrag muss LESBAR sein, nicht nur vorhanden.
 *
 * Zweimal hat hier eine feste Hoehe den jeweils naechsten laengeren Auftrag
 * abgeschnitten: erst `max-h-28` das Berichtsschema, dann `max-h-48` die
 * Schreibanleitung von DAS KATASTER — auf 320 px 316 px Inhalt in 191 px
 * sichtbarer Hoehe. Beide Male stand der Text im DOM und war trotzdem weg:
 * Seitenscrollen half nicht, man musste INNERHALB eines unscheinbaren Feldes
 * scrollen.
 *
 * Gemessen wird deshalb gegen das tatsaechlich schneidende Element
 * (scrollHeight gegen clientHeight), nicht gegen den Seitenviewport — eine
 * boundingBox sieht diesen Fehler prinzipiell nicht.
 */

const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 568 },
  { name: 'landscape', width: 667, height: 375 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

const FELD = '[data-testid=aufgabentext]';

/** Bis zum ersten Terminal-Level von DAS KATASTER spielen. */
async function zumKatasterAuftrag(page: Page) {
  await page.goto('/');
  await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
  await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
  await page.getByRole('button', { name: /Story-Kampagne/ }).click();
  await page.getByRole('button', { name: /Das Kataster/ }).click();
  await page.getByRole('button', { name: /Ich weiß es nicht/ }).click();
  await page.getByRole('button', { name: /Weiter/ }).first().click();
  await page.getByRole('button', { name: /Aufgabe starten/ }).click();
  await expect(page.locator(FELD)).toBeVisible();
}

const feldGeometrie = (page: Page) =>
  page.locator(FELD).evaluate((el) => ({
    client: el.clientHeight,
    scroll: el.scrollHeight,
    text: el.textContent || '',
  }));

for (const viewport of VIEWPORTS) {
  test(`der Auftrag steht ganz da — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await zumKatasterAuftrag(page);

    const geo = await feldGeometrie(page);
    // Die Schreibanleitung ist der SCHLUSS des Auftrags — genau der Teil, der
    // gemeldet wurde. Steht sie im Text, faengt die Hoehenpruefung sie mit.
    expect(geo.text, 'die Schreibanleitung gehoert zum Auftrag').toContain('>>');
    expect(geo.text.trimEnd().endsWith('verfügbaren.'), 'und sie steht am Ende').toBe(true);
    expect(
      geo.scroll,
      `${geo.scroll - geo.client} px des Auftrags liegen unter der Scrollkante`
    ).toBeLessThanOrEqual(geo.client + 1);
    // Nichts verborgen heisst auch: kein Knopf noetig.
    await expect(page.getByRole('button', { name: /Ganze Aufgabe anzeigen/ })).toHaveCount(0);
  });
}

test('bleibt doch etwas verborgen, sagt das Feld es — und laesst es aufklappen', async ({ page }) => {
  // Absichtlich enger als jedes echte Geraet: so laeuft der Rueckfallweg
  // wirklich durch, statt nur behauptet zu werden. Der Deckel ist relativ
  // (70vh), also erzwingt eine kurze Bildschirmhoehe den Fall.
  await page.setViewportSize({ width: 320, height: 300 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await zumKatasterAuftrag(page);

  const vorher = await feldGeometrie(page);
  expect(vorher.scroll, 'dieser Viewport soll wirklich schneiden').toBeGreaterThan(vorher.client + 1);

  const knopf = page.getByRole('button', { name: /Ganze Aufgabe anzeigen/ });
  await expect(knopf, 'verborgener Text ohne Hinweis ist der Fehler selbst').toBeVisible();
  // Der Hinweis darf nicht im selben Scrollbereich liegen, den er ankuendigt.
  expect(await knopf.evaluate((el) => !!el.closest('[data-testid=aufgabentext]'))).toBe(false);

  await knopf.click();
  const nachher = await feldGeometrie(page);
  expect(nachher.scroll, 'aufgeklappt steht alles da').toBeLessThanOrEqual(nachher.client + 1);
  await expect(page.getByRole('button', { name: /einklappen/ })).toBeVisible();
});

/**
 * Derselbe Darstellungsweg mit dem zweiten geaenderten Auftrag. AUDIT TRAIL
 * liegt hinter dem Code und hinter einem geloesten Level — der Umweg ist es
 * wert, weil hier dieselbe Schreibanleitung steht und der Befund sonst nur
 * fuer EINE Kampagne belegt waere.
 */
test('auch AUDIT TRAILs Inventur steht auf 320 px ganz da', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
  await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
  await page.getByRole('button', { name: /Story-Kampagne/ }).click();
  // Erst wenn der Dialog steht, hoert er auf die Tastatur.
  await expect(page.getByRole('dialog', { name: 'Kampagne wählen' })).toBeVisible();
  await page.keyboard.type('trick17');
  await expect(page.getByRole('button', { name: /Audit Trail/ })).toBeVisible();
  await page.getByRole('button', { name: /Audit Trail/ }).click();

  // Die Beat-Reihenfolge ist nicht Gegenstand dieses Tests und wird deshalb
  // nicht festgeschrieben: weiterklicken, bis das Aufgabenfeld die Inventur
  // zeigt. Das Level davor ist mit einem einzigen Lesebefehl geloest.
  const feld = page.locator(FELD);
  let l1Geloest = false;
  for (let schritt = 0; schritt < 40; schritt++) {
    if (await feld.isVisible().catch(() => false)) {
      const text = (await feld.textContent()) || '';
      if (text.includes('inventar.md')) break;
      if (!l1Geloest) {
        const term = page.locator('.xterm');
        await term.click();
        await page.keyboard.type('cat /srv/ticket-exports/notizen_m.txt');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800);
        l1Geloest = true;
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(300);
      continue;
    }
    const starten = page.getByRole('button', { name: /Aufgabe starten/ });
    if (await starten.isVisible().catch(() => false)) {
      await starten.click();
    } else {
      const weiter = page.getByRole('button', { name: /Weiter/ }).first();
      if (await weiter.isVisible().catch(() => false)) await weiter.click();
      else await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(300);
  }

  await expect(feld, 'die Inventur wurde nicht erreicht').toContainText('inventar.md');

  const geo = await feldGeometrie(page);
  expect(geo.text, 'die Schreibanleitung gehoert zum Auftrag').toContain('>>');
  expect(
    geo.scroll,
    `${geo.scroll - geo.client} px des Auftrags liegen unter der Scrollkante`
  ).toBeLessThanOrEqual(geo.client + 1);
});
