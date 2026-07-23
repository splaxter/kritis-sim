# AUDIT TRAIL — Zweite Story-Kampagne (Design)

Datum: 2026-07-24 · Status: Entwurf zur Abnahme (Rev. 2 — Audit-Domänen,
FlagCondition, Entkopplungs-Scope, Terminal-setsFlags, Exchange-2019-Fachlichkeit)

## 1. Konzept

Ein CLI-Thriller in 4 Akten bei der fiktiven „Stadtentwässerung Kreis Falkenbach AöR"
(KRITIS, klein, unterbesetzt, NIS-2 im Nacken). Der neue Spielkern, der die Kampagne
von „Die Probezeit" abgrenzt:

> Nicht nur den Vorfall technisch lösen, sondern später **beweisen** können, was man
> wusste, wer etwas angeordnet hat und ob man verhältnismäßig gehandelt hat.

Kein äußerer Angreifer — der Gegner ist ein Systemzustand ohne Zurechenbarkeit.
Bürokratie wird zur Spannung: „Habe ich einen Beweis — oder nur einen Verdacht?"

**Lernziele:** Shared Accounts & Zurechenbarkeit, Mailbox-Auditing, PAM-Grundprinzip,
MFA-Architektur, Meldewege & ISB-Rolle, DSGVO-Grenzen der Log-Auswertung,
Dokumentation als Sicherheitskontrolle, Deeskalation als Admin-Skill.

## 2. Festgezurrte Entscheidungen

1. **Eigenständige, im Menü wählbare zweite Kampagne.** Kein Ersatz für „Die
   Probezeit", keine Fortsetzung derselben Figur (drei Probezeit-Endings bleiben
   gleichwertig; kein Spielreihenfolge-Zwang). Weiche Bezüge zur Spielwelt erlaubt.
2. **Protagonist: interner Systemadministrator** (`player@sekf.local`, Probezeit läuft)
   mit zusätzlichem Auftrag, die **Auditfähigkeit herzustellen**. Technischer Zugriff
   vorhanden, aber **kein pauschales Recht auf Postfachinhalte** — sensible Zugriffe
   brauchen dokumentierte Freigabe und Zweckbindung. Die Spannung ist „Ich kann das
   technisch" vs. „Ich darf das in diesem Umfang".
3. **Keine fiktiven CLI-Befehle.** Alles läuft über reale Werkzeuge und reale
   Dateien. **`diff` ist die einzige allgemeine Unix-Erweiterung** (§7.1); auf der
   Windows-Seite kommen eng begrenzte, fachlich echte `Get-Mailbox`/`Set-Mailbox`-
   Semantiken hinzu (§7.5).
4. **Tickets = Dateien.** Exporte, Logs, Anhänge, Metadaten — untersucht mit
   `cat`, `grep`, `find`, `stat`, `diff`, `cp`, `sha256sum`.
5. **E-Mail = GUI-Interaktion** über die vorhandenen `EmailMockup`/`EmailPreview`-
   Komponenten; Entscheidungen (CC, Tonfall) sind Event-Choices im Mail-Gewand.
6. **Das Dossier ist kein Werkzeug, sondern Resultat** sauberer Beweisarbeit:
   gesicherte Originale, Hashliste, Timeline, dokumentierte Freigabe — als echte
   Dateien, per `stateGoals` prüfbar.
7. **Plattformgrenze ist Teil der Beweiskette.** Verbindliche Fachlichkeit:
   **lokales Exchange Server 2019** auf `EXCH01` (deshalb gibt es IIS/W3C-Logs).
   Dort PowerShell/`Select-String`; `grep` erst, nachdem die Logs **nachweisbar**
   auf die Linux-Analysemaschine exportiert wurden (Übergabeprotokoll). Da die
   Multi-Host-Engine (`shell/hosts.ts`) Linux-only ist, fällt die Plattformgrenze
   auf eine Level-Grenze — der dokumentierte Export ist das Bindeglied (§6, L4/L5).
8. **Kein versteckter numerischer Risiko-Zähler.** Diskrete Flags, aus konkreten
   Handlungen gesetzt; das Ende wird über **fünf Audit-Domänen** abgeleitet (§5).
