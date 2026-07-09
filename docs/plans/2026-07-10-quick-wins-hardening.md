# Quick-Wins Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Four independent robustness quick wins: extract the legal operator data into a config module (with an owner-input step), add a top-level React error boundary, introduce ESLint (flat config + CI step), and de-flake the five WindowsLevel browser test suites by removing their real-time dependence.

**Architecture:** Four self-contained task groups (A: Tasks 1–2, B: Task 3, C: Tasks 4–5, D: Tasks 6–8), each ending in a green, committed state — they can be executed in any order and independently. No group changes game behavior: group A is a data extraction, group B wraps the existing root render, group C is tooling only (plus five mechanical `--fix` edits), group D rewires tests onto vitest fake timers around the existing `SOLVE_DELAY_MS = 1600` success-animation timer.

**Tech Stack:** TypeScript 5.9 (strict), React 18, Vite 5, Tailwind (terminal theme tokens), Vitest 4 (two configs: root = node env, `client/vitest.config.ts` = jsdom), @testing-library/react 16 + user-event 14, ESLint 10 flat config + typescript-eslint 8 (recommended, non-type-checked), GitHub Actions.

---

## Conventions (verified against the repo)

- **Monorepo:** npm workspaces `client`, `server`, `shared`. Root scripts in `package.json:9-19`.
- **Two vitest runs:**
  - Node run: `npm test` → root `vitest.config.ts` (env `node`, includes `**/*.test.ts(x)`, **excludes `**/*.browser.test.tsx`**).
  - jsdom run: `npm run test:client` → `client/vitest.config.ts` (env `jsdom`, setup `client/src/test/setup.ts`, aliases `@kritis/shared` → `../shared/src`).
  - **Any test that touches the DOM must be named `*.browser.test.tsx`**, otherwise the node run picks it up and fails.
  - Single file / filter: `npx vitest run --root client --config vitest.config.ts <path-or-fragment>` (no shared build needed — the alias resolves to shared *source*). `npm run test:client -- <fragment>` also works but rebuilds shared first.
- **Baseline (verified 2026-07-10, local):** `npm run test:client` → 70 files, **703 passed | 2 expected fail** (the two `it.fails` LegalPages guards), ~26 s.
- **Commits:** conventional style with scope, lowercase (repo examples: `fix(shell): …`, `feat(terminal): …`, `test(content): …`). Trailer on every commit:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **Player-facing strings:** German, informal du-form, terminal aesthetic with `[ BRACKET ]` buttons (menu: `[ WEITER SPIELEN ]`, `[ NEUES SPIEL STARTEN ]` in `client/src/App.tsx:460,476`).
- Work on `main` is fine for these (repo history merges small feature branches; if you prefer, branch per group: `chore/legal-config`, `feat/error-boundary`, `chore/eslint`, `test/windowslevel-fake-timers`).

---

# Group A — Legal pages: operator data as a config module

**Current state (verified):** `client/src/components/LegalPages/index.tsx:12-20` exports `LEGAL_OWNER` with `TODO …` placeholder strings; `:23-25` derives `LEGAL_DATA_IS_PLACEHOLDER` (any value containing `TODO`), which gates warning banners at `:94-98` and `:195-199`. The guard test `client/src/components/LegalPages/LegalPages.browser.test.tsx:27,31` is deliberately `it.fails` until real data lands. Nothing outside `client/src/components/LegalPages/` imports `LEGAL_OWNER` or `LEGAL_DATA_IS_PLACEHOLDER` (verified by grep), so the move is contained.

**Decision:** plain config module, **no** `VITE_*` env vars. Verified: the repo has zero `.env*` files and the only `import.meta.env` usage is `import.meta.env.DEV` (`client/src/App.tsx:42,421`) — a build-time env-var indirection would introduce a new idiom for five constant strings (YAGNI). A pure module also stays testable in the *node* vitest run.

### Task 1: Extract `LEGAL_OWNER` into `client/src/config/legal.ts`

**Files:**
- Create: `client/src/config/legal.ts` (new directory `client/src/config/` — does not exist yet)
- Create: `client/src/config/legal.test.ts` (plain `.test.ts`: pure data, no DOM → runs in the node suite)
- Modify: `client/src/components/LegalPages/index.tsx:1-25` (delete the moved block, import instead)

**Step 1.1: Write the failing test**

