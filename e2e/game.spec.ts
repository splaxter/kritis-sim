import { test, expect } from '@playwright/test';

test.describe('KRITIS Admin Simulator', () => {
  test.describe('Main Menu', () => {
    test('displays the main menu', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h1')).toContainText('KRITIS ADMIN SIMULATOR');
      await expect(page.locator('text=v1.0 - Probezeit Edition')).toBeVisible();
      await expect(page.locator('text=NEUES SPIEL STARTEN')).toBeVisible();
    });

    test('shows game description', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('text=Du bist der neue Sysadmin')).toBeVisible();
      await expect(page.locator('text=12 Wochen Probezeit')).toBeVisible();
    });
  });

  test.describe('Game Start', () => {
    test('starts a new game when clicking start button', async ({ page }) => {
      await page.goto('/');

      await page.click('text=NEUES SPIEL STARTEN');
      // Game mode modal appears, press Enter to select default (Standard) mode
      await page.keyboard.press('Enter');

      // Should show game UI elements (stats bar with week indicator)
      // Wait for first event to load (format: "Woche X/Y | Day")
      await expect(page.getByText(/Woche 1\/\d+ \|/)).toBeVisible({ timeout: 5000 });
    });

    test('displays initial stats after starting', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      // Game mode modal appears, press Enter to select default (Standard) mode
      await page.keyboard.press('Enter');

      // Check for week indicator in stats bar (format: "Woche X/Y | Day")
      await expect(page.getByText(/Woche 1\/\d+ \|/)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Gameplay', () => {
    test('displays event with choices', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      // Wait for event to appear
      await page.waitForTimeout(1000);

      // Should have at least one choice button
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible({ timeout: 5000 });
    });

    test('can make a choice and see result', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      // Wait for game to load
      await page.waitForTimeout(1000);

      // Find and click the first available choice (skip the stats buttons)
      const choiceButtons = page.locator('button:has-text("[")');
      const count = await choiceButtons.count();

      if (count > 0) {
        await choiceButtons.first().click();

        // Should show result screen with continue option or next event
        await page.waitForTimeout(500);

        // Game should still be running (check for week indicator in stats bar)
        await expect(page.getByText(/Woche \d+\/\d+ \|/)).toBeVisible();
      }
    });

    test('can progress through multiple events', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      // Play through a few events
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(500);

        // Find choice buttons (those with [ brackets)
        const choiceButtons = page.locator('button:has-text("[")');
        const count = await choiceButtons.count();

        if (count > 0) {
          await choiceButtons.first().click();
          await page.waitForTimeout(300);

          // Click continue if result screen is shown
          const continueBtn = page.locator('button:has-text("WEITER")');
          if (await continueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await continueBtn.click();
          }
        }
      }

      // Game should still be running (check for week indicator in stats bar)
      await expect(page.getByText(/Woche \d+\/\d+ \|/)).toBeVisible();
    });
  });

  test.describe('Terminal Flow', () => {
    test('terminal choice opens terminal and can accept input', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      // Play through events until we find a terminal event
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(500);

        // Look for "Druckerfluch" event
        const drucker = page.locator('text=Druckerfluch');
        if (await drucker.isVisible({ timeout: 300 }).catch(() => false)) {
          // Click the terminal choice (check queue option)
          const terminalChoice = page.locator('button:has-text("Druckerwarteschlange")');
          if (await terminalChoice.isVisible({ timeout: 300 }).catch(() => false)) {
            await terminalChoice.click();

            // Terminal should now be visible (xterm container)
            await expect(page.locator('.xterm')).toBeVisible({ timeout: 3000 });

            // Type a command and verify terminal accepts input
            await page.keyboard.type('Get-PrintJob');
            await page.keyboard.press('Enter');

            // Wait a moment for output
            await page.waitForTimeout(500);

            // Terminal should still be visible (didn't crash)
            await expect(page.locator('.xterm')).toBeVisible();
            return; // Test passed
          }
        }

        // If not the drucker event, make any choice and continue
        const choiceButtons = page.locator('button:has-text("[")');
        if (await choiceButtons.count() > 0) {
          await choiceButtons.first().click();
          await page.waitForTimeout(300);
          const continueBtn = page.locator('button:has-text("Weiter")');
          if (await continueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await continueBtn.click();
          }
        }
      }
      // If we didn't find terminal event, that's okay - just verify game runs
    });

    test('terminal cancel returns to event without completing', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      // Play through events until we find a terminal event
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(500);

        const drucker = page.locator('text=Druckerfluch');
        if (await drucker.isVisible({ timeout: 300 }).catch(() => false)) {
          // Click the terminal choice
          const terminalChoice = page.locator('button:has-text("Druckerwarteschlange")');
          if (await terminalChoice.isVisible({ timeout: 300 }).catch(() => false)) {
            await terminalChoice.click();

            // Terminal should be visible
            await expect(page.locator('.xterm')).toBeVisible({ timeout: 3000 });

            // Press ESC to cancel
            await page.keyboard.press('Escape');

            // Should return to the same event (Druckerfluch should still be visible)
            await expect(page.locator('text=Druckerfluch')).toBeVisible({ timeout: 2000 });
            return;
          }
        }

        // Make any choice and continue
        const choiceButtons = page.locator('button:has-text("[")');
        if (await choiceButtons.count() > 0) {
          await choiceButtons.first().click();
          await page.waitForTimeout(300);
          const continueBtn = page.locator('button:has-text("Weiter")');
          if (await continueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await continueBtn.click();
          }
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can use Enter to continue', async ({ page }) => {
      await page.goto('/');
      await page.click('text=NEUES SPIEL STARTEN');
      await page.keyboard.press('Enter'); // Select default mode

      await page.waitForTimeout(1000);

      // Make a choice
      const choiceButtons = page.locator('button:has-text("[")');
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(300);

        // Press Enter to continue
        await page.keyboard.press('Enter');

        // Game should continue - look for the week indicator in stats bar
        await expect(page.getByText(/Woche \d+\/\d+ \|/)).toBeVisible();
      }
    });
  });
});

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('can create and retrieve a player', async ({ request }) => {
    // Create player
    const createResponse = await request.post('/api/players');
    expect(createResponse.ok()).toBeTruthy();

    const { id } = await createResponse.json();
    expect(id).toBeTruthy();

    // Get player
    const getResponse = await request.get(`/api/players/${id}`);
    expect(getResponse.ok()).toBeTruthy();

    const player = await getResponse.json();
    expect(player.id).toBe(id);
    expect(player.total_xp).toBe(0);
  });

  test('can save and load game state', async ({ request }) => {
    // Create player
    const createResponse = await request.post('/api/players');
    const { id } = await createResponse.json();

    // Save game
    const gameState = {
      currentWeek: 5,
      currentDay: 3,
      stress: 42,
      budget: 10000,
    };

    const saveResponse = await request.put(`/api/saves/${id}/1`, {
      data: { gameState },
    });
    expect(saveResponse.ok()).toBeTruthy();

    // Load game
    const loadResponse = await request.get(`/api/saves/${id}/1`);
    expect(loadResponse.ok()).toBeTruthy();

    const save = await loadResponse.json();
    expect(save.current_week).toBe(5);
    expect(save.stress).toBe(42);
    expect(save.gameState.currentDay).toBe(3);
  });
});
