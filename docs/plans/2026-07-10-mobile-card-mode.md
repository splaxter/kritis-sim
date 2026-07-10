# Mobile Card Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the card-game core (menus, mode select, event/scenario cards, results, stats, run summary, ending, save/load, learning hub) fully playable on phones, while terminal and Windows-GUI levels get a graceful in-fiction German fallback that skips the task without reward or penalty.

**Architecture:** A tiny `useViewport` hook detects touch-only devices via `matchMedia('(hover: none) and (pointer: coarse)')` (no UA sniffing; width-based layout stays in Tailwind CSS breakpoints). Card screens get ≥44 px tap targets, `active:` states, a `touch:` Tailwind variant that hides keyboard-hint chrome, and `sm:`-gated responsive layout (StatsBar collapses to a summary strip with a tap-to-expand details panel). When `phase === 'terminal'` on a touch-only device, `GameScreen` renders a `TouchTaskFallback` card instead of xterm/Fluent, wired to a new `useGame.skipTerminalTask()` that completes the content with zero effects, advances the day, and advances story beats/sidequests so the campaign can't soft-lock; the learning hub shows a mode-level notice instead.

**Tech Stack:** React 18 + Vite + Tailwind 3.4 (client), vitest 4 + @testing-library/react 16 (jsdom, run via `npm run test:client -- <file>` from repo root — builds `shared` first), Playwright 1.58 (chromium only today; a second chromium project emulates an iPhone).

---

## Reality check (verified 2026-07-10 — read before executing)

The task brief's "zero touch handlers / choices only via keys" is **outdated**: every choice, CTA and menu item already has an `onClick` (verified in `App.tsx:451-566`, `EventCard/index.tsx:117/137/164`, `ScenarioCard/index.tsx:95`, `ResultScreen/index.tsx:117-262`, `GameModeSelectModal/index.tsx:100`, `SaveLoadModal/index.tsx:245-284`, `LearningHub/index.tsx:49/103`, `RunSummaryScreen/index.tsx:181`, `EndingScreen/index.tsx:140`). Taps therefore already *register*. What is actually broken on mobile:

1. **No device detection** — nothing in `client/src` reads `pointer: coarse` (only the jsdom shim `client/src/test/setup.ts:13`).
2. **Small tap targets** — e.g. `EventCard` standard decision rows `p-2` (~36 px), `SaveLoadModal` action buttons `px-2 py-1`, `LearningHub` level rows `px-2 py-1`.
3. **Hover/keyboard-only affordances** — keyboard-hint footers (`[1-3] / [Enter] …`, `[↑↓] Navigieren`) are noise on touch; no `active:` feedback; `SaveLoadModal` slot rows have `cursor-pointer` + `onMouseEnter` but **no `onClick`** (`SaveLoadModal/index.tsx:215-222`).
4. **Fixed/wide layout** — `StatsBar` `grid-cols-2` unconditional (`StatsBar/index.tsx:111`), `RunSummaryScreen` three `grid-cols-2` blocks (`:91/:119/:136`), `p-8` panels touching viewport edges (menu `App.tsx:440`, act-break `App.tsx:657`, `EndingScreen:64`, `RunSummaryScreen:79`), status strip `flex gap-8` can overflow 360 px (`StatsBar:140`). Only 4 files use breakpoints today (IntroScreen + 3 GameAssets) — none core gameplay.
5. **Terminal (xterm) and WindowsLevel (Fluent UI) are unusable on touch** — launched from `GameScreen/index.tsx:93-130` when `useGame` phase is `'terminal'` (set by `openTerminal`/`openScenarioTerminal`, `useGame.ts:249-257`); completion flows back through `closeTerminal` (`useGame.ts:262-338`). Story-mode beats only advance in `makeChoice` (`useGame.ts:197`), so a skip path must advance beats itself or the same hands-on beat re-serves forever.

**Do NOT** convert `GameModeSelectModal`'s mode cards from `div` to `button` — `e2e/game.spec.ts` selects them via `div.cursor-pointer` in 6 places.

**Test commands** (from repo root):
- Client (jsdom) tests: `npm run test:client -- <path-filter>` (e.g. `npm run test:client -- src/hooks/useViewport`)
- Full unit guard: `npm test` (node config; excludes `*.browser.test.tsx`) then `npm run test:client`
- E2E: `npm run test:e2e` (builds everything, serves prod on :3000)
- Dev server for screenshots: `npm run dev` → http://localhost:5173

---

### Task 1: `useViewport` — touch-only device detection hook

**Files:**
- Create: `client/src/hooks/useViewport.ts`
- Test: `client/src/hooks/useViewport.browser.test.tsx`

Width-based decisions stay in CSS (`sm:` = 640 px); the *fallback* decision must be pointer-based, not width-based — an iPad landscape is 1024 px wide and still can't type into xterm. `(hover: none) and (pointer: coarse)` matches phones/tablets and stays false when a mouse/keyboard is attached.

**Step 1.1 — failing test.** Write `client/src/hooks/useViewport.browser.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsTouchOnly, TOUCH_ONLY_QUERY } from './useViewport';

type Listener = (e: { matches: boolean }) => void;

/** Controllable matchMedia fake: per-query match state + change events. */
function installMatchMedia(initial: Record<string, boolean> = {}) {
  const matches = new Map<string, boolean>(Object.entries(initial));
  const listeners = new Map<string, Set<Listener>>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches.get(query) ?? false,
    media: query,
    addEventListener: (_: 'change', cb: Listener) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(cb);
    },
    removeEventListener: (_: 'change', cb: Listener) => listeners.get(query)?.delete(cb),
  }));
  return {
    set(query: string, value: boolean) {
      matches.set(query, value);
      listeners.get(query)?.forEach((cb) => cb({ matches: value }));
    },
    listenerCount: (query: string) => listeners.get(query)?.size ?? 0,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery / useIsTouchOnly', () => {
  it('reflects the initial match state', () => {
    installMatchMedia({ '(min-width: 640px)': true });
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query fires a change event', () => {
    const mm = installMatchMedia();
    const { result } = renderHook(() => useIsTouchOnly());
    expect(result.current).toBe(false);
    act(() => mm.set(TOUCH_ONLY_QUERY, true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const mm = installMatchMedia();
    const { unmount } = renderHook(() => useIsTouchOnly());
    expect(mm.listenerCount(TOUCH_ONLY_QUERY)).toBe(1);
    unmount();
    expect(mm.listenerCount(TOUCH_ONLY_QUERY)).toBe(0);
  });

  it('useIsTouchOnly keys off hover:none + pointer:coarse (no UA sniffing)', () => {
    expect(TOUCH_ONLY_QUERY).toBe('(hover: none) and (pointer: coarse)');
  });
});
```

