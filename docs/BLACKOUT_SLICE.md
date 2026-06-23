> **STATUS: umgesetzt** (als Learning-Track `blackout`). Abweichungen vom Plan unten:
> - **Integration als Learning-Track**, nicht als loses Event-Pack: Eintrag in `LEARNING_TRACKS` (order 6, Finale → 7), gated hinter Foundations (`learn_04_grep_hunter`); jedes Level gated track-intern auf seinen Vorgänger. Datei: `client/src/content/events/blackout.ts`.
> - **Routing Kap 1: Variante „beide als Track-Levels"** (nicht A). Da im Hub jedes Level genau **eine** Modalität ist, wurde die Prozess-Jagd in zwei Levels gesplittet: `blk_c1_hunt_gui` (Task-Manager) → `blk_c1_hunt_cli` (PowerShell, Persistenz/Wiedergänger).
> - **Kein separates Intro/Outro-Event.** Pure-Story-Events sind im Learning-Modus nicht servierbar (`eventEngine.ts` filtert auf `terminalContext || guiContext`). Bergmanns Alarm steckt in `blk_c1_logread.briefing`, die Auflösung in `blk_c3_firewall` (resultText + briefingVariants).
> - **`blk_sloppy`** entsteht organisch aus der **Partial-Solution** im EventViewer (Login statt Payload gemeldet) via `guiSolution.setsFlags` — kein „bad choice"-Event nötig. Es ist der einzige von einer GUI-Solution gesetzte Reaktiv-Flag (Guard: `guiLearningIntegration.test.ts`).
> - **Finale Level-Kette:** `blk_c1_logread` (eventviewer) → `blk_c1_hunt_gui` (taskmanager) → `blk_c1_hunt_cli` (powershell) → `blk_c2_jumpserver` (linux) → `blk_c3_firewall` (corefirewall).
> - **Engine-Slice gebaut:** `GuiAppId` += `'corefirewall'`, `CoreFirewallState`/`FirewallRuleEntry`/`FirewallSubnet` in `shared/src/types/gui.ts`, `CoreFirewall.tsx` + `renderApp()`-Case + APP_ICONS. Critical-Guard (Leitstand-Regel + Sicherheitssystem) component-level via `riskFeedback`.
> - **Tests:** `blackout.test.ts` (Kette + Flag-Fluss), `CoreFirewall.browser.test.tsx` (Solve + beide Critical-Guards), bestehende `learning-tracks.test.ts` / `skillBalanceAudit.test.ts` / `guiLearningIntegration.test.ts` grün. Gesamt 376 Tests grün.

# Blackout — Vertical Slice (Engine-Native, rescoped)

_Kampagne 3: „Blackout — Operation Dunkelkammer". Spielbarer Drei-Abschnitt-Slice. Ziel: **ein** neues GUI-App-Vertical (`core-firewall`), sonst maximale Engine-Reuse. Bewusst **kein** neues Adventure-Campaign-System, **keine** Sidequest, **kein** Ending-Refactor, **kein** Chat-Panel._

## Scope-Entscheidung (wichtig)

Frühere Annahme „neue Adventure-Kampagne = nur Content" war falsch. `engine/adventureEngine.ts` importiert `adventureChapters` **direkt und hardcoded** aus `content/adventure/chapters.ts` (Single-Campaign). Eine echte zweite Kampagne bräuchte Campaign-Registry + Campaign-State + Mode-Auswahl — das ist mehr als ein Slice.

**Deshalb:** Blackout wird als **engine-natives „Blackout Vertical Slice"-Pack** gebaut — 3 lineare Abschnitte im bestehenden Content-/Event-System (`GameEvent` mit `terminalContext`/`guiContext`, verbunden über `requires.events`/`flags` und `triggersEvent`), **nicht** als `AdventureChapter`-Kampagne. Keine Berührung der Adventure-Engine.

---

## Aufwands-Übersicht

