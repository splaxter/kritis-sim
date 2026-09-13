import { test, expect, Page } from '@playwright/test';

/**
 * Der Einstiegsfall mit dem meisten Inhalt (Datei-Explorer, zwei Ordnerebenen,
 * Vorschautext) auf drei echten Geraetebreiten — bedienbar, nicht nur sichtbar.
 *
 * Der gefuehrte Einstieg macht die Vorbedingung deterministisch: ein Lauf mit
 * den ersten drei Schritten hinter sich hat den Explorer-Fall zwingend als
 * naechsten. Kein Seed-Raten, keine Wahrscheinlichkeit.
 */

const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 667 },
  { name: 'landscape', width: 667, height: 375 },
];

async function seed(page: Page) {
  const pid = 'mobil-player';
  const env = {
    version: 1, updatedAt: '2026-09-13T10:00:00.000Z',
    gameState: {
      seed: 'MOBIL-1', runNumber: 1, gameMode: 'beginner', currentWeek: 1, currentDay: 4,
      skills: { netzwerk: 30, linux: 30, windows: 30, security: 30, troubleshooting: 30, softSkills: 30 },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      stress: 10, budget: 20000, compliance: 60, activeEvents: [],
      completedEvents: ['evt_first_day'],
      completedScenarios: ['INTERN-SC-011', 'CLOUD365-SC-007'],
      flags: {}, unlockedCommands: ['help', 'ls'], terminalHistory: [],
      isStoryMode: false, decisions: [], pendingChainEvents: [],
    },
  };
  await page.addInitScript(([id, e]) => {
    localStorage.setItem('kritis_player_id', id);
    localStorage.setItem('kritis_seen_intro', '1');
    localStorage.setItem('kritis_name_skipped', '1');
    localStorage.setItem(`kritis_autosave_${id}`, e);
  }, [pid, JSON.stringify(env)] as const);
}

/**
 * boundingBox() ignoriert Clipping durch Vorfahren — deshalb wird hier gegen
 * den naechsten schneidenden Vorfahren geprueft, nicht gegen das Fenster.
 */
async function assertNichtAbgeschnitten(page: Page, text: string) {
  const el = page.getByText(text, { exact: false }).first();
  await expect(el).toBeVisible();
  const res = await el.evaluate((node: Element) => {
    const r = node.getBoundingClientRect();
    let p = node.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        return { el: { l: r.left, t: r.top, rr: r.right, b: r.bottom },
                 clip: { l: pr.left, t: pr.top, rr: pr.right, b: pr.bottom },
                 tag: p.tagName + '.' + p.className };
      }
      p = p.parentElement;
    }
    return null;
  });
  if (!res) return;
  expect(res.el.rr, `rechts abgeschnitten von ${res.tag}`).toBeLessThanOrEqual(res.clip.rr + 1);
  expect(res.el.l, `links abgeschnitten von ${res.tag}`).toBeGreaterThanOrEqual(res.clip.l - 1);
}

for (const vp of VIEWPORTS) {
  test(`Explorer-Einstiegsfall bedienbar auf ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page);
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();
    await expect(page.getByText('Welche Leitung gehört zu unserem Standort?')).toBeVisible();
    await page.getByRole('button', { name: /Im Vertragsordner nachsehen/ }).click();

    // Ordner oeffnen, Datei oeffnen — beides ueber echte Controls.
    await page.getByText('01_Standort_Betriebshof').dblclick();
    await expect(page.getByText('Anschluss_Betriebshof_2026.pdf')).toBeVisible();
    await assertNichtAbgeschnitten(page, 'Anschluss_Betriebshof_2026.pdf');
    await assertNichtAbgeschnitten(page, 'Öffnen');

    await page.getByText('Anschluss_Betriebshof_2026.pdf').dblclick();
    await expect(page.getByText('AUFGABE ABGESCHLOSSEN')).toBeVisible({ timeout: 5000 });

    // Kein horizontales Scrollen des Dokuments.
    const ueberlauf = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(ueberlauf, 'Seite scrollt horizontal').toBeLessThanOrEqual(1);
  });
}
