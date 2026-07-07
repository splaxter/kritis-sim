# Sidequests: Author 3, Cut 9 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The story campaign advertises "15+ Sidequests", ships 12 sidequest *definitions*, and delivers **zero** playable sidequests — all 31 referenced `adv_sq_*` events are unauthored, and the engine's serving order means sidequests could never fire even if they existed. This plan (1) fixes the engine so sidequests actually serve, (2) fully authors the 3 sidequests with the strongest integration into the authored campaign (ch01–ch08 + already-written payoff events), (3) cuts the other 9 stubs and parks their premises in a backlog doc, (4) fixes the dishonest marketing copy, and (5) proves the whole path end-to-end with tests.

**Architecture:** Sidequest definitions live in `client/src/content/adventure/sidequests.ts` (the LIVE source scanned by `getAvailableSidequests`; `chapters[].sidequests` is empty and stays that way). Sidequest *events* are ordinary `GameEvent`s served by `getNextStoryContent` (`client/src/engine/adventureEngine.ts`) and completed via `useGame.ts`, which advances progress (`advanceSidequest`) and applies rewards (`getSidequestRewards`) when the last event of a quest resolves. Reward-hook reality check (verified against consumers):

| Hook | Engine support | Consumer | Verdict |
|---|---|---|---|
| `rewards` (flags/skills/relationships/budget/stress) | `getSidequestRewards` | `useGame.ts:154-194` | **LIVE** — keep |
| `storyEffects.unlocksDialogue` | `isDialogueUnlocked` | `eventEngine.ts:162,184` (reveals `hidden:true` choices) | **LIVE** — keep; this is the only mechanism that reveals hidden choices |
| `storyEffects.grantsAbility` | `hasAbility` | `eventEngine.ts:166` — but **no choice anywhere lists an ability id in `unlocks`**; all 4 payoff choices gate on flags | **Redundant dead content hook** — strip from kept quests, keep engine fn (eventEngine imports it) |
| `storyEffects.changesNpcBehavior` | `getNpcBehaviorState` | **none** (grep-verified) | **Dead code** — delete fn + tests, strip from content |
| `storyEffects.addsStoryBeat` | `getAddedStoryBeats` | **none** — `getNextStoryContent` never calls it; `adv_backup_available` (story-events.ts:1813) is orphaned by it | **Dead code** — delete fn + tests; only cut quests used it |

The critical engine bug: in `getNextStoryContent` (adventureEngine.ts:86-151) the current story beat returns *before* the sidequest block is reached, and the only path into the sidequest block (missing beat content) is preempted by `isAtAuthoredStoryEnd` in `App.tsx:99`. Fix: serve an active sidequest's pending event *before* the story beat, and replace the untestable `Math.random() < 0.3` start-gate (line 136) with a seeded hash (same `simpleHash` pattern as `eventEngine.ts:215` / `App.tsx:162`).

**Selection — keep these 3** (all three payoff choices are *already authored* as `hidden:true` choices; the three quests cover all three trigger categories and three distinct play styles):

1. **`sq_haunted_printer`** (3 events) — payoff `printer_connection` exists in `adv_pattern_recognition` (story-events.ts:1508, ch05 beat01, authored & reachable **today**); the printer is seeded by main story ch03 (`adv_printer_emergency`); solving it reveals the C2 server (`found_c2_server`, `major_breakthrough`) — direct main-arc foreshadowing. Only quest with **no stat gate** (chapter window ch03–ch08), so every player can meet it. Gameplay: spooky discovery comedy.
2. **`sq_network_optimization`** (2 events) — payoff `segment_network` exists in `adv_security_lockdown` (story-events.ts:1463, ch07 beat03, authored & reachable **today**); sets `network_segmented`/`contained_threat` which pay into the Act-3 crisis fiction. Skill-gated (`netzwerk ≥ 35`). Gameplay: technical diagnosis.
3. **`sq_coffee_machine`** (3 events) — payoff `coffee_speech` exists in `adv_team_rally` (story-events.ts:1383; event authored for ch10, lands when Act 3 ships); the coffee machine is already a ch02 main-story beat (`adv_coffee_machine_intro`, story-events.ts:236 — including the China-IP tie-in to the same C2 arc). Relationship-gated (`kollegen ≥ 10`, window ch02–ch04) — the early-game relationship quest. Bonus: `adventureEngine.test.ts` is already built around this quest (least test churn).

