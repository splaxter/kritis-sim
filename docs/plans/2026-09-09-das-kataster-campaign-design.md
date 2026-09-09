# DAS KATASTER — Dritte Story-Kampagne (Design)

Datum: 2026-09-09 · Status: abgenommen (Rev. 2 — Picker sichtbar, ISB benannt,
Rechtsgrundlagen geprüft: § 10 BSI-KritisV und § 39 BSIG bestätigt, L6 erweitert)

Verortung und Oberfläche sind vom Auftraggeber gesetzt: **eigene, dritte
Story-Kampagne**; Kataster-Bedienung **hybrid** (GUI-Grid für das Register,
CLI-Level für die Spurensuche).

---

## 1. Konzept

Ein Bürokratie-Krimi in 4 Akten bei **WARM – Abfallwirtschaft Rhein-Main**.
Bekannte Organisation, bekannte Besetzung, **frischer Kampagnenzustand** — wie
AUDIT TRAIL eine eigenständige Parallelgeschichte, die kein Ende einer anderen
Kampagne voraussetzt oder kanonisiert.

Der neue Spielkern liegt eine Ebene **vor** dem von AUDIT TRAIL:

| Kampagne | Leitfrage |
|---|---|
| Die Probezeit | „Überlebe ich den Alltag?" |
| AUDIT TRAIL | „Kann ich beweisen, was ich getan habe?" |
| **DAS KATASTER** | **„Weiß ich überhaupt, was wir schulden — und wer es tut?"** |

Der Gegner ist kein Mensch, sondern die **verwaiste Pflicht**: eine Aufgabe, die
in einem Vertrag, einem Gesetz, einer Dienstvereinbarung oder einer Police
steht, die niemand kennt, und die deshalb erst durch ihre Konsequenz sichtbar
wird — als Mahnschreiben, als Rechnung, als Frage im Vorstand. Bjorg ist nicht
der Gegner, sondern der **Verstärker**: der Kollege, der Pflichten mündlich
verteilt, nie dokumentiert und „das im Kopf" hat.

### Der Satz der Kampagne

> **Eine Pflicht ohne Aufpasser ist keine Pflicht, sondern ein Risiko.
> Ein Aufpasser ohne Nachweis ist keine Kontrolle, sondern eine Behauptung.**

Beides ist im Grid sichtbar (🟥 verwaist / 🟨 behauptet / 🟩 belegt) — und der
vierte Zustand ist es **nicht**: eine erfundene Zuweisung sieht grün aus und
fällt erst in der Stichprobe auf. Das ist die No-Fabrication-Regel als
Spielregel, nicht als Textbaustein.

**Lernziele:** Woher Pflichten kommen (Vertrag · Gesetz/Aufsicht ·
Dienstvereinbarung · Lizenz/Police), Aufpasserschaft vs. Zuständigkeit,
Nachweis vs. Behauptung, Turnus und Frist, Negativbefunde dokumentieren,
Eskalation als Bringschuld-Umkehr, Fristen in Systeme statt in Köpfe.

---

## 2. Festgezurrte Entscheidungen

1. **Eigenständige dritte WARM-Kampagne** (`CampaignId: 'kataster'`). Kein
   Import von Endings, Flags oder Beziehungen aus Probezeit oder AUDIT TRAIL;
   dieselben sichtbaren Figuren, eigener Startzustand. Registry-Anschluss über
   das bestehende `getCampaign(id)`-Seam.
2. **Keine fiktiven CLI-Befehle** (Regel von AUDIT TRAIL wird übernommen). Das
   `kataster add --quelle …` aus dem Ur-Pitch entfällt bewusst — es gibt kein
   solches Werkzeug in der Realität, und das Spiel hat sich die Glaubwürdigkeit
   echter Kommandos teuer erarbeitet. Stattdessen: **Spuren im Dateisystem mit
   echten Werkzeugen, Register in einer GUI-App** — genau wie ein reales
   Pflichtenkataster in Excel/GRC-Tool lebt, nicht in einer Shell.
3. **Neue GUI-App `kataster`** (siebte App neben taskmanager/eventviewer/uac/
   explorer/settings/corefirewall). Sie rendert das Grid, den Quellentext zur
   markierten Zeile, den Fundstapel und den Belegstapel.
4. **Das Kataster ist NICHT laufzeitpersistent.** Jedes Kataster-Level wird mit
   dem Stand geseedet, den die Geschichte an dieser Stelle hat; was der Spieler
   *entschieden* hat, lebt in Flags. Begründung in §7.3 — inklusive dem, was das
   kostet, und der Mitigation über `alternateEventId`.
5. **Punktelogik = verwaiste Pflichten gefunden und benannt, bevor sie
   zuschlagen** — nicht „Zeilen gefüllt". Ein absichtlich als Lücke markierter
   Eintrag zählt **positiv**; ein grün gefüllter ohne Nachweis zählt **negativ**.
   Das Spiel belohnt an mehreren Stellen, das Grid *schlechter* aussehen zu
   lassen (L4 „Downgrade", L5 „Lücke melden").
6. **Konsequenzen über authored Beats + `branchCondition`/`alternateEventId`,
   nicht über die Chain-Engine.** Story-Mode serviert `pendingChainEvents` nicht
   (`eventEngine.getActivatedChainEvents` hängt am Event-Pfad, den
   `getNextStoryContent` nicht benutzt) — die AUDIT-TRAIL-Konsistenztests halten
   das ausdrücklich fest. Akt 3 ist deshalb die „Uhr": jede in Akt 2 verwaist
   gebliebene Pflicht hat dort ihren garantierten Payoff-Beat.
7. **Der Audit-Tag ist deterministisch, nicht zufällig.** „Drei zufällige
   Einträge" aus dem Pitch wird zu „drei Stichproben, die der ISB sich aussucht" —
   fix in der Abfolge, aber für den Spieler unvorhersehbar, weil er nicht weiß,
   *welche* Zeilen er aufschlägt, bis er es tut. Begründung: ein RNG, der das
   Ending mitbestimmt, ist weder testbar noch fair (§4.2).
8. **Fünf Kataster-Domänen → drei Endings**, Ableitung und modularer Epilog
   exakt nach dem erprobten AUDIT-TRAIL-Muster (`FlagCondition`,
   `deriveEnding`, `buildEpilogue`). Keine neue Ending-Mechanik.
