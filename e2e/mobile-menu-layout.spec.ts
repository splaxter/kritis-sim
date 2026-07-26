import { test, expect, Page } from '@playwright/test';

// The new-game flow is two stacked modals of tall cards — the shape most likely
// to overflow a phone. Both must stay fully reachable: no horizontal document
// overflow, and every card plus the [ESC] control inside the viewport once the
// overlay is scrolled.
const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 568 },
  { name: 'landscape', width: 667, height: 375 },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  )).toBe(true);
}

/**
 * Content overflowing INSIDE an element is invisible to bounding-box checks —
 * a clipped ancestor keeps the outer rectangle looking fine while the title,
 * badge or marker inside is cut off. Compare each element's scrollWidth to its
 * clientWidth instead. The dialog's own vertical scroller is exempt (it scrolls
 * by design; only horizontal overflow is a defect here).
 */
async function expectNoInternalOverflowIn(page: Page, selector: string) {
  const clipped = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return [`root not found: ${sel}`];
    const out: string[] = [];
    // The ROOT itself is in the scan set: an over-wide direct child pushes the
    // root's scrollWidth out while no descendant exceeds its own box, so
    // scanning only descendants would report nothing. scrollWidth is horizontal
    // only, so this does not clash with intended vertical scrolling.
    const nodes: Element[] = [root, ...root.querySelectorAll('*')];
    // AsciiFrame's rules (═ runs) are decoration drawn to the frame edge and
    // clipped ON PURPOSE. Exempt elements whose text is nothing but box-drawing
    // characters — narrow enough that real content can't hide behind it.
    const isDecorativeRule = (el: Element) => /^[─-╿\s]+$/.test(el.textContent || '');
    // Replaced elements (img/svg/video/canvas) report intrinsic media size in
    // scrollWidth; with object-fit: cover, exceeding the box is the point. Their
    // BOX is still checked by the bounding-box assertions.
    const REPLACED = ['IMG', 'SVG', 'VIDEO', 'CANVAS'];
    nodes.forEach((el) => {
      if (isDecorativeRule(el) || REPLACED.includes(el.tagName)) return;
      // 1px slack: sub-pixel text metrics round scrollWidth up.
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        out.push(
          `${el.tagName}.${(el.className || '').toString().slice(0, 50)} ` +
          `client=${el.clientWidth} scroll=${el.scrollWidth} text="${(el.textContent || '').slice(0, 25)}"`
        );
      }
    });
    return out;
  }, selector);
  expect(clipped, `content clipped inside ${selector}:\n${clipped.join('\n')}`).toEqual([]);
}

const expectNoInternalOverflow = (page: Page, dialogName: string) =>
  expectNoInternalOverflowIn(page, `[role=dialog][aria-label="${dialogName}"]`);

/** The dialog's own scroll container (role=dialog is the scroller). */
async function scrollDialogTo(page: Page, top: number) {
  await page.evaluate((y) => {
    const dialog = document.querySelector('[role=dialog]');
    if (dialog) dialog.scrollTop = y;
  }, top);
}

// Sub-pixel slack for the trailing edges only: fractional layout plus Chrome's
// scrollIntoViewIfNeeded leave the aligned edge about a pixel over (measured:
// 568.97 in a 568 viewport). Far too small to hide real clipping — the bug this
// guards against parked a 208px card at y=-51.
const EDGE_TOLERANCE_PX = 2;

/**
 * Reachable = the element sits FULLY inside the viewport at the current scroll
 * position: top edge not stuck above 0 (the items-center clipping bug) and the
 * bottom edge not past the fold. Checking only `y < height` would pass a card
 * whose lower half is cut off.
 */
async function expectFullyInsideViewport(page: Page, name: RegExp, viewport: { width: number; height: number }) {
  const box = await page.getByRole('button', { name }).boundingBox();
  expect(box, `${name} has no box`).not.toBeNull();
  // Leading edges are exact — nothing may start off-screen.
  expect(box!.y, `${name} clipped at the top`).toBeGreaterThanOrEqual(0);
  expect(box!.x, `${name} clipped at the left`).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, `${name} clipped at the bottom`)
    .toBeLessThanOrEqual(viewport.height + EDGE_TOLERANCE_PX);
  expect(box!.x + box!.width, `${name} clipped at the right`)
    .toBeLessThanOrEqual(viewport.width + EDGE_TOLERANCE_PX);
}

/** Scroll the overlay so the element is in view, then assert it fits entirely. */
async function expectReachable(page: Page, name: RegExp, viewport: { width: number; height: number }) {
  await page.getByRole('button', { name }).scrollIntoViewIfNeeded();
  await expectFullyInsideViewport(page, name, viewport);
}

