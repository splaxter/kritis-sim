# Lernpfad: NIS-2-Track + Grundlagen-Skip — Design

**Status:** Entwurf, zur Abnahme
**Datum:** 2026-09-12
**Umsetzungsplan:** `docs/plans/2026-09-12-nis2-lernpfad.md`

---

## 1. Der Befund

Zwei Lücken, vom Auftraggeber benannt:

> „NIS-2/KRITIS-Spezifika fehlen noch. Die Tracks sind stark technisch, aber die
> Themen, die KRITIS-Admins von normalen Admins unterscheiden — Meldepflicht und
> 24h-Frist, Zurechenbarkeit und Shared Accounts, Nachweisführung, Dokumentation
> als Kontrolle — kommen im Lernpfad nicht vor. Da liegt ein ganzer Track brach,
> und es wäre der, der den Namen des Spiels rechtfertigt."

> „Wer seit zehn Jahren grep benutzt, will nicht erst ‚Der Grep-Jäger'
> durchspielen, um an die Blackout-Kampagne zu kommen. Ein Skip-Test oder ein
> ‚Ich kenne das'-Shortcut für Track 1 wäre überlegenswert."

**Nachgeprüft, beides trifft zu.**

Das Wort „meldepflichtig" kommt im gesamten Lernpfad **dreimal** vor — jedes Mal
als Adjektiv (`blackout.ts:135`, `gui-levels.ts:99`, `gui-levels.ts:387`), das
einen Fund einordnet. Die Pflicht selbst wird nirgends gelehrt: keine Frist, kein
Adressat, kein Meldungsinhalt, keine Schwelle. `grep -c "§ 32\|BSIG\|24 Stunden"`
über `learning-path*.ts` ergibt **0**.

Der Grundlagen-Riegel sitzt in `isFoundationsComplete` (`engine/learningPath.ts:22`):
alle vier Kern-Level müssen in `completedEvents` stehen, sonst liefert
`getTrackState` für **jeden** anderen Track `'locked'` (Zeile 33). Es gibt heute
keinen Weg daran vorbei.

---

## 2. Abgenommene Entscheidungen

| Frage | Entscheidung | Konsequenz |
|---|---|---|
| Grundlagen überspringen | **Skip-Test: einmal beweisen** | Kein Selbstauskunfts-Knopf. Wer durchwill, zeigt es. |
| Meldung spielen | **Neue GUI-App „Meldung"** | Zweite eigene App nach `kataster`; echtes Formular, keine Erzählung. |
| Themen | **alle vier** | Meldepflicht/Fristen, Zurechenbarkeit, Dokumentation, § 39 Nachweis. |

Der Skip-Test statt des Knopfes ist die inhaltlich stimmige Wahl: das Spiel
verlangt in DAS KATASTER, dass eine Zuweisung erst durch den Nachweis
verbindlich wird. Ein „Ich kenne das"-Knopf würde genau dieser These
widersprechen — und wer sich überschätzt, stünde in Blackout ohne Werkzeug da.

---

## 3. Geprüfte Rechtsgrundlage

Recherchiert am 12.09.2026, nicht aus dem Gedächtnis. **Nur geltendes Recht**
(BSIG i.d.F. des NIS2UmsuCG, in Kraft seit 06.12.2025).

### § 2 BSIG — „erheblicher Sicherheitsvorfall"

Ein Sicherheitsvorfall, der

- **a)** schwerwiegende Betriebsstörungen oder finanzielle Verluste für die
  Einrichtung verursacht **oder verursachen kann**, oder
- **b)** andere natürliche oder juristische Personen durch erhebliche materielle
  oder immaterielle Schäden schädigt **oder schädigen kann**

(vorbehaltlich einer Konkretisierung durch Rechtsverordnung nach § 56 Abs. 5).

> **Der entscheidende Halbsatz ist „kann".** Die Schwelle ist das *Potenzial*,
> nicht der eingetretene Schaden. Wer wartet, bis er den Schaden belegen kann,
> hat die Frist längst verpasst. Das ist die Lektion von L1.

