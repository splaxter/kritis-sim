# Probespiel — Befundprotokoll

Fortlaufend. Was beim **Spielen** gefunden wurde, nicht beim Testen: die
Prüfungen waren in jedem dieser Fälle grün.

Werkzeug: `?level` (Level-Ansicht, jedes Level direkt erreichbar) und
`npm run test:e2e:sichtung` (vier Sichtungen durch die echte Oberfläche).

---

## Runde 1 — 18.09.2026: die Oberfläche baute eine andere Shell

**Befund.** `useTerminal` hat seine `ShellEngine` gebaut, indem es elf Felder
des `TerminalContext` einzeln abgeschrieben hat — und sieben vergessen:
`services`, `journal`, `firewall`, `nft`, `listeners`, `connections`,
`mailboxes`. Jede Motor-Prüfung baut die Shell aus dem **vollen** Kontext. Alle
waren grün, während der Spieler im Spiel gegen einen ungesäten Host lief.

**Ausmaß.** 13 Level, acht davon seit Monaten. Schlimmster Fall:
`learn_net_01_open_doors` — der Lauscher auf Port 31337, den man finden und
beenden soll, existierte nie; „kein Lauscher auf 31337" war von Anfang an wahr,
und das Level löste sich beim ersten Enter selbst.

**Behoben.** `createShellFromContext` nimmt `templateIds` selbst entgegen,
`useTerminal` übergibt den ganzen Kontext. Ein Argument, nichts zu vergessen.

**Lehre.** Ein Wächter, der den kaputten Pfad teilt, kann ihn nicht sehen.
`levelStart.test.ts` (kein Level ist im Ausgangszustand gelöst) hätte den
Fehler **nicht** gefunden — nur das Durchspielen fand ihn.

---

## Runde 2 — 21.09.2026: vier Befunde aus Sichtungen und Varianten-Proben

### 1. Eingaben gingen verloren — lautlos
Der Wächter im Kopf von `handleData` hat Tastendrücke während gestreamter
Ausgabe verworfen. Wer während eines `ping` seinen nächsten Befehl tippte, sah
weder Echo noch Meldung, und die Zeile war weg.
**Behoben:** gepuffert und nachgespielt, wie ein echtes Terminal. Mit Deckel
(512 Zeichen); der Puffer wird verworfen, wenn die Ausgabe im Erfolg endete —
sonst klickt ein mitgetipptes Enter den Abschlussbildschirm weg.
*Gefunden in:* `evt_tutorial_network`, betrifft jedes Level mit `scheduleDrip`.

### 2. Das OT-Level wies die bessere Lösung ab
`nft add chain … '{ policy drop; }'` gab es nicht. Die Grundhaltung einer
Basiskette zu ändern ist der kanonische Weg, eine Grenze zu schließen.
**Behoben:** unterstützt, samt ehrlicher Absage für Regelketten ohne Hook.

### 3. `ufw allow dns` meldete das falsche Problem
„Wrong number of arguments" schickt auf die Suche nach einem Tippfehler,
obwohl der NAME das Problem ist (/etc/services kennt `domain`).
**Behoben:** die Meldung des Originals; `domain`, `smtp`, `ntp` ergänzt.

### 4. Die Schreibweise entschied über die Antwort
`reportFields.matches` war groß/klein-empfindlich, Schlüssel und Listenwerte
aber nicht: `angriff: Nein` fiel durch, `angriff: nein` ging durch.
**Behoben:** Werte werden schreibungsblind geprüft. Dass falsche Antworten
falsch bleiben, ist eigens festgehalten.

---

## Runde 3 — 21.09.2026: Bedienung ohne Maus

### 5. Zwei Apps brachen den Vertrag, den sie selbst ankündigen
`EventViewer` und `TaskManager` tragen `role="listbox"` mit `role="option"`-
Zeilen — aber **ohne Pfeilnavigation**. Explorer und Kataster hatten sie. Für
den Spieler fühlt sich das an, als wäre die Tastatur in dieser einen App
kaputt. Zusätzlich war jede Zeile ein eigener Tabstopp, was dem Muster
widerspricht: Eine Liste hat EINEN Tabstopp, Pfeile bewegen darin.
**Behoben:** rovender Tabstopp plus ↑ ↓ Home Ende, wie im Explorer.

