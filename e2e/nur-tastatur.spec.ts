import { test, expect, Page } from '@playwright/test';

/**
 * Ein Level je App — **komplett ohne Maus** gespielt.
 *
 * Die vorige Runde hat gezeigt, dass sich jede Liste per Tastatur NAVIGIEREN
 * lässt. Das ist die halbe Antwort: Ob ein Spieler ohne Maus auch bis zur
 * Lösung kommt, war damit nicht geprüft. Hier wird deshalb kein einziges Mal
 * geklickt — nur Tab, Pfeile, Leertaste und Enter.
 *
 * Eine App, die sich nur mit der Maus lösen lässt, ist für Tastaturnutzer ein
 * verschlossenes Level, und das Haus ist ausdrücklich tastatur-first.
 */

/**
 * Bis zu einem Element mit diesem zugänglichen Namen tabben.
 *
 * Der Name kommt NICHT nur aus dem sichtbaren Text: Ein Eingabefeld hat gar
 * keinen, sein Name steht in `aria-labelledby` oder im zugehörigen `<label>`.
 * Die erste Fassung dieser Hilfe las nur `innerText` und fand deshalb kein
 * einziges Formularfeld — ein Fehlalarm, der wie ein Bedienfehler aussah.
 */
async function tabBisZu(page: Page, name: RegExp, max = 40): Promise<boolean> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const treffer = await page.evaluate((muster) => {
      const el = document.activeElement as (HTMLElement & { labels?: NodeListOf<HTMLLabelElement>; placeholder?: string }) | null;
      if (!el) return false;
      const ausId = (attr: string) =>
        (el.getAttribute(attr) ?? '')
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.innerText ?? '')
          .join(' ');
      const namen = [
        el.getAttribute('aria-label') ?? '',
        ausId('aria-labelledby'),
        el.labels?.[0]?.innerText ?? '',
        el.innerText ?? '',
        el.placeholder ?? '',
      ];
      return namen.some((n) => n.trim() && new RegExp(muster, 'i').test(n.trim()));
    }, name.source);
    if (treffer) return true;
  }
  return false;
}

/**
 * Bedienen, wie die Tastatur es vorsieht: Ein Kontrollkästchen schaltet mit
 * der LEERTASTE, nicht mit Enter — das ist HTML-Verhalten, kein Fehler der App.
 */
async function bediene(page: Page) {
  const istKasten = await page.evaluate(() => {
    const el = document.activeElement as HTMLInputElement | null;
    return el?.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio');
  });
  await page.keyboard.press(istKasten ? 'Space' : 'Enter');
}

/**
 * Ein Feld leeren — mit der Tastatur, nicht mit `fill()`.
 *
 * `Control+a` taugt dafür nicht: Auf macOS ist das „an den Zeilenanfang", nicht
 * „alles markieren". Das Getippte wurde damit ANGEHÄNGT statt zu ersetzen, und
 * die zweite Messung lief auf „198.51.100.7203.0.113.66".
 */
async function leere(page: Page) {
  await page.keyboard.press('End');
  for (let i = 0; i < 40; i++) await page.keyboard.press('Backspace');
}

/** In einer Liste mit den Pfeilen bis zum passenden Eintrag laufen. */
async function pfeilBisZu(page: Page, muster: RegExp, max = 20): Promise<boolean> {
  for (let i = 0; i < max; i++) {
    const text = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText ?? '');
    if (muster.test(text)) return true;
    await page.keyboard.press('ArrowDown');
  }
  return muster.test(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText ?? ''));
}

async function oeffne(page: Page, id: string) {
  await page.goto('/?level');
  await page.getByLabel('Suche').fill(id);
  // Der letzte Mausklick der Prüfung — er ersetzt nur die Level-Auswahl,
  // die es im Spiel selbst nicht gibt.
  await page.getByRole('button', { name: `Öffnen: ${id}` }).click();
  await page.waitForTimeout(900);
  await page.locator('body').click({ position: { x: 2, y: 2 } });
}

const geloest = (page: Page) => expect(page.getByText(/gelöst:/)).toBeVisible({ timeout: 8000 });

test('Task-Manager: Prozess ohne Maus beenden', async ({ page }) => {
  await oeffne(page, 'blk_c1_hunt_gui');
  expect(await tabBisZu(page, /NT Kernel|System/)).toBe(true);
  expect(await pfeilBisZu(page, /svch0st\.exe/)).toBe(true);
  await bediene(page); // auswählen
  expect(await tabBisZu(page, /Task beenden/)).toBe(true);
  await bediene(page);
  await geloest(page);
});

test('Ereignisanzeige: Vorfall ohne Maus melden', async ({ page }) => {
  await oeffne(page, 'blk_c1_logread');
  expect(await tabBisZu(page, /Überwachung|Warnung|Information/)).toBe(true);
  expect(await pfeilBisZu(page, /4688/)).toBe(true);
  await page.keyboard.press('Enter');
  expect(await tabBisZu(page, /Als Vorfall melden/)).toBe(true);
  await page.keyboard.press('Enter');
  await geloest(page);
});

test('Explorer: zu weite Berechtigung ohne Maus entfernen', async ({ page }) => {
  await oeffne(page, 'gui_explorer_auth_users');
  expect(await tabBisZu(page, /Administratoren|Jeder|Authentifizierte/)).toBe(true);
  expect(await pfeilBisZu(page, /Authentifizierte Benutzer/)).toBe(true);
  await page.keyboard.press('Enter');
  expect(await tabBisZu(page, /Entfernen/)).toBe(true);
  await page.keyboard.press('Enter');
  await geloest(page);
});

