# Echte Mechanik für die gedosten Szenarien — Umsetzung

Zum Design: `2026-09-22-echte-mechanik-design.md`.

## Reihenfolge

Die Engine zuerst, dann der Inhalt in Stapeln zu drei bis sechs Fällen. Der
Grund ist nicht Bequemlichkeit: Ohne Netzbild lässt sich kein einziger der
Mess-Fälle ehrlich bauen, und ein Fall, den man auf einer würfelnden Messung
aufsetzt, sieht fertig aus und ist es nicht.

### 1. Engine — das Netzbild (`engine/shell/netzwerk.ts`)

- `NetState` mit `records`, `dnsServers`, `dnsDown`, `targets`.
- `pingZiel`, `portMessen`, `aufloese`, `regelwerkUrteil` — ein Auswerter für
  alle Messbefehle.
- Neuer Befehl `nc -z [-v] [-u] host port`, der `refused` (kein Dienst) von
  `timed out` (Filter davor) unterscheidet.
- `Test-NetConnection`, `Test-Connection`, `Resolve-DnsName`,
  `Get`/`Set-DnsClientServerAddress` gegen dasselbe Modell.
- `ping`, `nslookup`, `dig` ebenso.

Wächter: `netzwerk.test.ts` — Reproduzierbarkeit (zwölf Messungen, eine
Antwort), Deckungsgleichheit mit `ss` auf der Kiste, `refused` gegen
`timed out`, „gesätes Netzbild gehört dem Level ganz", DNS-Ausfall und
Umgehung, und die Kreuzprobe Windows/Linux auf demselben Ziel.

### 2. Engine — Prozesse und Sockets

- `processes` im Kontext und an der Hostbeschreibung; `ProcessState` am Host.
- `ps` (inklusive BSD-Schreibweise `ps aux`) und `Get-Process` lesen sie.
- `kill` und `Stop-Process` entfernen Prozess *und* seine Sockets.
- Neu: `Get-NetTCPConnection` — ohne ihn lässt sich auf einer Windows-Kiste
  gar nicht messen, wohin sie spricht.
- Eigene Grundausstattung für Windows-Hosts (Lauscher, Prozesse).
- Bedingungen: `processAbsent`, `processPresent`, `connectionAbsent`,
  `connectionPresent`, `dnsServers`.

Wächter: `prozesse.test.ts`.

### 3. Engine — `listens` an der Diensteinheit

Sockets entstehen beim Start, verschwinden beim Stoppen, und werden beim Säen
nur angelegt, wenn die Einheit aktiv ist.

### 4. Inhalt in Stapeln

| Stapel | Fälle |
|---|---|
| 1 | KRITIS-SC-002, -003, -004 |
| 2 | KRITIS-SC-005, -006, -007 |
| 3 | KRITIS-SC-008, -009, -010, -011 |
| 4 | AMSE-SC-001, -002, -004, -005, -007, -008 |

Je Stapel: Inhalt bauen, im Node-Durchstich fahren, Wächter mit Gegenproben
schreiben, `npm test` und `npm run lint`, dann festschreiben.

## Wächter, die am Ende stehen müssen

- `packs/kritis-infra/echteMechanik.test.ts` und
  `packs/amse-it/echteMechanik.test.ts`: je Fall der angesagte Weg, die
  gleichwertigen Alternativen und jeder plausible Irrweg — gefahren, rot.
- In beiden: **der Erfolg fällt auf die letzte angesagte Zeile.** Gefahren
  durch die echte Sitzung (`fahreZeilen`), nicht an ihr vorbei. Dieser Wächter
  hat genau einen Fall gefunden — `KRITIS-SC-002` endete mit einer Nachmessung
  von außen, die im Spiel nie zur Ausführung kam.
- `abschreibDurchstich.test.ts`: `OHNE_SOLLPFAD` schrumpft auf zwei Level,
  deren Beats reine Muster sind. Alle 23 Pack-Szenarien sind durch Abschreiben
  lösbar.
- `e2e/probespiel.spec.ts` (`@sichtung`): alle 21 KRITIS- und AMSE-Fälle im
  echten Browser durchgespielt — Karte, Auswahl, xterm, Tippen, Ergebnisschirm.

## Stolpersteine, die unterwegs auffielen

- **Rechtschreibwächter.** Unter `content/` gehören echte Umlaute in
  Anzeigetext *und* Kommentare. Berichtsschlüssel und -werte müssen trotzdem
  tippbar bleiben — deshalb heißt ein Feld `abgleich` und nicht `pruefsumme`,
  und ein Wert `teilweise` und nicht `unvollstaendig`.
- **Sollpfad und PowerShell.** Der Herleiter hielt `Get-NetTCPConnection` für
  einen Platzhalter (drei Großbuchstaben in Folge) und `Stop-Process -Id 3456`
  für eine Option ohne Operanden. In PowerShell *sind* die benannten Parameter
  die Argumente, und `Get-*` zählt ohne Argument auf. `grep MUSTER datei` fällt
  weiterhin durch.
- **Handles in nftables.** Die Nummern beginnen nicht bei 1 — Tabelle und
  Ketten verbrauchen welche. Vor jedem Hinweis, der einen Handle nennt, den
  Regelsatz wirklich ausgeben lassen.
- **`ufw delete allow 22`** trifft keine Regel, die mit `proto: 'tcp'` gesät
  wurde. Wer eine löschbare Tür will, sät sie ohne Protokoll — so, wie sie
  jemand getippt hätte.