9. **Kein Ton-/Deeskalations-Thema.** AUDIT TRAIL hat D5 „Deeskalation" bereits;
   die Bjorg-Szenen hier drehen sich um **Verbindlichkeit** („Ich trag dich ein
   und schick dir eine Mail — antworte kurz mit ok"), nicht um Umgangston.
10. **Text-only wie AUDIT TRAIL** — keine Chapter-Art, kein StoryBackground, um
    keine Probezeit-Assets zu importieren. Interstitials sind Text.
11. **Keine Sidequests in V1** (die Engine verträgt leere Sets nachweislich).

---

## 3. Figuren

Bekannte WARM-Besetzung, eigener Beziehungs-/Flag-Startzustand.

- **Bert** — IT-Leitung. Kompetent, technisch fit, unterstützend (Kanon). Er
  ist hier nicht der Bremser, sondern der, der die Frage **nicht beantworten
  kann** — und das offen zugibt. Er ist die Adresse für jede Eskalation und
  reagiert auf Schriftliches; genau das macht die Bringschuld-Umkehr spielbar.
- **Bjorg** — lauter Delegierer mit Boomer-Humor (Kanon). Sein Beitrag zum
  Kataster: „Das mach ich alles." Vier Einträge, kein Nachweis, keine
  Rückmeldung. Er ist nicht bösartig, sondern **unverbindlich** — was in einem
  Pflichtenkataster derselbe Schaden ist.
- **Jens** — fachlicher Anker und Mentor-Stimme in Hints. Sein Satz vor L7 ist
  die einzige Vorwarnung vor der Fabrication-Falle: „Wenn du einen Namen
  einträgst, sag der Person Bescheid. Sonst ist es deiner."
- **Henry** — Systemtechnik, Realitätscheck. Er ist der einzige, der einen
  Nachweis *wirklich* liefert, und zwar ungefragt.
- **Dr. Müller** — Geschäftsführung. Zwei Auftritte in Akt 3, dieselbe Frage in
  zwei Tonlagen — je nachdem, ob die Lücke gemeldet oder kaschiert wurde.
- **Jakob Michael** — externer ISB, zwei Tage im Monat beauftragt. **Neu.**
  Kein Feind, kein Verbündeter: er fragt und schreibt mit. Sein Leitsatz grenzt
  ihn klar von der ISB-Rolle in AUDIT TRAIL ab (dort: Beweisführung):
  > „Mich interessiert nicht, ob es läuft. Mich interessiert, wer es merkt,
  > wenn es nicht mehr läuft."
- **Reinhard Kalb** — Vorgänger, 31 Jahre WARM, seit drei Wochen in Rente.
  **Neu, tritt nie auf.** Er hinterlässt einen halb leeren Ordner und ist genau
  einmal telefonisch erreichbar (Akt 2, Dialog) — und dann nicht hilfreich:
  „Das lief immer. Fragen Sie Bjorg." Kein Bösewicht, kein Geheimnis: die
  Kampagne handelt von einem **Zustand**, nicht von einer Schuld.

---

## 4. Akt 4 zuerst: die fünf Fragen (Rückwärts-Design)

Wie in AUDIT TRAIL definiert der Showdown, welche Level es überhaupt geben
muss. Jede Frage ist ein Beat mit `branchCondition` auf die Domänen-Bedingung
aus §5.2 (erfüllt/nicht erfüllt = zwei Szenen); die belastenden Flags erzeugen
eigene Konfrontationsszenen.

### 4.1 Die Fragen

| # | Michaels Frage | Belastbare Antwort braucht | Domäne |
|---|---|---|---|
| Q1 | „Zeigen Sie mir den letzten Prüfnachweis für den Verfügbarkeitsbericht." | Der Monatsbericht ist einem Aufpasser zugeordnet **und** ein echter Beleg ist hinterlegt. | K3 |
| Q2 | „Ihre Dienstvereinbarung verweist auf ein Notfallhandbuch. Wo ist es?" | Der Verweis ins Leere wurde gefunden, als Lücke eingetragen und **gemeldet** — nicht kaschiert. | K4 |
| Q3 | „Ihr Kollege steht bei vier Einträgen als Aufpasser. Weiß er das?" | Die Zuweisung wurde schriftlich bestätigt — oder der Eintrag steht ehrlich auf 🟨. | K2 |
| Q4 | „Woher wissen Sie, dass Sie nichts übersehen haben?" | Alle vier Pflichtenquellen erschlossen (Vertrag, Gesetz/Aufsicht, Dienstvereinbarung, Lizenz/Police). | K1 |
| Q5 | „Was in diesem Kataster ist heute nicht erfüllt — und wer weiß davon?" | Die offenen Lücken sind schriftlich, mit Datum, bei der Leitung. | K5 |

### 4.2 Warum keine Zufalls-Stichprobe

Der Pitch wollte „drei zufällige Katastereinträge". Umgesetzt wird eine
**deterministische Stichprobe**, weil:

- ein RNG im ending-bestimmenden Showdown die Kampagne bei gleichem Spiel
  unterschiedlich ausgehen lässt — das untergräbt genau die Botschaft
  („Belegbarkeit schlägt Glück");
- die Domänen-/Ending-Tabellen sonst nicht tabellengetrieben testbar wären
  (AUDIT TRAILs Ending-Tests sind das Vorbild);
- der Stichproben-*Effekt* nicht vom Zufall kommt, sondern davon, dass der
  Spieler **vorher nicht weiß, welche Zeile aufgeschlagen wird**. Fünf feste
  Fragen über ein Kataster mit ~14 Zeilen fühlen sich exakt wie eine Stichprobe
  an.

Kompromiss, der den Stichproben-Eindruck verstärkt, ohne Zufall einzuführen:
Michael benennt in Q1/Q3 die Zeile über eine **abgeleitete Beschreibung** statt
über einen festen Namen („die Zeile, die am längsten ohne Nachweis ist") — der
Text ist dann eine `alternateEventId`-Variante, keine Würfelei.

---

## 5. Flags, Domänen, Endings

Namensraum: **Events `kt_*`, Flags `kat_*`.** Damit sind die Flags mechanisch
disjunkt von Probezeit und AUDIT TRAIL (guarded, §8).

### 5.1 Flags

| Flag | Gesetzt in | Domäne |
|---|---|---|
| `kat_source_contract` | Akt 1, L1 (SLA-Fund in der Quellenliste) | K1 |
| `kat_source_license` | Akt 2, L3 (Lizenz-Audit-Klausel gefunden) | K1 |
| `kat_source_dv` | Akt 2, L5 (Dienstvereinbarung §7 gelesen) | K1 |
| `kat_source_law` | Akt 2, L6 (BSI-Erinnerung im Sammelpostfach gefunden) | K1 |
| `kat_stale_owner_found` | Akt 2, L4 (Aufpasser ohne Aktivität entlarvt) | K3 |
| `kat_evidence_linked` | Akt 2, L7 (echte Belege den Einträgen zugeordnet) | K3 |
| `kat_no_silent_orphan` | Akt 2, L7 (jede unbesetzte Zeile ist als Lücke markiert) | K2 |
| `kat_ownership_confirmed` | Akt 3, Dialog Bjorg (Zuweisung schriftlich bestätigt) | K2 |
| `kat_gap_reported` | Akt 2, Dialog nach L5 (Verweis ins Leere gemeldet) | K4 |
| `kat_gaps_escalated` | Akt 3, Mail an Bert/GF (offene Lücken schriftlich, mit Datum) | K5 |
| `kat_purchasing_informed` | Akt 2, L3 (Lizenzpflicht an Einkauf übergeben statt selbst geschluckt) | K5 |
| `kat_owner_fabricated` | Akt 2/3, L7 + Bjorg-Dialog (Name ohne Rückfrage / Gruppe statt Person) | K4 (negativ) |
| `kat_gap_concealed` | Akt 2, L4-Choice + L5-Dialog (Lücke geglättet/verschwiegen) | K4 (negativ) |
| `kat_reminder_live` | Akt 3, L8 ★ (Fristenreport läuft als Cronjob) | Bonus, nur Epilog |

**Verwaisungs-Flags** — die Uhr in Akt 3 liest sie, sie gehören keiner Domäne
an (sie sind der *Zustand*, nicht die Leistung); jedes wird in L7 gesetzt, wenn
die zugehörige Zeile das Level ohne Aufpasser **und** ohne Lückenmarkierung
verlässt: `kat_orphan_sla`, `kat_orphan_license`, `kat_orphan_mailbox`.

### 5.2 Fünf Kataster-Domänen

| Domäne | Bedingung (`FlagCondition`) |
|---|---|
| **K1 Vollständigkeit** | `all: [kat_source_contract, kat_source_license, kat_source_dv, kat_source_law]` |
| **K2 Zurechenbarkeit** | `all: [kat_no_silent_orphan, kat_ownership_confirmed]` |
| **K3 Nachweisfähigkeit** | `all: [kat_stale_owner_found, kat_evidence_linked]` |
| **K4 Ehrlichkeit** | `all: [kat_gap_reported]`, `none: [kat_owner_fabricated, kat_gap_concealed]` |
| **K5 Eskalation** | `all: [kat_gaps_escalated, kat_purchasing_informed]` |

Bewusst gebaut: **K1 ist die einzige rein fleißige Domäne** (vier Quellen
gefunden). K2–K5 verlangen jeweils eine Entscheidung gegen die Bequemlichkeit.

### 5.3 Endings

Priorität, analog AUDIT TRAIL:

1. **„Die grüne Liste"** (`gruene_liste`) — wenn `kat_owner_fabricated` **oder**
   `kat_gap_concealed`. Michael schlägt genau die Zeile auf, die grün ist, und
   fragt nach dem letzten Prüfnachweis. Es gibt keinen.
   Der Kern des Abspanns: **Die Lücke wäre ein Mangel gewesen. Die Angabe ist
   ein Befund.** Konkret benannter Schaden statt Pauschalurteil —
   *Prüfungsschaden* (Michael muss ab jetzt jede Zeile verifizieren, statt
   stichprobenartig zu prüfen: aus zwei Tagen werden fünf),
   *Kollegenschaden* (Bjorg steht in einem Dokument, dem er nie zugestimmt hat,
   und erfährt es vom Auditor),
   *Vertrauensschaden* (Bert hat das Kataster nach oben gegeben; jetzt verteidigt
   er ein Dokument, das er nicht geprüft hat).
   Schlusszeile: „Es war alles grün. Das war das Problem."
2. **„Der halb leere Ordner"** (`ordner`) — sonst, wenn **weniger als 2** der 5
   Domänen erfüllt sind. Das Kataster existiert und beschreibt den Betrieb
   nicht. Michael nimmt es entgegen, bedankt sich, legt es ab. Nichts ändert sich —
   und in drei Wochen geht der nächste Ordner in Rente.
3. **„Der Aufpasser"** (`aufpasser`) — sonst, wenn **mindestens 4 von 5**
   Domänen erfüllt sind, darunter zwingend **K2 und K4**. Michaels Bericht hat
   sechs Befunde. Alle sechs stehen schon im Kataster, mit Datum, eingetragen
   vom Spieler, bevor sie jemand fand.
   Schlusszeile: „Ein Audit, das nichts findet, was Sie nicht schon wussten,
   ist ein gutes Audit."
4. **„Der halb leere Ordner"** (untere Variante) — verbleibende Fälle (2–3
   Domänen): gleicher Ending-Identifier, anderer Epilog. Er benennt die
   erfüllten Domänen als „immerhin" und die Lücken als das, was hängen bleibt.

**Modularer Epilog** (`buildEpilogue`), Ehrlichkeitsregeln:

- **K5/Eskalation:** Der Epilog behauptet nur, dass die Lücken **auf dem Tisch
  der Leitung liegen** — nicht, dass sie geschlossen wurden. Es gibt kein
  `kat_gaps_closed` in V1.
- **K2/Aufpasser:** „bestätigt" heißt bestätigt, nicht „erledigt". Der Epilog
  sagt „vier Pflichten haben einen Namen, der davon weiß" — kein Wort über
  Ausführung.
- **Bonus `kat_reminder_live`:** Nur wenn L8 ★ gespielt wurde, zeigt der Epilog
  den ersten automatischen Fristenreport, der eine Woche später im Postfach
  liegt. Ohne das Flag behauptet keine Szene eine laufende Automatik.

---

## 6. Akte, Kapitel und Level

6 Kapitel über 4 Akte (1 / 3 / 1 / 1), ~22 Beats — dieselbe Größenordnung wie
AUDIT TRAIL, damit `campaignBudget.test.ts` (jede Kampagne erreicht ihr Ende im
Tagesbudget) ohne Sondertuning grün bleibt.

**Level-Regel für die ganze Kampagne — „Lernen UND Tun":**
Jedes Level hat beide Hälften und keine ist Beiwerk.

- **Lernen** = *eine* Pflichtenquelle wird verstanden, mit *einem* neuen
  Werkzeug erschlossen, und ein Merksatz (`mentorNote`) bleibt hängen.
- **Tun** = ein **Artefakt** entsteht, das per `stateGoals` (CLI) oder
  Interaktions-Token (GUI) geprüft wird. Kein Level endet mit „gelesen".

### Akt 1 — Der Ordner (Kapitel `kt_ch01_ordner`)

| Beat | Event | Art |
|---|---|---|
| 1 | `kt_kickoff` | Dialog — Michael stellt die Frage, Bert kann sie nicht beantworten, Bjorg: „Läuft doch alles." |
| 2 | `kt_l1_ordner` | **L1 [CLI Linux]** |
| 3 | `kt_l2_erster_eintrag` | **L2 [GUI Kataster]** |
| 4 | `kt_wer_macht_das` | Dialog — die Lektion in einer Zeile |

**L1 „Der Ordner des Vorgängers"** · CLI Linux · `warm-adm-01`
- **Lernen:** Pflichten stehen nicht an einem Ort, und ein Vertrag ist eine
  Pflichtenquelle. Kalbs Ordner enthält 11 Dateien für einen ganzen Betrieb —
  sichtbar gemacht mit `find … | wc -l`.
- **Tun:** Den Komm.ONE-SLA finden (`grep -i "verfügbarkeit"` über
  `/verwaltung/vertraege/*.txt`), §4 lesen und den Fund in
  `/home/timo/quellen.md` festhalten.
- **Werkzeug:** `ls`, `find`, `wc -l`, `grep -i`, `cat`, `echo >>`
- **`stateGoals`:** `fileRead: /verwaltung/vertraege/komm_one_sla.txt` ·
  `{ file: '/home/timo/quellen.md', matches: 'Komm\.ONE' }` ·
  `{ file: '/home/timo/quellen.md', matches: 'Monatsbericht|Verfügbarkeitsbericht' }`
- **Merksatz:** „Ein Vertrag ist kein Ablageobjekt. Er ist eine Liste von
  Dingen, die jemand regelmäßig tun muss."
- **Setzt:** `kat_source_contract`

**L2 „Der erste Eintrag"** · GUI Kataster · `warm-adm-01`
- **Lernen:** Die vier Felder eines Katastereintrags — Quelle, Pflicht,
  Aufpasser, Nachweis — und warum der Turnus die Frist erzeugt.
- **Tun:** Aus dem Fundstapel (`findings`, mitgebracht aus L1) den SLA-Fund zu
  einer Zeile machen, Turnus „monatlich" setzen. Der Aufpasser bleibt leer —
  und das Grid zeigt zum ersten Mal ⚠ **statt** einer leeren Zelle.
- **Falle mit Lerneffekt:** Der Fundstapel enthält einen **Köder**, der keine
  Pflicht begründet (ein Herstellerflyer „Wir empfehlen quartalsweise
  Reviews"). `add:` darauf löst nicht und gibt `riskFeedback`: eine Empfehlung
  ist keine Pflicht.
- **Tokens:** `add:sla_bericht`, `cycle:sla_bericht:monatlich`
- **Setzt:** `kat_first_entry` (nur Fortschritt, keine Domäne)

### Akt 2 — Die Spuren (Kapitel `kt_ch02_vertraege`, `kt_ch03_papier`, `kt_ch04_register`)

Vier Level, vier Pflichtenquellen, vier verschiedene Werkzeuge.

**L3 „Null von 280"** · CLI Linux · Kapitel `kt_ch02_vertraege`
- **Lernen:** Lizenzverträge erzeugen **Nachweispflichten**, nicht nur Kosten —
  und der Aufpasser einer Pflicht ist nicht automatisch die IT.
- **Tun:** Den Lizenzserver-Export auswerten: 280 CAL beschafft, Belegung
  **0**. Der Rahmenvertrag verlangt einen jährlichen Nachweis der
  Lizenzbelegung (Audit-Klausel). Zwei Pflichten entstehen.
- **Werkzeug:** `awk -F';'`, `grep -c`, `sort -t';' -k3 -n`, `wc -l`
- **`stateGoals`:** `fileRead` auf Export **und** Vertragstext ·
  `{ file: '/home/timo/quellen.md', matches: '280' }`
- **Entscheidung (K5):** Aufpasser = Einkauf (der den Vertrag geschlossen hat)
  und schriftlich informieren → `kat_purchasing_informed`; „mach ich selbst"
  ist bequem und falsch; leer lassen erzeugt `kat_orphan_license`.
- **Merksatz:** „Wer den Vertrag unterschreibt, schuldet den Nachweis. Die IT
  liefert die Zahlen, nicht die Verantwortung."
- **Setzt:** `kat_source_license` (+ ggf. `kat_purchasing_informed`)

**L4 „Acht Monate"** · CLI Linux · Kapitel `kt_ch02_vertraege`
- **Lernen:** **Ein Name im Kataster ist kein Nachweis.** Kalbs alte
  Kataster-Excel (als CSV) nennt für „Wartung/Prüfungen" einen Aufpasser; der
  Ticketexport zeigt in dieser Queue seit **8 Monaten** keine Aktivität.
- **Tun:** Die beiden Quellen gegeneinander halten und den Befund als Datei
  belegen (`/home/timo/nachweise/aufpasser_pruefung.txt`).
- **Werkzeug:** `cut -d';' -f`, `sort -t';' -k4`, `tail`, `stat`, `date`
- **`stateGoals`:** `fileRead` auf beide Quellen · Befunddatei existiert und
  `matches` den Queue-Namen und ein Datum
- **Entscheidung (K4):** Befund stehen lassen → `kat_stale_owner_found`;
  „Zahlen schön lassen, der ist ja eingetragen" → `kat_gap_concealed`
- **Merksatz:** „Ein Kataster, das nur behauptet, ist gefährlicher als keins —
  weil es die Suche beendet."

**L5 „Der Verweis ins Leere"** · CLI Linux · Kapitel `kt_ch03_papier`
- **Lernen:** Ein Verweis auf ein Dokument, das es nicht gibt, ist eine
  Pflichtverletzung **mit Papierform** — und ein Negativbefund muss man
  *belegen*, nicht behaupten.
- **Tun:** In `/verwaltung/dienstvereinbarungen/dv_protokollierung.txt` §7
  finden („…das IT-Notfallhandbuch in seiner jeweils gültigen Fassung…"), dann
  suchen (`find / -iname "*notfall*" 2>/dev/null`) — und **nichts** finden. Die
  Suche selbst wird zum Nachweis: Ausgabe in
  `/home/timo/nachweise/suche_notfallhandbuch.txt` umleiten.
- **Werkzeug:** `grep -n`, `find -iname`, `2>/dev/null`, Ausgabeumleitung
- **`stateGoals`:** `fileRead` auf die DV ·
  `{ file: '…/suche_notfallhandbuch.txt', fileExists: true }` ·
  `{ commandRan: { pattern: 'find\\s+.*-iname', outcome: 'succeeded' } }`
- **Folge-Dialog (K4, die Kernentscheidung der Kampagne):** dem ISB sagen oder
  nicht. Melden → `kat_source_dv` + `kat_gap_reported`; „das klärt sich noch"
  → `kat_source_dv` + `kat_gap_concealed`. Kaschieren kostet in Akt 3 (Dr.
  Müller) **und** in Akt 4 (Q2) — der Pitch-Wunsch „kostet später doppelt",
  wörtlich umgesetzt.
- **Merksatz:** „‚Wir haben nichts gefunden' ist keine Aussage.
  ‚Wir haben am 14.09. hier und hier gesucht' ist eine."

**L6 „Die Erinnerung, die niemand liest"** · CLI Linux · Kapitel `kt_ch03_papier`
- **Lernen:** **Sammelpostfächer sind verwaiste Pflichten in Reinform.** Das
  aufsichtsrechtliche Anschreiben ist die vierte Quellenart — Gesetz/Aufsicht.
- **Tun (zwei Stufen):**
  1. Den Mailexport des Sammelpostfachs `info@` durchsuchen
     (`grep -ril bsi /srv/mailexport/info/`) und das seit **11 Wochen**
     ungelesene Anschreiben finden: Hinweis auf die **Neufassung des BSIG**
     und die Nachweispflicht nach **§ 39**.
  2. **Die Frist ausrechnen, nicht abschreiben** (§7.4): Das Datum des letzten
     erbrachten Nachweises steht in Kalbs Ablage. Nach **§ 39 BSIG** ist der
     nächste **drei Jahre** danach fällig. Ergebnis **mit Fundstelle** in die
     Quellenliste.
- **Werkzeug:** `grep -ril`, `grep -A`, `head`, `date -d '<datum> +3 years'`,
  `echo >>`
- **`stateGoals`:** `fileRead` auf die gefundene Mail · `fileRead` auf Kalbs
  Nachweisablage · `{ file: '/home/timo/quellen.md', matches: '<errechnetes Datum>' }`
  · `{ file: '/home/timo/quellen.md', matches: '39' }` — **eine Zahl ohne
  Herleitung zählt nicht.**
- **Zweiter Fund:** Das Postfach selbst wird ein Katastereintrag
  („info@ arbeitstäglich sichten — Aufpasser: ?"). Ohne Aufpasser in L7 →
  `kat_orphan_mailbox`.
- **Merksätze:** „Ein Postfach, das allen gehört, liest niemand. Eine Frist, die
  dort ankommt, läuft trotzdem." — und: „Eine Frist ist kein Datum, sondern ein
  Datum plus die Regel, aus der es folgt."
- **Setzt:** `kat_source_law`

**L7 „Das Kataster"** · GUI Kataster · Kapitel `kt_ch04_register` — **Herzstück**
- **Lernen:** Aufpasser sind **Personen, keine Gruppen**; eine Zuweisung ohne
  Rückmeldung ist eine Behauptung; und eine ehrlich markierte Lücke ist mehr
  wert als eine grüne Zeile.
- **Tun:** Alle Funde aus Akt 2 eintragen, Aufpasser zuweisen, Turnus setzen,
  echte Belege aus dem Belegstapel zuordnen, und **jede** Zeile, für die es
  keinen echten Aufpasser gibt, als Lücke markieren (`gap:`).
- **Die Falle:** Die Personenliste enthält `it_abteilung` (Gruppe statt Person)
  und Kollegen mit `unconfirmed: true`. Die App **warnt nicht** und zeigt die
  Zeile grün. Nur Jens' Satz im vorangehenden Dialog ist die Vorwarnung.
  Eine Lösung mit einer solchen Zuweisung löst das Level trotzdem — und setzt
  `kat_owner_fabricated`. (Reihenfolge in `solutions`: **Risiko vor Lob**, die
  Fabrication-Lösung steht zuerst, damit sie bei gemischtem Spiel gewinnt.)
- **Tokens:** `select:<id>`, `owner:<id>:<person>`, `cycle:<id>:<turnus>`,
  `evidence:<id>:<belegId>`, `gap:<id>`, `escalate:<id>`, `clearowner:<id>`
- **Setzt:** `kat_no_silent_orphan`, `kat_evidence_linked`, ggf.
  `kat_owner_fabricated` und die `kat_orphan_*`-Zustände

### Akt 3 — Die Uhr (Kapitel `kt_ch05_uhr`)

Hier schlagen die verwaisten Pflichten zu. Jeder Payoff ist ein Beat mit
`branchCondition` + `alternateEventId` — **garantiert**, nicht wahrscheinlich.
Der Spieler erfährt es, wie im Pitch gefordert, **durch die Konsequenz**.

| Beat | verwaist (`branchCondition`) | besetzt (`alternateEventId`) |
|---|---|---|
| `kt_mahnung` | `kat_orphan_sla`: Mahnschreiben. Die Verfügbarkeit lag drei Monate unter 99,5 %; die vertragliche Frist zur Geltendmachung der Minderung (30 Tage nach Berichtserhalt) ist verstrichen. **Budget −.** | Jens legt den geprüften Bericht vor, die Minderung wird geltend gemacht. **Budget +.** |
| `kt_rechnung` | `kat_orphan_license`: Wartungsrechnung über 280 CAL für ein Jahr mit Belegung 0. **Budget −.** | Der Einkauf hat fristgerecht auf 40 reduziert. **Budget +.** |
| `kt_vorstandsfrage` | `kat_gap_concealed`: Dr. Müller in der Runde — „Herr Michael sagt, wir hätten ein Notfallhandbuch. Zeigen Sie es mir." | `kat_gap_reported`: „Michael sagt, uns fehlt eins. Sie wussten das?" — „Ja, seit dem 14. Es steht im Kataster." **Budget + / Beziehung gf +.** |
| `kt_bjorg_vier` | Bjorg beansprucht vier Einträge: „Mach ich alles." Entscheidung: eintragen wie gesagt (`kat_owner_fabricated`) · schriftlich bestätigen lassen (`kat_ownership_confirmed`) · auf 🟨 lassen (neutral, ehrlich) | — |
| `kt_eskalation` | Mail-Compose an Bert (CC GF): die offenen Lücken mit Datum → `kat_gaps_escalated`. Varianten: allein tragen · mündlich erwähnen · schriftlich mit Datum | — |
| `kt_l8_fristen` ★ | **L8 [CLI Linux], optional** | — |

**L8 ★ „Fristen ins System"** · CLI Linux · optional, gated nichts
- **Lernen:** **Fristen gehören nicht in Köpfe, sondern in Systeme.** Ein
  Kataster ohne Wecker ist eine Datei, die man einmal im Jahr traurig anschaut.
- **Tun:** Aus dem exportierten Kataster-CSV ein kleines Report-Skript bauen
  (`awk` über das Datumsfeld: „was wird in 30 Tagen fällig"), ausführbar machen
  und als Cronjob einhängen; die Ausgabe geht an ein **benanntes** Postfach,
  nicht an `info@`.
- **Werkzeug:** `awk -F';'`, `date -d`, `chmod +x`, `crontab -e`/`-l`, `logger`
- **`stateGoals`:** Skript existiert und `matches` das Datumsfeld ·
  Crontab-Eintrag vorhanden · `{ commandRan: { pattern: 'chmod\\s+\\+x' } }`
- **Setzt:** `kat_reminder_live` (Bonus-Payoff im Epilog)

### Akt 4 — Der Audit-Tag (Kapitel `kt_ch06_audit`)

Reine authored Sequenz, kein neues Level: die fünf Fragen aus §4.1 als Beats,
`branchCondition` = die jeweilige Domänen-Bedingung aus §5.2. Danach
Domänen-Auswertung → Ending (§5.3) + modularer Epilog. Belastende Flags
erzeugen eigene Konfrontationsszenen (Q2 bei `kat_gap_concealed`, Q3 bei
`kat_owner_fabricated`).

---

## 7. Technische Bausteine

### 7.1 Neue GUI-App `kataster`

Das einzige nennenswerte neue Stück Engine. Aufbau spiegelt `corefirewall`
(Precedent: State-Typ in `shared/src/types/gui.ts`, Komponente unter
`components/WindowsLevel/apps/`, Dispatch in `WindowsLevel/index.tsx`,
Browser-Test daneben).

```ts
export type KatasterCycle =
  | 'monatlich' | 'quartalsweise' | 'halbjaehrlich'
  | 'jaehrlich' | 'zweijaehrlich' | 'anlassbezogen';

/** Eine Person, der eine Pflicht zugewiesen werden kann. */
export interface KatasterPerson {
  /** Stabiler Key für Tokens ('owner:<entry>:<id>'). */
  id: string;
  name: string;
  role: string;
  /** Gruppe statt Person ('IT-Abteilung') — die klassische Falle.
   *  Die App rendert sie NORMAL; erst die Level-Solution wertet sie. */
  isGroup?: boolean;
  /** Zuweisbar, hat aber nie zugesagt. Zweite Spielart derselben Falle. */
  unconfirmed?: boolean;
}

/** Ein Fund aus einem CLI-Level, der zu einer Zeile werden kann. */
export interface KatasterFinding {
  id: string;
  source: string;        // 'SLA Komm.ONE §4'
  duty: string;          // 'Monatlichen Verfügbarkeitsbericht prüfen'
  excerpt: string;       // der Originalsatz aus dem Dokument
  /** Begründet KEINE Pflicht (Empfehlung, Werbung) — 'add:' scheitert. */
  decoy?: boolean;
  /** Gezeigt, wenn der Spieler einen Köder eintragen will. */
  riskFeedback?: string;
}

/** Ein hinterlegbarer Nachweis (Bericht, Protokoll, Bestätigung). */
export interface KatasterEvidence {
  id: string;
  label: string;         // 'Verfügbarkeitsbericht 07/2026'
  date: string;          // '05.08.2026'
  /** Passt fachlich zu diesem Eintrag; alles andere ist ein Fehlbeleg. */
  forEntry?: string;
}

export interface KatasterEntry {
  id: string;
  source: string;
  duty: string;
  /** Originaltext der Quelle — im Quellen-Panel, wenn die Zeile gewählt ist. */
  sourceExcerpt?: string;
  cycle?: KatasterCycle;
  owner?: string;          // KatasterPerson.id; leer = verwaist
  evidenceId?: string;     // KatasterEvidence.id
  /** Als offene Lücke markiert ('gap:<id>') — der EHRLICHE Zustand. */
  gap?: boolean;
  /** Zur Eskalation vorgemerkt ('escalate:<id>'). */
  escalated?: boolean;
  /** Nicht editierbar, nur Kontext. */
  locked?: boolean;
  /** Hinweistext an der Zeile (z. B. "Vertrag vom Einkauf geschlossen"). */
  note?: string;
}

export interface KatasterState {
  title: string;                  // 'Pflichtenkataster WARM — Stand 09/2026'
  entries: KatasterEntry[];
  people: KatasterPerson[];
  findings?: KatasterFinding[];
  evidence?: KatasterEvidence[];
}
```

**Interaktions-Token-Vokabular** (fügt sich in das bestehende
`emit`/`findMetGuiSolution`-Modell ein, keine Hook-Änderung nötig):

| Token | Bedeutung |
|---|---|
| `select:<entryId>` | Zeile markieren (öffnet `sourceExcerpt`) |
| `add:<findingId>` | Fund zu einer Zeile machen |
| `owner:<entryId>:<personId>` | Aufpasser setzen |
| `clearowner:<entryId>` | Aufpasser entfernen |
| `cycle:<entryId>:<KatasterCycle>` | Turnus setzen |
| `evidence:<entryId>:<evidenceId>` | Nachweis zuordnen |
| `gap:<entryId>` | als offene Lücke markieren |
| `escalate:<entryId>` | zur Eskalation vormerken |

**Rendering-Regeln** (die Lehre steckt in der Darstellung):

- Zeilenampel wird **abgeleitet**, nie geseedet:
  `gap` → 🟨 LÜCKE · kein `owner` → 🟥 VERWAIST ·
  `owner` ohne `evidenceId`/`cycle` → 🟨 BEHAUPTET · vollständig → 🟩 BELEGT.
- **Wichtig:** `isGroup`/`unconfirmed` verändern die Ampel **nicht**. Eine
  erfundene Zuweisung sieht exakt wie eine echte aus — das ist der ganze Punkt.
- Kopfzeile zählt sichtbar mit: „14 Pflichten · 5 ohne Aufpasser · 3 ohne
  Nachweis". Der Zähler ist der Spannungsbogen des Grids.
- Keyboard-first (Projektkonvention): ↑/↓ Zeilen, ←/→ Spalten, Enter öffnet den
  Auswahl-Popover der aktiven Spalte, Escape schließt. Fokusfalle wie in den
  bestehenden Apps.

### 7.2 Was NICHT gebaut werden muss

Die Kampagne kommt mit **einer** neuen App aus. Alles Weitere existiert:

- `FlagCondition` (`all`/`any`/`none`) + `checkFlagCondition` — seit AUDIT TRAIL
- `AdventureChapter.act: 1|2|3|4` — reicht für 4 Akte
- `CampaignDefinition` mit `deriveEnding`/`buildEpilogue`/`menu`/
  `startingRelationships` — vollständig
- `getCampaign`/`listCampaigns`/`CAMPAIGN_ORDER` — Registry ist da
- `mailCompose` für die Eskalations-Mail — seit AUDIT TRAIL
- `GuiSolution.setsFlags` — trägt die Fabrication-Falle
- `stateGoals` (`fileRead`, `commandRan`, `matches`, `fileExists`) und
  `crontab`/`awk`/`sort -t -k` in der Shell — alles vorhanden

**Bewusst nicht gebaut:** kein `kataster`-Shell-Kommando, kein laufzeit-
persistentes Register (§7.3), kein RNG im Audit (§4.2), keine Chain-Engine-
Nutzung (§2.6), keine Sidequests, keine Chapter-Art, kein
Deeskalations-/Ton-Thema (§2.9), kein `kat_gaps_closed`.

### 7.3 Warum das Kataster nicht laufzeitpersistent ist

Ein echtes, über Level hinweg mitgeführtes Register bräuchte einen neuen
Zustandsbereich in `GameState` (Serialisierung, Autosave-Migration,
Save-Slot-Kompatibilität, Never-throw-Garantie der Autosave-Schicht) — für
einen Nutzen, den zwei Kataster-Level nicht rechtfertigen.

Stattdessen: **Seed pro Level, Entscheidung als Flag.** L7 wird mit dem Stand
geseedet, den die Geschichte nach Akt 2 hat; ob der Spieler in L3 den Einkauf
informiert hat, entscheidet über die *Variante* des L7-Events
(`branchCondition`/`alternateEventId` auf dem Beat — dieselbe Mechanik, mit der
AUDIT TRAIL die Schnittstellen-Mail variiert).

**Was das kostet, ehrlich benannt:** Der Spieler kann sein Kataster zwischen den
Leveln nicht aufschlagen. Mitigation: die Kopfzeile des Grids und die
Akt-Interstitials nennen den Stand in Worten („14 Pflichten, 5 ohne
Aufpasser") — der Zustand ist damit erzählt, wenn auch nicht begehbar.
Ein begehbares Register ist ein sauberer V2-Kandidat, kein V1-Blocker.

### 7.4 Geprüfte Rechtsgrundlagen (Stand 09.09.2026)

Die Kampagne behauptet Rechtliches, also ist es nachgeschlagen statt erinnert.
**Ergebnis: beide tragenden Annahmen halten — und eine davon liefert einen
besseren Level, als das Design vorher hatte.**

**(a) Siedlungsabfallentsorgung ist ein KRITIS-Sektor.** Geregelt in
**§ 10 BSI-KritisV**; der Schwellenwert orientiert sich an der Entsorgung für
**500.000 Einwohner** (z. B. Sammlung/Transport: mehr als 500.000 angeschlossene
Einwohner; Sortieranlagen LVP ab 18.500 t/a; biologische Behandlung ab
33.500 t/a). WARM als Zweckverband der Region Rhein-Main liegt plausibel darüber
— **ein KRITIS-Betreiber mit dreieinhalb IT-Stellen ist genau der reale Fall,
den die Kampagne erzählt.** Der Schwellenwert selbst wird im Spieltext nicht
zitiert; er begründet nur, dass WARM betroffen ist.

**(b) Die Nachweispflicht ist neu — und das ist der Level.** Das
NIS2-Umsetzungsgesetz hat das BSIG **zum 6. Dezember 2025** neu gefasst.
Damit gilt:

| | alt | neu |
|---|---|---|
| Fundstelle | § 8a Abs. 3 BSIG | **§ 39 BSIG** |
| Turnus | alle **zwei** Jahre | alle **drei** Jahre |
| Adressat | BSI | das Bundesamt |
| Form | Sicherheitsaudits, Prüfungen, Zertifizierungen | dieselben — **einschließlich Angabe der dabei aufgedeckten Sicherheitsmängel** |

Die Tabelle ist **Autoren-Kontext, kein Spielinhalt**: die alte Spalte steht
hier nur, damit niemand versehentlich wieder § 8a schreibt. § 39 Abs. 3 regelt
zwar einen Übergang für Altbetreiber — der wird aber **bewusst nicht gespielt**
(siehe „Neues Recht only" unten).

**Konsequenz für L6 — der Level wird besser.** Statt „hier liegt eine Mahnung"
ist der Fund eine **echte Rechenaufgabe mit genau der Sorte Antwort, die in ein
Kataster gehört**. Kalbs Ablage enthält das Datum des letzten erbrachten
Nachweises; das Anschreiben im Sammelpostfach nennt die Pflicht nach § 39. Die
Frage, die Bert nicht beantworten kann und der Spieler beantworten muss:

> **Wann ist der nächste Nachweis fällig — und wonach rechnen wir?**

Antwort: letzter Nachweis **+ drei Jahre**, § 39 Abs. 1 BSIG. Als CLI-Arbeit
sauber spielbar (Datum lesen, `date -d '<datum> +3 years'`, Ergebnis **mit
Fundstelle** in die Quellenliste) und die Lehre der ganzen Kampagne im Kleinen:
**eine Frist ist kein Datum, sondern ein Datum plus die Regel, aus der es
folgt.** Ergänzendes `stateGoal`: die Quellenliste muss das errechnete Datum
**und** `§ 39` enthalten — eine Zahl ohne Herleitung zählt nicht.

**Neues Recht only.** Die Übergangsregel aus § 39 Abs. 3 (Anrechnung des letzten
§-8a-Nachweises) wird **nicht** gespielt: die Kampagne zitiert ausschließlich die
geltende Fassung. Kalbs Altbestand ist im Spieltext schlicht „der letzte
Nachweis", ohne Fundstelle — das Rechnen bleibt, die Rechtsgeschichte entfällt.

Zusätzlich fällt der Satz „einschließlich der aufgedeckten Sicherheitsmängel"
direkt in die Botschaft der Kampagne: der Nachweis verlangt ausdrücklich die
**Mängel**, nicht die grüne Liste. Das gehört in Michaels Kick-off-Rede in
Akt 1 und in den Abspann von „Die grüne Liste".

**Fundstellen-Hygiene:** Im gesamten Kampagnentext wird ausschließlich die
geltende Fassung zitiert — **§ 39** (Nachweise), **§ 32** (Meldepflichten,
24 h / 72 h / 1 Monat), **§§ 30/31** (Risikomanagement). § 8a und § 8b kommen
nicht vor, auch nicht historisch.

> **Bestandscontent: erledigt am 09.09.2026.** Die Altzitate in
> `content/adventure/story-events.ts`, `packs/kritis-infra/scenarios.ts` und
> `events/week5-8.ts` wurden auf die geltende Fassung umgestellt
> (§ 8b → § 32, § 8a → § 39). Ein `grep` auf `§ 8a`/`§ 8b` über
> `client/src/content` ist seitdem leer — das ist der Guard.

**Weiterhin reine Vertragsfiktion** (keine Prüfung nötig, aber der Text darf sie
nicht als allgemeine Rechtslage ausgeben): die SLA-Minderung samt
30-Tage-Geltendmachungsfrist und die Lizenz-Audit-Klausel. Beides ist *WARMs*
Vertrag im Spiel. Und weiterhin gilt: **keine erfundenen Aktenzeichen mit
Behörden-Anmutung** — Aktenzeichen im Spiel sind WARM-interne Vorgangsnummern.


---

## 8. Tests und Guards

**Automatisch ererbt** (greifen, sobald die Kampagne registriert ist):

- `campaignBudget.test.ts` — iteriert alle Kampagnen: erreicht ihr Ende im
  Tagesbudget, bei jeder Strategie.
- `campaignInitialState.test.ts` — Muster für „frischer Zustand, keine
  Fremd-Flags"; um `kataster` erweitern.
- `content/orthography.test.ts` — keine ASCII-Umlaut-Transliteration im
  Anzeigetext (`ae/oe/ue`). Achtung bei `halbjaehrlich`/`zweijaehrlich`: das
  sind **IDs**, gehören in die ID-Zeile und dürfen nicht als Label gerendert
  werden — Labels heißen „halbjährlich"/„zweijährlich".
- Choice-Design: jeder Beat mit ≥ 2 ungated Optionen; jede Choice mit
  Konsequenztext.
- Hint-Eskalation: `hints[0]` orientiert (nie das Kommando), exakte Syntax
  zuletzt.

**Neu zu schreiben:**

1. `campaigns/kataster/campaignConsistency.test.ts` — nach dem AUDIT-TRAIL-
   Vorbild: jedes in einer `FlagCondition` referenzierte Flag wird irgendwo
   gesetzt; jedes §5.1-Flag wird von einer Domäne gelesen (außer
   `kat_reminder_live`, dokumentiert epilog-only); alle Beat-`eventId`s und
   `alternateEventId`s lösen kampagnenintern auf; Event-Ids `kt_*` unique;
   Flags `kat_*` und **disjunkt zu Probezeit UND AUDIT TRAIL** (beide
   Richtungen); keine `chainTriggers`.
2. `domains.test.ts` — tabellengetriebene Ending-Ableitung inkl. Grenzfälle:
   „Grüne Liste" schlägt alles; < 2 Domänen → `ordner`; ≥ 4 Domänen **ohne**
   K2 oder K4 → **nicht** `aufpasser`; 2–3 Domänen → `ordner` mit unterer
   Epilog-Variante.
3. `endings.test.ts` — `buildEpilogue` behauptet nichts ohne Flag: für jede
   Domäne ein Fall „Flag fehlt → Satz fehlt"; `kat_reminder_live` ist die
   einzige Quelle des Automatik-Satzes.
4. `Kataster.browser.test.tsx` — Ampel-Ableitung (alle vier Zustände);
   **`isGroup`/`unconfirmed` verändern die Ampel nicht** (Regressionsschutz für
   die Falle); Zähler in der Kopfzeile; Token-Emission pro Interaktion;
   Keyboard-Navigation und Fokusfalle; `locked` blockt Eingaben.
5. `guiSolution`-Fall: die Fabrication-Lösung steht **vor** der ehrlichen und
   gewinnt bei gemischtem Spiel (Risiko vor Lob).
6. `katasterLevels.test.ts` (engine) — analog `evidenceFirstLesson.test.ts`:
   pro CLI-Level ein Test, der die Sollpfade durch die echte Shell fährt und
   die `stateGoals` als erfüllt nachweist; dazu je ein Negativtest
   (Artefakt ohne Lesen der Quelle löst **nicht**).
7. `campaignMenu.test.ts` erweitern — sichtbar/versteckt, Menütexte vorhanden.

---

## 9. Entscheidungen und Restpunkte

**Entschieden (09.09.2026):**

1. **Sichtbar im Kampagnen-Picker** — kein `hidden`, kein `unlockCode`.
   DAS KATASTER ist die zugänglichste der drei Kampagnen; ein zweites Geheimnis
   hätte `trick17` entwertet. **Die Registrierung erfolgt erst mit dem Content**
   (`campaignBudget.test.ts` verlangt von jeder registrierten Kampagne ein
   erreichbares Ende) — bis dahin ist die Kampagne für Spieler nicht vorhanden.
2. **Der ISB heißt Jakob Michael** — externer ISB, im Dialog „Herr Michael".
3. **Faktencheck erledigt** (§7.4): § 10 BSI-KritisV und § 39 BSIG bestätigt.
   L6 rechnet die Frist (letzter Nachweis + 3 Jahre nach § 39).
4. **Neues Recht only** — die Kampagne **und der Bestandscontent** zitieren
   ausschließlich die geltende BSIG-Fassung. § 8a/§ 8b kommen nirgends mehr vor.

**Offen:**

5. **Startwerte:** Vorschlag `startingRelationships: { chef: 5, kollegen: 5 }`
   — Bert ist wohlwollend, das Team neutral; die Kampagne lebt nicht von
   Misstrauen. Wird in Task 6 gesetzt und ist dort billig zu ändern.
6. **L8 ★ Umfang:** Cronjob + Awk-Report ist ein vollwertiges Level. Falls
   gekürzt werden muss, ist L8 der erste Streichkandidat — es gated nichts und
   wertet nur den Epilog auf.
