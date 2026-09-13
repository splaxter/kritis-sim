# Content Inventory

_Verified against the codebase on 2026-09-11. Counts are top-level content
objects, not choice ids. When in doubt, the **content tests are the source of
truth**, not this file — see "Guards" below._

This replaces the old `GAME_FLOW_COVERAGE.md`, whose counts were planning-era
estimates (250 events / 179 scenarios / 12 sidequests) that never matched what
shipped.

## Game modes

Five visible modes (`VISIBLE_MODES` in `shared/src/types/gameMode.ts`); config in
`shared/src/config/gameModes.ts`. A sixth mode, `Schwer` (hard), exists but is
hidden.

| Mode | id | Weeks | Max scenario diff. | Effect × | Notes |
|------|----|-------|--------------------|----------|-------|
| Einsteiger | `beginner` | 12 | 2 | 0.7 | Hints on, forgiving, week-1 terminal tutorials |
| Lernmodus | `learning` | 12 | 4 | 0.8 | Hub-driven training, no free-play pool |
| Story-Kampagne | `story` | — | 4 | 1.0 | One mode, three campaigns (see below); the run ends with the campaign, not the calendar |
| Standard | `intermediate` | 12 | 5 | 1.0 | Baseline |
| KRITIS | `kritis` | 24 | 5 | 1.1 | Double length, NIS2 arc |
| _Schwer (hidden)_ | `hard` | 12 | 5 | 1.2 | Stricter thresholds |

## Free-play event pool (99)

`client/src/content/events/`, by week band:

| File | Events |
|------|--------|
| week1.ts | 3 |
| week2-4.ts | 15 |
| week5-8.ts | 17 |
| week9-12.ts | 17 |
| week13-18.ts | 25 |
| week19-24.ts | 22 |

Plus `kritis-special.ts` (16, KRITIS 24-week arc) and `tutorials.ts` (4,
beginner week-1 terminal tutorials). A conditional/random story overlay
(`events/story/`) layers additional flavor into the pool.

## Red-thread chains (12)

`client/src/content/events/chains/` (one file each, plus `index.ts`):
audit-prep, backup, change, colleague, documentation, hardware, monitoring,
offboarding, patch, security, supply-chain, trust. Per-week throttled; delayed
consequences scheduled via `pendingChainEvents`.

## Story campaigns (3)

Registered in `content/campaigns/index.ts`; all three run in mode `story`.
Day budgets are measured end-to-end in `engine/campaignBudget.test.ts`.

| Campaign | id | Chapters | Beats | Endings | Days to ending | Hands-on |
|---|---|---|---|---|---|---|
| Die Probezeit | `probation` | 12 | 51 | 3 (score-derived) | 60–65 | 3 optional GUI beats |
| Audit Trail _(hidden, `trick17`)_ | `audit-trail` | 6 | 20 | 3 (flag-derived) | 20 | 7 terminal + 1 GUI |
| Das Kataster | `kataster` | 6 | 24 | 3 (domain-derived) | 24 | 6 terminal + 2 GUI |

### Die Probezeit

- **12 chapters** (`adventure/chapters.ts`), fully authored ch01–ch12.
- **3 endings** (`adventure/endings.ts`): good / neutral / bad, chosen by a
  score (good ≥ 65, neutral ≥ 35, bad < 35).
- **6 sidequests** (`adventure/sidequests.ts`): sq_coffee_machine,
  sq_network_optimization, sq_haunted_printer, sq_legacy_code,
  sq_predecessor_trail, sq_external_contact. Each unlocks a hidden payoff
  dialogue in the main story. Six more premises remain parked in
  `docs/sidequest-backlog.md`.

### Audit Trail (hidden)

- **6 chapters**, 20 beats, no sidequests. Unlocked by typing `trick17` into the
  campaign picker; hiding is a menu concern only (see GAME_MODES_SPEC).
- **3 endings** (`campaigns/audit-trail/`): `profi` / `raecher` / `stille`,
  derived from flags, not a score.

### Das Kataster

- **6 chapters**, 24 beats, no sidequests. Visible; the least prior knowledge of
  the three.
