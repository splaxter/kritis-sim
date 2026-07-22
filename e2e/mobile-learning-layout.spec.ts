import { test, expect, Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'small portrait', width: 320, height: 568 },
  { name: 'portrait', width: 375, height: 667 },
  { name: 'landscape', width: 667, height: 375 },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  )).toBe(true);
}

for (const viewport of VIEWPORTS) {
  test(`learning flow fits ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByText(/KLICKEN ODER ENTER ZUM STARTEN/).click();
    await page.getByRole('button', { name: /LERNBEREICH/ }).click();
    await expect(page.getByRole('heading', { name: 'Lernpfad' })).toBeVisible();

    await expectNoDocumentOverflow(page);

    // Simulate arriving from a deeply scrolled hub. Playwright scrolls the
    // recommended CTA back into view before clicking; the event must still
    // establish its own deterministic top position.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole('button', { name: /Nächste empfohlene Lektion/ }).click();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expectNoDocumentOverflow(page);

    const title = page.getByRole('heading', { name: /> Grundlagen 1: Das Erwachen/ });
    const descriptionStart = page.getByText(/Du öffnest die Augen/);
    const start = page.getByRole('button', { name: /Aufgabe starten/ });
    const boxes = await Promise.all([title.boundingBox(), descriptionStart.boundingBox(), start.boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
    expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);

    await start.click();
    await expect(page.locator('.xterm')).toBeVisible();
    await expectNoDocumentOverflow(page);

    for (const control of [
      page.getByRole('button', { name: /Abbrechen/ }),
      page.getByRole('button', { name: /Hinweis/ }),
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  });
}
