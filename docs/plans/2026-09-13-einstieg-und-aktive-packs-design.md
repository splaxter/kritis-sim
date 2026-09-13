# Einsteiger-Szenarien und aktive Anbieter-Packs

Stand: 2026-09-13. **Freigegeben am 13.09.2026: Variante 1** (drei neue
Einstiegsfälle + sechs Ausbauten, zusammen neun praktische Aufgaben).
Umsetzungsplan: `2026-09-13-einstieg-und-aktive-packs.md`.
Geprüfte Basis: `main` bei `69e7b215e38efd8b4dcb96d6091c46b18829cf1c`.

## Ziel und gemessener Ausgangspunkt

Echte Einsteiger erhalten kurze Aufgaben, die ohne Shell-Vorwissen lösbar sind.
Die drei bisher ausschließlich entscheidungsbasierten Packs erhalten praktische
Aufgaben, bei denen der Spieler selbst Belege prüft oder eine Handlung ausführt.

Die Registry liefert 42 Szenarien, alle auf Schwierigkeit 2–5:

| Pack | Szenarien | Szenarien mit ausführbarer Aufgabe |
|---|---:|---:|
| amse-it | 8 | 6 |
| kritis-infra | 12 | 12 |
| cloud365 | 6 | 0 |
| internal | 10 | 0 |
| telekom | 6 | 0 |

`Scenario` unterstützt bereits `guiContext` und `terminalContext`. Die App
öffnet diese über `guiCommand` bzw. `terminalCommand`; `useGame.closeTerminal`
verbucht erst beim Lösen den Abschluss und die Belohnung. Abbrechen kehrt zur
Szenariokarte zurück. Dafür ist kein neues Interaktionssystem nötig.

## Drei mögliche Umfänge

1. **Empfohlen: drei neue Einstiegsfälle und sechs vorhandene Fälle ausbauen.**
   Je Pack entstehen drei praktische Aufgaben mit unterschiedlicher Tiefe.
   Vorhandene Figuren und Konflikte bleiben der Rahmen. Insgesamt 45 Szenarien.
2. **Kleinere erste Lieferung: drei Einstiegsfälle und drei vorhandene Fälle.**
   Weniger Aufwand, aber nur zwei praktische Aufgaben pro betroffenem Pack und
   weniger Abwechslung nach dem Einstieg.
3. **Eigene Cloud- und Provider-Konsolen bauen.**
   Größerer visueller Umfang und zusätzliche Bedienmodelle; für diese Lernziele
   reichen die vorhandenen Apps und die echte Shell-Engine aus.

Der folgende Entwurf beschreibt Variante 1.

## Drei neue Szenarien auf Schwierigkeit 1

Alle drei haben eine überschaubare Beobachtung und eine passende Handlung.
Keine Shell-Befehle, keine Zugangsvoraussetzungen, kein Countdown. Drei gestufte
Hinweise erklären zunächst das Ziel, dann die Bedienung und zuletzt den konkreten
nächsten Schritt. Fehlversuche geben fachliches Feedback. Wer Unterstützung
anfordert, darf den Fall abgeben; das Ergebnis behauptet dann keinen eigenen
praktischen Abschluss und vergibt keine entsprechende Übungsbelohnung.

| Pack / vorgesehene ID | Aufgabe | Sichtbare Grundlage | Abschluss |
|---|---|---|---|
| internal / `INTERN-SC-011` | Der erste hängende Prozess | Im Ticket steht, dass die Tourenplan-Anwendung hängt und keine ungesicherten Eingaben offen sind. Ein legitimer Backup-Prozess hat die höchste CPU-Last. | Im Task-Manager genau die betroffene Anwendung auswählen und beenden. Der Text bestätigt nur das Beenden, keinen ungeprüften erfolgreichen Neustart. |
| cloud365 / `CLOUD365-SC-007` | Ein Update, das niemand bestellt hat | Ein vermeintliches Teams-Update aus einem Mail-Download fordert Administratorrechte; es gibt keinen passenden Auftrag und keinen verifizierten Herausgeber. | Den UAC-Dialog prüfen und ablehnen. Die Erklärung bezieht sich auf Auftrag und Herkunft; sie lehrt keine pauschale Regel „unbekannt bedeutet Schadsoftware“. |
| telekom / `TELEKOM-SC-007` | Welche Leitung gehört zu unserem Standort? | Im Datei-Explorer liegen Unterlagen für zwei Standorte und eine klar gekennzeichnete alte Vertragsfassung. Das Ticket nennt den betroffenen Standort. | Das aktuelle Vertragsblatt dieses Standorts öffnen. Leitungskennung und Supportweg sind danach sichtbar. Der Abschluss behauptet kein bereits eröffnetes Provider-Ticket. |

Die Aufgaben vermitteln verschiedene Grundhandlungen: einen Prozess gezielt
beenden, eine Rechteanforderung prüfen und die passende Unterlage finden.

