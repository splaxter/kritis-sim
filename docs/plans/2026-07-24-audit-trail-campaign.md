# AUDIT TRAIL Campaign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Zweite Story-Kampagne „AUDIT TRAIL" (4 Akte, Domänen-basierte Endings) auf Basis von: minimaler Kampagnen-Entkopplung, `FlagCondition`-Ausdrücken, Terminal-`setsFlags` ohne Solve, echtem `diff`, eng begrenzter Exchange-2019-Semantik.

**Architecture:** Phase A liefert die drei isolierten Engine-Blöcke (FlagCondition, Terminal-setsFlags), Phase B die Kampagnen-Entkopplung (Probezeit unverändert als `CampaignDefinition` verpackt, Saves migriert), Phase C die Werkzeuge (`diff`, Exchange-Cmdlets, Mail-Compose), Phase D den Content Akt für Akt. Jede Phase ist separat committbar; Probezeit-Verhalten darf sich in keiner Phase ändern.

**Tech Stack:** React 18, TypeScript, Vitest (node `*.test.ts` + jsdom `*.browser.test.tsx`), xterm.js-Shell-Engine.

**Design doc:** `docs/plans/2026-07-24-audit-trail-campaign-design.md` — hält Auditfragen (§4), Flag-/Domänen-Landkarte (§5), Level-Specs (§6), Engine-Bausteine (§7), Testpflichten (§8). Bei Widerspruch gewinnt das Design-Doc.

**Acceptance bar:** Jeder Task endet grün (`npm run build` typecheckt via tsc; Task-Tests laufen) und committet. Probezeit-Kampagne verhält sich identisch (bestehende Tests + Story-Konsistenztests bleiben grün, alte Saves laden). Content-Tasks respektieren die Audit-Tests (Pacing, Orthographie, Hint-Eskalation).

---

## Orientation — verified anchors (cite these; don't rediscover)

- `shared/src/types/adventure.ts`: `act: 1 | 2 | 3` (`:21`), `branchCondition?: string` (`:40`), `EndingType = 'good'|'neutral'|'bad'` (`:146`), `calculateEndingScore` (`:220`), `determineEnding` (`:256-260`), `createInitialAdventureState()` hart auf `ch01_first_day` (`:205`).
- `client/src/engine/gameState.ts:40-42`: `mode === 'story'` → `storyState: createInitialAdventureState()`.
- `client/src/App.tsx`: fester Content-Import (`:17`), `combinedEvents = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents]` (`:261`), Story-Flow via `isAtAuthoredStoryEnd`/`getNextStoryContent` (`:274,279`).
- `client/src/hooks/useGame.ts`: `closeTerminal(solved, skillGain?, solutionFlags?, solutionEffects?)` (`:48,:274`), Flag-Merge aus `pendingTerminalChoice.setsFlags` + `solutionFlags` (`:300,:340`) — Flags fließen heute NUR beim Level-Ende.
- `client/src/components/Terminal/session/TerminalSession.ts`: `onSolved`-Callback (`:28`), `checkSolutions` (`:462,:484,:641`).
- `shared/src/types/terminal.ts`: `TerminalCommand` (`:6`), `isSolution` (`:14`), `stateGoals` (`:57`).
- `client/src/engine/shell/commands/linux/index.ts:19`: `allLinuxCommands` — neuer Befehl = Objekt + Spread, Registrierung automatisch (`ShellEngine.registerCommands`).
- `client/src/content/adventure/actBreaks.ts:42-57`: `ACT_BREAK_DEFAULT`/`ACT_BREAK_BODIES` (Probezeit-Copy); `client/src/content/adventure/index.ts:58`: `STORY_CHARACTERS` (global).
- Multi-Host ist Linux-only (`engine/shell/hosts.ts`) — EXCH01-Level laufen als eigenständige PowerShell-Level, nicht per ssh.

---

# PHASE A — Isolierte Engine-Blöcke

## Task 1: `FlagCondition` + Evaluator (shared, pure)

**Files:** Create `shared/src/types/flagCondition.ts` + `shared/src/types/flagCondition.test.ts`; export aus `shared/src/index.ts` (bzw. dem bestehenden Barrel).

Test zuerst (string-Kompatibilität, `all`/`any`/`none`, Kombinationen, leere Objekte):

```ts
export type FlagCondition =
  | string
  | { all?: string[]; any?: string[]; none?: string[] };

export function checkFlagCondition(
  cond: FlagCondition | undefined,
  flags: Record<string, boolean>
): boolean {
  if (cond === undefined) return true;
  if (typeof cond === 'string') return !!flags[cond];
  const { all = [], any = [], none = [] } = cond;
  return (
    all.every(f => !!flags[f]) &&
    (any.length === 0 || any.some(f => !!flags[f])) &&
    none.every(f => !flags[f])
  );
}
```

