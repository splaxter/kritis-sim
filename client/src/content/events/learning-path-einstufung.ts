import { GameEvent } from '@kritis/shared';

/**
 * Der Einstufungstest — die Abkürzung an den Grundlagen vorbei.
 *
 * Bewusst KEIN Track-Level (sonst müsste man ihn abschließen, um die
 * Grundlagen zu erfüllen). Er hängt allein am LearningHub und setzt bei Erfolg
 * `learn_foundations_proven`; `isFoundationsComplete` erkennt das Flag an.
 *
 * Zuschnitt: alle vier Grundlagen-Fertigkeiten in EINER Aufgabe — navigieren,
 * versteckte Dateien sehen, rekursiv suchen, Ergebnis umleiten. Wer das kann,
 * braucht Track 1 nicht. Wer es nicht kann, verliert nichts: der Test ist eine
 * Abkürzung, kein Tor.
 *
 * Die Hinweise sind absichtlich karg. hints[0] orientiert, nennt aber keinen
 * Befehl — wer die Syntax gesagt bekommen muss, gehört in den regulären Pfad.
 */

const exportKonten = `# Ausleitung Benutzerkonten — warm-srv-02, 2026-09-01
uid;name;abteilung;letzte_anmeldung
1001;m.becker;Disposition;2026-08-29
1002;s.olsen;Werkstatt;2026-08-30
1003;t.harms;Verwaltung;2026-08-28
`;

const exportDienste = `# Ausleitung Dienstkonten — warm-srv-02, 2026-09-01
dienst;konto;zweck
backup-agent;svc-archiv;nächtliche Sicherung
monitor;svc-monitor;Verfügbarkeitsprüfung
`;

const alteAusleitung = `# Ausleitung Dienstkonten — warm-srv-01, 2025-11-04 (Altbestand)
dienst;konto;zweck
backup-agent;svc-backup;nächtliche Sicherung
waage-sync;svc-waage;Übertragung Wiegedaten
`;

const versteckteNotiz = `# .notiz — Kalb, 10/2025
Das alte Backup-Konto läuft noch unter warm-srv-01.
Umstellung war für Q1 geplant, ist nicht passiert.
`;