```ts
// client/src/config/legal.test.ts
import { describe, it, expect } from 'vitest';
import { LEGAL_OWNER, LEGAL_DATA_IS_PLACEHOLDER, hasLegalPlaceholders } from './legal';

describe('legal owner config', () => {
  it('detects TODO placeholders in any field', () => {
    expect(
      hasLegalPlaceholders({
        name: 'TODO Vorname Nachname',
        street: 'Musterweg 1',
        city: '12345 Musterstadt',
        country: 'Deutschland',
        email: 'kontakt@betreiber.example',
        phone: '',
      }),
    ).toBe(true);
  });

  it('accepts fully filled data (fixture, never shipped)', () => {
    expect(
      hasLegalPlaceholders({
        name: 'Erika Mustermann',
        street: 'Musterweg 1',
        city: '12345 Musterstadt',
        country: 'Deutschland',
        email: 'kontakt@betreiber.example',
        phone: '', // optional — empty is a valid final state
      }),
    ).toBe(false);
  });

  it('derives the shipped flag from the shipped data (stays consistent either way)', () => {
    expect(LEGAL_DATA_IS_PLACEHOLDER).toBe(hasLegalPlaceholders(LEGAL_OWNER));
  });
});
```

> Note the third test asserts *consistency*, not `true` — it keeps passing after the owner fills real data in Task 2.

**Step 1.2: Run it and see it fail**

Run: `npx vitest run client/src/config/legal.test.ts`
Expected: FAIL — `Cannot find module './legal'` (or "Failed to load"): the module doesn't exist yet.

**Step 1.3: Create the config module (data moved verbatim — placeholders stay placeholders)**

```ts
// client/src/config/legal.ts
// ═════════════════════════════════════════════════════════════════════
// ⚠️  BETREIBER-DATEN — VOR PRODUKTIV-DEPLOYMENT AUSFÜLLEN!  ⚠️
// Pflichtangaben nach § 5 TMG (Impressum) und Art. 13 DSGVO
// (Verantwortliche Stelle). Solange hier TODO-Platzhalter stehen, ist
// die Seite NICHT rechtskonform. Der Guard-Test in
// components/LegalPages/LegalPages.browser.test.tsx ist deshalb als
// `it.fails` markiert — nach dem Eintragen echter Daten dort
// `it.fails` → `it` umstellen, damit er dauerhaft wacht.
// ═════════════════════════════════════════════════════════════════════

export interface LegalOwner {
  name: string;
  street: string;
  city: string;
  country: string;
  email: string;
  /** Nach § 5 TMG optional — auf '' setzen, um die Zeile auszublenden. */
  phone: string;
}

export const LEGAL_OWNER: LegalOwner = {
  name: 'TODO Vorname Nachname',
  street: 'TODO Straße Hausnummer',
  city: 'TODO PLZ Ort',
  country: 'Deutschland',
  email: 'TODO ihre-email@example.com',
  phone: 'TODO +49 XXX XXXXXXX',
};

/** True solange irgendein Feld noch einen TODO-Platzhalter trägt. */
export function hasLegalPlaceholders(owner: LegalOwner): boolean {
  return Object.values(owner).some((v) => v.includes('TODO'));
}

export const LEGAL_DATA_IS_PLACEHOLDER = hasLegalPlaceholders(LEGAL_OWNER);
```

**Step 1.4: Run the test and see it pass**

Run: `npx vitest run client/src/config/legal.test.ts`
Expected: 3 passed.

**Step 1.5: Rewire `LegalPages` to the config module**

In `client/src/components/LegalPages/index.tsx`, replace lines 1–25 (everything from the file-path comment through the `LEGAL_DATA_IS_PLACEHOLDER` export, i.e. up to and including the line `);` before `interface LegalPagesProps`) with:

```tsx
// client/src/components/LegalPages/index.tsx
import { useState } from 'react';
import { LEGAL_OWNER, LEGAL_DATA_IS_PLACEHOLDER } from '../../config/legal';
```

The rest of the file (from `interface LegalPagesProps {`) is unchanged — the JSX keeps reading `LEGAL_OWNER.name` etc. and the `LEGAL_DATA_IS_PLACEHOLDER` banners at (previously) lines 94 and 195 keep working.

**Step 1.6: Verify — guard still guards, nothing else broke**

Run: `npx tsc --noEmit -p client/tsconfig.json`
Expected: exit 0.

Run: `npx vitest run --root client --config vitest.config.ts src/components/LegalPages`
Expected: `2 expected fail` — the `it.fails` guards still "fail as expected" because the TODO data still renders (i.e. the guard mechanism survived the extraction).

Run: `npm test`
Expected: all node-suite tests pass, now including `client/src/config/legal.test.ts`.

**Step 1.7: Commit**

