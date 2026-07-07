# Game Modes Specification

## Active Modes (4)

Only these modes are visible in the mode selection screen:
1. **Beginner** (📚 Einsteiger) — for newcomers
2. **Learning** (🎓 Lernmodus) — for IT training
3. **Story** (📖 Die Probezeit) — narrative adventure
4. **KRITIS** (🏛️ KRITIS) — realistic simulation

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

**Philosophy:** Guided training path with forgiving values. Players learn through 31 lessons in 8 hub-selectable tracks (Linux CLI, Windows GUI apps, Blackout incident) rather than broad random scenario pressure.

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
| Kollegen | +15 | Bjorg helps you learn |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 120 | Very forgiving |
| Compliance | 0% | Forgiving |
| Chef Relationship | -100 | Forgiving |

### Special Behaviors

- **Mentor mode enabled by default** through game state initialization
- **CLI-only event selection** via the mode feature flag
- **31 lessons across 8 tracks** (16 CLI, 10 Windows-GUI, 5 Blackout) shown through the learning hub
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

---

## 3. Story Mode (Die Probezeit)

**Target Audience:** Players who enjoy narrative-driven games, want immersive experience

**Icon:** `📖`

**Philosophy:** Story-first experience. NPCs have memory. Decisions shape the narrative. Comedy-drama tone mixing The Office with Mr. Robot.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | 12 weeks | 3 acts, 4 weeks each |
| Starting Skills | 20 | Balanced starting point |
| Starting Stress | 15 | Low initial pressure |
| Starting Budget | 15,000€ | Standard budget |
| Starting Compliance | 50% | Middle ground |
| Effect Multiplier | 1.0x | Balanced consequences |
| Stress Decay | 1.0x | Normal recovery |
| Max Scenario Difficulty | 4 | Story-appropriate challenge |

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
- **Sidequests** - Optional storylines with rewards
- **Relationship gates** - Some content requires relationship thresholds
- **Mystery thread** - What happened to the last sysadmin?

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

## Hidden Modes (3)

These modes exist in code but are not shown in the selection screen.

### Intermediate (Standard)
- **Status:** Hidden
- **Reason:** Overlaps with Learning mode
- **May return:** As "Classic" mode later

### Hard (Schwer)
- **Status:** Hidden
- **Reason:** KRITIS mode covers difficulty
- **May return:** As "Hardcore" variant

### Arcade
- **Status:** Hidden
- **Reason:** Focus on narrative/educational modes first
- **May return:** As quick-play option later

---

## Implementation Notes

### Mode Selection Order
```
1. 📚 Einsteiger (Beginner) — recommended for new players
2. 🎓 Lernmodus (Learning) — recommended for IT training
3. 📖 Story (Adventure) — narrative experience
4. 🏛️ KRITIS — full simulation
```

### Type Definition Update
```typescript
export type GameModeId =
  | 'beginner'
  | 'learning'
  | 'story'
  | 'kritis'
  | 'intermediate'
  | 'hard'
  | 'arcade';

// Visible modes filter
export const VISIBLE_MODES: GameModeId[] = ['beginner', 'learning', 'story', 'kritis'];
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
3. `VISIBLE_MODES` exposes `beginner`, `learning`, `story`, and `kritis`
4. Hidden modes remain available in config for saved games or future reactivation
