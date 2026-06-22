# Learning Path: Topic/Track Hub — Design

**Date:** 2026-06-22
**Status:** Approved (design); implementation plan to follow
**Author:** Level designer + Claude

## Problem

Learning mode is a single hidden linear chain: `learn_01 → … → learn_11_final_boss`,
each level gated by `requires.events` on the previous one, auto-served by
`selectNextEvent`. There is no way for a player to choose *what* to learn. Learning
now has real didactic content across several skill domains, so the linearity feels
like a hidden campaign rather than a curriculum.

**Goal:** make the learning path granular so the player can choose which topic to
dive into, without losing the genuine prerequisite/skill progression.

## Decisions (locked)

1. **Selection model: Topic/Track Hub.** A hub screen lists topic tracks; within a
   track levels stay ordered. A free "level grid" is explicitly *out of scope* (it
   invites bypassing the structure). Optional later: an "Alle Lektionen" debug view.
2. **Gating: short Foundations gate, then parallel tracks.** A mandatory ~4-lesson
   Foundations prologue; after it, all tracks open in parallel. Order is strict
   *within* a track; cross-track gates are kept only where pedagogically real.
3. **In-track flow: auto-advance with hub always reachable.** After solving a level
   the Result screen shows an explicit primary CTA (no surprise screen-switch):
   continue in track, return to hub, or start the Finale. Hub is reachable from the
   header/pause context, not as an abort button inside the live work area.
4. **Recommendation: intent first, completion second.** "Nächste empfohlene Lektion"
   prefers the in-progress track the player last actively chose (`lastTrackId`), not
   the track closest to completion.

## Track mapping (all 26 learning levels)