## Sechs vorhandene Fälle praktisch spielbar machen

Die jeweils fachlich passende Option öffnet eine echte Aufgabe. Texte, Wertung
und Nachgeschichte werden gemeinsam angepasst. Eine ursprünglich lange
Erfolgsgeschichte darf nach dem Umbau keine Handlungen behaupten, die weder der
Spieler ausgeführt hat noch ein ausdrücklich genannter Beteiligter übernimmt.

| Szenario | Bedienung | Was der Spieler tatsächlich nachweisen muss |
|---|---|---|
| `CLOUD365-SC-002`: Migrationstag | Shell über exportierten Pilotprotokollen | Transferstatus und Funktionstest gemeinsam auswerten. Erfolgreiche Migration und fehlgeschlagener Client-Test können gleichzeitig wahr sein. Einen Bericht mit den betroffenen Testfällen schreiben. |
| `CLOUD365-SC-006`: Copilot | Shell über Berechtigungs- und Gruppenexporten | Tatsächlich zu breite Zugriffe auf sensible Dokumente belegen. Der Befund ist die vorhandene Berechtigung, nicht eine erfundene Umgehung der Zugriffskontrolle durch Copilot. |
| `INTERN-SC-003`: Statusbericht | Shell mit Nachweisen und Berichtsvorlage | Einen kurzen Bericht aus aktuellen Nachweisen erstellen. Ein erfolgreicher Backup-Lauf belegt noch keinen Wiederherstellungstest; fehlende Nachweise müssen als offen erkennbar bleiben. |
| `INTERN-SC-004`: Disposition ausgefallen | Ereignisanzeige | Eine konkrete Datenbank-Verbindungsstörung anhand der Meldungsdetails und ihres Zeitpunkts erkennen und melden. Ein unabhängiger Warnungseintrag ist kein ausreichender Befund. Der Abschluss bestätigt die eingegrenzte Diagnose, nicht eine ungeprüfte Reparatur. |
| `TELEKOM-SC-001`: sporadische Ausfälle | Shell über Messreihen | Zeitlich zusammengehörige Ausfälle externer Messziele mit der lokalen Erreichbarkeit vergleichen und einen belegten Störungsbericht erstellen. Die Messung darf keine konkrete defekte Provider-Komponente erfinden. |
| `TELEKOM-SC-006`: Bandbreiteneinbruch | Shell über Vertrag, Routerdaten und Messprotokoll | Vertragswert, ausgehandeltes Profil und kabelgebundene Messung vergleichen. Den Widerspruch als Prüfauftrag an den Provider dokumentieren; eine einzelne WLAN-Messung reicht nicht. |

Ergebnis: cloud365 3/7, internal 3/11 und telekom 3/7 Szenarien mit praktischer
Aufgabe. Zusammen sind dann 27 der 45 Szenarien praktisch spielbar. Die fünf
Shell-Aufgaben nutzen vorhandene Befehle und Zustandsziele, die vier GUI-Aufgaben
vorhandene Windows-Apps. Es wird keine Windows-Sicherheitsansicht als angebliches
Microsoft-365-Administrationsportal ausgegeben.

Konkrete technische Aussagen in den bearbeiteten Microsoft- und Provider-Fällen
werden vor dem Schreiben anhand aktueller Primärdokumentation geprüft. Alte
Preis-, Lizenz- oder pauschale Rechtsbehauptungen aus diesen Szenarien werden
nicht ungeprüft in die neuen Aufgaben übernommen. Die Datensätze sind explizit
die fiktive Aktenlage des Spiels.

## Die Einstiegsfälle müssen früh erscheinen

Heute entscheidet die App zuerst zufällig zwischen Event und Szenario. In
Woche 1 beträgt die Szenariochance nur zehn Prozent. Anschließend bevorzugt
`selectNextScenario` dringliche Fälle. Neue ruhige Szenarien einfach zum Pool
hinzuzufügen würde ihren Einsatz deshalb nicht sicherstellen.

Für `beginner` wird ein kurzer, deterministischer Einstieg vorgesehen:

- Tag 1: Begrüßung `evt_first_day`.
- Tage 2–4: die drei neuen GUI-Fälle in der Reihenfolge Prozess, UAC, Unterlage.
- Danach greift die reguläre Auswahl mit dem bisherigen Schwierigkeitslimit.

Abgeschlossene Szenarien werden nicht erneut serviert. Abbrechen innerhalb
einer Aufgabe beendet weder den Tag noch den Fall. Bei einem wiederaufgenommenen
Spiel werden vorhandene Abschlussdaten respektiert; spätere Wochen starten
keinen neuen Pflicht-Einstieg. Standard und KRITIS erhalten die neuen Szenarien
über ihren gewöhnlichen Pool. Lernbereich und Kampagnen behalten ihre Auswahl.

