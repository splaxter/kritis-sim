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
    /**
     * Puffer fuer ausgehungerte Parallel-Worker (jsdom + Fluent-UI-Importkosten).
     *
     * Seit die GUI-Level-Specs mit Fake Timers laufen (src/test/fakeTimers.ts)
     * haengt hier KEIN Test mehr an echter Zeit — die 1600 ms Verweildauer aus
     * useGuiLevel werden vorgespult, nicht abgesessen. Diese Erhoehung verzoegert
     * also nur noch die Meldung eines Fehlschlags und verlangsamt keinen
     * gruenen Lauf. Ein Timeout hier heisst: da haengt wirklich etwas.
     */
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@kritis/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