**Cut these 9** (park in backlog): `sq_thomas_secret`, `sq_chef_family`, `sq_kaemmerer_excel`, `sq_basement_server`, `sq_legacy_code`, `sq_predecessor_trail`, `sq_external_contact`, `sq_log_analysis`, `sq_password_chaos`. Rationale: `thomas_secret`/`chef_family`/`log_analysis`/`password_chaos` unlock option IDs that **don't exist** in their target events (would require editing pivotal authored beats too); `predecessor_trail`/`external_contact` unlock into ch11, which is unauthored (WIP per `campaignConsistency.test.ts` FINISHED_CHAPTERS = ch1–8); `kaemmerer_excel`/`basement_server` lean on the dead `grantsAbility`/`addsStoryBeat` hooks; `legacy_code`'s payoff sits in WIP ch09 and duplicates network_optimization's "skill-quest" slot. Note: ch10's `found_basement_server` branch stays alive after the cut — the main story also sets that flag (story-events.ts:716).

**Tech Stack:** TypeScript monorepo (npm workspaces: `client`, `server`, `shared`), Vitest. All content in German. Run tests from repo root: `npm run test:client` (builds `shared` first). Conventional commits, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer.

---

## Task 1: Park the 9 cut sidequests in a backlog doc

No code, no tests — capture the design before deleting it.

**Files:**
- Create: `docs/sidequest-backlog.md`

**Steps:**

1. Create `docs/sidequest-backlog.md`:

   ```markdown
   # Sidequest Backlog — cut in the "author 3, cut 9" rescope (2026-07-07)

   The story mode shipped 12 sidequest definitions with zero authored events.
   We kept and fully authored 3 (`sq_haunted_printer`, `sq_network_optimization`,
   `sq_coffee_machine` — see docs/plans/2026-07-07-sidequests.md). The other 9
   premises are parked here so the design work isn't lost.

   ## Cut quests (one-line premises)

   | id | Title | Premise | Blocker at cut time |
   |---|---|---|---|
   | sq_thomas_secret | Bjorg' Mining-Geheimnis | Bjorg schürft nachts heimlich Krypto im Büro; wer es entdeckt, gewinnt sein Vertrauen. | Unlock-Option `already_know` existiert nicht in `adv_thomas_confession` |
   | sq_chef_family | Der Chef hat Sorgen | Chef Bernd hat private Probleme; wer zuhört, macht ihn zum Verbündeten. | Unlock-Option `appeal_to_family` existiert nicht in `adv_chef_confrontation` |
   | sq_kaemmerer_excel | Der Excel-Albtraum | Eine 50-MB-Excel-Datei entscheidet über die Karriere des Kämmerers — und über dein Notfall-Budget. | Reward hing am toten `grantsAbility`-Hook (`emergency_budget`) |
   | sq_basement_server | Der Server im Keller | Ein vergessener Server im Keller läuft noch — und könnte das geheime Backup sein. | Hing am toten `addsStoryBeat`-Hook; Haupt-Story setzt `found_basement_server` inzwischen selbst |
   | sq_legacy_code | Archäologie im Code | Ein uraltes Skript steuert kritische Prozesse — und hat einen versteckten Kill-Switch. | Payoff (`use_legacy_knowledge` in `adv_initial_response`) liegt im unfertigen ch09 |
   | sq_predecessor_trail | Die Spur des Vorgängers | Stefan hat Post-its, Notizen und versteckte Dateien hinterlassen — er wollte gefunden werden. | Payoff-Events (`adv_predecessor_truth`, `adv_complete_picture`) liegen im unfertigen ch11 |
   | sq_external_contact | Der anonyme Tipp | Eine verschlüsselte Nachricht: Hilfe oder Falle? | Payoff (`adv_attacker_identity`) liegt im unfertigen ch11 |
   | sq_log_analysis | Die Wahrheit liegt in den Logs | Terabytes an Logs verbergen das Muster, das alles erklärt. | Unlock-Optionen `present_evidence`/`complete_picture` existieren nicht in den Ziel-Events |
   | sq_password_chaos | Das Passwort-Chaos | 7 Buchhalter vergessen am selben Tag ihr Passwort — Credential Theft. | Unlock-Option `mention_passwords` existiert nicht in `adv_insider_threat` |

   ## Parked mechanics (removed as dead code / dead content hooks)

   - `storyEffects.grantsAbility` — engine path (`hasAbility` in eventEngine) exists but
     no content ever referenced an ability id; flags cover the same need.
   - `storyEffects.changesNpcBehavior` (`getNpcBehaviorState`) — never had a consumer.
   - `storyEffects.addsStoryBeat` (`getAddedStoryBeats`) — never called by
     `getNextStoryContent`; `adv_backup_available` (story-events.ts) stays authored but
     orphaned until Act 3 work revives it.

   Reviving a quest = re-add its definition to `client/src/content/adventure/sidequests.ts`,
   author its `adv_sq_*` events in `client/src/content/adventure/sidequest-events.ts`,
   and (where noted) add the hidden payoff choice to the target story event.
   ```

