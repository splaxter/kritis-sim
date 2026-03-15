# KRITIS Admin Simulator - Game Flow Coverage

## Game Modes Overview

| Mode | Weeks | Timer | Hints | Difficulty | Special Features |
|------|-------|-------|-------|------------|------------------|
| Einsteiger | 12 | No | Yes | 0.7x effects | Max scenario difficulty 2 |
| Standard | 12 | No | No | 1.0x effects | Baseline experience |
| Schwer | 12 | No | No | 1.5x effects | Stricter thresholds |
| KRITIS | 24 | No | No | 1.3x effects | Extended campaign |
| Arcade | 8 | 30s | No | 1.0x effects | Combo scoring |
| Adventure | 12 | No | Yes | 1.0x effects | Linear story, sidequests |

---

## Mode Details

### Einsteiger (Beginner)
**Target:** New players learning the game

| Setting | Value | Effect |
|---------|-------|--------|
| Starting Skills | 30 | Higher than standard |
| Starting Stress | 15 | Lower than standard |
| Starting Budget | 20,000 | Higher than standard |
| Starting Compliance | 60% | Higher than standard |
| Chef Relationship | +10 | Positive start |
| Effect Multiplier | 0.7x | Negative effects reduced |
| Max Scenario Difficulty | 2 | Only easy scenarios |
| Stress Decay Rate | 1.5x | Stress recovers faster |
| Show Hints | Yes | Teaching moments visible |

### Standard (Intermediate)
**Target:** Regular gameplay experience

| Setting | Value | Effect |
|---------|-------|--------|
| Starting Skills | 20 | Baseline |
| Starting Stress | 20 | Baseline |
| Starting Budget | 15,000 | Baseline |
| Starting Compliance | 50% | Baseline |
| Chef Relationship | 0 | Neutral start |
| Effect Multiplier | 1.0x | Normal effects |
| Max Scenario Difficulty | 5 | All scenarios available |
| Stress Decay Rate | 1.0x | Normal recovery |
| Show Hints | No | Discovery-based |

### Schwer (Hard)
**Target:** Experienced players seeking challenge

| Setting | Value | Effect |
|---------|-------|--------|
| Starting Skills | 15 | Lower than standard |
| Starting Stress | 30 | Higher than standard |
| Starting Budget | 12,000 | Lower than standard |
| Starting Compliance | 40% | Lower than standard |
| Chef Relationship | -10 | Negative start |
| Kämmerer Relationship | -20 | Budget battles |
| Effect Multiplier | 1.5x | Harsher consequences |
| Stress Decay Rate | 0.5x | Stress lingers |
| Stress Game Over | 90 | Stricter threshold |
| Compliance Game Over | 10% | Stricter threshold |
| Chef Game Over | -80 | Stricter threshold |

### KRITIS (Critical Infrastructure)
**Target:** Realistic IT security simulation

| Setting | Value | Effect |
|---------|-------|--------|
| Total Weeks | 24 | Double length campaign |
| Starting Budget | 10,000 | Tight budget |
| Starting Compliance | 45% | Below standard |
| Kämmerer Relationship | -15 | Budget resistance |
| Effect Multiplier | 1.3x | Moderate consequences |
| Stress Decay Rate | 0.8x | Slower recovery |

**Note:** Description mentions "NIS2-Audits und Kettenreaktionen" - these are thematic, not special mechanics.

### Arcade
**Target:** Fast-paced fun, replayability

| Setting | Value | Effect |
|---------|-------|--------|
| Total Weeks | 8 | Short campaign |
| Timer | 30 seconds | Per decision |
| Combo Scoring | Yes | Streak multipliers |
| Starting Stress | 10 | Low to allow mistakes |
| Stress Decay Rate | 1.2x | Forgiving |
| Chef Relationship | +5 | Friendly start |
| Kollegen Relationship | +15 | Team support |

### Adventure (Story Mode)
**Target:** Narrative-driven experience

| Setting | Value | Effect |
|---------|-------|--------|
| Total Weeks | 12 | Story-paced |
| Show Hints | Yes | Story guidance |
| Max Scenario Difficulty | 4 | Story-appropriate |
| Linear Progression | Yes | Chapter-based |
| Sidequests | 12 available | Affect main story |
| Multiple Endings | 3 | Based on choices |

---

## Content Coverage

### Random Events (240 total)

| Week Range | Event Count | Categories |
|------------|-------------|------------|
| Week 1 | 12 events | Introduction, onboarding |
| Weeks 2-4 | 75 events | Early challenges |
| Weeks 5-8 | 85 events | Mid-game complexity |
| Weeks 9-12 | 68 events | Late-game crises |

#### Event Categories Distribution
| Category | Count | Description |
|----------|-------|-------------|
| Security | 8 | Security incidents, threats |
| Crisis | 8 | Emergency situations |
| Support | 7 | Help desk, user issues |
| Personal | 7 | Work-life balance |
| Compliance | 7 | Regulations, audits |
| Politics | 6 | Office politics |
| Team | 5 | Team dynamics |
| Budget | 4 | Financial decisions |

