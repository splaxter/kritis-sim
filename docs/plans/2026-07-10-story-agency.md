# Story Agency and Consequence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add meaningful route divergence, preparation consequences, reliable sidequest discovery, NPC callbacks, and ending transparency to Story mode while preserving the existing save schema and chapter spine.

**Architecture:** Extend the existing authored-event/flag system. Route and preparation state live in ordinary `GameState.flags`; alternate `StoryBeat` events are selected by the existing adventure engine with safe fallback. Sidequest offers are deterministic and non-blocking. The existing ending score remains compatible, while summary data exposes its inputs.

**Tech Stack:** TypeScript, React, Vitest, shared adventure types, existing story content engine.

---

### Task 1: Add failing route and preparation tests

**Files:**
- Modify: `client/src/engine/adventureEnding.test.ts`
- Modify: `client/src/engine/campaignConsistency.test.ts`

Add tests that official and underground states resolve different authored beat ids, that preparation flags select prepared crisis content, and that all new alternate ids resolve.

Run: `npm test -- client/src/engine/adventureEnding.test.ts client/src/engine/campaignConsistency.test.ts`

Expected: new assertions fail before content/engine changes.

### Task 2: Author route-specific and preparation-dependent events

**Files:**
- Modify: `client/src/content/adventure/chapters.ts`
- Modify: `client/src/content/adventure/story-events.ts`

Add compact alternates for the investigation, lockdown, crisis response, truth reveal, and finale. Ensure every new choice has consequence text and sets canonical flags. Keep the main spine and existing event ids intact.

Run: `npm test -- client/src/engine/campaignConsistency.test.ts`

Expected: content references and route tests pass.

### Task 3: Make route selection and preparation flags explicit

**Files:**
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/engine/adventureEngine.test.ts`

Add small helpers for deriving the active story route and preparation profile from flags. Use them when resolving route/preparation beat alternates, with fallback to the existing event when no branch applies.

Run: `npm test -- client/src/engine/adventureEngine.test.ts client/src/engine/adventureEnding.test.ts`

Expected: route and preparation tests pass with no save migration.

### Task 4: Replace sidequest lottery-only discovery with deterministic offers

**Files:**
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/engine/sidequestFlow.test.ts`

Add a deterministic offer helper that guarantees an eligible quest gets one offer during its valid window, while preserving one-active-quest behavior and never preventing the current story beat from being served. Existing completed/active checks remain authoritative.

Run: `npm test -- client/src/engine/sidequestFlow.test.ts client/src/engine/adventureEnding.test.ts`

Expected: offer timing is deterministic across repeated calls and the main campaign still completes.

### Task 5: Add visible NPC callback choices

**Files:**
- Modify: `client/src/content/adventure/story-events.ts`
- Modify: `client/src/content/adventure/sidequest-events.ts`
- Modify: `client/src/engine/campaignConsistency.test.ts`

Add callback choices tied to existing trust, sidequest, evidence, and preparation flags. Keep callbacks optional and ensure each callback has an authored result and a measurable effect.

Run: `npm test -- client/src/engine/campaignConsistency.test.ts client/src/engine/adventureEnding.test.ts`

Expected: callback flags are live, visible choices resolve, and no dead branch is introduced.

### Task 6: Expose ending factors in the run summary

**Files:**
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/components/RunSummaryScreen/index.tsx`
- Modify: `client/src/components/RunSummaryScreen/RunSummaryScreen.browser.test.tsx`

Extend summary data with route, preparation status, evidence/team/trust factors, and penalties. Render a concise “Warum dieses Ende?” panel without changing ending classification or save shape.

Run: `npm run test:client -- --run src/components/RunSummaryScreen/RunSummaryScreen.browser.test.tsx`

Expected: summary renders the factor panel and existing summary behavior remains intact.

### Task 7: Update story specification and verify all behavior

**Files:**
- Modify: `docs/GAME_MODES_SPEC.md`
- Modify: `docs/plans/2026-07-10-story-agency-design.md`

Document route divergence, guaranteed sidequest offers, preparation consequences, and ending transparency. Mark the design and implementation plan complete after verification.

Run: `npm test`
Run: `npm run test:client`
Run: `npm run build`

Expected: all suites pass and all three workspace builds complete successfully.

### Task 8: Review the branch diff

Inspect `git diff --check`, `git diff --stat`, and the changed story files for accidental unrelated edits. Preserve the user’s untracked root `CLAUDE.md` and report any remaining limitations.
