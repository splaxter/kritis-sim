import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // Headroom for CPU-starved parallel workers (jsdom + Fluent UI import
    // cost); tests no longer depend on real time (see src/test/fakeTimers.ts),
    // so this only delays *failure* reporting, never slows a passing run.
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@kritis/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
