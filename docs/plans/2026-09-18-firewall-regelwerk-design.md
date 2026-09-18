# Firewall-Regelwerk: das Paar aus WebAdmin und Konsole

Stand: 2026-09-18. Umsetzungsplan: `2026-09-18-firewall-regelwerk.md`.
Geprüfte Basis: `main` bei `e3b53ea`.

## Was heute fehlt — gemessen, nicht vermutet

Firewall kommt im Spiel dreimal vor, und keine der drei Stellen lehrt ein
Regelwerk:

| Ort | Was der Spieler tut | Was fehlt |
|---|---|---|
| `ufw` in der Shell (`commands/linux/firewallCmd.ts`, 220 Zeilen) | Ports freigeben, Standardrichtung setzen, Wall scharfschalten | Host-Firewall, kein Perimeter. Keine Reihenfolge, keine Ketten |
| `corefirewall`-App (`WindowsLevel/apps/CoreFirewall.tsx`) | Regeln an/aus schalten, Segmente isolieren | Kein Regel-Anlegen, keine Quelle/Ziel/Port-Bearbeitung, keine Reihenfolge |
| Sophos in der Erzählung (`story-week5-8.ts`, `security-chain.ts`) | über Lizenzen entscheiden, ein rotes Dashboard lesen | Der Spieler fasst die Firewall nie an |

Genutzt wird `ufw` von `learn_net_03_the_wall`, dem beacon-Level im selben
Track, `at_l8_bastion_live` und einem Sidequest. Die `corefirewall`-App kommt in
**genau einem** Level vor: Blackout 5.

Die Lücke ist also nicht „Web oder Shell", sondern **Regelwerk als Handwerk**:
Reihenfolge, Erst-Treffer, die zu breite Regel — und die Frage, welche Ansicht
überhaupt die Wahrheit sagt.

## Das Lernziel des Paares

> Die Oberfläche zeigt die Regeln, die sie verwaltet. Die Kiste entscheidet nach
> den Regeln, die sie hat. Das ist nicht dieselbe Menge.

Das ist kein konstruierter Gegensatz, sondern der Alltagsfall: eine Freigabe,
die neben der Verwaltungsebene eingetragen wurde (vom Hersteller bei der
Inbetriebnahme, per Hand während einer Störung, aus einem Skript), steht in
keiner Web-Oberfläche und wirkt trotzdem. Wer nur die Oberfläche prüft, hält
eine Lücke für geschlossen.

Deshalb zwei Level über **dieselbe Kiste und dieselbe Regel**:

- **Level A — WebAdmin.** Die Regel „Fernwartung Hersteller" steht auf Quelle
  `any`. Der Spieler engt sie ein und prüft mit Testverkehr, dass der fremde
  Absender jetzt in die Schlussregel läuft. Danach sieht im WebAdmin alles
  richtig aus.
- **Level B — Konsole, dieselbe Kiste.** Die Gegenstelle kommt weiterhin durch.
  `nft -a list ruleset` zeigt, warum: Die vom WebAdmin verwalteten Regeln liegen
  in einer eigenen Kette, und in `input` steht **vor** dem Sprung dorthin eine
  Ausnahme, die der Hersteller bei der Inbetriebnahme gesetzt hat. Erst-Treffer
  heißt: Sie entscheidet, die Kette darunter wird nie erreicht.

Level B ist ohne Level A spielbar, aber die Pointe braucht die Reihenfolge:
Erst das Gefühl „erledigt", dann der Beweis, dass es das nicht war.

## Warum keine nachgebaute Sophos-Oberfläche