2. Commit:
   ```bash
   git add docs/sidequest-backlog.md
   git commit -m "docs(story): park 9 cut sidequest premises in backlog" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 2: Cut the 9 stub sidequests, strip dead hooks, fix marketing copy

TDD anchor: `campaignConsistency.test.ts` pins the exact dangling-event set — tighten the pin first, watch it fail, then cut.

**Files:**
- Modify: `client/src/engine/campaignConsistency.test.ts` (lines 36–59: gap comment + `KNOWN_DANGLING_SIDEQUEST_EVENTS`)
- Modify: `client/src/content/adventure/sidequests.ts` (delete 9 quest objects; strip dead hooks from kept 3)
- Modify: `client/src/engine/adventureEngine.ts` (delete `getNpcBehaviorState` lines 553–572 and `getAddedStoryBeats` lines 618–639)
- Modify: `client/src/engine/adventureEngine.test.ts` (retarget cut-quest references; delete dead-hook describes)
- Modify: `client/src/content/adventure/index.ts` (line 31 marketing copy)
- Test: `client/src/engine/campaignConsistency.test.ts`, `client/src/engine/adventureEngine.test.ts`

**Steps:**

1. In `campaignConsistency.test.ts`, replace `KNOWN_DANGLING_SIDEQUEST_EVENTS` (lines 45–59) with only the kept quests' still-unauthored events, and rewrite the comment block (lines 36–44) to say the sidequest layer is being rescoped to 3 authored quests (Tasks 4–6 shrink this list to `[]`):
   ```ts
   const KNOWN_DANGLING_SIDEQUEST_EVENTS = [
     'adv_sq_coffee_1', 'adv_sq_coffee_2', 'adv_sq_coffee_3',
     'adv_sq_network_1', 'adv_sq_network_2',
     'adv_sq_printer_1', 'adv_sq_printer_2', 'adv_sq_printer_3',
   ];
   ```
2. Run and confirm the expected failure:
   ```bash
   npm run test:client -- campaignConsistency
   ```
   Expected: `tracks the dangling-sidequest-event gap` fails with the received array still containing `adv_sq_basement_1`, `adv_sq_chef_1`, `adv_complete_picture`, etc.
3. In `sidequests.ts`, delete the 9 cut quest objects (current lines: `sq_thomas_secret` 39–61, `sq_chef_family` 63–84, `sq_kaemmerer_excel` 86–107, `sq_basement_server` 114–136, `sq_legacy_code` 138–156, `sq_predecessor_trail` 183–206, `sq_external_contact` 208–228, `sq_log_analysis` 230–250, `sq_password_chaos` 278–295). Keep `sq_coffee_machine`, `sq_network_optimization`, `sq_haunted_printer` and their section comments.
4. In the 3 kept quests, strip the dead hooks: remove `grantsAbility: 'team_morale_boost'` and the `changesNpcBehavior` block from `sq_coffee_machine`; the other two keep only `unlocksDialogue` (network/printer already have nothing else). Every kept quest must keep its `unlocksDialogue` entry — it is the only mechanism that reveals the hidden payoff choices (`eventEngine.ts:184`).
5. In `adventureEngine.ts`, delete `getNpcBehaviorState` (lines 553–572) and `getAddedStoryBeats` (lines 618–639) — zero consumers, grep-verified. Keep `getUnlockedAbilities`/`hasAbility` (imported by `eventEngine.ts`).
6. In `adventureEngine.test.ts`:
   - Line 103: `sq_legacy_code` → `sq_network_optimization` with `skills: { netzwerk: 40 }` (was `linux`), still `minChapter`-compatible (`ch03_first_crisis` works for both — network's min is ch02).
   - Line 118 (flag-trigger test, used `sq_predecessor_trail`): no kept quest is flag-triggered — rewrite the test to call `checkSidequestTrigger` with an inline `SidequestDefinition` literal (it takes the definition as an argument, no registry lookup):
     ```ts
     const flagQuest: SidequestDefinition = {
       id: 'sq_test_flag', title: 't', description: 't',
       triggerCondition: { flags: ['some_flag'] },
       events: ['x'], rewards: {},
     };
     expect(checkSidequestTrigger(flagQuest, stateWithFlag)).toBe(true);
     ```
   - Line 238: drop `'sq_basement_server'` from the `completedSidequests` array (keep `sq_coffee_machine`).
   - Delete the `describe('Granted Abilities')` (lines 216–246) and `describe('NPC Behavior Changes')` (lines 248–266) blocks — they exercised the hooks stripped/deleted above.
7. In `client/src/content/adventure/index.ts` line 31, fix the claim — count-free honest wording:
   ```ts
   'Optionale Sidequests, die die Story beeinflussen',
   ```
   (Verified: no other file claims a sidequest count — `shared/src/config/gameModes.ts` has none, and `STORY_INFO` is currently exported but not rendered by any component; fix it anyway.)
8. Run green:
   ```bash
   npm run test:client
   ```
   Expected: all suites pass (campaignConsistency now matches the 8-event pin; adventureEngine tests compile against the pruned API).
9. Commit:
   ```bash
   git add client/src/content/adventure/sidequests.ts client/src/content/adventure/index.ts client/src/engine/adventureEngine.ts client/src/engine/adventureEngine.test.ts client/src/engine/campaignConsistency.test.ts
   git commit -m "refactor(story): cut 9 stub sidequests, dead reward hooks, and the 15+ claim" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 3: Engine — make sidequests actually serve (deterministically)

