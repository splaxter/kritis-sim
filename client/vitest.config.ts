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
     * Vitests Standard sind 5 s. Das ist fuer die GUI-Level-Specs zu knapp: sie
     * warten die ECHTEN 1600 ms von SOLVE_DELAY_MS (useGuiLevel) ab und machen
     * davor mehrere userEvent-Interaktionen, die unter Last je hunderte ms
     * kosten. Ein parallel laufendes `npm run dev` genuegte, um 3-11 Tests mit
     * "Test timed out in 5000ms" umzuwerfen — immer dieselben, immer nur
     * WindowsLevel, nie mit einer fehlgeschlagenen Zusicherung.
     *
     * Die Erhoehung beseitigt den Fehlalarm, nicht die Ursache: richtig waere,
     * die Animation mit Fake Timers zu ueberspringen, statt sie abzusitzen.
     * Das bleibt der offene Aufraeumtask. Bis dahin gilt: ein Test, der hier
     * ins Timeout laeuft, haengt wirklich — 15 s sitzt keine Animation aus.
     */
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@kritis/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