Die Codebasis nennt Hersteller in der Erzählung (Sophos XG, OPNsense) und baut
Bedienoberflächen neutral (`CoreFirewall`, Zone „Leitstand-Perimeter"). Diese
Linie bleibt, aus einem Grund, der in `CLAUDE.md` schon steht: **keine fiktiven
Kommandos.** Eine erfundene XG-Konsole lehrt Muskelgedächtnis, das an der
echten Kiste ins Leere greift. Sophos bleibt der erzählerische Rahmen — es ist
die Appliance, über deren Verlängerung in Woche 5–8 gestritten wurde.

`nftables` dagegen ist überprüfbar: Die Syntax steht fest, die Ausgabe von
`nft -a list ruleset` ist nachvollziehbar, und der Unterbau (`table`, `chain`,
`hook`, `policy`, `jump`, `handle`) ist genau das, was das Lernziel braucht.

## Die zwei Level

### Level A — `learn_fw_01_regelwerk` (GUI)

Neue App `perimeter`, WebAdmin-Optik, Regelwerk als geordnete Tabelle:

```
KRITIS-FW-PERIMETER · Regelwerk (Erst-Treffer von oben)

 #  Name                        Quelle            Ziel            Dienst     Aktion
 1  Fernwartung Hersteller      any               leitstand-hmi   3389/tcp   ZULASSEN  ⚠
 2  Büro → Internet             10.0.10.0/24      any             443/tcp    ZULASSEN
 3  Monitoring → Leitstand      10.0.10.40        leitstand-hmi   161/udp    ZULASSEN
 4  Alles Übrige                any               any             any        VERWERFEN 🔒

[Testverkehr]  203.0.113.66 → leitstand-hmi:3389
   ⇒ Treffer auf Regel 1 — ZUGELASSEN
```

Bedienung (Interaktions-Token): `narrow:<id>` engt die Quelle auf den im
Regelsatz hinterlegten Wartungsbereich ein, `moveup:<id>` / `movedown:<id>`
verschieben, `disable:<id>` / `enable:<id>` schalten, `probe:<id>` schickt einen
hinterlegten Testverkehr durch das Regelwerk und zeigt den Treffer.

Die Schlussregel ist `critical` — wer sie anfasst, bekommt die Verweigerung, die
`CoreFirewall` schon kennt.

**Gewinnbedingung:** Regel 1 eingeengt **und** der Testverkehr der fremden
Quelle gemessen, also `['narrow:fernwartung', 'probe:fremd']` mit
`allRequired: true` und `ordered: true`. Das Messen ist Teil der Lösung, weil
die Behauptung sonst ungeprüft bliebe — dieselbe Begründung wie beim
Port-Check im Netzwerk-Tutorial.

Der Testverkehr ist kein Text, den die Oberfläche behauptet: Er läuft durch
dieselbe Auswertung, die auch die Tabelle beschreibt (erste passende Regel
gewinnt). Eine falsche Reihenfolge zeigt sofort den falschen Treffer.

### Level B — `learn_fw_02_ruleset` (Terminal)

Dieselbe Kiste, diesmal über die Konsole. Die Shell bekommt `nft`.

```
$ sudo nft -a list ruleset
table inet filter {
	chain input {
		type filter hook input priority 0; policy drop;
		ct state established,related accept # handle 4
		iif "lo" accept # handle 5
		ip saddr 203.0.113.0/24 tcp dport 3389 accept # handle 6
		jump webadmin # handle 7
	}

	chain webadmin {
		ip saddr 198.51.100.0/24 tcp dport 3389 accept # handle 11
		ip saddr 10.0.10.0/24 tcp dport 443 accept # handle 12
	}
}
```

Handle 6 ist die Ausnahme neben der Verwaltungsebene: Sie steht **vor** dem
Sprung, also entscheidet sie. Die im WebAdmin eingeengte Regel (handle 11) wird
für diesen Absender nie erreicht.

**Gewinnbedingung** — semantisch, nicht wörtlich. Ein neues `stateGoal` läuft
wie ein Paket durch das Regelwerk und prüft das Urteil:

```ts
stateGoals: [
  { host: 'fw01', nftVerdict: { from: '203.0.113.66', port: 3389, expect: 'drop' } },
  { host: 'fw01', nftVerdict: { from: '198.51.100.7', port: 3389, expect: 'accept' } },
]
```

Die zweite Zeile ist die Falle mit Absicht: `nft flush ruleset` macht die erste
Bedingung wahr und die zweite falsch. Wer das Regelwerk plattmacht, sperrt die
Fernwartung aus, die er eigentlich behalten soll — und das Level sagt es ihm.

Geprüft wird damit **die Wirkung, nicht die Formulierung**: ob der Spieler
`nft delete rule inet filter input handle 6` tippt oder die Ausnahme durch eine
eigene `drop`-Regel davor überstimmt, ist beides richtig, weil beides wirkt.
Das ist dieselbe Linie wie bei `fileRead` und `sshdEffective`.

## Was die Engine dafür bekommt

1. **`NftRuleset` im Host-Zustand** (`shell/hosts.ts`, neben `FirewallState`):
   Tabellen → Ketten (`hook`, `policy`) → Regeln mit `handle`, Matches
   (`ip saddr`, `tcp dport`, `udp dport`, `ct state`, `iif`) und Verdikt
   (`accept`, `drop`, `reject`, `jump <chain>`, `return`).
2. **`nft` als Befehl** (`commands/linux/nftCmd.ts`): `list ruleset`,
   `-a list ruleset`, `list table`, `list chain`, `add rule`, `insert rule`,
   `delete rule … handle N`, `flush chain`, `flush ruleset`. Alles andere
   antwortet wie das Original mit einem Syntaxfehler — **nichts wird erfunden**.
3. **Paketlauf** (`shell/nftEval.ts`): ein Paket (Quelle, Port, Protokoll,
   Zustand) läuft ab dem `input`-Hook durch die Ketten, folgt `jump`, kehrt bei
   `return` zurück, endet beim ersten Verdikt oder bei der Ketten-Policy. Diese
   eine Funktion trägt sowohl das `stateGoal` als auch den Testverkehr der
   WebAdmin-App.
4. **`GuiAppId: 'perimeter'`** samt `PerimeterState` in `shared/src/types/gui.ts`
   und Komponente `WindowsLevel/apps/Perimeter.tsx`.

Der Paketlauf ist bewusst **eine** Funktion für beide Seiten. Hätten WebAdmin
und Konsole je eine eigene Auswertung, wäre der Unterschied zwischen den Leveln
ein Programmierfehler statt einer Aussage über die Wirklichkeit.

## Einordnung im Spiel

Beide Level gehören in den Netzwerk-Track des Lernpfads, hinter
`learn_net_03_the_wall` (dort hat der Spieler `ufw` und die Selbstaussperrung
schon erlebt). `learn_fw_02_ruleset` verlangt `learn_fw_01_regelwerk` über
`requires.events` — die Pointe braucht die Reihenfolge.

Belohnung im Rahmen: je ≤16 Punkte gesamt, ≤10 pro Fertigkeit
(`skillBalanceAudit.test.ts`), Schwerpunkt `netzwerk` und `security`.

## Prüfungen, die mitkommen

- `nftCmd.test.ts` — jeder unterstützte Unterbefehl gegen die echte Ausgabe,
  jeder nicht unterstützte gegen den Fehlerpfad.
- `nftEval.test.ts` — der Paketlauf: Erst-Treffer, `jump`/`return`, Policy als
  Rückfall, und der Fall dieses Levels (Ausnahme vor dem Sprung schlägt die
  engere Regel dahinter).
- `guiSolution.test.ts` — die neuen Token, inklusive der Verweigerung an der
  Schlussregel.
- Die vorhandenen Wächter greifen automatisch: Der Abschreib-Durchstich fährt
  den sichtbaren Weg von Level B durch die echte Shell, die Wissensbilanz
  verlangt, dass `nft` im Auftragstext genannt wird, bevor es gebraucht wird,
  und `packScenarioLessons` führt jeden Hinweisbefehl aus.
- `e2e/levels.spec.ts` bekommt beide Level; Level B nur, wenn der Ablauf
  harness-tauglich ist, sonst in die dokumentierte Ausnahmeliste **mit**
  Begründung.

## Entschieden am 18.09.2026: das Feld

Der Testverkehr ist **frei eintippbar** — Quelle und Dienst tippt der Spieler,
das Ziel wählt er aus den im Regelwerk vorkommenden Zielen. Die hinterlegten
Proben bleiben im Level, aber nicht als Schaltfläche: Sie sind die Messungen,
die *zählen*. Welche das sind, steht im Auftrag, nicht auf einem Knopf.

Das ist der eigentliche Gewinn: Der Spieler muss entscheiden, WAS er prüft.
Das Werkzeug misst alles, was man ihm gibt — auch Verkehr, den die Aufgabe nie
verlangt hat, und auch vor der Änderung. Gewertet wird nur, was am jetzigen
Regelwerk gemessen wurde.

Validiert wird beim Absenden: Die Quelle muss eine IPv4-Adresse oder ein
Präfix sein, der Dienst ein Port (1–65535, wahlweise mit `/tcp` oder `/udp`).
Unbrauchbare Eingaben melden sich, statt eine Messung zu erfinden.
