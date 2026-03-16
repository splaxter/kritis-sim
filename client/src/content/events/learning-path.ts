/**
 * Learning Mode - Progressive CLI Training Path
 *
 * CLI-only events with increasing difficulty:
 * Level 1 (Week 1-2): Basic navigation & file operations
 * Level 2 (Week 3-4): Process management & services
 * Level 3 (Week 5-6): Network diagnostics
 * Level 4 (Week 7-8): Log analysis & security
 * Level 5 (Week 9-10): PowerShell & Windows admin
 * Level 6 (Week 11-12): Advanced troubleshooting
 */

import { GameEvent } from '@kritis/shared';

export const learningPathEvents: GameEvent[] = [
  // ============================================
  // LEVEL 1: BASIC NAVIGATION (Week 1-2)
  // ============================================

  {
    id: 'learn_01_pwd_ls',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 1: Wo bin ich?',
    description: `Willkommen im Lernmodus! Hier lernst du systematisch alle wichtigen CLI-Befehle.

**Lernziel:** Grundlegende Navigation im Dateisystem

**Deine Aufgabe - probiere diese Befehle aus:**
\`\`\`
pwd          → Zeigt dein aktuelles Verzeichnis
ls           → Zeigt Dateien und Ordner
\`\`\`

Tippe beide Befehle nacheinander ein, um die Lektion abzuschließen.`,
    mentorNote: 'pwd (print working directory) und ls (list) sind die ersten Befehle, die jeder Admin lernt. Sie helfen dir, dich im Dateisystem zu orientieren.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen und loslegen',
        effects: { skills: { linux: 3 } },
        resultText: 'Grundlagen gemeistert! Du weißt jetzt immer, wo du bist.',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '/home/azubi',
      vfsOverlay: {
        directories: [
          '/home/azubi/Desktop',
          '/home/azubi/Dokumente',
          '/home/azubi/Downloads',
          '/home/azubi/logs',
          '/home/azubi/scripts',
        ],
        files: [
          { path: '/home/azubi/logs/system.log', content: 'Log content...' },
          { path: '/home/azubi/logs/access.log', content: 'Access log...' },
          { path: '/home/azubi/logs/error.log', content: 'Error log...' },
        ],
      },
      commands: [
        {
          pattern: 'pwd',
          output: '/home/azubi',
          teachesCommand: 'pwd',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls',
          output: 'Desktop  Dokumente  Downloads  logs  scripts',
          teachesCommand: 'ls',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls -l',
          output: `total 20
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Desktop
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Dokumente
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Downloads
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 logs
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 scripts`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls -la',
          output: `total 32
drwxr-xr-x 7 azubi azubi 4096 Mär 15 09:00 .
drwxr-xr-x 3 root  root  4096 Mär 14 08:00 ..
-rw-r--r-- 1 azubi azubi  220 Mär 14 08:00 .bash_logout
-rw-r--r-- 1 azubi azubi 3526 Mär 14 08:00 .bashrc
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Desktop
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Dokumente
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 Downloads
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 logs
drwxr-xr-x 2 azubi azubi 4096 Mär 15 09:00 scripts`,
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['pwd', 'ls'],
          allRequired: true,
          resultText: 'Perfekt! Du kannst dich jetzt orientieren.',
          skillGain: { linux: 5 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '💡 Tippe `pwd` um dein aktuelles Verzeichnis zu sehen.',
        '💡 Tippe `ls` um den Inhalt des Verzeichnisses anzuzeigen.',
        '💡 Mit `ls -la` siehst du auch versteckte Dateien (mit Punkt am Anfang).',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1'],
  },

  {
    id: 'learn_02_cd',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_01_pwd_ls'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 2: Navigation',
    description: `**Lernziel:** Verzeichnisse wechseln

**Deine Aufgabe - probiere diese Befehle aus:**
\`\`\`
cd logs      → Wechsle in den "logs" Ordner
cd ..        → Gehe eine Ebene zurück
\`\`\`

Weitere nützliche Varianten:
- \`cd ~\` - Zurück ins Home-Verzeichnis
- \`cd /\` - Ins Wurzelverzeichnis`,
    mentorNote: 'cd ist dein Bewegungsbefehl. Mit Tab-Vervollständigung (Tab drücken) sparst du Tipparbeit.',
    choices: [
      {
        id: 'start',
        text: 'Navigation üben',
        effects: { skills: { linux: 3 } },
        resultText: 'Du kannst dich jetzt frei im Dateisystem bewegen!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '/home/azubi',
      vfsOverlay: {
        directories: [
          '/home/azubi/Desktop',
          '/home/azubi/Dokumente',
          '/home/azubi/Downloads',
          '/home/azubi/logs',
          '/home/azubi/scripts',
          '/var/log',
        ],
        files: [
          { path: '/home/azubi/logs/system.log', content: 'Log content...' },
          { path: '/home/azubi/logs/access.log', content: 'Access log...' },
          { path: '/home/azubi/logs/error.log', content: 'Error log...' },
        ],
      },
      commands: [
        {
          pattern: 'cd logs',
          output: '',
          teachesCommand: 'cd logs',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'pwd',
          output: '/home/azubi/logs',
          skillGain: { linux: 1 },
        },
        {
          pattern: 'ls',
          output: 'access.log  error.log  system.log',
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cd ..',
          output: '',
          teachesCommand: 'cd ..',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cd /var/log',
          output: '',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cd ~',
          output: '',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cd',
          output: '',
          skillGain: { linux: 1 },
        },
      ],
      solutions: [
        {
          commands: ['cd logs', 'cd ..'],
          allRequired: true,
          resultText: 'Navigation gemeistert!',
          skillGain: { linux: 5 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '💡 Wechsle mit `cd logs` in den logs-Ordner.',
        '💡 Prüfe mit `pwd` ob du richtig bist.',
        '💡 Mit `cd ..` gehst du wieder zurück.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1'],
  },

  {
    id: 'learn_03_cat_head_tail',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_02_cd'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 3: Dateien lesen',
    description: `**Lernziel:** Dateiinhalte anzeigen

**Deine Aufgabe - probiere diese Befehle aus:**
\`\`\`
cat system.log    → Zeigt die komplette Datei
tail system.log   → Zeigt die letzten Zeilen
\`\`\`

Weitere Optionen:
- \`head datei\` - Zeigt die ersten 10 Zeilen
- \`head -n 5 datei\` - Nur die ersten 5 Zeilen`,
    mentorNote: 'cat ist gefährlich bei großen Dateien - es scrollt endlos. head/tail sind sicherer für einen ersten Blick.',
    choices: [
      {
        id: 'start',
        text: 'Log-Dateien untersuchen',
        effects: { skills: { linux: 3 } },
        resultText: 'Du kannst jetzt effizient Dateien lesen!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '/home/azubi/logs',
      vfsOverlay: {
        files: [
          {
            path: '/home/azubi/logs/system.log',
            content: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:01:00 [INFO] Dienste geladen
2026-03-15 08:02:00 [INFO] Netzwerk verbunden
2026-03-15 08:15:22 [WARN] Hohe CPU-Auslastung: 85%
2026-03-15 08:20:00 [INFO] Backup gestartet
2026-03-15 08:45:00 [INFO] Backup abgeschlossen
2026-03-15 09:00:00 [ERROR] Dienst httpd nicht erreichbar
2026-03-15 09:00:30 [INFO] httpd neugestartet`,
          },
          {
            path: '/home/azubi/logs/access.log',
            content: `192.168.1.100 - - [15/Mar/2026:08:00:00] "GET / HTTP/1.1" 200 1234
192.168.1.101 - - [15/Mar/2026:08:00:01] "GET /api HTTP/1.1" 200 567
192.168.1.102 - - [15/Mar/2026:08:00:02] "POST /login HTTP/1.1" 302 89`,
          },
          {
            path: '/home/azubi/logs/error.log',
            content: `[15/Mar/2026:09:00:00] [error] Connection refused to backend
[15/Mar/2026:09:15:00] [warn] High memory usage detected`,
          },
        ],
      },
      commands: [
        {
          pattern: 'ls',
          output: 'access.log  error.log  system.log',
        },
        {
          pattern: 'cat system.log',
          output: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:01:00 [INFO] Dienste geladen
2026-03-15 08:02:00 [INFO] Netzwerk verbunden
2026-03-15 08:15:22 [WARN] Hohe CPU-Auslastung: 85%
2026-03-15 08:20:00 [INFO] Backup gestartet
2026-03-15 08:45:00 [INFO] Backup abgeschlossen
2026-03-15 09:00:00 [ERROR] Dienst httpd nicht erreichbar
2026-03-15 09:00:30 [INFO] httpd neugestartet`,
          teachesCommand: 'cat',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'head system.log',
          output: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:01:00 [INFO] Dienste geladen
2026-03-15 08:02:00 [INFO] Netzwerk verbunden
2026-03-15 08:15:22 [WARN] Hohe CPU-Auslastung: 85%
2026-03-15 08:20:00 [INFO] Backup gestartet`,
          teachesCommand: 'head',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'tail system.log',
          output: `2026-03-15 08:45:00 [INFO] Backup abgeschlossen
2026-03-15 09:00:00 [ERROR] Dienst httpd nicht erreichbar
2026-03-15 09:00:30 [INFO] httpd neugestartet`,
          teachesCommand: 'tail',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'head -n 3 system.log',
          output: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:01:00 [INFO] Dienste geladen
2026-03-15 08:02:00 [INFO] Netzwerk verbunden`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'tail -n 2 system.log',
          output: `2026-03-15 09:00:00 [ERROR] Dienst httpd nicht erreichbar
2026-03-15 09:00:30 [INFO] httpd neugestartet`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['cat', 'tail'],
          allRequired: true,
          resultText: 'Datei-Befehle gemeistert!',
          skillGain: { linux: 5, troubleshooting: 3 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '💡 Zeige den Inhalt mit `cat system.log`.',
        '💡 Für die letzten Einträge nutze `tail system.log`.',
        '💡 Mit `tail -n 5` siehst du nur die letzten 5 Zeilen.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level1'],
  },

  // ============================================
  // LEVEL 2: GREP & PIPES (Week 3-4)
  // ============================================

  {
    id: 'learn_04_grep_basics',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_03_cat_head_tail'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 4: Textsuche mit grep',
    description: `**Lernziel:** In Dateien suchen

**Deine Aufgabe - probiere diese Befehle aus:**
\`\`\`
grep ERROR syslog       → Suche "ERROR" in syslog
grep -c ERROR syslog    → Zähle die Treffer
\`\`\`

Weitere Optionen:
- \`-i\` - Groß/Kleinschreibung ignorieren
- \`-n\` - Zeilennummern anzeigen`,
    mentorNote: 'grep steht für "Global Regular Expression Print". In der Praxis nutzt du es täglich für Log-Analyse.',
    choices: [
      {
        id: 'start',
        text: 'Fehler suchen',
        effects: { skills: { linux: 4 } },
        resultText: 'grep ist jetzt dein Freund!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'ls',
          output: 'auth.log  kern.log  syslog  apache2/',
        },
        {
          pattern: 'grep ERROR syslog',
          output: `Mar 15 09:00:00 server1 httpd: [ERROR] Connection refused
Mar 15 09:15:00 server1 mysql: [ERROR] Too many connections
Mar 15 10:30:00 server1 httpd: [ERROR] Timeout`,
          teachesCommand: 'grep',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'grep -i error syslog',
          output: `Mar 15 09:00:00 server1 httpd: [ERROR] Connection refused
Mar 15 09:15:00 server1 mysql: [ERROR] Too many connections
Mar 15 09:45:00 server1 app: Error in module auth
Mar 15 10:30:00 server1 httpd: [ERROR] Timeout`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'grep -n ERROR syslog',
          output: `15:Mar 15 09:00:00 server1 httpd: [ERROR] Connection refused
23:Mar 15 09:15:00 server1 mysql: [ERROR] Too many connections
47:Mar 15 10:30:00 server1 httpd: [ERROR] Timeout`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'grep -c ERROR syslog',
          output: '3',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'grep "failed" auth.log',
          output: `Mar 15 08:00:15 server1 sshd: Failed password for admin
Mar 15 08:00:18 server1 sshd: Failed password for admin
Mar 15 08:00:21 server1 sshd: Failed password for admin
Mar 15 08:00:24 server1 sshd: Failed password for root`,
          skillGain: { linux: 3, security: 2 },
        },
      ],
      solutions: [
        {
          commands: ['grep ERROR', 'grep -c'],
          allRequired: false,
          resultText: 'Du kannst jetzt gezielt in Logs suchen!',
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Suche Fehler mit `grep ERROR syslog`.',
        '💡 Zähle die Fehler mit `grep -c ERROR syslog`.',
        '💡 Mit `-n` siehst du auch die Zeilennummern.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level2'],
  },

  {
    id: 'learn_05_pipes',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_basics'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 5: Pipes - Befehle verketten',
    description: `**Lernziel:** Befehle mit | verbinden

**Deine Aufgabe - probiere diesen Befehl aus:**
\`\`\`
grep Failed auth.log | wc -l    → Zähle fehlgeschlagene Logins
\`\`\`

Die Pipe \`|\` leitet die Ausgabe eines Befehls an den nächsten:
- \`cat datei | grep fehler\` - Datei lesen, dann filtern
- \`ls -la | head\` - Liste anzeigen, nur erste Zeilen`,
    mentorNote: 'Pipes sind das Herzstück der Unix-Philosophie: Kleine Programme, die eine Sache gut machen und kombiniert werden können.',
    choices: [
      {
        id: 'start',
        text: 'Befehle verketten lernen',
        effects: { skills: { linux: 5 } },
        resultText: 'Pipes machen dich zum Power-User!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'cat auth.log | grep Failed',
          output: `Mar 15 08:00:15 server1 sshd: Failed password for admin
Mar 15 08:00:18 server1 sshd: Failed password for admin
Mar 15 08:00:21 server1 sshd: Failed password for admin
Mar 15 08:00:24 server1 sshd: Failed password for root`,
          teachesCommand: 'pipe',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'cat auth.log | grep Failed | wc -l',
          output: '4',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'grep Failed auth.log | wc -l',
          output: '4',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ps aux | grep apache',
          output: `www-data  1234  0.5  2.0 234567 12345 ?  S  08:00  0:01 /usr/sbin/apache2
www-data  1235  0.3  1.5 234567 12345 ?  S  08:00  0:00 /usr/sbin/apache2
root      5678  0.0  0.0  12345   987 pts/0 S+ 10:00  0:00 grep apache`,
          skillGain: { linux: 3 },
        },
        {
          pattern: 'ls -la /var/log | head -5',
          output: `total 2048
drwxr-xr-x 10 root root    4096 Mär 15 00:00 .
drwxr-xr-x 14 root root    4096 Mär 14 08:00 ..
-rw-r-----  1 root adm    12345 Mär 15 10:00 auth.log
-rw-r-----  1 root adm    54321 Mär 15 10:00 kern.log`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['|', 'wc'],
          allRequired: true,
          resultText: 'Du beherrschst jetzt Pipes!',
          skillGain: { linux: 6, troubleshooting: 4 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Kombiniere grep mit wc: `grep Failed auth.log | wc -l`',
        '💡 wc -l zählt die Zeilen der Eingabe.',
        '💡 Du kannst beliebig viele Pipes verketten.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level2'],
  },

  // ============================================
  // LEVEL 3: PROZESSE & SERVICES (Week 4-5)
  // ============================================

  {
    id: 'learn_06_ps_processes',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_05_pipes'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 6: Prozesse anzeigen',
    description: `**Lernziel:** Laufende Prozesse verstehen

**Deine Aufgabe - finde den CPU-Fresser:**
\`\`\`
ps aux              → Zeige alle Prozesse
ps aux | grep php   → Filtere nach "php"
\`\`\`

Die %CPU Spalte zeigt die CPU-Auslastung. Finde den Prozess mit hoher Last!`,
    mentorNote: 'ps zeigt einen Snapshot, top/htop zeigen Live-Daten. Bei Performance-Problemen immer zuerst top checken.',
    choices: [
      {
        id: 'start',
        text: 'Prozesse untersuchen',
        effects: { skills: { linux: 4 } },
        resultText: 'Du siehst jetzt was auf dem System läuft!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '~',
      commands: [
        {
          pattern: 'ps aux',
          output: `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1  12345  6789 ?        Ss   08:00   0:01 /sbin/init
root       234  0.1  0.5  98765 12345 ?        S    08:00   0:05 /usr/sbin/sshd
www-data   567 85.5  2.0 234567 98765 ?        R    09:00   5:23 /usr/bin/php-cgi
mysql      890  1.2  4.0 567890 45678 ?        Sl   08:00   0:45 /usr/sbin/mysqld
azubi     1234  0.0  0.1  12345  2345 pts/0    R+   10:00   0:00 ps aux`,
          teachesCommand: 'ps',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'ps aux | grep php',
          output: `www-data   567 85.5  2.0 234567 98765 ?        R    09:00   5:23 /usr/bin/php-cgi
azubi     1235  0.0  0.0  12345   987 pts/0    S+   10:00   0:00 grep php`,
          skillGain: { linux: 3, troubleshooting: 2 },
        },
        {
          pattern: 'top',
          output: `top - 10:15:00 up 2:15, 1 user, load average: 2.50, 1.80, 1.20
Tasks: 120 total, 2 running, 118 sleeping
%Cpu(s): 85.5 us, 5.0 sy, 0.0 ni, 9.0 id, 0.5 wa

  PID USER      %CPU %MEM    TIME+ COMMAND
  567 www-data  85.5  2.0   5:23.45 php-cgi
  890 mysql      1.2  4.0   0:45.12 mysqld
  234 root       0.1  0.5   0:05.00 sshd

[q zum Beenden]`,
          teachesCommand: 'top',
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['ps aux', 'grep'],
          allRequired: true,
          resultText: 'Prozess gefunden: php-cgi verbraucht 85% CPU!',
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Zeige alle Prozesse mit `ps aux`.',
        '💡 Die %CPU Spalte zeigt die CPU-Auslastung.',
        '💡 Filtere mit `ps aux | grep prozessname`.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level3'],
  },

  {
    id: 'learn_07_systemctl',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_06_ps_processes'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 7: Dienste verwalten',
    description: `**Lernziel:** Systemdienste steuern mit systemctl

**Deine Aufgabe - Apache reparieren:**
\`\`\`
systemctl status apache2    → Prüfe den Status
systemctl start apache2     → Starte den Dienst
\`\`\`

Weitere systemctl-Befehle:
- \`systemctl stop dienst\` - Dienst stoppen
- \`systemctl restart dienst\` - Dienst neustarten`,
    mentorNote: 'systemctl ersetzt die alten init.d-Skripte. Fast alle modernen Linux-Distros nutzen systemd.',
    choices: [
      {
        id: 'start',
        text: 'Dienste untersuchen',
        effects: { skills: { linux: 5 } },
        resultText: 'Du kannst jetzt Dienste verwalten!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'root',
      currentPath: '~',
      commands: [
        {
          pattern: 'systemctl status apache2',
          output: `● apache2.service - The Apache HTTP Server
   Loaded: loaded (/lib/systemd/system/apache2.service; enabled)
   Active: inactive (dead) since Mon 2026-03-15 09:00:00 CET
  Process: 1234 ExecStop=/usr/sbin/apachectl stop (code=exited, status=0)

Mär 15 09:00:00 server1 systemd[1]: Stopped The Apache HTTP Server.`,
          teachesCommand: 'systemctl',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'systemctl start apache2',
          output: '',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'systemctl restart apache2',
          output: '',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl is-active apache2',
          output: 'active',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl list-units --type=service --state=running',
          output: `UNIT                     LOAD   ACTIVE SUB     DESCRIPTION
apache2.service          loaded active running The Apache HTTP Server
mysql.service            loaded active running MySQL Server
ssh.service              loaded active running OpenSSH server`,
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['systemctl status', 'systemctl start'],
          allRequired: true,
          resultText: 'Apache läuft wieder!',
          skillGain: { linux: 6, troubleshooting: 4 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Prüfe den Status mit `systemctl status apache2`.',
        '💡 Der Dienst ist "inactive" - starte ihn mit `systemctl start apache2`.',
        '💡 Prüfe nochmal den Status zur Bestätigung.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level3'],
  },

  // ============================================
  // LEVEL 4: NETZWERK (Week 5-6)
  // ============================================

  {
    id: 'learn_08_network_basics',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_07_systemctl'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 8: Netzwerk-Diagnose',
    description: `**Lernziel:** Netzwerkprobleme diagnostizieren

**Deine Aufgabe - Netzwerk prüfen:**
\`\`\`
ping -c 3 192.168.1.1       → Teste Erreichbarkeit
nslookup webserver.local    → Prüfe DNS-Auflösung
\`\`\`

Weitere Befehle:
- \`ip addr\` - Zeige eigene IP-Adressen
- \`ss -tulpn\` - Zeige offene Ports`,
    mentorNote: 'Immer systematisch vorgehen: 1) Eigene IP prüfen 2) Ziel pingen 3) DNS checken 4) Ports prüfen',
    choices: [
      {
        id: 'start',
        text: 'Netzwerk diagnostizieren',
        effects: { skills: { netzwerk: 5 } },
        resultText: 'Netzwerk-Diagnose gemeistert!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'lern-vm',
      username: 'azubi',
      currentPath: '~',
      commands: [
        {
          pattern: 'ip addr',
          output: `1: lo: <LOOPBACK,UP> mtu 65536
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0`,
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
3 packets transmitted, 3 received, 0% packet loss`,
          teachesCommand: 'ping',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'ping -c 3 webserver.local',
          output: `PING webserver.local (192.168.1.50) 56(84) bytes of data.
64 bytes from webserver.local: icmp_seq=1 ttl=64 time=0.8 ms
64 bytes from webserver.local: icmp_seq=2 ttl=64 time=0.7 ms
64 bytes from webserver.local: icmp_seq=3 ttl=64 time=0.7 ms`,
          skillGain: { netzwerk: 2 },
        },
        {
          pattern: 'nslookup webserver.local',
          output: `Server:		192.168.1.1
Address:	192.168.1.1#53

Name:	webserver.local
Address: 192.168.1.50`,
          teachesCommand: 'nslookup',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'ss -tulpn',
          output: `Netid  State   Local Address:Port   Process
tcp    LISTEN  0.0.0.0:22            sshd
tcp    LISTEN  0.0.0.0:80            apache2
tcp    LISTEN  0.0.0.0:443           apache2
tcp    LISTEN  127.0.0.1:3306        mysqld`,
          teachesCommand: 'ss',
          skillGain: { netzwerk: 3, security: 2 },
        },
      ],
      solutions: [
        {
          commands: ['ping', 'nslookup'],
          allRequired: true,
          resultText: 'Netzwerk funktioniert - Problem liegt woanders!',
          skillGain: { netzwerk: 6, troubleshooting: 4 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Prüfe deine IP mit `ip addr`.',
        '💡 Teste Erreichbarkeit mit `ping -c 3 ziel`.',
        '💡 Prüfe DNS mit `nslookup hostname`.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'level4', 'network'],
  },

  // ============================================
  // LEVEL 5: POWERSHELL (Week 7-8)
  // ============================================

  {
    id: 'learn_09_powershell_basics',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_08_network_basics'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 9: PowerShell Grundlagen',
    description: `**Lernziel:** Windows-Administration mit PowerShell

**Deine Aufgabe - Windows-Server prüfen:**
\`\`\`
Get-Service     → Zeige alle Dienste
Get-Process     → Zeige alle Prozesse
\`\`\`

PowerShell nutzt Cmdlets im Format Verb-Noun.
Mit \`| Where-Object {...}\` kannst du filtern.`,
    mentorNote: 'PowerShell ist objektorientiert - die Ausgabe sind Objekte, nicht Text. Das macht Filterung mächtiger.',
    choices: [
      {
        id: 'start',
        text: 'PowerShell starten',
        effects: { skills: { windows: 5 } },
        resultText: 'PowerShell-Grundlagen gemeistert!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'WIN-SRV01',
      username: 'Administrator',
      currentPath: 'C:\\Users\\Administrator',
      commands: [
        {
          pattern: 'Get-Service',
          output: `Status   Name               DisplayName
------   ----               -----------
Running  W32Time            Windows-Zeitgeber
Running  wuauserv           Windows Update
Stopped  BITS               Intelligenter Hintergrund...
Running  Spooler            Druckwarteschlange`,
          teachesCommand: 'Get-Service',
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Get-Service | Where-Object {$_.Status -eq "Stopped"}',
          output: `Status   Name               DisplayName
------   ----               -----------
Stopped  BITS               Intelligenter Hintergrund...`,
          skillGain: { windows: 4 },
        },
        {
          pattern: 'Get-Process',
          output: `Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName
-------  ------  -----   -----   ------    --  -----------
    234      15  12345   23456     1.23  1234  explorer
    567      25  34567   45678     5.67  2345  svchost
    890      35  56789   67890    10.00  3456  powershell`,
          teachesCommand: 'Get-Process',
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5',
          output: `Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName
-------  ------  -----   -----   ------    --  -----------
    890      35  56789   67890    10.00  3456  powershell
    567      25  34567   45678     5.67  2345  svchost
    234      15  12345   23456     1.23  1234  explorer`,
          skillGain: { windows: 4 },
        },
      ],
      solutions: [
        {
          commands: ['Get-Service', 'Get-Process'],
          allRequired: true,
          resultText: 'Du kannst jetzt Windows mit PowerShell administrieren!',
          skillGain: { windows: 6, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Zeige Dienste mit `Get-Service`.',
        '💡 Zeige Prozesse mit `Get-Process`.',
        '💡 Mit `| Where-Object {...}` filterst du Ergebnisse.',
      ],
    },
    tags: ['learning', 'terminal', 'windows', 'powershell', 'level5'],
  },

  // ============================================
  // LEVEL 6: ADVANCED (Week 9-12)
  // ============================================

  {
    id: 'learn_10_incident_analysis',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_09_powershell_basics'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Lektion 10: Incident-Analyse',
    description: `**Lernziel:** Sicherheitsvorfälle analysieren

**Alarm:** Verdächtige Login-Versuche erkannt!

**Deine Aufgabe - Analysiere den Angriff:**
\`\`\`
grep "Failed password" auth.log    → Finde fehlgeschlagene Logins
grep "Failed password" auth.log | wc -l   → Zähle die Versuche
\`\`\`

Identifiziere die Angreifer-IP und dokumentiere den Vorfall!`,
    mentorNote: 'Bei Incidents: Ruhe bewahren, dokumentieren, eskalieren wenn nötig. Die Beweissicherung ist wichtiger als schnelle Reaktion.',
    choices: [
      {
        id: 'start',
        text: 'Incident analysieren',
        effects: { skills: { security: 6 } },
        resultText: 'Incident erfolgreich analysiert!',
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
          pattern: 'grep "Failed password" auth.log',
          output: `Mar 15 02:15:01 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:03 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:05 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:07 server sshd: Failed password for admin from 185.234.72.15
Mar 15 02:15:09 server sshd: Failed password for admin from 185.234.72.15
Mar 15 02:15:11 server sshd: Failed password for test from 185.234.72.15`,
          skillGain: { security: 3 },
        },
        {
          pattern: 'grep "Failed password" auth.log | wc -l',
          output: '47',
          skillGain: { security: 2 },
        },
        {
          pattern: 'grep "185.234.72.15" auth.log | head -5',
          output: `Mar 15 02:15:01 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:03 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:05 server sshd: Failed password for root from 185.234.72.15
Mar 15 02:15:07 server sshd: Failed password for admin from 185.234.72.15
Mar 15 02:15:09 server sshd: Failed password for admin from 185.234.72.15`,
          skillGain: { security: 3 },
        },
        {
          pattern: "grep 'Failed password' auth.log | awk '{print $11}' | sort | uniq -c | sort -rn",
          output: `     47 185.234.72.15
      3 192.168.1.50`,
          skillGain: { security: 4, linux: 3 },
        },
        {
          pattern: 'whois 185.234.72.15',
          output: `% RIPE Database
netname:        RU-BULLETPROOF
country:        RU
descr:          Suspicious hosting provider`,
          skillGain: { security: 3 },
        },
      ],
      solutions: [
        {
          commands: ['grep', 'wc -l', '185.234.72.15'],
          allRequired: false,
          resultText: 'Brute-Force-Angriff von 185.234.72.15 identifiziert! 47 Versuche in kurzer Zeit.',
          skillGain: { security: 8, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Suche nach fehlgeschlagenen Logins: `grep "Failed password" auth.log`',
        '💡 Zähle die Versuche: `grep "Failed password" auth.log | wc -l`',
        '💡 Finde die Quell-IP und recherchiere sie.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'security', 'level6'],
  },

  {
    id: 'learn_11_final_challenge',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_10_incident_analysis'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Abschlussprüfung: Server-Diagnose',
    description: `**Finale Herausforderung** - Ein Server hat Probleme!

**Systematische Diagnose:**
\`\`\`
ps aux | head -10              → Prüfe Prozesse (CPU?)
systemctl status apache2       → Prüfe Dienste
tail -20 /var/log/syslog       → Lies die Logs
\`\`\`

Kombiniere alle gelernten Befehle, um das Problem zu finden!`,
    mentorNote: 'Das ist eine realistische Troubleshooting-Aufgabe. Methodisches Vorgehen ist wichtiger als Geschwindigkeit.',
    choices: [
      {
        id: 'start',
        text: 'Diagnose starten',
        effects: { skills: { troubleshooting: 8 } },
        resultText: 'Herzlichen Glückwunsch! Du hast die Abschlussprüfung bestanden!',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'prod-server',
      username: 'admin',
      currentPath: '~',
      commands: [
        {
          pattern: 'ps aux | head -10',
          output: `USER       PID %CPU %MEM COMMAND
root         1  0.0  0.1 /sbin/init
root       234  0.1  0.5 /usr/sbin/sshd
www-data   567 95.0  8.0 /usr/bin/java -Xmx512m
mysql      890  5.2  4.0 /usr/sbin/mysqld`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl status apache2',
          output: `● apache2.service - The Apache HTTP Server
   Active: inactive (dead)`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl status mysql',
          output: `● mysql.service - MySQL Server
   Active: active (running)`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'tail -20 /var/log/syslog',
          output: `Mar 15 10:00:00 prod-server java[567]: OutOfMemoryError: Java heap space
Mar 15 10:00:01 prod-server systemd[1]: apache2.service: Failed
Mar 15 10:00:02 prod-server kernel: Out of memory: Killed process 1234`,
          skillGain: { linux: 3, troubleshooting: 3 },
        },
        {
          pattern: 'free -h',
          output: `              total        used        free
Mem:          7.8Gi       7.5Gi       0.3Gi
Swap:         2.0Gi       2.0Gi       0.0Gi`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'systemctl restart apache2',
          output: '',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'kill 567',
          output: '',
          skillGain: { linux: 3, troubleshooting: 2 },
        },
      ],
      solutions: [
        {
          commands: ['ps aux', 'tail', 'systemctl'],
          allRequired: true,
          resultText: 'Problem gefunden: Java-Prozess (PID 567) hat den Speicher aufgebraucht. Apache ist gestorben. Lösung: Java-Prozess beenden, Apache neu starten.',
          skillGain: { linux: 5, troubleshooting: 8, security: 3 },
          effects: { stress: -10, relationships: { chef: 10 } },
        },
      ],
      hints: [
        '💡 Check Prozesse mit `ps aux | head -10` - was verbraucht Ressourcen?',
        '💡 Check Dienste mit `systemctl status dienstname`.',
        '💡 Lies die Logs mit `tail -20 /var/log/syslog`.',
        '💡 Memory-Check mit `free -h`.',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'final', 'level6'],
  },
];