### 6. Und dieselbe Lücke im Explorer selbst
Der Explorer hat drei Listen. Nur die Dateiliste hatte Pfeilnavigation — die
**Berechtigungsliste** nicht, also ausgerechnet die, um die es in
`gui_explorer_open_share` und `gui_explorer_auth_users` geht.
**Behoben:** dasselbe Muster.

*Gefunden, weil der erste Wächter zu naiv war:* Er verlangte, dass jede Zeile
per Tab erreichbar ist — das ist für eine Liste gerade falsch. Erst die
Fassung, die den **Vertrag** prüft (ein Tabstopp, dann Pfeile), fand die
echten Fälle.

### Kein Befund, aber notiert
Die Fensterknöpfe „Minimieren"/„Maximieren" sind absichtlich `tabIndex={-1}`
und ohne Funktion — reine Dekoration. Für die Bedienung richtig; sie melden
sich aber als Schaltflächen bei Hilfstechnik. Ein `aria-hidden` wäre sauberer.

---

## Runde 4 — 21.09.2026: die Ereignisliste war ein Schlitz

### 7. 44 Pixel Liste bei 55 bis 117 Pixel Zeilenhöhe
Die Ereignisanzeige zeigte auf **jedem** Bildschirm ein Bruchstück einer
Zeile — auch auf dem Desktop mit 800 px Höhe. Das Level verlangt, ein
bestimmtes Ereignis am Zeitstempel zu erkennen.

**Ursache, und sie war strukturell:** `flexBasis: 0` mit `flexGrow: 1`
verteilt nur **freien** Platz. Das Fenster hatte aber gar keine Höhe, nur eine
Obergrenze (`maxHeight`) — also gab es nie freien Platz, und die Liste war
immer exakt ihre Mindesthöhe. Die 44 px stammten aus einem früheren Fix fürs
Querformat, wo die Fußleiste aus dem Fenster gedrängt wurde. Als Notbremse
gedacht, zur Regel geworden.

**Behoben:** Die Liste trägt ihren Inhalt (`flexBasis: auto`) und gibt bei
Enge nach; die Obergrenze des Fensters deckelt, die Fußleiste weicht nie.
Dazu Medienabfragen für die beiden engen Fälle.

| Format | vorher | nachher |
|---|---:|---:|
| 320×568 | 0,4 Zeilen | 2,0 |
| 375×667 | 0,5 | 3,3 |
| 667×375 quer | 0,8 | 2,3 |
| 1280×800 Desktop | 0,8 | 5,1 |

Der Wächter (`e2e/ereignisliste.spec.ts`) prüft beides **gegeneinander**: genug
Liste UND Fußleiste im Rahmen. Wer das eine repariert und das andere vergisst,
fällt auf.

### Drei Fehlalarme auf dem Weg dorthin
Mein Prüfer für schmale Bildschirme lag dreimal daneben, bevor er traf — jedes
Mal, weil er **scrollbar** mit **abgeschnitten** verwechselte:
1. `overflow-x: hidden` + `overflow-y: auto` ist ein scrollbarer Kasten (25 von
   26 Leveln gemeldet).
2. Auch wenn kein Kasten scrollt, scrollt die Seite (22 von 26).
3. `scrollIntoViewIfNeeded` scrollt minimal; „nicht vollständig im Bild" heißt
   nicht „unerreichbar".
Entschieden hat es am Ende ein **Bildschirmfoto**, nicht eine weitere Messung.

---

## Runde 5 — 21.09.2026: ohne Maus bis zur Lösung

### 8. Drei Kästchen, eine ID, zwei ohne Namen
Im Meldeformular teilten sich die drei Auswahlkästchen der Mehrfachauswahl
**dieselbe `id`**. Ursache: Fluents `Field` reicht seine Beschriftung und seine
`id` an sein Kind weiter — gedacht für EIN Bedienelement. Bei drei Kindern
bekamen alle drei dieselbe ID, das erste wurde als *„Betroffene Dienste und
Systeme"* angesagt statt als *„Dateiserver Disposition"*, die anderen beiden
hatten gar keinen Namen.

Für jemanden mit Hilfstechnik heißt das: die Frage dreimal, die Antworten nie.

**Behoben:** kein `Field` um die Gruppe, sondern eine echte
`role="group"`-Gruppe mit eigener Beschriftung; jedes Kästchen behält seinen
Namen. Der Wächter (`e2e/bedienelemente.spec.ts`) prüft beides über alle
26 GUI-Level: keine doppelten IDs, kein Bedienelement ohne Namen.