### Scenarios (179 total across 5 packs)

| Content Pack | Scenarios | Focus |
|--------------|-----------|-------|
| Internal | 50 | Core gameplay scenarios |
| KRITIS-Infra | 48 | Critical infrastructure |
| AMSE IT | 33 | Vendor management |
| Cloud365 | 24 | Cloud services |
| Telekom | 24 | Telecom scenarios |

#### Scenario Categories
| Category | Count | Description |
|----------|-------|-------------|
| Vendor Management | 11 | Supplier relations |
| Troubleshooting | 9 | Technical problems |
| Security Incident | 6 | Breach response |
| Compliance | 5 | Regulatory issues |
| Team Dynamics | 4 | People management |
| Crisis Management | 4 | Major incidents |
| Budget Politics | 3 | Financial conflicts |

---

## Adventure Mode Content

### Chapters (12 total)

| Chapter | Title | Act | Week | Key Events |
|---------|-------|-----|------|------------|
| ch01 | Der erste Tag | 1 | 1 | Welcome, desk discovery, first ticket, mysterious note |
| ch02 | Einarbeitung | 1 | 2 | System tour, coffee machine, Thomas warning, strange logs |
| ch03 | Feuertaufe | 1 | 3 | Printer emergency, chef pressure, mail anomaly, late night |
| ch04 | NICHT_ÖFFNEN.zip | 1 | 4 | Old PC, encrypted file, password hunt, file contents |
| ch05 | Zufälle gibt es nicht | 2 | 5 | Pattern recognition, Thomas confession, news, connecting dots |
| ch06 | Wem vertraust du? | 2 | 6 | Evidence, chef confrontation, BSI contact, point of no return |
| ch07 | Eskalation | 2 | 7 | Targeted phishing, insider threat, security lockdown, ally |
| ch08 | Die Ruhe vor dem Sturm | 2 | 8 | False peace, preparation, Thomas flashback, warning signs |
| ch09 | Der Angriff | 3 | 9 | Ransomware strike, chaos, initial response, clock starts |
| ch10 | 72 Stunden | 3 | 10 | Backup check, mayor call, team rally, Thomas helps |
| ch11 | Die Wahrheit | 3 | 11 | Attacker identity, predecessor truth, real target, decision |
| ch12 | Probezeit beendet | 3 | 12 | Final push, allies arrive, climax, ending |

### Sidequests (12 total)

#### Relationship Sidequests
| ID | Title | Trigger | Rewards | Story Effect |
|----|-------|---------|---------|--------------|
| sq_coffee_machine | Der Kaffeemaschinenflüsterer | kollegen >= 10, ch02-ch04 | kollegen +20, flag: coffee_hero | Unlocks coffee_speech in team_rally |
| sq_thomas_secret | Thomas' Mining-Geheimnis | kollegen >= 30, ch03+ | kollegen +15, flags: thomas_trust, knows_mining_secret | Unlocks already_know in thomas_confession |
| sq_chef_family | Der Chef hat Sorgen | chef >= 25, ch05+ | chef +25, flag: chef_confidant | Unlocks appeal_to_family in chef_confrontation |
| sq_kaemmerer_excel | Der Excel-Albtraum | kaemmerer >= 0, ch02-ch06 | kaemmerer +30, budget +5000, flag: kaemmerer_friend | Grants emergency_budget ability |

#### Skill Sidequests
| ID | Title | Trigger | Rewards | Story Effect |
|----|-------|---------|---------|--------------|
| sq_basement_server | Der Server im Keller | security >= 35, ch04+ | security +5, linux +5, flags: found_basement_server, has_backup_system | Adds backup_option to ch10 |
| sq_legacy_code | Archäologie im Code | linux >= 40, ch03+ | linux +8, troubleshooting +5, flag: legacy_master | Unlocks use_legacy_knowledge in initial_response |
| sq_network_optimization | Der Flaschenhals | netzwerk >= 35, ch02+ | netzwerk +8, flag: network_expert | Unlocks segment_network in security_lockdown |

#### Discovery Sidequests
| ID | Title | Trigger | Rewards | Story Effect |
|----|-------|---------|---------|--------------|
| sq_predecessor_trail | Die Spur des Vorgängers | flag: found_mysterious_note, ch04+ | flags: knows_predecessor_story, found_evidence | Adds full_truth to ch11, unlocks show_evidence |
| sq_external_contact | Der anonyme Tipp | flag: started_investigation, ch05+ | flags: has_external_ally, insider_info | Unlocks reveal_source in attacker_identity |
| sq_log_analysis | Die Wahrheit liegt in den Logs | troubleshooting >= 40, flag: noticed_anomalies, ch05+ | security +5, troubleshooting +5, flags: pattern_discovered, attack_timeline | Unlocks present_evidence in bsi_contact |