```bash
git add client/src/config/legal.ts client/src/config/legal.test.ts client/src/components/LegalPages/index.tsx
git commit -m "refactor(legal): extract operator data into config module

Betreiber-Daten (Impressum/Datenschutz) live in client/src/config/legal.ts
now; placeholder guard logic is a pure, tested function. TODO values are
intentionally kept — filling them is the owner's step.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 2: ⚠️ USER INPUT REQUIRED — fill in the real operator data

> **STOP: This task cannot be executed autonomously.** The plan and the executor must NOT invent legal data (§ 5 TMG / Art. 13 DSGVO — real name, address, email of the site operator). Ask the repo owner for the values and only proceed when they are provided. If the owner is unavailable, skip this task and leave a clearly-visible note in the final report; everything else in this plan is unaffected.

**Files:**
- Modify: `client/src/config/legal.ts` (the six `LEGAL_OWNER` values)
- Modify: `client/src/components/LegalPages/LegalPages.browser.test.tsx:27,31` (`it.fails` → `it`)

**Step 2.1: Collect from the owner (verbatim, no guessing):**
- Vor- und Nachname des Betreibers
- Straße + Hausnummer
- PLZ + Ort
- E-Mail-Adresse
- Telefonnummer (optional — `''` blendet die Zeile aus; darf kein `XXX` enthalten, der Guard prüft darauf)

**Step 2.2: Enter the data** in `client/src/config/legal.ts` `LEGAL_OWNER`. No field may still contain `TODO`, `XXX`, or `example.com` (the guard test's placeholder patterns, see `LegalPages.browser.test.tsx:19-24`).

**Step 2.3: Arm the guard permanently.** In `client/src/components/LegalPages/LegalPages.browser.test.tsx` change both specs (lines 27 and 31) from `it.fails(` to `it(`. (With real data the `it.fails` specs would start *erroring* — "expected to fail" — so this flip is mandatory, not optional.)

**Step 2.4: Verify**

Run: `npx vitest run --root client --config vitest.config.ts src/components/LegalPages src/config/legal.test.ts`
Expected: all pass, `0 expected fail`. (The consistency spec from Task 1 now sees `LEGAL_DATA_IS_PLACEHOLDER === false` — still green.)

Run: `npm run test:client`
Expected: all files pass; the suite summary no longer reports expected-fail tests.

**Step 2.5: Commit**

```bash
git add client/src/config/legal.ts client/src/components/LegalPages/LegalPages.browser.test.tsx
git commit -m "chore(legal): fill real operator data, arm placeholder guard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

# Group B — Top-level React error boundary

**Current state (verified):** zero error boundaries in `client/src` (no `componentDidCatch`/`getDerivedStateFromError` anywhere). The root render is `client/src/main.tsx:6-10`: `ReactDOM.createRoot(...).render(<React.StrictMode><App /></React.StrictMode>)`. One render throw blanks the page. The autosave-is-safe hint is truthful: `client/src/hooks/useAutosave.ts` writes `kritis_autosave_<playerId>` to localStorage on every transition and the menu offers `[ WEITER SPIELEN ]` (`client/src/App.tsx:460`) — a crash + reload loses at most the in-flight event, not the run.

### Task 3: `ErrorBoundary` component wrapping the app root

**Files:**
- Create: `client/src/components/ErrorBoundary/index.tsx`
- Create: `client/src/components/ErrorBoundary/ErrorBoundary.browser.test.tsx` (**must** use the `.browser.test.tsx` suffix — it renders DOM)
- Modify: `client/src/main.tsx:1-10`

**Step 3.1: Write the failing test**

```tsx
// client/src/components/ErrorBoundary/ErrorBoundary.browser.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './index';

function Bomb(): never {
  throw new Error('Kaboom');
}

// React logs caught render errors via console.error — keep test output clean.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>alles gut</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('alles gut')).toBeInTheDocument();
  });

  it('shows the German fallback instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Etwas ist schiefgelaufen/i)).toBeInTheDocument();
    // Autosave reassurance + the thrown message for bug reports.
    expect(screen.getByText(/Spielstand wird automatisch gesichert/i)).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });

  it('offers a reload button that triggers the reload callback', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <ErrorBoundary onReload={onReload}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /neu laden/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
```

> Why the `onReload` prop: jsdom does not implement navigation, so `window.location.reload` cannot be spied on reliably (`Location` members are unforgeable). Injecting the callback (default: real reload) keeps the test simple and the production path one line.

**Step 3.2: Run it and see it fail**

Run: `npx vitest run --root client --config vitest.config.ts src/components/ErrorBoundary`
Expected: FAIL — `Cannot find module './index'` (component doesn't exist yet).

**Step 3.3: Minimal implementation**

```tsx
// client/src/components/ErrorBoundary/index.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Injectable for tests; defaults to a full page reload. */
  onReload?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary: a render/lifecycle throw anywhere below shows a
 * terminal-styled German fallback instead of a blank page. Reloading is safe:
 * useAutosave persists the run to localStorage (kritis_autosave_<playerId>)
 * on every transition, and the menu offers [ WEITER SPIELEN ].
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only — this app deliberately has no error telemetry.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error === null) return this.props.children;

    const reload = this.props.onReload ?? (() => window.location.reload());
    return (
      <div className="min-h-screen bg-terminal-bg text-terminal-green font-mono flex items-center justify-center p-4">
        <div className="border border-terminal-border max-w-xl w-full p-6 space-y-4">
          <h1 className="text-xl text-terminal-danger">✗ Etwas ist schiefgelaufen</h1>
          <p className="text-terminal-green-dim">
            Ein unerwarteter Fehler hat das Spiel unterbrochen. Keine Sorge:
            Dein Spielstand wird automatisch gesichert — nach dem Neuladen
            kannst du im Menü einfach weiterspielen.
          </p>
          <pre className="text-terminal-green-dim text-xs whitespace-pre-wrap overflow-x-auto border border-terminal-border p-2">
            {this.state.error.message}
          </pre>
          <button
            onClick={reload}
            className="border border-terminal-green px-3 py-1 hover:bg-terminal-green hover:text-terminal-bg"
          >
            [ NEU LADEN ]
          </button>
        </div>
      </div>
    );
  }
}
```

(The Tailwind tokens `terminal-bg`, `terminal-border`, `terminal-green`, `terminal-green-dim`, `terminal-danger` are the theme classes used throughout, e.g. `LegalPages/index.tsx:36-46`; the `[ … ]` button matches the menu style at `App.tsx:460`.)

**Step 3.4: Run the test and see it pass**

Run: `npx vitest run --root client --config vitest.config.ts src/components/ErrorBoundary`
Expected: 3 passed.

**Step 3.5: Wrap the app root**

Replace the render call in `client/src/main.tsx` (currently lines 6–10) so the whole file reads:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Step 3.6: Verify build + suite**

Run: `npx tsc --noEmit -p client/tsconfig.json`
Expected: exit 0.

Run: `npm run test:client`
Expected: all files pass (71 files now; still `2 expected fail` if Task 2 hasn't run).

Optional smoke test: `npm run dev`, open the app, confirm it renders normally (the boundary is invisible unless something throws).

**Step 3.7: Commit**

```bash
git add client/src/components/ErrorBoundary client/src/main.tsx
git commit -m "feat(client): top-level error boundary with German fallback

A render throw no longer blanks the SPA: terminal-styled fallback with
[ NEU LADEN ] and a truthful autosave-is-safe hint (useAutosave persists
to localStorage on every transition).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

# Group C — ESLint (flat config, minimal ruleset, CI)

**Current state (verified):** no ESLint config or dependency anywhere (`find . -name "eslint*"` outside node_modules: empty; no `lint` script in any package.json). `npm install -D eslint @eslint/js typescript-eslint` today resolves to **eslint 10.6.0 / @eslint/js 10.0.1 / typescript-eslint 8.63.0** — flat config, same format as ESLint 9, and typescript-eslint 8.63 works with the repo's TS 5.9.3. eslint 10 requires Node `^20.19.0 || ^22.13.0 || >=24` — CI's `node-version: 20` (latest 20.x) and local Node 26 both qualify.

**First-run reality (verified by actually linting this repo):** `js.configs.recommended` + `tseslint.configs.recommended` over `client/src server/src shared/src` yields **89 problems**: `@typescript-eslint/no-unused-vars` ×69 (35 of them `_`-prefixed intentionals), `prefer-const` ×5 (all auto-fixable), `no-useless-assignment` ×5, `no-control-regex` ×5 (all legitimate ANSI/control-char regexes — this is a terminal game), `no-case-declarations` ×2, unused `eslint-disable` directives ×3. The config below downgrades accordingly (verified: leaves exactly 5 auto-fixable `prefer-const` errors + ~45 warnings).

### Task 4: Flat config + root `lint` script + first-run cleanup

**Files:**
- Create: `eslint.config.mjs` (repo root; `.mjs` because the root `package.json` has no `"type": "module"`)
- Modify: `package.json:9-19` (add `lint` script; devDeps via `npm install`)
- Modified by `--fix` (5 files, one `let`→`const` each): `client/src/engine/chainFlowDensity.test.ts:115`, `client/src/engine/shell/commands/linux/extended.ts:310`, `client/src/engine/shell/commands/linux/system.ts:348`, `client/src/engine/shell/commands/linux/textproc.ts:679`, `client/src/engine/shell/commands/powershell/index.ts:1213` — plus removal of 3 stale `eslint-disable` comments (`client/src/engine/chainEngine.ts:63`, `client/src/engine/chainFlowDensity.test.ts:144`, `client/src/engine/chainPacingAudit.test.ts:105`).

**Step 4.1: Install (root workspace)**

Run: `npm install --save-dev eslint @eslint/js typescript-eslint`
Expected: ~88 packages added; `npx eslint --version` prints `v10.x`.

**Step 4.2: Create the config**

```js
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Minimal, fast (non-type-checked) ruleset over workspace sources.
// Type-aware rules are deliberately out (CI speed, YAGNI) — tsc --noEmit
// already runs in CI for client and server.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // Pre-existing findings downgraded to warn on introduction (2026-07)
      // rather than rewriting working code. Don't add new ones.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-useless-assignment': 'warn',
      'no-case-declarations': 'warn',
      // Terminal game: regexes over ANSI/control characters are the domain
      // (xterm output, shell emulation) — this rule is pure noise here.
      'no-control-regex': 'off',
    },
  },
);
```

**Step 4.3: Add the root script**

In root `package.json` `"scripts"` (after `"test:all"`, line 18), add:

```json
    "lint": "eslint client/src server/src shared/src"
```

(Only `.ts`/`.tsx` files are matched via the config's `files` — the JS config files like `client/tailwind.config.js` stay out of scope. E2e specs in `e2e/` are also deliberately out.)

**Step 4.4: First run — see the verified baseline**

Run: `npm run lint`
Expected: exit 1 with **exactly 5 errors** (all `prefer-const`, at the five locations listed under Files) and ~45 warnings; the summary line reads like `✖ 50 problems (5 errors, 45 warnings)` and notes they are fixable with `--fix`. If the counts differ slightly (code moved since 2026-07-10), that's fine — the shape must match: only auto-fixable errors, everything else warnings. **If a new error category appears that is neither auto-fixable nor obviously trivial, downgrade that rule to `'warn'` in `eslint.config.mjs` with a dated comment instead of editing code.**

**Step 4.5: Auto-fix the safe part**

Run: `npm run lint -- --fix`
Then: `npm run lint`
Expected: exit 0, **0 errors**, ~41 warnings remaining. `git diff --stat` shows only the 5 `let`→`const` lines and the 3 removed stale `eslint-disable` comments.

**Step 4.6: Prove the fixes changed nothing behavioral**

Run: `npm test && npm run test:client`
Expected: both suites fully green (node suite; jsdom suite with the usual `2 expected fail` LegalPages guards unless Task 2 ran).

Run: `npx tsc --noEmit -p client/tsconfig.json`
Expected: exit 0.

**Step 4.7: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json client/src/engine
git commit -m "chore(lint): introduce eslint flat config + root lint script

Minimal non-type-checked ruleset (eslint + typescript-eslint recommended)
over client/server/shared src. Pre-existing findings downgraded to warn;
no-control-regex off (ANSI regexes are the domain). --fix applied:
5x prefer-const, 3 stale disable directives.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: CI lint step

**Files:**
- Modify: `.github/workflows/ci.yml:36` (insert after the "Typecheck server" step, before "Unit tests (node)")

**Step 5.1: Insert the step**

After line 36 (`        run: npx tsc --noEmit -p server/tsconfig.json`) insert:

```yaml

      - name: Lint
        run: npm run lint
```

**Step 5.2: Validate locally**

Run: `npm run lint`
Expected: exit 0 (same command CI will run; warnings do not fail it — no `--max-warnings` on purpose, the warn-budget shrinks organically).

Optionally validate YAML: `npx yaml-lint .github/workflows/ci.yml` or simply `node -e "require('js-yaml')"`-style check is unnecessary — indentation matches the sibling steps (6 spaces for `- name:`).

**Step 5.3: Commit (and verify on push)**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run eslint in the test job

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

After pushing, confirm the `Typecheck & unit tests` job shows the green `Lint` step.

---

# Group D — De-flake the WindowsLevel browser tests

**Diagnosis (verified by reading the code and reproducing with probes):**

- `client/src/components/WindowsLevel/useGuiLevel.ts:25,58-61` — on solve, a **real** `setTimeout(…, SOLVE_DELAY_MS /* 1600 */)` defers `onSolved` (the success-animation dwell).
- Every "solves" test therefore burns ≥1.6 s of *wall-clock* time inside `await waitFor(() => expect(onSolved)…, { timeout: 2500 })`; `WindowsLevel.lifecycle.browser.test.tsx:29,46,62` additionally does raw `await wait(2000)` / `wait(400)` sleeps.
- Vitest's default `testTimeout` is 5000 ms. In isolation there is ~3 s of headroom; in a full parallel run (default forks pool, one worker per core, 70 jsdom files each importing React + Fluent UI) the event loop of a starved worker easily eats that headroom → `Error: Test timed out in 5000ms` in exactly these five files: `CoreFirewall`, `Explorer`, `Settings`, `UacPrompt`, `WindowsLevel.lifecycle` `.browser.test.tsx`. CI (`.github/workflows/ci.yml:44`) runs the same suite without `workers: 1`.
- **Fix:** vitest fake timers + `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, advancing `SOLVE_DELAY_MS` explicitly. Removes *all* real-time dependence; the solve tests drop from ~2 s to milliseconds.
- **Landmine (verified — do not skip):** under vitest, `user.click()` **hangs forever** with fake timers active, even with `delay: null`. Cause: `@testing-library/react`'s async act wrapper drains the queue with a real `setTimeout(0)` and only auto-advances when `jestFakeTimersAreEnabled()` detects a **`jest` global** (`node_modules/@testing-library/dom/dist/helpers.js:14-24` checks `typeof jest !== 'undefined'` + `setTimeout.clock`). The standard workaround is stubbing `globalThis.jest = { advanceTimersByTime: vi.advanceTimersByTime }`. Verified green with the exact helper below (3-test probe incl. a Fluent UI switch and the unmount-cancellation case: 3/3 pass, test time ~0.8 s).
- Fallback (only if this somehow regresses): raising `testTimeout` alone, or running the client CI step with `--no-file-parallelism`. Not the primary plan — Task 8's timeout bump is a belt-and-braces addition, not the fix.

### Task 6: Fake-timer test helper + first conversion (UacPrompt)

**Files:**
- Create: `client/src/test/fakeTimers.ts`
- Modify: `client/src/components/WindowsLevel/useGuiLevel.ts:25` (export the constant)
- Modify: `client/src/components/WindowsLevel/UacPrompt.browser.test.tsx`

**Step 6.1: Export the delay constant.** In `client/src/components/WindowsLevel/useGuiLevel.ts:25` change

```ts
const SOLVE_DELAY_MS = 1600;
```
to
```ts
export const SOLVE_DELAY_MS = 1600;
```

**Step 6.2: Create the helper**

```ts
// client/src/test/fakeTimers.ts
import { vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

/**
 * File-level fake timers for GUI-level tests: removes the real 1.6 s
 * SOLVE_DELAY_MS dwell (useGuiLevel.ts) that made these suites time out
 * under full-suite parallel load. Call once at module scope, then create
 * users with fakeTimerUser() and advance with
 * `act(() => vi.advanceTimersByTime(SOLVE_DELAY_MS))`.
 */
export function installFakeTimers(): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    // @testing-library's act wrapper/waitFor only auto-advance fake timers
    // when they detect *Jest* (dom/dist/helpers.js jestFakeTimersAreEnabled:
    // `typeof jest !== 'undefined'` + setTimeout.clock). Without this stub,
    // user.click() awaits a faked setTimeout(0) that never fires and hangs.
    vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
}

/** userEvent wired to advance fake timers instead of sleeping for real. */
export const fakeTimerUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
```

(`client/src/test/` already exists — it holds `setup.ts`. The file is not matched by any test include pattern.)

**Step 6.3: Convert `UacPrompt.browser.test.tsx` (complete new file)**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const context: GuiContext = {
  app: 'uac',
  title: 'Benutzerkontensteuerung',
  hostname: 'WS-TEST',
  state: {
    uac: {
      program: 'Rechnung.pdf.exe',
      publisher: 'Kein verifizierter Herausgeber',
      verifiedPublisher: false,
      programPath: 'C:\\Users\\azubi\\Downloads\\Rechnung.pdf.exe',
      fileOrigin: 'E-Mail-Anhang',
      riskFeedback: 'Achtung: getarnte EXE ohne verifizierten Herausgeber. Wähle „Nein".',
    },
  },
  solutions: [
    {
      interactions: ['answer:uac:no'],
      allRequired: true,
      resultText: 'Korrekt abgelehnt.',
      skillGain: { windows: 3, security: 6 },
    },
  ],
  hints: ['Prüfe den Herausgeber.'],
};

installFakeTimers();

describe('WindowsLevel — UAC prompt', () => {
  it('solves when the untrusted prompt is denied (Nein)', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    expect(screen.getByText(/Änderungen an Ihrem Gerät/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    // Success overlay appears immediately; onSolved fires after the dwell.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined);
  });

  it('does not solve when allowed (Ja) and shows the risk warning', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));

    // Risk feedback shown, level NOT solved — not even after the dwell.
    expect(screen.getByText(/getarnte EXE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('allows recovery: deny after a wrong allow still solves', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));
    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined);
  });
});
```

Note the pattern (applies to every conversion in Task 7):
1. imports: `act` instead of `waitFor`; drop the direct `userEvent` import; add `SOLVE_DELAY_MS` + helper imports,
2. `installFakeTimers();` once at module scope,
3. `userEvent.setup()` → `fakeTimerUser()`,
4. `await waitFor(() => expect(onSolved)…, { timeout: 2500 })` → `act(() => { vi.advanceTimersByTime(SOLVE_DELAY_MS); }); expect(onSolved)…`,
5. in "does not solve" tests, advance `SOLVE_DELAY_MS` *before* `expect(onSolved).not.toHaveBeenCalled()` — strictly stronger than the old assert-before-the-timer version.

**Step 6.4: Run — pass, and fast**

Run: `npx vitest run --root client --config vitest.config.ts src/components/WindowsLevel/UacPrompt.browser.test.tsx`
Expected: 3 passed; per-test time now double-digit milliseconds (previously the two waitFor tests took 1.6 s+ each). If a test *hangs at 5000 ms instead*, the `jest` stub in the helper is missing/broken — that is the known landmine, not a flake.

**Step 6.5: Commit**

```bash
git add client/src/test/fakeTimers.ts client/src/components/WindowsLevel/useGuiLevel.ts client/src/components/WindowsLevel/UacPrompt.browser.test.tsx
git commit -m "test(gui): fake-timer helper; convert UacPrompt suite off real time

