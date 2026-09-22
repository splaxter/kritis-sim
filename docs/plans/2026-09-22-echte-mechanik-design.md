# Echte Mechanik für die gedosten Szenarien — Design

Stand: 22.09.2026 · betrifft `content/packs/amse-it`, `content/packs/kritis-infra`,
`engine/shell`

## Ausgangslage

Von 23 Terminal-Szenarien in den Packs arbeiteten 7 mit echten Zustandszielen.
Die übrigen 16 waren *gedost*: Auf ein Befehlsmuster kam eine vorgefertigte
Ausgabe, und gelöst war das Level, wenn der Spieler ein bestimmtes Wort getippt
hatte. Die Maschine hat dabei nichts getan.

Das ist kein Schönheitsfehler, sondern ein inhaltliches Problem in drei Stufen:

1. **Die Lehre wird behauptet statt getragen.** Im Ergebnistext steht, warum
   ein Weg falsch war — aber jeder Weg führt zum selben Ergebnis, weil es nur
   einen gibt.
2. **Die Irrwege lassen sich nicht prüfen.** Eine Gegenprobe („der naheliegende
   Fehler scheitert wirklich") setzt einen Zustand voraus, in dem sie scheitern
   *kann*.
3. **Der Spieler lernt Vokabeln, keine Arbeit.** Wer weiß, dass `nmap` die
   richtige Antwort ist, hat nichts über Portscans gelernt.

## Entscheidung

Alle 16 Szenarien bekommen echte Mechanik, nach dem Muster, das
`KRITIS-SC-001` und `KRITIS-SC-012` vorgegeben haben: gesäter Zustand,
deklarative Gewinnbedingungen, und zu jedem Fall mindestens eine bewahrende
Bedingung, die „mehr kaputtmachen" ausschließt.

### Was den Fällen fehlte — und was dafür in die Engine kam

Die Umstellung war nicht nur Inhalt. Drei Lücken standen im Weg:

**Es gab kein Netz.** `ping` las eine feste Tabelle im Quelltext,
`Test-NetConnection` eine zweite — und fiel für alles, was in keiner von beiden
stand, auf `Math.random() > 0.5` zurück. Ein Level, dessen BEWEIS ein Portscan
ist („8443 ist zu, 443 geht"), hat damit gewürfelt.

→ `engine/shell/netzwerk.ts`: ein Netzbild je Level, das alle Messbefehle
befragen — `ping`, `nc` (neu), `Test-NetConnection`, `Test-Connection`,
`nslookup`, `dig`, `Resolve-DnsName`. Die Rangfolge ist die des echten Netzes:
Ist das Ziel eine registrierte Maschine des Levels, entscheidet ihr eigener
Zustand (nftables oder ufw, dann die Lauscher) — dieselbe Auswertung, die `nft`
und das `nftVerdict`-Ziel benutzen. Sonst gilt die Zieltabelle des Levels.
Ohne Saat bleibt die alte Standardtabelle, damit bestehende Level ihre
Messungen behalten.

**Prozesse waren Ausgabe, kein Zustand.** `ps` gab sechs fest verdrahtete
Zeilen aus, `Get-Process` sechs andere, und `Stop-Process` meldete Erfolg, ohne
etwas zu ändern.

→ `processes` im Level-Kontext, gelesen von `ps` und `Get-Process`, verändert
von `kill` und `Stop-Process` — samt der Sockets des Prozesses. Dazu vier
Bedingungen: `processAbsent`/`processPresent` und
`connectionAbsent`/`connectionPresent`.

**Dienst und Port waren zwei Dinge.** Ein Level konnte einen toten Dienst mit
offenem Port säen, und ein Neustart ließ den Port zu — die Reparatur blieb von
außen unsichtbar.

→ `listens` an der Diensteinheit. Die Sockets entstehen beim Start und
verschwinden beim Stoppen; beim Säen nur, wenn die Einheit aktiv ist.

### Was ein umgebauter Fall mitbringen muss

- **Gesäter Zustand**, aus dem die Antwort hervorgeht — keine Datei, die die
  Antwort nennt.
- **Mindestens eine bewahrende Bedingung.** In der Anlagenwelt ist Isolation
  nie kostenlos; was überleben muss, gehört in die Gewinnbedingung, sonst ist
  „alles abschalten" eine Lösung.
- **Eine Gegenprobe je plausiblem Irrweg**, gefahren, nicht beschrieben.
- **Der Erfolg fällt auf die LETZTE angesagte Zeile.** Ein Schritt, den der
  Auftrag nennt und die Bedingung nicht verlangt, kommt im Spiel nie zur
  Ausführung — nach dem Erfolg wartet die Sitzung auf das bestätigende Enter.
  Geprüft wird das durch die echte Sitzung, nicht an ihr vorbei.

## Die sechzehn Fälle und ihre jeweilige Lehre

| Fall | Mechanik | Die Falle, die sich richtig anfühlt |
|---|---|---|
| KRITIS-SC-002 | Multi-Host, Dienste, Portmessung | Der Dienst heißt auf dem Leitstand genauso — wer das ssh vergisst, startet den Client neu |
| KRITIS-SC-003 | Dateien, Bericht | Der Alarm nennt als „Quelle" den Weg, nicht den Verursacher |
| KRITIS-SC-004 | nftables | Ein Verdikt ist endgültig; der Sprung steht über den VPN-Freigaben |
| KRITIS-SC-005 | Prozesse, Verbindungen | Zwei Prozesse sprechen ins OT-Netz, einer gehört dahin |
| KRITIS-SC-006 | Prüfsumme, Bericht | Die Anleitung des Herstellers kennt die Vertretungen nicht |
| KRITIS-SC-007 | Dateien, Bericht | Eine automatische Antwort nach einer Minute ist keine Reaktion |
| KRITIS-SC-008 | Dateien, Bericht | In jedem Ordner LIEGT etwas — und einer ist wirklich in Ordnung |
| KRITIS-SC-009 | Datei erzeugen | Die Frist beginnt mit der Kenntnis, nicht mit dem Vorfall |
| KRITIS-SC-010 | Rechnen, Bericht | Stufe 3 und 4 reichen nicht; die letzten 0,5 kW kommen aus Stufe 2 |
| KRITIS-SC-011 | Multi-Host, Dateien | Zwei Konten mit fast demselben Namen |
| AMSE-SC-001 | Portmessung, Bericht | Ein Nachweis ohne Messung — genau das, was der Dienstleister lieferte |
| AMSE-SC-002 | Dateien, Bericht | `ikelifetime` steht über dem gesuchten Wert und sieht genauso aus |
| AMSE-SC-004 | nftables | Beim Aufräumen den eigenen Zugang mitnehmen |
| AMSE-SC-005 | Netzbild, DNS | „Internet geht nicht" sind zwei Fragen |
| AMSE-SC-007 | nftables-Auszug, Bericht | Der Auszug ist leicht, der Abgleich findet die Regel ohne Zweck |
| AMSE-SC-008 | Verbindungen, ufw | Die Sitzung ist das Symptom, die offene Tür das Problem |

Sechzehn Zeilen, nicht fünfzehn: Der Findungsbericht sprach von „AMSE (6) und
dem Rest von KRITIS" — nachgezählt sind es zehn KRITIS-Fälle, nicht neun.

## Was ausdrücklich nicht dazugehört

- **Kein neues Gewinnmodell.** Die Fälle nutzen, was es gibt; neu sind nur die
  vier Bedingungen oben, und die sind Symmetrien zu bestehenden.
- **Keine Aufwertung der Schwierigkeit.** Ein Fall mit Schwierigkeit 2 bleibt
  einer; echte Mechanik heißt nicht mehr Schritte, sondern prüfbare.
- **Kein Umbau der Auswahl.** Wann ein Szenario erscheint, entscheidet
  weiterhin `scenarioEngine`.