### § 32 BSIG — Meldepflichten

Adressat ist eine **gemeinsame Meldestelle des BSI und des Bundesamts für
Bevölkerungsschutz** (Abs. 1) — nicht „das BSI" allein. Häufiger Irrtum.

| Stufe | Frist | Inhalt |
|---|---|---|
| **Erstmeldung** | unverzüglich, **spätestens 24 h** nach Kenntnis | Verdacht auf rechtswidrige/böswillige Handlung? Grenzüberschreitende Auswirkungen? |
| **Folgemeldung** | **innerhalb 72 h** nach Kenntnis | Bestätigung/Aktualisierung der Erstmeldung; erste Bewertung mit Schweregrad, Auswirkungen, ggf. Kompromittierungsindikatoren |
| **Zwischenmeldung** | auf Ersuchen des Bundesamts | relevante Statusaktualisierungen |
| **Abschlussmeldung** | **spätestens 1 Monat** nach der 72-h-Meldung | ausführliche Beschreibung, Bedrohungsart/Ursache, Abhilfemaßnahmen, grenzüberschreitende Auswirkungen |

**Abs. 2:** Dauert der Vorfall noch an, tritt an die Stelle der Abschlussmeldung
eine **Fortschrittsmeldung**.
**Abs. 3:** Bei kritischen Anlagen zusätzlich: betroffene Anlage, betroffene
kritische Dienstleistung, Art der Beeinträchtigung.

> **„unverzüglich, spätestens jedoch innerhalb von 24 Stunden."** 24 h ist eine
> Obergrenze, kein Terminvorschlag. Das ist die Lektion von L2.

### Weitere Normen

- **§§ 30, 31 BSIG** — Risikomanagement; Dokumentation ist dort eine *Maßnahme*,
  keine Fleißaufgabe (L5).
- **§ 39 BSIG** — Nachweise gegenüber dem Bundesamt alle **drei Jahre**, durch
  Audits/Prüfungen/Zertifizierungen, **einschließlich der dabei aufgedeckten
  Sicherheitsmängel** (L5).
- **§ 10 BSI-KritisV** — Siedlungsabfallentsorgung ist KRITIS-Sektor; WARM fällt
  darunter. Begründet, warum das Haus überhaupt meldepflichtig ist.