Verified bug: in `getNextStoryContent` an existing story beat returns at line 113 before the sidequest block (117–143) is ever reached; the only fallthrough (missing beat content) is preempted by `isAtAuthoredStoryEnd` in `App.tsx:99`. Also `Math.random() < 0.3` (line 136) is untestable and breaks the game's seeded-determinism convention (`App.tsx:135-137`).

**Files:**
- Modify: `client/src/engine/adventureEngine.ts` (`getNextStoryContent` lines 86–151; add `pickSidequestToStart` + local `simpleHash`)
- Test: `client/src/engine/adventureEngine.test.ts` (new `describe('Sidequest Serving')`)

**Steps:**

1. Write failing tests in `adventureEngine.test.ts` (reuse the file's existing state-builder helpers; stub events are plain objects — `findContent` only matches on `id`):
   ```ts
   describe('Sidequest Serving', () => {
     const stubEvent = (id: string): GameEvent => ({
       id, title: id, category: 'story', weekRange: [1, 12], probability: 1,
       description: id, involvedCharacters: [], tags: [], choices: [],
     });

     it('serves the active sidequest event BEFORE the current story beat', () => {
       // state: ch03_first_crisis, beatIndex 0, activeSidequests ['sq_haunted_printer'],
       // sidequestProgress { sq_haunted_printer: 1 }
       const events = [stubEvent('adv_printer_emergency'), stubEvent('adv_sq_printer_2')];
       const result = getNextStoryContent(state, events, []);
       expect(result.type).toBe('sidequest');
       expect((result.content as GameEvent).id).toBe('adv_sq_printer_2');
     });

     it('falls back to the story beat when no sidequest is active or startable', () => {
       // same state but no active quests and no available quests (relationships/skills 0, ch01)
       expect(getNextStoryContent(state, events, []).type).toBe('story');
     });

     it('pickSidequestToStart is deterministic for a given state', () => {
       const a = pickSidequestToStart(state);
       const b = pickSidequestToStart(state);
       expect(a?.id).toBe(b?.id); // includes the both-null case
     });
   });
   ```
2. Run and confirm failure:
   ```bash
   npm run test:client -- adventureEngine
   ```
   Expected: `serves the active sidequest event BEFORE the current story beat` fails with `expected 'story' to be 'sidequest'`; `pickSidequestToStart` fails to compile/import (not exported yet).
3. Implement in `adventureEngine.ts`:
   - Add a private `simpleHash(str: string): number` (copy the 8-line helper from `eventEngine.ts:215-223` — third copy in the codebase; acceptable, it's the established pattern).
   - Export `pickSidequestToStart(state: GameState): SidequestDefinition | null`: compute `hash = simpleHash(state.seed + state.currentWeek + state.currentDay + state.completedEvents.length + 'sq')`; return `null` if `hash % 100 >= 30`; else return `available[hash % available.length]` from `getAvailableSidequests(state)` (null if empty).
   - Restructure `getNextStoryContent`: (a) if `advState.activeSidequests[0]` has a pending authored event (`progress < events.length` and `findContent` hits), return it as `type: 'sidequest'` — *before* the story-beat block; (b) else if `pickSidequestToStart(state)` returns a quest whose `events[0]` resolves, serve that; (c) else serve the current story beat exactly as today; (d) keep the existing missing-content/chapter-complete fallthrough. Delete the old lines 117–143 (`Math.random` block). Quest chains are ≤3 events, so the story pauses at most 3 days — intended "interruption" pacing; `useGame.ts:152-198` already routes sidequest-event completion to `advanceSidequest` instead of `advanceStoryBeat`, so progression needs no change.
4. Run green:
   ```bash
   npm run test:client -- adventureEngine campaignConsistency
   ```
5. Commit:
   ```bash
   git add client/src/engine/adventureEngine.ts client/src/engine/adventureEngine.test.ts
   git commit -m "fix(story): serve active sidequests before story beats, seeded start gate" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 4: Author `sq_haunted_printer` (3 events) + wire the new content file

New file so sidequest events never leak into free-play's `selectNextEvent(allEvents, …)` pool; wired into the two story-mode consumers.

**Files:**
- Create: `client/src/content/adventure/sidequest-events.ts`
- Modify: `client/src/App.tsx` (line 94: `combinedEvents`)
- Modify: `client/src/content/adventure/index.ts` (add export)
- Modify: `client/src/engine/campaignConsistency.test.ts` (line 10 universe + remove 3 printer ids from `KNOWN_DANGLING_SIDEQUEST_EVENTS`)

**Steps:**

1. TDD anchor: remove `'adv_sq_printer_1'`, `'adv_sq_printer_2'`, `'adv_sq_printer_3'` from `KNOWN_DANGLING_SIDEQUEST_EVENTS`, and add the new (still empty-ish) file to the test universe:
   ```ts
   import { adventureSidequestEvents } from '../content/adventure/sidequest-events';
   const storyEvents: GameEvent[] = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];
   ```
   Run `npm run test:client -- campaignConsistency` — expected failure: received array still contains the three `adv_sq_printer_*` ids (module not found first; create the file skeleton, then see the pin failure).
2. Create `sidequest-events.ts` with header + the three printer events. **Fully-written example (event 1) — this exact voice/shape** (matches `adv_pattern_recognition` / `adv_coffee_machine_intro`: `category: 'story'`, `probability: 1`, `weekRange` = quest window, **Name**-dialogue, ≥2 ungated choices, `setsFlags` feeding the next scene):

   ```ts
   /**
    * Adventure Mode Sidequest Events
    * Kept separate from story-events.ts so they never enter the free-play pool.
    */
   import { GameEvent } from '@kritis/shared';

   export const adventureSidequestEvents: GameEvent[] = [
     // ── sq_haunted_printer ────────────────────────────────────────────────
     {
       id: 'adv_sq_printer_1',
       title: 'Der Druckergeist',
       category: 'story',
       weekRange: [3, 8],
       probability: 1,
       description: `Frau Weber steht mit einem Stapel Papier vor deinem Schreibtisch. Sie sieht aus, als hätte sie schlecht geschlafen.

   "Der Drucker im dritten Stock", sagt sie. "Er druckt. Nachts. Von selbst."

   Auf den Blättern: Rechnungen. Ordentlich formatiert, mit Briefkopf. Absender: "Meridian Logistik GmbH". Du hast den Namen noch nie gehört - und Google auch nicht.

   **Bjorg** (ohne vom Monitor aufzuschauen): "Der Drucker ist verflucht. Stefan hat das auch gesagt. Ich fasse das Ding nicht an."

   **Frau Weber**: "Gestern Nacht waren es 34 Seiten. Der Hausmeister hat sie um sechs Uhr früh im Ausgabefach gefunden."`,
       involvedCharacters: ['kollege'],
       tags: ['story', 'sidequest', 'printer', 'mystery'],
       choices: [
         {
           id: 'check_logs',
           text: 'Das Drucker-Webinterface öffnen und die Job-Historie prüfen',
           effects: { skills: { troubleshooting: 3 } },
           resultText: 'Die Historie ist... gelöscht. Komplett. Aber im Fehlerprotokoll steht ein Eintrag: Jeder Nachtdruck kommt exakt um 23:47. Die Zahl kommt dir bekannt vor.',
           setsFlags: ['printer_logs_checked'],
         },
         {
           id: 'ask_around',
           text: 'Erst mal fragen: Wer hat Zugriff auf den Drucker?',
           effects: { relationships: { fachabteilung: 5 } },
           resultText: '"Alle", sagt Frau Weber. "Er hängt im Netzwerk." Bjorg murmelt: "Genau wie die Kaffeemaschine." Ihr schaut euch an.',
           setsFlags: ['printer_asked_around'],
         },
         {
           id: 'unplug',
           text: 'Kurzer Prozess: Netzstecker ziehen, Problem gelöst',
           effects: { relationships: { fachabteilung: -5 }, stress: -5 },
           resultText: 'Ruhe. Bis um 9:15 der Chef anruft: "Warum druckt hier nichts?!" Du steckst ihn wieder ein. Das Problem ist nicht weg - es wartet nur.',
         },
       ],
     },
     // adv_sq_printer_2, adv_sq_printer_3: siehe Szenen-Briefs unten
   ];
   ```

   **Scene briefs for the remaining two (write in the same voice, ≥2 ungated choices each):**
   - `adv_sq_printer_2` — *"Nachtschicht"*: Der Spieler bleibt bis 23:47. Der Drucker erwacht — und im selben Moment blinkt Traffic auf dem Switch-Port. Choices: (a) den Netzwerk-Traffic mitschneiden (`skills: netzwerk/security`, `setsFlags: ['printer_traffic_captured']`), (b) sich die gedruckte Rechnung genau ansehen — auf dem Briefkopf steht eine IP-Adresse als "Kundennummer" (`setsFlags: ['printer_invoice_clue']`), (c) Bjorg um Mitternacht anrufen (Comedy, `relationships: kollegen +10`, er kommt mit Weihwasser UND einem Laptop).
   - `adv_sq_printer_3` — *"Kein Geist"*: Auflösung. Der Drucker hat ein manipuliertes Firmware-Update — er ist ein Testballon: jemand prüft, ob im Haus jemand auf stille Anomalien reagiert. Choices: (a) Firmware neu flashen und den Fund dokumentieren (`skills: security +5`, `setsFlags: ['printer_cleaned']`), (b) den Drucker als Honeypot weiterlaufen lassen und den Port überwachen (`skills: netzwerk +5`, `setsFlags: ['printer_honeypot']`), (c) Frau Weber & den Kollegen die Geschichte erzählen (`relationships: kollegen +10, fachabteilung +5`). Result-Texte müssen auf die spätere Erkenntnis in `adv_pattern_recognition` ("Das war kein Geist - das war ein Test!") vorausdeuten, sie aber NICHT vorwegnehmen — die C2-Verbindung zieht erst der Payoff-Choice.

3. Wire consumers:
   - `App.tsx` line 94: `const combinedEvents = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];` (+ import).
   - `index.ts`: `export { adventureSidequestEvents } from './sidequest-events';`
4. Run green:
   ```bash
   npm run test:client -- campaignConsistency
   ```
   Expected: dangling pin now equals the remaining 5 ids (coffee + network).
5. Commit:
   ```bash
   git add client/src/content/adventure/sidequest-events.ts client/src/content/adventure/index.ts client/src/App.tsx client/src/engine/campaignConsistency.test.ts
   git commit -m "feat(story): author sq_haunted_printer sidequest events" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 5: Author `sq_network_optimization` (2 events)