- **8 levels**: 6 terminal (grep/awk/cut/sort/find over a Pflichten-Aktenlage)
  and 2 GUI on the `kataster` register app (`WindowsLevel/apps/Kataster.tsx`).
  L8 (`kt_l8_fristen`) is optional and declinable.
- **3 endings** (`campaigns/kataster/endings.ts`): `gruene_liste` / `ordner` /
  `aufpasser`, derived from five domains in `campaigns/kataster/domains.ts`
  (K1 Vollständigkeit, K2 Zurechenbarkeit, K3 Nachweisfähigkeit, K4 Ehrlichkeit,
  K5 Eskalation). The epilogue is composed per satisfied domain.
- Act 4 is an audit: five questions, one per domain, each authored in a
  *satisfied* and an *open* variant.
- **Design rule, do not "fix":** a fabricated owner (a group, an unconfirmed
  colleague) must render **identically** to a real one in the register UI. The
  judgement lives in the level's `GuiSolution`, never in the component —
  contract-tested in `Kataster.browser.test.tsx`.

## Event illustrations (33 noir)

`client/public/images/events/`: 33 new illustrations (1024×1024, WebP,
dark-noir vector style), on top of the 5 pre-existing `evt_*.webp` story
images (38 `.webp` files total). Wired into the Adventure story via each
event's `image:` field in `adventure/story-events.ts` — **29 adventure events
now carry artwork** (26 that had none, 3 upgraded from placeholder reuse).

A few illustrations map to vendor packs rather than the adventure story
(cloud365 sales pitch, telekom technician, vendor lobby) and are available but
not yet wired.

A full mapping (original filename → content-named file → in-game path →
description) lives at `docs/event-bilder-zuordnung.csv`.

## Learning content (36 lessons across 9 tracks)

- **16 CLI lessons** (`events/learning-path.ts`) on the shell engine.
- **10 GUI levels** (`events/gui-levels.ts`) across the fake-Windows apps
  (taskmanager, eventviewer, uac, settings, explorer, corefirewall).
- **5 Blackout levels** (`events/blackout.ts`, "Operation Dunkelkammer").
- **5 NIS-2 lessons** (`events/learning-path-nis2.ts`, track `nis2_duty`):
  3 CLI + 2 on the `meldung` form app. Covers what the rest of the path does not —
  reporting duty and the § 32 deadline cascade, attribution with shared accounts,
  documentation as a control, § 39 evidence.
- **9 tracks** (`events/learning-tracks.ts`): foundations (gate), linux_services,
  network_dns, windows_security, access_hardening, incident_response, **nis2_duty**,
  blackout, finale (plus the four advanced tracks).

### Skipping Foundations

`learn_00_einstufung` (`events/learning-path-einstufung.ts`) is a standalone
level — deliberately in **no** track — that demands all four Foundations skills in
one task. Passing it sets `learn_foundations_proven`, which
`isFoundationsComplete` **and** `reqsMet` accept in place of the four lessons
(`engine/learningPath.ts`). The lessons are **not** written into
`completedEvents`: the save must not claim something that did not happen. The hub
labels the track "Übersprungen — Einstufungstest bestanden".

## Scenario packs (5 packs, 45 scenarios)

`client/src/content/packs/`: internal (11), kritis-infra (12), amse-it (8),
cloud365 (7), telekom (7).

**27 of them are practically playable** — the choice opens a real terminal or a
Windows-style GUI app instead of resolving as a decision. internal, cloud365 and
telekom carry three each (they used to carry none).

Three sit at **difficulty 1** and exist for genuine newcomers: `INTERN-SC-011`
(end a hung process), `CLOUD365-SC-007` (refuse an unrequested elevation
prompt), `TELEKOM-SC-007` (find the contract sheet that is actually in force).
They are gated to `beginner` + `intermediate` via `Scenario.requiredModes` —
difficulty is not an audience, and the early-game cap is 2 in every mode, so
without the gate they would open week 1 of a 24-week KRITIS run.

### The guided beginner start

Weeks 1-3, days 1-4 of `beginner` serve a fixed sequence
(`engine/onboarding.ts`), not a draw: first working day → the three difficulty-1
cases → the four shell tutorials. Day 5 of every week stays with the regular
selection, and once the sequence is done the rule is invisible.

