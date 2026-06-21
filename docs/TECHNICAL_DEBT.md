# Technical Debt & Future Improvements

Last updated: 2026-03-15

## Outstanding Items

### Level Design & Progression

| Item | Location | Description |
|------|----------|-------------|
| Add true difficulty-1 onboarding scenarios | `client/src/content/packs/*/scenarios.ts` | Most scenario packs start at difficulty 2-4. Beginner mode is forgiving, but needs more simple, hands-on first-run scenarios before vendor/KRITIS pressure ramps up. |
| Broaden interactive challenge types beyond terminal | `client/src/content/packs/cloud365/`, `client/src/content/packs/internal/`, `client/src/content/packs/telekom/` | These packs currently play mostly as decision scenarios. Add GUI or lightweight interactive tasks so they feel as playable as `amse-it` and `kritis-infra`. |
| Add victory/end-of-run screen | `client/src/hooks/useGame.ts`, `client/src/components/GameScreen/`, `client/src/engine/gameState.ts` | `checkGameOver()` can return `isVictory: true`, but the UI phase is still generic `gameover`. A dedicated win GUI should show ending, score/competence summary, mode-specific outcome, and replay goals. |

### Windows GUI Challenges

| Item | Location | Description |
|------|----------|-------------|
| Wire `GuiContext` into scenarios | `shared/src/types/scenarios.ts`, `client/src/hooks/useGame.ts`, `client/src/App.tsx` | `GuiContext` exists and `Scenario` imports it, but the runtime path is not wired like terminal challenges. Add `guiCommand`, a `gui` phase, pending GUI choice state, and solved/cancel handling. |
| Build first Windows GUI vertical slice | `client/src/components/WindowsGui/` | Start with `GuiAppId: 'taskmanager'`: render process list, selection, end-task action, hints, and solution matching. This validates the interaction model before adding more fake Windows apps. |
| Add beginner GUI level: suspicious process | `client/src/content/packs/internal/scenarios.ts` or `client/src/content/events/learning-path.ts` | First GUI scenario should be difficulty 1-2: identify high-CPU suspicious process in Task Manager and end it, with clear feedback and low punishment. |
| Add Event Viewer level for security investigations | `shared/src/types/gui.ts`, `client/src/components/WindowsGui/`, security scenario pack | Extend GUI apps with an Event Viewer view for failed logins, suspicious service starts, and ransomware precursors. Good fit for learning mode and KRITIS preparation. |
| Add Explorer permissions level | `shared/src/types/gui.ts`, `client/src/components/WindowsGui/`, `client/src/content/packs/cloud365/` or `internal` | Fake Explorer/security dialog level where the player fixes an overbroad share permission such as `Everyone: Full Control`. |

### Tests (Low Priority)

| Item | Location | Description |
|------|----------|-------------|
| Zod validation tests | `server/src/routes/saves.test.ts` | Marked as `.todo()` - requires integrating validation into testApp.ts |
| Adventure engine unit tests | `client/src/engine/` | Core logic works, tested via integration, but dedicated unit tests would help |

### Code Quality (Minor)

| Item | Location | Description |
|------|----------|-------------|
| Magic numbers | Various event/scenario files | Scores (100, 15, etc.) should be extracted to constants |
| Character reference `{athos}` | `client/src/App.tsx:38` | Defined but may not be used in all events |
| Error boundaries | React components | No error boundaries for graceful failure handling |

### Architecture (Nice-to-Have)

| Item | Description |
|------|-------------|
| Test app router duplication | `server/src/test/testApp.ts` duplicates route logic - could import actual routes |
| Content validation at build time | Currently runtime - could add pre-build validation step |

---

## Completed Items (2026-03-15)

### Critical Fixes
- [x] Remove unsafe `as any` cast in useGame.ts
- [x] Add null guards for adventureState access
- [x] Fix memory leak in event listeners (useKeyboardShortcuts hook)
- [x] Fix silent JSON parse failure in saves route

### Important Fixes
- [x] Add Zod schema validation for GameState
- [x] Add content ID uniqueness validation tests
- [x] Add event prerequisite validation tests
- [x] Disable save/load buttons during async operations
- [x] Implement stress decay mechanic
- [x] Separate completedScenarios from completedEvents
- [x] Configure CORS for production

### Minor Fixes
- [x] Remove debug console.log statements
- [x] Add safeguard for infinite loop in content selection
- [x] Update server tests with new fields

---

## How to Address Remaining Items

### Zod validation tests
```bash
# In server/src/test/testApp.ts, import and use validateGameState:
import { validateGameState } from '../validation/gameStateSchema.js';

# Then add validation in createSavesRouter() PUT handler
```

### Magic numbers
```typescript
// Create client/src/constants/gameValues.ts
export const SCORE_VALUES = {
  PERFECT_SOLUTION: 100,
  GOOD_SOLUTION: 50,
  PARTIAL_SOLUTION: 25,
} as const;
```

### Error boundaries
```typescript
// Create client/src/components/ErrorBoundary.tsx
// Wrap main App content with error boundary
```
