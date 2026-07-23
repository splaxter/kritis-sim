# Pipe- und Prozessdiagnose: Level-Fix

## Ziel

Zwei aufeinanderfolgende Grundlagenlevel sollen das Vorgehen lehren, das ihre
Aufgaben versprechen:

- `learn_05_pipe_filter` endet erst, nachdem der Spieler den eingeschleusten
  Account gefunden **und** die Benutzer mit `wc -l` gezählt hat.
- `learn_06_zombie_hunt` lässt den Spieler den CPU-Verursacher erst untersuchen,
  bevor der Text ihn als Cryptominer einordnet.

Der Fix ändert weder Shell- noch Terminalarchitektur.

## Ursache

In `learn_05_pipe_filter` tragen alle drei Find-Beats `isSolution: true`.
`TerminalSession` beendet das Level deshalb unmittelbar nach dem ersten
erfolgreichen `grep`. Der danach ausgegebene Hinweis auf Schritt 2 und die
Aufgabenzeile `cat /etc/passwd | wc -l` können nicht mehr bearbeitet werden.
Der Content-Kommentar und der bestehende Test erklären den Count-Schritt zwar
zum Bonus, widersprechen damit aber Aufgabenliste, Befehlsausgabe und
Test-Kopfkommentar.

In `learn_06_zombie_hunt` nennt bereits das Briefing den unbekannten
CPU-Verursacher einen Cryptominer. Die unterscheidenden Indizien erscheinen
erst später in `ps`/`top`: der Account `malware`, 99 Prozent CPU und
`/tmp/.hidden/miner.sh`. Die spätere Behauptung, konkret Bitcoin sei geschürft
worden, wird nirgends belegt.

## Design

### `learn_05_pipe_filter`

Die Find-Beats behalten das gemeinsame Lehr-Token `step_find`, verlieren aber
`isSolution`. Der Count-Beat behält `step_count`. Eine einzige
`TerminalSolution` verlangt mit `allRequired: true` beide Tokens:

```ts
commands: ['step_find', 'step_count']
```

Die Reihenfolge bleibt frei. Dadurch kann ein neugieriger Spieler zuerst
zählen, muss danach aber noch den Account finden; der angeleitete Weg
`grep` gefolgt von `wc -l` funktioniert ebenso. Direkter `grep` und der
fortgeschrittene UID-0-Filter bleiben gültige Find-Wege.

### `learn_06_zombie_hunt`

Das Briefing beschreibt nur die Beobachtung und den Untersuchungsauftrag:

> Ein unbekannter Prozess treibt die CPU auf 99 %. Finde heraus, was
> dahintersteckt, bevor du ihn beendest.

Erst die Prozessausgabe darf aus den sichtbaren Indizien ableiten, dass es nach
einem Cryptominer aussieht. Der Abschlusstext darf den identifizierten
Miner-Prozess benennen, behauptet aber nicht mehr, dass Bitcoin geschürft
wurde.

## Tests

- Ein echter `TerminalSession`-Durchlauf beweist für beide Befehlsreihenfolgen,
  dass der erste Schritt nicht löst und der zweite löst.
- Der bestehende Routing-Test beweist weiterhin, dass kein Plain-`cat` die
  Pipe-Beats verschattet und alle drei Find-Wege dasselbe Token liefern.
- Ein Content-Test beweist, dass das Zombie-Briefing weder `Cryptominer` noch
  `Bitcoin` vorwegnimmt, dass die Prozessausgabe die Miner-Indizien enthält und
  dass kein Abschluss Bitcoin behauptet.
- Betroffene Lesson-Tests, Node-Suite, TypeScript und `git diff --check` bilden
  die Abnahme.

