# Technical Debt & Future Improvements

Last updated: 2026-07-09

## Outstanding Items

### Level Design & Progression

| Item | Location | Description |
|------|----------|-------------|
| Add true difficulty-1 onboarding scenarios | `client/src/content/packs/*/scenarios.ts` | No scenario is below difficulty 2. Beginner mode is forgiving, but a gentler difficulty-1 tier would smooth a true novice's first hour. |
| Broaden interactive challenge types beyond terminal | `client/src/content/packs/cloud365/`, `client/src/content/packs/internal/`, `client/src/content/packs/telekom/` | These packs play mostly as decision scenarios. GUI or lightweight interactive tasks would make them feel as playable as `amse-it` / `kritis-infra`. |

### Code Quality (Minor)

| Item | Location | Description |
|------|----------|-------------|
| Magic numbers | Various event/scenario files | Scores (100, 15, …) could be extracted to named constants. |
| Error boundaries | React components | No error boundaries for graceful failure handling. |

### Architecture (Nice-to-Have)

| Item | Description |
|------|-------------|
| Content validation at build time | Currently runtime + test-time; a pre-build validation step could fail faster. |
| Cross-device player meta | `metaProgress.ts` (endings seen, runs played) is still localStorage-only, per browser. The new tracking backend (`docs/TRACKING.md`) records team-wide play stats server-side, but per-player meta is not yet read back from it. |

---

## Completed

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