**Quellen:** [§ 32 BSIG](https://www.gesetze-im-internet.de/bsig_2025/__32.html) ·
[§ 2 BSIG](https://www.gesetze-im-internet.de/bsig_2025/__2.html) ·
[BSI: NIS-2-Meldepflicht](https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/NIS-2-Infopakete/NIS-2-Meldepflicht/NIS-2-Meldepflicht_node.html)

---

## 4. Teil A — Der Grundlagen-Skip

### 4.1 Mechanik

Ein eigenständiges Level `learn_00_einstufung`, **kein** Track-Level (sonst
müsste es selbst abgeschlossen werden, um die Grundlagen zu erfüllen).

Sichtbar im LearningHub als Zweitaktion, solange die Grundlagen offen sind:

```
[ Nächste empfohlene Lektion ]                              [Enter]
  Grundlagen 1: Das Erwachen

  Kennst du das schon? [T] Einstufungstest — ein Level, alle Grundlagen.
```

Bestanden → Flag `learn_foundations_proven`. `isFoundationsComplete` liefert
zusätzlich `true`, wenn dieses Flag gesetzt ist:

```ts
export function isFoundationsComplete(state, tracks = LEARNING_TRACKS): boolean {
  if (state.flags?.learn_foundations_proven) return true;   // Test bestanden
  const f = tracks.find((t) => t.isFoundations);
  return !!f && coreLevels(f).every((l) => isDone(state, l.eventId));
}
```

**Bewusst NICHT** die vier Level als `completedEvents` eintragen: das wäre eine
Behauptung über etwas, das nicht stattgefunden hat — dieselbe Sorte Lüge, die
das Kataster bestraft. Die Grundlagen bleiben sichtbar spielbar und werden im
Hub als **„übersprungen — Test bestanden"** ausgewiesen.

### 4.2 Der Test

Ein CLI-Level, das die vier Grundlagen-Fertigkeiten in **einer** Aufgabe
verlangt. Kein Tutorial, keine Hinweise auf Stufe 1 — wer sie braucht, gehört in
den regulären Pfad.

**Aufgabe:** In `/srv/export` liegen Ausleitungen mehrerer Systeme. Finde heraus,
in welcher Datei der Benutzer `svc-backup` zuletzt auftaucht, und schreibe
Dateiname und Zeilennummer nach `/home/timo/befund.txt`.

Verlangt: navigieren (`cd`/`ls`), versteckte Dateien sehen (`ls -a`), rekursiv
suchen (`grep -rn`), Ergebnis umleiten (`>`). Das ist Track 1 in einem Zug.

`stateGoals`: `fileRead` auf die Trefferdatei, `commandRan` auf `^\s*grep\b.*-r`
(verankert — siehe die Falle aus dem Kataster-Bau), `matches` auf Dateiname
**und** Zeilennummer in `befund.txt`.

**Ein Versuch, kein Scheitern.** Wer es nicht löst, landet ohne Strafe im
regulären Pfad — der Test ist eine Abkürzung, kein Tor.

---

## 5. Teil B — Der Track „Pflicht & Nachweis"

```
id: 'nis2_duty'   title: 'Pflicht & Nachweis'   icon: '⚖️'   order: 6
```

Einsortiert direkt hinter Incident Response: erst erkennen und eindämmen, dann
melden und belegen. Die nachfolgenden Tracks rücken um eins.

| # | Level | Art | Lernen | Tun |
|---|---|---|---|---|
| L1 | `learn_nis2_01_schwelle` | CLI | § 2: „kann verursachen" genügt | Drei Vorfälle aus Logs bewerten, Einstufung begründet schreiben |
| L2 | `learn_nis2_02_erstmeldung` | **GUI „Meldung"** | § 32 Abs. 1: 24 h ist eine Obergrenze | Erstmeldung ausfüllen — mit „unbekannt", wo es unbekannt ist |
| L3 | `learn_nis2_03_folgemeldung` | **GUI „Meldung"** | 72 h: Bewertung, Schweregrad, IoCs | Folgemeldung, ohne der eigenen Erstmeldung zu widersprechen |
| L4 | `learn_nis2_04_wer_war_das` | CLI | Zurechenbarkeit: Shared Accounts | Anmeldespur verfolgen — und belegen, dass sie **nicht** auflösbar ist |
| L5 ★ | `learn_nis2_05_belastbar` | CLI | §§ 30/31 Doku als Maßnahme, § 39 Nachweis | Eine Doku prüfen: was hält im Audit, was ist Behauptung |

4 Kern-Level + 1 optionales. Entspricht dem Zuschnitt der anderen Tracks.

### 5.1 Die These des Tracks

> **Die Erstmeldung ist absichtlich niedrigschwellig. Wer sie vollständig
> aussehen lässt, lügt.**

Das ist die direkte Fortsetzung der No-Fabrication-Regel aus DAS KATASTER, nur
eine Ebene weiter: dort war die Lüge ein erfundener Aufpasser, hier ist sie ein
ausgefülltes Feld, dessen Antwort man noch nicht kennt.

Konkret: das Feld „Verdacht auf rechtswidrige oder böswillige Handlung" hat drei
Werte — **ja / nein / noch unbekannt**. Nach vier Stunden ist „noch unbekannt"
fast immer die **richtige** Antwort. Wer „nein" wählt, um das Formular sauber
aussehen zu lassen, macht eine Aussage, die er nicht belegen kann — und
widerspricht sich in L3, wenn die Folgemeldung das Gegenteil zeigt.

### 5.2 L2 im Detail — der Kern

**Lage:** Freitag 17:40. Ein Verschlüsselungstrojaner auf einem Dateiserver der
Disposition. Bekannt sind: der Zeitpunkt der Kenntnisnahme, der betroffene
Server, dass Dateien nicht mehr lesbar sind. Unbekannt sind: Eintrittsweg,
Umfang, ob Daten abgeflossen sind, ob andere Standorte betroffen sind.

**Formularfelder** (Abs. 1 und Abs. 3):

| Feld | Werte | Richtig ist … |
|---|---|---|
| Zeitpunkt der Kenntnisnahme | Datum/Uhrzeit | der Moment, in dem *ihr* es wusstet — nicht der Beginn des Vorfalls |
| Art des Vorfalls | Auswahl | Verschlüsselung/Ransomware |
| Betroffene Dienste und Systeme | Mehrfachauswahl | nur das Belegte |
| Verdacht rechtswidrig/böswillig | ja / nein / unbekannt | **ja** (Verschlüsselung ist kein Betriebsunfall) |
| Grenzüberschreitende Auswirkungen | ja / nein / unbekannt | **unbekannt** |
| Betroffene kritische Dienstleistung | Auswahl | Abfallentsorgung — Disposition |
| Erstbewertung | Freitext | kurz, ohne Ursachenbehauptung |

**Die Uhr ist erzählt, nicht echt.** Kein laufender Timer: das bestraft
langsames Lesen und nicht falsches Denken. Stattdessen steht im Kopf des
Formulars „Kenntnis seit 03:14 h" als Teil der Lage. Wer im Level trödelt,
verliert nichts; wer die falschen Felder füllt, schon.

**Lösungsreihenfolge (Risiko vor Lob, wie in L7 des Katasters):**

1. „Grenzüberschreitend: nein" → Flag `nis2_claimed_certainty` — eine Aussage
   ohne Grundlage, zahlt sich in L3 negativ aus.
2. Meldung ohne Zeitpunkt der Kenntnisnahme → Rückweisung durch das Formular
   (die Frist ist ohne diesen Wert nicht prüfbar).
3. Der korrekte Weg → `nis2_first_report_filed`.

### 5.3 L4 — die unbequemste Lektion

Die Anmeldespur führt auf `warm-admin`, ein Konto, das sich vier Leute teilen.
Der Spieler kann den Vorfall **nicht** einer Person zuordnen — und die richtige
Lösung ist, genau das zu schreiben, statt jemanden zu nennen.

> Ein geteiltes Konto macht jede Spur wertlos. Nicht weil die Spur fehlt,
> sondern weil sie auf vier Personen zeigt.

Erfolgsbedingung ist ein Befund, der die Nichtzuordenbarkeit **benennt** plus
der Nachweis, dass der Spieler die Spur tatsächlich verfolgt hat (`commandRan`
verankert). Wer einen Namen rät, löst das Level nicht.

---

## 6. Die GUI-App `meldung`

Zweite eigene App nach `kataster`, gleiches Muster: Typen in
`shared/src/types/gui.ts`, Komponente unter `WindowsLevel/apps/`, Dispatch in
`WindowsLevel/index.tsx`, Dev-Preview über `?preview=meldung`.

```ts
export type MeldungStufe = 'erst' | 'folge' | 'abschluss';
export type Tristate = 'ja' | 'nein' | 'unbekannt';

export interface MeldungFeld {
  id: string;
  label: string;
  kind: 'text' | 'datetime' | 'select' | 'multiselect' | 'tristate' | 'longtext';
  options?: Array<{ id: string; label: string }>;
  /** Pflichtfeld nach § 32 — Absenden ohne Wert wird zurückgewiesen. */
  required?: boolean;
  hint?: string;
}

export interface MeldungState {
  stufe: MeldungStufe;
  /** Kopfzeile: „Kenntnis seit 03:14 h". Erzählte Uhr, kein Timer. */
  kenntnisSeit: string;
  empfaenger: string;         // „Gemeinsame Meldestelle BSI / BBK"
  rechtsgrundlage: string;    // „§ 32 Abs. 1 BSIG — Erstmeldung"
  felder: MeldungFeld[];
  /** Vorbelegung aus einer früheren Stufe, read-only angezeigt (L3). */
  vorbefund?: Array<{ label: string; value: string }>;
}
```

**Token-Vokabular:** `set:<feldId>:<wert>`, `clear:<feldId>`, `submit`.
Mehrfachauswahl emittiert `set:<feldId>:<optionId>` je Option und nimmt bei
Abwahl zurück.

**`retract` ist Pflicht.** Formularfelder sind Zustände, keine Ereignisse — die
Lehre aus dem Kataster-Review (`useGuiLevel.retract`, siehe
`gui-level-authoring`). Ein geänderter Wert nimmt den alten Token zurück, sonst
zählt eine korrigierte Falschangabe weiter mit.

**Tastatur:** Die App ist ein Formular, keine Liste — normale Fokusreihenfolge,
keine eigene Roving-Tabindex-Logik. Damit entfällt die Verbundelement-Falle aus
dem Kataster. Trotzdem als Test festgehalten: jedes Feld ist per Tab erreichbar
und per Enter/Leertaste bedienbar.

---

## 7. Was bewusst fehlt (nicht als Lücke melden)

- **Kein echter Countdown.** Begründung in §5.2.
- **Keine Bußgeldrechnung.** § 65 BSIG kennt Bußgelder; im Lernpfad wäre das
  Drohkulisse statt Lektion. Die Konsequenz ist der Widerspruch in L3.
- **Kein Abschlussmeldungs-Level.** Die dritte Stufe wird in L3 erklärt und im
  Ergebnistext eingeordnet, bekommt aber kein eigenes Level — der Lernwert
  gegenüber L3 wäre gering. Kandidat für V2 zusammen mit der Fortschrittsmeldung.
- **Keine Anbindung an DAS KATASTER.** Der Lernpfad bleibt kampagnenfrei; die
  Kampagne zitiert kein Lernlevel und umgekehrt.

---

## 8. Testpflichten

- `learningPath.test.ts` — Skip-Flag öffnet die Tracks; ohne Flag und ohne die
  vier Level bleibt alles zu; der Test selbst ist **kein** Track-Level.
- `learningTracks.test.ts` — jedes `eventId` existiert, `order` bleibt eindeutig
  und lückenlos nach dem Einschub.
- `meldungSolution.browser.test.tsx` — Tristate rendert alle drei Werte;
  Pflichtfeld-Rückweisung; **Vertragstest:** eine erfundene Gewissheit
  („nein" statt „unbekannt") sieht im Formular **exakt** aus wie eine belegte
  Angabe. Dieselbe Regel wie im Kataster.
- `nis2Track.test.ts` — jedes Level hat ≥2 ungated Optionen, Hinweise eskalieren
  (hints[0] nennt nie den Befehl), keine Behauptung, die nur in einem Zweig gilt
  (siehe `branch-truthfulness`).
- `levels.spec.ts` (e2e) nimmt die neuen Level automatisch auf — der Sollwert
  steigt von 72 auf 77.
- `orthography.test.ts` und `skillBalanceAudit.test.ts` wie immer.

---

## 9. Offene Punkte

1. **Reihenfolge-Umnummerierung.** Der Einschub bei `order: 6` verschiebt
   blackout/ssh/systemd/net/ansible um eins. Mechanisch, aber sichtbar im Hub.
   Alternative: ans Ende hängen (order 12) — thematisch schlechter.
2. **Der Skip-Test öffnet auch Blackout.** Gewollt (genau der Wunsch), aber er
   öffnet damit auch die fortgeschrittenen Tracks. Sollte der Test nur die
   Grundlagen ersetzen oder zusätzlich ein Mindestmaß für Blackout verlangen?
   **Vorschlag: nur die Grundlagen** — mehr wäre ein zweites Tor.
