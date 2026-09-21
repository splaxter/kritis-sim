import { test, expect } from '@playwright/test';
import { levelKatalog } from '../client/src/engine/levelKatalog';

/**
 * Die Autorenansicht, benutzt statt beschrieben.
 *
 * Eine Liste, aus der sich nichts öffnen lässt, ist keine Hilfe — und genau das
 * wäre nicht aufgefallen: Der Katalog ist reines Datensammeln und lässt sich
 * mit Node-Tests grün bekommen, ohne dass je ein Level startet. Deshalb wird
 * hier geklickt: filtern, öffnen, spielen, zurück.
 */

const katalog = levelKatalog();

test('listet den ganzen Bestand und filtert ihn', async ({ page }) => {
  await page.goto('/?level');

  await expect(page.getByText(/LEVEL-ANSICHT/)).toBeVisible();
  await expect(page.getByTestId('treffer')).toHaveText(`${katalog.length} von ${katalog.length}`);

  // Suche grenzt ein …
  await page.getByLabel('Suche').fill('KRITIS-SC-013');
  await expect(page.getByTestId('treffer')).toHaveText(`1 von ${katalog.length}`);
  await expect(page.getByText('Die Kopplung ist keine Grenze')).toBeVisible();

  // … und der Filter nach Gewinnmodell auch.
  await page.getByLabel('Suche').fill('');
  await page.getByLabel('Gewinnmodell').selectOption('gui-interaktionen');
  const guiAnzahl = katalog.filter((l) => l.gewinnmodell === 'gui-interaktionen').length;
  await expect(page.getByTestId('treffer')).toHaveText(`${guiAnzahl} von ${katalog.length}`);
});

test('ein Terminal-Level lässt sich aus der Liste heraus spielen', async ({ page }) => {
  await page.goto('/?level');
  await page.getByLabel('Suche').fill('KRITIS-SC-012');
  await page.getByRole('button', { name: 'Öffnen: KRITIS-SC-012' }).click();

  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('aufgabentext')).toContainText('bind9');

  await term.click();
  await page.keyboard.type('sudo ufw allow 53');
  await page.keyboard.press('Enter');

  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/i)).toBeVisible({ timeout: 10000 });
  await page.keyboard.press('Enter');
  // Die Ansicht meldet den Ausgang in ihrer Kopfzeile — kein Spielstand, kein
  // Fortschritt, nur das Ergebnis.
  await expect(page.getByText(/gelöst:/)).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: /zurück zur Liste/ }).click();
  await expect(page.getByTestId('treffer')).toBeVisible();
});

test('ein GUI-Level lässt sich aus der Liste heraus spielen', async ({ page }) => {
  await page.goto('/?level');
  await page.getByLabel('Suche').fill('learn_fw_01_regelwerk');
  await page.getByRole('button', { name: 'Öffnen: learn_fw_01_regelwerk' }).click();

  await expect(page.getByRole('dialog', { name: /Perimeter-Firewall/ })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Quelle einengen: Fernwartung Hersteller/i }).click();
  await page.getByLabel('Quelle').fill('203.0.113.66');
  await page.getByLabel('Dienst').fill('3389/tcp');
  await page.getByRole('button', { name: /Testverkehr senden/i }).click();
  await page.getByLabel('Quelle').fill('198.51.100.7');
  await page.getByLabel('Dienst').fill('3389/tcp');
  await page.getByRole('button', { name: /Testverkehr senden/i }).click();

  await expect(page.getByText(/gelöst:/)).toBeVisible({ timeout: 10000 });
});

test('die Ansicht faehrt die Spielmaschine gar nicht erst hoch', async ({ page }) => {
  // Ein Werkzeug zum Nachsehen darf den Stand dessen, der nachsieht, nicht
  // anfassen. Gemessen wird das an der Spieler-Kennung: `App` legt beim Booten
  // eine an, wenn keine da ist (App.tsx, ensurePlayerId). Bleibt sie aus, ist
  // die Spielmaschine nie gestartet — deshalb haengt die Weiche in main.tsx
  // und nicht in App.
  //
  // Ein Test auf „der Spielstand ist noch da" haette hier NICHT gereicht: Mit
  // einem gueltigen Umschlag ueberlebt der Stand auch, wenn App bootet. Die
  // Gegenprobe hat genau das gezeigt.
  await page.goto('/?level');
  await page.getByLabel('Suche').fill('KRITIS-SC-012');
  await page.getByRole('button', { name: 'Öffnen: KRITIS-SC-012' }).click();
  await expect(page.locator('.xterm')).toBeVisible({ timeout: 10000 });

  const kennung = await page.evaluate(() => localStorage.getItem('kritis_player_id'));
  expect(kennung, 'die Ansicht hat eine Spielerkennung angelegt — App ist gebootet').toBeNull();

  const geschrieben = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('kritis_'))
  );
  expect(geschrieben, 'die Ansicht hat in den Spielstand geschrieben').toEqual([]);
});