for (const viewport of VIEWPORTS) {
  test(`new-game flow fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
    await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();

    // Step 1 — experience picker.
    await expect(page.getByRole('dialog', { name: 'Einsatzart wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectNoInternalOverflow(page, 'Einsatzart wählen');
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Freie Simulation/, viewport);
    await expectReachable(page, /Story-Kampagne/, viewport);
    // Selection markers ('> ') only render on the highlighted card and add
    // width — re-scan with the selection moved.
    await page.keyboard.press('ArrowDown');
    await expectNoInternalOverflow(page, 'Einsatzart wählen');

    await page.getByRole('button', { name: /Story-Kampagne/ }).click();

    // Step 2a — campaign picker: the taller of the two (longer descriptions).
    await expect(page.getByRole('dialog', { name: 'Kampagne wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectNoInternalOverflow(page, 'Kampagne wählen');

    // Top of the list is reachable at scrollTop 0 …
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Die Probezeit/, viewport);

    // … and the last card plus the [ESC] control are reachable by scrolling.
    await expectReachable(page, /Audit Trail/, viewport);
    await expectReachable(page, /Zurück/, viewport);
    await page.keyboard.press('ArrowDown');
    await expectNoInternalOverflow(page, 'Kampagne wählen');

    // Back out to the experience picker and take the OTHER branch.
    await page.getByRole('button', { name: /Zurück/ }).click();
    await expect(page.getByRole('dialog', { name: 'Einsatzart wählen' })).toBeVisible();
    await page.getByRole('button', { name: /Freie Simulation/ }).click();

    // Step 2b — simulation mode picker: three stacked mode cards.
    await expect(page.getByRole('dialog', { name: 'Simulation wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectNoInternalOverflow(page, 'Simulation wählen');
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Einsteiger/, viewport);
    await expectReachable(page, /KRITIS/, viewport);
    await expectReachable(page, /Abbrechen/, viewport);
    // The selected mode card also renders a '[*]' marker.
    await page.keyboard.press('ArrowDown');
    await expectNoInternalOverflow(page, 'Simulation wählen');

    // Starting a simulation run works from here.
    await page.getByRole('button', { name: /Einsteiger/ }).click();
    await expect(page.getByText(/Woche 1\//)).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test(`campaign start fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
    await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
    await page.getByRole('button', { name: /Story-Kampagne/ }).click();
    await page.getByRole('button', { name: /Audit Trail/ }).click();

    await expect(page.getByText('Ein zusätzlicher Auftrag')).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
}

/**
 * The scenario card is served by a deterministic hash of
 * (seed + week + day + completedEvents.length) — see App.tsx — so a fixed seed
 * reliably produces one. That matters: the card's header overflowed at 320px
 * and only appeared on the RNG draws that served a scenario instead of an
 * event, which is exactly the kind of defect a flaky check would keep missing.
 */
const SCENARIO_PLAYER = 'player-mobile-scenario';
const SCENARIO_SEED = 'E2E-SCEN-2'; // hash%100 === 3 < 10 at week 1/day 1

async function seedScenarioRun(page: Page) {
  const envelope = {
    version: 1,
    updatedAt: '2026-07-26T10:00:00.000Z',
    gameState: {
      seed: SCENARIO_SEED,
      runNumber: 1,
      gameMode: 'beginner',
      currentWeek: 1,
      currentDay: 1,
      skills: { netzwerk: 40, linux: 40, windows: 40, security: 40, troubleshooting: 40, softSkills: 40 },
      relationships: { chef: 10, gf: 0, kaemmerer: 0, fachabteilung: 0, kollegen: 15 },
      stress: 10,
      budget: 15000,
      compliance: 50,
      activeEvents: [],
      completedEvents: [],
      completedScenarios: [],
      flags: {},
      unlockedCommands: ['help', 'ls', 'cd', 'pwd'],
      terminalHistory: [],
      isStoryMode: false,
      decisions: [],
      pendingChainEvents: [],
    },
  };
  await page.addInitScript(
    ([id, env]) => {
      localStorage.setItem('kritis_player_id', id);
      localStorage.setItem('kritis_seen_intro', '1');
      localStorage.setItem('kritis_name_skipped', '1');
      localStorage.setItem(`kritis_autosave_${id}`, env);
    },
    [SCENARIO_PLAYER, JSON.stringify(envelope)] as const
  );
}

for (const viewport of VIEWPORTS) {
  test(`scenario card fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedScenarioRun(page);
    await page.goto('/');
    await page.getByText(/WEITER SPIELEN/).click();

    // Fails loudly if the seed ever stops producing a scenario, rather than
    // silently degrading into an event-only check.
    await expect(page.getByText('─ SZENARIO ─')).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectNoInternalOverflowIn(page, 'body');
  });
}

/**
 * Meta-test: the guard has been patched twice for blind spots, so prove it
 * actually fires. Injects the reviewer's repro — an over-wide DIRECT CHILD of
 * the dialog, which leaves every descendant within its own box and was
 * therefore invisible while the scan skipped the root.
 */
test('the internal-overflow guard catches an over-wide direct child', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
  await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
  await expect(page.getByRole('dialog', { name: 'Einsatzart wählen' })).toBeVisible();

  // Clean before the mutation …
  await expectNoInternalOverflow(page, 'Einsatzart wählen');

  await page.evaluate(() => {
    const dialog = document.querySelector('[role=dialog][aria-label="Einsatzart wählen"]')!;
    const wide = document.createElement('div');
    wide.style.width = '1000px';
    wide.textContent = 'injected overflow';
    dialog.appendChild(wide);
  });

  // … and the guard must report it now.
  let failed = false;
  try {
    await expectNoInternalOverflow(page, 'Einsatzart wählen');
  } catch {
    failed = true;
  }
  expect(failed, 'guard did not catch the injected 1000px child').toBe(true);
});