#### Comedy Sidequests
| ID | Title | Trigger | Rewards | Story Effect |
|----|-------|---------|---------|--------------|
| sq_haunted_printer | Der Druckergeist | ch03-ch08 | kollegen +15, flag: printer_mystery_solved | Unlocks printer_connection in pattern_recognition |
| sq_password_chaos | Das Passwort-Chaos | ch05-ch07 | flag: credential_theft_detected | Unlocks mention_passwords in insider_threat |

### Story Events (25 total)

| Event ID | Chapter | Choices | Hidden Choices |
|----------|---------|---------|----------------|
| adv_welcome | ch01 | 3 | - |
| adv_desk_discovery | ch01 | 3 | - |
| adv_first_ticket | ch01 | 3 | - |
| adv_mysterious_note | ch01 | 3 | - |
| adv_system_tour | ch02 | 3 | - |
| adv_coffee_machine_intro | ch02 | 3 | - |
| adv_thomas_warning | ch02 | 3 | - |
| adv_strange_logs | ch02 | 3 | - |
| adv_printer_emergency | ch03 | 3 | - |
| adv_chef_pressure | ch03 | 3 | - |
| adv_mail_anomaly | ch03 | 3 | - |
| adv_late_night | ch03 | 3 | - |
| adv_old_pc | ch04 | 3 | - |
| adv_encrypted_file | ch04 | 3 | - |
| adv_password_hunt | ch04 | 3 | - |
| adv_file_contents | ch04 | 3 | - |
| adv_file_locked | ch04 | 3 | - |
| adv_team_rally | ch10 | 2 | 1 (coffee_speech) |
| adv_initial_response | ch09 | 2 | 1 (use_legacy_knowledge) |
| adv_security_lockdown | ch07 | 2 | 1 (segment_network) |
| adv_pattern_recognition | ch05 | 2 | 1 (printer_connection) |
| adv_backup_available | ch10 | 2 | - (requires found_basement_server) |
| adv_ransomware_strike | ch09 | 3 | - |
| adv_ending | ch12 | 3 | - |

### Endings

| Ending | Title | Requirements |
|--------|-------|--------------|
| Good | Der Held | Score >= 70, sidequests >= 3 |
| Neutral | Gerade so | Score >= 40 OR (score >= 30, sidequests >= 2) |
| Bad | Pech gehabt | Score < 40, few sidequests |

#### Ending Score Calculation
- Chef relationship: (chef + 100) / 4 = 0-50 points
- Kollegen relationship: (kollegen + 100) / 10 = 0-20 points
- Sidequests: 10 points each
- Bonus flags: saved_early (+20), found_evidence (+15), team_prepared (+10), trusted_by_all (+15)
- Penalty flags: burned_bridges (-30), ignored_warnings (-20), blamed_others (-15)

---

## Week-by-Week Flow

### All Modes (except Adventure)

| Week | Available Content | Expected Events |
|------|-------------------|-----------------|
| 1 | Week 1 events (12) | 5 events (1/day) |
| 2-4 | Weeks 2-4 events (75) + Scenarios | ~15 events + ~5 scenarios |
| 5-8 | Weeks 5-8 events (85) + Scenarios | ~20 events + ~8 scenarios |
| 9-12 | Weeks 9-12 events (68) + Scenarios | ~20 events + ~8 scenarios |
| 13-24 | (KRITIS only) Recycled content + Scenarios | Extended challenge |

### Adventure Mode

| Week | Chapter | Story Beats | Possible Sidequests |
|------|---------|-------------|---------------------|
| 1 | ch01_first_day | 4 beats | - |
| 2 | ch02_settling_in | 4 beats | sq_coffee_machine, sq_kaemmerer_excel, sq_network_optimization |
| 3 | ch03_first_crisis | 4 beats | sq_legacy_code, sq_haunted_printer |
| 4 | ch04_the_file | 4 beats | sq_basement_server, sq_predecessor_trail |
| 5 | ch05_coincidence | 4 beats | sq_chef_family, sq_external_contact, sq_log_analysis, sq_password_chaos |
| 6 | ch06_trust_no_one | 4 beats | sq_thomas_secret |
| 7 | ch07_escalation | 4 beats | sq_password_chaos |
| 8 | ch08_calm_before | 4 beats | sq_haunted_printer (max) |
| 9 | ch09_attack | 4 beats | - |
| 10 | ch10_72_hours | 4 beats | - |
| 11 | ch11_truth | 4 beats | - |
| 12 | ch12_finale | 4 beats | - |

---

## Content Gaps & Notes

### Implemented
- All 6 game modes with distinct configurations
- 240 random events across all weeks
- 179 scenarios across 5 content packs
- Full adventure mode with 12 chapters
- 12 sidequests with story effects
- Dialogue unlock system
- NPC behavior changes
- Multiple endings

### Partially Implemented
- KRITIS mode mentions "NIS2-Audits und Kettenreaktionen" but these are thematic, not special mechanics
- Arcade combo system exists but visual feedback could be enhanced

### Future Expansion Points
- More content packs
- Additional sidequests
- Extended KRITIS-specific events (audits, chain reactions)
- Achievement system
- Unlockable content based on endings
