# Game Modes Specification

## Menu Information Architecture

The main menu offers three primary destinations plus one contextual shortcut:

1. **Neues Spiel** — opens the experience picker (`NewGameSelectModal`)
2. **Lernbereich** — opens the learning hub directly (all tracks/levels of the `learning` mode)
3. **Spielstände** — load/manage saved games
4. **Weiterspielen** — contextual shortcut, shown only when a resumable autosave exists

### New-game flow

**Neues Spiel** opens an *experience picker* (`NewGameSelectModal`) with two choices:

- **Freie Simulation** (recommended, preselected) — badge `EMPFOHLEN`; emphasizes "Hands-on-Aufgaben an Terminal & GUI" as the product's hands-on focus.
- **Story-Kampagne** — campaign-neutral copy, deliberately without a campaign count (see *Hidden campaigns* below).

Choosing **Freie Simulation** opens a second picker (`GameModeSelectModal`, simulation-only) offering **Einsteiger · Standard · KRITIS**. Choosing **Story-Kampagne** opens the *campaign picker* (`CampaignSelectModal`), which lists the campaigns from the registry (`content/campaigns/index.ts`) with their campaign-owned menu copy; every campaign runs in the same `story` mode.

The **Lernmodus** was removed from the new-game mode picker but remains fully available via **Lernbereich** (all tracks/levels). The hidden **hard** mode stays hidden. No mode ids, configs, or saves changed by this reorganization.

**Picker controls:** arrows change selection, Enter confirms, Escape goes back one level, focus is trapped inside the modal.

### Hidden campaigns (Trick 17)

A campaign can declare `hidden: true` plus an `unlockCode` (`content/campaigns/types.ts`). A hidden campaign is **absent from the campaign picker** — not greyed out, not teased — until the player types its code blind into that picker. The unlock then persists per player under `kritis_unlocks_<playerId>` (`engine/unlocks.ts`, never-throw like autosave/meta), so the card stays visible on later visits.

- **AUDIT TRAIL** is hidden; its code is **`trick17`** (case-insensitive, matched on the *end* of a capped keystroke buffer, so typos before it are tolerated). Badge `GEHEIM`.
- On unlock the revealed card takes selection + focus and an `aria-live` line confirms `> ACCESS GRANTED · <TITEL> ENTSPERRT`.
- Hiding is a **menu concern only**: `getCampaign(id)` is unaffected, so an existing AUDIT TRAIL save always resumes regardless of unlock state.
- Nothing outside the picker may reveal a hidden campaign — hence the count-free "Story-Kampagne" copy and the probation-only ending counter on the main menu.
- Guards: `content/campaigns/campaignMenu.test.ts` (hidden ⇒ code declared, visible ⇒ no code, code resolution), `engine/unlocks.test.ts`, `CampaignSelectModal.browser.test.tsx`, `App.menuKeyboard.browser.test.tsx`, and `e2e/mobile-menu-layout.spec.ts` (absent in the real build until typed).

## Active Modes (4)

These four modes remain defined and playable. They are now reached through the menu flow above rather than a single flat selection screen:
1. **Beginner** (📚 Einsteiger) — for newcomers · via Freie Simulation
2. **Learning** (🎓 Lernmodus) — for IT training · via Lernbereich
3. **Story** (📖) — narrative adventure · via Story-Kampagne → campaign picker (Die Probezeit; Audit Trail after unlock)
4. **KRITIS** (🏛️ KRITIS) — realistic simulation · via Freie Simulation

---

## 1. Beginner Mode (Einsteiger)

**Target Audience:** First-time players, non-IT users, students

**Icon:** `📚`

**Philosophy:** Safe learning environment where mistakes are forgiving. Focus on understanding game mechanics before facing real challenges.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | 12 weeks | Standard length, not overwhelming |
| Starting Skills | 30 | Higher baseline = more options available |
| Starting Stress | 15 | Low starting pressure |
| Starting Budget | 20,000€ | Comfortable buffer |
| Starting Compliance | 60% | Safe starting point |
| Effect Multiplier | 0.7x | Mistakes hurt less |
| Stress Decay | 1.5x | Stress recovers faster |
| Max Scenario Difficulty | 2 | Only easy scenarios |

### Features

| Feature | Enabled | Notes |
|---------|---------|-------|
| Hints | Yes | Show helpful tips before choices |
| Timer | No | No time pressure |
| Combo Scoring | No | No score tracking |
| Mentor Notes | Yes | Educational explanations after events |
| Terminal Tutorial | Yes | Step-by-step terminal guidance |

### Starting Relationships

| NPC | Value | Description |
|-----|-------|-------------|
| Chef | +10 | Boss is friendly and patient |
| Kämmerer | 0 | Neutral |
| Kollegen | +15 | Colleagues help you out |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 100 | Standard |
| Compliance | 0% | Very forgiving |
| Chef Relationship | -100 | Very forgiving |

