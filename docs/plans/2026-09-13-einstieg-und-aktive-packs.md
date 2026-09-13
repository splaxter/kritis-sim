# Einsteiger-Szenarien und aktive Anbieter-Packs — Umsetzungsplan

**Design-Doc:** `docs/plans/2026-09-13-einstieg-und-aktive-packs-design.md` —
**bei Widerspruch gewinnt das Design-Doc.** Freigegeben ist Variante 1.

**Ziel:** Neun praktische Aufgaben. Drei neue Szenarien auf Schwierigkeit 1
(GUI, ohne Shell-Vorwissen) plus sechs vorhandene Fälle, die eine echte Aufgabe
bekommen. Dazu ein deterministischer Einstieg im Modus `beginner`.

**Architektur:** Erst die Daten (Szenarien), dann die Auswahl (Einstieg), dann
die Abnahme. Jede Phase ist separat committbar. Der Lernbereich, die Kampagnen
und die Modi `intermediate`/`kritis` dürfen sich in keiner Phase anders
verhalten.

---

## Orientierung — geprüfte Anker (zitieren, nicht neu suchen)

| Was | Wo |
|---|---|
| Szenario-Typ, `guiCommand`/`terminalCommand` | `shared/src/types/scenarios.ts:27-55` |
| Pack-Registry | `client/src/content/packs/index.ts` (5 Packs, 42 Szenarien) |
| Auswahl Event vs. Szenario | `client/src/App.tsx:335-345` (`scenarioChance`, Woche 1 = 10 %) |
| Szenario-Filter | `client/src/engine/scenarioEngine.ts` — `getAvailableScenarios` (Modus-Cap + Frühphasen-Cap 2), `selectNextScenario` (Dringlichkeits-Gewichtung) |
| Beginner-Konfiguration | `shared/src/config/gameModes.ts:9-40` — `maxScenarioDifficulty: 2`, 5 Tage/Woche, 12 Wochen |
| Szenario öffnet GUI/Shell | `client/src/App.tsx:988-995` → `game.openScenarioTerminal` |
| Abschluss nur beim Lösen | `client/src/hooks/useGame.ts:349-378` (`closeTerminal`, Zweig `pendingScenarioTerminalChoice`); Abbruch → `setPhase('playing')`, keine Buchung |
| Rendering des Levels | `client/src/components/GameScreen/index.tsx:161-225` — `currentScenario?.guiContext` wird bereits durchgereicht |
| Shell aus Kontext bauen | `client/src/engine/shell/index.ts:126-183` (`createShellFromContext`) |
| Tutorial-Kette | `client/src/content/events/tutorials.ts` — 4 Level, `weekRange: [1, 1]`, verkettet über `requires.events` |

**Bestandsaufnahme, die den Plan begründet:** `grep -c guiCommand` über alle
Packs ergibt **0**. Die vier GUI-Aufgaben dieses Plans sind die ersten
Szenarien überhaupt, die `guiContext` benutzen — die Verdrahtung existiert
(App.tsx, GameScreen, useGame), ist aber im Szenario-Pfad noch nie gelaufen.
Das ist der Punkt, an dem in der Abnahme zuerst hingesehen wird.

**Fallen aus den vorherigen Bauten, die hier wieder greifen:**

1. `seedVfsFromScenario` materialisiert **jeden** in `taskText`/`hints`
   genannten Pfad und füllt ihn mit dem Dateinamen. Der Name einer zu
   schreibenden Datei darf nie enthalten, worauf ihr Inhaltsziel prüft.
2. `commandRan` matcht die Kommando**zeile als Text** — immer mit `^`
   verankern. Für „hat wirklich gelesen" ist `fileRead` das richtige Mittel,
   nicht `commandRan`.
3. `performed` ist ein Verlauf, kein Zustand. Änderbare Auswahlen brauchen
   `retract`; ein `submit`-artiger Token muss bei jeder späteren Änderung
   zurückgenommen werden.
4. `findMetGuiSolution` nimmt die **erste** passende Lösung — Risiko vor Lob.
5. Orthographie: echte Umlaute in allem, was angezeigt wird **und** in
   Kommentaren. IDs und Pfade bleiben ASCII.