**Step 1.2 — run, watch it fail:**
`npm run test:client -- src/hooks/useViewport`
Expected: `Error: Failed to resolve import "./useViewport"` (module doesn't exist).

**Step 1.3 — minimal implementation.** Create `client/src/hooks/useViewport.ts`:

```ts
import { useEffect, useState } from 'react';

/**
 * Matches touch-only devices (phone/tablet, no mouse attached). The terminal/
 * GUI fallback keys off this — NOT off viewport width, because a wide tablet
 * still has no physical keyboard. Width-based layout lives in Tailwind (`sm:`).
 */
export const TOUCH_ONLY_QUERY = '(hover: none) and (pointer: coarse)';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches); // re-sync if `query` changed between renders
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsTouchOnly(): boolean {
  return useMediaQuery(TOUCH_ONLY_QUERY);
}
```

Note: existing jsdom tests keep working — `client/src/test/setup.ts:13-24` already shims `matchMedia` with `matches: false` and no-op listeners, i.e. "desktop" everywhere by default.

**Step 1.4 — run, watch it pass:**
`npm run test:client -- src/hooks/useViewport` → `4 passed`.

**Step 1.5 — commit:**
```bash
git add client/src/hooks/useViewport.ts client/src/hooks/useViewport.browser.test.tsx
git commit -m "feat(mobile): useViewport hook — touch-only detection via pointer media query" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: StatsBar — mobile summary strip with tap-to-expand details

**Files:**
- Modify: `client/src/components/StatsBar/index.tsx` (header `:97-109`, grid `:111`, status strip `:140`)
- Test: `client/src/components/StatsBar/StatsBar.mobile.browser.test.tsx` (create)

**Chosen pattern:** the always-visible part on mobile is a *summary strip* — warnings banner + compact header (mode badge, `Woche x/y | Tag`) + the existing bottom status strip (stress blocks, budget, compliance, now `flex-wrap`). The skills/relationships grid collapses behind a `▸ Skills & Beziehungen` toggle button (`sm:hidden`), stacking single-column when expanded. Desktop ≥640 px renders exactly as today (`sm:grid grid-cols-1 sm:grid-cols-2`); the toggle never shows there. No JS device detection needed — pure CSS + one `useState`.

**Step 2.1 — failing test.** Create `client/src/components/StatsBar/StatsBar.mobile.browser.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInitialState } from '../../engine/gameState';
import { StatsBar } from './index';

