# Menu Information Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat five-mode picker with a three-destination main menu and a progressive new-game flow while preserving every mode and learning level.

**Architecture:** Add a small experience picker for free simulation versus story, narrow the existing mode picker to simulation variants, and keep `handleModeSelect(GameModeId)` as the only game-start action. Main-menu and picker state stays local to `App`; saves and shared mode identifiers do not change.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest 4, Testing Library.

---

### Task 1: Restrict the simulation picker

**Files:**
- Modify: `client/src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx`
- Modify: `client/src/components/GameModeSelectModal/index.tsx`

**Step 1: Write the failing tests**

Replace the current flat-mode assertions with tests that require exactly three
visible cards:

```ts
expect(screen.getByText('Einsteiger')).toBeInTheDocument();
expect(screen.getByText('Standard')).toBeInTheDocument();
expect(screen.getByText('KRITIS')).toBeInTheDocument();
expect(screen.queryByText('Lernmodus')).not.toBeInTheDocument();
expect(screen.queryByText('Story: Die Probezeit')).not.toBeInTheDocument();
```

Assert Einsteiger remains selected/recommended, ArrowDown + Enter selects
`intermediate`, Escape calls `onClose`, and every card has role `button`.

**Step 2: Run to verify red**

```bash
npx vitest run --root client src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx
```

Expected: failures because learning/story are still present and cards are
clickable `div` elements.

**Step 3: Implement the minimal picker change**

Filter configurations to ids `beginner`, `intermediate`, and `kritis`. Change
the frame title to `SIMULATION WÄHLEN`. Render each card as:

```tsx
<button
  type="button"
  className="w-full border ... focus-visible:ring-2 focus-visible:ring-terminal-green"
  onClick={onClick}
  onMouseEnter={onMouseEnter}
>
  ...
</button>
```

Keep existing keyboard selection and recommendation behavior.

**Step 4: Run to verify green**

Run the same test file; expect all tests to pass.

**Step 5: Commit**

```bash
git add client/src/components/GameModeSelectModal
git commit -m "refactor(menu): limit mode picker to simulations"
```

### Task 2: Add the new-game experience picker

**Files:**
- Create: `client/src/components/NewGameSelectModal/index.tsx`
- Create: `client/src/components/NewGameSelectModal/NewGameSelectModal.browser.test.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Write the failing component test**

Specify the component API:

```tsx
render(
  <NewGameSelectModal
    onSelectSimulation={onSimulation}
    onSelectStory={onStory}
    onClose={onClose}
  />
);
```

Test:

- `Freie Simulation` and `Story: Die Probezeit` render;
- free simulation has `EMPFOHLEN` and is initially selected;
- Enter calls `onSelectSimulation`;
- ArrowDown then Enter calls `onSelectStory`;
- Escape calls `onClose`;
- both choices are semantic buttons with visible focus classes.

**Step 2: Verify red**

Run the new test; expect module-not-found failure.

**Step 3: Implement the component**

Build a two-card modal using `AsciiFrame`, local selected-index state, and the
same ArrowUp/ArrowDown/Enter/Escape model as the simulation picker. Copy:

- Freie Simulation: `Dynamische IT-Wochen mit Szenarien, Ereignisketten und frei wählbarer Herausforderung.`
- Die Probezeit: `Ein zusammenhängender IT-Krimi in 12 Kapiteln mit Beziehungen und mehreren Enden.`

**Step 4: Verify component green**

Run the component test; expect all tests to pass.

**Step 5: Wire App progressively**

Replace `showModeSelect: boolean` with a local picker state:

```ts
type NewGamePicker = 'experience' | 'simulation' | null;
const [newGamePicker, setNewGamePicker] = useState<NewGamePicker>(null);
```

Main-menu `Neues Spiel` opens `experience`. The experience callbacks are:

```ts
onSelectSimulation={() => setNewGamePicker('simulation')}
onSelectStory={() => {
  setNewGamePicker(null);
  handleModeSelect('story');
}}
```

The simulation picker closes back to `experience`; selecting a simulation
closes all picker state and starts the selected mode. Escape from the experience
picker returns to the main menu.

**Step 6: Verify and commit**

Run the new component test and existing menu keyboard test. Commit:

```bash
git add client/src/components/NewGameSelectModal client/src/App.tsx
git commit -m "feat(menu): add progressive new game selection"
```

### Task 3: Simplify main-menu destinations

**Files:**
- Modify: `client/src/App.menuKeyboard.browser.test.tsx`
- Modify: `client/src/App.learningHub.browser.test.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Add failing integration assertions**

In the menu keyboard suite, require these visible destinations:

```ts
expect(screen.getByRole('button', { name: /Neues Spiel/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /Lernbereich/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /Spielstände/i })).toBeInTheDocument();
expect(screen.queryByRole('button', { name: /Spiel laden/i })).not.toBeInTheDocument();
```

Test that selecting Spielstände opens the existing load modal. Test that
Lernbereich still starts `learning` and renders the learning hub. Test the full
new-game path:

```text
Neues Spiel → Freie Simulation → Standard
Neues Spiel → Story: Die Probezeit
```

and verify no Learning option appears in either new-game picker.

**Step 2: Verify red**

Run both App browser tests; expect label and flow failures.

**Step 3: Update main-menu labels and keyboard model**

Use menu ids `continue | new | learning | saves`. Rename the visible learning
button to `LERNBEREICH`, rename load to `SPIELSTÄNDE`, and preserve the
contextual `WEITER SPIELEN` button. Spielstände opens the current load modal.
Update modal-open guards and Escape behavior to recognize either picker level.

**Step 4: Verify green**

Run:

```bash
npx vitest run --root client \
  src/App.menuKeyboard.browser.test.tsx \
  src/App.learningHub.browser.test.tsx \
  src/components/GameModeSelectModal/GameModeSelectModal.browser.test.tsx \
  src/components/NewGameSelectModal/NewGameSelectModal.browser.test.tsx
```

Expected: all selected tests pass.

**Step 5: Commit**

```bash
git add client/src/App.tsx client/src/App.menuKeyboard.browser.test.tsx client/src/App.learningHub.browser.test.tsx
git commit -m "feat(menu): simplify primary navigation"
```

### Task 4: Full verification

**Files:**
- No production files expected.

**Step 1: Run formatting and type guards**

```bash
git diff --check
npm run build -w shared
npm run build -w client
```

Expected: all commands exit 0.

**Step 2: Run the full suite**

```bash
npm test
```

Expected: zero failed tests.

**Step 3: Inspect scope**

Run `git status --short` and `git diff --stat`. Confirm the user's untracked
images, `.claude/`, and `docs/event-bilder-zuordnung.csv` were not added or
modified by this work.
