# Content Inventory

_Verified against the codebase on 2026-07-09. Counts are top-level content
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
| Story: Die Probezeit | `story` | 12 | 4 | 1.0 | 12-chapter campaign, 3 endings |
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

## Story campaign "Die Probezeit"

- **12 chapters** (`adventure/chapters.ts`), fully authored ch01–ch12.
- **3 endings** (`adventure/endings.ts`): good / neutral / bad, chosen by a
  score (good ≥ 65, neutral ≥ 35, bad < 35).
- **6 sidequests** (`adventure/sidequests.ts`): sq_coffee_machine,
  sq_network_optimization, sq_haunted_printer, sq_legacy_code,
  sq_predecessor_trail, sq_external_contact. Each unlocks a hidden payoff
  dialogue in the main story. Six more premises remain parked in
  `docs/sidequest-backlog.md`.

## Learning content (31 lessons across 8 tracks)

- **16 CLI lessons** (`events/learning-path.ts`) on the shell engine.
- **10 GUI levels** (`events/gui-levels.ts`) across the six fake-Windows apps
  (taskmanager, eventviewer, uac, settings, explorer, corefirewall).
- **5 Blackout levels** (`events/blackout.ts`, "Operation Dunkelkammer").
- **8 tracks** (`events/learning-tracks.ts`): foundations (gate), linux_services,
  network_dns, windows_security, access_hardening, incident_response, blackout,
  finale.

## Scenario packs (5 packs, 42 scenarios)

`client/src/content/packs/`: internal (10), kritis-infra (12), amse-it (8),
cloud365 (6), telekom (6).

## Guards (authoritative)

These tests fail loudly if content drifts — trust them over this document:

- `content/content.test.ts` — id uniqueness, prerequisites, `{placeholder}` audit.
- `engine/campaignConsistency.test.ts` — every chapter beat + sidequest event resolves.
- `engine/campaignPacing.test.ts` — the full ch01–ch12 walk is winnable, no degenerate beats.
- `content/events/chains/chainIntegrity.test.ts` — chain wiring.
- `content/packs/packs.test.ts` — scenario pack integrity.
- `engine/sidequestFlow.test.ts` — each sidequest triggers → completes → unlocks its payoff.