WindowsLevel solve tests waited out the real 1600ms SOLVE_DELAY_MS and
timed out at vitest's 5s cap under full-suite parallel load. Helper stubs
the jest global so RTL's act wrapper auto-advances vitest fake timers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: Convert the remaining WindowsLevel suites

**Files (all Modify):**
- `client/src/components/WindowsLevel/WindowsLevel.lifecycle.browser.test.tsx` (flaky)
- `client/src/components/WindowsLevel/CoreFirewall.browser.test.tsx` (flaky)
- `client/src/components/WindowsLevel/Explorer.browser.test.tsx` (flaky)
- `client/src/components/WindowsLevel/Settings.browser.test.tsx` (flaky)
- `client/src/components/WindowsLevel/EventViewer.browser.test.tsx` (same pattern — convert for consistency)
- `client/src/components/WindowsLevel/WindowsLevel.browser.test.tsx` (same pattern — convert for consistency)

**Step 7.1: `WindowsLevel.lifecycle.browser.test.tsx` — complete new file** (this one changes the most: the raw `wait()` sleeps go away):

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const ctx: GuiContext = {
  app: 'taskmanager',
  title: 'Task-Manager',
  hostname: 'WS-TEST',
  state: {
    taskManager: {
      processes: [
        { name: 'svchost.exe', pid: 980, cpu: 2, memoryMb: 142, description: 'System', critical: true },
        { name: 'rogue.exe', pid: 7341, cpu: 94, memoryMb: 856, description: 'Unbekannt' },
      ],
    },
  },
  solutions: [
    { interactions: ['endtask:rogue.exe'], allRequired: true, resultText: 'Beendet.', skillGain: { windows: 6 } },
  ],
  hints: [],
};

