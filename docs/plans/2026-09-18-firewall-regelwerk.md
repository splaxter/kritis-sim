# Umsetzung: Firewall-Regelwerk (WebAdmin + Konsole)

Entwurf: `2026-09-18-firewall-regelwerk-design.md`. Basis: `main` bei `e3b53ea`.
Stand: umgesetzt am 18.09.2026.

## Was gebaut wurde

### Engine

| Datei | Inhalt |
|---|---|
| `client/src/engine/shell/nftables.ts` | Modell (Tabelle → Kette → Regel mit Handle), Parser, Ausgabe, **Paketlauf** und `seedNftState` |
| `client/src/engine/shell/commands/linux/nftCmd.ts` | `nft` — `[-a] list ruleset\|table\|chain`, `add`/`insert`/`delete rule`, `flush chain\|ruleset` |
| `client/src/engine/perimeterRegelwerk.ts` | Übersetzt die WebAdmin-Regelliste in einen Regelsatz und lässt sie **durch denselben Paketlauf** |
| `shared/src/types/terminal.ts` | `TerminalNftSpec` (Seeding) und das `nftVerdict`-Ziel |
| `shared/src/types/gui.ts` | `GuiAppId: 'perimeter'`, `PerimeterState`, `PerimeterRule`, `PerimeterProbe` |
| `client/src/components/WindowsLevel/apps/Perimeter.tsx` | Die WebAdmin-Oberfläche |

Drei Entscheidungen, die nicht offensichtlich sind:

1. **Ein Paketlauf für beide Seiten.** `evaluatePacket` trägt das `nftVerdict`-Ziel,
   die Konsole und den Testverkehr der Oberfläche. Zwei getrennte Auswertungen
   hätten den Unterschied zwischen den beiden Leveln zu einem Programmierfehler
   gemacht statt zu einer Aussage über die Wirklichkeit.
2. **Seeds gehen durch den Spieler-Parser.** `seedNftState` liest jede Regel mit
   derselben Funktion wie `nft add rule`. Ein Level kann damit keinen Regelsatz
   bauen, den der Spieler nicht auch tippen könnte. Ein unlesbarer Seed wirft —
   die Level-Wächter fangen ihn vor dem Spiel.
3. **`nftVerdict` teilt sich nach Erwartung.** Ein verlangtes `drop` ist eine
   Aufgabe, ein verlangtes `accept` eine Schutzbedingung. Beide als Anforderung
   zu führen hätte eine Pflicht erfunden — derselbe Fehler, den
   `listenerPresent` einmal hatte.

### Inhalt

- `learn_fw_01_regelwerk` (GUI) und `learn_fw_02_ruleset` (Terminal) in
  `learning-path-advanced.ts`, beide im Track `net_forensics`.
- Verkettet über `requires.events`: `learn_net_03_the_wall` → Level A → Level B.
- Belohnung: A 9 Punkte, B 13 — innerhalb der Schranken des Skill-Audits.

## Prüfungen

| Prüfung | Was sie festhält |
|---|---|
| `nftables.test.ts` (21) | Präfixe, Parser inkl. Ablehnung erfundener Syntax, Erst-Treffer, `jump`, Policy-Rückfall, Ausgabe wird vom eigenen Parser wieder gelesen |
| `nftCmd.test.ts` (16) | Jeder Unterbefehl gegen die echte Shell; `insert` wirkt, `add` an derselben Stelle nicht — der Reihenfolge-Beweis |
| `anforderungen.kandidaten.test.ts` | `nft` **gemessen** am echten Level-Ziel; Gegenproben: `ufw` ändert den nft-Regelsatz nicht, `nft flush ruleset` löst ein Ziel und zerstört zwei |
| `Perimeter.browser.test.tsx` (4) | Lösung, Trefferanzeige, Verweigerung an der Schlussregel — und dass eine Messung von **vor** einer Änderung nicht weiterzählt |
| `abschreibDurchstich` | Level B löst, wenn man den letzten Hinweis abschreibt |
| `wissensbilanz` | `nft` steht im Auftragstext, bevor es gebraucht wird; Ratsche bleibt leer |
| `e2e/levels.spec.ts` | Level A spielt im echten Browser durch (`HARNESS_OK_LEVELS`) |

Gegenproben gefahren: ohne die Rücknahme der Messungen löst eine veraltete
Messung das Level (rot), mit ihr nicht (grün).

## Was offen bleibt

- **Level B fährt nicht im Browser-Harness.** Der Track `net_forensics` ist dort
  als Ganzes ausgenommen, weil seine CLI-Level ihre Lösung nicht aus dem
  Kontext ableiten lassen. Der Nachweis liegt im Node-Durchstich, der den
  sichtbaren Weg gegen die echte Shell fährt. `HARNESS_OK_LEVELS` holt
  immerhin das GUI-Level zurück.
- **Freier Testverkehr** (Quelle und Port selbst eintippen) statt der
  hinterlegten Proben — im Entwurf als offene Entscheidung benannt, hier
  bewusst nicht gebaut.
- **`nft` kennt einen schmalen Ausschnitt.** Keine NAT-Tabellen, keine Sets,
  keine Zähler. Was fehlt, antwortet mit einem Syntaxfehler statt mit einer
  Erfindung.