### Kein Befund: alle neun Apps sind ohne Maus lösbar
`e2e/nur-tastatur.spec.ts` spielt je ein Level pro App komplett mit der
Tastatur durch — Task-Manager, Ereignisanzeige, Explorer, Core-Firewall,
Windows-Sicherheit, Perimeter-WebAdmin, UAC, Pflichtenkataster (samt Menü) und
Meldeformular (samt Auswahllisten und Radiogruppen). Alle neun lösen.

### Vier Fehlalarme, alle in meinem Werkzeug
Kein einziger davon war ein Fehler der App:
- Ein Kontrollkästchen schaltet mit der **Leertaste**, nicht mit Enter.
- Ein Eingabefeld hat keinen `innerText`; sein Name steht in `aria-labelledby`.
- `Control+a` ist auf macOS „an den Zeilenanfang", nicht „alles markieren" —
  das Getippte wurde angehängt statt ersetzt.
- In einem geöffneten Menü wandert man mit **Pfeilen**; Tab verlässt es.
- Pfeiltasten auf einer nativen Auswahlliste ändern im Headless-Browser nichts
  (dort öffnet sich ein Systemmenü). Die Anfangsbuchstaben zu tippen geht.

---

## Was sauber war

Ein Nichtbefund ist auch ein Ergebnis — und er sagt, wo nicht mehr gesucht
werden muss:

| Sichtung | Umfang | Ergebnis |
|---|---|---|
| Abschreibbar durchgespielt | 82 Terminal-Level | nur die 19 dokumentierten Ausnahmen |
| Hinweise bis „0 übrig" | alle Level mit Hinweisen | kein Zähler im Minus, kein fehlender Hinweis |
| Aufgabentext bei 320 px | 91 Level | kein unerreichbarer Text |
| GUI-Level geöffnet | 26 | jede App rendert, keins vorab gelöst |
| Listen per Pfeiltaste | 26 GUI-Level | nach Runde 3 alle, vorher 3 Apps ohne |
| Terminaltasten | History, Tab, Cursor, Strg+C | alles trägt, auch Vervollständigung für `nft`/`openssl` |
| Zweiter Anlauf eines Levels | Abbrechen und neu öffnen | frischer Zustand, nichts hält |
| Schaltflächen bei 320 px | 26 GUI-Level | alle erreichbar (nach Runde 4) |
| Ohne Maus bis zur Lösung | 9 Apps, je ein Level | alle lösbar |
| Namen und IDs | 26 GUI-Level | nach Runde 5 sauber |

## Zwei Verdachtsfälle, die keine waren

Beide gingen auf mein eigenes Werkzeug, nicht auf das Spiel — notiert, damit
sie nicht nochmal Zeit kosten:

- **Ein leeres Listenfeld ist kein Bedienfehler.** `kt_l2_erster_eintrag`
  startet mit leerem Kataster und wird über den Fundstapel daneben bedient.
- **`locator.isVisible()` prüft SOFORT** und ignoriert eine `timeout`-Option.
  Gemessen wurde gegen den noch nicht geladenen Lazy-Chunk; 63 Level galten als
  „Terminal startet nicht". Richtig ist `waitFor({ state: 'visible' })`.
- **250 ms reichen nicht für gestreamte Ausgabe.** `ping` tropft über Timer;
  wer früher tippt, tippt in eine beschäftigte Sitzung.

---

## Offen — hier weitersuchen

- **Fokusfallen in den Modalen.** Ob der Fokus im Modal bleibt und Escape
  sauber schließt, ist für die Menü-Modale teilweise getestet, für die
  Level-Ansicht gar nicht.
- **Nutzertest mit Terminal-Einsteigern.** Steht seit PR #20 offen und wird von
  keiner Sichtung ersetzt: Sie prüfen Erreichbarkeit, nicht Gefühl.
- **Die gedosten Fälle.** Von 23 Terminal-Szenarien in den Packs arbeiten erst
  8 mit echten Zustandszielen; AMSE (6) und der Rest von KRITIS sind weiterhin
  vorgefertigte Ausgaben.
- **Layout-Flake in Playwright.** Unter hoher Maschinenlast laufen jsdom- und
  Layout-Tests in Zeitüberschreitungen. Beim nächsten Auftreten unter normaler
  Last anhand des Traces untersuchen.