9. **Hauptkonsequenzen über Flags + `branchCondition`** (garantierter Payoff);
   die Chain-Engine nur für **optionale** verzögerte Zwischenfälle. Die
   Auditfragen brauchen zusammengesetzte Bedingungen → `FlagCondition` (§7.2).
10. **Minimale Kampagnen-Entkopplung, keine Plugin-Architektur** (§7.3) — aber auch
    keine verstreuten `if (campaignId === …)`-Ketten. Eine kleine
    `getCampaign(id)`-Zuordnung ist erlaubt und gewollt.
11. **Endings behaupten nur, was Flags belegen.** Der Epilog ist modular pro
    Audit-Domäne; keine Szene behauptet einen Zustand (BASTION live, Konto
    abgeschafft), dessen Flag fehlt (§5.3, §6 L8).

## 3. Figuren

Alle neu, keine Überschneidung mit der Probezeit-Besetzung:

- **Volker** — dienstältester Admin. Kommentiert Tickets, statt sie zu lösen.
  Charmant im Flur, giftig im Chat. Prestigeprojekt PAM-Appliance „BASTION-01"
  steht seit 14 Monaten unkonfiguriert im Rack; Begründung wechselt.
- **Silke** — kommissarische Teamleitung. Weiß mehr, als sie sagt. Konfliktscheu,
  aber nicht dumm.
- **Der neue ISB** — erscheint in Akt 4. Stellt genau die Fragen, auf die nur gute
  Doku antworten kann.
- **M.** — der „krankheitsbedingt abwesende" Ex-Teamleiter. Sein Postfach ist
  aktiver, als es sein sollte. Abgrenzung zum Probezeit-Stefan: M. ist kein Opfer
  eines Angriffs, sondern eines Systems ohne Zurechenbarkeit.

## 4. Akt 4 zuerst: die Auditfragen (Rückwärts-Design)

Jede Frage des ISB definiert, welche Belege eine belastbare Antwort ermöglichen.
Erst daraus entstehen die Level in §6 — kein Sammelobjekt ohne Audit-Bedeutung.
Jede Frage ist ein Beat, dessen `branchCondition` die **Domänen-Bedingung** aus
§5.2 prüft (zusammengesetzt via `FlagCondition`, §7.2): Domäne erfüllt / nicht
erfüllt ergibt zwei Szenen; belastende Flags (F2/F5) erzeugen eigene
Konfrontationsszenen.

| # | Auditfrage | Belastbare Antwort braucht |
|---|---|---|
| F1 | „Wer kann auf Postfächer zugreifen — und wie stellen Sie Zurechenbarkeit her?" | Shared-Konto `administrator` als strukturelles Finding dokumentiert **und** Mailbox-Auditing nachweislich aktiviert. Wichtig: Auditing dokumentiert Akteure, macht das geteilte Konto aber **nicht** individuell zurechenbar — die belastbare Antwort ist „Finding + Kompensationsmaßnahme + Abstellung vorgeschlagen", nicht „Problem gelöst" (§5.3). |
| F2 | „Es gab einen Zugriff auf das Postfach von Herrn M. Was wissen Sie — und woher?" | Finding gemeldet, Mandat/Freigabe dokumentiert, Export protokolliert, Originale gehasht — **und kein** Scope-Verstoß (Postfachinhalte, breites Teilen). |
| F3 | „Die PAM-Appliance steht seit 14 Monaten. Warum?" | Lieferschein gefunden (MFA war Teil des Pakets) **und** Übergabe dokumentiert (Schnittstellen-Mail mit Zeitstempel und CC an Silke — Bringschuld gedreht). |
| F4 | „Zeigen Sie mir Ihre Dokumentation der letzten Monate." | Doku-Spur seit Akt 1: Onboarding-Inventar **und** dokumentierter Ticket-Manipulations-Fund. |
| F5 | „Herr Volker hat sich über Ihren Umgangston beschwert." | Volkers `[intern]`-Notizen gesichert statt beantwortet, **und nie** provoziert. |

## 5. Flags, Audit-Domänen und Endings

### 5.1 Flags

