import { GameEvent } from '@kritis/shared';

/**
 * Track „Pflicht & Nachweis" — die Themen, die KRITIS-Admins von normalen
 * Admins unterscheiden. Design: docs/plans/2026-09-12-nis2-lernpfad-design.md
 *
 * Rechtsstand: BSIG i.d.F. des NIS2UmsuCG, in Kraft seit 06.12.2025. Nur
 * geltendes Recht — § 8a/§ 8b sind Altrecht und kommen hier nicht vor.
 */

/* ── L1: Ist das überhaupt meldepflichtig? ──────────────────────────────── */

const vorfallListe = `id;datum;titel;wirkung_bekannt;dienstleistung
VF-2026-031;2026-09-02;Drucker 2. OG ohne Funktion;keine;nein
VF-2026-032;2026-09-05;Dateien auf Dispo-Server verschlüsselt;Tourenplanung steht;ja
VF-2026-033;2026-09-08;Fremder Zugriff auf Waagensteuerung;kein Schaden festgestellt;ja
`;

const vorfall031 = `Vorfall VF-2026-031 — Drucker 2. OG
Aufgenommen: 02.09.2026, 09:10

Der Etagendrucker zieht kein Papier mehr ein. Ersatzgerät steht daneben.
Keine Auswirkung auf Betrieb, Disposition oder Entsorgung.
`;

const vorfall032 = `Vorfall VF-2026-032 — Dateiserver Disposition
Aufgenommen: 05.09.2026, 17:40

Dateien auf dem Dispo-Server sind verschlüsselt und nicht mehr lesbar.
Die Tourenplanung für den Folgetag kann nicht erstellt werden.
Der Betrieb weicht auf Papierlisten aus.
`;

const vorfall033 = `Vorfall VF-2026-033 — Waagensteuerung
Aufgenommen: 08.09.2026, 06:25

Aus dem Netz der Werkstatt wurde auf die Steuerung der Fahrzeugwaage
zugegriffen. Die Sitzung wurde nach knapp zwei Minuten beendet.

Ein Schaden ist bislang NICHT festgestellt worden: keine veränderten
Wiegedaten, kein Ausfall, keine Beschwerde.

Die Steuerung hängt an der Annahme. Fällt sie aus oder werden Wiegedaten
verändert, kann die Annahme nicht abrechnen und muss den Betrieb einstellen.
`;

/* ── L4: Wer war das? ───────────────────────────────────────────────────── */

const authLog = `Sep 08 06:23:44 warm-waage sshd[2211]: Accepted password for warm-admin from 10.20.4.61 port 51122 ssh2
Sep 08 06:23:44 warm-waage sshd[2211]: pam_unix(sshd:session): session opened for user warm-admin
Sep 08 06:25:09 warm-waage sshd[2211]: pam_unix(sshd:session): session closed for user warm-admin
Sep 08 07:02:15 warm-waage sshd[2290]: Accepted publickey for henry from 10.20.1.14 port 49510 ssh2
Sep 08 07:02:15 warm-waage sshd[2290]: pam_unix(sshd:session): session opened for user henry
`;

const kontenListe = `# Konten mit Zugriff auf warm-waage — Stand 09/2026
konto;art;bekannt_bei
warm-admin;gemeinsam genutzt;Björn O., Henry B., Marek S., externe Firma Herold
henry;persönlich;Henry B.
jens;persönlich;Jens K.
`;

const arbeitsplatzListe = `# Arbeitsplätze Werkstatt — Netz 10.20.4.0/24
ip;platz;anmeldung_erforderlich
10.20.4.61;Werkstatt-Terminal (Tor 2);nein
10.20.4.62;Büro Werkstattleitung;ja
`;

/* ── L5 ★: Was im Audit hält ────────────────────────────────────────────── */

const dokuAlt = `Notfallwiederanlauf Dispo-Server

Der Server wird im Fall eines Ausfalls aus dem Backup wiederhergestellt.
Die Wiederherstellung wurde getestet und funktioniert.
`;

const dokuNeu = `Notfallwiederanlauf Dispo-Server
Stand: 14.08.2026 — verantwortlich: Henry Bartels (Systemtechnik)

1. Auslöser: Dispo-Server nicht erreichbar oder Daten unbrauchbar.
2. Wiederherstellung aus dem Backup vom Vorabend (Band, Schrank B2).
3. Zielzeit: 4 Stunden bis Tourenplanung wieder möglich.

Letzter Test: 11.08.2026, Protokoll unter /srv/nachweise/wiederanlauf_2026-08.txt
Dabei aufgefallen: Bänderwechsel dauerte 40 Minuten länger als geplant,
weil der Schrankschlüssel nicht auffindbar war. Maßnahme: Zweitschlüssel
im Leitstand hinterlegt (erledigt 12.08.2026).
`;