Die vier verketteten Shell-Tutorials sind momentan alle auf Woche 1 beschränkt.
Ihr Fenster wird auf Wochen 1–3 erweitert, damit die neuen GUI-Tage die späteren
Tutorials nicht unerreichbar machen. Ihre Reihenfolge und Voraussetzungen
bleiben erhalten. Die feste Einleitung wird als reine, getestete Auswahlregel
umgesetzt und vor der bisherigen Zufallsentscheidung in der App verwendet.

## Verträge für Lösungen und Ergebnisse

- GUI-Start, Auswahl einer Zeile und Abbruch lösen den Fall nicht allein.
- Nur das tatsächliche Lösen führt über den bestehenden Abschlussweg zu
  Ergebnis, Belohnung und `completedScenarios`.
- Die neuen Aufgaben haben jeweils einen fachlich eindeutigen vollständigen
  Lösungsweg. Mehrere Bedienwege dürfen dasselbe Ziel erreichen. Es werden keine
  unterschiedlichen Wahrheitslagen über denselben pauschalen Erfolgstext gelegt.
- Shell-Aufgaben prüfen die wirklich gelesenen Quellen mit `fileRead` und den
  aktuellen Inhalt der Ergebnisdatei. `echo` einer behaupteten Suche oder eine
  vorab geschriebene Vermutung ohne gelesenen Beleg reichen nicht.
- Ein Ausgabepfad darf nicht durch automatische VFS-Vorbelegung bereits die
  Lösung enthalten. Unmittelbar nach dem Erzeugen der Shell sind alle neuen
  Aufgaben ungelöst.
- Änderbare Zustände brauchen die passenden Rücknahmen ihrer alten Tokens.
  Falls während der Umsetzung zusätzliche Bestätigungsaktionen erforderlich
  werden, gelten sie nur für den danach unveränderten Stand.
- Hilfe und Übergabe dürfen als solche erfolgreich sein. Ihre Nachgeschichte
  unterscheidet sie von selbst ausgeführter Analyse oder Reparatur.

## Abnahme

1. **Auswahl im realen Spiel:** mehrere Seeds führen im Einsteigermodus zu den
   vorgesehenen ersten vier Tagen. Ein wiederaufgenommenes Spiel wiederholt
   keinen abgeschlossenen Fall. Standard, KRITIS, Lernbereich und Kampagnen
   bekommen den festen Ablauf nicht aufgezwungen.
2. **Daten und Übergänge:** IDs bleiben eindeutig; jeder interaktive Choice hat
   den passenden Context; Abbruch verändert weder Abschlussdaten noch Belohnung.
   Praktische Erfolge erreichen den Ergebnisbildschirm genau einmal.
3. **Shell:** jeden der fünf Fälle durch die echte `ShellEngine` lösen und die
   notwendigen Fehlwege prüfen: nur Behauptung, fehlende Quelle, falscher
   Zeitraum/Standort, unvollständiger Befund, falsche Schlussfolgerung. Ein
   Regressionstest muss bei gezielt entferntem entscheidendem Guard fehlschlagen.
4. **GUI:** jeden der vier Fälle über wirkliche Controls lösen; falscher
   Prozess/Beleg/Eintrag und bloßes Auswählen lösen nicht. Maus und Tastatur
   erreichen dieselben Handlungen.
5. **Browser:** den Einsteiger-Ablauf vom Menü bis zu den Ergebnissen sowie alle
   neun neuen praktischen Wege aus ihrer Szenariokarte durchspielen. Für die
   Shell-Fälle explizite Lösungsskripte verwenden, falls der bestehende
   Auto-Harness die Zustandsziele nicht herleiten kann. Keine neue pauschale
   Skip-Ausnahme.
6. **Layout:** Controls und Ergebniswege bei 320×568, 375×667 und 667×375 prüfen,
   einschließlich Clipping und echtem Scrollen der beteiligten Apps. Frischer
   Build oder eigener Server; kein wiederverwendetes unbekanntes Bundle.
7. **Gesamtprüfung:** Build, Lint, Node-, Client- und vollständige E2E-Suite.
   Inhaltliche Audits als Anforderungen behandeln. Skip-Zahlen und Exitcodes
   vollständig auswerten, nicht durch gekürzte Shell-Pipelines verschlucken.
8. **Dokumentation:** nach erfolgreicher Abnahme `TECHNICAL_DEBT.md`,
   `CONTENT_INVENTORY.md`, `GAME_MODES_SPEC.md` und betroffene Bestandsangaben
   aktualisieren. Die beiden Backlog-Einträge erst dann als erledigt führen.

## Lieferung

Nach Freigabe wird dieses Design mit einem konkreten Umsetzungsplan unter
`docs/plans/` auf einem neuen Feature-Branch abgelegt. Die Implementierung wird
in nachvollziehbaren Commits vorbereitet und als PR zur Prüfung gestellt.
Der ungeklärte bestehende Playwright-Layout-Flake bleibt außerhalb dieser
Änderung; ein tatsächlicher neuer Fehlschlag wird anhand seines Traces geprüft.
