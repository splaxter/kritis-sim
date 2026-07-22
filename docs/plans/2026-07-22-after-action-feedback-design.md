# Design: After-Action-Feedback für Advanced-CLI-Level

**Datum:** 2026-07-22
**Status:** Approved
**Motivation:** Playtest-Review Prio 5 — das Spiel soll erkennen, ob ein Level *sicher*, *riskant* oder *effizient* gelöst wurde, und eine passende Rückmeldung geben. Schließt u. a. die net_03-Lücke (Reihenfolge wird gelehrt, aber nicht bewertet), ohne die Mechanik zu erzwingen.

## Grundentscheidungen (vom Nutzer bestätigt)

- **Nur narrativ** — der Abschlusstext bekommt eine wegabhängige Zusatz-Zeile; kein Einfluss auf skillGain/Score/Balancing.
- **Pro Level authored** — jedes Level deklariert eigene Marker; nur dort, wo eine echte Unterscheidung existiert.
- **Zusatz-Zeile** — der bestehende `resultText` („was du erreicht hast") bleibt; darunter eine kurze Kommentar-Zeile („wie du es gemacht hast").
- **Robustes Execution-Log** statt Bash-History — die Raw-History (`getHistory()`) taugt nicht: sie wird im UI befüllt (Lesson-Tests über `shell.execute()` sähen leere History), dedupliziert aufeinanderfolgende Befehle, fasst `cmd1 && cmd2` zu einem Eintrag zusammen und kennt weder Exit-Code noch Host noch SSH-Auth-Methode. Ein fehlgeschlagener Befehl sähe aus wie ein erfolgreicher.

## A) Execution-Log

Neue Struktur, von `shell.execute()` **selbst** befüllt, damit Browser und Lesson-Tests dieselbe Wahrheit sehen. Keine Deduplizierung.

```ts
interface CommandAttempt {
  command: string;      // die äußere, vom Spieler abgeschickte Zeile (inkl. cmd1 && cmd2)
  sequence: number;     // monoton steigend, 1-basiert
  hostBefore: string;   // stabile Host-ID vor Ausführung
  hostAfter: string;    // stabile Host-ID nach Ausführung (ssh/exit ändern das)
  exitCode: number;     // finaler Exit-Code der äußeren Zeile
  authMethod?: 'publickey' | 'password'; // gesetzt, wenn dieser Attempt eine SSH-Session öffnete
}
```

**Attempt-Lifecycle (festgeschrieben):**
- Nur der **äußerste** `shell.execute()`-Aufruf eröffnet einen Attempt. Interne Ausführungen (z. B. `sudo` → `ctx.execute()`, `source`) erzeugen **keinen** zweiten Eintrag — ein kleiner **Execution-Depth-Guard** verhindert Doppelte.
- Bei `pendingInput` bleibt der Attempt **offen**. Wiederholte `continueInput()`-Schritte (Passwort-Retries) aktualisieren **denselben** Attempt. Finalisierung erst, wenn kein weiterer Prompt aussteht.
- Abbruch über `cancelPendingInput()` finalisiert den Attempt mit `exitCode: 130`.
- `pushSession()` annotiert den offenen Attempt bei erfolgreichem SSH mit `authMethod`.
- `hostBefore`/`hostAfter` nutzen stabile Host-IDs (nicht Hostnamen).
- **Passworteingaben werden niemals gespeichert** (weder im `command` noch sonstwo).

Query-API auf der Engine, z. B. `getExecutionLog(): CommandAttempt[]`.

## B) Datenmodell (auf `TerminalSolution`)

```ts
feedback?: FeedbackRule[];

interface FeedbackRule {
  when: {
    commandMatches?: CommandMatcher;
    commandAbsent?: CommandMatcher;
    commandBefore?: Array<{ first: CommandMatcher; second: CommandMatcher }>;
    commandCount?: { matcher: CommandMatcher; min?: number; max?: number };
  };
  text: string; // die anzuhängende Zeile (Emoji ⚠/⚡/✓ im Text)
}

interface CommandMatcher {
  pattern: string;                 // Regex gegen CommandAttempt.command
  outcome?: 'attempted' | 'succeeded' | 'failed';
  authMethod?: 'publickey' | 'password';
}
```

### Festgezurrte Semantik
- Alle Bedingungen **einer** Regel sind **AND**-verknüpft.
- `commandBefore` vergleicht die jeweils **ersten passenden** Attempts (nach `sequence`); mehrere `commandBefore`-Paare in einer Regel modellieren Ketten (z. B. journal < mysql < api).
- Regeln werden **von oben nach unten** geprüft, **erste passende gewinnt**; Autor stellt **Risiko vor** positivem Feedback.
- **Kein Treffer → kein Zusatztext.** Kein pauschales „sonst sauber".
- **Positives Feedback braucht positiven Nachweis** (`outcome: 'succeeded'` / echte Reihenfolge), nie nur „hat nichts Schlimmes getan".
- `outcome`: `attempted` umfasst Erfolg, Fehler und Abbruch; `succeeded` verlangt `exitCode 0`; `failed` verlangt `exitCode ≠ 0`. Default (kein `outcome`) = `attempted`.
- `authMethod` auf dem Matcher verlangt, dass der passende Attempt diese Auth-Methode trug.
- `commandCount.matcher` zählt **passende Attempts**, nicht globale Aktivität (kein globales `maxCommands` — das bestrafte neugierige `status`/`cat`/`journalctl`-Aufrufe).
- Ungültige Regex → **kein Match + einmalige Warnung**; ein **Content-Audit** kompiliert alle Pattern und schlägt im Test fehl, bevor es je live geht.

