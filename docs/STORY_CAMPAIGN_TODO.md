# Story Campaign — Status & TODO

_Story mode "Die Probezeit" — 12-chapter narrative campaign._

## Status: authored through chapter 8 of 12

- **Act 1 (ch1–4):** complete (pre-existing).
- **Act 2 (ch5–8):** authored this session — Bjorg's confession + the pattern clicking (ch5), the official-vs-solo trust fork (ch6), personal escalation/insider hunt (ch7), the lull before the storm (ch8).
- **Act-break ending:** the old dead-air soft-end (→ false "Probezeit überstanden" victory) is gone. On entering the first not-fully-authored chapter, the run ends on a derived **"AKT {completedAct} — ENDE / Fortsetzung folgt"** screen (`App.tsx` `storyEnding` phase, body from `content/adventure/actBreaks.ts`). Boundary moves automatically as chapters land.

## Remaining: chapters 9–12 (Act 3)

Author each chapter's beats into `adventure/story-events.ts`, then add the chapter id to `FINISHED_CHAPTERS` in **both** `campaignConsistency.test.ts` and `campaignPacing.test.ts` (all-or-nothing per chapter).

| Chapter | Title | Beats to author (others exist) |
|---|---|---|
| ch9 | Der Angriff | `adv_chaos_unfolds`, `adv_clock_starts` (`adv_ransomware_strike`, `adv_initial_response` exist) |
| ch10 | 72 Stunden | `adv_backup_check` (branch `found_basement_server`), `adv_mayor_call`, `adv_thomas_helps` (branch `thomas_ally`) — `adv_team_rally` exists |
| ch11 | Die Wahrheit | `adv_attacker_identity`, `adv_predecessor_truth`, `adv_real_target`, `adv_final_decision` |
| ch12 | Finale | `adv_final_push`, `adv_allies_arrive`, `adv_climax` (`adv_ending` exists) |

### Tied to the above
- **Act-3 break copy:** when ch10 lands, add an `act: 3` entry to `ACT_BREAK_BODIES` (`actBreaks.ts`) reprising ch10's "72 Stunden" cliffhanger. Until then the generic fallback keeps the boundary coherent ("AKT 3 — ENDE" + generic body). Pure content, no engine change.
- **Sidequest audit gap (close before declaring the campaign complete):** `campaignConsistency.test.ts` does not yet validate sidequest `unlocksDialogue` targets — e.g. ch11's `sq_predecessor_trail` unlocks `adv_complete_picture`, which doesn't exist. Extend the audit when authoring ch11.

## How to extend
See the `[[story-campaign-gap]]` memory for the full authoring pattern, lore bible (Bjorg = "Thomas" in code; Stefan = the vanished predecessor), and guardrails (don't add `requires` to branch beat events; story events aren't in the general `allEvents` pool).