describe('StatsBar — mobile collapse', () => {
  it('collapses skills/relationships behind an sm:hidden toggle; desktop classes keep it visible', async () => {
    render(<StatsBar state={createInitialState('SEED', 'intermediate')} />);

    const toggle = screen.getByRole('button', { name: /Skills & Beziehungen/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('sm:hidden'); // desktop never sees the toggle

    const details = screen.getByTestId('stats-details');
    expect(details.className).toContain('hidden');   // collapsed below sm…
    expect(details.className).toContain('sm:grid');  // …always expanded at ≥sm

    await userEvent.setup().click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('stats-details').className).not.toContain('hidden ');
    // content is actually there
    expect(screen.getByText('─ SKILLS ─')).toBeInTheDocument();
    expect(screen.getByText('─ BEZIEHUNGEN ─')).toBeInTheDocument();
  });

  it('learning-mode header is untouched (no toggle)', () => {
    render(<StatsBar state={createInitialState('SEED', 'learning')} />);
    expect(screen.queryByRole('button', { name: /Skills & Beziehungen/i })).toBeNull();
  });
});
```

**Step 2.2 — run, fail:** `npm run test:client -- src/components/StatsBar` → `Unable to find role="button" name /Skills & Beziehungen/`.

**Step 2.3 — implementation.** In `client/src/components/StatsBar/index.tsx`:

1. Add `import { useState } from 'react';` and inside `StatsBar` (after the learning-mode early return): `const [detailsOpen, setDetailsOpen] = useState(false);`
2. Header (`:97-109`) — let it wrap and hide the long title below `sm`:

```tsx
      <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 mb-3 sm:mb-4 pb-2 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <span className="text-lg hidden sm:inline">KRITIS ADMIN SIMULATOR</span>
          <span className="text-terminal-green-dim text-sm border border-terminal-border px-2 py-0.5">
            {modeConfig.icon} {modeConfig.name}
          </span>
        </div>
        <span className="text-terminal-green-dim">
          Woche {state.currentWeek}/{totalWeeks} | {DAYS[state.currentDay]}
        </span>
      </div>
```

   (Keep the `Woche {…}/{…} | …` text shape exactly — `e2e/game.spec.ts` regexes match `/Woche 1\/\d+ \|/`.)
3. Insert the toggle right before the grid:

```tsx
      {/* Mobile-only: skills/relationships live behind a summary toggle */}
      <button
        type="button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((o) => !o)}
        className="sm:hidden w-full min-h-[44px] mb-2 border border-terminal-border px-3 py-2 text-left text-sm text-terminal-green-dim active:bg-terminal-bg-highlight"
      >
        {detailsOpen ? '▾' : '▸'} Skills &amp; Beziehungen
      </button>
```

4. Grid (`:111`) becomes:

```tsx
      <div
        data-testid="stats-details"
        className={`${detailsOpen ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6`}
      >
```

5. Status strip (`:140`): `className="mt-3 sm:mt-4 pt-2 border-t border-terminal-border flex flex-wrap gap-x-8 gap-y-1 text-sm"`.

**Step 2.4 — run, pass:** `npm run test:client -- src/components/StatsBar` → `2 passed`. Also run `npm run test:client` fully — no other client test renders StatsBar-specific classes, all should stay green.

**Step 2.5 — commit:**
```bash
git add client/src/components/StatsBar
git commit -m "feat(mobile): StatsBar collapses to summary strip + tap-to-expand details below sm" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `touch:` Tailwind variant + card tap ergonomics (EventCard, ScenarioCard, Result screens)

**Files:**
- Modify: `client/tailwind.config.js` (theme.extend)
- Modify: `client/src/components/EventCard/index.tsx` (`:160-183` standard rows, `:132-157` story rows, `:234-237` + `:263-265` hint footers)
- Modify: `client/src/components/ScenarioCard/index.tsx` (`:92-101` choice buttons)
- Modify: `client/src/components/ResultScreen/index.tsx` (`:193-199` story continue, `:260-266` standard continue)
- Modify: `client/src/components/ScenarioResultScreen/index.tsx` (`:119-124` continue)
- Test: extend `client/src/components/EventCard/EventCard.browser.test.tsx`

Keyboard handling (`EventCard:32-57` window keydown for 1-9/j/k/arrows/Enter, `GameScreen:61-73` Enter-to-continue) is **not touched** — tests assert both paths.

**Step 3.1 — failing test.** Append to `client/src/components/EventCard/EventCard.browser.test.tsx` (it already imports `fireEvent`? it doesn't — add `fireEvent` to the `@testing-library/react` import):

```tsx
describe('EventCard touch ergonomics', () => {
  it('decision rows respond to tap AND to number keys identically', async () => {
    const onChoice = renderCard(
      baseEvent({ choices: [choice({ id: 'a', text: 'Option A' }), choice({ id: 'b', text: 'Option B' })] })
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /Option B/ }));
    expect(onChoice.mock.calls[0][0].id).toBe('b');

    fireEvent.keyDown(window, { key: '1' });
    expect(onChoice.mock.calls[1][0].id).toBe('a');
  });

  it('decision rows are ≥44px tap targets and keyboard hints are hidden on touch', () => {
    renderCard(baseEvent({ choices: [choice({ id: 'a', text: 'Option A' }), choice({ id: 'b', text: 'Option B' })] }));
    const row = screen.getByRole('button', { name: /Option A/ });
    expect(row.className).toContain('min-h-[44px]');
    // the keyboard-hint footer is marked touch:hidden (CSS hides it on coarse pointers)
    expect(screen.getByText(/\[Enter\] Auswählen/).className).toContain('touch:hidden');
  });
});
```

**Step 3.2 — run, fail:** `npm run test:client -- src/components/EventCard` — first new test passes already (clicks exist), second fails on `min-h-[44px]`.

**Step 3.3 — implementation.**

1. `client/tailwind.config.js` — add inside `theme.extend`:

```js
      screens: {
        // Touch-only devices (phones/tablets, no mouse). Enables `touch:` utilities
        // like `touch:hidden` for keyboard-hint chrome. Mirrors TOUCH_ONLY_QUERY.
        touch: { raw: '(hover: none) and (pointer: coarse)' },
      },
```

2. `EventCard` standard decision row (`:166`): change class to

```tsx
          className={`w-full text-left p-3 min-h-[44px] border transition-colors flex justify-between items-center active:bg-terminal-bg-highlight ${
```

   Story decision row (`:139`): append `min-h-[44px] active:bg-terminal-green/20` to the static part of the class string. Single-CTA button (`:110-113`): append `min-h-[44px]` to both `cta` variants (they're `p-3`/`py-3` ≈ 44 px already, the min-height makes it explicit).
3. `EventCard` hint footers — story (`:235`) and standard (`:264`): wrap the keyboard-hint span in `touch:hidden`, e.g. standard:

```tsx
      <div className="mt-4 pt-2 border-t border-terminal-border text-sm text-terminal-green-muted">
        <span className="touch:hidden">{cardKind === 'decision' ? `[1-${visibleChoices.length}] / [Enter] Auswählen   [S] Speichern` : '[Enter] Weiter   [S] Speichern'}</span>
      </div>
```

   (Same for the story footer's two spans at `:234-237`.)
4. `ScenarioCard:96`: `className="w-full text-left p-3 min-h-[44px] border border-terminal-border hover:bg-terminal-bg-highlight hover:border-terminal-green active:bg-terminal-bg-highlight transition-colors"`.
5. `ResultScreen` continue buttons — story (`:197`): label `Weiter <span className="touch:hidden">[Enter]</span>`; standard (`:264`): `<span className="touch:hidden">[ENTER] </span>Weiter`; both get `min-h-[44px] active:bg-terminal-bg-highlight` appended. (Keeps the literal `Weiter` text so `e2e/game.spec.ts` `button:has-text("Weiter")` still matches.) Same treatment for `ScenarioResultScreen:119-124`.
6. Learning CTAs in `ResultScreen:117-148`: append `min-h-[44px] active:bg-terminal-bg-highlight` to each of the three buttons.

**Step 3.4 — run, pass:** `npm run test:client -- src/components/EventCard src/components/ResultScreen` → all green (existing ResultScreen learning-CTA/nudge tests query by text, unaffected).

**Step 3.5 — commit:**
```bash
git add client/tailwind.config.js client/src/components/EventCard client/src/components/ScenarioCard client/src/components/ResultScreen client/src/components/ScenarioResultScreen
git commit -m "feat(mobile): touch: Tailwind variant, 44px tap targets + active states on cards and result screens" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Menus & modals — SaveLoadModal row tap, modal edge padding, hint cleanup

**Files:**
- Modify: `client/src/components/SaveLoadModal/index.tsx` (overlay `:140`, slot rows `:214-272`, footer `:278-288`)
- Modify: `client/src/components/GameModeSelectModal/index.tsx` (overlay `:41`, footer hint `:66-69`)
- Modify: `client/src/App.tsx` (menu wrapper `:439-440`, hint line `:504-506`)
- Test: `client/src/components/SaveLoadModal/SaveLoadModal.touch.browser.test.tsx` (create)

**Step 4.1 — failing test.** Create `client/src/components/SaveLoadModal/SaveLoadModal.touch.browser.test.tsx` (saves live in localStorage — `useSaveLoad.ts:36-46`, key `kritis_saves_<playerId>`):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInitialState } from '../../engine/gameState';
import { SaveLoadModal } from './index';

const PLAYER = 'p-test';

beforeEach(() => {
  localStorage.clear();
  const gameState = createInitialState('SEED', 'intermediate');
  localStorage.setItem(
    `kritis_saves_${PLAYER}`,
    JSON.stringify([{ id: `${PLAYER}-2`, slot: 2, current_week: 3, stress: 40, updated_at: new Date().toISOString(), gameState }])
  );
});

describe('SaveLoadModal — tap targets', () => {
  it('tapping anywhere on a filled slot row loads that slot', async () => {
    const onLoad = vi.fn();
    render(<SaveLoadModal mode="load" playerId={PLAYER} onLoad={onLoad} onClose={vi.fn()} />);

    // row text rendered by formatSaveSlot: "Woche 3 | Stress: 40% | …"
    const rowText = await screen.findByText(/Woche 3 \| Stress: 40%/);
    await userEvent.setup().click(rowText);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoad.mock.calls[0][0].currentWeek).toBe(3);
  });

  it('the delete button does NOT bubble into a load', async () => {
    const onLoad = vi.fn();
    render(<SaveLoadModal mode="load" playerId={PLAYER} onLoad={onLoad} onClose={vi.fn()} />);
    await screen.findByText(/Woche 3/);

    await userEvent.setup().click(screen.getByRole('button', { name: '×' }));
    expect(await screen.findByText(/wirklich löschen/)).toBeInTheDocument();
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('tapping an empty slot row in load mode does nothing', async () => {
    const onLoad = vi.fn();
    render(<SaveLoadModal mode="load" playerId={PLAYER} onLoad={onLoad} onClose={vi.fn()} />);
    await userEvent.setup().click(await screen.findByText(/— Leer —/));
    expect(onLoad).not.toHaveBeenCalled();
  });
});
```

**Step 4.2 — run, fail:** `npm run test:client -- src/components/SaveLoadModal` → first test fails (`onLoad` not called — rows have no onClick).

**Step 4.3 — implementation.** In `SaveLoadModal/index.tsx`:

1. Slot row `div` (`:214-222`): add an onClick and semantics:

```tsx
                    <div
                      key={slot}
                      role="button"
                      tabIndex={-1}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        if (loading) return;
                        if (mode === 'save') handleSave(slot);
                        else if (save) handleLoad(slot);
                      }}
                      className={`flex items-center gap-2 border p-2 min-h-[44px] transition-colors cursor-pointer active:bg-terminal-bg-highlight ${
                        isHighlighted
                          ? 'border-terminal-info bg-terminal-bg-highlight'
                          : 'border-terminal-border hover:border-terminal-info'
                      }`}
                    >
```

   (`tabIndex={-1}`: keyboard users already have the existing ↑↓/Enter handling at `:49-80`; don't create a second tab stop per row.)
2. The three inner action buttons (`:245`, `:253`, `:262`): change each `onClick` to stop propagation, e.g. `onClick={(e) => { e.stopPropagation(); handleSave(slot); }}` / `handleLoad(slot)` / `handleDelete(slot)`, and add `min-h-[36px]` + `px-3` (secondary controls inside an already-44px row).
3. Overlay (`:140`): `className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"` — same on `GameModeSelectModal:41`.
4. Footer hint spans: wrap `[↑↓] Navigieren …` in `touch:hidden` (`SaveLoadModal:279-281`, `GameModeSelectModal:67-69`).
5. `App.tsx` menu: `:439` wrapper → `className="min-h-screen flex items-center justify-center p-4"`; `:440` panel → `className="border border-terminal-border p-5 sm:p-8 text-center max-w-lg w-full"`; `:504-506` hint div gets `touch:hidden` added to its class.

**Step 4.4 — run, pass:** `npm run test:client -- src/components/SaveLoadModal src/components/GameModeSelectModal src/App` → all green (menu keyboard test `App.menuKeyboard.browser.test.tsx` unaffected — keyboard path untouched).

**Step 4.5 — commit:**
```bash
git add client/src/components/SaveLoadModal client/src/components/GameModeSelectModal client/src/App.tsx
git commit -m "feat(mobile): tappable save-slot rows, modal edge padding, touch-hidden keyboard hints" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Responsive sweep — summary/ending screens & story chrome (pure CSS)

**Files:**
- Modify: `client/src/components/RunSummaryScreen/index.tsx` (`:79` panel, `:91`/`:119`/`:136` grids)
- Modify: `client/src/components/EndingScreen/index.tsx` (`:64` panel)
- Modify: `client/src/App.tsx` (act-break panel `:657`)
- Modify: `client/src/components/GameScreen/index.tsx` (story stats strip `:140-149`, footer buttons `:293-306`, "no content" buttons `:216-221`/`:282-287`)
- Modify: `client/src/components/LearningHub/index.tsx` (level buttons `:107`, recommended CTA `:50`)

Checked and intentionally left alone: `ResultScreen:185/:235` and `ScenarioResultScreen:106` effect grids (`grid-cols-2` with short "Stress +10"-style items fits 360 px), `EventCard` story description `max-h-[35vh]` scroll, `TerminalUI/TicketMockup.tsx` `w-[…]` (terminal-only, desktop-only by Task 7).

**Step 5.1 — edits (no unit test; pure CSS — verified by screenshot below and the Task 9 no-horizontal-scroll e2e assertion):**

1. `RunSummaryScreen:79` → `className="border border-terminal-green/50 p-5 sm:p-8 max-w-2xl w-full"`; the three `grid grid-cols-2 gap-x-6 …` blocks (`:91`, `:119`, `:136`) → `grid grid-cols-1 sm:grid-cols-2 gap-x-6 …`. Retry button `:180-185` gets `min-h-[44px] active:bg-terminal-bg-highlight`.
2. `EndingScreen:64` → `p-5 sm:p-8`; back-to-menu button `:139-144` gets `min-h-[44px] active:bg-terminal-bg-highlight`.
3. `App.tsx:657` (act-break) → `p-5 sm:p-8`; its button `:679-684` gets `min-h-[44px]`.
4. `GameScreen` story stats strip `:140`: `className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-sm"` and `:144`: `gap-4` → `gap-3`.
5. `GameScreen` footer `:293`: add `flex-wrap gap-y-1`; the `[S] Speichern`/`[L] Laden` buttons (`:297`, `:302`) get `touch:border touch:border-terminal-border touch:px-3 touch:py-2` and their `[S] `/`[L] ` prefixes wrapped in `<span className="touch:hidden">…</span>`. Both "Nächster Tag" buttons (`:218`, `:284`): wrap `[ENTER] ` in `touch:hidden`, add `min-h-[44px]`.
6. `LearningHub:107` level button: `px-2 py-1` → `px-3 py-2 min-h-[44px]` + `active:bg-terminal-bg-highlight`; recommended CTA `:50` gets `min-h-[44px]`.

**Step 5.2 — guard existing suites:** `npm run test:client` and `npm test` → all green (text content unchanged; only classes).

**Step 5.3 — visual verification (Playwright screenshot, iPhone width):**

```bash
npm run dev &   # vite on :5173
sleep 3
npx playwright screenshot --viewport-size=390,844 http://localhost:5173 /tmp/claude/mobile-menu.png
npx playwright screenshot --viewport-size=360,640 http://localhost:5173 /tmp/claude/mobile-menu-360.png
kill %1
```

Read both PNGs: intro/menu must fill the width with padding, no clipped border, no horizontal scrollbar. (Deeper screens are asserted by the Task 9 e2e which drives real gameplay and checks `scrollWidth`.)

**Step 5.4 — commit:**
```bash
git add client/src/components/RunSummaryScreen client/src/components/EndingScreen client/src/components/GameScreen client/src/components/LearningHub client/src/App.tsx
git commit -m "feat(mobile): responsive layout for summary/ending/act-break screens and game chrome" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `useGame.skipTerminalTask` — complete hands-on content with no reward, no penalty

**Files:**
- Modify: `client/src/hooks/useGame.ts` (new callback after `closeTerminal` `:338`; extend `UseGameReturn` `:26-53` and the return object `:394-417`)
- Test: `client/src/hooks/useGame.skipTerminalTask.browser.test.tsx` (create)

Semantics (the whole point of this task): mark the event/scenario completed so free-play selectors don't re-serve it, advance the story beat / sidequest in story mode so the campaign can't soft-lock (beats only advance in `makeChoice` today, `useGame.ts:197`), apply **no** choice effects and **no** skill gain, then `advanceDay` + `checkGameOver` exactly like `skipToNextDay` (`useGame.ts:363-373`) — the day advance itself only *decays* stress (`gameState.ts:127-149`), so skipping can never push a player into burnout.

**Step 6.1 — failing test.** Create `client/src/hooks/useGame.skipTerminalTask.browser.test.tsx` (pattern mirrors `useGame.skillgain.browser.test.tsx`):

```tsx
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { GameEvent, EventChoice } from '@kritis/shared';
import { useGame } from './useGame';

const choice: EventChoice = {
  id: 'go',
  text: 'ran an die Kiste',
  effects: { skills: { linux: 5 }, budget: 500 },
  resultText: 'done',
  terminalCommand: 'top',
};

const event: GameEvent = {
  id: 'test_terminal_event',
  weekRange: [1, 12],
  probability: 1,
  category: 'training',
  involvedCharacters: [],
  title: 'T',
  description: 'T',
  choices: [choice],
  tags: [],
};

describe('useGame.skipTerminalTask — touch fallback skip', () => {
  it('completes the event and advances the day WITHOUT applying any effects', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'intermediate'));
    const before = result.current.state;

    act(() => result.current.setEvent(event));
    act(() => result.current.openTerminal(choice));
    expect(result.current.phase).toBe('terminal');

    act(() => result.current.skipTerminalTask());

    const after = result.current.state;
    expect(after.completedEvents).toContain('test_terminal_event');
    expect(after.currentDay).toBe(before.currentDay + 1);
    expect(after.skills.linux).toBe(before.skills.linux); // no skill gain
    expect(after.budget).toBe(before.budget);             // no choice effects
    expect(result.current.phase).toBe('playing');         // no result screen
    expect(result.current.currentEvent).toBeNull();
  });

  it('advances the story beat in story mode so the same beat is not re-served', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.startNewGame('SEED', 'story'));
    const beatsBefore = result.current.state.storyState!.totalBeatsCompleted;

    act(() => result.current.setEvent(event)); // id matches no sidequest → story-beat path
    act(() => result.current.openTerminal(choice));
    act(() => result.current.skipTerminalTask());

    expect(result.current.state.storyState!.totalBeatsCompleted).toBe(beatsBefore + 1);
  });
});
```

**Step 6.2 — run, fail:** `npm run test:client -- src/hooks/useGame.skipTerminalTask` → `result.current.skipTerminalTask is not a function`.

**Step 6.3 — implementation.** In `client/src/hooks/useGame.ts`:

1. Add `skipTerminalTask: () => void;` to `UseGameReturn` (after `closeTerminal` at `:48`).
2. After `closeTerminal` (`:338`), add:

```ts
  // Touch-only fallback: the player can't do a terminal/GUI task on this device.
  // Complete the content WITHOUT effects or skill gain (no reward, no penalty),
  // advance the day and return to 'playing'. Story beats / sidequests advance so
  // the campaign never soft-locks re-serving the same hands-on beat.
  const skipTerminalTask = useCallback(() => {
    setState((prev) => {
      const newState: GameState = { ...prev };

      if (currentEvent) {
        newState.completedEvents = [...prev.completedEvents, currentEvent.id];
        if (prev.isStoryMode && prev.storyState) {
          const sidequest = findSidequestByEvent(currentEvent.id);
          newState.storyState = sidequest
            ? advanceSidequest(prev, sidequest.id)
            : advanceStoryBeat(prev);
        }
      }
      if (currentScenario) {
        newState.completedScenarios = [...(prev.completedScenarios || []), currentScenario.id];
      }

      const advanced = advanceDay(newState);
      const gameOver = checkGameOver(advanced);
      if (gameOver.isOver) {
        setGameOverReason(gameOver.reason || null);
        setPhase('gameover');
      }
      return advanced;
    });

    setCurrentEvent(null);
    setCurrentScenario(null);
    setLastChoice(null);
    setLastScenarioChoice(null);
    setPendingTerminalChoice(null);
    setPendingScenarioTerminalChoice(null);
    if (phase !== 'gameover') {
      setPhase('playing'); // mirrors continueGame's phase handling (useGame.ts:351)
    }
  }, [currentEvent, currentScenario, phase]);
