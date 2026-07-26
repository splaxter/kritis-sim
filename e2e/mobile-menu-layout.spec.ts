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
interface OverflowEntry {
  isRoot: boolean;
  tag: string;
  cls: string;
  client: number;
  scroll: number;
  text: string;
}

/** Raw detector — returns the offenders so callers can assert WHICH node
 *  overflowed, not merely that something did. */
async function collectInternalOverflow(page: Page, selector: string): Promise<OverflowEntry[]> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) throw new Error(`root not found: ${sel}`);
    const out: OverflowEntry[] = [];
    // The ROOT itself is in the scan set: an over-wide, non-shrinking direct
    // child pushes the root's scrollWidth out while every descendant stays
    // inside its own box, so scanning only descendants would report nothing.
    // scrollWidth is horizontal only, so this does not clash with intended
    // vertical scrolling.
    const nodes: Element[] = [root, ...root.querySelectorAll('*')];
    // AsciiFrame's rules (═ runs) are decoration drawn to the frame edge and
    // clipped ON PURPOSE. Exempt elements whose text is nothing but box-drawing
    // characters — narrow enough that real content can't hide behind it.
    const isDecorativeRule = (el: Element) => /^[─-╿\s]+$/.test(el.textContent || '');
    // Raster/media replaced elements report intrinsic media size in scrollWidth;
    // with object-fit: cover, exceeding the box is the point, and their BOX is
    // still covered by the bounding-box assertions. Inline SVG is NOT exempt —
    // it lays out like normal content and can genuinely clip.
    const REPLACED = ['IMG', 'VIDEO', 'CANVAS'];
    // Deliberate horizontal scrollers (overflow-x: auto/scroll) are not
    // clipping — their content stays reachable by scrolling, same reasoning as
    // the dialog's intended vertical scroll. EventCard's narrative block uses
    // this on purpose.
    const scrollsHorizontally = (el: Element) =>
      ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
    nodes.forEach((el) => {
      // The root is never exempt: a dialog with overflow-y:auto computes
      // overflow-x to 'auto' too, which would skip the very node under test.
      if (isDecorativeRule(el) || REPLACED.includes(el.tagName)) return;
      if (el !== root && scrollsHorizontally(el)) return;
      // 1px slack: sub-pixel text metrics round scrollWidth up.
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        out.push({
          isRoot: el === root,
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 50),
          client: el.clientWidth,
          scroll: el.scrollWidth,
          text: (el.textContent || '').slice(0, 25),
        });
      }
    });
    return out;
  }, selector);
}

const describeEntries = (entries: OverflowEntry[]) =>
  entries.map((e) => `${e.isRoot ? '[root] ' : ''}${e.tag}.${e.cls} client=${e.client} scroll=${e.scroll} text="${e.text}"`).join('\n');

async function expectNoInternalOverflowIn(page: Page, selector: string) {
  const clipped = await collectInternalOverflow(page, selector);
  expect(clipped, `content clipped inside ${selector}:\n${describeEntries(clipped)}`).toEqual([]);
}

const dialogSelector = (name: string) => `[role=dialog][aria-label="${name}"]`;

const expectNoInternalOverflow = (page: Page, dialogName: string) =>
  expectNoInternalOverflowIn(page, dialogSelector(dialogName));

/** Scan a picker in EVERY selection state: the '>' / '[*]' markers only render
 *  on the highlighted card and add width. */
async function expectNoInternalOverflowAcrossSelections(page: Page, dialogName: string, optionCount: number) {
  await expectNoInternalOverflow(page, dialogName);
  for (let i = 1; i < optionCount; i++) {
    await page.keyboard.press('ArrowDown');
    await expectNoInternalOverflow(page, dialogName);
  }
}

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
    await expectNoInternalOverflowAcrossSelections(page, 'Einsatzart wählen', 2);

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
    await expectNoInternalOverflowAcrossSelections(page, 'Kampagne wählen', 2);

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
    // All three modes, incl. the explicitly selected KRITIS state ('[*]').
    await expectNoInternalOverflowAcrossSelections(page, 'Simulation wählen', 3);

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
 * Meta-test: the guard has been patched twice for blind spots, so prove the
 * root scan actually fires — and prove it on a ROOT-ONLY overflow. Appending a
 * new child does NOT reproduce it: as a flex item it shrinks and its own
 * descendants overflow instead, which the old descendant-only guard already
 * caught. The real repro widens the EXISTING first child and stops it
 * shrinking, so the dialog overflows while every node stays inside its own box.
 */
test('the internal-overflow guard catches a root-only overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
  await page.getByRole('button', { name: /NEUES SPIEL STARTEN/ }).click();
  await expect(page.getByRole('dialog', { name: 'Einsatzart wählen' })).toBeVisible();

  // Clean before the mutation …
  await expectNoInternalOverflow(page, 'Einsatzart wählen');

  const geometry = await page.evaluate((sel) => {
    const dialog = document.querySelector(sel) as HTMLElement;
    const child = dialog.firstElementChild as HTMLElement;
    child.style.width = '1000px';
    child.style.minWidth = '1000px';
    child.style.flex = 'none';
    return {
      dialog: { client: dialog.clientWidth, scroll: dialog.scrollWidth },
      child: { client: child.clientWidth, scroll: child.scrollWidth },
    };
  }, dialogSelector('Einsatzart wählen'));

  // The repro is genuinely root-only: the dialog overflows, the child does not.
  expect(geometry.dialog.scroll).toBeGreaterThan(geometry.dialog.client);
  expect(geometry.child.scroll).toBeLessThanOrEqual(geometry.child.client + 1);

  // … and the detector names the ROOT, not just "something overflowed".
  const entries = await collectInternalOverflow(page, dialogSelector('Einsatzart wählen'));
  const roots = entries.filter((e) => e.isRoot);
  expect(roots, `expected the root to be reported:\n${describeEntries(entries)}`).toHaveLength(1);
  expect(roots[0].scroll).toBeGreaterThan(roots[0].client);
  // A descendant-only scan would have returned nothing here — that is the point.
  expect(entries.filter((e) => !e.isRoot)).toEqual([]);
});

/**
 * Narrative text is the one thing whose overflow depends on the platform's FONT
 * METRICS: a long unbreakable token in the scenario flavor text cleared 320px
 * on macOS and clipped on CI's Linux fonts, so the defect only ever failed in
 * CI. Asserting the text block at a width below any real device gives that
 * class of bug a margin to fail locally — scoped to the text block, since
 * demanding the entire game screen fit 280px would be a made-up requirement.
 */
test('narrative text stays breakable below any real device width', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 568 });
  await seedScenarioRun(page);
  await page.goto('/');
  await page.getByText(/WEITER SPIELEN/).click();
  await expect(page.getByText('─ SZENARIO ─')).toBeVisible();

  const flavor = await page.evaluate(() => {
    const el = document.querySelector('.whitespace-pre-wrap');
    if (!el) throw new Error('flavor text block not found');
    return { client: el.clientWidth, scroll: el.scrollWidth };
  });

  expect(
    flavor.scroll,
    `flavor text clipped: client=${flavor.client} scroll=${flavor.scroll} — a long token needs break-words`
  ).toBeLessThanOrEqual(flavor.client + 1);
});