This is not polish. `selectNextEvent` never reads `GameEvent.probability`; it
picks `pool[hash % pool.length]`. `evt_first_day` was therefore regularly
displaced on day 1, and because the four tutorials hang off it via
`requires.events`, the whole chain broke: in 40 simulated runs **not one** of
the four tutorials was ever served. Widening their week window changed nothing —
the window was never the binding constraint.

## Guards (authoritative)

These tests fail loudly if content drifts — trust them over this document:

- `content/content.test.ts` — id uniqueness, prerequisites, `{placeholder}` audit.
- `engine/campaignConsistency.test.ts` — every chapter beat + sidequest event resolves.
- `engine/campaignBudget.test.ts` — every REGISTERED campaign reaches its ending
  within the day budget, all chapters completed (`BUDGET_TRACE=1` prints the numbers).
- `content/campaigns/campaignMenu.test.ts` — hidden ⇒ unlock code declared, visible ⇒ none;
  the picker list is derived from the registry, never hand-maintained.
- `engine/nis2TrackLessons.test.ts` — drives every NIS-2 CLI level's solution path
  through the real ShellEngine, plus a negative test each (guessing a name, skipping
  the evidence, reporting everything). The two GUI levels run end-to-end in
  `e2e/levels.spec.ts`; the three stateGoals levels are listed in
  `HARNESS_INCOMPATIBLE_LEVELS` there because `deriveCliSolution` cannot derive a
  script from declarative goals.
- `engine/learningPath.skip.test.ts` — the Foundations skip opens exactly what the
  four lessons open, and nothing more.
- `engine/packScenarioLessons.test.ts` — drives every practical pack SHELL task's
  solution path through the real ShellEngine plus three to four failure paths each
  (claim without a source, missing evidence, wrong conclusion, reporting everything).
  The negative tests matter more than the positive ones here.
- `content/packs/einstiegsSzenarien.test.ts` — the practical GUI tasks: the wrong
  process/entry/document must NOT solve, and merely selecting must not either.
  Also pins the two-solution ordering of `INTERN-SC-011` (risk before praise).
- `engine/onboarding.test.ts` + `engine/beginnerOnboarding.test.ts` — the guided
  sequence as a rule, and as a played-out 12-week run: all four tutorials served,
  order kept, day 5 untouched, no empty day before the final week.
- `content/campaigns/kataster/*.test.ts` (180) — per-act guards plus the campaign-wide
  flag-cycle check (nothing set that nobody reads, nothing read that nobody sets) and
  `levels.test.ts`: **the name of a file the player must WRITE may never contain what its
  content goal checks for** — `seedVfsFromScenario` pre-materialises every path named in
  `taskText`/`hints` and fills it with the filename, which otherwise solves the level itself.
- `engine/campaignPacing.test.ts` — the full ch01–ch12 walk is winnable, no degenerate beats.
- `content/events/chains/chainIntegrity.test.ts` — chain wiring.
- `content/packs/packs.test.ts` — scenario pack integrity.
- `engine/sidequestFlow.test.ts` — each sidequest triggers → completes → unlocks its payoff.
- `content/orthography.test.ts` — display text uses real umlauts (ä/ö/ü/ß), never
  ASCII transliterations (`fuer`, `ueber`, …). Curated stem blacklist, not a blanket
  ae/oe/ue scan. **Policy: ids, flags, tags, `{placeholder}` keys, usernames,
  hostnames, `image:` paths and file paths stay ASCII** (they are identifiers — e.g.
  `kaemmerer`, tag `passwoerter`, username `admin.mueller`, image `…-uebergabe-…`);
  only player-facing strings carry umlauts. New legit ae/oe/ue vocabulary never trips
  it; a new transliterated word may need a new stem — add it to the test when you spot one.
- `content/adventure/naming.test.ts` — no adventure id/flag references the
  pre-rename character name "thomas" (renamed to Jens/Henry/Bjorg; ids/flags were
  renamed 2026-07 without a save migration — flags were write-only and story
  progress is beat-index-based). `TELEKOM-THOMAS` and "Thomas Bergmann" are
  different characters and out of scope.
