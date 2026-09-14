import { test, expect } from '@playwright/test';

/**
 * Die beiden Tutorials, deren Lektion BEWIESEN statt behauptet wird.
 *
 * Playtest-Befund: „Tutorials mostly test copying commands; they should also
 * ask players to interpret the output." Die Antwort darauf ist nicht ein
 * Merksatz im Abschlusstext, sondern eine Handlung:
 *
 *   Suchen   `grep ERROR` liefert drei Zeilen — die Datei erzaehlt einen
 *            geheilten Aussetzer. Der Filter allein loest nicht mehr.
 *   Netzwerk ping und DNS sagen „Rechner lebt". Jens hat nach dem MAILSERVER
 *            gefragt. Erst der Port zeigt: Connection refused.
 *
 * Der Wert dieses Tests liegt in den beiden Negativproben in der Mitte: ohne
 * sie wuerde niemand merken, wenn die Verschaerfung wieder herausfaellt.
 */
async function seed(page: any, doneEvents: string[]) {
  await page.addInitScript(([done]: [string[]]) => {
    localStorage.setItem('kritis_player_id', 'tut');
    localStorage.setItem('kritis_seen_intro', '1');
    localStorage.setItem('kritis_name_skipped', '1');
    localStorage.setItem('kritis_autosave_tut', JSON.stringify({
      version: 1, updatedAt: '2026-09-14T10:00:00.000Z', gameState: {
        seed: 'TUT', runNumber: 1, gameMode: 'beginner', currentWeek: 2, currentDay: 1,
        skills: { netzwerk: 30, linux: 30, windows: 30, security: 30, troubleshooting: 30, softSkills: 30 },
        relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
        stress: 10, budget: 20000, compliance: 60, activeEvents: [],
        completedEvents: done,
        completedScenarios: ['INTERN-SC-011', 'CLOUD365-SC-007', 'TELEKOM-SC-007'],
        flags: {}, unlockedCommands: [], terminalHistory: [],
        isStoryMode: false, decisions: [], pendingChainEvents: [] } }));
  }, [doneEvents] as const);
}

async function tippe(page: any, cmds: string[]) {
  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 5000 });
  await term.click();
  for (const c of cmds) {
    await page.keyboard.type(c);
    await page.keyboard.press('Enter');
    // `ping` tropft die Antwortzeilen getaktet aus und schluckt waehrenddessen
    // jede Eingabe. Ohne diese Pause verschwindet der naechste Befehl spurlos.
    await page.waitForTimeout(2500);
  }
}

test('Such-Tutorial: grep allein reicht nicht, Kontext loest', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, ['evt_first_day', 'evt_tutorial_navigation', 'evt_tutorial_files']);
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await expect(page.getByText(/Terminal-Grundlagen: Suchen/)).toBeVisible();
  await page.getByRole('button', { name: /Aufgabe starten/ }).click();

  await tippe(page, ['grep ERROR error.log']);
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/), 'grep allein darf nicht loesen').toBeHidden();

  await tippe(page, ['cat error.log']);
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/)).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Das sind keine drei Fehler/)).toBeVisible({ timeout: 5000 });
});

test('Netzwerk-Tutorial: ping und DNS reichen nicht, der Port loest', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, ['evt_first_day', 'evt_tutorial_navigation', 'evt_tutorial_files', 'evt_tutorial_search']);
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await expect(page.getByText(/Terminal-Grundlagen: Netzwerk/)).toBeVisible();
  await page.getByRole('button', { name: /Aufgabe starten/ }).click();

  await tippe(page, ['ping mail.warm.local', 'nslookup mail.warm.local']);
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/), 'ping+DNS duerfen nicht loesen').toBeHidden();

  await tippe(page, ['nc -zv mail.warm.local 25']);
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/)).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Connection refused/)).toBeVisible({ timeout: 5000 });
});