| Flag | Gesetzt in | Domäne |
|---|---|---|
| `onboarding_documented` | Akt 1, L2 (Inventar-Doku geschrieben) | D4 |
| `shared_account_documented` | Akt 1, L2/Dialog (Wiki-Passwort-Fund dokumentiert) | D1 |
| `ticket_tamper_documented` | Akt 2, L3 (diff-Fund dokumentiert) | D4 |
| `mailbox_auditing_enabled` | Akt 2, L6 (`Set-Mailbox … -AuditEnabled $true`, stateGoal) | D1 |
| `authorization_documented` | Akt 2, Dialog (Freigabe bei Silke eingeholt, bevor Logs vertieft werden) | D2 |
| `finding_reported` | Akt 2, Mail-Interaktion (strukturelles Finding gemeldet) | D2 |
| `evidence_hashed` | Akt 2, L5 (Originale + `sha256sum`-Hashliste, stateGoal) | D2 |
| `export_documented` | Akt 2, L4→L5 (Übergabeprotokoll erstellt, stateGoal) | D2 |
| `mailbox_scope_exceeded` | Akt 2, L4 (Honigtopf: M.s Postfach-Export geöffnet statt nur Zugriffs-Log; Terminal-`setsFlags`, §7.4) | D2 (negativ) |
| `personal_data_shared_broadly` | Akt 2/3, Dialog (Funde in großer Runde geteilt) | D2 (negativ) |
| `bastion_delivery_found` | Akt 3, L7 (Lieferschein auf dem Fileshare) | D3 |
| `handover_mail_sent` | Akt 3, Mail-Interaktion (CC Silke, Zeitstempel) | D3 |
| `bastion_live` | Akt 3, L8 ★ (Bastion konfiguriert, stateGoal) | D3 (Bonus, §5.3) |
| `volker_provoked` | Akt 3, Dialoge (jede spitze Antwort; einmal gesetzt, bleibt) | D5 (negativ) |
| `volker_warning_preserved` | Akt 3, Dialog/Level (`[intern]`-Notiz gesichert statt beantwortet) | D5 |

Chain-Engine (optional, kein Haupt-Payoff): `volker_provoked` triggert mit
`delayWeeks` einen Zwischenfall vor dem Audit (Silke spricht den Ton an) —
Vorwarnung, keine Voraussetzung für Akt 4.

### 5.2 Fünf Audit-Domänen

Die Endings werden **nicht** aus Einzel-Flags abgeleitet, sondern aus fünf
Domänen-Ergebnissen — dieselben Bedingungen, die auch die Akt-4-Beats branchen:

| Domäne | Bedingung (`FlagCondition`, §7.2) |
|---|---|
| **D1 Zurechenbarkeit** | `all: [shared_account_documented, mailbox_auditing_enabled]` |
| **D2 Beweiskette** | `all: [finding_reported, authorization_documented, export_documented, evidence_hashed]`, `none: [mailbox_scope_exceeded, personal_data_shared_broadly]` |
| **D3 BASTION** | `all: [bastion_delivery_found, handover_mail_sent]` |
| **D4 Dokumentation** | `all: [onboarding_documented, ticket_tamper_documented]` |
| **D5 Deeskalation** | `all: [volker_warning_preserved]`, `none: [volker_provoked]` |

### 5.3 Endings — aus Domänen abgeleitet, Prioritätsreihenfolge

1. **„Der Rächer"** — wenn `mailbox_scope_exceeded` oder
   `personal_data_shared_broadly`. Der Abspann benennt den konkreten Schaden statt
   pauschaler Unverwertbarkeit: **Vertrauensschaden** (Silke muss den Vorgang jetzt
   gegen den Personalrat verteidigen, nicht mit dem Spieler zusammen aufklären),
   **Datenschutzschaden** (die eigenmächtige Auswertung ist selbst zum
   Datenschutzvorfall geworden und muss bewertet und dokumentiert werden — eine
   Behördenmeldung nach Art. 33 DSGVO folgt nur, sofern der Vorfall voraussichtlich
   ein Risiko für die Rechte und Freiheiten der Betroffenen verursacht),
   **Eskalationsschaden** (Volker führt jetzt das Verfahren, nicht die Sache). Abspann: „Du hattest recht. Es hat nicht gereicht."
2. **„Der Stille"** — sonst, wenn **weniger als 2** der 5 Domänen erfüllt sind.
   Volkers kuratierte Ticket-Historie erzählt die Geschichte. Wer nicht
   dokumentiert, existiert nicht.