Danach `npm run build -w shared` (root vitest löst `@kritis/shared` über `shared/dist`).

## Task 2: `branchCondition` akzeptiert `FlagCondition`

**Files:** `shared/src/types/adventure.ts` (`StoryBeat.branchCondition?: FlagCondition`, `:40`), `client/src/engine/adventureEngine.ts` (alle Stellen, die `branchCondition` als Flag-Key lesen — `shouldPlayBeat`/`getNextStoryContent` — auf `checkFlagCondition` umstellen), Tests in `client/src/engine/adventureEngine.test.ts` erweitern.

- Test: bestehender String-Branch (Probezeit ch12 `chose_official_route`) unverändert; neuer Beat mit `{ all: [...], none: [...] }` brancht korrekt.
- Kein Content-Change in diesem Task. Alle bestehenden Story-Tests bleiben grün.

## Task 3: Terminal-`setsFlags` ohne Solve (Honigtopf-Mechanik)

**Files:** `shared/src/types/terminal.ts` (`TerminalCommand.setsFlags?: string[]`), `client/src/components/Terminal/session/TerminalSession.ts` (neuer Callback `onFlagsSet(flags: string[])` neben `onSolved` `:28`; feuert beim erfolgreichen Match eines Szenario-Kommandos mit `setsFlags`), `client/src/components/Terminal/useTerminal.ts` (durchreichen), `client/src/hooks/useGame.ts` (neue Methode `setRunFlags(flags: string[])`, schreibt sofort und idempotent in `state.flags`), App-Verdrahtung. Browser-Test `client/src/hooks/useGame.setRunFlags.browser.test.tsx` (oder Erweiterung eines bestehenden Terminal-Browser-Tests).

Kernanforderungen (Design §7.4):
1. Flag wird **sofort** beim Match gesetzt, nicht erst in `closeTerminal`.
2. **Idempotent**: mehrfaches Ausführen erzeugt keine weiteren State-Updates (guard: alle Flags schon gesetzt → no-op, keine Re-Render-Schleife).
3. **Abbruchfest**: nach `closeTerminal(false)` (ESC) bleibt das Flag gesetzt — Test deckt genau diesen Pfad ab.
4. `CommandResult.sideEffects` (totes Feld) bleibt unangetastet; der Mechanismus hängt an der Level-Definition (`TerminalCommand`), nicht an der Shell-Engine.
5. Autosave: Flag-Set löst den normalen Autosave-Pfad aus (kein Sonderfall nötig — verifizieren, dass `useAutosave` am State hängt).

Matching-Breite (Honigtopf-Abdeckung, Design §6 L4 + §8): Das Match muss über die Kommando-Normalisierung der Session laufen, sodass Aliase (`cat`/`type`/`gc` für `Get-Content`, `sls` für `Select-String`), Pipeline-Formen und Pfadvarianten (`./`, absolut) dieselbe `TerminalCommand`-Zeile treffen. Falls das heutige `startsWith`-Matching (siehe Memory: Terminal-Beat-Routing) dafür zu schmal ist, sind mehrere `TerminalCommand`-Einträge mit demselben `setsFlags` der einfachste Weg — der Level-Content-Task (Task 13) schreibt einen Testfall **pro Leseweg**.

---

# PHASE B — Kampagnen-Entkopplung (Probezeit unverändert)

## Task 4: Typen — `CampaignId`, `CampaignDefinition`, vierter Akt

**Files:** `shared/src/types/adventure.ts`, neues `shared/src/types/campaign.ts`.

- `act: 1 | 2 | 3` → `act: 1 | 2 | 3 | 4` (`:21`).
- `CampaignId = 'probation' | 'audit-trail'`; `CampaignDefinition` exakt nach Design §7.3 (chapters, storyEvents, sidequests, sidequestEvents, characters, actBreaks, endings, `deriveEnding`, startChapterId).
- `AdventureState.campaignId: CampaignId`; `createInitialAdventureState(campaign: Pick<CampaignDefinition,'id'|'startChapterId'>)` (`:205`) — Signaturänderung, Aufrufer kompilieren erst in Task 5/6.
- Ending-IDs: `CampaignEndingId = string` (probation behält `'good'|'neutral'|'bad'` als Werte); `EndingType` (`:146`) bleibt als Alias für probation erhalten, Telemetrie-Feld wird `string`.

## Task 5: `getCampaign(id)` + probation-Definition + `adventureEngine` parametrisieren