const nachweisProtokoll = `Testprotokoll Wiederanlauf Dispo-Server
Datum: 11.08.2026, 08:00-13:20
Teilnehmer: H. Bartels, J. Kessler
Ergebnis: Wiederanlauf erfolgreich, Zielzeit um 40 Minuten überschritten.
Mängel: Schrankschlüssel nicht auffindbar (behoben 12.08.2026).
`;

export const nis2Events: GameEvent[] = [
  /* ═══════════════════════ L1 — Die Schwelle ═══════════════════════════ */
  {
    id: 'learn_nis2_01_schwelle',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Konvention aller Tracks: der Einstieg hängt am Grundlagen-Ausgang.
    // Der Einstufungstest erkennt das an (reqsMet in engine/learningPath.ts).
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Pflicht & Nachweis 1: Ist das meldepflichtig?',
    description: `Drei Vorfälle aus dieser Woche liegen zur Einstufung vor. Zwei davon musst du melden — und der eine, den fast alle durchwinken, ist der interessante.

§ 2 BSIG sagt, wann ein Sicherheitsvorfall **erheblich** ist: wenn er schwerwiegende Betriebsstörungen oder finanzielle Verluste verursacht — oder verursachen **kann**. Oder wenn er anderen erheblichen Schaden zufügt oder zufügen **kann**.

Das Wort „kann" ist der ganze Unterschied. Die Schwelle ist das Potenzial, nicht der bereits eingetretene Schaden.

**Deine Aufgabe:** Sieh dir die Vorfallliste und die Einzelmeldungen in \`/srv/meldungen\` an und halte in \`/home/timo/einstufung.md\` fest, welche Vorfälle meldepflichtig sind.`,
    mentorNote:
      'Wer wartet, bis der Schaden belegbar ist, hat die 24 Stunden längst verbraucht. Die Frage im Audit lautet nie „warum haben Sie gemeldet?", sondern immer „warum haben Sie nicht gemeldet?" — und darauf ist „es ist ja nichts passiert" keine Antwort, sondern ein Eingeständnis.',
    choices: [
      {
        id: 'nis2_01_start',
        text: 'Vorfälle einstufen.',
        effects: { skills: { security: 3, softSkills: 1 } },
        resultText:
          'Zwei von drei. Der Drucker ist ein Ärgernis, kein Vorfall im Sinne des Gesetzes.\n\nDer Zugriff auf die Waagensteuerung dagegen ist meldepflichtig, obwohl nichts kaputtgegangen ist: Die Steuerung hängt an der Annahme, und ohne Annahme steht der Betrieb. „Kann verursachen" genügt.',
        terminalCommand: true,
        setsFlags: ['nis2_threshold_understood'],
      },
      {
        id: 'nis2_01_spaeter',
        text: 'Später — ich sehe mir erst an, was sonst noch offen ist.',
        effects: {},
        resultText:
          'Die Liste läuft dir nicht weg. Sie wird nur älter, und das ist bei Meldefristen die unangenehmste Eigenschaft, die eine Liste haben kann.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/meldungen',
      taskText:
        'Vorfallliste und Einzelmeldungen in /srv/meldungen sichten (cat); in /home/timo/einstufung.md festhalten, welche Vorgänge nach § 2 BSIG meldepflichtig sind.\n\nFesthalten ohne Editor: echo "…" > /home/timo/einstufung.md überschreibt die Datei, >> hängt an.',
      vfsOverlay: {
        directories: ['/srv/meldungen'],
        files: [
          { path: '/srv/meldungen/meldungen_2026-09.csv', content: vorfallListe },
          { path: '/srv/meldungen/VF-2026-031.txt', content: vorfall031 },
          { path: '/srv/meldungen/VF-2026-032.txt', content: vorfall032 },
          { path: '/srv/meldungen/VF-2026-033.txt', content: vorfall033 },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, grep: { linux: 2 }, awk: { linux: 2, security: 1 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Der Knackpunkt steht im Detailbericht, nicht in der Liste: die
            // Liste sagt „kein Schaden festgestellt", der Bericht sagt, was
            // passieren KANN. Wer nur die CSV liest, stuft falsch ein.
            { fileRead: '/srv/meldungen/VF-2026-033.txt' },
            { file: '/home/timo/einstufung.md', matches: 'VF-2026-032' },
            { file: '/home/timo/einstufung.md', matches: 'VF-2026-033' },
            // Der Drucker gehört NICHT hinein — sonst meldet man alles und
            // damit nichts.
            { file: '/home/timo/einstufung.md', absentMatches: 'VF-2026-031' },
          ],
          resultText:
            'VF-2026-032 und VF-2026-033 sind meldepflichtig, VF-2026-031 nicht.\n\nBeim Drucker fehlt jede Betriebsrelevanz. Bei der Waagensteuerung ist noch nichts passiert — aber sie hängt an der Annahme, und das genügt: § 2 BSIG stellt auf das ab, was verursacht werden KANN.\n\nMerke: Die Schwelle ist das Potenzial. Wer auf den Schaden wartet, wartet die Frist ab.',
          skillGain: { security: 6, softSkills: 2 },
          effects: {},
        },
      ],
      hints: [
        '🤖 Die Übersichtsliste sagt dir, was bekannt ist. Sie sagt dir nicht, was passieren könnte — dafür musst du die Einzelmeldungen öffnen.',
        '🤖 Bei einem der drei Vorfälle steht „kein Schaden festgestellt" und trotzdem ein Satz, der alles ändert. Such ihn.',
        '🤖 `cat VF-2026-033.txt` — der letzte Absatz ist der entscheidende.',
        '🤖 Ergebnis festhalten: `echo "meldepflichtig: VF-2026-032, VF-2026-033" > /home/timo/einstufung.md`',
      ],
    },
    tags: ['learning', 'nis2', 'meldepflicht'],
  },

  /* ═══════════════════ L4 — Wer war das? ════════════════════════════════ */
  {
    id: 'learn_nis2_04_wer_war_das',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_nis2_01_schwelle'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Pflicht & Nachweis 4: Wer war das?',
    description: `Die Abschlussmeldung zum Waagen-Vorfall verlangt eine Ursache. Michael wird fragen, wer sich da angemeldet hat.

Die Spur ist da: ein Login, eine Uhrzeit, eine IP. Sie führt nur nicht dorthin, wo du hoffst.

**Deine Aufgabe:** Verfolge die Anmeldung in \`/srv/logs/auth.log\` bis zum Konto und zum Arbeitsplatz, und halte in \`/home/timo/zurechnung.md\` fest, was sich daraus ergibt — und was nicht.`,
    mentorNote:
      'Zurechenbarkeit ist keine Frage der Logtiefe, sondern der Kontoführung. Ein gemeinsam genutztes Konto macht jede Spur wertlos: sie zeigt nicht auf niemanden, sie zeigt auf vier Leute gleichzeitig — und das ist im Ergebnis dasselbe. Der Befund ist dann nicht „wir wissen es nicht", sondern „wir können es strukturell nicht wissen, und das ist der Mangel".',
    choices: [
      {
        id: 'nis2_04_start',
        text: 'Der Anmeldung nachgehen.',
        effects: { skills: { security: 2, troubleshooting: 2 } },
        resultText:
          'Die Spur endet bei `warm-admin` — einem Konto, das sich drei Kollegen und eine externe Firma teilen. Der Arbeitsplatz am Tor 2 verlangt keine eigene Anmeldung.\n\nDamit ist der Vorfall nicht zurechenbar. Das ist kein Ermittlungsfehler, sondern ein Befund über die Kontoführung — und genau so gehört er in die Meldung.',
        terminalCommand: true,
        setsFlags: ['nis2_attribution_understood'],
      },
      {
        id: 'nis2_04_raten',
        text: 'Bjorg war um die Zeit schon da — ich schreibe seinen Namen rein.',
        effects: { stress: 3, relationships: { kollegen: -3 } },
        resultText:
          'Du schreibst einen Namen, für den es keinen Beleg gibt, in eine Meldung an die Aufsicht.\n\nWenn Bjorg das liest — und er wird es lesen —, ist der Schaden größer als der Vorfall. Und wenn Michael nachfragt, woher der Name stammt, hast du auf die Frage „womit belegen Sie das?" keine Antwort.\n\nEin geteiltes Konto macht aus einer Vermutung keinen Nachweis.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/logs',
      taskText:
        'Anmeldung in /srv/logs/auth.log zum Konto und zum Arbeitsplatz verfolgen (Kontoliste und Arbeitsplätze liegen unter /srv/inventar); Ergebnis in /home/timo/zurechnung.md festhalten.',
      vfsOverlay: {
        directories: ['/srv/logs', '/srv/inventar'],
        files: [
          { path: '/srv/logs/auth.log', content: authLog },
          { path: '/srv/inventar/konten_warm-waage.csv', content: kontenListe },
          { path: '/srv/inventar/arbeitsplaetze_werkstatt.csv', content: arbeitsplatzListe },
        ],
      },
      commands: [],
      commandSkillGain: { grep: { linux: 2, security: 1 }, cat: { linux: 1 }, awk: { linux: 2 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Wirklich verfolgt, nicht geraten.
            { commandRan: { pattern: '^\\s*(grep|awk|cat)\\b', outcome: 'succeeded' } },
            // Die Kontoliste ist der Punkt, an dem die Spur zerfällt.
            { fileRead: '/srv/inventar/konten_warm-waage.csv' },
            { file: '/home/timo/zurechnung.md', matches: 'warm-admin' },
            // Der Befund MUSS die Nichtzuordenbarkeit benennen. Ein Name allein
            // ist keine Zurechnung, sondern eine Behauptung.
            {
              file: '/home/timo/zurechnung.md',
              matches: '(nicht\\s+(eindeutig\\s+)?(zuordenbar|zuzuordnen)|keine\\s+Zurechnung|gemeinsam\\s+genutzt)',
            },
          ],
          resultText:
            'Der Login um 06:23 lief über `warm-admin` von 10.20.4.61 — dem Werkstatt-Terminal am Tor 2, an dem sich niemand persönlich anmelden muss.\n\n`warm-admin` teilen sich drei Kollegen und eine externe Firma. Die Spur ist vollständig und trotzdem wertlos: sie zeigt auf vier Personen.\n\nMerke: Ein geteiltes Konto ist kein Loggingproblem. Es ist eine Entscheidung, die man einmal trifft und danach bei jedem Vorfall bezahlt.',
          skillGain: { security: 6, troubleshooting: 3 },
          effects: {},
        },
      ],
      hints: [
        '🤖 Fang bei der Uhrzeit des Vorfalls an: gegen 06:25 wurde die Sitzung beendet.',
        '🤖 Du hast ein Konto und eine IP. Beides steht in den Listen unter /srv/inventar — schau nach, wem sie gehören.',
        '🤖 `grep -n warm-admin /srv/inventar/konten_warm-waage.csv` zeigt dir, wie viele Leute dieses Konto benutzen.',
        '🤖 Schreib den Befund so, dass er die Lücke benennt: `echo "warm-admin, gemeinsam genutzt — nicht zuordenbar" > /home/timo/zurechnung.md`',
      ],
    },
    tags: ['learning', 'nis2', 'zurechenbarkeit'],
  },

  /* ═══════════════ L5 ★ — Was im Audit hält (optional) ═════════════════ */
  {
    id: 'learn_nis2_05_belastbar',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_nis2_04_wer_war_das'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Pflicht & Nachweis ★: Was im Audit hält',
    description: `Alle drei Jahre muss WARM dem Bundesamt nachweisen, dass die Anforderungen erfüllt sind — durch Audits, Prüfungen oder Zertifizierungen, **einschließlich der dabei aufgedeckten Sicherheitsmängel** (§ 39 BSIG). Dokumentation ist dabei keine Fleißaufgabe, sondern eine Maßnahme des Risikomanagements nach §§ 30, 31 BSIG.

Von einem Verfahren liegen zwei Fassungen im Ordner. Eine davon hält im Audit, die andere nicht.

**Deine Aufgabe:** Vergleiche die beiden Dokumente in \`/srv/doku\` und halte in \`/home/timo/bewertung.md\` fest, welches belastbar ist.`,
    mentorNote:
      'Eine belastbare Dokumentation beantwortet vier Fragen, ohne dass man nachfragen muss: seit wann, durch wen, womit belegt, und was dabei nicht funktioniert hat. Besonders der letzte Punkt überrascht: § 39 verlangt ausdrücklich auch die aufgedeckten Mängel. Ein Nachweis ohne einen einzigen Mangel ist für einen Prüfer kein gutes Zeichen, sondern ein Hinweis darauf, dass nicht ernsthaft geprüft wurde.',
    choices: [
      {
        id: 'nis2_05_start',
        text: 'Die beiden Fassungen vergleichen.',
        effects: { skills: { security: 2, softSkills: 2 } },
        resultText:
          'Die alte Fassung behauptet, die Wiederherstellung sei getestet worden. Die neue nennt Datum, Verantwortlichen, Zielzeit, das Protokoll — und den Mangel, der beim Test auffiel.\n\nDie zweite ist kürzer im Anspruch und länger in der Substanz. Genau das sucht ein Prüfer.',
        terminalCommand: true,
        setsFlags: ['nis2_evidence_understood'],
      },
      {
        id: 'nis2_05_spaeter',
        text: 'Das ist Papierkram — später.',
        effects: {},
        resultText:
          'Verständlich. Nur ist es genau der Papierkram, nach dem alle drei Jahre jemand fragt, der nicht im Haus arbeitet und dem „das wissen wir hier alle" nichts sagt.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-adm-01',
      username: 'timo',
      currentPath: '/srv/doku',
      taskText:
        'Die beiden Fassungen in /srv/doku vergleichen; in /home/timo/bewertung.md festhalten, welche belastbar ist und warum.',
      vfsOverlay: {
        directories: ['/srv/doku', '/srv/nachweise'],
        files: [
          { path: '/srv/doku/wiederanlauf_alt.txt', content: dokuAlt },
          { path: '/srv/doku/wiederanlauf_2026-08.txt', content: dokuNeu },
          { path: '/srv/nachweise/wiederanlauf_2026-08.txt', content: nachweisProtokoll },
        ],
      },
      commands: [],
      commandSkillGain: { cat: { linux: 1 }, diff: { linux: 2 }, grep: { linux: 1 } },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/srv/doku/wiederanlauf_2026-08.txt' },
            // Das Protokoll ist der Beleg, auf den die gute Fassung verweist —
            // wer den Verweis nicht prüft, glaubt ihn nur.
            { fileRead: '/srv/nachweise/wiederanlauf_2026-08.txt' },
            { file: '/home/timo/bewertung.md', matches: '2026-08' },
          ],
          resultText:
            'Die Fassung vom 14.08.2026 hält: sie nennt einen Verantwortlichen mit Namen, ein Datum, eine Zielzeit, ein auffindbares Protokoll — und den Mangel, der beim Test auftrat, samt Behebung.\n\nDie alte Fassung sagt „wurde getestet und funktioniert". Das ist keine Dokumentation, das ist eine Meinung.\n\nMerke: § 39 verlangt die Nachweise einschließlich der aufgedeckten Mängel. Ein Prüfbericht ohne Befund wirkt nicht sauber, sondern unglaubwürdig.',
          skillGain: { security: 5, softSkills: 3 },
          effects: {},
        },
      ],
      hints: [
        '🤖 Lies beide Fassungen ganz. Der Unterschied ist nicht die Länge.',
        '🤖 Frag dich bei jedem Satz: könnte ein Fremder das morgen nachprüfen, ohne jemanden zu fragen?',
        '🤖 Eine der Fassungen verweist auf ein Protokoll. `cat /srv/nachweise/wiederanlauf_2026-08.txt` — gibt es das wirklich?',
        '🤖 Ergebnis festhalten: `echo "belastbar: wiederanlauf_2026-08 (Datum, Verantwortlicher, Protokoll, Mangel)" > /home/timo/bewertung.md`',
      ],
    },
    tags: ['learning', 'nis2', 'nachweis', 'optional'],
  },
];