3. **„Der Profi"** — sonst, wenn **mindestens 4** von 5 Domänen erfüllt sind,
   darunter zwingend **D1 und D2**.
4. **„Der Stille"** (untere Variante) — verbleibende Fälle (2–3 Domänen):
   der Spieler hat Teile gesehen, aber kein tragfähiges Bild abgeliefert; der
   Epilog benennt die erfüllten Domänen als „immerhin" und die Lücken als das,
   was hängen bleibt.

**Modularer Epilog:** Der Abspann ist pro Domäne komponiert — nur erfüllte Domänen
werden behauptet. Konkrete Ehrlichkeitsregeln:

- **D1/Shared Account:** Auditing kompensiert, beseitigt aber nicht. Der
  Profi-Epilog behauptet nur „die **Abstellung wird im Audit beschlossen**" —
  es gibt kein `shared_account_retired` in V1, also behauptet keine Szene, das
  Konto sei bereits weg.
- **D3/BASTION:** Basistext bei erfüllter D3: „die **Inbetriebnahme wird
  freigegeben**". Nur wenn zusätzlich `bastion_live` gesetzt ist (optionales L8
  gespielt), zeigt der Epilog die Bastion **in Betrieb**. L8 bleibt optional ★ —
  das Level ist der spielbare Bonus-Payoff, kein Gate.

## 6. Akt-Struktur und Level

Kapitelstruktur analog `chapters.ts`: **4 Akte** (Typ-Erweiterung nötig, §7.3),
je 3–4 Kapitel à ~4 Beats (Dialog-Events + Terminal-/GUI-Level als
`terminalContext`/`guiContext`). Sidequests: **keine in v1** (Engine muss leeres
Set vertragen, §7.3).

### Akt 1 — Onboarding (Tutorial)

- **L1 [CLI Linux] „Der erste Arbeitstag"** — Orientierung auf der Admin-Workstation,
  Ticketexporte finden (`ls`, `cat`, `find`). Muster: `learn_01`/`learn_02`. *Neu.*
- **L2 [CLI Linux] „Die Inventur"** — Asset-Exporte mit `find`/`stat` sichten,
  Inventar-Doku als Datei anlegen (stateGoal prüft Inhalt). Beim Durchsuchen des
  Wikis: das `administrator`-Passwort, halb-ironisch dokumentiert. Choice:
  dokumentieren/ignorieren → `shared_account_documented`, `onboarding_documented`. *Neu.*
- Dialog-Events: Volker- und Silke-Intro; erste `[intern]`-Notiz als Köder.

### Akt 2 — Die Spur (Detektiv-Phase)

- **L3 [CLI Linux] „Der editierte Ticket-Export"** — zwei Versionsstände eines
  Ticket-Exports per `diff` vergleichen, Manipulation finden, Fund dokumentieren
  → `ticket_tamper_documented`. *Neu, braucht `diff` (§7.1).*
- **L4 [CLI PowerShell, EXCH01] „Die Spur im IIS-Log"** — erst `Get-ChildItem`
  im Log-Verzeichnis (Dateien entdecken), dann
  `Select-String -Path u_ex240722.log -Pattern …` mit **explizitem Dateinamen**
  (Select-String expandiert keine Wildcards — das bleibt so und ist Teil der
  Bedienung): OWA-Zugriff auf M.s Postfach, angemeldet als `administrator`.
  Also jeder. Also niemand. **Honigtopf:** M.s PST-Export liegt im selben
  Verzeichnis — ihn zu öffnen setzt `mailbox_scope_exceeded` über
  Terminal-`setsFlags` (§7.4), **ohne** das Level zu lösen oder zu beenden.
  **Abdeckung:** Das negative Flag muss bei **allen unterstützten Lesewegen**
  feuern — `Get-Content`, `cat`, `type`, `gc`, `Select-String`/`sls`,
  einschließlich Pipelines und zulässiger Pfadvarianten (relativ/absolut/`./`) —
  sonst lässt es sich unbeabsichtigt umgehen (Testpflicht, §8).
  Sauberer Abschluss: Zugriffs-Log (nicht Inhalte!) für den Export vorbereiten +
  Übergabeprotokoll beginnen. *Neu.*
- **Dialog/Mail: die Freigabe** — vor der vertieften Auswertung Silke fragen
  (Zweckbindung) → `authorization_documented`; Finding melden → `finding_reported`.