**Files:** Create `client/src/content/campaigns/index.ts` (`getCampaign`), `client/src/content/campaigns/probation.ts` (verpackt die bestehenden Arrays aus `content/adventure/*` 1:1 — kein Content-Move, nur Re-Export als `CampaignDefinition`; `deriveEnding` delegiert an bestehendes `calculateAdventureEnding`-Verhalten). `client/src/engine/adventureEngine.ts`: alle Funktionen bekommen `campaign: CampaignDefinition` als Parameter statt der Modul-Imports von `adventureChapters`/`adventureSidequests`.

- Tests: bestehende `adventureEngine`-Tests auf Parameter umgestellt, Verhalten byte-gleich (Snapshot der Ending-Ableitung für bekannte Fixtures).
- Engine verträgt `sidequests: []`/leere Chain-Sets (expliziter Test).

## Task 6: App/useGame-Verdrahtung, Ending-Generalisierung, Save-Migration

**Files:** `client/src/engine/gameState.ts:40-42` (Kampagne an `createInitialAdventureState`), `client/src/App.tsx` (`combinedEvents` aus `getCampaign(state.storyState.campaignId)` statt fester Imports `:17,:261`; Ending-Flow `:720-734` über `campaign.deriveEnding`; Akt-Break-Copy aus `campaign.actBreaks`; Charakter-Map aus `campaign.characters`), `client/src/engine/autosave.ts`/`hooks/useSaveLoad.ts` (Migration: fehlende `campaignId` ⇒ `'probation'` — never-throw-Regel), `client/src/engine/metaProgress.ts` (Einträge pro `campaignId`; bestehende Einträge migrieren zu probation), `client/src/engine/telemetry.ts` (Ending als `string`, `campaignId` mitloggen).

- Tests: Autosave-Envelope ohne `campaignId` lädt als probation (node-Test in `autosave.test.ts`); metaProgress-Migration; App-Smoke via bestehende Browser-Tests.

## Task 7: Menü — Kampagnenwahl im Story-Einstieg

**Files:** `client/src/App.tsx` + Menü-Komponente. Ein `story`-Mode (`gameModes.ts` unverändert), nach Auswahl „Story" ein Kampagnen-Auswahlscreen (Probezeit / AUDIT TRAIL), keyboard-first (Pfeile/Enter/Escape, Fokus-Falle — Projektkonvention). „Weiter spielen" resümiert in die Kampagne des Saves.

---

# PHASE C — Werkzeuge

## Task 8: `diff` (einzige allgemeine Unix-Erweiterung)

**Files:** Create `client/src/engine/shell/commands/linux/diffCmd.ts` + Test; Spread in `allLinuxCommands` (`linux/index.ts:19`).

- Normal-Format: Hunk-Header `NcN`/`NaN`/`NdN`, `< `/`> `-Zeilen, `---`-Trenner; LCS-basiert oder simpler Zeilen-Diff, solange Output für die Level-Dateien korrekt ist.
- Exit-Codes: **0** gleich, **1** unterschiedlich, **2** Fehler (fehlende Datei, Verzeichnis) mit `diff: <path>: No such file or directory` auf stderr.
- Tests: identische Dateien, Einfügung, Löschung, Änderung, fehlende Datei, TTY-unabhängig.

## Task 9: Exchange-2019-Semantik + Mailbox-stateGoal

**Files:** `client/src/engine/shell/commands/powershell/index.ts` (bzw. neues Modul `exchange.ts`): `Get-Mailbox`, `Set-Mailbox` (nur `-AuditEnabled $true|$false`, `-Identity` positional); Mailbox-Zustand pro Szenario geseedet (Seed-Weg analog Journal/Units in `hosts.ts`/VFS-Overlay — Implementierung wählt den kleinsten Ort, z. B. eine In-Session-Map). `shared/src/types/terminal.ts` + `client/src/engine/shell/stateGoals.ts`: neuer Goal-Typ `mailbox` + `auditEnabled` (analog `service`/`serviceState`).

- `Get-Mailbox m.lastname | Format-List Audit*` zeigt `AuditEnabled`/`AuditLogAgeLimit`; `Format-List` existiert bereits oder wird auf die zwei Felder begrenzt ergänzt.
- Kein Dienstneustart im Lösungsweg (Design §7.5). Keine weiteren Cmdlets.
- Tests: Cmdlet-Output, stateGoal feuert nach `Set-Mailbox … $true`, nicht vorher.

## Task 10: Mail-Compose-Event-Variante

**Files:** `client/src/components/TerminalUI/EmailMockup.tsx` (Anzeige bleibt), neue Darstellungsvariante in `EventCard` (Design §7.6): Event mit `presentation: 'mail-compose'` rendert An/CC/Betreff + Choices als Sende-Varianten. Choices bleiben `EventChoice` mit `setsFlags` — keine Engine-Änderung.

- Browser-Test: Choice-Auswahl per Tastatur, Flag gesetzt, `prefers-reduced-motion` unbeeinträchtigt.

---