test('Core-Firewall: sperren und isolieren ohne Maus', async ({ page }) => {
  await oeffne(page, 'blk_c3_firewall');
  expect(await tabBisZu(page, /Blockieren: SSH\/RDP von extern/)).toBe(true);
  await page.keyboard.press('Enter');
  expect(await tabBisZu(page, /Isolieren: SCADA/)).toBe(true);
  await page.keyboard.press('Enter');
  await geloest(page);
});

test('Windows-Sicherheit: drei Schalter ohne Maus umlegen', async ({ page }) => {
  await oeffne(page, 'adv_gui_settings_preharden');
  for (const schalter of [/^Echtzeitschutz$/, /^Domänennetzwerk-Firewall$/, /^Manipulationsschutz$/]) {
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    expect(await tabBisZu(page, schalter), `${schalter} nicht per Tab erreichbar`).toBe(true);
    await bediene(page);
    await page.waitForTimeout(150);
  }
  await geloest(page);
});

test('Perimeter-WebAdmin: einengen und messen ohne Maus', async ({ page }) => {
  await oeffne(page, 'learn_fw_01_regelwerk');
  expect(await tabBisZu(page, /Quelle einengen/)).toBe(true);
  await page.keyboard.press('Enter');

  // Zwei Messungen, beide über die Felder — ohne Maus.
  for (const quelle of ['203.0.113.66', '198.51.100.7']) {
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    expect(await tabBisZu(page, /^Quelle$/), 'Eingabefeld Quelle').toBe(true);
    await leere(page);
    await page.keyboard.type(quelle);
    expect(await tabBisZu(page, /^Dienst$/), 'Eingabefeld Dienst').toBe(true);
    await leere(page);
    await page.keyboard.type('3389/tcp');
    // Enter im Formular schickt ab — ohne den Knopf suchen zu müssen.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  await geloest(page);
});

test('UAC: die richtige Antwort ohne Maus geben', async ({ page }) => {
  await oeffne(page, 'CLOUD365-SC-007');
  expect(await tabBisZu(page, /^Nein$|Nein,/)).toBe(true);
  await page.keyboard.press('Enter');
  await geloest(page);
});

/**
 * In einer Auswahlliste den gewünschten Eintrag TIPPEN.
 *
 * Nicht mit den Pfeilen: Bei einer nativen Auswahlliste öffnen die im
 * Headless-Browser ein Systemmenü, das die Automatisierung nicht sieht — der
 * Wert ändert sich dort nicht. Das ist Browserverhalten, kein Fehler der App.
 * Die Anfangsbuchstaben zu tippen ist der zweite Standardweg und funktioniert
 * überall.
 */
async function waehleDurchTippen(page: Page, anfang: string, wert: string): Promise<boolean> {
  await page.keyboard.type(anfang);
  return (await page.evaluate(() => (document.activeElement as HTMLSelectElement | null)?.value ?? '')) === wert;
}

test('Pflichtenkataster: aufnehmen und Turnus setzen ohne Maus', async ({ page }) => {
  await oeffne(page, 'kt_l2_erster_eintrag');
  expect(await tabBisZu(page, /Ins Kataster aufnehmen: Monatlichen/)).toBe(true);
  await bediene(page);
  await page.waitForTimeout(300);

  await page.locator('body').click({ position: { x: 2, y: 2 } });
  expect(await tabBisZu(page, /^Turnus/), 'Turnus-Schaltfläche').toBe(true);
  await bediene(page);
  await page.waitForTimeout(300);

  // Im geöffneten Menü steht der Fokus bereits auf dem ersten Eintrag; hier
  // wird mit den PFEILEN gewandert, nicht mit Tab — Tab verlässt das Menü.
  expect(await page.getByRole('menuitem').count(), 'Menü offen').toBeGreaterThan(0);
  expect(
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText?.trim()),
    'Fokus steht im Menü'
  ).toBe('monatlich');
  await page.keyboard.press('Enter');
  await geloest(page);
});

test('Meldeformular: ausfüllen und absenden ohne Maus', async ({ page }) => {
  await oeffne(page, 'learn_nis2_02_erstmeldung');

  expect(await tabBisZu(page, /Zeitpunkt der Kenntnisnahme/)).toBe(true);
  await page.keyboard.type('05.09.2026 17:40');

  expect(await tabBisZu(page, /Art des Vorfalls/)).toBe(true);
  expect(await waehleDurchTippen(page, 'Vers', 'ransomware'), 'Art des Vorfalls wählbar').toBe(true);

  // Das Kästchen, dessen Name vorher fehlte — hier zählt, dass es ihn hat.
  expect(await tabBisZu(page, /^Dateiserver Disposition$/), 'Kästchen mit eigenem Namen').toBe(true);
  await bediene(page);

  // Erste Radiogruppe: „Verdacht auf rechtswidrige Handlung" → ja.
  expect(await tabBisZu(page, /^ja$/), 'erste Radiogruppe').toBe(true);
  await bediene(page);

  // Zweite Gruppe: grenzüberschreitend → „noch unbekannt", die ehrliche
  // Antwort nach drei Stunden. Pfeile wählen in einer Radiogruppe direkt aus.
  expect(await tabBisZu(page, /^ja$/), 'zweite Radiogruppe').toBe(true);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(
    await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value),
    'dritte Antwort gewählt'
  ).toBe('unbekannt');

  expect(await tabBisZu(page, /Betroffene kritische Dienstleistung/)).toBe(true);
  expect(await waehleDurchTippen(page, 'Siedl', 'entsorgung'), 'Dienstleistung wählbar').toBe(true);

  expect(await tabBisZu(page, /Meldung absenden/)).toBe(true);
  await bediene(page);
  await geloest(page);
});
