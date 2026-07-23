# Design: hierarchische Zurück-Navigation + Spieler-Personalisierung

**Datum:** 2026-07-23
**Status:** Approved
**Scope:** Zwei unabhängig test- und committierbare Phasen auf einem eigenen Branch (`feat/back-navigation-personalization`). Phase 1 füllt die heute lückenhaften Nicht-Modal-Zurück-Ebenen mit einem zentralen, reinen Resolver; Phase 2 macht einen gespeicherten Anzeigenamen in narrativem Text sichtbar. Kein Terminal-Refactor, kein Eingriff in Shell-/VFS-/SSH-Mechanik.

## Ausgangslage (aus dem Code verifiziert)

- **Kein globales ESC.** ESC wird heute pro Komponente gehandhabt und tut nur in Modals, Intro und der `terminal`-Phase etwas. Lücken: aktive Event-Card (`playing`) hat kein Zurück; der **LearningHub ist eine Sackgasse** (kein Weg zum Hauptmenü außer Reload/Save-Load); `gameover` hat keinen direkten Menü-Button. Nur zwei Buttons (beide im Terminal) erfüllen 44 px.
- **Autosave deckt nur abgeschlossene Schritte.** `writeAutosave` schreibt bei GameState-Mutationen (abgeschlossene Choice / Tageswechsel), nicht beim bloßen Servieren eines Events. `currentEvent`/`currentScenario` sind React-`useState` in `useGame`, **nicht** Teil von `GameState`. Beim Resume (`game.loadState`) wählt der App-Selector das laufende Event neu. → Der aktuelle, noch nicht abgeschlossene Schritt wird beim Wiedereinstieg neu gestartet; abgeschlossene Schritte bleiben erhalten.
- **`closeTerminal(false)`** löscht nur Pending-Zustand und setzt `phase = 'playing'`; **`currentEvent` bleibt erhalten** → ein Terminal-Abbruch führt bereits heute zurück zur Briefing-Event-Card.
- **Token-Ersetzung existiert** (`{chef}`/`{gf}`/`{kollege}`) über zwei duplizierte `replaceCharacterNames`-Funktionen in `EventCard` und `ResultScreen`, gespeist aus der `characters`-Map. Terminal-Briefing/Hints, `ScenarioCard.flavorText` und Story-Act-Break-Text rendern roh.
- **`kritis_player_name` existiert bereits** (optionaler Name-Prompt am Menü, `App.tsx`), wird aber **nur für Telemetrie** gelesen, nie in Spieltext gerendert. **Jedes `timo`/`Timo` im Code ist technisch** (SSH-Login/Pfade/Account-Seeding, teils in sichtbarer Prosa in `learning-path-advanced.ts`, die byte-genau zum VFS-Account passen muss). Es gibt **keine** kosmetische „Timo"-Stelle; `{player}` ist ein **neu authorter** Token.

---

## Phase 1 — Hierarchische Zurück-Navigation

### Reiner Resolver

`client/src/engine/backNavigation.ts` — framework-frei, node-testbar:

```ts
export type BackActionKind = 'cancel-level' | 'learning-hub' | 'main-menu' | 'confirm-leave-run';
export interface BackAction { kind: BackActionKind; label: string }

export interface BackViewState {
  anyModalOpen: boolean;
  phase: GamePhase;              // menu | playing | terminal | result | gameover | storyEnding
  isLearning: boolean;
  hasCurrentContent: boolean;    // Event ODER Scenario
}

export function resolveBack(v: BackViewState): BackAction | null;
```

`hasCurrentContent` deckt Event **und** Scenario ab (ein reines `hasCurrentEvent` würde Scenario-Cards vergessen). `gameMode`/`isCliOnly` sind redundant und entfallen.

### Geordnete Entscheidungskette

| Reihenfolge | Bedingung | `kind` | `label` |
|---|---|---|---|
| 1 | `anyModalOpen` | — | **`null`** (Guard) |
| 2 | `phase === 'terminal'` (Terminal- **und** GUI-Level) | `cancel-level` | „Level abbrechen" |
| 3 | `phase === 'playing' && isLearning && hasCurrentContent` | `learning-hub` | „Zum Lernpfad" |
| 4 | `phase === 'playing' && isLearning && !hasCurrentContent` (LearningHub) | `main-menu` | „Zum Hauptmenü" |
| 5 | `phase === 'playing' && !isLearning && hasCurrentContent` (Story/Standard-Event- oder Scenario-Card) | `confirm-leave-run` | „Zum Hauptmenü" |
| 6 | `phase === 'gameover'` | `main-menu` | „Zum Hauptmenü" |
| 7 | `phase === 'storyEnding'` | `main-menu` | „Zum Hauptmenü" |
| — | sonst (inkl. `result`, `menu`, `playing` ohne Content im Nicht-Lernmodus) | — | **`null`** |