- **L5 [CLI Linux, Analyse-VM] „Die Beweiskette"** — die exportierten Logs liegen
  (per Seed, mit Übergabeprotokoll aus L4) auf der Analysemaschine: Original per
  `cp` sichern, `sha256sum > hashes.txt`, Timeline als Textdatei, Protokoll
  vervollständigen → `evidence_hashed`, `export_documented` (stateGoals: Dateien
  existieren, Hashliste matcht). Muster: `learn_adv_evidence_first`. *Neu.*
- **L6 [CLI PowerShell, EXCH01] „Ab jetzt wird geloggt"** — Mailbox-Auditing
  **fachlich korrekt für lokales Exchange 2019**: Ist-Zustand prüfen
  (`Get-Mailbox m.lastname | Format-List Audit*` → `AuditEnabled: False`), dann
  pro Postfach `Set-Mailbox m.lastname -AuditEnabled $true` →
  `mailbox_auditing_enabled` (stateGoal auf Mailbox-Attribut, §7.5).
  **Kein Dienstneustart** — der gehört nicht zum Verfahren. Lernnotiz im Level:
  In Exchange Online ist Auditing standardmäßig aktiv und wird organisationsweit
  über `AuditDisabled` gesteuert; hier ist es on-prem, deshalb per Mailbox.
  Referenzen: Microsoft Purview „Manage mailbox auditing"
  (learn.microsoft.com/en-us/purview/audit-mailboxes), Exchange Server „Enable or
  disable mailbox audit logging" (learn.microsoft.com/…/enable-or-disable?view=exchserver-2019). *Neu.*

### Akt 3 — Die Blockade (Politik-Phase)

- Dialog-Karten mit Volker (Fallen-Optionen): jede spitze Antwort →
  `volker_provoked`; die kühle, knappe Option fühlt sich unbefriedigend an — und
  ist immer die richtige. Vorlage: `internal`-Pack (team_dynamics).
- **L7 [GUI Explorer] „Der Lieferschein"** — auf dem Projekt-Fileshare den
  BASTION-01-Lieferschein finden: MFA war Teil des Pakets → `bastion_delivery_found`.
  App existiert (`explorer`). *Neu (Level, keine neue App).*
- **Mail-Interaktion „Die Schnittstellen-Mail"** — Compose-Ansicht (EmailMockup-
  Erweiterung, §7.6): Choices = Empfänger/CC/Tonfall. CC Silke mit Zeitstempel
  dreht die Bringschuld → `handover_mail_sent`.
- **L8 [CLI Linux, optional ★] „BASTION-01 in Betrieb"** — Jumphost-Prinzip
  spielbar machen (Muster `learn_ssh_03_jumphost`): Dienstleister-Zugriff nur noch
  über die Bastion → `bastion_live`. Optionaler Bonus-Payoff; wertet den
  D3-Epilog auf (§5.3), gated nichts. *Neu, Mechanik vorhanden.*

### Akt 4 — Das Audit (Showdown)

Reine authored Event-Sequenz, kein neues Level: die fünf Auditfragen (§4) als
Beats, deren `branchCondition` die Domänen-Bedingungen (§5.2) als zusammengesetzte
`FlagCondition` prüft. Danach Domänen-Auswertung → Ending (§5.3) und modularer
Epilog. Belastende Flags erzeugen Konfrontationsszenen (F2: Personalrat, F5:
Volkers Dossier).

## 7. Technische Bausteine

### 7.1 `diff` als echtes Shell-Kommando

Allgemeines Werkzeug, kein Ticket-Sonderfall: `diff <file1> <file2>` mit
realistischem zeilenweisem Output im Normal-Format (`NcN`, `<`/`>`-Zeilen),
Exit-Codes **0** (gleich), **1** (unterschiedlich), **2** (Fehler, z. B. Datei
fehlt). Implementierung als `ShellCommand`-Objekt in `commands/linux/`, Einhängen
in `allLinuxCommands`. `-u` optional, nicht erforderlich für v1. **Dies ist die
einzige allgemeine Unix-Erweiterung der Kampagne.**

### 7.2 `FlagCondition` — zusammengesetzte Bedingungen