```

   (All imports — `findSidequestByEvent`, `advanceSidequest`, `advanceStoryBeat`, `advanceDay`, `checkGameOver` — already exist at `useGame.ts:3-22`.)
3. Add `skipTerminalTask,` to the returned object.

**Step 6.4 — run, pass:** `npm run test:client -- src/hooks/useGame` → new file 2 passed, existing `useGame.skillgain` tests untouched.

**Step 6.5 — commit:**
```bash
git add client/src/hooks/useGame.ts client/src/hooks/useGame.skipTerminalTask.browser.test.tsx
git commit -m "feat(mobile): useGame.skipTerminalTask — complete hands-on content with no reward, no penalty" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Touch fallback card for terminal/GUI levels (GameScreen + App wiring)

**Files:**
- Create: `client/src/components/TouchTaskFallback/index.tsx`
- Modify: `client/src/components/GameScreen/index.tsx` (props `:17-37`, terminal branch `:93-130`)
- Modify: `client/src/App.tsx` (GameScreen props `:783-817`)
- Test: `client/src/components/GameScreen/GameScreen.touchFallback.browser.test.tsx` (create)

**Step 7.1 — failing test.** Create `client/src/components/GameScreen/GameScreen.touchFallback.browser.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameEvent, TerminalContext } from '@kritis/shared';
import { createInitialState } from '../../engine/gameState';
import { TOUCH_ONLY_QUERY } from '../../hooks/useViewport';
import { GameScreen } from './index';

// Never mount real xterm/Fluent in jsdom.
vi.mock('../Terminal', () => ({ Terminal: () => <div data-testid="real-terminal" /> }));
vi.mock('../WindowsLevel', () => ({ WindowsLevel: () => <div data-testid="real-gui" /> }));

const stubPointer = (touchOnly: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: touchOnly && query === TOUCH_ONLY_QUERY,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => vi.unstubAllGlobals());

const terminalContext: TerminalContext = {
  type: 'linux',
  hostname: 'srv01',
  username: 'admin',
  currentPath: '/home/admin',
  commands: [],
  solutions: [],
  hints: [],
};

const event: GameEvent = {
  id: 'ev_term',
  weekRange: [1, 12],
  probability: 1,
  category: 'training',
  involvedCharacters: [],
  title: 'Serverproblem',
  description: 'T',
  choices: [],
  tags: [],
  terminalContext,
};

const renderTerminalPhase = (over: Partial<Parameters<typeof GameScreen>[0]> = {}) => {
  const onTerminalSkip = vi.fn();
  const onTerminalCancel = vi.fn();
  render(
    <GameScreen
      state={createInitialState('SEED', 'intermediate')}
      phase="terminal"
      contentType="event"
      currentEvent={event}
      currentScenario={null}
      lastChoice={null}
      lastScenarioChoice={null}
      characters={{}}
      onChoice={vi.fn()}
      onScenarioChoice={vi.fn()}
      onContinue={vi.fn()}
      onTerminalSolved={vi.fn()}
      onTerminalCancel={onTerminalCancel}
      onTerminalSkip={onTerminalSkip}
      {...over}
    />
  );
  return { onTerminalSkip, onTerminalCancel };
};

describe('GameScreen — terminal phase on touch-only devices', () => {
  it('shows the German fallback card instead of the terminal, skip + back work', async () => {
    stubPointer(true);
    const { onTerminalSkip, onTerminalCancel } = renderTerminalPhase();

    expect(await screen.findByText(/Desktop-Arbeitsplatz/)).toBeInTheDocument();
    expect(screen.queryByTestId('real-terminal')).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /LIEGEN LASSEN/ }));
    expect(onTerminalSkip).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Zurück zur Auswahl/ }));
    expect(onTerminalCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the real terminal on non-touch devices', async () => {
    stubPointer(false);
    renderTerminalPhase();
    expect(await screen.findByTestId('real-terminal')).toBeInTheDocument();
    expect(screen.queryByText(/Desktop-Arbeitsplatz/)).toBeNull();
  });
});
```

