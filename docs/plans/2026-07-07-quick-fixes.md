# Quick Fixes Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land five small, independent fixes from the 2026-07-07 product audit: (1) main-menu ArrowUp keyboard semantics, (2) Impressum/Datenschutz placeholder data extracted into a guarded constants block, (3) stale Lernmodus copy ("11 Terminal-Lektionen" → real scope: 31 lessons / 8 tracks), (4) missing German umlauts in GameScreen/EventCard, (5) repo hygiene (commit `docs/MODULAR_UI.md`, delete untracked cruft).

**Architecture:** No architectural changes. Each fix is a self-contained edit + (where testable) a Vitest/React-Testing-Library test, committed separately. Client tests run under jsdom via `client/vitest.config.ts` (setup file `client/src/test/setup.ts` already polyfills localStorage etc. — nothing to add).

**Tech Stack:** React 18 + TypeScript, Vitest 4 + @testing-library/react (jsdom), npm workspaces (`client`, `server`, `shared`).

**Verified findings (all confirmed in code on 2026-07-07):**
- `client/src/App.tsx:216-218` — one branch handles both `ArrowUp` and `ArrowDown` with `(prev + 1) % len`. **Honesty note:** `menuItems` has exactly 2 entries (`['new', 'load']`), and `(i+1)%2 === (i-1+2)%2`, so the buggy and fixed code are *observationally identical today*. A behavior test cannot fail against the old code. We fix the semantics anyway (any third menu item would break) and add the test as a regression guard — do NOT claim red→green TDD for Task 1.
- `client/src/components/LegalPages/index.tsx:71` (`{/* TODO: Fill in your actual information */}`), `:85-86` (`ihre-email@example.com`, `+49 XXX XXXXXXX`), `:172-177` (same placeholders again in the Datenschutz page). No existing LegalPages test.
- Stale copy in `shared/src/config/gameModes.ts:49`, `README.md:12`, and additionally `docs/GAME_MODES_SPEC.md:75,123`. Real counts verified in `client/src/content/events/learning-tracks.ts`: **8 tracks, 31 levels** (`grep -c "eventId:"` → 31): 16 CLI (`learn_01`–`learn_11` + 5 `learn_adv_*`), 10 `gui_*` Windows-GUI levels, 5 `blk_*` Blackout levels.
- Umlaut misspellings — exactly 5 hits in `client/src`, no test asserts them (verified by grep over all `*.test.*`/`*.spec.*`): `EventCard/index.tsx:335` (`auswahlen`), `GameScreen/index.tsx:205,270` (`verfugbar`), `GameScreen/index.tsx:210,275` (`Nachster`).
- `docs/MODULAR_UI.md` untracked (legit design doc). `analyze_levels.mts` untracked and **not** gitignored (one-off audit script — this audit is its output, so it is superseded). `test_game.py` and `test_screenshots/` exist on disk but ARE gitignored (`.gitignore:10-11`) — deleting them is local-only.

---

## Task 0: Branch setup

**Files:** none

