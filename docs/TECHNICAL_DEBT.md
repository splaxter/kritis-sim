# Technical Debt & Future Improvements

Last updated: 2026-03-15

## Outstanding Items

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
