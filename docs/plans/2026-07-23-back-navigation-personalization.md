# Back-Navigation + Personalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a hierarchical back-navigation layer (one pure resolver, shared by a global ESC handler and a 44px BackButton) and make a stored display name visible in narrative text via a `{player}` token.

**Architecture:** Phase 1 centralizes the currently-scattered non-modal ESC handling into a pure `resolveBack(viewState)` returning a typed `BackAction | null`; App executes the action; existing modal-local ESC handlers stay. Phase 2 extracts the duplicated `replaceCharacterNames` into a pure callback-based `formatNarrativeText` and feeds it a `player` token. The two phases are independent and separately committable.

**Tech Stack:** React 18, TypeScript, Vitest (node `*.test.ts` + jsdom `*.browser.test.tsx`), Tailwind.

**Design doc:** `docs/plans/2026-07-23-back-navigation-personalization-design.md` (read it — it holds the verified constraints, the resolver decision table, and the full test lists).

**Acceptance bar:** every task ends green (`npx tsc --noEmit -p client/tsconfig.json` clean + the task's tests) and commits. No change to GameState/autosave/day-advance semantics, no change to account/`/home/timo`/SSH/VFS.

---

## Orientation — verified anchors (cite these; don't rediscover)

- `client/src/hooks/useGame.ts`: `GamePhase = 'menu'|'playing'|'terminal'|'result'|'gameover'|'storyEnding'` (`:23`). `openTerminal`/`openScenarioTerminal` both `setPhase('terminal')` (`:260-268`) — **GUI levels also run under `phase 'terminal'`** (App `onChoice` routes `opensTerminal||opensGui` through `game.openTerminal`, App `:815-821`). `closeTerminal(false)` clears pending + `setPhase('playing')`, **keeps `currentEvent`** (`:273`+). `clearCurrentContent` nulls content + pending + `setPhase('playing')` (`:401-409`). The hook returns an object listing its API (`:421-433`).
- `client/src/App.tsx`: modal/transient flags — `showIntro` (`:66`), `showNamePrompt`/`nameInput` (`:85-86`), `saveLoadModal.show` (`:131`), `newGamePicker` (`:135`), `legalPage` (`:137`). `characters` map (`:139-145`). `saveName`/`skipName` (`:93-115`). `resumeSave` read once at boot (`:61-62`), consumed in `handleResume` (`:227-232`). `useKeyboardShortcuts` handles ESC only for the Save/Load modal (`:238-240`). Legal ESC (`:408-419`). Menu render (`:438`+), name prompt (`:518-554`), storyEnding (`:617`+), gameover (`:709`+), learning-hub render (`:789-800`), GameScreen render + wiring (`:801-843`).
- `client/src/components/GameScreen/index.tsx`: window keydown — `phase==='result'&&Enter→onContinue`, `phase==='terminal'&&Escape→onTerminalCancel` (`:138-145`). This terminal-ESC branch moves to App in Task 5 (the Enter-on-result stays).
- `client/src/components/EventCard/index.tsx:29-37` and `client/src/components/ResultScreen/index.tsx:36-42`: identical `replaceCharacterNames` using `result.replace(regex, name)` — a **replacement string** (the `$&` bug). Both fed by the `characters` prop.

---

# PHASE 1 — Hierarchical back-navigation

## Task 1: Pure `resolveBack` resolver

**Files:**
- Create: `client/src/engine/backNavigation.ts`
- Test: `client/src/engine/backNavigation.test.ts`

**Step 1: Write the failing test**

```ts
// client/src/engine/backNavigation.test.ts
import { describe, it, expect } from 'vitest';
import { resolveBack, BackViewState } from './backNavigation';

const base: BackViewState = { anyModalOpen: false, phase: 'playing', isLearning: false, hasCurrentContent: false };
const v = (o: Partial<BackViewState>): BackViewState => ({ ...base, ...o });

describe('resolveBack', () => {
  it('returns null when any modal is open (guard wins over everything)', () => {
    expect(resolveBack(v({ anyModalOpen: true, phase: 'terminal' }))).toBeNull();
    expect(resolveBack(v({ anyModalOpen: true, phase: 'gameover' }))).toBeNull();
  });
  it('terminal (and GUI) → cancel-level', () => {
    expect(resolveBack(v({ phase: 'terminal' }))).toEqual({ kind: 'cancel-level', label: 'Level abbrechen' });
  });
  it('learning event/scenario card → learning-hub', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: true, hasCurrentContent: true })))
      .toEqual({ kind: 'learning-hub', label: 'Zum Lernpfad' });
  });
  it('learning hub (no content) → main-menu', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: true, hasCurrentContent: false })))
      .toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
  });
  it('standard/story active card → confirm-leave-run', () => {
    expect(resolveBack(v({ phase: 'playing', isLearning: false, hasCurrentContent: true })))
      .toEqual({ kind: 'confirm-leave-run', label: 'Zum Hauptmenü' });
  });
  it('gameover and storyEnding → main-menu', () => {
    expect(resolveBack(v({ phase: 'gameover' }))).toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
    expect(resolveBack(v({ phase: 'storyEnding' }))).toEqual({ kind: 'main-menu', label: 'Zum Hauptmenü' });
  });
  it('result stays forward-only → null', () => {
    expect(resolveBack(v({ phase: 'result' }))).toBeNull();
    expect(resolveBack(v({ phase: 'result', isLearning: true, hasCurrentContent: true }))).toBeNull();
  });
  it('menu and content-less standard playing → null', () => {
    expect(resolveBack(v({ phase: 'menu' }))).toBeNull();
    expect(resolveBack(v({ phase: 'playing', isLearning: false, hasCurrentContent: false }))).toBeNull();
  });
});
```

**Step 2: Run → FAIL**
`npx vitest run --root client --config vitest.config.ts src/engine/backNavigation.test.ts` → module not found.

**Step 3: Implement**

```ts
// client/src/engine/backNavigation.ts
import type { GamePhase } from '../hooks/useGame';

export type BackActionKind = 'cancel-level' | 'learning-hub' | 'main-menu' | 'confirm-leave-run';
export interface BackAction { kind: BackActionKind; label: string }

export interface BackViewState {
  anyModalOpen: boolean;
  phase: GamePhase;
  isLearning: boolean;
  hasCurrentContent: boolean; // Event OR Scenario
}

// Ordered decision chain — mirrors the design's priority table. The modal
// guard wins first so an open overlay handles its own ESC (no double action).
export function resolveBack(v: BackViewState): BackAction | null {
  if (v.anyModalOpen) return null;
  if (v.phase === 'terminal') return { kind: 'cancel-level', label: 'Level abbrechen' };
  if (v.phase === 'playing') {
    if (v.isLearning) {
      return v.hasCurrentContent
        ? { kind: 'learning-hub', label: 'Zum Lernpfad' }
        : { kind: 'main-menu', label: 'Zum Hauptmenü' };
    }
    if (v.hasCurrentContent) return { kind: 'confirm-leave-run', label: 'Zum Hauptmenü' };
    return null;
  }
  if (v.phase === 'gameover' || v.phase === 'storyEnding') {
    return { kind: 'main-menu', label: 'Zum Hauptmenü' };
  }
  return null; // menu, result
}
```

> `import type { GamePhase }` is a type-only import (erased at compile time) — no runtime engine→hooks coupling.

**Step 4: Run → PASS.**
**Step 5: Commit** `feat(nav): pure resolveBack back-navigation resolver` (append the two Co-Authored-By/Claude-Session trailers to every commit in this plan).

---

## Task 2: `returnToMenu` in useGame (no GameState reset)

**Files:**
- Modify: `client/src/hooks/useGame.ts` (add method + expose it; interface at `:23`-ish and return object `:421-433`)
- Test: `client/src/hooks/useGame.returnToMenu.test.ts` (node — useGame is a hook; test via `@testing-library/react` `renderHook`, jsdom) → name it `.browser.test.tsx`? It needs React. Use `client/src/hooks/useGame.returnToMenu.browser.test.tsx` (jsdom config picks up `*.browser.test.tsx`).

**Step 1: Failing test**

```tsx
// client/src/hooks/useGame.returnToMenu.browser.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';

describe('useGame.returnToMenu', () => {
  it('sets phase to menu and clears transient content without resetting the run', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame(undefined, 'story'));
    const weekBefore = result.current.state.currentWeek;
    act(() => result.current.returnToMenu());
    expect(result.current.phase).toBe('menu');
    expect(result.current.currentEvent).toBeNull();
    expect(result.current.currentScenario).toBeNull();
    // GameState (the persisted run) is untouched — same week, not a fresh run.
    expect(result.current.state.currentWeek).toBe(weekBefore);
  });
});
```

(Verify `startNewGame`'s real signature in useGame before writing; adapt the call. If a fresh game starts at week 1 anyway, additionally assert the state object identity/flags are preserved rather than reset — the point is `returnToMenu` must NOT call `createInitialState`.)

**Step 2: Run → FAIL** (`returnToMenu is not a function`).

**Step 3: Implement** — add near `clearCurrentContent` (`useGame.ts:401`):

```ts
const returnToMenu = useCallback(() => {
  setCurrentEvent(null);
  setCurrentScenario(null);
  setLastChoice(null);
  setLastScenarioChoice(null);
  setPendingTerminalChoice(null);
  setPendingScenarioTerminalChoice(null);
  setPhase('menu');
}, []);
```

Add `returnToMenu: () => void;` to the hook's return interface and `returnToMenu` to the returned object (`:421-433`).

**Step 4: Run → PASS.** **Step 5: Typecheck** `npx tsc --noEmit -p client/tsconfig.json`. **Step 6: Commit** `feat(nav): useGame.returnToMenu that preserves the run`.

---

## Task 3: Shared `BackButton` (44px)

**Files:**
- Create: `client/src/components/BackButton/index.tsx`
- Test: `client/src/components/BackButton/BackButton.browser.test.tsx`

**Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackButton } from './index';

describe('BackButton', () => {
  it('renders the label and fires onClick, with a 44px touch target', () => {
    const onClick = vi.fn();
    render(<BackButton label="Zum Lernpfad" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /Zum Lernpfad/ });
    expect(btn.className).toContain('min-h-11'); // 44px
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement**

```tsx
// client/src/components/BackButton/index.tsx
interface BackButtonProps { label: string; onClick: () => void; className?: string }

// Shared hierarchical back control. The label comes from resolveBack so ESC and
// this button always describe the same destination. min-h-11 = 44px touch target.
export function BackButton({ label, onClick, className = '' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center text-terminal-danger hover:underline ${className}`}
    >
      [ESC] {label}
    </button>
  );
}
```

(Match the existing terminal cancel-button styling at `Terminal/index.tsx:33-36` for visual consistency.)

**Step 4: Run → PASS.** **Step 5: Commit** `feat(nav): shared 44px BackButton`.

---

## Task 4: Run-leave confirmation dialog

**Files:**
- Create: `client/src/components/RunLeaveDialog/index.tsx`
- Test: `client/src/components/RunLeaveDialog/RunLeaveDialog.browser.test.tsx`

A focus-trapped modal (mirror `NewGameSelectModal`'s trap/ESC pattern, `components/NewGameSelectModal/index.tsx:58-88`). Its own ESC = `onContinue` (stay in run). Two buttons: „Run fortsetzen" (`onContinue`), „Zum Hauptmenü" (`onLeave`). Both `min-h-11`. `role="dialog"`, `aria-modal`. Honest wording from the design.

**Step 1: Failing test** — asserts: renders the honest text (`/noch nicht abgeschlossene Schritt/`); „Run fortsetzen" → `onContinue`; „Zum Hauptmenü" → `onLeave`; ESC key → `onContinue` (not `onLeave`); both buttons have `min-h-11`.

**Step 2–4:** Implement, run → PASS. **Step 5:** typecheck. **Step 6: Commit** `feat(nav): run-leave confirmation dialog`.

---

## Task 5: Wire the central ESC + BackButton + executeBack in App

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/GameScreen/index.tsx` (remove the terminal-ESC branch; keep Enter-on-result)
- Test: `client/src/App.backNavigation.browser.test.tsx`

**Step 1: App wiring** (add, near the other effects/state):

```tsx
// transient run-leave dialog flag
const [runLeaveOpen, setRunLeaveOpen] = useState(false);

// One source of truth for "is any overlay open" — feeds the resolver guard.
const anyModalOpen =
  showIntro || showNamePrompt || saveLoadModal.show || !!newGamePicker || !!legalPage || runLeaveOpen;

const backAction = resolveBack({
  anyModalOpen,
  phase: game.phase,
  isLearning: game.state.gameMode === 'learning',
  hasCurrentContent: !!game.currentEvent || !!game.currentScenario,
});

const executeBack = useCallback((action: BackAction) => {
  switch (action.kind) {
    case 'cancel-level': game.closeTerminal(false); break;
    case 'learning-hub': game.clearCurrentContent(); break;
    case 'confirm-leave-run': setRunLeaveOpen(true); break;
    case 'main-menu':
      setRunLeaveOpen(false);
      game.returnToMenu();
      // Re-read the autosave so "Weiter spielen" reappears after leaving a run.
      setResumeSave(readAutosave(playerId));
      break;
  }
}, [game, playerId]);

// The ONE global ESC listener for non-modal back-navigation. When a modal is
// open, resolveBack returns null (guard) and the modal's own ESC handles it.
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (!backAction) return;
    e.preventDefault();
    executeBack(backAction);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [backAction, executeBack]);
```

Import `resolveBack, BackAction` from `./engine/backNavigation`.

> **Precedence check:** `isLearning` — verify `game.state.gameMode === 'learning'` is the right signal (the design's `isLearning`). If cliOnly is what actually gates the hub render (App uses `learningCliOnly`), align `isLearning` with the SAME condition the hub-render uses (`:789-800`) so the resolver and the render agree. Use whatever boolean the hub render keys on.

**Step 2: Render the BackButton** from the single `backAction`, so button and ESC share it. Pass `backAction` + `onBack={() => backAction && executeBack(backAction)}` down to `GameScreen` and `LearningHub`, and render `<BackButton label={backAction.label} onClick={onBack} />` where each screen shows its controls (GameScreen event-card/terminal control row; LearningHub header; gameover screen). The Terminal's existing `[ESC] Abbrechen` button may stay (it already calls `closeTerminal(false)` = the cancel-level action) OR be replaced by BackButton — keep it to minimize churn; the important parity is ESC↔action, already guaranteed by the resolver.

**Step 3: Render `RunLeaveDialog`** when `runLeaveOpen`, with `onContinue={() => setRunLeaveOpen(false)}` and `onLeave={() => executeBack({ kind: 'main-menu', label: 'Zum Hauptmenü' })}`.

**Step 4: Remove the terminal-ESC branch** in `GameScreen/index.tsx:142-144` (the `if (phase === 'terminal' && e.key === 'Escape') onTerminalCancel();`). KEEP the `phase==='result'&&Enter→onContinue` branch. (`onTerminalCancel` prop stays — the visible button still uses it.)

**Step 5: Integration tests** `client/src/App.backNavigation.browser.test.tsx` (jsdom, render `<App/>`, drive `fireEvent.keyDown(window, { key: 'Escape' })`). Prove the design's Phase-1 list:
- ESC in a terminal level cancels back to the event card (phase leaves 'terminal').
- ESC on a learning hub / gameover reaches the main menu.
- ESC on a standard/story active event opens the run-leave dialog; a SECOND ESC (dialog now open → guard) closes only the dialog (does not also navigate).
- **Run→Menu preserves the saved run:** snapshot `localStorage['kritis_autosave_<id>']` before leaving; after „Zum Hauptmenü", the stored `gameState` is byte-identical (the incomplete in-progress step was React-state only, discarded).
- **„Weiter spielen" reappears** on the menu after leaving a run (the menu shows the continue entry because `resumeSave` was re-read).
- ESC on `result` does nothing (no navigation).

(These are higher-effort integration tests; if rendering full `<App/>` is heavy, assert the pieces via the smallest render that exercises `resolveBack`+`executeBack`. Do NOT weaken the run-preservation assertion — it's the safety-critical one.)

**Step 6: Typecheck + run** the new App test + the resolver/hook/component tests. **Step 7: Commit** `feat(nav): central ESC + BackButton wiring, run-leave dialog, hub/gameover back`.

**Phase 1 gate:** `npm run test:client -- src/engine/backNavigation.test.ts` won't run (node test) — run node via `npm test -- client/src/engine/backNavigation.test.ts` and the jsdom tests via `npm run test:client`. Full `npm run build` clean.

---

# PHASE 2 — Player personalization

## Task 6: Pure `formatNarrativeText` (callback replacement)

**Files:**
- Create: `client/src/engine/formatNarrativeText.ts`
- Test: `client/src/engine/formatNarrativeText.test.ts`

**Step 1: Failing test**

```ts
// client/src/engine/formatNarrativeText.test.ts
import { describe, it, expect } from 'vitest';
import { formatNarrativeText } from './formatNarrativeText';

const tokens = { chef: 'Bert', player: 'Alex' };

describe('formatNarrativeText', () => {
  it('replaces {player} and {chef}', () => {
    expect(formatNarrativeText('Hallo {player}, sagt {chef}.', tokens)).toBe('Hallo Alex, sagt Bert.');
  });
  it('replaces every occurrence (global)', () => {
    expect(formatNarrativeText('{player} und {player}', tokens)).toBe('Alex und Alex');
  });
  it('leaves a name containing $& / $` / $$ LITERAL (callback replacement, not $-syntax)', () => {
    expect(formatNarrativeText('Hi {player}!', { player: '$&$`$$' })).toBe('Hi $&$`$$!');
  });
  it('leaves unknown tokens untouched', () => {
    expect(formatNarrativeText('{gf} kommt', tokens)).toBe('{gf} kommt');
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement**

```ts
// client/src/engine/formatNarrativeText.ts
// Substitutes {role} tokens from a role→value map. Uses a CALLBACK replacement
// (() => value) so a free-entered player name containing $&, $`, $', or $$ is
// inserted literally instead of being interpreted as replacement-string syntax.
export function formatNarrativeText(text: string, tokens: Record<string, string>): string {
  let result = text;
  for (const [role, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), () => value);
  }
  return result;
}
```

**Step 4: Run → PASS.** **Step 5: Commit** `feat(personalization): pure formatNarrativeText with callback replacement`.

---

## Task 7: displayName state + wire the formatter into EventCard/ResultScreen

**Files:**
- Modify: `client/src/App.tsx` (add `displayName` state; merge into the token map passed as `characters`; update it in `saveName`)
- Modify: `client/src/components/EventCard/index.tsx` (replace local `replaceCharacterNames` with `formatNarrativeText`)
- Modify: `client/src/components/ResultScreen/index.tsx` (same)
- Test: `client/src/App.personalization.browser.test.tsx`

**Step 1: App displayName state**

```tsx
const [displayName, setDisplayName] = useState<string>(() => {
  try { return localStorage.getItem('kritis_player_name')?.trim() || 'Timo'; }
  catch { return 'Timo'; }
});
```

In `saveName` (`:101-114`), after storing, `setDisplayName(name)`. (Leave `skipName` alone — displayName already defaulted to 'Timo'.)

Build the token map once and pass it as the existing `characters` prop:

```tsx
const tokenMap = useMemo(() => ({ ...characters, player: displayName }), [characters, displayName]);
```

Replace `characters={characters}` with `characters={tokenMap}` where GameScreen is rendered (App `:810`). (GameScreen forwards `characters` to EventCard/ResultScreen unchanged.)

**Step 2: EventCard + ResultScreen** — delete the local `replaceCharacterNames` (`EventCard:29-35`, `ResultScreen:36-42`) and import `formatNarrativeText`. Replace each call site: `replaceCharacterNames(x)` → `formatNarrativeText(x, characters)` (the `characters` prop now carries `player`). Verify no other call site of the deleted helper remains in each file.

**Step 3: Failing/behavioral test** `App.personalization.browser.test.tsx`:
- With `localStorage.setItem('kritis_player_name', 'Alex')`, an event/result whose text contains `{player}` renders `Alex`.
- With no stored name, `{player}` renders `Timo`.
- A stored name `"$&"` renders literally `$&` (end-to-end callback proof).
- Existing `{chef}` still renders `Bert`.

Use the smallest render that exercises EventCard/ResultScreen with a `characters` prop containing `player` (you may unit-test the components directly with a crafted event/result rather than the full App if lighter).

**Step 4: Run + typecheck → PASS.** **Step 5: Commit** `feat(personalization): {player} token in EventCard/ResultScreen from display name`.

---

## Task 8: Starter authoring + menu hint

**Files:**
- Modify: `client/src/content/events/story/story-week1-2.ts` (`evt_erster_arbeitstag`, id at `:11`)
- Modify: `client/src/content/events/learning-path.ts` (`learn_11_final_boss`, id `:2627`, finale line `:2700`)
- Modify: `client/src/App.tsx` (name-prompt hint text, `:518-554` block)
- Test: `client/src/engine/playerTokenAuthoring.test.ts`

**Step 1: Author the three spots** (locate the CURRENT string in each file and insert only the `{player}` token; keep all surrounding prose):
- `evt_erster_arbeitstag` description → `Dein erster Tag bei WARM. {chef} blickt kurz von seinem Bildschirm auf. „Willkommen, {player}." Dann gibt er dir gleich zwei Aufgaben:`
- `evt_erster_arbeitstag` `ask_colleague` choice `resultText` → `Jens lächelt. „Guter Instinkt, {player}. Wenn die GF meckert, ist das Prio 1. …"` (keep the existing continuation after „Prio 1." verbatim — only insert `, {player}`).
- `learn_11_final_boss` finale (`learning-path.ts:2700`) → `**Du hast es geschafft, {player}!**`
- App name-prompt hint → `optional — für persönliche Ansprache und Team-Statistik`.

> The exact German wording is authored/owned by the user; apply it verbatim as above. Read each current string first and insert the token without disturbing punctuation/markdown.

**Step 2: Content test** `client/src/engine/playerTokenAuthoring.test.ts`:
- `evt_erster_arbeitstag.description` contains `{player}`; the `ask_colleague` resultText contains `{player}`; `learn_11_final_boss` finale contains `{player}`.
- Guard against a stray literal token in shipped prose: no *rendered* `{player}` leaks — assert `formatNarrativeText(text, { ...roles, player: 'Timo' })` on each authored string contains `Timo` and NOT `{player}`.
- Technical safety: assert these authored strings contain no new `timo`/SSH/path artifacts (sanity: they shouldn't) and that `learning-path-advanced.ts` is untouched by this task (not imported here; just don't edit it).

**Step 3: Run** the content test + `npm test` (content audits: orthography etc. may react to prose — treat failures as content feedback and adjust minimally, preserving the authored intent; report any). **Step 4: Typecheck. Step 5: Commit** `content(personalization): author {player} starter spots + honest menu hint`.

---

## Final verification (after both phases)

1. `npm test` (node) → green.
2. `npm run test:client` (jsdom) → green.
3. `npm run build` → exit 0 (tsc + vite + server).
4. `git diff --check main...HEAD` → clean.
5. Manual (per `.claude/skills/verify/SKILL.md`): ESC from a learning terminal → briefing card → hub → main menu; ESC on a standard event → run-leave dialog → „Zum Hauptmenü" → menu shows „Weiter spielen"; set a name → see it in the first-day event; skip → see „Timo".

## Not in scope
- No global `applyTokens` at terminal/scenario/act-break paths (V2).
- No migration of modal-local ESC into the resolver.
- No change to `continueGame`/day-advance or the `result` forward flow.
- No edit to `learning-path-advanced.ts` or any account/path/SSH/VFS literal.
