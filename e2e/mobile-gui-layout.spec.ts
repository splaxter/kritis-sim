import { test, expect, Page } from '@playwright/test';

/**
 * Aus dem Review zu PR #16: das neue Berechtigungsraster im Explorer liess das
 * Fenster ueber seine maxHeight hinauswachsen und schnitt „Entfernen" ab —
 * bei 375x667 vollstaendig und per Seitenscroll nicht erreichbar.
 *
 * Ein Screenshot haette das einmal belegt. Dieser Test belegt es dauerhaft:
 * die entscheidende Schaltflaeche muss nach dem Auswaehlen einer Zeile
 * erreichbar bleiben, auf jeder Groesse.
 */
const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 667 },
  { name: 'landscape', width: 667, height: 375 },
] as const;

const PLAYER_ID = 'player-e2e-gui-layout';

/** Alle Lernlevel ausser dem Ziel als erledigt eintragen, damit es offen ist. */
async function seedSave(page: Page, ausser: string) {
  await page.addInitScript(
    ({ playerId, ausser }) => {
      const alle = [
        'learn_01_awakening', 'learn_02_hidden_notes', 'learn_03_forensics',
        'learn_04_grep_hunter', 'gui_explorer_open_share', 'gui_explorer_auth_users',
      ].filter((id) => id !== ausser);
      localStorage.setItem('kritis_player_id', playerId);
      localStorage.setItem('kritis_name_skipped', '1');
      localStorage.setItem(
        `kritis_autosave_${playerId}`,
        JSON.stringify({
          version: 1,
          updatedAt: '2026-09-13T10:00:00.000Z',
          gameState: {
            currentWeek: 1, currentDay: 1,
            skills: { netzwerk: 60, linux: 60, windows: 60, security: 60, troubleshooting: 60, softSkills: 60 },
            relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
            stress: 10, budget: 15000, compliance: 50,
            activeEvents: [], completedEvents: alle, completedScenarios: [],
            flags: {}, unlockedCommands: ['help', 'ls', 'cd', 'pwd'], terminalHistory: [],
            seed: 'KRITIS-E2E', gameMode: 'learning', isStoryMode: false,
            learningState: {},
          },
          phase: 'playing',
        })
      );
    },
    { playerId: PLAYER_ID, ausser }
  );
}

for (const viewport of VIEWPORTS) {
  test(`Explorer-ACL: „Entfernen" bleibt erreichbar — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedSave(page, 'gui_explorer_open_share');
    await page.goto('/');

    await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
    await page.getByRole('button', { name: /WEITER SPIELEN|LERNBEREICH/ }).first().click();
    await page.getByText(/Die offene Freigabe/).first().click();
    await page.getByRole('button', { name: /Aufgabe starten/ }).click();

    const entfernen = page.getByRole('button', { name: /Entfernen/i });
    await expect(entfernen).toBeVisible();

    // Der eigentliche Fall: erst MIT Auswahl erscheint das Raster darunter.
    await page.getByRole('option', { name: /Jeder/ }).click();
    await expect(page.getByText(/Berechtigungen für/)).toBeVisible();

    // Der Kern des Fehlers war CLIPPING durch einen Vorfahren mit
    // overflow:hidden. ACHTUNG: boundingBox() taugt dafuer NICHT — es liefert
    // Geometrie unabhaengig davon, ob ein Vorfahre das Element wegschneidet.
    // Geprueft wird deshalb die Lage gegen den naechsten klippenden Vorfahren.
    const clipping = await entfernen.evaluate((el) => {
      const r = el.getBoundingClientRect();
      let n = el.parentElement;
      while (n) {
        const cs = getComputedStyle(n);
        if (cs.overflowY === 'hidden' || cs.overflowX === 'hidden' || cs.overflow === 'hidden') {
          const p = n.getBoundingClientRect();
          return {
            unten: Math.round(r.bottom),
            grenze: Math.round(p.bottom),
            abgeschnitten: r.bottom > p.bottom + 1 || r.top < p.top - 1,
          };
        }
        n = n.parentElement;
      }
      return { unten: Math.round(r.bottom), grenze: -1, abgeschnitten: false };
    });
    expect(
      clipping.abgeschnitten,
      `„Entfernen" endet bei ${clipping.unten}px, der klippende Vorfahr bei ${clipping.grenze}px`
    ).toBe(false);

    // Und sie muss tatsaechlich gehen — Playwright scrollt dafuer selbst heran.
    await entfernen.scrollIntoViewIfNeeded();
    await expect(entfernen).toBeInViewport();
    await entfernen.click();
    await expect(page.getByRole('option', { name: /Jeder/ })).toHaveCount(0);
  });
}