---

## Phase A — die drei Einstiegsfälle (Schwierigkeit 1)

Alle drei sind GUI, ohne Countdown, ohne Zugangsvoraussetzung. Drei gestufte
Hinweise: Ziel, Bedienung, konkreter Schritt. Jedes Szenario hat neben der
praktischen Option mindestens eine ungatede Alternative (Abgeben/Nachfragen),
deren Nachgeschichte keinen eigenen praktischen Abschluss behauptet.

### Task 1: `INTERN-SC-011` — Der erste hängende Prozess
**Files:** Edit `client/src/content/packs/internal/scenarios.ts`

App `taskmanager`. Die Tourenplanung hängt; der Backup-Prozess hat die höchste
CPU-Last, ist aber legitim. Lösung: `select:` **und** `endtask:` auf genau der
hängenden Anwendung. Der Ergebnistext bestätigt nur das Beenden — **nicht**
einen geprüften Neustart.

Gegenprobe: `endtask:` auf dem Backup-Prozess löst nicht; bloßes `select:`
löst nicht.

### Task 2: `CLOUD365-SC-007` — Ein Update, das niemand bestellt hat
**Files:** Edit `client/src/content/packs/cloud365/scenarios.ts`

App `uac`. Kein verifizierter Herausgeber, Herkunft ein Mail-Download, kein
passender Auftrag. Lösung: ablehnen. Die Begründung im Ergebnistext hängt an
**Auftrag und Herkunft**, nicht an einer pauschalen Regel „unbekannt = Schad-
software" — sonst lernt der Spieler das Falsche.

### Task 3: `TELEKOM-SC-007` — Welche Leitung gehört zu unserem Standort?
**Files:** Edit `client/src/content/packs/telekom/scenarios.ts`

App `explorer`, `mode: 'files'`. Zwei Standorte, dazu eine deutlich
gekennzeichnete alte Vertragsfassung. Lösung: die **aktuelle** Fassung des im
Ticket genannten Standorts öffnen. Der Abschluss behauptet **kein** bereits
eröffnetes Provider-Ticket.

Gegenprobe: die alte Fassung und der falsche Standort lösen nicht.

### Task 4: Guards für die drei
**Files:** Create `client/src/content/packs/einstiegsSzenarien.test.ts`

Schwierigkeit 1; `guiContext` vorhanden und `guiCommand` gesetzt; ≥ 2 ungatede
Optionen; Hinweis-Eskalation; jede Falsch-Interaktion aus der Tabelle oben löst
nicht (über `findMetGuiSolution` geprüft, nicht nur per Augenschein).

---

## Phase B — der deterministische Einstieg

### Task 5: Auswahlregel
**Files:** Create `client/src/engine/onboarding.ts`, `onboarding.test.ts`

Reine Funktion, keine React-Abhängigkeit:

```ts
export function getOnboardingScenarioId(state: GameState): string | null
```

Liefert im Modus `beginner`, in Woche 1, an den Tagen 2–4 die vorgesehene ID —
aber nur, wenn sie noch nicht in `completedScenarios` steht. Sonst `null`.

Tests: richtige Reihenfolge Prozess → UAC → Unterlage; andere Modi bekommen
`null`; Woche 2 bekommt `null`; ein abgeschlossener Fall wird nicht wiederholt
(geladener Spielstand); `null` bei unbekannter ID (kein Absturz, wenn ein
Szenario später umbenannt wird).

### Task 6: Einbau vor der Zufallsentscheidung
**Files:** Edit `client/src/App.tsx` (Block bei Zeile 335)

Die Regel läuft **vor** `scenarioChance`. Greift sie nicht, bleibt alles exakt
wie bisher. `cliOnly` und der Story-Zweig kehren weiterhin vorher zurück.

### Task 7: Tutorial-Fenster
**Files:** Edit `client/src/content/events/tutorials.ts`

`weekRange` der vier Tutorials von `[1, 1]` auf `[1, 3]`. Reihenfolge und
`requires` bleiben unverändert. Begründender Kommentar: die Tage 2–4 der ersten
Woche gehören jetzt dem Einstieg, ein Fenster von einer Woche machte die
späteren Tutorials unerreichbar.