**Step 7.2 — run, fail:** `npm run test:client -- src/components/GameScreen` → TS error: `onTerminalSkip` is not a GameScreen prop / fallback text not found.

**Step 7.3 — implementation.**

1. Create `client/src/components/TouchTaskFallback/index.tsx`:

```tsx
// In-fiction notice shown when a terminal/Windows level would render on a
// touch-only device. The player skips the task: no reward, no penalty.
interface TouchTaskFallbackProps {
  kind: 'terminal' | 'gui';
  onSkip: () => void;
  onBack: () => void;
}

export function TouchTaskFallback({ kind, onSkip, onBack }: TouchTaskFallbackProps) {
  return (
    <div className="border border-terminal-border p-5 max-w-lg mx-auto space-y-4">
      <div className="text-terminal-warning text-lg text-center">⌨ Falsches Werkzeug</div>
      <p className="text-terminal-green-dim leading-relaxed">
        {kind === 'gui'
          ? 'Dafür brauchst du Maus und Tastatur — die Windows-Konsole bedienst du am Desktop-Arbeitsplatz.'
          : 'Dafür brauchst du die richtige Tastatur — das erledigst du am Desktop-Arbeitsplatz.'}
      </p>
      <p className="text-terminal-green-muted text-sm">
        Unterwegs kannst du die Aufgabe liegen lassen: kein Skill-Gewinn, aber auch keine
        Strafe. Am Desktop spielst du solche Aufgaben komplett.
      </p>
      <button
        onClick={onSkip}
        className="w-full min-h-[44px] p-3 border border-terminal-green hover:bg-terminal-bg-highlight active:bg-terminal-bg-highlight"
      >
        [ AUFGABE LIEGEN LASSEN — NÄCHSTER TAG ]
      </button>
      <button
        onClick={onBack}
        className="w-full min-h-[44px] p-2 border border-terminal-border text-terminal-green-dim hover:border-terminal-green active:bg-terminal-bg-highlight text-sm"
      >
        Zurück zur Auswahl
      </button>
    </div>
  );
}
```

