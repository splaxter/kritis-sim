import { test, expect, Page } from '@playwright/test';
import { getAllScenarios } from '../client/src/content/packs';

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

    // Playtest-Befund: Bei 320px lief die Datumsspalte ueber die rechte Kante
    // hinaus, weil eine `fr`-Spur als Mindestbreite `min-content` hat und der
    // lange Dateiname sie aufblaeht. Gemessen wird der INHALT gegen den Kasten.
    const zeilen = await page.evaluate(() => {
      const treffer = [...document.querySelectorAll('[role="option"]')].map((z) => ({
        text: (z as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 40),
        inhalt: z.scrollWidth,
        kasten: z.clientWidth,
      }));
      return treffer;
    });
    expect(zeilen.length, 'keine Dateizeilen gefunden').toBeGreaterThan(0);
    for (const z of zeilen) {
      expect(
        z.inhalt,
        `Zeile laeuft ueber: ${z.inhalt}px Inhalt in ${z.kasten}px Breite — „${z.text}"`
      ).toBeLessThanOrEqual(z.kasten + 1);
    }

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

/**
 * Aus der Registry abgeleitet, nicht abgeschrieben.
 *
 * Diese Liste war von Hand gepflegt — und damit eine Zeitbombe: Ein neues
 * Szenario im Pack fehlte hier, war deshalb „noch nicht erledigt" und konnte
 * statt INTERN-SC-004 ausgespielt werden. Der Test suchte dann einen Fall, der
 * gar nicht auf dem Schirm war, und meldete einen Layout-Fehler, den es nicht
 * gab. Wer den Bestand meint, soll den Bestand fragen.
 */
const ALLE_SZENARIEN = getAllScenarios().map((s) => s.id);

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

// 320 px ist die schmalste echte Geraetebreite — und genau dort wickelt der
// Auftrag am staerksten um. Ein Schema, dessen letzte Regel dort hinter der
// Scrollkante liegt, ist kein angesagtes Schema.
for (const vp of [...VIEWPORTS, { name: 'desktop', width: 1280, height: 800 }]) {
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

/**
 * Der geloeste Zweig muss den Ergebnisbildschirm auch bei TERMINAL-Aufgaben
 * erreichen — und zwar durch die ganze Kette, nicht nur bis zum Adapter.
 *
 * Review-Befund: `TerminalSession` reichte den Befund als viertes Argument
 * heraus, `useTerminal` gab nur drei weiter. Im Terminal stand der Befund, nach
 * Enter fehlte er. Bei GUI-Leveln kam er an — genau deshalb faellt so etwas nur
 * auf, wenn man beide Wege wirklich spielt.
 */
test('Terminal-Aufgabe: der Befund steht danach auf dem Ergebnisbildschirm', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedShellAufgabe(page, 'TELEKOM-SC-001');
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await page.getByRole('button', { name: /Drei Tage messen lassen/ }).click();

  const term = page.locator('.xterm');
  await expect(term).toBeVisible({ timeout: 5000 });
  await term.click();
  const befehle = [
    'grep ausfall ping_extern.csv',
    'cat ping_gateway.csv',
    'echo "anzahl: 9" > /home/timo/meldung.md',
    'echo "zeitfenster: 10:04-13:58" >> /home/timo/meldung.md',
    'echo "lokal: erreichbar" >> /home/timo/meldung.md',
    'echo "ursache: unbekannt" >> /home/timo/meldung.md',
  ];
  for (const cmd of befehle) {
    await page.keyboard.type(cmd);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }

  // Im Terminal steht der Befund bereits.
  await expect(page.getByText(/AUFGABE ABGESCHLOSSEN/)).toBeVisible({ timeout: 5000 });

  // Und nach dem bestaetigenden Enter muss er stehen BLEIBEN.
  await page.keyboard.press('Enter');
  await expect(page.getByText('─ BEFUND ─')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/Neun Ausfälle an drei Tagen/)).toBeVisible();
});

/**
 * Playtest-Befund: Bei 375x667 fuellten Kopfzeile und Statistik fast den ganzen
 * ersten Bildschirm — die Aufgabe begann darunter. Gemessen wird deshalb, was
 * der Spieler ohne Scrollen SIEHT, nicht ob das Element existiert.
 *
 * Gemessen bei 320x568 mit einem Szenario:
 *   vorher   StatsBar 284px, Titel bei 415px (73 % des Fensters)
 *   nachher  StatsBar 252px, Titel bei 383px (67 %)
 *
 * Die Schranke liegt bei 70 %: darunter bleiben mindestens 170px fuer Titel und
 * erste Zeilen — die Aufgabe ist sichtbar UND lesbar, nicht nur vorhanden.
 *
 * Der Rest der Hoehe bei 320px ist NICHT die Statistik, sondern der Kopf der
 * Szenariokarte selbst (Kategorie, Dringlichkeit, Schwierigkeit — rund 115px,
 * weil er dort auf drei Zeilen umbricht). Den anzutasten hiesse, Klarheit gegen
 * Pixel zu tauschen; er bleibt, und diese Zahl steht hier, damit die naechste
 * Messung weiss, wo sie herkommt.
 */
for (const vp of [VIEWPORTS[0], VIEWPORTS[1]]) {
  test(`Die Aufgabe beginnt im ersten Bildschirm auf ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedShellAufgabe(page, 'INTERN-SC-004');
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();
    await expect(page.getByText('Die Disposition ist down')).toBeVisible();

    // Die UEBERSCHRIFT des Falls, nicht irgendein Textknoten, der die Worte
    // ebenfalls enthaelt — sonst misst man die Vorgeschichte statt des Titels.
    const oben = await page
      .getByRole('heading', { name: /Disposition ist down/ })
      .evaluate((el) => el.getBoundingClientRect().top);

    // Der Titel des Falls muss im ersten Bildschirm liegen, nicht darunter.
    expect(
      oben,
      `der Fall beginnt erst bei ${Math.round(oben)}px von ${vp.height}px Fensterhoehe`
    ).toBeLessThan(vp.height * 0.7);
  });
}

test('Die Detailwerte sind auf dem Telefon eingeklappt, die Gefahrenwerte nicht', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[1]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedShellAufgabe(page, 'INTERN-SC-004');
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();

  await expect(page.getByText('─ SKILLS ─')).toBeHidden();
  await expect(page.getByText(/Compliance: \d+%/)).toBeVisible();

  // Und sie lassen sich oeffnen.
  await page.getByRole('button', { name: /Skills & Beziehungen/i }).click();
  await expect(page.getByText('─ SKILLS ─')).toBeVisible();
});

test('Auf dem Desktop bleibt die Statistik offen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedShellAufgabe(page, 'INTERN-SC-004');
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await expect(page.getByText('─ SKILLS ─')).toBeVisible();
  await expect(page.getByRole('button', { name: /Skills & Beziehungen/i })).toBeHidden();
});