/* ═══════════════ L2 + L3 — die Meldekaskade (GUI „Meldung") ═════════════ */

/** Felder der Erstmeldung nach § 32 Abs. 1 und Abs. 3 BSIG. */
const erstmeldungFelder = [
  {
    id: 'kenntnis',
    label: 'Zeitpunkt der Kenntnisnahme',
    kind: 'text' as const,
    required: true,
    hint: 'Der Moment, in dem IHR es wusstet — nicht der Beginn des Vorfalls. An ihm hängt die Frist.',
  },
  {
    id: 'art',
    label: 'Art des Vorfalls',
    kind: 'select' as const,
    required: true,
    options: [
      { id: 'ransomware', label: 'Verschlüsselung / Ransomware' },
      { id: 'unbefugt', label: 'Unbefugter Zugriff' },
      { id: 'ausfall', label: 'Ausfall ohne erkennbare Fremdeinwirkung' },
    ],
  },
  {
    id: 'systeme',
    label: 'Betroffene Dienste und Systeme',
    kind: 'multiselect' as const,
    required: true,
    options: [
      { id: 'fs_dispo', label: 'Dateiserver Disposition' },
      { id: 'waage', label: 'Waagensteuerung' },
      { id: 'mail', label: 'Mailserver' },
    ],
  },
  {
    id: 'boeswillig',
    label: 'Verdacht auf rechtswidrige oder böswillige Handlung',
    kind: 'tristate' as const,
    required: true,
  },
  {
    id: 'grenz',
    label: 'Grenzüberschreitende Auswirkungen',
    kind: 'tristate' as const,
    required: true,
  },
  {
    id: 'dienstleistung',
    label: 'Betroffene kritische Dienstleistung (§ 32 Abs. 3)',
    kind: 'select' as const,
    required: true,
    options: [
      { id: 'entsorgung', label: 'Siedlungsabfallentsorgung — Disposition' },
      { id: 'keine', label: 'keine kritische Dienstleistung betroffen' },
    ],
  },
  { id: 'bewertung', label: 'Erstbewertung (kurz)', kind: 'longtext' as const },
];

