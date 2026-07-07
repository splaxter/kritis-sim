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