1. Confirm a clean slate for these fixes (they are unrelated to `feat/blackout-slice`):
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   git status --short
   ```
   Expected: only `?? analyze_levels.mts` and `?? docs/MODULAR_UI.md` (both untracked files survive branch switches — that's fine, Task 5 handles them).
2. Branch off main:
   ```bash
   git checkout main && git pull && git checkout -b chore/quick-fixes
   ```
3. Make sure deps and the shared build are warm (test scripts build `shared` themselves, but a first run is faster after this):
   ```bash
   npm install && npm run build -w shared
   ```

---

## Task 1: Main-menu ArrowUp must navigate up

**Files:**
- `client/src/App.tsx:214-218` (fix)
- `client/src/App.menuKeyboard.test.tsx` (new regression test)

**Not classic TDD** — see the honesty note above: with 2 menu items the old and new code behave identically, so write the test first but expect it to pass *even before* the fix. It guards the up/down semantics for any future third menu item.

1. Create `client/src/App.menuKeyboard.test.tsx` (patterned after `client/src/App.learningHub.test.tsx` — plain `render(<App />)`, intro dismissed with an Enter keydown on `window`, which is where App attaches its handler):

   ```tsx
   import { describe, it, expect } from 'vitest';
   import { render, screen, fireEvent } from '@testing-library/react';
   import App from './App';

   // Regression guard for the main-menu keyboard handler (App.tsx ~line 216).
   // Historical bug: ArrowUp and ArrowDown shared one branch, so ArrowUp moved
   // DOWN. NOTE: with exactly 2 menu items (i+1)%2 === (i-1+2)%2, so this test
   // passes against the old code too — it pins the *semantics* so any future
   // third menu item keeps correct up/down behavior.
   describe('App — main menu arrow-key navigation', () => {
     // The selected item is rendered with a '> ' prefix inside the button.
     function markerOf(re: RegExp): string {
       return (screen.getByText(re).textContent ?? '').trimStart();
     }

     it('ArrowDown moves down, ArrowUp moves up, both wrap around', async () => {
       render(<App />);

       // Intro screen → Enter dismisses it, main menu appears.
       fireEvent.keyDown(window, { key: 'Enter' });
       await screen.findByText(/NEUES SPIEL STARTEN/);

       // Initially item 0 ("NEUES SPIEL STARTEN") is selected.
       expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

       // ArrowDown → "SPIEL LADEN".
       fireEvent.keyDown(window, { key: 'ArrowDown' });
       expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);
       expect(markerOf(/NEUES SPIEL STARTEN/)).not.toMatch(/^>/);

       // ArrowDown again → wraps back to "NEUES SPIEL STARTEN".
       fireEvent.keyDown(window, { key: 'ArrowDown' });
       expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

       // ArrowUp from item 0 → wraps UP to the last item ("SPIEL LADEN").
       fireEvent.keyDown(window, { key: 'ArrowUp' });
       expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);

       // ArrowUp again → back to item 0.
       fireEvent.keyDown(window, { key: 'ArrowUp' });
       expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);
     });
   });
   ```

2. Run it (from repo root; the script builds `shared` first):
   ```bash
   npm run test:client -- App.menuKeyboard
   ```
   Expected: `Test Files  1 passed (1)` — passes already (see honesty note). If it fails, the test setup is wrong, not the app; fix the test before touching App.tsx.

3. Fix `client/src/App.tsx`. Replace (exact current code at lines 214-218):

   ```tsx
       const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
           e.preventDefault();
           setMenuIndex(prev => (prev + 1) % menuItems.length);
         } else if (e.key === 'Enter') {
   ```

   with:

   ```tsx
       const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'ArrowUp') {
           e.preventDefault();
           setMenuIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
         } else if (e.key === 'ArrowDown') {
           e.preventDefault();
           setMenuIndex(prev => (prev + 1) % menuItems.length);
         } else if (e.key === 'Enter') {
   ```

4. Re-run and confirm still green:
   ```bash
   npm run test:client -- App.menuKeyboard
   ```
   Expected: `Test Files  1 passed (1)`.

5. Commit:
   ```bash
   git add client/src/App.tsx client/src/App.menuKeyboard.test.tsx
   git commit -m "fix(ui): main-menu ArrowUp navigates up, not down

   ArrowUp shared ArrowDown's (i+1)%len branch. Invisible with the current
   2-item menu ((i+1)%2 == (i-1+2)%2) but wrong for any third item; test
   pins the semantics.

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 2: Impressum/Datenschutz — extract placeholders into a guarded constants block

**Files:**
- `client/src/components/LegalPages/index.tsx:1-3` (constants block), `:70-87` (Impressum Angaben + Kontakt), `:110-113` (§ 55 RStV block), `:170-178` (Datenschutz "Verantwortliche Stelle")
- `client/src/components/LegalPages/LegalPages.test.tsx` (new guard test)

**IMPORTANT — this plan must NOT invent real personal data.** The task only centralizes the placeholders and adds a guard test. **The guard test is marked `it.fails` and will stay in that inverted state until the site owner fills in real data** — at which point `it.fails` starts erroring and the owner flips it to `it`. Say this loudly in the commit and code comments. The Impressum remains legally non-compliant until the owner acts; this task makes that state impossible to miss.

1. Add the constants block to `client/src/components/LegalPages/index.tsx` directly after the `import { useState } from 'react';` line:

   ```tsx
   // ═════════════════════════════════════════════════════════════════════
   // ⚠️  BETREIBER-DATEN — VOR PRODUKTIV-DEPLOYMENT AUSFÜLLEN!  ⚠️
   // Pflichtangaben nach § 5 TMG (Impressum) und Art. 13 DSGVO
   // (Verantwortliche Stelle). Solange hier TODO-Platzhalter stehen, ist
   // die Seite NICHT rechtskonform. Der Guard-Test in LegalPages.test.tsx
   // ist deshalb als `it.fails` markiert — nach dem Eintragen echter Daten
   // dort `it.fails` → `it` umstellen, damit er dauerhaft wacht.
   // ═════════════════════════════════════════════════════════════════════
   export const LEGAL_OWNER = {
     name: 'TODO Vorname Nachname',
     street: 'TODO Straße Hausnummer',
     city: 'TODO PLZ Ort',
     country: 'Deutschland',
     email: 'TODO ihre-email@example.com',
     /** Nach § 5 TMG optional — auf '' setzen, um die Zeile auszublenden. */
     phone: 'TODO +49 XXX XXXXXXX',
   };

   /** True solange irgendein Feld noch einen TODO-Platzhalter trägt. */
   export const LEGAL_DATA_IS_PLACEHOLDER = Object.values(LEGAL_OWNER).some(
     (v) => v.includes('TODO'),
   );
   ```

2. In the `Impressum` component, replace the "Angaben gemäß § 5 TMG" + "Kontakt" placeholder markup (current lines 70-87):

   ```tsx
           <div className="text-terminal-green-dim">
             {/* TODO: Fill in your actual information */}
             <p className="text-terminal-warning mb-2">
               [BITTE AUSFÜLLEN - Pflichtangaben nach § 5 TMG]
             </p>
             <p>Vorname Nachname</p>
             <p>Straße Hausnummer</p>
             <p>PLZ Ort</p>
             <p>Deutschland</p>
           </div>
         </section>

         <section>
           <h3 className="text-terminal-info mb-2">Kontakt</h3>
           <div className="text-terminal-green-dim">
             <p>E-Mail: ihre-email@example.com</p>
             <p>Telefon: +49 XXX XXXXXXX (optional)</p>
           </div>
         </section>
   ```

   with:

   ```tsx
           <div className="text-terminal-green-dim">
             {LEGAL_DATA_IS_PLACEHOLDER && (
               <p className="text-terminal-warning mb-2">
                 [BITTE AUSFÜLLEN - Pflichtangaben nach § 5 TMG]
               </p>
             )}
             <p>{LEGAL_OWNER.name}</p>
             <p>{LEGAL_OWNER.street}</p>
             <p>{LEGAL_OWNER.city}</p>
             <p>{LEGAL_OWNER.country}</p>
           </div>
         </section>

         <section>
           <h3 className="text-terminal-info mb-2">Kontakt</h3>
           <div className="text-terminal-green-dim">
             <p>E-Mail: {LEGAL_OWNER.email}</p>
             {LEGAL_OWNER.phone && <p>Telefon: {LEGAL_OWNER.phone} (optional)</p>}
           </div>
         </section>
   ```

3. In the same component, "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV" (currently ~line 111): replace `<p>Vorname Nachname</p>` with `<p>{LEGAL_OWNER.name}</p>` (keep `<p>Adresse wie oben</p>`).

4. In the `Datenschutz` component, section "2. Verantwortliche Stelle" (currently lines 170-178), replace:

   ```tsx
             <p className="text-terminal-warning mb-2">
               [BITTE AUSFÜLLEN - Gleiche Daten wie Impressum]
             </p>
             <p>Vorname Nachname</p>
             <p>Straße Hausnummer</p>
             <p>PLZ Ort</p>
             <p>E-Mail: ihre-email@example.com</p>
   ```

   with:

   ```tsx
             {LEGAL_DATA_IS_PLACEHOLDER && (
               <p className="text-terminal-warning mb-2">
                 [BITTE AUSFÜLLEN - Gleiche Daten wie Impressum]
               </p>
             )}
             <p>{LEGAL_OWNER.name}</p>
             <p>{LEGAL_OWNER.street}</p>
             <p>{LEGAL_OWNER.city}</p>
             <p>E-Mail: {LEGAL_OWNER.email}</p>
   ```

5. Create `client/src/components/LegalPages/LegalPages.test.tsx`:

   ```tsx
   import { describe, it, expect } from 'vitest';
   import { render } from '@testing-library/react';
   import { LegalPages } from './index';

   // ⚠️ GUARD TEST — deliberately marked `it.fails` because LEGAL_OWNER in
   // ./index.tsx still ships TODO placeholders and this plan must not invent
   // real personal data. The site owner must:
   //   1. fill real data into LEGAL_OWNER (index.tsx),
   //   2. then these it.fails specs start ERRORING ("expected to fail"),
   //   3. flip `it.fails` → `it` so the guard becomes permanent.
   // Until then the Impressum is NOT legally compliant (§ 5 TMG).
   function pageText(initialPage: 'impressum' | 'datenschutz'): string {
     const { container } = render(
       <LegalPages initialPage={initialPage} onClose={() => {}} />,
     );
     return container.textContent ?? '';
   }

   function expectNoPlaceholders(text: string) {
     expect(text).not.toMatch(/TODO/i);
     expect(text).not.toMatch(/XXX/);
     expect(text).not.toMatch(/BITTE AUSFÜLLEN/);
     expect(text).not.toMatch(/example\.com/);
   }

   describe('LegalPages — no placeholder data may ship', () => {
     it.fails('Impressum contains no TODO/XXX placeholder data', () => {
       expectNoPlaceholders(pageText('impressum'));
     });

     it.fails('Datenschutz contains no TODO/XXX placeholder data', () => {
       expectNoPlaceholders(pageText('datenschutz'));
     });
   });
   ```

6. Run:
   ```bash
   npm run test:client -- LegalPages
   ```
   Expected: `2 passed` — **passing here means the assertions failed as expected** (`it.fails` inverts). That is the intended state until the owner fills in real data.

7. Quick sanity that nothing else imports the removed literals:
   ```bash
   grep -rn "ihre-email@example.com" /Users/timoklinge/Projekte/kritis_game/client/src
   ```
   Expected: hits only inside `LegalPages/index.tsx` (the constants block) — nowhere else.

8. Commit:
   ```bash
   git add client/src/components/LegalPages/
   git commit -m "refactor(legal): centralize Impressum owner data behind guarded constants

   LEGAL_OWNER block at top of LegalPages/index.tsx is the single place the
   owner must fill in (§ 5 TMG / Art. 13 DSGVO). Guard test is it.fails
   until real data lands — flip to it afterwards. NO real data invented.

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 3: Lernmodus copy — sell the real scope (31 lessons / 8 tracks)

**Files:**
- `shared/src/config/gameModes.ts:49`
- `README.md:12`
- `docs/GAME_MODES_SPEC.md:75,123` (also stale — found during verification)

No sync-test needed (agreed: overkill) — just fix the copy.

1. Re-verify the counts (source of truth: `client/src/content/events/learning-tracks.ts`):
   ```bash
   grep -c "eventId:" /Users/timoklinge/Projekte/kritis_game/client/src/content/events/learning-tracks.ts
   grep -cE "^    id: '" /Users/timoklinge/Projekte/kritis_game/client/src/content/events/learning-tracks.ts
   ```
   Expected: `31` and `8`. Breakdown: 16 CLI (`learn_*`), 10 Windows-GUI (`gui_*`), 5 Blackout (`blk_*`). If the numbers moved, use the new ones in all copy below.

2. `shared/src/config/gameModes.ts:49` — replace:
   ```ts
       description: 'CLI-Training: 11 progressive Terminal-Lektionen von Basics bis Incident Response.',
   ```
   with:
   ```ts
       description: 'Security-Training: 31 Lektionen in 8 Tracks — Linux-Terminal, Windows-GUI (Task-Manager, Event Viewer, UAC & Co.) und der Blackout-Incident.',
   ```

3. `README.md:12` — replace:
   ```md
   | **Lernmodus** | CLI training - 11 progressive terminal lessons from basics to incident response |
   ```
   with:
   ```md
   | **Lernmodus** | Security training - 31 lessons across 8 tracks: Linux terminal (16 CLI lessons), Windows GUI apps (Task Manager, Event Viewer, UAC, Explorer, Settings) and the 5-level "Blackout" incident |
   ```

4. `docs/GAME_MODES_SPEC.md:75` — replace:
   ```md
   **Philosophy:** CLI-first training path with forgiving values. Players learn through 11 progressive terminal lessons rather than broad random scenario pressure.
   ```
   with:
   ```md
   **Philosophy:** Guided training path with forgiving values. Players learn through 31 lessons in 8 hub-selectable tracks (Linux CLI, Windows GUI apps, Blackout incident) rather than broad random scenario pressure.
   ```

5. `docs/GAME_MODES_SPEC.md:123` — replace:
   ```md
   - **11 progressive terminal lessons** shown through the learning path
   ```
   with:
   ```md
   - **31 lessons across 8 tracks** (16 CLI, 10 Windows-GUI, 5 Blackout) shown through the learning hub
   ```

6. Verify no stale copy remains and nothing asserted the old string:
   ```bash
   grep -rn "11 progressive\|11 Lektionen\|Terminal-Lektionen" /Users/timoklinge/Projekte/kritis_game --include='*.ts' --include='*.tsx' --include='*.md' | grep -v node_modules | grep -v docs/plans
   ```
   Expected: no output.

7. The description renders in the mode-select modal — run the existing App flow test that clicks through it:
   ```bash
   npm run test:client -- App.learningHub
   ```
   Expected: `1 passed`.

8. Commit:
   ```bash
   git add shared/src/config/gameModes.ts README.md docs/GAME_MODES_SPEC.md
   git commit -m "fix(copy): Lernmodus description reflects real scope (31 lessons, 8 tracks)

   Learning mode grew from 11 linear CLI lessons to a hub with 8 tracks:
   16 CLI + 10 Windows-GUI + 5 Blackout levels. Counts verified against
   client/src/content/events/learning-tracks.ts.

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 4: Restore missing German umlauts

**Files:**
- `client/src/components/EventCard/index.tsx:335`
- `client/src/components/GameScreen/index.tsx:205,210,270,275`

1. Reproduce the audit greps (exact commands; already verified — expect exactly these 5 hits):
   ```bash
   grep -rn "verfugbar\|Nachster\|auswahlen" /Users/timoklinge/Projekte/kritis_game/client/src --include='*.ts' --include='*.tsx'
   grep -rnE "\bWahle\b|\bfur\b|\bUbung\b|\bzuruck\b|\bZuruck\b|\bmussen\b|\bkonnen\b|\bLosung\b" /Users/timoklinge/Projekte/kritis_game/client/src --include='*.ts' --include='*.tsx'
   ```
   Expected — first grep, exactly:
   ```
   client/src/components/EventCard/index.tsx:335: ... Schnell auswahlen!
   client/src/components/GameScreen/index.tsx:205: ... Kein Ereignis verfugbar.
   client/src/components/GameScreen/index.tsx:210: ... [ENTER] Nachster Tag
   client/src/components/GameScreen/index.tsx:270: ... Kein Ereignis verfugbar.
   client/src/components/GameScreen/index.tsx:275: ... [ENTER] Nachster Tag
   ```
   Second grep: no output (checked — no other bare-ASCII German in client/src). If new hits appeared since the audit, fix them the same way.

2. Confirm no test pins the misspellings (verified during planning; re-check cheaply):
   ```bash
   grep -rn "verfugbar\|Nachster\|auswahlen" /Users/timoklinge/Projekte/kritis_game/client /Users/timoklinge/Projekte/kritis_game/e2e --include='*.test.*' --include='*.spec.*' 2>/dev/null | grep -v node_modules
   ```
   Expected: no output.

3. Fix `client/src/components/EventCard/index.tsx:335`: `Schnell auswahlen!` → `Schnell auswählen!`

4. Fix `client/src/components/GameScreen/index.tsx` — both occurrences of each (lines 205+270, 210+275; use replace-all):
   - `Kein Ereignis verfugbar.` → `Kein Ereignis verfügbar.`
   - `[ENTER] Nachster Tag` → `[ENTER] Nächster Tag`

5. Verify clean:
   ```bash
   grep -rn "verfugbar\|Nachster\|auswahlen" /Users/timoklinge/Projekte/kritis_game/client/src --include='*.ts' --include='*.tsx'
   ```
   Expected: no output.

6. Run the client suite to prove nothing asserted the old strings:
   ```bash
   npm run test:client
   ```
   Expected: all test files pass (same pass count as before this task).

7. Commit:
   ```bash
   git add client/src/components/EventCard/index.tsx client/src/components/GameScreen/index.tsx
   git commit -m "fix(i18n): restore missing umlauts (verfügbar, Nächster, auswählen)

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 5: Repo hygiene — commit design doc, delete cruft

**Files:**
- `docs/MODULAR_UI.md` (untracked → commit; verified: legit presentation-layer design doc)
- `analyze_levels.mts` (untracked, NOT gitignored → delete; one-off level-audit script whose findings produced this very fix batch — superseded)
- `test_game.py`, `test_screenshots/` (on disk but gitignored via `.gitignore:10-11` → local-only cleanup)

1. Commit the design doc:
   ```bash
   git add docs/MODULAR_UI.md
   git commit -m "docs: add modular UI presentation-layer design doc

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

2. Delete the superseded audit script (untracked — no commit involved):
   ```bash
   rm /Users/timoklinge/Projekte/kritis_game/analyze_levels.mts
   ```

3. Local-only cruft — first confirm both are still gitignored (safety: deleting must not create a git diff):
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game && git check-ignore -v test_game.py test_screenshots
   ```
   Expected: two lines pointing at `.gitignore:11` / `.gitignore:10`. If (and only if) both are listed:
   ```bash
   rm /Users/timoklinge/Projekte/kritis_game/test_game.py
   rm -r /Users/timoklinge/Projekte/kritis_game/test_screenshots
   ```
   **Owner note:** `test_game.py` is an old Playwright screenshot walker and `test_screenshots/` its output (4 PNGs) — superseded by the Playwright e2e suite (`npm run test:e2e`). They are gitignored, so deletion is purely local. If unsure, skip this step and leave a note for the owner instead — nothing depends on it.

4. Verify final state:
   ```bash
   git status --short
   ```
   Expected: empty output (no untracked files, clean tree).

---

## Final verification

```bash
cd /Users/timoklinge/Projekte/kritis_game
npm test               # root suite (builds shared, runs all workspaces' vitest)
npm run test:client    # client suite incl. the two new test files
git log --oneline -6   # 5 fix commits on chore/quick-fixes
```

Expected: all green (the LegalPages guard specs report *passed* because they are `it.fails` — see Task 2), and the log shows the five commits from Tasks 1-3 + 4 + 5.

Then use superpowers:finishing-a-development-branch to merge/PR `chore/quick-fixes`.