| Baustein | Status | Aufwand |
|---|---|---|
| Lineare Verkettung über `requires`/`triggersEvent`/Flags | vorhanden | Content |
| Abschnitt 1: Prozess-Jagd | `Get-Process`, `Stop-Process`, Task-Manager (`endtask:`) vorhanden | Content |
| Abschnitt 1: Log lesen + **melden** | Event-Viewer-GUI vorhanden, Lösung über **`report:<id>`** | Content |
| Abschnitt 2: Auth-Log + Session-Kill | `grep`/`tail`/`cat`/`netstat`/`ss`/`kill -9`, `/var/log/auth.log` vorhanden | Content |
| Abschnitt 3: **Core-Firewall-GUI** | **Neue `GuiAppId`** — der eine echte Platform-Slice | Mittel |
| Bergmann (Druck/Reaktivität) | `description` + `hints[]` + `briefingVariants[]` vorhanden | Content |
| Sidequest / Multi-Campaign / Chat / Ending-Refactor | — | **bewusst draußen** |

Einziger neuer Engine-Code: **eine** GUI-App (`core-firewall`). Der Rest bleibt engine-native.

---

## Bergmann ohne neue Mechanik

Druckquelle ist der bestehende `scadaOperatorContact` (**Thomas Bergmann, Leitstand-Operator**) aus dem `kritis-infra`-Pack. Reaktivität rein über vorhandene Kanäle:

1. **`description`/`briefing`** — Funksprüche im etablierten `[NACHRICHT VON: …]`-Muster (`[LEITSTAND: Bergmann] "Pumpe 3 verliert Druck — wie lange noch?!"`).
2. **`guiContext.hints[]`** — gestaffelt, erscheinen wenn der Spieler hängt; wirken wie nervöser Funk.
3. **`briefingVariants[]`** — Framing reagiert auf frühere Flags (siehe `blk_sloppy` unten).

Beziehungswirkung über `relationships`-Effekte in Choices. **Keine `SidequestDefinition`** (die sind aktuell als inert/gapped dokumentiert — nicht ankoppeln).

---

## Abschnitt 1 — Der EDR-Alert

**Fokus:** Windows-GUI + PowerShell. **Engine-Fit: 100% Content.**

**Event-Kette (3 verkettete `GameEvent`s):**

1. **`blk_a1_alert`** — Story-Event: EDR-Alert „Suspicious Activity on WS-042" als `description`-Briefing (Bergmann funkt rein). Eine Choice führt weiter zu `blk_a1_logread`.
2. **`blk_a1_logread`** (GUI — `eventviewer`) — Spieler liest das Sicherheitsprotokoll und **meldet den verdächtigen Eintrag**. Lösung über das vorhandene Token-Muster `report:<entryId>` (NICHT `select:`), z. B. `interactions: ['report:evt-suspicious-login']`. Setzt `blk_log_correlated`.
3. **`blk_a1_hunt`** — Prozess sauber stoppen. **Routing-Entscheidung (siehe unten).**

### Routing Abschnitt 1 — gewählte Variante: **A**

Ein Event kann **nicht** beliebig pro Choice zwischen Terminal und GUI wechseln; jede Choice öffnet genau ihren eigenen Level über `terminalCommand` bzw. `guiCommand`. Daher:

- **Variante A (empfohlen):** Ein Story-Event `blk_a1_hunt` mit **zwei Choices**:
  - Choice „PowerShell öffnen" → `terminalCommand: true`, `terminalContext` mit `Get-Process` → Lösung `Stop-Process -Name svch0st`.
  - Choice „Task-Manager öffnen" → `guiCommand: true`, `guiContext` (`taskmanager`) → Lösung `endtask:svch0st.exe`.
  - **Beide setzen denselben Flag** `blk_process_stopped` (über `choice.setsFlags` bzw. `guiSolution.setsFlags`).
  - Showcase „CLI oder GUI — deine Wahl", beide Level-Typen existieren bereits → reiner Content.
- Fallback, falls Zeit knapp: **Variante C** (nur PowerShell) oder **Variante B** (nur Task-Manager). Dann eine Choice statt zwei.

**Tarnprozess:** falsche Schreibweise eines Systemprozesses (z. B. `svch0st.exe`). Kritische Prozesse (`critical: true`) blockt der Task-Manager ohnehin.

