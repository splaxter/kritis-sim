# Design: verhaltensbewahrende Extraktion von `useTerminal.ts`

**Datum:** 2026-07-23
**Status:** Approved
**Scope:** Rein verhaltensbewahrender Refactor. Keine sichtbare Verhaltensänderung, kein neues Feature. Die Abnahme-Schwelle ist Nullregression: bestehende Terminal-Browser-Tests unverändert grün, plus neue Charakterisierungstests der extrahierten Session.

## Motivation

`client/src/components/Terminal/useTerminal.ts` (~890 Zeilen) ist ein einziger Mount-`useEffect([context, shell, isBeginnerMode])`, in dem der gesamte handgeschriebene xterm-Eingabe-Loop lebt: Tastatur-Editierung, Canned-Command-Matching, echte Shell-Ausführung, Passwort-`pendingInput`, Solution-Detection, Live-Skill-Drip, After-Action-Feedback, Ausgabe-Streaming/-Pacing und Tab-Completion teilen sich mutable Closure-Variablen und schreiben direkt in xterm. Die empfindlichen Zustandsübergänge sind heute nicht isoliert testbar. Ziel: dieselben Übergänge in eine framework-freie, unit-testbare Einheit ziehen, ohne Verhalten zu ändern.

## Grundentscheidung (bestätigt): Approach A — reine Session + Effekte

Eine framework- und I/O-freie `TerminalSession` besitzt allen Zustand und alle Entscheidungen, nimmt Inputs entgegen und gibt eine flache, geordnete `TerminalEffect[]`-Liste zurück. Der Hook wird zum schlanken Adapter, der Effekte deterministisch auf xterm anwendet. Dadurch wird der ganze Loop unit-testbar.

## 1. Drei Schichten statt einem `useEffect`

- **`TerminalSession`** (framework-frei, I/O-frei) — besitzt allen Zustand + alle Entscheidungen; nimmt Inputs, gibt eine flache, geordnete `TerminalEffect[]`-Liste zurück. Die Shell ist eine **injizierte Abhängigkeit**.
- **xterm-Adapter** (der schlanke Hook) — verdrahtet `term.onData` → `session.handle…()`, wendet Effekte deterministisch an, hängt Timer an (`scheduleDrip` → `setTimeout` → Rück-Input), spiegelt React-Zustand (Hint-/Command-Zähler, `solved`). Kennt weder Shell noch Callback.
- **`renderInput`-Renderer** (rein) — die einzige Stelle mit ANSI-Cursor-Mathematik; eigene fokussierte Tests. So kontaminiert die empfindliche Byte-Rechnung nicht die Session-Logik.

## 2. Session-Zustand

Alles, was heute Closure-Variable im `useEffect` ist, wandert in die Session:

- Zeilen-Editor: `line`, `cursorPos`, `savedLine`.
- History (inkl. History-Expansion und Navigation).
- `pendingInput` (Passwort-/maskierte Eingaben) — siehe §5.
- Solution-/Skill-Zustand: `solved`, `liveSkillGain`, `creditedCommands` (Set), `pendingSkillGain`, `pendingSolutionEffects`.
- Pager/Drip: `streaming`, Ausgabe-Queue, Index.
- Tab-Completion: `tabCompletions`, `tabIndex`.
- Hint-/Command-Zähler.

## 3. Effekt-Modell (semantisch, flach)

Effekte beschreiben **externe Aktionen, nicht erneut Geschäftslogik**. Der Adapter übersetzt sie deterministisch in Writes, ANSI-Sequenzen und Timer-Anbindung.

```ts
type TerminalEffect =
  | { type: 'writeLine'; text: string }
  | { type: 'renderInput'; prompt: string; line: string; cursor: number }
  | { type: 'showPartial'; feedback: string }
  | { type: 'showPage'; lines: string[]; pingLike: boolean }
  | { type: 'bell' }
  | { type: 'updateHints'; count: number }
  | { type: 'solved'; resultText: string; skillGain: number }
  | { type: 'scheduleDrip'; delayMs: number }
```