`StoryBeat.branchCondition` prüft heute genau **ein** positives Flag
(`shared/src/types/adventure.ts`). Die Auditfragen brauchen `all`/`any`/`none`.
Rückwärtskompatible Erweiterung:

```ts
type FlagCondition =
  | string                                    // bisheriges Verhalten: ein Flag
  | { all?: string[]; any?: string[]; none?: string[] };
```

Ein Evaluator `checkFlagCondition(cond, flags)` (reine Funktion, shared) ersetzt
die bisherige Einzel-Flag-Prüfung in `adventureEngine.shouldPlayBeat`/
`getNextStoryContent`; bestehender Probezeit-Content bleibt unverändert gültig.
Ohne diese Erweiterung müssten die Auditfragen in künstliche Einzel-Beats
zerlegt werden — das ist ein Plan-Task, kein Implementierungsdetail.

### 7.3 Kampagnen-Entkopplung — realer Scope

```ts
type CampaignId = 'probation' | 'audit-trail';
function getCampaign(id: CampaignId): CampaignDefinition;  // kleine Zuordnung, keine Registry

interface CampaignDefinition {
  id: CampaignId;
  title: string;
  startChapterId: string;
  chapters: AdventureChapter[];
  storyEvents: GameEvent[];
  sidequests: SidequestDefinition[];      // audit-trail: []
  sidequestEvents: GameEvent[];           // audit-trail: []
  characters: StoryCharacter[];           // Volker/Silke/ISB/M. statt Bjorg & Co.
  actBreaks: Record<number, string>;      // eigene Akt-Break-Texte
  endings: CampaignEnding[];              // 'profi' | 'raecher' | 'stille'
  deriveEnding(state: GameState): CampaignEndingId;  // Domänen-Auswertung (§5)
}
```

Über Chapters/Events/Endings hinaus müssen kampagnenspezifisch werden:

- **Vierter Akt:** `AdventureChapter.act` ist heute `1 | 2 | 3`
  (`shared/src/types/adventure.ts:21`) → `number` bzw. `1 | 2 | 3 | 4`.
- **Akt-Break-Texte:** `actBreaks.ts`/`ACT_BREAK_BODIES` sind Probezeit-Copy →
  in die `CampaignDefinition`.
- **Charakter-Token:** `STORY_CHARACTERS` (Bjorg/Jens/Henry/Chef/Stefan) ist
  global → pro Kampagne; Relationship-Keys der neuen Figuren definieren.
- **Ending + Meta-Progression:** Ending-IDs werden kampagnenspezifische Strings
  (probation behält `good|neutral|bad`); Telemetrie-Feld wird `string`;
  `metaProgress` (abgeschlossene Runs/Endings) wird pro `campaignId` geführt.
- **Art/Cinematics:** **AUDIT TRAIL V1 hat keine** Chapter-Art/Story-Backgrounds —
  ausdrücklich, damit der `StoryBackground`-Pfad nicht implizit Probezeit-Assets
  zeigt. Text-only Interstitials.
- **Save-Migration:** fehlende `campaignId` in Autosave/Slots bedeutet
  `'probation'` — alte Spielstände laufen unverändert weiter (Never-throw-Regel
  der Autosave-Schicht gilt).
- Engine muss leere Sidequest-/Chain-Sets sauber vertragen (Testfall).

Menü: Kampagnenwahl im Story-Einstieg (ein `story`-Mode, danach Auswahlscreen) —
kein siebter Game-Mode.

### 7.4 Terminal-`setsFlags` — Flag-Wirkung ohne Solve (Honigtopf L4)

Terminal-Kommandos können heute kein Flag setzen, ohne dass das Level gelöst wird
(Flags fließen nur über den Solution-/Choice-Pfad in `closeTerminal`). Entwurf:

- Erfolgreiche **Szenario-Kommandos** (die geskripteten `TerminalCommand`-Einträge
  eines Levels) erhalten optional `setsFlags: string[]`.
- Beim Match emittiert die Terminal-Session **sofort** einen semantischen
  `setFlags`-Effekt an den Game-State (nicht erst beim Level-Ende).