### Special Behaviors

- First terminal encounter shows full tutorial
- Wrong choices show "What would have been better" feedback
- Event descriptions include more context
- Chain events have longer delays (more recovery time)

---

## 2. Learning Mode (Lernmodus)

**Target Audience:** Players who want structured terminal practice, IT trainees, and training participants

**Icon:** `🎓`

**Philosophy:** Guided training path with forgiving values. Players learn through 47 lessons in 12 hub-selectable tracks (Linux CLI, Windows GUI apps, Blackout incident, and four advanced CLI tracks) rather than broad random scenario pressure.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | 12 weeks | Focused learning arc |
| Starting Skills | 15 | Lower baseline so progress comes from practice |
| Starting Stress | 10 | Low pressure for training |
| Starting Budget | 15,000€ | Standard budget |
| Starting Compliance | 50% | Room to learn both directions |
| Effect Multiplier | 0.8x | Forgiving consequences while learning |
| Stress Decay | 1.5x | Stress recovers faster |
| Max Scenario Difficulty | 4 | Include challenging scenarios |

### Features

| Feature | Enabled | Notes |
|---------|---------|-------|
| Hints | Yes | Before choices |
| Timer | No | Think carefully |
| Combo Scoring | No | Learning, not competing |
| Mentor Notes | **Always** | Cannot be disabled |
| CLI-only content | **Yes** | Only terminal-backed training events are selected |
| BSI References | Scenario-dependent | Shown when content provides a reference |
| Decision Review | Not implemented | Candidate future feature |
| Knowledge Tracker | Not implemented | Candidate future feature |

### Starting Relationships

| NPC | Value | Description |
|-----|-------|-------------|
| Chef | +10 | Supportive training environment |
| Kämmerer | 0 | Neutral |
| Kollegen | +15 | Jens helps you learn |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 120 | Very forgiving |
| Compliance | 0% | Forgiving |
| Chef Relationship | -100 | Forgiving |

### Special Behaviors

- **Mentor mode enabled by default** through game state initialization
- **CLI-only event selection** via the mode feature flag
- **47 lessons across 12 tracks** (32 CLI, 10 Windows-GUI, 5 Blackout) shown through the learning hub
- **Fast stress recovery** to keep attention on practice rather than survival pressure

### Learning Objectives Covered

```
□ Patch Management (WSUS, Testing, Rollback)
□ Backup Strategies (3-2-1 Rule, Verification)
□ Access Control (Least Privilege, MFA)
□ Incident Response (Detection, Containment, Recovery)
□ Documentation (Asset Management, Change Logs)
□ Compliance (BSI IT-Grundschutz, NIS2)
□ Social Engineering (Phishing, Pretexting)
□ Physical Security (Clean Desk, Tailgating)
```

### Hub Track Roster

The learning hub serves tracks in `order` (see `client/src/content/events/learning-tracks.ts`). Foundations (order 0) is the gate; the finale (now order 11) unlocks after 3 tracks are completed. The four **advanced CLI tracks** (orders 7–10) were added on top of the original roster and run on the multi-host terminal engine (see `docs/specs/terminal-cli-specification.md` §11):

| Order | Track | Title | Focus (one-liner) |
|-------|-------|-------|-------------------|
| 7 | `ssh_remote` | 🗝️ SSH & Remote-Zugriff | Schlüssel statt Passwörter: sichere Fernzugriffe über Zonen hinweg. |
| 8 | `systemd_journal` | ⚙️ systemd & Journal | Dienste verstehen, Logs lesen, Ursachen statt Symptome. |
| 9 | `net_forensics` | 🕸️ Netz-Forensik | Offene Ports, fremde Verbindungen, saubere Firewalls. |
| 10 | `ansible_config` | 📜 Ansible & Konfigurationsmanagement | Eine Wahrheit für alle Hosts: Playbooks, Drift, Idempotenz. |

Each advanced track ships 4 levels (16 total, in `client/src/content/events/learning-path-advanced.ts`); `learn_ssh_04_key_graveyard` and `learn_net_04_spider` are optional.

---

## 3. Story Mode (Die Probezeit)

**Target Audience:** Players who enjoy narrative-driven games, want immersive experience

**Icon:** `📖`

**Philosophy:** Story-first experience. NPCs have memory. Decisions shape the narrative. Comedy-drama tone mixing The Office with Mr. Robot.

