import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // *.browser.test.tsx need a DOM; they run via client/vitest.config.ts (jsdom).
    exclude: ['node_modules', 'dist', '**/*.browser.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});
