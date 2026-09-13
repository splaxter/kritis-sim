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
    let clip: { l: number; t: number; rr: number; b: number } | null = null;
    let tag = '';
    let p = node.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        clip = { l: pr.left, t: pr.top, rr: pr.right, b: pr.bottom };
        tag = p.tagName + '.' + String(p.className);
        break;
      }
      p = p.parentElement;
    }
    return {
      el: { l: r.left, t: r.top, rr: r.right, b: r.bottom, h: r.height },
      clip,
      tag,
      view: { w: window.innerWidth, h: window.innerHeight },
      // Wie weit laesst sich die Seite ueberhaupt scrollen? Ein Element
      // unterhalb der Kante ist nur dann erreichbar, wenn man hinscrollen kann.
      scrollbar: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
  });

  // 1. Nicht vom naechsten schneidenden Vorfahren beschnitten.
  if (res.clip) {
    expect(res.el.rr, `rechts abgeschnitten von ${res.tag}`).toBeLessThanOrEqual(res.clip.rr + 1);
    expect(res.el.l, `links abgeschnitten von ${res.tag}`).toBeGreaterThanOrEqual(res.clip.l - 1);
    expect(res.el.b, `unten abgeschnitten von ${res.tag}`).toBeLessThanOrEqual(res.clip.b + 1);
  }

  // 2. Und nicht hinter der Fensterkante — auch nicht teilweise. Genau das war
  //    der Befund: 24 von 32 Pixeln Knopfhoehe lagen unterhalb des Fensters,
  //    und weil der Desktop darunter `overflow: hidden` hat, brachte Scrollen
  //    nichts. Deshalb zaehlt hier der SICHTBARE Anteil, nicht die blosse
  //    Existenz einer Geometrie.
  const sichtbarUnten = Math.min(res.el.b, res.view.h + res.scrollbar);
  const sichtbareHoehe = sichtbarUnten - Math.max(res.el.t, 0);
  expect(
    sichtbareHoehe,
    `nur ${Math.round(sichtbareHoehe)} von ${Math.round(res.el.h)} px liegen im Fenster ` +
      `(Fenster ${res.view.w}x${res.view.h}, scrollbar ${res.scrollbar}px)`
  ).toBeGreaterThanOrEqual(res.el.h - 1);
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

/**
 * Befund aus dem Review: Im Querformat lag der Meldeknopf der Ereignisanzeige
 * zu drei Vierteln ausserhalb der Fensterkante, sobald ein Eintrag ausgewaehlt
 * war — die Detailansicht schob ihn heraus, und der Desktop darunter hat
 * `overflow: hidden`, also half auch Scrollen nicht.
 *
 * Geprueft wird gegen den naechsten schneidenden Vorfahren, nicht gegen das
 * Fenster: boundingBox() liefert auch fuer ein abgeschnittenes Element eine
 * Geometrie.
 */