`★` = advanced/optional (excluded from a track's *core* completion).

| Track | id | Levels (in order) |
|---|---|---|
| **Grundlagen** (Foundations, gate) | `foundations` | `learn_01_awakening` → `learn_02_hidden_notes` → `learn_03_forensics` → `learn_04_grep_hunter` |
| **Linux & Services** | `linux_services` | `learn_05_pipe_filter` → `learn_06_zombie_hunt` → `learn_07_necromancer` → ★`learn_adv_phantom_storage` |
| **Netzwerk & DNS** | `network_dns` | `learn_08_network_recon` → ★`learn_adv_dns_splitbrain` → ★`gui_eventviewer_cert_expiry` ("Namensauflösung und Vertrauen") |
| **Windows-Sicherheit** | `windows_security` | ★`learn_09_windows_realm` (optional lead-in) · `gui_taskmanager_rogue`→`gui_taskmanager_doppelganger` · `gui_eventviewer_bruteforce`→`gui_eventviewer_persistence` · `gui_uac_unsigned_exe`→`gui_uac_legit_install` · `gui_settings_reharden` |
| **Access & Hardening** ("Wer darf was?") | `access_hardening` | `gui_explorer_open_share` → `gui_explorer_auth_users` → `learn_adv_ssh_orphan` → `learn_adv_cron_privesc` |
| **Incident Response** | `incident_response` | `learn_10_incident_boss` → ★`learn_adv_evidence_first` |
| **Finale** (graduation) | `finale` | `learn_11_final_boss` (hub-gated, not flag-gated) |

### Placement rationale
- `learn_09_windows_realm` (PowerShell CLI) is an **optional** lead-in to
  Windows-Sicherheit and gates nothing — GUI-Windows learners aren't forced through
  PowerShell first.
- Explorer-ACL levels live in **Access & Hardening** (concept grouping: least
  privilege / access lifecycle) rather than Windows-Sicherheit (app grouping).
- `gui_eventviewer_cert_expiry` stays in **Netzwerk & DNS** as an applied node
  (TLS/certs sit close to DNS/web trust) and keeps that track from being thin.
- `learn_11_final_boss` is a **cross-track graduation**, not an IR capstone.

## Architecture

### A. Approach: explicit track registry (chosen)
A new `LEARNING_TRACKS` registry layered over the existing events — mirrors the
`adventureChapters` pattern. Events keep their definitions; the registry adds
*grouping, order, and recommendation priority*. Rejected: per-event `track` metadata
(pollutes shared `GameEvent`, scatters ordering) and tag-derived tracks (fragile, no
reliable order).

`requires.events` remains the **single source of truth for unlocking**; the registry
adds display/order/recommendation only.

### B. Shared types (`shared/src/types/learning.ts`)
```ts
interface LearningTrackLevel { eventId: string; optional?: boolean; } // optional = ★ advanced
interface LearningTrack {
  id: string; title: string; icon?: string; description?: string; order: number;
  isFoundations?: boolean; isFinale?: boolean;
  unlockAfterTracksCompleted?: number; // finale only
  levels: LearningTrackLevel[];
}
interface LearningState { lastTrackId?: string; }
```
`GameState` gains `learningState?: LearningState` (initialized when mode is learning),
parallel to `storyState`. `lastTrackId` is the only non-derivable bit; everything else
(done/available/completed) is derived from `completedEvents` + registry.

### C. Registry (`client/src/content/events/learning-tracks.ts`)
`LEARNING_TRACKS: LearningTrack[]` encoding the table above. Foundations is the first
track with `isFoundations: true`; Finale is a single-level track with
`isFinale: true, unlockAfterTracksCompleted: 3`.

### D. `requires.events` rewrite (`learning-path.ts`, `gui-levels.ts`)
Make order track-internal; gate every non-Foundations track-entry on the Foundations
exit level. The **Foundations exit is derived from the registry**
(`getFoundationsExitLevelId(LEARNING_TRACKS)`); `requires.events` may point at
`learn_04_grep_hunter` in practice, but hub/tests read the registry as source of truth.

Loosen ~9 historical cross-track gates:
- `learn_08_network_recon` → Foundations exit
- `gui_taskmanager_doppelganger` drop `learn_07`
- `gui_eventviewer_persistence` drop `learn_06`
- `gui_uac_legit_install` drop `learn_08`
- `gui_settings_reharden` → `gui_eventviewer_persistence`
- `gui_explorer_open_share` → Foundations exit
- `gui_eventviewer_cert_expiry` → `learn_adv_dns_splitbrain`
- `learn_10_incident_boss` → Foundations exit
- `learn_adv_ssh_orphan` → `gui_explorer_auth_users`; `learn_adv_cron_privesc` → `learn_adv_ssh_orphan`

Keep the genuinely-pedagogical gates: `dns_splitbrain`←`08`, `auth_users`←`open_share`,
`doppelganger`←`rogue`, `persistence`←`bruteforce`, `evidence_first`←`incident_boss`.

`learn_09_windows_realm` gates on Foundations only and gates **nothing**.

**Finale:** hub-gated. `isFinaleUnlocked(state)` is true when **≥3 core tracks
(excluding Foundations) are complete**. `learn_11_final_boss.requires` keeps only the
Foundations gate as a safety net; the graduation rule lives in `isFinaleUnlocked`.

### E. Engine (`client/src/engine/learningPath.ts`, pure functions)
- `getFoundationsExitLevelId(tracks)` → last level id of the foundations track.
- `getTrackState(track, state)` → `locked | available | in_progress | completed`
  (locked = Foundations not done; completed = all *core* levels done).
- `getTrackProgress(track, state)` → `{ doneCore, totalCore, levels: [{id, state}] }`.
- `getNextInTrack(track, state)` → first not-done level whose `requires` are met.
- `getRecommendedNext(state)` priority:
  1. Foundations incomplete → next Foundations level.
  2. An in-progress track exists → its `getNextInTrack`. Multiple in-progress →
     `lastTrackId`; if absent, registry order (fallback).
  3. Else → first not-started unlocked track in registry order.
  4. All core tracks done → Finale (if unlocked & not done) → ★ advanced nodes → done.
- `isFinaleUnlocked(state)` → `completedCoreTracks (excl. Foundations) >= 3`.

### F. Flow wiring (`App.tsx`, `useGame.ts`, `GameModeSelectModal`)
- **Learning mode no longer auto-serves via `selectNextEvent`** (single source of
  truth). When learning + `playing` + no current event/scenario → render
  `<LearningHub>` instead of selecting a level. `selectNextEvent` stays generic but is
  not called for learning.
- Picking a level → `game.setEvent(level)` and set `learningState.lastTrackId` to that
  level's track.
- Result screen reads the solved level's track and shows one explicit primary CTA:
  - track continues → **"Nächste Lektion (<Track>)"** = `getNextInTrack`
  - track complete → **"Zurück zum Lernpfad"**
  - finale unlocked → **"Finale starten"** (special CTA / hub highlight)
  "Zurück zum Lernpfad" clears the current event (falls back to hub). No automatic
  screen-switch — the player always clicks to proceed.

### G. Hub UI (`client/src/components/LearningHub/`)
- Reached after picking Learning mode; it is the home base.
- Top banner CTA: **"Nächste empfohlene Lektion"** → `getRecommendedNext`.
- Foundations card first, mandatory; until done, other tracks render locked
  ("Schließe zuerst die Grundlagen ab").
- One card per track: icon, title, progress bar (`doneCore/totalCore`), state badge;
  expandable to a per-level list with state glyphs (✓ done · ▶ next · 🔒 locked+reason
  · ★ advanced).
- Finale card: locked with "Schließe 3 Tracks ab" → highlighted graduation card once
  `isFinaleUnlocked`.

### H. Content copy
Re-title levels from the global "Lektion N: …" numbering to track-relative names
(e.g. "Grundlagen 1: Das Erwachen"). Light copy edits only — no new levels.

## Testing

- **`learningTracks.test.ts`** (consistency, mirrors `campaignConsistency`):
  - every track `eventId` resolves to a real learning event;
  - **every `requiredModes:['learning']` event is mapped to exactly one track**
    (no orphans, no dupes — pins the set so a new level can't silently miss the hub);
  - within-track `requires` form a valid predecessor chain;
  - no cross-track `requires` outside a documented allowlist;
  - every non-Foundations track-entry gates on the registry-derived Foundations exit.
- **`learningPath.test.ts`** (engine): `getTrackState/Progress`, `getNextInTrack`,
  `getRecommendedNext` intent-first priority (incl. `lastTrackId`), `isFinaleUnlocked`
  at exactly 3 core tracks (Foundations excluded).
- **Regression:** starting Learning shows the **Hub, not the first level**
  (proves `selectNextEvent` no longer fires for learning).
- **Result-flow:** solved level in track → "Nächste Lektion"; track complete →
  "Zurück zum Lernpfad"; finale unlocked → "Finale starten".
- **Risk to verify/adjust:** suites that may assert the old linear chain
  (`campaignPacing`, `flowBalanceAudit`, `skillBalanceAudit`, `packs.test`, the
  GUI-learning integration test). Hint-escalation tests should be unaffected (level
  text unchanged).

## Out of scope (YAGNI)
- "Alle Lektionen" free grid / archive view (optional later if demand appears).
- Story-mode changes.
- New level content (only re-titling existing levels).
