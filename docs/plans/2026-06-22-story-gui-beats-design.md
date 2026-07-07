# Design: Story-mode GUI beats

**Date:** 2026-06-22
**Status:** Approved — ready for implementation plan
**Author:** Level design (with Claude)

## Problem

The 8 Windows GUI levels (`client/src/content/events/gui-levels.ts`) are
`requiredModes: ['learning']` and gated behind `learn_*` lesson prerequisites,
so they only appear in Learning mode. Story mode is therefore CLI/narrative only,
which players find monotonous ("nur CLI ist zu langweilig"). We want hands-on
Windows-GUI moments in Story mode too — but without turning Story into Learning.

## Key architectural finding (drove the design)

Story mode does **not** draw from the `weekRange` / `requiredModes` event pool.
`App.tsx:102` calls `getNextStoryContent` (adventureEngine) and returns before
ever reaching `selectNextEvent`. `getNextStoryContent` plays the current
chapter's `storyBeats` by `eventId`, plus defined sidequests — nothing else.

Consequences:
- A `requiredModes: ['story']` + `weekRange` event would **never** surface in
  Story mode. The "sprinkled pool content" approach is impossible here.
- To appear in Story mode, content must be a **chapter beat** (an entry in a
  chapter's `storyBeats` referencing an event by id) or a sidequest event.
- `requiredModes` / `weekRange` are irrelevant for these events; the chapter
  system looks events up by id via `findContent`, bypassing pool filtering.

The chapter spine already provides perfect anchors (`adventure/chapters.ts`):
`ch05_coincidence` has `adv_pattern_recognition`; `ch08_calm_before` has
`adv_preparation_check`; `ch09_attack` has `adv_ransomware_strike`.

## Design principles

- **Narrative-first.** Story stays a story. GUI beats are *evidence/action*
  moments ("inspect the system yourself"), not training inserts.
- **Soft enrichments, never structural splits.** A GUI beat never hard-blocks
  progress and never forks the route. It is an optional beat with an
  inspect-vs-delegate choice; either choice completes the beat.
- **Three beats forming a mini-arc:** detect → harden → contain.
- **Learning content untouched.** New `adv_gui_*` events; the `gui_*` learning
  levels and their tests are unchanged.

## The three beats

| # | Role | Event id | Chapter | Placed after | App |
|---|------|----------|---------|--------------|-----|
| 1 | Detect | `adv_gui_eventviewer_probe` | `ch05_coincidence` (Act 2) | `adv_pattern_recognition` | Event Viewer |
| 2 | Harden | `adv_gui_settings_preharden` | `ch08_calm_before` (Act 2) | `adv_preparation_check` | Windows Security (settings) |
| 3 | Contain | `adv_gui_taskmanager_attack` | `ch09_attack` (Act 3) | `adv_ransomware_strike` | Task Manager |

**Beat 1 — Detect (Event Viewer).** In the Act-2 "coincidences" thread the
player inspects DC01 security logs and *personally* finds the failed→successful
login pattern: the attacker probing. Story-tuned scenario (WARM hostnames/dates),
not the learning brute-force data verbatim. Copy is self-contained to the act —
it does **not** assume any specific preceding random event (e.g. the Sophos
false-positive is at most a flavor callback, never the premise).

**Beat 2 — Harden (Windows Security).** The "calm before the storm" hardening
check: verify Defender / Tamper Protection / Firewall on a key server ahead of
the KRITIS pressure. Prevention framing (no breach yet), distinct from the
learning `gui_settings_reharden` (post-incident).

**Beat 3 — Contain (Task Manager).** The ransomware strike is live: a process is
encrypting files. The player finds and ends the malicious process while sparing
critical system processes. Most visceral/visual beat — deliberately a different
app from Beat 1 for variety and to embody "contain." Authored ready-to-go;
reachable once `ch09_attack` is live.

## Soft-gate choice structure (every beat)

Each event offers ≥2 ungated choices (also satisfies the project's
≥2-ungated-options rule):

- **Inspect / act** (`guiCommand: true`) → opens the `WindowsLevel` GUI. On
  solve: evidence flag + full skill reward.
- **Delegate / trust the report** → narrative-only; smaller reward, **no**
  evidence flag.
- Beat 3 may add a third blunt option ("Stecker ziehen") — contains the incident
  but costs forensics/uptime; still completes the beat, no evidence flag.

The beat is `isOptional: true`. "Soft" therefore holds at two layers: the beat
is optional for chapter completion, and within the beat the GUI is one choice
among narrative alternatives.

## Evidence-flag arc (soft continuity via `briefingVariants`)

Flags only *strengthen* later beats; their absence never blocks anything.

```
B1 solve → sets story_saw_intrusion
        → B2 briefingVariant: references the probing the player already saw
B2 solve → sets story_hardened
        → B3 briefingVariant: Defender survived, Tamper Protection slowed the
          attacker → the malicious process is obvious / containment is cleaner
B3 solve → sets story_incident_contained
        → optional single nod in a later KRITIS-audit / Probezeit outcome
```

Continuity uses `guiContext.briefingVariants` (already rendered at
`GameScreen/index.tsx:101` and test-guarded). **No** branched alternate events
for B3 — a full alternate would make the arc heavier than warranted and add
another campaign-consistency surface. Same containment beat; different
context/difficulty/framing when `story_hardened` is set.

Constraint honored: `guiLearningIntegration.test.ts:118` requires every
`briefingVariant` flag to be set by some GUI solution. `story_saw_intrusion` and
`story_hardened` originate from B1/B2 solutions, so the constraint holds.

## Mechanics / files touched

- **`client/src/content/adventure/story-events.ts`** — author the 3 new
  `adv_gui_*` events in the `adventureStoryEvents` array (alongside the existing
  `adv_*` beats). Each has `guiContext` (reusing the existing `WindowsLevel`
  apps: `eventviewer`, `settings`, `taskmanager`), inspect+delegate choices,
  `briefingVariants` for continuity, and solution `setsFlags` for the arc.
- **`client/src/content/adventure/chapters.ts`** — add one
  `{ id, eventId, isOptional: true }` beat to `ch05_coincidence`,
  `ch08_calm_before`, `ch09_attack` at the positions above.
- No changes to `gui-levels.ts`, `eventEngine.ts`, or the learning levels.
- No `requiredModes`, no `weekRange` reliance, no hard `requires` gates.

## Testing

- **New test** (mirroring `guiLearningIntegration`): the 3 `adv_gui_*` beats are
  reachable in a Story playthrough of their chapters, and never appear in a
  Learning run.
- **Existing guards must stay green:** `campaignConsistency.test.ts` (story
  well-formedness), `guiLearningIntegration.test.ts` (briefingVariant-flag
  origin + learning ordering — unaffected since new events are story-only).
- Typecheck + full client suite green.

## Risks

- **Act 3 authoring depth.** Beat 3 lives in `ch09_attack`; if ch09 isn't fully
  playable yet, Beat 3 won't be reachable until Act 3 ships. Authored anyway so
  it's ready. Beats 1 & 2 (Act 2) are reachable now.
- **briefingVariant flag origin** — covered by honoring the existing test
  constraint above.

## Not doing (YAGNI)

- No shared-`guiContext` extraction/refactor.
- No changes to learning levels or the event-pool engine.
- No new chapter/act machinery.
- No deep cross-chapter consequence web beyond the 3-flag arc + one optional nod.
- No branched alternate events.
