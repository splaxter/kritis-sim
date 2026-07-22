# Design: Mobile Lernbereich ohne Sprünge und abgeschnittene Inhalte

**Datum:** 2026-07-22  
**Status:** Approved  
**Motivation:** Auf kleinen Viewports öffnet ein Lernlevel mitten in seiner Beschreibung; außerdem verbreitern einzelne Hub-, HUD-, Event- und Terminal-Inhalte das gesamte Dokument. Das wirkt wie abgeschnittener oder umsortierter Content, obwohl die logische Event-Reihenfolge unverändert ist.

## Verifizierte Ausgangslage

Der Fehler wurde im Browser bei 320×568, 375×667 und 667×375 reproduziert:

- Ein Hands-on-Level öffnet bei 320×568 bei `scrollY=751`, weil `EventCard` den bereits ausgewählten ersten Button beim Mounten per `scrollIntoView()` sichtbar macht. Im Landscape tritt derselbe Sprung auf.
- Ein langes ASCII-Banner in einer Levelbeschreibung verbreitert das Dokument bei 320 px auf 650 px.
- Der Lernmodus-HUD verbreitert die Terminalseite bei 320 px auf 488 px.
- Der lange Tracktitel „Ansible & Konfigurationsmanagement“ verbreitert den Hub auf 415 px; das Status-Badge wird rechts abgeschnitten.
- Der Terminal-Footer bleibt eine einzelne Zeile und überlagert beziehungsweise beschneidet seine Aktionen auf kleinen Breiten.
- Der aktuelle After-Action-Feedback-Branch verändert weder `LEARNING_TRACKS` noch die Darstellungskomponenten. Es gibt keine responsive `order-*`- oder Reverse-Flex-Regel. Die wahrgenommene Umordnung ist ein Scroll-/Overflow-Effekt, keine Änderung der Event-Reihenfolge.

## Gewählter Umfang

Ein gezielter Mobile-Hardening-Pass behebt alle reproduzierten Ursachen. Ein reiner Scroll-Fix ließe echte Überläufe bestehen; ein vollständiges Responsive-Redesign wäre für den Fehler unnötig breit.

Desktop-Darstellung, Eventdaten, Trackreihenfolge, Levelregeln und Terminalmechanik bleiben unverändert.

## A) Deterministischer Einstieg in Eventkarten

Beim Wechsel auf eine neue `event.id` beginnt die Dokumentansicht explizit oben. Das ist unabhängig davon nötig, ob das Event aus dem oberen empfohlenen CTA oder aus einer weit unten liegenden Trackkarte geöffnet wurde: Eine SPA-Navigation setzt die Dokument-Scrollposition nicht automatisch zurück.

Das automatische `scrollIntoView()` wird von der Zustandsänderung `selectedIndex` entkoppelt:

- Beim ersten Rendern findet kein Scroll zum Aktionsbutton statt.
- Bei einer einzelnen Hands-on-/Weiter-Aktion findet ebenfalls kein Auswahlscroll statt.
- Nur eine echte Tastaturnavigation mit Pfeil hoch/runter beziehungsweise `j`/`k` darf die neu ausgewählte Option in Sicht bringen.
- Mausbewegungen dürfen die Seite nicht unerwartet scrollen.
- Bestehende Tastaturauswahl und `Enter`-Bestätigung bleiben erhalten.

Damit bleibt die visuelle Reihenfolge immer Titel → Beschreibung → Aktion.

## B) Overflow bleibt lokal

Breite, absichtlich vorformatierte Inhalte wie ASCII-Banner dürfen ihre Form behalten, aber nicht mehr das Dokument verbreitern. Der Beschreibungsbereich der Standard-Eventkarte erhält daher eine eigene horizontale Overflow-Grenze (`max-width: 100%`, `min-width: 0`, lokales `overflow-x: auto`). Normale Prosa bricht weiterhin regulär um; breite Kunst oder Befehlszeilen sind innerhalb ihres Abschnitts scrollbar.

Ein globales `overflow-x: hidden` auf `body` wird bewusst nicht verwendet: Es würde die Ursache verdecken und Inhalte tatsächlich unerreichbar abschneiden.

## C) Responsive Lernbereich-Komponenten

### Learning Hub

- Der flexible Titelbereich darf schrumpfen (`min-w-0`).
- Titel und Fortschrittszähler dürfen umbrechen.
- Das Status-Badge bleibt `shrink-0` und vollständig sichtbar.
- Lange Wörter beziehungsweise zusammengesetzte Tracktitel brechen innerhalb der Karte statt das Dokument zu verbreitern.

### Lernmodus-HUD

- Headerinhalt und Fortschritt stehen auf kleinen Viewports untereinander und ab dem bestehenden Small-Breakpoint wieder nebeneinander.
- Labelbereiche erhalten `min-w-0`; lange Tracknamen dürfen umbrechen.
- Der Fortschrittsbalken nutzt auf Mobile die verfügbare Breite und erst ab größeren Viewports die bisherige feste Breite.

### Terminal-Chrome

- Header und Footer dürfen auf Mobile umbrechen beziehungsweise sich stapeln.
- Hostname, Plattform, Hinweis und Abbrechen bleiben vollständig sichtbar.
- Bedienelemente behalten eine klare Lesereihenfolge und ausreichend große Touch-Flächen.
- Die xterm-Fläche selbst bleibt unverändert; ihr Fit-Addon reagiert weiterhin auf die tatsächlich verfügbare Containerbreite.

## D) Tests

### Komponenten-Tests

- `EventCard`: Mounten scrollt keinen Aktionsbutton in Sicht; Tastaturnavigation in einer Mehrfachauswahl tut es weiterhin.
- `LearningHub`: Lange Tracktitel und Status bleiben in derselben semantischen Reihenfolge. Der Test prüft die dafür nötigen Shrink-/Wrap-Verträge ohne Eventdaten umzubauen.
- `StatsBar`: Der Lernmodus-HUD besitzt den mobilen Stack- und flexiblen Fortschrittsvertrag.
- `Terminal`: Header und Footer besitzen den mobilen Wrap-/Stack-Vertrag; bestehende Terminaltests bleiben unverändert grün.

### Playwright-Regression

Ein eigener Mobile-Learning-Test verwendet dieselbe belastbare Save-Seeding-Idee wie `e2e/levels.spec.ts` und prüft bei 320×568, 375×667 und 667×375:

1. Hub: `document.documentElement.scrollWidth <= window.innerWidth`.
2. Level öffnen: Dokument steht oben; Überschrift und Anfang der Beschreibung liegen vor der CTA.
3. Eventkarte: kein dokumentweiter horizontaler Overflow trotz breitem ASCII-Inhalt.
4. Terminal öffnen: kein dokumentweiter horizontaler Overflow; Abbrechen und Hinweis sind sichtbar.
5. DOM- und visuelle Reihenfolge der Eventinhalte bleibt Titel → Beschreibung → CTA.

Die Assertions verwenden Abmessungen und Scrollwerte statt Screenshot-Pixelvergleiche, damit der Test stabil und ursachennah bleibt.

## E) Nicht im Umfang

- Keine Änderung an Track- oder Eventreihenfolge.
- Kein Umschreiben der ASCII-Art oder Leveltexte.
- Kein allgemeines Redesign aller Spielmodi.
- Keine globale Unterdrückung horizontalen Overflows.
- Keine Änderung an Shell-, Feedback- oder Lösungserkennung.