**Files:**
- Modify: `client/src/content/adventure/sidequest-events.ts`
- Modify: `client/src/engine/campaignConsistency.test.ts` (remove `adv_sq_network_1/2` from the pin)

**Steps:**

1. Remove the two network ids from `KNOWN_DANGLING_SIDEQUEST_EVENTS`; run `npm run test:client -- campaignConsistency` → expected failure: received array still contains `adv_sq_network_1`, `adv_sq_network_2`.
2. Author both events in `sidequest-events.ts` (`weekRange: [2, 12]`, same voice, ≥2 ungated choices):
   - `adv_sq_network_1` — *"Der Flaschenhals"*: Beschwerden aus allen Abteilungen, das Netz kriecht. Der Spieler (Netzwerk-Skill ≥ 35 hat den Quest getriggert) sieht sofort: Das ist kein Bandbreitenproblem, das ist Topologie. Choices: (a) systematisch messen — Port für Port (`skills: netzwerk +3`, `setsFlags: ['network_measured']`), (b) den alten Netzwerkplan von Stefan suchen — er hat Anmerkungen hinterlassen: "Alles hängt an EINEM Switch. Warum?" (`setsFlags: ['found_stefans_netplan']`), (c) Bjorg fragen — "Historisch gewachsen" ist seine ganze Antwort (Comedy, `relationships: kollegen +5`).
   - `adv_sq_network_2` — *"Ein Netz, ein Switch, ein Problem"*: Der Engpass ist ein einziger unmanaged Switch im Flur-Schrank — ALLES läuft da durch, auch Kaffeemaschine und Drucker. Kein Segment, keine Trennung, ein flaches Netz. Choices: (a) VLANs planen und den Switch ersetzen (`skills: netzwerk +5, security +3`, `setsFlags: ['network_replanned']`), (b) erst dokumentieren, dann dem Chef ein Budget abringen (`relationships: chef +5`, `setsFlags: ['network_documented']`). Result-Texte säen das Wissen, das der Payoff-Choice `segment_network` in `adv_security_lockdown` (ch07) erntet: "Du weißt jetzt genau, wo die Schwachstellen sind."
