import { test, expect, Page } from '@playwright/test';

/**
 * Die vier Playtest-/Review-Repros am echten UI.
 *
 * Jeder dieser Tests bildet einen Befund ab, den vorher nur ein Mensch im
 * Browser gefunden hat — eine haengende Hilfe, ein falsches Ziel, das als
 * Beleg zaehlte, ein erfundener Tastendruck und ein Befund, der auf dem
 * Ergebnisbildschirm verschwand. Unit-Tests hatten sie alle nicht gesehen.
 */
async function seedTut(page: Page, done: string[]) {
  await page.addInitScript(([d]: [string[]]) => {
    localStorage.setItem('kritis_player_id', 'abn');
    localStorage.setItem('kritis_seen_intro', '1');
    localStorage.setItem('kritis_name_skipped', '1');
    localStorage.setItem('kritis_autosave_abn', JSON.stringify({
      version: 1, updatedAt: '2026-09-14T10:00:00.000Z', gameState: {
        seed: 'ABN', runNumber: 1, gameMode: 'beginner', currentWeek: 2, currentDay: 1,
        skills: { netzwerk: 30, linux: 30, windows: 30, security: 30, troubleshooting: 30, softSkills: 30 },
        relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
        stress: 10, budget: 20000, compliance: 60, activeEvents: [],
        completedEvents: d,
        completedScenarios: ['INTERN-SC-011', 'CLOUD365-SC-007', 'TELEKOM-SC-007'],
        flags: {}, unlockedCommands: [], terminalHistory: [],
        isStoryMode: false, decisions: [], pendingChainEvents: [] } }));
  }, [done] as const);
}

async function starte(page: Page, titel: RegExp) {
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await expect(page.getByText(titel)).toBeVisible();
  await page.getByRole('button', { name: /Aufgabe starten/ }).click();
  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 5000 });
  await term.click();
}

async function tippe(page: Page, cmd: string) {
  await page.keyboard.type(cmd);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
}

test('Repro 1a: nach ls verlangt die Hilfe nicht erneut ls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedTut(page, ['evt_first_day', 'evt_tutorial_navigation']);
  await starte(page, /Terminal-Grundlagen: Dateien lesen/);
  await tippe(page, 'ls');
  await page.waitForTimeout(9000); // Leerlauf-Hilfe feuert nach 8 s
  const txt = await page.locator('.xterm').innerText();
  const letzterHinweis = txt.split('💡').pop() ?? '';
  expect(letzterHinweis, `Hilfe nach ls: ${letzterHinweis.slice(0, 120)}`).toMatch(/`cat/);
});

test('Repro 1b: nach ping und DNS kommt der Port-Hinweis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedTut(page, ['evt_first_day', 'evt_tutorial_navigation', 'evt_tutorial_files', 'evt_tutorial_search']);
  await starte(page, /Terminal-Grundlagen: Netzwerk/);
  await tippe(page, 'ping mail.warm.local');
  await tippe(page, 'nslookup mail.warm.local');
  await page.waitForTimeout(9000);
  const txt = await page.locator('.xterm').innerText();
  const letzterHinweis = txt.split('💡').pop() ?? '';
  expect(letzterHinweis, `Hilfe: ${letzterHinweis.slice(0, 140)}`).toMatch(/Port 25|nc -zv/);
});

test('Repro 2: der falsche Port loest nicht', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedTut(page, ['evt_first_day', 'evt_tutorial_navigation', 'evt_tutorial_files', 'evt_tutorial_search']);
  await starte(page, /Terminal-Grundlagen: Netzwerk/);
  await tippe(page, 'ping mail.warm.local');
  await tippe(page, 'nslookup mail.warm.local');
  await tippe(page, 'nc -zv mail.warm.local 2525');
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/), 'Port 2525 belegt Port 25 nicht').toBeHidden();
  await tippe(page, 'nc -zv mail.warm.local 25');
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/)).toBeVisible({ timeout: 5000 });
});

test('Repro 3: ping erfindet keinen Abbruch', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedTut(page, ['evt_first_day', 'evt_tutorial_navigation', 'evt_tutorial_files', 'evt_tutorial_search']);
  await starte(page, /Terminal-Grundlagen: Netzwerk/);
  await tippe(page, 'ping mail.warm.local');
  const txt = await page.locator('.xterm').innerText();
  expect(txt, 'ohne Tastendruck darf kein ^C erscheinen').not.toContain('^C');
  expect(txt).toContain('Diese Übung stoppt nach drei Paketen');
});

/**
 * Review-Befund 4: Story-Ereignisse verloren ihren Abschlussbefund. Der
 * Story-Zweig von GameScreen reichte `solvedBranch` nicht durch, und
 * ResultScreen kehrte fuer isStoryMode vor dem Befund-Block zurueck.
 */
test('Audit Trail L1: der Befund steht auf dem Ergebnisbildschirm', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('kritis_seen_intro', '1');
    localStorage.setItem('kritis_name_skipped', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
  await page.getByRole('button', { name: /Story-Kampagne/ }).click();
  // Ohne dieses Warten geht das Tippen ins Leere und die versteckte Kampagne
  // bleibt gesperrt — der Klick darunter lief dann in den Timeout.
  await expect(page.getByRole('dialog', { name: 'Kampagne wählen' })).toBeVisible();
  await page.keyboard.type('trick17');
  await page.getByRole('button', { name: /Audit Trail/ }).click();

  // Durch die Kapitel-Einleitung bis zum ersten Level.
  // Story-Auswahlen sind mit „1." nummeriert, nicht mit „[1]".
  for (let i = 0; i < 25; i++) {
    const start = page.getByRole('button', { name: /Aufgabe starten/ });
    if (await start.isVisible().catch(() => false)) break;
    const texte = await page.locator('button').allTextContents();
    const idx = texte.findIndex((t) => /^\s*\d\./.test(t) || /^\s*\[?(ENTER|Weiter)/i.test(t));
    if (idx >= 0) await page.locator('button').nth(idx).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /Aufgabe starten/ }).click();

  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 5000 });
  await term.click();
  await page.keyboard.type('cat /srv/ticket-exports/notizen_m.txt');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/)).toBeVisible({ timeout: 5000 });

  await page.keyboard.press('Enter');
  await expect(page.getByText('Befund')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/LESEN/)).toBeVisible();
});