2. `GameScreen/index.tsx`: import `{ useIsTouchOnly }` from `../../hooks/useViewport` and `{ TouchTaskFallback }` from `../TouchTaskFallback`; add `onTerminalSkip: () => void;` to `GameScreenProps` (after `onTerminalCancel` `:30`) and destructure it; add `const isTouchOnly = useIsTouchOnly();` at the top of the component (`:58`); in the terminal branch replace the `<Suspense>` block's contents selection (`:100-126`) with:

```tsx
        <div className="flex-1">
          {isTouchOnly ? (
            <TouchTaskFallback
              kind={guiContext ? 'gui' : 'terminal'}
              onSkip={onTerminalSkip}
              onBack={onTerminalCancel}
            />
          ) : (
            <Suspense
              fallback={
                <div className="border border-terminal-border p-4 text-center">
                  <div className="text-terminal-green animate-pulse">Wird geladen...</div>
                </div>
              }
            >
              {/* …existing WindowsLevel / Terminal JSX unchanged… */}
            </Suspense>
          )}
        </div>
```

3. `App.tsx:813-814`: next to `onTerminalSolved`/`onTerminalCancel`, add `onTerminalSkip={game.skipTerminalTask}`.

**Step 7.4 — run, pass:** `npm run test:client -- src/components/GameScreen` → `2 passed`. Then the full suites: `npm run test:client` and `npm test` (App-level tests pass `onTerminalSkip` implicitly through the real `useGame`).

