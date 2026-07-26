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
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Freie Simulation/, viewport);
    await expectReachable(page, /Story-Kampagne/, viewport);

    await page.getByRole('button', { name: /Story-Kampagne/ }).click();

    // Step 2a — campaign picker: the taller of the two (longer descriptions).
    await expect(page.getByRole('dialog', { name: 'Kampagne wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);

    // Top of the list is reachable at scrollTop 0 …
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Die Probezeit/, viewport);

    // … and the last card plus the [ESC] control are reachable by scrolling.
    await expectReachable(page, /Audit Trail/, viewport);
    await expectReachable(page, /Zurück/, viewport);

    // Back out to the experience picker and take the OTHER branch.
    await page.getByRole('button', { name: /Zurück/ }).click();
    await expect(page.getByRole('dialog', { name: 'Einsatzart wählen' })).toBeVisible();
    await page.getByRole('button', { name: /Freie Simulation/ }).click();

    // Step 2b — simulation mode picker: three stacked mode cards.
    await expect(page.getByRole('dialog', { name: 'Simulation wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await scrollDialogTo(page, 0);
    await expectFullyInsideViewport(page, /Einsteiger/, viewport);
    await expectReachable(page, /KRITIS/, viewport);
    await expectReachable(page, /Abbrechen/, viewport);

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