installFakeTimers();

afterEach(() => {
  cleanup();
});

describe('WindowsLevel lifecycle', () => {
  it('does NOT call onSolved if unmounted during the success animation', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    const { unmount } = render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('rogue.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Solved visually, but onSolved is deferred by the success animation.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();

    // Player cancels (ESC) → component tears down before the timer fires.
    unmount();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS + 400); // well past the dwell
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('still calls onSolved exactly once when left to complete', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('rogue.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ windows: 6 }, undefined);
    // Give any erroneous second timer a chance to fire.
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
  });
});

describe('WindowsLevel keyboard accessibility', () => {
  it('selects a row via keyboard (focus + Enter) and solves', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    const rows = screen.getAllByRole('option');
    expect(rows.length).toBe(2);

    const rogueRow = screen.getByText('rogue.exe').closest('[role="option"]') as HTMLElement;
    expect(rogueRow).toHaveAttribute('tabindex', '0');
    rogueRow.focus();
    expect(rogueRow).toHaveFocus();

    await user.keyboard('{Enter}'); // keyboard selection
    expect(rogueRow).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: /task beenden/i }));
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 6 }, undefined);
  });

  it('exposes rows as a labelled listbox', () => {
    render(<WindowsLevel context={ctx} onSolved={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('listbox', { name: /prozesse/i })).toBeInTheDocument();
  });
});
```

Run: `npx vitest run --root client --config vitest.config.ts src/components/WindowsLevel/WindowsLevel.lifecycle.browser.test.tsx`
Expected: 4 passed, whole file in well under a second of test time (was ~5 s+ of sleeps).

**Step 7.2: `CoreFirewall.browser.test.tsx` — apply the standard pattern.** Concretely:

- Imports (lines 1–3) become:
  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, act } from '@testing-library/react';
  import { SOLVE_DELAY_MS } from './useGuiLevel';
  import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';
  ```
  (keep the `GuiContext` and `WindowsLevel` imports; delete the `userEvent` import). Add `installFakeTimers();` right above `describe(` (line 50).