**Step 7.5 — commit:**
```bash
git add client/src/components/TouchTaskFallback client/src/components/GameScreen client/src/App.tsx
git commit -m "feat(mobile): in-fiction touch fallback for terminal/GUI levels with penalty-free skip" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Learning hub — mode-level touch notice (no per-level fallback loop)

**Files:**
- Modify: `client/src/components/LearningHub/index.tsx` (`:39-55` CTA, `:96-114` clickable guard)
- Test: `client/src/components/LearningHub/index.touch.browser.test.tsx` (create)

Learning mode is `cliOnly` (`App.tsx:283-290, :723`) — every lesson is a terminal/GUI level, so bouncing players through the Task-7 fallback per level would be pure frustration. Instead the hub itself says once: this mode is desktop-only; progress remains viewable. (Existing hub tests keep passing: the jsdom `matchMedia` shim defaults to desktop.)

**Step 8.1 — failing test.** Create `client/src/components/LearningHub/index.touch.browser.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../engine/gameState';
import { TOUCH_ONLY_QUERY } from '../../hooks/useViewport';
import { LearningHub } from './index';

const stubPointer = (touchOnly: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: touchOnly && query === TOUCH_ONLY_QUERY,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => vi.unstubAllGlobals());

describe('LearningHub on touch-only devices', () => {
  it('shows a desktop notice and does not offer launchable lessons', () => {
    stubPointer(true);
    render(<LearningHub state={createInitialState('SEED', 'learning')} onPick={vi.fn()} />);

    expect(screen.getByText(/Desktop empfohlen/)).toBeInTheDocument();
    expect(screen.queryByText('Nächste empfohlene Lektion')).toBeNull();
    // no level row is rendered as a button (they become static rows)
    expect(screen.queryByRole('button', { name: /▶/ })).toBeNull();
  });

  it('desktop is unchanged: no notice, recommended CTA present', () => {
    stubPointer(false);
    render(<LearningHub state={createInitialState('SEED', 'learning')} onPick={vi.fn()} />);
    expect(screen.queryByText(/Desktop empfohlen/)).toBeNull();
    expect(screen.getByText('Nächste empfohlene Lektion')).toBeInTheDocument();
  });
});
```

**Step 8.2 — run, fail:** `npm run test:client -- src/components/LearningHub` → notice text not found.

**Step 8.3 — implementation.** In `LearningHub/index.tsx`:

1. `import { useIsTouchOnly } from '../../hooks/useViewport';` and in the component: `const isTouchOnly = useIsTouchOnly();`
2. After the `<h1>` (`:45`), add:

```tsx
      {isTouchOnly && (
        <div className="border border-terminal-warning/60 p-3 text-sm text-terminal-green-dim">
          <div className="text-terminal-warning mb-1">⌨ Desktop empfohlen</div>
          Die Lektionen laufen in einem echten Terminal bzw. einer Windows-Oberfläche —
          dafür brauchst du Maus und Tastatur. Deinen Fortschritt siehst du hier trotzdem;
          für die Übungen setz dich an den Desktop-Arbeitsplatz.
        </div>
      )}
```

3. Gate the CTA (`:47`): `{recommended && !isTouchOnly && ( … )}`.
4. Gate launchability (`:96-97`): `const clickable = (level.state === 'next' || level.state === 'advanced') && !isLocked && !isTouchOnly;` (non-clickable levels already render as static `<li>` rows at `:116-121`).

**Step 8.4 — run, pass:** `npm run test:client -- src/components/LearningHub src/App.learningHub` → all green.

**Step 8.5 — commit:**
```bash
git add client/src/components/LearningHub
git commit -m "feat(mobile): learning hub shows desktop-only notice on touch devices" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Mobile Playwright project + e2e spec

**Files:**
- Modify: `playwright.config.ts` (`projects` `:16-21`)
- Create: `e2e/mobile.spec.ts`

**Step 9.1 — config.** In `playwright.config.ts`, replace the `projects` array:

```ts
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // iPhone viewport emulated in Chromium — no webkit install needed.
      // 390x844, touch + mobile UA → `(pointer: coarse)` media queries match.
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
```

