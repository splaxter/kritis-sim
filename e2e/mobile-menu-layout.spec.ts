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

async function expectReachableInsideViewport(page: Page, name: RegExp, height: number) {
  const el = page.getByRole('button', { name });
  const box = await el.boundingBox();
  expect(box, `${name} has no box`).not.toBeNull();
  // Reachable means: after scrolling the overlay it sits inside the viewport.
  // The top edge must never be stuck above 0 (the items-center clipping bug).
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(height);
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
    await expectReachableInsideViewport(page, /Freie Simulation/, viewport.height);

    await page.getByRole('button', { name: /Story-Kampagne/ }).click();

    // Step 2 — campaign picker: the taller of the two (longer descriptions).
    await expect(page.getByRole('dialog', { name: 'Kampagne wählen' })).toBeVisible();
    await expectNoDocumentOverflow(page);

    // Top of the list is reachable at scrollTop 0 …
    await scrollDialogTo(page, 0);
    await expectReachableInsideViewport(page, /Die Probezeit/, viewport.height);

    // … and the last card plus the [ESC] control are reachable by scrolling.
    await scrollDialogTo(page, 10_000);
    await expectReachableInsideViewport(page, /Audit Trail/, viewport.height);
    await expectReachableInsideViewport(page, /Zurück/, viewport.height);

    // Selecting the second campaign really starts it.
    await page.getByRole('button', { name: /Audit Trail/ }).click();
    await expect(page.getByText('Ein zusätzlicher Auftrag')).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
}