# PHASE D — Content AUDIT TRAIL (Design §4–§6 ist die Spec)

## Task 11: Kampagnen-Skelett + Domänen-/Ending-Logik

**Files:** Create `client/src/content/campaigns/audit-trail/{chapters,events,characters,actBreaks,endings,domains}.ts` + `client/src/content/campaigns/audit-trail/domains.test.ts`.

- 4 Akte, Kapitelraster nach Design §6; Beats zunächst mit Platzhalter-Events, damit `isAtAuthoredStoryEnd` den „Fortsetzung folgt"-Pfad korrekt zeigt, solange Akte fehlen.
- `domains.ts`: D1–D5 als `FlagCondition`-Konstanten (Design §5.2) — **dieselben Objekte** werden von Akt-4-Beats (branchCondition) und `deriveEnding` benutzt (kein Duplikat).
- `deriveEnding`: Prioritätslogik §5.3 (Rächer ⇒ Stille&lt;2 ⇒ Profi≥4 inkl. D1+D2 ⇒ Stille-Untervariante). Tabellengetriebene Tests inkl. aller Grenzfälle.
- Endings-Texte inkl. modularer Epilog-Bausteine pro Domäne; Rächer-Text mit dem DSGVO-Wording aus §5.3 (Bewertung/Dokumentation, Behördenmeldung nur bei voraussichtlichem Risiko, Art. 33).

## Task 12: Akt 1 — Onboarding

L1 „Der erste Arbeitstag", L2 „Die Inventur" (stateGoal auf Inventar-Datei; Choice → `shared_account_documented`, `onboarding_documented`), Volker-/Silke-Intro-Events, erste `[intern]`-Notiz. Hint-Eskalation beachten (hints[0] orientiert, Syntax zuletzt). `npm test` als Content-Gate.

## Task 13: Akt 2 — Die Spur

- L3 diff-Level (`ticket_tamper_documented`) — nutzt Task 8.
- L4 EXCH01: `Get-ChildItem` + `Select-String -Path u_ex240722.log` (expliziter Dateiname, kein Glob). Honigtopf-PST mit `setsFlags: ['mailbox_scope_exceeded']` — **Testdatei mit einem Testfall pro Leseweg**: `Get-Content`, `cat`, `type`, `gc`, `Select-String`, `sls`, Pipeline-Form, Pfadvarianten (Design §8). Übergabeprotokoll-Beginn.
- Freigabe-Dialog (`authorization_documented`) + Melde-Mail (`finding_reported`, nutzt Task 10).
- L5 Analyse-VM: `cp`/`sha256sum`/Timeline/Protokoll → `evidence_hashed`, `export_documented` (stateGoals; Seeding-Traps aus Memory beachten: kein bare `fileExists`-Irrtum, absentMatches-Semantik).
- L6 EXCH01: `Get-Mailbox`/`Set-Mailbox -AuditEnabled $true` → `mailbox_auditing_enabled` (nutzt Task 9), Lernnotiz Online/On-prem.

## Task 14: Akt 3 — Die Blockade

Volker-Dialogkarten (spitze Optionen → `volker_provoked`, `[intern]`-Notiz sichern → `volker_warning_preserved`; Vorlage `internal`-Pack; ≥2 ungegatete Optionen pro Karte — Choice-Design-Regel). L7 Explorer-GUI (`bastion_delivery_found`). Schnittstellen-Mail (`handover_mail_sent`, Task 10). L8 ★ optional (Jumphost-Muster → `bastion_live`). Optionaler Chain-Trigger `volker_provoked` → Silke-Zwischenfall (`delayWeeks`, Chain-Regeln aus Memory: Mode-Scoping über Start-Event).

## Task 15: Akt 4 — Das Audit

Fünf Auditfrage-Beats, `branchCondition` = Domänen-Konstanten aus Task 11; Konfrontationsszenen für belastende Flags (F2 Personalrat, F5 Dossier); Ending-Aufruf + modularer Epilog (nur erfüllte Domänen werden behauptet; D3-Aufwertung durch `bastion_live`).

## Task 16: Konsistenz-Guard + Full pass

**Files:** Create `client/src/content/campaigns/audit-trail/campaignConsistency.test.ts` (Muster: bestehende Story-Konsistenztests).

- Assertions: jedes in einer `FlagCondition` referenzierte Flag wird von mindestens einem Event/Level gesetzt; jedes §5.1-Flag wird von mindestens einer Domäne gelesen; alle Beat-`eventId`s existieren; keine Sidequests registriert.
- Full pass: `npm test`, `npm run test:client`, `npm run build`, `npm run test:e2e` (Story-Smoke: Probezeit unverändert; AUDIT-TRAIL-Start bis L1 spielbar — verify-Skill `.claude/skills/verify/SKILL.md` für den manuellen Durchstich).
