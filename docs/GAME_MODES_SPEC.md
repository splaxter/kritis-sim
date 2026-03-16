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

## 2. Learning Mode (Lernmodus) — NEW

**Target Audience:** IT professionals wanting to learn KRITIS/BSI concepts, training participants

**Icon:** `🎓`

**Philosophy:** Educational focus with real-world context. Every event teaches something. Mentor mode always active. BSI references shown.

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Duration | 12 weeks | Focused learning arc |
| Starting Skills | 25 | Moderate starting point |
| Starting Stress | 20 | Realistic baseline |
| Starting Budget | 15,000€ | Standard budget |
| Starting Compliance | 50% | Room to learn both directions |
| Effect Multiplier | 1.0x | Realistic consequences |
| Stress Decay | 1.0x | Normal recovery |
| Max Scenario Difficulty | 4 | Include challenging scenarios |

### Features

| Feature | Enabled | Notes |
|---------|---------|-------|
| Hints | Yes | Before choices |
| Timer | No | Think carefully |
| Combo Scoring | No | Learning, not competing |
| Mentor Notes | **Always** | Cannot be disabled |
| BSI References | Yes | Show regulation citations |
| Decision Review | Yes | End-of-week summaries |
| Knowledge Tracker | Yes | Track learned concepts |

### Starting Relationships

| NPC | Value | Description |
|-----|-------|-------------|
| Chef | +5 | Slightly supportive |
| Kämmerer | -5 | Slight tension (realistic) |
| Kollegen | +10 | Helpful team |

### Game Over Thresholds

| Condition | Threshold | Notes |
|-----------|-----------|-------|
| Stress | 100 | Standard |
| Compliance | 10% | Some buffer |
| Chef Relationship | -80 | Some buffer |

### Special Behaviors

- **Mentor Notes always visible** after every event result
- **BSI/NIS2 references** shown for compliance-related events
- **Concept tracking:** "You learned about: Patch Management, WSUS, ..."
- **Weekly review:** Summary of decisions and their real-world implications
- **Pause & Explain:** Option to pause and get detailed explanations
- **No permadeath:** Can retry failed events with explanation

### Learning Objectives Tracked

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
// Current
export type GameModeId = 'beginner' | 'learning' | 'arcade' | 'kritis' | 'intermediate' | 'hard' | 'adventure';

// Visible modes filter
export const VISIBLE_MODES: GameModeId[] = ['beginner', 'learning', 'adventure', 'kritis'];
```

### Feature Flags per Mode

| Feature | Beginner | Learning | Story | KRITIS |
|---------|----------|----------|-------|--------|
| showHints | ✓ | ✓ | ✓ | ✗ |
| timerEnabled | ✗ | ✗ | ✗ | ✗ |
| comboScoringEnabled | ✗ | ✗ | ✗ | ✗ |
| mentorModeEnabled | ✓ | **forced** | optional | optional |
| chainEventsEnabled | ✗ | ✓ | ✓ | ✓ |
| bsiReferencesShown | ✗ | ✓ | ✗ | ✓ |
| terminalTutorial | ✓ | ✓ | ✓ | ✗ |
| storyBeats | ✗ | ✗ | ✓ | ✗ |
| characterMemory | ✗ | ✗ | ✓ | ✓ |

---

## Migration Path

1. Add `learning` mode to `GameModeId` type
2. Add `learning` config to `GAME_MODES`
3. Add `VISIBLE_MODES` array
4. Update `GameModeSelectModal` to filter by `VISIBLE_MODES`
5. Update `getAllGameModes()` to optionally filter
6. Test all 4 modes work correctly