nis2Events.push(
  {
    id: 'learn_nis2_02_erstmeldung',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_nis2_01_schwelle'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Pflicht & Nachweis 2: Die ersten 24 Stunden',
    description: `Freitag, 17:40. Auf dem Dispo-Server sind die Dateien verschlüsselt. Die Tourenplanung für morgen steht.

§ 32 Abs. 1 BSIG: die Erstmeldung geht **unverzüglich, spätestens jedoch innerhalb von 24 Stunden** an die gemeinsame Meldestelle des BSI und des Bundesamts für Bevölkerungsschutz. 24 Stunden ist eine Obergrenze, kein Terminvorschlag.

Du weißt: wann ihr es gemerkt habt, welcher Server, dass Dateien unlesbar sind. Du weißt **nicht**: wie es hereinkam, ob Daten abgeflossen sind, ob andere Standorte betroffen sind.

**Deine Aufgabe:** Füll die Erstmeldung aus. Für das, was du nicht weißt, gibt es eine eigene Antwort.`,
    mentorNote:
      'Die Erstmeldung ist absichtlich niedrigschwellig — sie verlangt keine Analyse, sondern eine Anzeige. Genau deshalb ist „noch unbekannt" hier keine Schwäche, sondern die belegbare Antwort. Wer stattdessen „nein" schreibt, um das Formular sauber aussehen zu lassen, macht aus einer offenen Frage eine Falschangabe — und die steht in 72 Stunden neben dem Gegenteil.',
    choices: [
      {
        id: 'nis2_02_start',
        text: 'Erstmeldung ausfüllen.',
        effects: { skills: { security: 2, softSkills: 1 } },
        resultText: 'Die Meldung ist raus.',
        guiCommand: true,
      },
      {
        id: 'nis2_02_warten',
        text: 'Erst am Montag — bis dahin wissen wir mehr.',
        effects: { stress: 6, compliance: -8 },
        resultText:
          'Montag ist 63 Stunden nach Kenntnisnahme. Die Frist für die Erstmeldung war nach 24 Stunden vorbei, die für die Folgemeldung nach 72.\n\nIhr wisst am Montag tatsächlich mehr. Nur interessiert das niemanden mehr: die erste Frage der Aufsicht lautet jetzt nicht „was war los?", sondern „warum haben Sie nicht gemeldet?".\n\nGenau dafür ist die Erstmeldung niedrigschwellig — man soll sie abgeben können, BEVOR man es versteht.',
      },
    ],
    guiContext: {
      app: 'meldung',
      title: 'Meldung an die Meldestelle',
      hostname: 'warm-adm-01',
      briefing:
        'Erstmeldung nach § 32 Abs. 1 BSIG. Sie verlangt eine Anzeige, keine Analyse — für Unbekanntes gibt es „noch unbekannt".',
      state: {
        meldung: {
          stufe: 'erst',
          kenntnisSeit: '03:14 h',
          meldestelle: 'Gemeinsame Meldestelle des BSI und des BBK',
          rechtsgrundlage: '§ 32 Abs. 1 BSIG — Erstmeldung',
          felder: erstmeldungFelder,
        },
      },
      // REIHENFOLGE IST TEIL DES DESIGNS: Risiko vor Lob. Beide Lösungen
      // verlangen `submit` — beurteilt wird, was abgeschickt wurde, nicht was
      // zwischendurch angeklickt war. Eine korrigierte Angabe nimmt die App
      // über `retract` zurück (siehe useGuiLevel.retract).
      solutions: [
        {
          interactions: ['set:grenz:nein', 'submit'],
          allRequired: true,
          setsFlags: ['nis2_claimed_certainty'],
          resultText:
            'Abgeschickt, fristgerecht, vollständig ausgefüllt. Kein Feld offen.\n\nBei „grenzüberschreitende Auswirkungen" steht „nein". Das weiß nach drei Stunden niemand — du hast es hingeschrieben, damit das Formular sauber aussieht.\n\nDie Meldung ist raus. Die Aussage auch.',
          skillGain: { security: 1 },
        },
        {
          interactions: ['set:boeswillig:ja', 'set:grenz:unbekannt', 'submit'],
          allRequired: true,
          setsFlags: ['nis2_first_report_filed'],
          resultText:
            'Verschlüsselung ist kein Betriebsunfall — „Verdacht auf böswillige Handlung: ja" ist belegbar. Ob es über die Landesgrenze hinaus wirkt, weiß nach drei Stunden niemand: „noch unbekannt".\n\nDie Meldung ist in 14 Minuten fertig und in 3 Stunden 28 raus. Sie beantwortet nicht alles — sie behauptet aber auch nichts.\n\nMerke: Die Erstmeldung ist eine Anzeige, keine Analyse. Was offen ist, bleibt offen.',
          skillGain: { security: 7, softSkills: 3 },
        },
      ],
      hints: [
        '🤖 Geh die Felder einzeln durch und frag dich bei jedem: kann ich das gerade belegen?',
        '🤖 Zwei Felder haben drei mögliche Antworten. Eine davon ist nach drei Stunden für mindestens eines der beiden die einzige ehrliche.',
        '🤖 Verschlüsselung passiert nicht von allein — der Verdacht auf eine böswillige Handlung ist begründet: „ja".',
        '🤖 Ob andere Länder betroffen sind, weißt du nicht. Setz dort „noch unbekannt" und schick ab.',
      ],
    },
    tags: ['learning', 'nis2', 'meldepflicht', 'gui'],
  },
  {
    id: 'learn_nis2_03_folgemeldung',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_nis2_02_erstmeldung'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Pflicht & Nachweis 3: Nach 72 Stunden',
    description: `Sonntagmittag. Die Forensik hat den Eintrittsweg gefunden — und noch etwas: dieselbe Schadsoftware lief auch auf dem Dateiserver der Niederlassung in Straßburg.

§ 32 Abs. 1 BSIG verlangt **innerhalb von 72 Stunden** die Folgemeldung: Bestätigung oder Aktualisierung der Erstmeldung, dazu eine erste Bewertung mit Schweregrad, Auswirkungen und — soweit vorhanden — Kompromittierungsindikatoren.

**Deine Aufgabe:** Gib die Folgemeldung ab. Der Punkt ist nicht, was du inzwischen weißt, sondern ob du bereit bist, die Erstmeldung zu korrigieren.`,
    mentorNote:
      'Eine Folgemeldung, die die Erstmeldung nur bestätigt, ist selten richtig — sonst hätte man die 72 Stunden nicht gebraucht. Aktualisieren heißt auch: eine frühere Angabe zurücknehmen. Das ist unangenehm und trotzdem der harmlosere von zwei Wegen, denn die Alternative ist, eine falsche Angabe ein zweites Mal zu unterschreiben.',
    choices: [
      {
        id: 'nis2_03_start',
        text: 'Folgemeldung abgeben.',
        effects: { skills: { security: 2 } },
        resultText: 'Die Folgemeldung ist raus.',
        guiCommand: true,
      },
      {
        id: 'nis2_03_bestaetigen',
        text: 'Die Erstmeldung war richtig — ich bestätige sie unverändert.',
        effects: { stress: 8, compliance: -5 },
        resultText:
          'Du bestätigst einen Stand, den die Forensik seit gestern widerlegt.\n\nDie Abschlussmeldung in einem Monat wird beides enthalten: Straßburg, und die Folgemeldung, in der es nicht stand. Der Vorfall wird dadurch nicht schlimmer — eure Meldungen schon.',
      },
    ],
    guiContext: {
      app: 'meldung',
      title: 'Folgemeldung an die Meldestelle',
      hostname: 'warm-adm-01',
      briefing:
        'Folgemeldung nach § 32 Abs. 1 BSIG, 72 Stunden. Bestätigen ODER aktualisieren — beides ist erlaubt, eines ist richtig.',
      // Wer in der Erstmeldung Gewissheit behauptet hat, bekommt das hier
      // gesagt — der Widerspruch wird benannt, nicht verschwiegen.
      briefingVariants: [
        {
          flag: 'nis2_claimed_certainty',
          briefing:
            'Folgemeldung nach § 32 Abs. 1 BSIG. Achtung: in eurer Erstmeldung steht „grenzüberschreitende Auswirkungen: nein". Straßburg macht daraus eine Falschangabe — es sei denn, ihr korrigiert sie jetzt.',
        },
      ],
      state: {
        meldung: {
          stufe: 'folge',
          kenntnisSeit: '68:05 h',
          meldestelle: 'Gemeinsame Meldestelle des BSI und des BBK',
          rechtsgrundlage: '§ 32 Abs. 1 BSIG — Folgemeldung (72 Stunden)',
          vorbefund: [
            { label: 'Art des Vorfalls', value: 'Verschlüsselung / Ransomware' },
            { label: 'Verdacht auf böswillige Handlung', value: 'ja' },
            { label: 'Grenzüberschreitende Auswirkungen', value: 'wie in der Erstmeldung angegeben' },
          ],
          felder: [
            {
              id: 'schweregrad',
              label: 'Schweregrad',
              kind: 'select',
              required: true,
              options: [
                { id: 'gering', label: 'gering — kein Dienst beeinträchtigt' },
                { id: 'erheblich', label: 'erheblich — kritische Dienstleistung beeinträchtigt' },
                { id: 'schwer', label: 'schwer — Dienstleistung ausgefallen' },
              ],
            },
            {
              id: 'grenz',
              label: 'Grenzüberschreitende Auswirkungen',
              kind: 'tristate',
              required: true,
              hint: 'Neuer Stand seit der Erstmeldung berücksichtigen.',
            },
            {
              id: 'ioc',
              label: 'Kompromittierungsindikatoren (soweit vorhanden)',
              kind: 'text',
              hint: 'Hashes, IP-Adressen, Dateinamen — was andere zur Suche brauchen.',
            },
            { id: 'auswirkungen', label: 'Auswirkungen', kind: 'longtext', required: true },
          ],
        },
      },
      solutions: [
        {
          // Risiko vor Lob: an der falschen Angabe festhalten.
          interactions: ['set:grenz:nein', 'submit'],
          allRequired: true,
          setsFlags: ['nis2_doubled_down'],
          resultText:
            'Du hast „nein" ein zweites Mal abgeschickt — diesmal mit Kenntnis von Straßburg.\n\nDie erste Falschangabe war ein Fehler. Die zweite ist eine Entscheidung, und im Abschlussbericht wird genau dieser Unterschied stehen.',
          skillGain: {},
        },
        {
          interactions: ['set:grenz:ja', 'submit'],
          allRequired: true,
          setsFlags: ['nis2_followup_filed'],
          resultText:
            'Straßburg macht den Vorfall grenzüberschreitend — die Angabe wird korrigiert, nicht verteidigt.\n\nDie Meldestelle bekommt damit den Stand, auf den sie sich verlassen kann, und die Abschlussmeldung in einem Monat baut darauf auf statt dagegen.\n\nMerke: Eine Folgemeldung, die nur bestätigt, hätte man sich sparen können. Aktualisieren heißt auch zurücknehmen.',
          skillGain: { security: 7, softSkills: 4 },
        },
      ],
      hints: [
        '🤖 Vergleich den Vorbefund oben mit dem, was seit Freitag dazugekommen ist.',
        '🤖 Ein Standort in Frankreich ist betroffen. Was heißt das für die Frage nach grenzüberschreitenden Auswirkungen?',
        '🤖 Der Schweregrad richtet sich nach der Dienstleistung: die Tourenplanung stand, die Entsorgung lief eingeschränkt weiter.',
        '🤖 Setz „grenzüberschreitende Auswirkungen" auf „ja" und schick ab.',
      ],
    },
    tags: ['learning', 'nis2', 'meldepflicht', 'gui'],
  }
);
