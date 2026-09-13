# Technical Debt & Future Improvements

Last updated: 2026-07-09

## Outstanding Items

### Level Design & Progression

| Item | Location | Description |
|------|----------|-------------|
| Empty day at the very end of a beginner run | `client/src/content/events/`, `engine/eventEngine.ts` | In a deterministic 40-seed simulation, beginner runs hit an empty day at **w12d4** in 2 of 40 runs (16 of 40 before the guided start added three scenarios). Guarded and bounded by `engine/beginnerOnboarding.test.ts`, which asserts no empty day before the last week. The fix is more late-window beginner content, not another selection rule. |
| `GameEvent.probability` is declared but never read | `client/src/engine/eventEngine.ts:147` | `selectNextEvent` picks `pool[hash % pool.length]`; the field only exists in `chainEngine`. About 200 of ~370 events declare `probability: 1`, so it cannot be promoted to a priority after the fact without resorting the whole game. Authors should know the field is decoration. The guided beginner start (`engine/onboarding.ts`) exists because of this. |
| Simulation guards depend on a real `Math.random()` | `client/src/engine/chainEngine.ts:125`, `kritisLatePacing.test.ts` | `scheduleChainEvents` draws per trigger, so the 40-seed KRITIS pacing simulation can be green or red for identical content. `beginnerOnboarding.test.ts` stubs a seeded generator; `kritisLatePacing.test.ts` does not yet. |

### Code Quality (Minor)

| Item | Location | Description |
|------|----------|-------------|
| Magic numbers | Various event/scenario files | Scores (100, 15, …) could be extracted to named constants. |

### Architecture (Nice-to-Have)

| Item | Description |
|------|-------------|
| Content validation at build time | Currently runtime + test-time; a pre-build validation step could fail faster. |
| Cross-device player meta | `metaProgress.ts` (endings seen, runs played) is still localStorage-only, per browser. The new tracking backend (`docs/TRACKING.md`) records team-wide play stats server-side, but per-player meta is not yet read back from it. |

---

## Completed

### 2026-09-13 — Einstieg und aktive Anbieter-Packs

Design + Plan: `docs/plans/2026-09-13-einstieg-und-aktive-packs*.md`

| Item | Wie |
|------|-----|
| Keine Szenarien unter Schwierigkeit 2 | Drei neue Faelle auf Schwierigkeit 1, je einer pro bisher passivem Pack: `INTERN-SC-011` (Prozess beenden), `CLOUD365-SC-007` (Rechteanforderung ablehnen), `TELEKOM-SC-007` (gueltige Vertragsfassung finden). Alle drei GUI, ohne Shell-Vorwissen, ohne Countdown. |
| cloud365 / internal / telekom spielen rein entscheidungsbasiert | Sechs vorhandene Faelle haben jetzt eine echte Aufgabe (fuenf Shell, eine Ereignisanzeige). Jedes der drei Packs kommt damit auf drei praktische Aufgaben; 27 der 45 Szenarien sind praktisch spielbar. |
| Szenarien kannten keine Modus-Gatung | `Scenario.requiredModes`, analog zu `GameEvent`. Notwendig geworden, weil der Frueh-Cap in JEDEM Modus bei 2 liegt: die Einstiegsfaelle landeten sonst in Woche 1 eines 24-woechigen KRITIS-Laufs und liessen `kritisLatePacing` in Woche 23 leer laufen (0 tote Tage auf main, 32 von 200 Laeufen mit ihnen im Pool, wieder 0 ohne sie). |
| Die vier Shell-Tutorials des Einsteigermodus liefen nie | Sie haengen ueber `requires.events` an `evt_first_day`, und der wurde an Tag 1 vom Zufall verdraengt, weil `probability` nicht gelesen wird. In 40 simulierten Laeufen wurde KEIN einziges Tutorial serviert — auch nicht nach dem blossen Verbreitern ihres Zeitfensters. Der gefuehrte Einstieg (`engine/onboarding.ts`) macht daraus eine feste Reihenfolge: 160 von 160. |

### 2026-09-13 — Hardening (Ersatz fuer den liegengebliebenen PR #8)

| Item | Wie |
|------|-----|
| Error boundaries | `components/ErrorBoundary` faengt Render-/Lifecycle-Fehler ab und zeigt statt einer weissen Seite einen Hinweis mit Neuladen-Knopf. Der Hinweis sichert den Spielstand bewusst NICHT zu: `useAutosave` schreibt erst nach erfolgreichem Rendern, also gibt es beim ersten Bildschirm gar keinen Stand und bei einem spaeteren Uebergang nur den davor. Der Text stellt ihn unter Vorbehalt und warnt vor Verlust. |
| Kein Linter | `eslint.config.mjs` (flach, nicht typgewahrt) plus `npm run lint` und ein CI-Schritt. Die 25 Altfehler sind behoben, nicht heruntergestuft: unnoetige Escapes, Regex-Leerzeichen, `let` statt `const`. Verbleibende 41 Altbefunde stehen auf "warn". |
| Betreiberangaben im JSX | nach `config/legal.ts` ausgelagert — Daten getrennt von Darstellung, mit eigenem Guard (`config/legal.test.ts`), der ohne Rendering prueft. |
| GUI-Tests haengen an echter Zeit | `src/test/fakeTimers.ts`: die 1,6 s Verweildauer wird vorgespult statt abgesessen. Beseitigt den Last-Flake an der Wurzel und macht die Zusicherungen exakt. |


### 2026-07-09
- [x] Story campaign completed (all 12 chapters + 3 endings; guarded by `campaignConsistency`/`campaignPacing`).
- [x] Revived 3 sidequests wired to Act-3 payoffs (`sq_legacy_code`, `sq_predecessor_trail`, `sq_external_contact`).
- [x] Run-summary screen for free-play/KRITIS (`components/RunSummaryScreen`, `engine/runSummary.ts`) — replaces the one-line gameover; the old "victory/end-of-run screen" item is resolved.
- [x] Story "not seen" replay teaser on the ending screen + cross-run meta (`engine/metaProgress.ts`).
- [x] Onboarding: first-run intro gating, LERNMODUS menu entry, one-time free-play → learning nudge.
- [x] Docs truth-pass: replaced `GAME_FLOW_COVERAGE.md` with `docs/CONTENT_INVENTORY.md`, deleted the obsolete `STORY_CAMPAIGN_TODO.md`.

### Earlier (Windows GUI vertical slice — shipped)
- [x] Fake-Windows desktop with six apps (`client/src/components/WindowsLevel/apps/`): Task Manager, Event Viewer, UAC, Explorer, Settings, CoreFirewall — each with browser tests.
- [x] `GuiContext` wired into the runtime (GUI levels + Blackout incident).
- [x] Beginner GUI level (suspicious process), Event Viewer security investigations, Explorer permissions level.

### 2026-03-15
- [x] Remove unsafe `as any` cast in useGame.ts; null guards for adventureState.
- [x] Fix event-listener memory leak (useKeyboardShortcuts).
- [x] Zod GameState validation (later removed with the backend — see BACKEND_REMOVAL.md).
- [x] Content id-uniqueness + prerequisite validation tests.
- [x] Stress decay mechanic; separate completedScenarios from completedEvents.

---

## How to Address Remaining Items

### Magic numbers
```typescript
// client/src/constants/gameValues.ts
export const SCORE_VALUES = {
  PERFECT_SOLUTION: 100,
  GOOD_SOLUTION: 50,
  PARTIAL_SOLUTION: 25,
} as const;
```

### Error boundaries
```typescript
// client/src/components/ErrorBoundary.tsx — wrap the App content.
```