**Flags:**
- `blk_process_stopped` — richtiger Prozess gestoppt.
- `blk_sloppy` — **nur über eine explizite schlechte Choice** (z. B. „erst alles neustarten" / vorschnell den falschen Prozess gewählt). **Kein** „nach mehreren Hints"-Tracking (gibt es nicht). Steuert nur `briefingVariants` in Abschnitt 2.

---

## Abschnitt 2 — Lateral Movement

**Fokus:** Linux-CLI + Log-Hunting. **Engine-Fit: 100%**, nutzt vorhandenes virtuelles Dateisystem (`/var/log/auth.log`, String `"Failed password"` existieren bereits).

**Event `blk_a2_jumpserver`** (`terminalContext`), freigeschaltet über `requires.flags: ['blk_process_stopped']`:

1. `cat`/`tail /var/log/auth.log`.
2. `grep "Failed password" /var/log/auth.log` → Brute-Force-Quelle (Angreifer-IP). Bewusst **nur `grep`/`tail`/`cat`** — Log so befüllt, dass **eine** IP klar heraussticht (kein `awk`/`sed` nötig).
3. `netstat -tnp` bzw. `ss -tnp` → aktive Verbindung dieser IP, PID ablesen.
4. `kill -9 <PID>` → `terminalSolution` matcht `kill -9 <PID>`.

**Flags:**
- `blk_attacker_cut` — Verbindung gekappt.
- `blk_source_ip_known` — Angreifer-IP identifiziert; **Input für Abschnitt 3**.

**Reaktivität:** `briefingVariants` — wenn `blk_sloppy` gesetzt, kommentiert Bergmann gereizt; sonst neutral. Keine neue Mechanik.

---

## Abschnitt 3 — Die Firewall-Panik (der Platform-Slice)

**Fokus:** Neue State-GUI `core-firewall`. **Engine-Fit: Mittel** — eine neue `GuiAppId`, identisches State/Solution-Muster wie `settings`/`explorer`. **Kein Routing.**

**Event `blk_a3_firewall`** (`guiContext`, app `core-firewall`), freigeschaltet über `requires.flags: ['blk_attacker_cut']`:

- Optionaler Vorlauf im selben oder vorgelagerten Terminal-Event: `nslookup`/`dig`, um Angreifer-IP (`blk_source_ip_known`) vs. SCADA-Subnetz zu bestätigen.
- Im Firewall-GUI muss der Spieler:
  - Angreifer-IP **Inbound blocken** — Token `block:atk-ip-inbound`,
  - **SCADA-Subnetz isolieren** — Token `isolate:scada-net`,
  - die **Leitstand-Management-Regel NICHT kappen** — `critical: true` → Blockversuch gibt `riskFeedback` statt Erfolg.

```
solutions: [{
  interactions: ['block:atk-ip-inbound', 'isolate:scada-net'],
  allRequired: true,
  setsFlags: ['solution_firewall_locked'],
  resultText: 'SCADA isoliert, Angreifer-IP geblockt. Die Pumpen bleiben am Netz.',
  skillGain: { netzwerk: 8, security: 6 },
}]
// critical-guard: 'block:mgmt-leitstand' -> riskFeedback, kein Erfolg
```

**Druck-Höhepunkt:** Bergmanns `hints[]` zählen herunter („Pumpe 3 bei 60% … 40% …") — Live-Funk-Gefühl ohne Timer-Engine.

---

## Abschluss ohne Ending-Refactor

`calculateEndingScore` ist auf die bestehende Adventure-Kampagne zugeschnitten — **nicht anfassen.** Stattdessen ein **eigenes Abschluss-Event** `blk_outro` (`requires.flags: ['solution_firewall_locked']`) mit Textvarianten über `briefingVariants`/Choice-Verzweigung:

- `solution_firewall_locked` + `blk_process_stopped` + **nicht** `blk_sloppy` → „Blackout verhindert" (bester Text).
- Kernproblem gelöst, aber `blk_sloppy` → neutraler Text.
- (Verfehlen der Firewall-Lösung endet den Abschnitt schon vorher.)

Reine Content-Varianten, kein Eingriff ins Score-/Ending-System.

---

## Was neu gebaut werden muss (vollständige Liste)

**Content (kein Engine-Code):**
- Neues Pack/Modul `content/.../blackout/` mit ~6 verketteten `GameEvent`s (Abschnitt 1: 3, Abschnitt 2: 1, Abschnitt 3: 1, Outro: 1) über `requires`/`triggersEvent`/Flags linear verdrahtet.
- PowerShell-Prozessliste + Event-Viewer-Einträge (Daten in `guiContext.state`), EventViewer-Lösung über `report:<id>`.
- `/var/log/auth.log`-Inhalt für Abschnitt 2 (Template-Erweiterung, Muster existiert).
- Bergmann-Funk in `description`/`hints`/`briefingVariants`.

**Engine (minimal — der eine Platform-Slice):**
- `GuiAppId` um `'core-firewall'` erweitern (`shared/src/types/gui.ts`).
- State-Interfaces: `FirewallRuleEntry { id, label, direction, target, critical?, riskFeedback? }` + `CoreFirewallState { rules, subnets }` in `GuiAppState`.
- Renderer unter `components/WindowsLevel/` analog `settings`/`explorer`; Tokens `block:<id>`, `unblock:<id>`, `isolate:<subnet>`; `critical`-Guard mit `riskFeedback`.

**Bewusst draußen:** neues Adventure-Campaign-System, `SidequestDefinition`, Ending-/Score-Refactor, Live-Chat-Panel, `awk`/`sed`, `tcpdump`, echtes Routing/IOS, `Get-EventLog`-Cmdlet.

---

## Tests (bestehendes Muster)

- Flag-Fluss A1 → A2 → A3 → Outro (`blk_process_stopped` → `blk_attacker_cut` → `solution_firewall_locked`) — wie die Lesson-Flow-Tests.
- GUI-Solution-Matching für `core-firewall` (richtige Token-Kombi gewinnt, `critical`-Regel blockt) — wie `guiSolution.test.ts`.
- EventViewer `report:<id>`-Lösung in A1 — wie die bestehenden `report:evt-*`-Level.

---

## Empfohlene Bau-Reihenfolge

1. **Abschnitt 2** zuerst (100% vorhandene Bausteine → schnellstes spielbares Stück).
2. **Abschnitt 1** (Content auf vorhandene EventViewer/PowerShell/TaskManager; Routing-Variante A).
3. **Core-Firewall-App + Abschnitt 3** (der einzige neue Engine-Teil).
4. **Outro-Event** + Bergmann-Funk-Layer (Descriptions/Hints/briefingVariants).
5. **Tests.**

---

## Backlog — offene narrative Payoffs (Design-Note, keine Correctness)

Der Track setzt Flags, die **noch niemand liest** (Stand: Review feat/blackout-slice).
Reine Erzähl-Auszahlung, bewusst aus dem Correctness-Cleanup herausgehalten.

- **`blk_source_ip_known` / `blk_attacker_cut`** (L4 Jump-Server) und
  **`solution_firewall_locked`** (L5 Firewall) haben keinen Downstream-Reader.
  Die fünf Level fühlen sich dadurch wie eine Sackgasse an — sie *füttern* nichts.
- **Idee:** Im Finale-Track (oder einem Blackout-Debrief-Event) auf
  `solution_firewall_locked` / `blk_source_ip_known` reagieren — z. B. Bergmann
  greift „die IP, die du am Jump-Server rausgezogen hast" (203.0.113.66) wieder
  auf, oder ein Abschluss-Beat quittiert den abgewendeten Blackout. Macht aus der
  Slice einen Bogen mit Auflösung statt fünf isolierter Übungen.
- **Auch offen:** `blk_sloppy` wird von briefingVariants in L2/L5 gelesen (gut),
  aber es gibt keinen finalen „du warst von Anfang an schlampig"-Beat. Optional.

Scope: Content-/`briefingVariants`-Arbeit, kein Engine-Change. Erst angehen, wenn
der Finale-Track inhaltlich dran ist.