3. Run green: `npm run test:client -- campaignConsistency` (pin = 3 coffee ids).
4. Commit:
   ```bash
   git add client/src/content/adventure/sidequest-events.ts client/src/engine/campaignConsistency.test.ts
   git commit -m "feat(story): author sq_network_optimization sidequest events" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 6: Author `sq_coffee_machine` (3 events)

**Files:**
- Modify: `client/src/content/adventure/sidequest-events.ts`
- Modify: `client/src/engine/campaignConsistency.test.ts` (pin → `[]`)

**Steps:**

1. Empty `KNOWN_DANGLING_SIDEQUEST_EVENTS` to `[]`; run `npm run test:client -- campaignConsistency` → expected failure listing the 3 coffee ids.
2. Author the three events (`weekRange: [2, 4]`, ≥2 ungated choices). Continuity: builds directly on `adv_coffee_machine_intro` (ch02 beat — Maschine redet mit China-IP) and pays off in `adv_team_rally`s `coffee_speech`:
   - `adv_sq_coffee_1` — *"Der Kaffeemaschinenflüsterer"*: Die Maschine hat wieder nachts Espresso gekocht. 47 Tassen. Frau Weber droht mit Filterkaffee aus der Thermoskanne — die Moral im Haus kippt. Choices: (a) das Webinterface der Maschine aufrufen (Default-Passwort "admin/admin" — natürlich; `skills: security +2`, `setsFlags: ['coffee_webui_found']`), (b) Wireshark anwerfen und zuhören, WAS sie nach China schickt (`skills: netzwerk +2`, `setsFlags: ['coffee_traffic_seen']`), (c) erst mal einen Kaffee trinken und nachdenken (Comedy; die Maschine macht perfekten Cappuccino, als wüsste sie, dass du ermittelst).
   - `adv_sq_coffee_2` — *"Telemetrie mit Sahne"*: Die Maschine sendet "Nutzungsstatistiken" — inklusive Uhrzeiten, an denen Leute im Gebäude sind. Das ist keine Kaffee-Statistik, das ist ein Bewegungsprofil. Choices: (a) die Cloud-Anbindung kappen und die Maschine ins Gäste-VLAN sperren (`skills: security +3`, `setsFlags: ['coffee_isolated']`), (b) dem Hersteller eine harte Support-Mail schreiben (`relationships: fachabteilung +5`, Comedy-Antwort: "Das ist ein Feature"), (c) Bjorg zeigen — er wird blass: "Stefan hatte recht." (`relationships: kollegen +10`, `setsFlags: ['coffee_thomas_told']`).
   - `adv_sq_coffee_3` — *"Der beste Kaffee der Verwaltung"*: Finale — die Maschine läuft offline, gepatcht, im eigenen Netz-Segment. Und sie kocht immer noch. Die Kollegen taufen dich inoffiziell zum "Kaffeemaschinenflüsterer". Choices: (a) eine kleine Doku für den Pausenraum aushängen ("So erkennt ihr IoT-Geräte, die zu viel reden"; `skills: softSkills +3`, `setsFlags: ['coffee_doku_posted']`), (b) den Moment genießen — erster echter Team-Erfolg (`relationships: kollegen +10`, `stress: -5`, `setsFlags: ['coffee_team_moment']`). Result-Texte legen die emotionale Basis für die `coffee_speech` in `adv_team_rally` ("Erinnert ihr euch an die Kaffeemaschine?").
3. Run green: `npm run test:client` — the pin test now expects `[]` and passes; **all 31 dangling refs are resolved** (8 authored, 23 removed with the cut quests).
4. Commit:
   ```bash
   git add client/src/content/adventure/sidequest-events.ts client/src/engine/campaignConsistency.test.ts
   git commit -m "feat(story): author sq_coffee_machine sidequest events — sidequest gap closed" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 7: Rescale the good-ending gate to the 3-quest reality

