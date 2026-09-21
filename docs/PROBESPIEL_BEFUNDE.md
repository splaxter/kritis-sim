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

- **Tastaturbedienung, zweite Hälfte.** Die Listen tragen jetzt (Runde 3).
  Ungeprüft bleibt: ob sich jedes GUI-Level von Anfang bis Lösung ohne Maus
  spielen lässt (nicht nur navigieren), und ob die Fokusfallen in den Modalen
  wirklich schließen. Die Level-Ansicht selbst ist ebenfalls noch nicht
  daraufhin geprüft.
- **Nutzertest mit Terminal-Einsteigern.** Steht seit PR #20 offen und wird von
  keiner Sichtung ersetzt: Sie prüfen Erreichbarkeit, nicht Gefühl.
- **Die gedosten Fälle.** Von 23 Terminal-Szenarien in den Packs arbeiten erst
  8 mit echten Zustandszielen; AMSE (6) und der Rest von KRITIS sind weiterhin
  vorgefertigte Ausgaben.
- **Layout-Flake in Playwright.** Unter hoher Maschinenlast laufen jsdom- und
  Layout-Tests in Zeitüberschreitungen. Beim nächsten Auftreten unter normaler
  Last anhand des Traces untersuchen.