- **Idempotent** (mehrfaches Ausführen setzt nicht mehrfach / erzeugt keine
  Doppel-Effekte) und **abbruchfest**: das Flag bleibt auch nach ESC/Levelabbruch
  erhalten — genau das macht den Honigtopf glaubwürdig („gesehen ist gesehen").
- Kein genereller Command-Side-Effect-Kanal: Das deklarierte, aber tote
  `CommandResult.sideEffects`-Feld bleibt unangetastet; der neue Weg hängt an der
  Level-Definition, nicht an der Shell-Engine.

### 7.5 Exchange-2019-Semantik auf EXCH01 (eng begrenzt)

Für L4/L6 braucht die PowerShell-Variante zwei fachlich echte, im Umfang bewusst
kleine Cmdlets:

- `Get-Mailbox <identity> [| Format-List Audit*]` — zeigt u. a. `AuditEnabled`,
  `AuditLogAgeLimit` aus einem pro Szenario geseedeten Mailbox-Zustand.
- `Set-Mailbox <identity> -AuditEnabled $true|$false` — ändert diesen Zustand;
  ein neuer stateGoal-Typ prüft das Mailbox-Attribut (analog `serviceState`).

Kein Dienstneustart im Lösungsweg. Keine weiteren Exchange-Cmdlets in V1.

### 7.6 Mail-Compose-Interaktion

`EmailMockup`/`EmailPreview` (`components/TerminalUI/`) sind Anzeige-Komponenten.
Neu: eine Event-Darstellungsvariante, die Choices als Mail-Compose rendert
(An/CC/Betreff sichtbar, Choice wählt Variante). Keine neue Engine — Choices
bleiben `EventChoice` mit `setsFlags`.

### 7.7 Was bewusst NICHT gebaut wird

- Keine fiktiven Kommandos, kein `dsgvoRisk`-Zahlenfeld, keine Plugin-/Registry-
  Architektur (nur `getCampaign(id)`), keine Windows-Hosts in der SSH-Multi-Host-
  Engine, kein OWA-Browser-Simulator (das Postfach selbst wird nie geöffnet —
  genau das ist der Punkt), keine Sidequests, keine Chapter-Art/Cinematics,
  kein `shared_account_retired`-Mechanismus (Epilog behauptet nur den Beschluss),
  kein Wildcard-Support für `Select-String` in V1.

## 8. Tests und Guards

- Bestehende Audit-Tests gelten: Pacing/Flow-Density, `orthography.test.ts`,
  Hint-Eskalation (`hints[0]` orientiert, exakte Syntax zuletzt).
- Neu: Kampagnen-Konsistenztest analog Probezeit — alle in `FlagCondition`s
  referenzierten Flags werden irgendwo gesetzt; jedes §5.1-Flag wird von
  mindestens einer Domäne gelesen (kein Sammelobjekt ohne Bedeutung).
- `checkFlagCondition`: reine Funktion, Tests für string-Kompatibilität,
  `all`/`any`/`none` und Kombinationen.
- Domänen-/Ending-Ableitung: tabellengetriebene Tests der Prioritätslogik inkl.
  der Grenzfälle (Rächer schlägt alles; 2–3 Domänen → Stille-Untervariante;
  Profi erfordert D1+D2).
- Terminal-`setsFlags`: Idempotenz + Persistenz nach ESC/Abbruch (Browser-Test).
- Honigtopf-Abdeckung L4: **ein Testfall pro unterstütztem Leseweg** auf den
  PST-Export (`Get-Content`, `cat`, `type`, `gc`, `Select-String`, `sls`,
  Pipeline-Formen, Pfadvarianten) — jeder muss `mailbox_scope_exceeded` setzen.
- `diff`-Kommando: Unit-Tests für Output-Format und Exit-Codes 0/1/2.
- Save-Migration: Autosave ohne `campaignId` lädt als Probezeit (never-throw).

## 9. Offene Punkte für den Implementierungsplan

1. Kapitel-/Wochen-Raster (Spiellänge audit-trail vs. 12-Wochen-Probezeit).
2. Umfang Akt-1-Tutorialisierung für Spieler, die ohne Learning-Tracks einsteigen.
3. Verdrahtungsdetail Terminal-`setsFlags`: wo genau der Effekt von der
   Terminal-Session in `useGame` fließt (Session→Hook-Schnittstelle), inkl.
   Autosave-Zeitpunkt.
4. `metaProgress`-Schema pro Kampagne (Migration bestehender Einträge).