- All five `const user = userEvent.setup();` → `const user = fakeTimerUser();` (the third test, line 82, has one too even though it renders `blockedCritical`).
- Lines 60–63 (`await waitFor(…toHaveBeenCalledWith…, { timeout: 2500 })`) →
  ```tsx
  act(() => {
    vi.advanceTimersByTime(SOLVE_DELAY_MS);
  });
  expect(onSolved).toHaveBeenCalledWith({ netzwerk: 5, security: 5 }, ['solution_firewall_locked']);
  ```
- Before each `expect(onSolved).not.toHaveBeenCalled();` (lines 77, 103, 126) insert
  ```tsx
  act(() => {
    vi.advanceTimersByTime(SOLVE_DELAY_MS);
  });
  ```

**Step 7.3: `Explorer.browser.test.tsx` — same pattern.** waitFor at line 38 → advance + assert `({ windows: 2, security: 4 }, undefined)`; advance before the not-called assert at line 52; user setups at lines 30, 43; note the third test (line 55) has no user interaction — leave it as-is.

**Step 7.4: `Settings.browser.test.tsx` — same pattern.** waitFor at lines 47–49 → advance + assert `({ windows: 6, security: 8 }, undefined)`; advance before the not-called assert at line 79; user setups at lines 38, 71. (This file drives Fluent UI `role="switch"` components — the helper is verified against exactly this case.)