- `solved` wird **nicht** verschachtelt — es steht als ein Element neben seinen Folge-Effekten in derselben geordneten Liste. So bleiben Reihenfolge und Tests klar.
- Autor-Regel innerhalb einer Effektliste: Zustands-/Risikowechsel vor Darstellung.
- Die konkrete Effekt-Menge kann während der Extraktion wachsen (z. B. weitere Editier-Primitive), solange jeder Effekt eine externe Aktion bleibt und keine Logik dupliziert.

## 4. Input-Modell (Adapter entscheidet nie den Typ)

Ein Eintrittspunkt pro Input-**Quelle**, nie pro Semantik. Der Adapter darf niemals selbst entscheiden, ob eine Eingabe Command, Passwort oder Pager-Fortsetzung ist.

- `handleData(data: string): TerminalEffect[]` — **alle** Tastatur-Bytes inkl. kompletter Escape-Sequenzen (Pfeile/Home/End/Delete). Die Session routet intern zu Command / Passwort-Pending / Pager-Fortsetzung / Zeilen-Edit.
- `tick(kind: 'drip'): TerminalEffect[]` — der timergetriebene Rück-Input (Drip-Gutschrift, gepacte Ausgabe). Der Adapter feuert ihn nur als Antwort auf `scheduleDrip`/`showPage`.

### ESC bleibt exakt wie heute — keine vorweggenommene API

Dieser Refactor **bewahrt lediglich die heutige Zuständigkeit** und führt keine neue globale ESC-Semantik ein:

- Komplette Terminalsequenzen wie `\x1b[A` bleiben Session-Input (die Session parst sie wie bisher).
- App-Navigation bleibt außerhalb der Session.
- Das bestehende `onTerminalCancel` verhält sich unverändert.
- Ein neues `unhandledEscape`-Protokoll kommt **erst mit dem Navigationsfeature** (zweites Design), falls es dort tatsächlich benötigt wird. So vermeiden wir eine vorweggenommene API, deren Form erst das zweite Design bestimmen sollte.

## 5. Shell-Integration (die kritische Naht)

Die Shell ist eine **injizierte Abhängigkeit**, kein hart erzeugtes Singleton:

```ts
new TerminalSession({
  shell: new ShellEngine(seed),
  // weitere Ports/Callbacks
});
```

Damit gilt:

- Nur die Session ruft `shell.execute()` bzw. die Continuation auf.
- `requestInput(prompt, mask, cb)` wird intern in `pendingInput` übersetzt; der Adapter sieht weder Shell noch Callback.
- Debug-Informationen kommen über ein read-only `session.getSnapshot()`, nicht über einen Shell-Hintereingang.
- Tests können die echte deterministische Shell **oder** einen kleinen Fake injizieren.

### Pending-Input (Übergangs-Kompromiss)

Für den ersten, verhaltensbewahrenden Refactor darf die Session den bestehenden Callback intern halten:

```ts
pendingInput: {
  prompt: string;
  mask: boolean;
  resume: (value: string) => void;
} | null
```

Das macht die Session framework- und I/O-frei, aber wegen der Funktion im Zustand noch nicht mathematisch „rein". Das ist als Übergang vertretbar. Langfristig (separater, späterer Schritt — **nicht** Teil dieses Refactors) wäre eine explizite callbackfreie Shell-Continuation sauberer:

```ts
shell.execute(command)        // => Complete | AwaitInput { prompt, mask, continuationId }
shell.continueInput(continuationId, value)
```

### Invarianten (Akzeptanzkriterien für die Extraktion)

- Vor dem Aufruf von `resume` wird `pendingInput` geleert, damit ein synchroner Folge-Prompt sauber gesetzt werden kann.
- Passwort-Eingaben gelangen **weder** ins Execution-Log **noch** in Effekte oder Debug-Snapshots.
- Abbruch (Ctrl-C) schließt die Pending-Continuation genau einmal.
- Shell-Ausgabe, Solution-Detection und Drip/Pager-Pipeline laufen nach `execute` **und** nach `resume` durch denselben Verarbeitungspfad — kein zweiter Zweig.
- Der Adapter entscheidet niemals selbst, ob eine Eingabe Command, Passwort oder Pager-Fortsetzung ist.