`determineEnding` (`shared/src/types/adventure.ts:253`) requires `completedSidequests >= 3` for the good ending — with 12 quests that was lenient; with exactly 3 total (one behind an expiring ch02–ch04 window and a seeded 30 % start gate) it would luck-gate the best ending. Require 2 of 3.

**Files:**
- Modify: `shared/src/types/adventure.ts` (line 253)
- Test: `client/src/engine/adventureEngine.test.ts` (new `describe('Ending Gate')`)

**Steps:**

1. Failing test (import `determineEnding` from `@kritis/shared`):
   ```ts
   describe('Ending Gate', () => {
     it('grants the good ending with 2 of 3 sidequests at high score', () => {
       expect(determineEnding(75, 2, 'hero')).toBe('good');
     });
     it('still requires sidequest engagement for the good ending', () => {
       expect(determineEnding(75, 1, 'hero')).not.toBe('good');
     });
   });
   ```
   Run `npm run test:client -- adventureEngine` → expected failure: `expected 'neutral' to be 'good'`.
2. Change line 253: `if (score >= 70 && completedSidequests >= 2) {`.
3. Run green: `npm run test:client` (root command rebuilds `shared` first — required for the change to reach the client).
4. Commit:
   ```bash
   git add shared/src/types/adventure.ts client/src/engine/adventureEngine.test.ts
   git commit -m "fix(story): good ending requires 2 of 3 sidequests, not all" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 8: End-to-end verification — trigger → serve → complete → reward → payoff

One test per kept quest proving the full chain with the real content and real engine functions (no stubs).

**Files:**
- Create: `client/src/engine/sidequestFlow.test.ts`
- Test: itself

**Steps:**

1. Write the suite. Shape (use `createInitialAdventureState()` from `@kritis/shared` and the state-builder pattern from `adventureEngine.test.ts`; `combined = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents]`):
   ```ts
   describe.each([
     {
       quest: 'sq_haunted_printer',
       chapter: 'ch03_first_crisis',
       setup: (s: GameState) => s, // no stat gate
       payoff: { eventId: 'adv_pattern_recognition', optionId: 'printer_connection' },
     },
     {
       quest: 'sq_network_optimization',
       chapter: 'ch02_settling_in',
       setup: (s) => ({ ...s, skills: { ...s.skills, netzwerk: 35 } }),
       payoff: { eventId: 'adv_security_lockdown', optionId: 'segment_network' },
     },
     {
       quest: 'sq_coffee_machine',
       chapter: 'ch02_settling_in',
       setup: (s) => ({ ...s, relationships: { ...s.relationships, kollegen: 10 } }),
       payoff: { eventId: 'adv_team_rally', optionId: 'coffee_speech' },
     },
   ])('sidequest end-to-end: $quest', ({ quest, chapter, setup, payoff }) => {
     it('triggers, serves every event in order, applies rewards, unlocks the payoff dialogue', () => {
       // 1. TRIGGER: setup state in `chapter`; expect getAvailableSidequests to contain `quest`.
       // 2. SERVE: mark quest active; for progress 0..events.length-1 assert
       //    getNextStoryContent(state, combined, []) returns { type: 'sidequest' }
       //    with content.id === definition.events[progress], then advanceSidequest.
       // 3. COMPLETE + REWARD: after the last event, completedSidequests includes quest;
       //    apply getSidequestRewards(quest) and assert its flags/skills/relationships
       //    values match the definition (e.g. coffee: relationships.kollegen === 20,
       //    flags contains 'coffee_hero').
       // 4. PAYOFF: isDialogueUnlocked(state, payoff.eventId, payoff.optionId) === true,
       //    and getVisibleChoices(findEvent(payoff.eventId), storyModeState)
       //    includes the hidden choice (import from eventEngine).
       // 5. NEGATIVE: a fresh state without the quest completed must NOT show the
       //    hidden choice (getVisibleChoices excludes payoff.optionId).
     });
   });
   ```
2. Run:
   ```bash
   npm run test:client -- sidequestFlow
   ```
   Expected first run: any failure here is a real integration bug from Tasks 3–6 (e.g. step 2 serving order, or a typo'd event id) — fix the *implementation*, not the test, until green.
3. Full suite green: `npm run test:client`
4. Commit:
   ```bash
   git add client/src/engine/sidequestFlow.test.ts
   git commit -m "test(story): end-to-end sidequest flow — trigger, serve, reward, payoff unlock" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 9: Final verification

**Files:** none (verification only)

**Steps:**

1. Full test suite from repo root:
   ```bash
   npm run test
   ```
   Expected: all workspaces pass, including `campaignConsistency` with `KNOWN_DANGLING_SIDEQUEST_EVENTS = []`.
2. Type-check via build:
   ```bash
   npm run build
   ```
3. Manual smoke (optional but recommended): `npm run dev`, start story mode, use the dev seed to reach ch03; verify a printer sidequest event serves between beats and its choices resolve. Verify the intro screen shows the new "Optionale Sidequests…" wording if/where `STORY_INFO.features` is rendered.
4. Done-check against the goal: 3 quests fully authored (8 events), 9 cut + parked in `docs/sidequest-backlog.md`, marketing copy honest, engine serves sidequests deterministically, dead hooks removed, e2e test locks the whole path.