## C) Wo es auftaucht

Reine Funktion `selectFeedback(rules, log): string | null` (eigenes Util, unit-testbar). `useTerminal` ruft sie beim Solve auf (`shell.getExecutionLog()`) und hängt das Ergebnis mit einer Leerzeile an den `resultText` in `announceSolved`. Kein Flow-/UI-Umbau — nur mehr Text im bestehenden Abschluss-Banner. Weil die Funktion rein ist und das Log auch von `shell.execute()` kommt, testen die Lesson-Tests die Variantenwahl direkt mit dem Lauf, den sie durchspielen.

## D) Level-Auswahl V1

| Level | Regeln |
|---|---|
| **sysd_04** Kettenreaktion | **riskant:** `commandCount` auf `systemctl (re)start leitstand-api` mit `min: 2` (API ≥2× gestartet). **sauber:** `commandBefore` journalctl `succeeded` < mysql-start `succeeded` < api-start `succeeded`. |
| **net_03** Die Mauer | Firewall startet **disabled + default-allow**. **riskant** (zwei Regeln, je zwei `commandBefore`): `deny < enable < allow22` **oder** `enable < deny < allow22`. **sauber:** `allow22 < deny` **und** `allow22 < enable`. Same-Attempt (`allow 22 && enable`) → strikte Reihenfolge nur zwischen Attempts → **kein Zusatztext**. |
| **net_01** Offene Türen | **riskant:** `commandMatches` gegen `kill .*(456\|1234)` (legitime PIDs), `outcome: 'attempted'`. |
| **ssh_02** Offene Tür | Braucht das Log (exitCode+authMethod). **riskant:** ssh-`restart` `succeeded` < publickey-Login `succeeded` (`authMethod: 'publickey'`). **sauber:** publickey-Login `succeeded` < restart `succeeded`. |
| **ssh_04** Schlüsselfriedhof | **Vorbedingung (Correctness-Fix):** Level-Goals müssen den Erhalt beider legitimer Schlüssel verlangen — `matches jens@ws-jens` + `matches henry@ws-henry` auf db01s authorized_keys. Sonst erfüllt eine leere Datei `absentMatches wartung@extern` und der Basis-Text behauptet fälschlich, die legitimen Keys seien erhalten. **Danach** Trap-Feedback: `commandMatches` gegen `rm .*authorized_keys` / `chmod 0?00` / `truncate`, `outcome: 'attempted'` → ⚠; effiziente Variante über `commandCount` des gezielten `sed`. |

**Draußen aus V1:** net_02 (Evidence-first schon goal-erzwungen; nach echtem falschem `sed` ist der Lauf meist gar nicht mehr lösbar → Feedback selten sichtbar). **Vertagt:** net_04, ans_02 — erst aufnehmen, wenn Ton und Treffergenauigkeit aus V1 überzeugen.

**Platzhalter-Texte (deutscher Prosa-Pass durch den Nutzer):**
- net_03: „⚠ Die Firewall war aktiv, bevor SSH freigegeben war. Auf einem entfernten Server wäre der nächste Login ausgesperrt."
- sysd_04: „⚠ Du hast die API erneut gestartet, obwohl ihre Abhängigkeit noch fehlte. Das Journal hätte dir den Umweg erspart."
- ssh_02: „✓ Schlüsselzugang bestätigt, bevor die Passwort-Anmeldung abgeschaltet wurde."
- ssh_04: „⚡ Genau eine verdächtige Zeile entfernt; die legitimen Schlüssel blieben erhalten."

## E) Tests

- **Unit** für `selectFeedback`: jeder Matcher (`commandMatches`/`Absent`/`Before`/`Count`), `outcome`- und `authMethod`-Filter, first-match-Semantik, AND-Verknüpfung, kein-Treffer→null, ungültige Regex→null+warn.
- **Execution-Log-Unit**: Depth-Guard (sudo erzeugt keinen zweiten Attempt), pendingInput hält offen / continueInput aktualisiert / cancel→130, ssh annotiert authMethod, host-Wechsel, Passwort nie gespeichert.
- **Lesson-Tests** pro V1-Level: sauberer Pfad → erwarte die positive Variante; riskanter Pfad → erwarte die Risiko-Variante; ungewöhnlicher Pfad → keine Zeile. ssh_04 zusätzlich: leere-Datei-„Lösung" scheitert jetzt an den Erhalt-Goals.
- **Content-Audit**: alle `feedback`-Pattern kompilieren; Orthographie-/Pacing-/Skill-Audits bleiben grün.

## Out of Scope
- Mechanische Bewertung/Skill-Bonus/Badges (bewusst narrativ-only).
- Echte net_03-Reihenfolge-*Erzwingung* (separates späteres Feature).
- Domänenspezifische Event-Streams (SSH/Firewall/systemd) — für sechs Level Overkill; das generische Execution-Log genügt.
