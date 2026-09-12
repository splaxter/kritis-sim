import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Standard ist Playwrights mitgeliefertes Chromium — dieselbe gepinnte
        // Version, die CI fährt, damit ein Layout-Test lokal und dort dasselbe
        // misst. Wer den Download nicht hat (oder nicht will), kann mit
        // PW_CHANNEL=chrome das installierte Google Chrome nehmen:
        //
        //   PW_CHANNEL=chrome npm run test:e2e
        //
        // Das ist bewusst KEIN Default: Chrome auf dem Rechner ist meist
        // deutlich neuer als das gepinnte Chromium, und genau die Suiten, die
        // hier laufen, messen Pixel (mobile-*-layout.spec.ts). Abweichungen
        // zwischen lokal und CI wären dann echte Fehlalarme in beide Richtungen.
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: 'NODE_ENV=production npm start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