**Step 7.5: `EventViewer.browser.test.tsx` — same pattern (consistency conversion).** waitFor at lines 47–49 → advance + assert `({ windows: 5, security: 8 }, undefined)`; advance before line 61's not-called assert; user setups at lines 35, 53, 65 (the filter test keeps its clicks, no advancing needed).

**Step 7.6: `WindowsLevel.browser.test.tsx` — same pattern (consistency conversion).** waitFor at line 46 → advance + `expect(onSolved).toHaveBeenCalledTimes(1);` keeping line 47's `toHaveBeenCalledWith`; advance before line 61's not-called assert; user setups at lines 33, 51, 65 (hint test unchanged otherwise).

**Step 7.7: Run the whole directory**

Run: `npx vitest run --root client --config vitest.config.ts src/components/WindowsLevel`
Expected: 8 files (7 browser suites + `guiSolution.test.ts`), all passed, and the aggregate "tests" duration drops by roughly 15 s versus before (no more real dwells). Also make sure no file still imports `waitFor`/`userEvent` unused (`npm run lint` warns on it if Group C landed).

**Step 7.8: Commit**

```bash
git add client/src/components/WindowsLevel
git commit -m "test(gui): convert remaining WindowsLevel suites to fake timers

Removes every real-time wait (waitFor 2500ms, raw 2000/400ms sleeps) from
the GUI-level suites; not-solved assertions now advance past the dwell
first, which is strictly stronger than asserting before the timer.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 8: Safety-net timeout + full verification

**Files:**
- Modify: `client/vitest.config.ts:7-12`

**Step 8.1: Raise the jsdom suite's testTimeout.** The flake *mechanism* is gone, but these files still pay multi-second jsdom + Fluent import/render costs under fork concurrency; a starved worker should fail loudly for a real reason, not for being slow. In `client/vitest.config.ts` add one line to the `test` block:

```ts
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // Headroom for CPU-starved parallel workers (jsdom + Fluent UI import
    // cost); tests no longer depend on real time (see src/test/fakeTimers.ts),
    // so this only delays *failure* reporting, never slows a passing run.
    testTimeout: 15_000,
  },