**`result` liefert bewusst `null`** (vorwärtsgerichtet): Choice-Effekte sind dort bereits gespeichert, aber der Tageswechsel geschieht erst mit `continueGame()`. Ein direkter Menüausstieg würde einen halb abgeschlossenen Übergang persistieren und könnte nach Resume mehrere Events auf denselben Tag legen — das definiert dieses Feature nicht neu. `result` behält seine vorhandenen CTAs (inkl. „Zum Lernpfad" im Lernmodus).

**Lern-Terminal ist zweistufig:** ESC im Terminal → `cancel-level` → zurück zur Briefing-Event-Card (weil `closeTerminal(false)` `currentEvent` erhält) → dort ESC → `learning-hub` → Hub → `main-menu`. Terminal → Event-Card → Lernpfad → Hauptmenü.

> **Verifikation im Plan:** Bestätigen, dass GUI-Level (WindowsLevel) ebenfalls unter `phase === 'terminal'` laufen (sonst braucht `BackViewState` ein zusätzliches Flag). Erwartung laut Code-Map: ja.

### Guard

`anyModalOpen` aggregiert **alle** transienten Overlays: Intro, Save/Load, GameMode, NewGame, Legal **und** den neuen Run-verlassen-Dialog. Bei offenem Overlay liefert der Resolver `null`; das Overlay handhabt seinen eigenen ESC lokal (bestehende Focus-Trap-/ESC-Logik bleibt unangetastet). Damit sind die Prioritätsregeln 1+2 („Modal offen → Modal schließen; nie gleichzeitig Run-Dialog"; „Dialog+ESC → nur Dialog schließt") strukturell garantiert.

### Ausführung

`executeBack(action)` in `App.tsx` bildet `kind` → tatsächliche Navigation ab:

- `cancel-level` → `game.closeTerminal(false)` (Pending weg, `phase='playing'`, `currentEvent` bleibt).
- `learning-hub` → `game.clearCurrentContent()` (zurück zum Hub).
- `main-menu` → **transiente UI-Inhalte schließen und `phase='menu'` setzen; bestehender `GameState` und Autosave bleiben unverändert.** Der noch offene, unvollständige Event-/Terminalzustand (React-State) wird verworfen. **App liest `resumeSave` beim Rückkehr ins Menü neu aus dem Autosave** — heute wird `resumeSave` nur beim App-Start gelesen und beim Resume auf `null` gesetzt; ohne Neulesen fehlte nach „Run verlassen" der „Weiter spielen"-Button, obwohl der Autosave existiert.
- `confirm-leave-run` → Run-verlassen-Dialog öffnen (setzt ein Modal-Flag, das in `anyModalOpen` einfließt).

**Ein** globaler ESC-Listener (in `App`, gated auf `!anyModalOpen` via Resolver) und der geteilte **`BackButton`** beziehen beide `resolveBack(viewState)` und rufen `executeBack(action)`. Der bisherige Terminal-ESC-Zweig wandert aus `GameScreen` in diesen zentralen Pfad (kein zweiter Nicht-Modal-Handler).

### `BackButton` (sichtbar, 44 px)

Geteilte Komponente `client/src/components/BackButton` mit `min-h-11` (44 px Touch-Ziel), Label aus dem `BackAction`. Gerendert dort, wo der Resolver eine Nicht-`null`-Aktion liefert (Terminal-Header nutzt den bestehenden `[ESC] Abbrechen`-Slot; Event-Card/Hub/gameover erhalten den Button an konsistenter Position). Mobil zwingend, weil dort keine ESC-Taste existiert.

### Run-verlassen-Dialog

Eigene, keyboard-navigierbare Modal-Komponente (Focus-Trap, eigener ESC = „Run fortsetzen"), fließt in `anyModalOpen` ein. Ehrliche Wording (durch die Autosave-Analyse belegt; finaler Feinschliff = Domäne des Nutzers):

> **Run verlassen und zum Hauptmenü?**
> Du kannst den Run später über „Weiter spielen" fortsetzen. Der aktuelle, noch nicht abgeschlossene Schritt wird möglicherweise neu gestartet.
>
> [ Run fortsetzen ]  [ Zum Hauptmenü ]

### Tests (Phase 1)

**Resolver (node):** offenes Modal → `null`; `terminal` → `cancel-level`; `playing`+learning+content → `learning-hub`; `playing`+learning+kein Content → `main-menu`; `playing`+standard+content → `confirm-leave-run`; `gameover`/`storyEnding` → `main-menu`; `result` → `null`; Button und ESC beziehen denselben `BackAction`.

**Integration (jsdom):** Run-Dialog + ESC → nur der Dialog schließt (kein zweiter Sprung); ein ESC erzeugt genau eine Navigation; **Run→Menü verändert den gespeicherten `GameState` nicht**; unvollständiger Event-/Terminalzustand wird verworfen; **„Weiter spielen" erscheint nach „Run verlassen" wieder**.

---

## Phase 2 — Spieler-Personalisierung

### Reiner Formatter

`client/src/engine/formatNarrativeText.ts`, extrahiert aus dem duplizierten `replaceCharacterNames`:

```ts
formatNarrativeText(text, { ...characters, player: displayName });
// Ersetzung IMMER per Callback — NIE Replacement-String:
//   text.replace(pattern, () => value)
// Ein frei eingegebener Name mit $&, $', $` oder $$ würde als
// Replacement-Syntax interpretiert; React schützt vor HTML-Injection,
// aber diese String-Semantik braucht einen expliziten Test.
```

Angebunden **nur** an `EventCard` und `ResultScreen` (die zwei bestehenden Choke-Points; beide Duplikate durch die eine reine Funktion ersetzt). Terminal-Hints und Scenario-Pfade bleiben **explizit außerhalb V1** — entsteht dort später echter Textbedarf, kann derselbe Formatter gezielt angebunden werden.

### Anzeigename

React-State in `App`: beim Start aus `kritis_player_name` gelesen; nach `saveName` sofort im State aktualisiert (ohne Reload); leer/übersprungen → Fallback **„Timo"**. Der Name fließt als `player` in die an `EventCard`/`ResultScreen` gereichte Token-Map. Er berührt **nie** Account, Home-Verzeichnis, SSH-Ziele oder VFS; `{player}` ist ein neu authorter Token und ersetzt kein bestehendes technisches `timo`.

### Starter-Authoring (drei Stellen)

- `evt_erster_arbeitstag`, **Beschreibung**:
  > Dein erster Tag bei WARM. {chef} blickt kurz von seinem Bildschirm auf. „Willkommen, {player}." Dann gibt er dir gleich zwei Aufgaben:
- `evt_erster_arbeitstag`, **ResultText von `ask_colleague`**:
  > Jens lächelt. „Guter Instinkt, {player}. Wenn die GF meckert, ist das Prio 1. …"
- `learn_11_final_boss`, **Abschluss**:
  > Du hast es geschafft, {player}!

Deckt EventCard, ResultScreen, Story und Lernmodus sichtbar ab, ohne Namensnennung inflationär einzusetzen. (Die `…`-Fortsetzungen behalten den bestehenden Originaltext; nur der Namens-Token wird eingefügt.)

### Menühinweis (ehrlich aktualisiert)

> optional — für persönliche Ansprache und Team-Statistik

### Tests (Phase 2)

Gespeicherter Name ersetzt `{player}`; kein Name → „Timo"; Name mit `$&` erscheint wortwörtlich (Callback-Beweis); bestehende `{chef}`/Charakter-Tokens funktionieren unverändert; technische `timo`-Strings bleiben bytegenau unverändert; kein authored `{player}` bleibt in Event-/Result-Prosa sichtbar stehen.

---

## Nicht im Umfang

- Kein globaler `applyTokens`-Formatter an Terminal-/Scenario-/Act-Break-Pfaden (V2, bei echtem Bedarf).
- Keine Migration der bestehenden Modal-/Focus-Trap-ESC-Logik in den zentralen Resolver — die lokalen Modal-Handler bleiben.
- Keine Änderung an der Tageswechsel-/`continueGame`-Semantik oder am `result`-Vorwärtsfluss.
- Keine Änderung an Account/`/home/timo`/SSH/VFS.