## 6. Test-Aufteilung

- **Session-Tests** (neu, node-env): Zustand + semantische Effektfolge. Beispiele: `ssh timo@srv-web` → Passwort-Prompt → maskierte Eingabe → gelöst; `?` erhöht Hints; Drip-Gutschrift; Pending-Abbruch schließt genau einmal; Passwort taucht in keinem Effekt/Log/Snapshot auf. Echte deterministische Shell oder kleiner Fake injizierbar.
- **Renderer-Tests** (neu, node-env): Cursor-Spalten, ANSI-Bytes, Unicode-Prompts, Grenzfälle.
- **Integration** (die bestehenden `*.browser.test.tsx`): unverändert grün — beweisen Session → Adapter → xterm.

## 7. Migrationsstrategie (verhaltensbewahrend)

Charakterisierung zuerst: bestehende Terminal-Browser-Tests als Sicherheitsnetz laufen lassen, dann Zustand/Logik Schritt für Schritt aus dem `useEffect` in die Session ziehen und den Adapter auf Effekt-Anwendung reduzieren. Nach jedem Schritt bleibt die ganze Suite grün. Keine Verhaltensänderung, kein neues Feature.

## Abnahme-Schwelle

- Alle bestehenden Terminal-`*.browser.test.tsx` unverändert grün.
- Neue Session- und Renderer-Charakterisierungstests grün.
- Keine sichtbare Änderung im Spielverhalten.

### Ergebnis (umgesetzt, Branch `refactor/useterminal-extraction`)

- **Node-Suite:** 1183 Tests grün (84 Dateien). **Client-jsdom-Suite:** 1292 grün + 2 erwartete Fails (114 Dateien). **Terminal-Browser-Suite:** 93 grün. **Session-/Renderer-node-Suite:** 51 grün. **E2E:** 42 passed / 19 skipped (Baseline unverändert, inkl. „solvable end-to-end" für CLI-Level). **`npm run build` + `tsc`:** sauber.
- **Effekt-Vokabular-Anpassungen während der Umsetzung** (über die illustrative Liste in §3 hinaus): `clearScreen` und `write` (ohne Newline) ergänzt — `clearScreen` weil `term.clear()` eine echte externe Aktion (Ctrl-L / `result.clearScreen`) ist; `write` weil nicht-maskierte Pending-Prompts (ssh-keygen-Dateiname, `ufw y|n`) den Antwort-Char **inline** echoen, was `writeLine` (Newline pro Zeichen) nicht darstellen kann. `showPage` bleibt im Union, wird aber nie emittiert (Streaming läuft über `writeLine` + `scheduleDrip`) — im `applyEffects`-Switch nur zur Exhaustivität behandelt.
- **Offene Aufräum-Punkte fürs Final-Review (nicht verhaltensrelevant):** `TerminalSessionDeps.onPartialSolution` wird von der Session nicht aufgerufen (sie emittiert `showPartial`; der Adapter mappt es) — der Dep ist redundant. `showPage` ist toter Code.

## Nicht im Umfang

- Keine globale ESC-/Zurück-Navigation, keine sichtbaren Zurück-Buttons, kein `{player}`-Token — das ist der **zweite** Entwurf (`2026-07-23-terminal-navigation-personalization-design.md`), gebaut gegen die dann stabilisierte Session-Grenze, in zwei unabhängig test- und committierbaren Phasen (1: hierarchische ESC-/Zurück-Navigation + kontextspezifische 44-px-Buttons; 2: zentraler `{player}`-Token mit gespeichertem Anzeigenamen und Fallback „Timo", technische Identität bleibt `timo`).
- Keine callbackfreie Shell-Continuation (späterer, separater Schritt).
- Keine Änderung an der ShellEngine-Semantik, an Level-Inhalten oder am Content.