```

**Step 8.2: Full-suite verification (run it twice to shake out load-dependent behavior)**

Run: `npm run test:client && npm run test:client`
Expected: both runs fully green — 70+ files (71 if Group B landed), `703+ passed | 2 expected fail` (0 expected fail once Task 2 lands), total duration a few seconds *lower* than the ~26 s baseline. No `Test timed out` anywhere.

Run: `npm test`
Expected: node suite green (the `useGuiLevel.ts` export change is type-only surface; nothing else in prod code changed).

Run: `npx tsc --noEmit -p client/tsconfig.json`
Expected: exit 0.

**Step 8.3: Commit**

```bash
git add client/vitest.config.ts
git commit -m "test(client): 15s testTimeout headroom for jsdom suite

Belt-and-braces for CPU-starved CI workers; the real fix is the
fake-timer conversion — passing runs are unaffected.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Execution notes

- **Order independence:** groups A–D touch disjoint files except that Group C's lint will *warn* about unused `waitFor` imports if it runs before Group D (warnings don't fail; Group D removes them) and Group C's `--fix` touches `client/src/engine/*` files that no other group edits.
- **Do not** "fix" the two `LegalPages` expected-fail guards by weakening the assertions — they are the compliance tripwire and only Task 2 (owner data) may retire them.
- **If a converted GUI test ever hangs at exactly the testTimeout:** check the `jest` global stub in `client/src/test/fakeTimers.ts` first (RTL's Jest-detection is the only known hang mode, verified during planning).