async function seedDispo(page: Page) {
  const pid = 'dispo-player';
  const env = {
    version: 1, updatedAt: '2026-09-13T10:00:00.000Z',
    gameState: {
      seed: 'DISPO-1', runNumber: 1, gameMode: 'intermediate', currentWeek: 9, currentDay: 1,
      skills: { netzwerk: 60, linux: 60, windows: 60, security: 60, troubleshooting: 60, softSkills: 60 },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 10 },
      stress: 10, budget: 15000, compliance: 60, activeEvents: [], completedEvents: [],
      // Alle Szenarien ausser INTERN-SC-004 erledigt -> der Fall ist zwingend dran.
      completedScenarios: ALLE_SZENARIEN.filter((id) => id !== 'INTERN-SC-004'),
      flags: {}, unlockedCommands: ['help'], terminalHistory: [],
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

const ALLE_SZENARIEN = [
  'CLOUD365-SC-001','CLOUD365-SC-002','CLOUD365-SC-003','CLOUD365-SC-004','CLOUD365-SC-005',
  'CLOUD365-SC-006','CLOUD365-SC-007','KRITIS-SC-001','KRITIS-SC-002','KRITIS-SC-003',
  'KRITIS-SC-004','KRITIS-SC-005','KRITIS-SC-006','KRITIS-SC-007','KRITIS-SC-008',
  'KRITIS-SC-009','KRITIS-SC-010','KRITIS-SC-011','KRITIS-SC-012','INTERN-SC-001',
  'INTERN-SC-002','INTERN-SC-003','INTERN-SC-004','INTERN-SC-005','INTERN-SC-006',
  'INTERN-SC-007','INTERN-SC-008','INTERN-SC-009','INTERN-SC-010','INTERN-SC-011',
  'AMSE-SC-001','AMSE-SC-002','AMSE-SC-003','AMSE-SC-004','AMSE-SC-005','AMSE-SC-006',
  'AMSE-SC-007','AMSE-SC-008','TELEKOM-SC-001','TELEKOM-SC-002','TELEKOM-SC-003',
  'TELEKOM-SC-004','TELEKOM-SC-005','TELEKOM-SC-006','TELEKOM-SC-007',
];

for (const vp of VIEWPORTS) {
  test(`Ereignisanzeige: Meldeknopf bedienbar auf ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedDispo(page);
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();
    await expect(page.getByText('Die Disposition ist down')).toBeVisible();
    await page.getByRole('button', { name: /Remote einloggen/ }).click();

    // Erst nach dem Auswaehlen erscheint die Detailansicht — genau dann trat
    // der Fehler auf.
    await page.getByText('4103').first().click();
    await assertNichtAbgeschnitten(page, 'Als Vorfall melden');

    // Und er muss wirklich klickbar sein, nicht nur geometrisch drin liegen.
    await page.getByRole('button', { name: /Als Vorfall melden/ }).click();
    await expect(page.getByText(/4103/).first()).toBeVisible();
  });
}

/**
 * Das Berichtsschema steht im Auftrag — also muss der Auftrag auch vollstaendig
 * zu sehen sein. Die Aufgabenleiste war auf 112 px gedeckelt, ein Auftrag mit
 * Einleitung und vier Schemazeilen braucht 136: die letzte Zeile („ursache")
 * lag hinter einer unscheinbaren Scrollkante. Ein Schema, dessen letzte Zeile
 * man nicht sieht, ist kein angesagtes Schema.
 */
async function seedShellAufgabe(page: Page, ausser: string) {
  const pid = 'shell-panel';
  const env = {
    version: 1, updatedAt: '2026-09-13T10:00:00.000Z',
    gameState: {
      seed: 'PANEL-1', runNumber: 1, gameMode: 'intermediate', currentWeek: 9, currentDay: 1,
      skills: { netzwerk: 60, linux: 60, windows: 60, security: 60, troubleshooting: 60, softSkills: 60 },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 10 },
      stress: 10, budget: 15000, compliance: 60, activeEvents: [], completedEvents: [],
      completedScenarios: ALLE_SZENARIEN.filter((id) => id !== ausser),
      flags: {}, unlockedCommands: ['help'], terminalHistory: [],
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

for (const vp of [VIEWPORTS[1], { name: 'desktop', width: 1280, height: 800 }]) {
  test(`Aufgabenleiste zeigt das ganze Berichtsschema auf ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedShellAufgabe(page, 'TELEKOM-SC-001');
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();
    await page.getByRole('button', { name: /Drei Tage messen lassen/ }).click();
    await expect(page.getByText('Aufgabe:')).toBeVisible();

    const mass = await page.evaluate(() => {
      const treffer = [...document.querySelectorAll('div')].filter(
        (e) => /Ergebnis nach \/home\/timo/.test(e.textContent ?? '') && e.children.length < 4
      );
      const text = treffer[treffer.length - 1];
      const panel = text.parentElement!;
      return {
        verborgen: panel.scrollHeight - panel.clientHeight,
        letzteZeile: (text as HTMLElement).innerText.split('\n').pop() ?? '',
      };
    });

    expect(mass.letzteZeile, 'die letzte Schemazeile fehlt im Auftrag').toMatch(/^ursache:/);
    expect(mass.verborgen, `${mass.verborgen}px des Auftrags liegen hinter der Scrollkante`).toBe(0);
  });
}