---

## Phase C — die sechs Ausbauten

Je Szenario bekommt die fachlich passende Option `terminalCommand: true` bzw.
`guiCommand: true`, dazu den Kontext. Text, Wertung und Nachgeschichte werden
**gemeinsam** angepasst: eine ausführliche Erfolgsgeschichte darf nach dem
Umbau nichts behaupten, was weder der Spieler getan hat noch ein ausdrücklich
genannter Beteiligter übernimmt.

| Task | Szenario | Kontext | Kern der Prüfung |
|---|---|---|---|
| 8 | `CLOUD365-SC-002` Migrationstag | Shell | Transferstatus **und** Funktionstest gemeinsam auswerten; beides kann gleichzeitig wahr sein |
| 9 | `CLOUD365-SC-006` Copilot | Shell | vorhandene zu breite Berechtigung belegen — keine erfundene Umgehung der Zugriffskontrolle |
| 10 | `INTERN-SC-003` Statusbericht | Shell | Backup-Lauf ≠ Wiederherstellungstest; Fehlendes muss offen bleiben |
| 11 | `INTERN-SC-004` Disposition | GUI `eventviewer` | die konkrete Verbindungsstörung anhand Details **und** Zeitpunkt; der Abschluss bestätigt die Diagnose, nicht eine Reparatur |
| 12 | `TELEKOM-SC-001` sporadische Ausfälle | Shell | zeitlich zusammengehörige Ausfälle korrelieren; keine erfundene defekte Provider-Komponente |
| 13 | `TELEKOM-SC-006` Bandbreiteneinbruch | Shell | Vertrag vs. ausgehandeltes Profil vs. **kabelgebundene** Messung |

### Task 14: Durchstich durch die echte Shell
**Files:** Create `client/src/engine/packScenarioLessons.test.ts`

Für jede der fünf Shell-Aufgaben: Sollpfad über die echte `ShellEngine` fahren
und `checkStateGoals` prüfen; unmittelbar nach dem Erzeugen ist nichts gelöst;
dazu die Fehlwege aus dem Design (nur Behauptung, fehlende Quelle, falscher
Zeitraum/Standort, unvollständiger Befund, falsche Schlussfolgerung).

### Task 15: GUI-Gegenproben
**Files:** Edit `einstiegsSzenarien.test.ts` (auf alle vier GUI-Fälle erweitern)

Falscher Prozess/Beleg/Eintrag und bloßes Auswählen lösen nicht.

---

## Phase D — Abnahme und Doku

### Task 16: Browser
Einsteiger-Ablauf vom Menü bis zum Ergebnis; die neun praktischen Wege je aus
ihrer Szenariokarte. Frischer Build, eigener Server —
`lsof -tiTCP:3000 -sTCP:LISTEN | xargs -r kill` vorher.

### Task 17: Layout
320×568, 375×667, 667×375. Clipping gegen den nächsten schneidenden Vorfahren
prüfen, nicht über `boundingBox()` allein.

### Task 18: Gesamtlauf
`npm run build && npm run lint && npm test && npm run test:client`, dann
`npx playwright test > out.txt 2>&1; echo $?` — **nie** durch `tail` gepiped.
Skip-Zahlen vollständig auswerten.

### Task 19: Doku
`docs/TECHNICAL_DEBT.md` (die beiden Einträge erst jetzt als erledigt führen),
`docs/CONTENT_INVENTORY.md` (42 → 45 Szenarien), `docs/GAME_MODES_SPEC.md`
(Einsteiger-Einstieg).

---

## Reihenfolge

Phase A → B → C → D. **Phase A + B sind zusammen unabhängig auslieferbar** —
sie lösen das Einsteiger-Problem vollständig. Phase C kann nachziehen, falls
die Shell-Aufgaben länger brauchen.

Der ungeklärte Playwright-Layout-Flake (`scenario card fits …`) bleibt
außerhalb dieser Änderung; ein tatsächlicher neuer Fehlschlag wird anhand
seines Traces geprüft, nicht auf Verdacht behandelt.