**Framing:** This is the **CASUAL** experience — "vorwiegend Text & Entscheidungen, wenig Hands-on". Chapters 1–4 are essentially text/choice. From chapter 5 the story adds THREE optional hands-on **GUI** beats — `adv_gui_eventviewer_probe`, `adv_gui_settings_preharden`, `adv_gui_taskmanager_attack` (all `guiCommand`, `isOptional: true`, in `client/src/content/adventure/story-events.ts`). There are **no** `terminalCommand` beats in the adventure story; CLI/terminal tasks live in the Lernbereich and the simulation scenarios.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | the campaign, not the calendar | 12 weeks is the *pacing target*, not a cut-off — see below |
| Starting Skills | 20 | Balanced starting point |
| Starting Stress | 15 | Low initial pressure |
| Starting Budget | 15,000€ | Standard budget |
| Starting Compliance | 50% | Middle ground |
| Effect Multiplier | 1.0x | Balanced consequences |
| Stress Decay | 1.0x | Normal recovery |
| Max Scenario Difficulty | 4 | Story-appropriate challenge |

### Run length: the campaign ends the run, not the week counter

A story run is **not** ended by `gameLength.totalWeeks`. `checkGameOver` skips the
`currentWeek > totalWeeks` rule for story runs (`isStoryMode`, or `gameMode ===
'story'` for pre-flag saves); the other game-over rules — stress, compliance,
chef relationship — apply unchanged, so a story run can still fail.

Why: story mode serves **exactly one content item per day**, and story beats
share those day-slots with sidequest events. 12 weeks × 5 days = 60 slots, while
probation needs **51 story beats** plus the sidequest events drawn from the same
budget (9–14, depending on play since sidequests start deterministically rather
than by a 30% roll). Measured end-to-end in
`client/src/engine/campaignBudget.test.ts` (`BUDGET_TRACE=1` prints the numbers):

| Campaign | play style | days | beats + sidequest events | outcome |
|---|---|---|---|---|
| probation | first option | 63 | 51 + 12 | ending, 12/12 chapters |
| probation | calmest | 60 | 51 + 9 | ending, 12/12 |
| probation | hardest | 65 | 51 + 14 | ending, 12/12 |
| audit-trail | any | 20 | 20 + 0 | ending, 6/6 (week 5) |

Before this, two of three play styles hit week 13 with 10–11 of 12 chapters done
and got the "Probezeit bestanden" run summary instead of the authored ending —
and a campaign finished ON the last day was swallowed the same way, because the
week check fired before the content pass could route to the ending screen. A
far backstop (`> totalWeeks * 2`) still bounds a run that never terminates.

The HUD already reflects this: story runs show chapter progress
(`getChapterProgress`), not "Woche N/12".

### Features

| Feature | Enabled | Notes |
|---------|---------|-------|
| Hints | Yes | Story guidance |
| Timer | No | Take your time |
| Combo Scoring | No | Narrative focus |
| Mentor Notes | Optional | Can enable for learning |
| Story Beats | **Yes** | Structured narrative |
| Character Memory | **Yes** | NPCs remember choices |
| Multiple Endings | **Yes** | 3 possible endings |

### Starting Relationships

| NPC | Value | Description |
|-----|-------|-------------|
| Chef | 0 | Neutral start |
| Kämmerer | 0 | Neutral start |
| Kollegen | +5 | Slightly welcoming |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 100 | Standard |
| Compliance | 0% | Standard |
| Chef Relationship | -100 | Standard |

### Story Structure

```
Act 1: Orientation (Weeks 1-4)
- Meet the team
- Learn the systems
- First small crises

Act 2: Complications (Weeks 5-8)
- Major incidents
- Office politics
- Mystery of the predecessor

Act 3: Resolution (Weeks 9-12)
- Final challenges
- Relationship payoffs
- One of three endings
```

### Special Behaviors

- **Story beats** trigger at specific weeks
- **Character memory** - NPCs reference past decisions
- **Character callbacks** - Trust flags can unlock visible later choices, including a Jens leadership payoff during the crisis
- **Sidequests** - Optional storylines with rewards; eligible authored quests are surfaced deterministically instead of being lost to a random start roll
- **Relationship gates** - Some content requires relationship thresholds
- **Mystery thread** - What happened to the last sysadmin?
- **Route divergence** - The official BSI route and underground route use different investigation scenes and different Act 3 resolutions
- **Preparation consequences** - Evidence, isolation, team preparation, and warnings change the ransomware response and finale options
- **Ending transparency** - The ending screen shows route, earned preparation factors, and penalty factors so replay differences are legible

---

## 4. KRITIS Mode (KRITIS)

**Target Audience:** Experienced players, IT professionals, realism seekers

**Icon:** `🏛️`

**Philosophy:** Realistic simulation of working in critical infrastructure IT. Long-term consequences. NIS2 compliance matters. Chain reactions.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | **24 weeks** | Full probation period |
| Starting Skills | 20 | Modest starting point |
| Starting Stress | 25 | Already some pressure |
| Starting Budget | 10,000€ | Tight budget |
| Starting Compliance | 45% | Below threshold, needs work |
| Effect Multiplier | 1.3x | Amplified consequences |
| Stress Decay | 0.8x | Slower recovery |
| Max Scenario Difficulty | 5 | Full difficulty range |