**Step 9.2 — spec.** Create `e2e/mobile.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

// Runs only in the mobile-chromium project (iPhone 13 viewport, touch enabled).
// All interaction via tap() — this suite proves the game is playable without
// a keyboard.

async function tapThroughIntroToMenu(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('text=KLICKEN ODER ENTER ZUM STARTEN', { timeout: 5000 });
  await page.tap('text=KLICKEN ODER ENTER ZUM STARTEN');
  await expect(page.locator('text=NEUES SPIEL STARTEN')).toBeVisible({ timeout: 5000 });
}

test.describe('Mobile card mode', () => {
  test('menu → mode select → choice → result → next day, all by tap, no horizontal scroll', async ({ page }) => {
    await tapThroughIntroToMenu(page);

    await page.tap('text=NEUES SPIEL STARTEN');
    await page.locator('div.cursor-pointer').filter({ hasText: 'Einsteiger' }).tap();

    // Stats bar week indicator proves the game started.
    await expect(page.getByText(/Woche 1\/\d+ \|/)).toBeVisible({ timeout: 5000 });

    // The event screen must not scroll horizontally at 390px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Tap the first choice. It either resolves directly (result screen) or is a
    // hands-on choice → the touch fallback card appears instead of xterm.
    await page.locator('button:has-text("[")').first().tap();
    const result = page.getByText('ENTSCHEIDUNG GETROFFEN');
    const fallback = page.getByText('Desktop-Arbeitsplatz');
    await expect(result.or(fallback).first()).toBeVisible({ timeout: 5000 });

    if (await fallback.isVisible().catch(() => false)) {
      // Skip advances to the next day without a result screen.
      await page.getByRole('button', { name: /LIEGEN LASSEN/ }).tap();
    } else {
      await page.getByRole('button', { name: /Weiter/ }).first().tap();
    }

    // Still alive on the next day / next event.
    await expect(page.getByText(/Woche \d+\/\d+ \|/)).toBeVisible({ timeout: 5000 });
  });

  test('terminal/GUI choice on touch shows the German fallback and skip advances the day', async ({ page }) => {
    await tapThroughIntroToMenu(page);
    await page.tap('text=NEUES SPIEL STARTEN');
    await page.locator('div.cursor-pointer').filter({ hasText: 'Einsteiger' }).tap();
    await expect(page.getByText(/Woche 1\/\d+ \|/)).toBeVisible({ timeout: 5000 });

    // Free-play content is seeded randomly per run: hunt a hands-on action for a
    // bounded number of days (pattern as in game.spec.ts terminal tests).
    let foundHandsOn = false;
    for (let i = 0; i < 15 && !foundHandsOn; i++) {
      await page.waitForTimeout(400);

      // Hands-on affordances: single-CTA "Aufgabe starten" or a ">"-prefixed choice.
      const handsOn = page
        .getByRole('button', { name: /Aufgabe starten/ })
        .or(page.locator('button:has-text("[")').filter({ has: page.locator('span.text-terminal-info') }))
        .first();

      if (await handsOn.isVisible({ timeout: 300 }).catch(() => false)) {
        await handsOn.tap();
        // Fallback card MUST appear instead of xterm on a touch device.
        await expect(page.getByText('Desktop-Arbeitsplatz')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('.xterm')).toHaveCount(0);

        await page.getByRole('button', { name: /LIEGEN LASSEN/ }).tap();
        await expect(page.getByText(/Woche \d+\/\d+ \|/)).toBeVisible({ timeout: 3000 });
        foundHandsOn = true;
        break;
      }

      // Otherwise resolve the day normally.
      const anyChoice = page.locator('button:has-text("[")').first();
      if (await anyChoice.isVisible({ timeout: 300 }).catch(() => false)) {
        await anyChoice.tap();
        const weiter = page.getByRole('button', { name: /Weiter/ }).first();
        if (await weiter.isVisible({ timeout: 1000 }).catch(() => false)) {
          await weiter.tap();
        }
      }
    }
    test.skip(!foundHandsOn, 'No hands-on event served in 15 days for this seed — covered by GameScreen unit tests');
  });

  test('learning mode shows the desktop-only notice at the hub', async ({ page }) => {
    await tapThroughIntroToMenu(page);
    await page.tap('text=LERNMODUS');

    await expect(page.getByText('Lernpfad')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Desktop empfohlen')).toBeVisible();
    await expect(page.getByText('Nächste empfohlene Lektion')).toHaveCount(0);
  });
});
```

**Step 9.3 — run, watch it fail first** (before Task 7/8 are merged this spec cannot pass; since tasks land in order it should pass now — run it to verify):
`npm run test:e2e -- --project=mobile-chromium`
Expected: `3 passed` (or `2 passed, 1 skipped` if the hands-on hunt exhausts its 15-day budget — acceptable, the fallback rendering itself is pinned by the Task 7 unit tests). If the result-screen `Weiter` tap is intercepted by an overlay, this is the **known pre-existing flake** documented at `e2e/game.spec.ts:99-103` — retry with `.tap({ force: true })` on that single action and leave a comment referencing the quarantine note.

**Step 9.4 — full regression:** `npm run test:e2e` (desktop project must be untouched: `testIgnore` keeps it off the mobile spec) and `npm test && npm run test:client`.

**Step 9.5 — commit:**
```bash
git add playwright.config.ts e2e/mobile.spec.ts
git commit -m "test(mobile): iPhone-viewport Playwright project — tap-only playthrough, fallback + hub notice" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Out of scope (explicitly)

- Making xterm/Fluent GUI levels touch-usable (on-screen keyboard, gestures) — desktop-only by design.
- Converting `GameModeSelectModal` cards to `<button>` (breaks existing e2e selectors) or any keyboard-handling refactor.
- `TerminalUI/TicketMockup.tsx` fixed widths (renders only inside terminal levels → behind the fallback on touch).
- PWA/orientation lock/safe-area insets — revisit only if real-device testing shows a need.

## Final verification checklist

1. `npm test` — node suite green.
2. `npm run test:client` — jsdom suite green (incl. 6 new test files + extended EventCard suite).
3. `npm run test:e2e` — desktop project green (unchanged behavior), mobile project green.
4. Screenshot pass at 360 px and 390 px (Task 5 commands) — no horizontal scroll, no clipped panels.
5. Manual sanity on desktop: menu arrows/Enter, event 1-9/Enter, `S`/`L`, terminal Esc — all identical to before.