export const einstufungEvents: GameEvent[] = [
  {
    id: 'learn_00_einstufung',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    category: 'training',
    involvedCharacters: [],
    title: 'Einstufungstest: Ein Durchgang',
    description: `Kein Tutorial. Eine Aufgabe, vier Handgriffe.

In \`/srv/export\` liegen Ausleitungen mehrerer Systeme — auch ältere, auch solche, die man auf den ersten Blick nicht sieht.

**Deine Aufgabe:** Finde heraus, in welcher Datei das Dienstkonto \`svc-backup\` vorkommt, und halte Dateinamen und Zeilennummer in \`/home/timo/befund.txt\` fest.

Wenn dir das nichts sagt: kein Problem — spiel die Grundlagen. Sie sind nicht lang, und sie sind gut.`,
    mentorNote:
      'Dieser Test ersetzt vier Lektionen, weil er dasselbe verlangt: sich in einem fremden Verzeichnis zurechtfinden, auch das sehen, was sich nicht von selbst zeigt, gezielt statt blätternd suchen, und ein Ergebnis so ablegen, dass ein anderer es morgen noch findet.',
    choices: [
      {
        id: 'einstufung_start',
        text: 'Test starten — ein Durchgang, kein Netz.',
        effects: { skills: { linux: 3, troubleshooting: 2 } },
        resultText: `Du hast die Datei gefunden und den Fund aufgeschrieben — mit Zeilennummer, damit ihn jemand nachprüfen kann.

Genau das sind die Grundlagen: nicht die Befehle, sondern die Gewohnheit, einen Fund belegbar zu machen.

Die Grundlagen sind damit für dich freigeschaltet. Sie bleiben spielbar, falls du sie doch sehen willst — aber niemand hält dich mehr auf.`,
        terminalCommand: true,
        setsFlags: ['learn_foundations_proven'],
      },
      {
        id: 'einstufung_lieber_nicht',
        text: 'Lieber doch der reguläre Weg — ich fang bei Grundlagen 1 an.',
        effects: {},
        resultText:
          'Vernünftig. Die vier Lektionen dauern zusammen keine halbe Stunde, und sie bauen genau die Gewohnheiten auf, an denen später alles hängt.\n\nDer Test bleibt stehen, falls du es dir anders überlegst.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-02',
      username: 'timo',
      currentPath: '/srv/export',
      // ACHTUNG: die zu schreibende Datei heisst befund.txt und enthält NICHT,
      // wonach gesucht wird. seedVfsFromScenario materialisiert jeden hier
      // genannten Pfad und füllt ihn mit dem Dateinamen — hiesse sie
      // svc-backup.txt, fände die Suche ihr eigenes Ergebnis.
      taskText:
        'In /srv/export: finde heraus, in welcher Datei das Dienstkonto svc-backup vorkommt, und halte Dateinamen und Zeilennummer in /home/timo/befund.txt fest.',
      vfsOverlay: {
        directories: ['/srv/export', '/srv/export/altbestand'],
        files: [
          { path: '/srv/export/konten_2026-09.csv', content: exportKonten },
          { path: '/srv/export/dienste_2026-09.csv', content: exportDienste },
          { path: '/srv/export/altbestand/dienste_2025-11.csv', content: alteAusleitung },
          { path: '/srv/export/.notiz', content: versteckteNotiz },
        ],
      },
      commands: [],
      commandSkillGain: {
        grep: { linux: 3, troubleshooting: 2 },
        ls: { linux: 1 },
        find: { linux: 2 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Wirklich gesucht, nicht geraten: rekursiv oder mit Zeilennummern.
            // Verankert, weil commandRan die Kommandozeile als TEXT matcht —
            // ohne ^ erfüllt ein echo "… grep -rn …" das Ziel.
            { commandRan: { pattern: '^\\s*grep\\s.*-[a-zA-Z]*[rn]', outcome: 'succeeded' } },
            // Die Trefferdatei muss gelesen worden sein (semantisch, nicht wörtlich).
            { fileRead: '/srv/export/altbestand/dienste_2025-11.csv' },
            // Und der Befund muss beides tragen: Datei UND Zeilennummer.
            // svc-backup steht in Zeile 3 (Kopfzeile, Spaltenzeile, dann der
            // Treffer). `matches` ist ein Regex, also sind beide Schreibweisen
            // erlaubt: die rohe grep-Ausgabe `…csv:3:` und ein von Hand
            // getipptes „Zeile 3". Eine bloße 3 irgendwo im Text genügt
            // NICHT — sonst bestünde der Befund auch ohne Fundstelle.
            { file: '/home/timo/befund.txt', matches: 'dienste_2025-11' },
            { file: '/home/timo/befund.txt', matches: '(:\\s*3\\s*:|[Zz]eile\\s*3)' },
          ],
          resultText:
            'dienste_2025-11.csv, Zeile 3. Der Altbestand auf warm-srv-01 — genau die Ausleitung, die man übersieht, wenn man nur das aktuelle Verzeichnis durchsieht.\n\nMerke: Ein Fund ohne Fundstelle ist eine Behauptung. Die Zeilennummer ist der Unterschied.',
          skillGain: { linux: 5, troubleshooting: 3, security: 2 },
          effects: {},
        },
      ],
      hints: [
        '🤖 Der Ordner zeigt dir nicht alles, was in ihm liegt — und er hat einen Unterordner.',
        '🤖 Du suchst eine Zeichenkette in mehreren Dateien und willst wissen, wo genau sie steht.',
        '🤖 `grep -rn svc-backup /srv/export` durchsucht alles darunter und nennt Datei und Zeile.',
        '🤖 Das Ergebnis gehört in eine Datei: `... > /home/timo/befund.txt`',
      ],
    },
    tags: ['learning', 'foundations', 'einstufung'],
  },
];
