import { GameEvent } from '@kritis/shared';

/**
 * Tutorial Events for Beginner Mode
 * These events only appear in beginner mode and teach basic terminal commands
 * Thomas guides the player through fundamental IT admin tasks
 */

export const tutorialEvents: GameEvent[] = [
  {
    id: 'evt_tutorial_navigation',
    weekRange: [1, 1],
    dayPreference: [1, 2],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_first_day'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Navigation',
    description: `{kollege} kommt zu deinem Schreibtisch rüber.

"Hey, hast du kurz Zeit? Bevor es richtig losgeht, zeig ich dir mal die wichtigsten Terminal-Befehle. Die wirst du hier ständig brauchen."

Er zeigt auf deinen Bildschirm. "Öffne mal das Terminal, dann fangen wir an."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'Danke Thomas, das ist sehr hilfreich!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: '{kollege} nickt zufrieden. "Perfekt! Das sind die Grundlagen. Die restlichen Befehle zeig ich dir morgen."',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-pc-admin',
      username: 'admin',
      currentPath: '~',
      commands: [
        {
          pattern: 'pwd',
          output: '/home/admin',
          teachesCommand: 'pwd',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ls',
          output: `Dokumente  Downloads  logs  scripts`,
          teachesCommand: 'ls',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cd Dokumente',
          output: '',
          teachesCommand: 'cd',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cd ..',
          output: '',
          skillGain: { linux: 1 },
        },
        {
          pattern: 'ls -la',
          output: `total 16
drwxr-xr-x 5 admin admin 4096 Mär 15 09:00 .
drwxr-xr-x 3 root  root  4096 Mär 14 08:00 ..
drwxr-xr-x 2 admin admin 4096 Mär 15 09:00 Dokumente
drwxr-xr-x 2 admin admin 4096 Mär 15 08:30 Downloads
drwxr-xr-x 2 admin admin 4096 Mär 15 08:45 logs
drwxr-xr-x 2 admin admin 4096 Mär 14 14:00 scripts`,
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['pwd', 'ls', 'cd'],
          allRequired: true,
          resultText: 'Du hast die Grundbefehle gemeistert!',
          skillGain: { linux: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Thomas: "Okay, fangen wir an. Tippe `pwd` um zu sehen, wo du gerade bist."',
        '💡 Thomas: "Super! Jetzt `ls` um die Dateien und Ordner hier zu sehen."',
        '💡 Thomas: "Mit `cd Dokumente` wechselst du in einen Ordner. Probier mal!"',
        '💡 Thomas: "Und mit `cd ..` gehst du wieder zurück. Einfach, oder?"',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_files',
    weekRange: [1, 1],
    dayPreference: [2, 3],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_navigation'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Dateien lesen',
    description: `{kollege} kommt wieder vorbei mit zwei Kaffeetassen.

"Na, bereit für Lektion zwei? Heute zeig ich dir, wie du Dateien liest - ohne sie in einem Editor öffnen zu müssen. Das spart Zeit."

Er stellt dir einen Kaffee hin. "Log-Dateien, Configs, alles kannst du direkt im Terminal anschauen."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'Perfekt, ich hab mir Notizen gemacht!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: '{kollege} grinst. "Ein Notizenmacher! Gefällt mir. Morgen dann grep - das wird richtig nützlich."',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-pc-admin',
      username: 'admin',
      currentPath: '~/logs',
      commands: [
        {
          pattern: 'ls',
          output: `access.log  error.log  system.log`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat system.log',
          output: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:00:05 [INFO] Netzwerk verbunden
2026-03-15 08:15:22 [WARN] Hohe CPU-Auslastung
2026-03-15 08:30:00 [INFO] Backup gestartet
2026-03-15 08:45:00 [INFO] Backup erfolgreich abgeschlossen`,
          teachesCommand: 'cat',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'head -3 system.log',
          output: `2026-03-15 08:00:01 [INFO] System gestartet
2026-03-15 08:00:05 [INFO] Netzwerk verbunden
2026-03-15 08:15:22 [WARN] Hohe CPU-Auslastung`,
          teachesCommand: 'head',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'tail -2 system.log',
          output: `2026-03-15 08:30:00 [INFO] Backup gestartet
2026-03-15 08:45:00 [INFO] Backup erfolgreich abgeschlossen`,
          teachesCommand: 'tail',
          skillGain: { linux: 2 },
        },
        {
          pattern: 'cat error.log',
          output: `2026-03-15 08:16:00 [ERROR] Dienst "backup" nicht erreichbar
2026-03-15 08:16:30 [ERROR] Retry 1/3
2026-03-15 08:17:00 [ERROR] Retry 2/3
2026-03-15 08:17:30 [INFO] Verbindung wiederhergestellt`,
          skillGain: { linux: 2, troubleshooting: 2 },
        },
      ],
      solutions: [
        {
          commands: ['cat', 'head', 'tail'],
          allRequired: true,
          resultText: 'Du kannst jetzt Log-Dateien effizient lesen!',
          skillGain: { linux: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Thomas: "Schau mal in den logs-Ordner. Tippe `ls` um zu sehen was da ist."',
        '💡 Thomas: "Mit `cat dateiname` zeigst du den Inhalt einer Datei an. Probier `cat system.log`"',
        '💡 Thomas: "Bei langen Dateien hilft `head -3 datei` für die ersten 3 Zeilen."',
        '💡 Thomas: "Und `tail -2 datei` zeigt die letzten 2 Zeilen. Super für aktuelle Logs!"',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_search',
    weekRange: [1, 1],
    dayPreference: [3, 4],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_files'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Suchen',
    description: `{kollege} schaut von seinem Monitor auf.

"Hey, ich hab ein echtes Problem für dich. Irgendwo in den Logs ist eine Fehlermeldung versteckt, und ich brauch sie für ein Ticket. Die Logs sind aber riesig."

Er zwinkert. "Zeit für den mächtigsten Befehl überhaupt: grep."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'grep ist ja wirklich mächtig!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: '{kollege} nickt enthusiastisch. "Das war nur die Spitze des Eisbergs. Warte bis du grep mit Regex kombinierst!"',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-pc-admin',
      username: 'admin',
      currentPath: '~/logs',
      commands: [
        {
          pattern: 'ls',
          output: `access.log  error.log  system.log  auth.log`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'grep ERROR system.log',
          output: ``,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'grep ERROR error.log',
          output: `2026-03-15 08:16:00 [ERROR] Dienst "backup" nicht erreichbar
2026-03-15 08:16:30 [ERROR] Retry 1/3
2026-03-15 08:17:00 [ERROR] Retry 2/3`,
          teachesCommand: 'grep',
          skillGain: { linux: 3 },
        },
        {
          pattern: 'grep -i failed auth.log',
          output: `2026-03-15 07:45:12 Login FAILED for user: mueller
2026-03-15 07:45:15 Login FAILED for user: mueller
2026-03-15 07:45:18 Login FAILED for user: mueller
2026-03-15 07:45:21 Account locked: mueller`,
          skillGain: { linux: 3, security: 2 },
        },
        {
          pattern: 'grep -c ERROR error.log',
          output: `3`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'grep -r ERROR .',
          output: `./error.log:2026-03-15 08:16:00 [ERROR] Dienst "backup" nicht erreichbar
./error.log:2026-03-15 08:16:30 [ERROR] Retry 1/3
./error.log:2026-03-15 08:17:00 [ERROR] Retry 2/3`,
          skillGain: { linux: 3 },
        },
      ],
      solutions: [
        {
          commands: ['grep'],
          allRequired: true,
          resultText: 'Du kannst jetzt effizient in Dateien suchen!',
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Thomas: "Versuch mal `grep ERROR error.log` um nach Fehlern zu suchen."',
        '💡 Thomas: "Mit `-i` ist die Suche case-insensitive: `grep -i failed auth.log`"',
        '💡 Thomas: "Mit `-c` zählst du die Treffer: `grep -c ERROR error.log`"',
        '💡 Thomas: "Und `-r` sucht rekursiv in allen Dateien: `grep -r ERROR .`"',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_network',
    weekRange: [1, 1],
    dayPreference: [4, 5],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_search'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Netzwerk',
    description: `{kollege} ruft von seinem Platz: "Hey, der Mailserver antwortet nicht. Kannst du mal checken ob er überhaupt erreichbar ist?"

Das ist deine Chance, die Netzwerk-Befehle auszuprobieren, die du im Handbuch gelesen hast.

"Die Adresse ist mail.warm.local", fügt Thomas hinzu.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'Server ist erreichbar - war wohl nur ein Timeout!',
        effects: { relationships: { kollegen: 10 }, skills: { netzwerk: 5 } },
        resultText: '{kollege} gibt dir einen Daumen hoch. "Gut gemacht! Das sind die wichtigsten Diagnose-Tools. Den Rest lernst du on the job."',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-pc-admin',
      username: 'admin',
      currentPath: '~',
      commands: [
        {
          pattern: 'ping mail.warm.local',
          output: `PING mail.warm.local (192.168.1.50) 56(84) bytes of data.
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=1 ttl=64 time=0.523 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=2 ttl=64 time=0.412 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=3 ttl=64 time=0.389 ms

--- mail.warm.local ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms`,
          teachesCommand: 'ping',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'ping -c 3 mail.warm.local',
          output: `PING mail.warm.local (192.168.1.50) 56(84) bytes of data.
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=1 ttl=64 time=0.523 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=2 ttl=64 time=0.412 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=3 ttl=64 time=0.389 ms

--- mail.warm.local ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms`,
          skillGain: { netzwerk: 2 },
        },
        {
          pattern: 'nslookup mail.warm.local',
          output: `Server:		192.168.1.1
Address:	192.168.1.1#53

Name:	mail.warm.local
Address: 192.168.1.50`,
          teachesCommand: 'nslookup',
          skillGain: { netzwerk: 3 },
        },
        {
          pattern: 'host mail.warm.local',
          output: `mail.warm.local has address 192.168.1.50`,
          skillGain: { netzwerk: 2 },
        },
        {
          pattern: 'traceroute mail.warm.local',
          output: `traceroute to mail.warm.local (192.168.1.50), 30 hops max
 1  gateway.warm.local (192.168.1.1)  0.412 ms
 2  mail.warm.local (192.168.1.50)  0.523 ms`,
          skillGain: { netzwerk: 3 },
        },
      ],
      solutions: [
        {
          commands: ['ping', 'nslookup'],
          allRequired: true,
          resultText: 'Server ist erreichbar und DNS funktioniert!',
          skillGain: { netzwerk: 5, troubleshooting: 5 },
          effects: { stress: -5, relationships: { kollegen: 5 } },
        },
      ],
      hints: [
        '💡 Thomas: "Zuerst testen ob der Server antwortet. Probier `ping mail.warm.local`"',
        '💡 Thomas: "Tipp: Mit `ping -c 3` begrenzt du auf 3 Pakete, sonst läuft es ewig."',
        '💡 Thomas: "Jetzt DNS prüfen: `nslookup mail.warm.local` zeigt die IP-Auflösung."',
        '💡 Thomas: "Bonus: `traceroute` zeigt dir den Netzwerkweg zum Ziel."',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux', 'network'],
  },
];