### Features

| Feature | Enabled | Notes |
|---------|---------|-------|
| Hints | No | Figure it out |
| Timer | No | But events have urgency |
| Combo Scoring | No | Survival, not points |
| Mentor Notes | Optional | Toggle in settings |
| Chain Events | **Yes** | Decisions echo forward |
| NIS2 Audits | **Yes** | Compliance checks |
| Budget Tracking | **Yes** | Detailed expense reports |
| Reputation System | **Yes** | NPCs remember everything |

### Starting Relationships

| NPC | Value | Description |
|-----|-------|-------------|
| Chef | 0 | Neutral, prove yourself |
| Kämmerer | -15 | Skeptical of new hire |
| Kollegen | +10 | Cautiously friendly |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 100 | Standard |
| Compliance | 0% | BSI audit = game over |
| Chef Relationship | -100 | Fired |
| **NIS2 Violation** | 3 major | Regulatory intervention |

### Special Behaviors

- **Chain Events active:** Decisions trigger consequences 1-4 weeks later
- **NIS2 Audit Events:** Week 8, 16, 24 mandatory compliance checks
- **Budget Reports:** Monthly budget review with Kämmerer
- **Incident Logging:** All security events tracked for audit
- **Reputation persistence:** NPCs reference past decisions
- **Multiple endings:** Based on final stats and relationships

### KRITIS-Specific Events

- BSI audit preparation
- NIS2 compliance deadlines
- Critical infrastructure incidents
- Cross-department coordination
- Regulatory reporting requirements
- Supply chain security issues

---

## Hidden Modes (1)

These modes exist in code but are not shown in the selection screen.

### Hard (Schwer)
- **Status:** Hidden
- **Reason:** KRITIS mode covers difficulty
- **May return:** As "Hardcore" variant

---

## Implementation Notes

### Mode Selection Order

Selection is now two-step (see **Menu Information Architecture**), not one flat list.

Step 1 — experience picker (`NewGameSelectModal`):
```
01. Freie Simulation — EMPFOHLEN (preselected) — hands-on Terminal & GUI
02. Story-Kampagne — chapters, relationships, several endings
```
Step 2a — campaign picker (`CampaignSelectModal`), first entry preselected:
```
01. Die Probezeit — EMPFOHLEN — 12 Kapitel · 3 Enden · Casual
02. Audit Trail  — GEHEIM    — 6 Kapitel · 3 Enden · Hands-on  (only after 'trick17')
```
Step 2b — simulation picker (`GameModeSelectModal`, simulation-only), Einsteiger preselected:
```
1. 📚 Einsteiger (Beginner) — recommended for new players
2. 💼 Standard (Intermediate) — classic baseline experience
3. 🏛️ KRITIS — full simulation
```
🎓 Lernmodus (Learning) is no longer in this flow; it is entered via the **Lernbereich** menu entry.

### Type Definition Update
```typescript
export type GameModeId =
  | 'beginner'
  | 'learning'
  | 'story'
  | 'kritis'
  | 'intermediate'
  | 'hard';

// Visible modes filter
export const VISIBLE_MODES: GameModeId[] = ['beginner', 'learning', 'story', 'intermediate', 'kritis'];
```

### Feature Flags per Mode

| Feature | Beginner | Learning | Story | KRITIS |
|---------|----------|----------|-------|--------|
| showHints | ✓ | ✓ | ✓ | ✗ |
| timerEnabled | ✗ | ✗ | ✗ | ✗ |
| comboScoringEnabled | ✗ | ✗ | ✗ | ✗ |
| mentorModeEnabled | ✓ | **forced** | optional | optional |
| cliOnly | ✗ | ✓ | ✗ | ✗ |
| bsiReferencesShown | content-dependent | content-dependent | content-dependent | content-dependent |
| terminalTutorial | content-dependent | ✓ | content-dependent | content-dependent |
| storyBeats | ✗ | ✗ | ✓ | ✗ |
| characterMemory | ✗ | ✗ | ✓ | ✗ |

---

## Current Implementation Checklist

1. `learning` exists in `GameModeId`
2. `learning` exists in `GAME_MODES`
3. `VISIBLE_MODES` still exposes `beginner`, `learning`, `story`, and `kritis` at the config level (unchanged)
4. The simulation picker (`GameModeSelectModal`) filters `getVisibleGameModes()` to `beginner`, `intermediate`, `kritis`; `learning` is reached via the **Lernbereich** menu entry and `story` via the experience picker
5. Hidden modes remain available in config for saved games or future reactivation
