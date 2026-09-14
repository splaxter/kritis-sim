import { GameEvent } from '@kritis/shared';

/**
 * Tutorial Events for Beginner Mode
 * These events only appear in beginner mode and teach basic terminal commands
 * Jens guides the player through fundamental IT admin tasks
 *
 * AUSGELIEFERT WERDEN SIE über den geführten Einstieg
 * (`engine/onboarding.ts`), nicht über die Zufallsauswahl. Der Grund ist
 * gemessen: `selectNextEvent` liest `probability` nie und wählt gleichmäßig aus
 * dem Pool. Da die vier hier über `requires.events` an `evt_first_day` und
 * aneinander hängen, riss die Kette schon am ersten Tag — in 40 simulierten
 * Einsteiger-Läufen wurde KEIN einziges dieser Tutorials je serviert.
 *
 * FENSTER: Wochen 1-3 statt nur Woche 1. Der geführte Einstieg braucht das
 * nicht (er umgeht den Filter), aber es ist das Sicherheitsnetz: wer aus dem
 * Einstiegsfenster herausfällt, kann sie so wenigstens noch regulär bekommen.
 * Reihenfolge und Voraussetzungen bleiben unverändert.
 */

export const tutorialEvents: GameEvent[] = [
  {
    id: 'evt_tutorial_navigation',
    weekRange: [1, 3],
    dayPreference: [1, 2],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_first_day'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Navigation',
    description: `Jens kommt zu deinem Schreibtisch rüber. Von sich aus. Das passiert nicht oft.

"Hey, hast du kurz Zeit? Bevor es richtig losgeht, zeig ich dir mal die wichtigsten Terminal-Befehle. Die wirst du hier ständig brauchen."

Er zeigt auf deinen Bildschirm. "Öffne mal das Terminal, dann fangen wir an."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'Danke Jens, das ist sehr hilfreich!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: 'Jens nickt zufrieden. "Perfekt! Das sind die Grundlagen. Die restlichen Befehle zeig ich dir morgen."',
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
          resultText: `Du weißt jetzt, wo du bist (\`pwd\`), was da liegt (\`ls\`) und wie du woanders hinkommst (\`cd\`).

Das ist Orientierung, noch keine Diagnose: Du hast dir drei Verzeichnisse angesehen, nicht herausgefunden, ob auf dieser Maschine etwas klemmt.`,
          skillGain: { linux: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Jens: "Okay, fangen wir an. Tippe `pwd` um zu sehen, wo du gerade bist."',
        '💡 Jens: "Super! Jetzt `ls` um die Dateien und Ordner hier zu sehen."',
        '💡 Jens: "Mit `cd Dokumente` wechselst du in einen Ordner. Probier mal!"',
        '💡 Jens: "Und mit `cd ..` gehst du wieder zurück. Einfach, oder?"',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_files',
    weekRange: [1, 3],
    dayPreference: [2, 3],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_navigation'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Dateien lesen',
    description: `Jens kommt wieder vorbei, mit zwei Kaffeetassen.

"Na, bereit für Lektion zwei? Heute zeig ich dir, wie du Dateien liest - ohne sie in einem Editor öffnen zu müssen. Das spart Zeit."

Er stellt dir einen Kaffee hin. "Log-Dateien, Configs, alles kannst du direkt im Terminal anschauen."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'Perfekt, ich hab mir Notizen gemacht!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: 'Jens grinst — kurz, aber echt. "Ein Notizenmacher! Gefällt mir. Morgen dann grep - das wird richtig nützlich."',
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
          resultText: `\`cat\` zeigt alles, \`head\` den Anfang, \`tail\` das Ende — bei einer Logdatei also das Neueste.

Und genau da liegt die Falle: Am Ende von system.log steht „Backup erfolgreich abgeschlossen". Wer nur \`tail\` liest, geht beruhigt nach Hause und hat die Zeile um 08:15:22 nie gesehen — „[WARN] Hohe CPU-Auslastung", eine Viertelstunde vor dem Backup.

Ob die beiden etwas miteinander zu tun haben, sagt dir keiner der drei Befehle. Lesen ist nicht Verstehen.`,
          skillGain: { linux: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Jens: "Schau mal in den logs-Ordner. Tippe `ls` um zu sehen was da ist."',
        '💡 Jens: "Mit `cat dateiname` zeigst du den Inhalt einer Datei an. Probier `cat system.log`"',
        '💡 Jens: "Bei langen Dateien hilft `head -3 datei` für die ersten 3 Zeilen."',
        '💡 Jens: "Und `tail -2 datei` zeigt die letzten 2 Zeilen. Super für aktuelle Logs!"',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_search',
    weekRange: [1, 3],
    dayPreference: [3, 4],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_files'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Suchen',
    description: `Jens schaut von seinem Monitor auf.

"Hey, ich hab ein echtes Problem für dich. Irgendwo in den Logs ist eine Fehlermeldung versteckt, und ich brauch sie für ein Ticket. Die Logs sind aber riesig."

Er zwinkert. "Zeit für den mächtigsten Befehl überhaupt: grep."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        text: 'grep ist ja wirklich mächtig!',
        effects: { relationships: { kollegen: 5 }, skills: { linux: 5 } },
        resultText: 'Jens nickt — für seine Verhältnisse fast enthusiastisch. "Das war nur die Spitze des Eisbergs. Warte bis du grep mit Regex kombinierst!"',
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
        /*
         * Der Blick über den Filter hinaus — und der Grund, warum dieses Level
         * nicht beim Finden aufhört.
         *
         * `grep ERROR` liefert drei Zeilen. Wer daraus ein Ticket schreibt,
         * meldet ein Problem, das es seit 08:17:30 nicht mehr gibt: Der dritte
         * Versuch lief durch. Ein Filter zeigt, wonach man gesucht hat, nie
         * das, was daneben stand. Das ist keine Schwäche von grep, sondern
         * seine Bauart — und der Grund, warum ein Befund ohne Kontext keiner
         * ist.
         */
        {
          pattern: 'cat error.log',
          output: `2026-03-15 08:15:00 [INFO] Backup-Dienst startet
2026-03-15 08:16:00 [ERROR] Dienst "backup" nicht erreichbar
2026-03-15 08:16:30 [ERROR] Retry 1/3
2026-03-15 08:17:00 [ERROR] Retry 2/3
2026-03-15 08:17:30 [INFO] Retry 3/3 erfolgreich — Verbindung steht
2026-03-15 08:45:00 [INFO] Backup abgeschlossen, 0 Fehler`,
          teachesCommand: 'kontext',
          skillGain: { linux: 2, troubleshooting: 4 },
        },
        {
          pattern: 'grep -A 2 ERROR error.log',
          output: `2026-03-15 08:16:00 [ERROR] Dienst "backup" nicht erreichbar
2026-03-15 08:16:30 [ERROR] Retry 1/3
2026-03-15 08:17:00 [ERROR] Retry 2/3
2026-03-15 08:17:30 [INFO] Retry 3/3 erfolgreich — Verbindung steht
2026-03-15 08:45:00 [INFO] Backup abgeschlossen, 0 Fehler`,
          teachesCommand: 'kontext',
          skillGain: { linux: 3, troubleshooting: 4 },
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
          commands: ['grep', 'kontext'],
          allRequired: true,
          resultText: `\`grep ERROR\` liefert drei Zeilen. Wer daraus ein Ticket schreibt, meldet drei Fehler.

Die vollständige Datei erzählt etwas anderes:

  08:16:00  Dienst nicht erreichbar
  08:16:30  Retry 1/3
  08:17:00  Retry 2/3
  08:17:30  Retry 3/3 erfolgreich
  08:45:00  Backup abgeschlossen, 0 Fehler

Das sind keine drei Fehler. Das ist EIN Aussetzer von neunzig Sekunden, den der Dienst selbst geheilt hat. Ins Ticket gehört er trotzdem — aber als „hat sich nach drei Versuchen gefangen", nicht als Störung.

Ein Filter zeigt, wonach du gesucht hast. Nie das, was daneben stand.`,
          skillGain: { linux: 5, troubleshooting: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '💡 Jens: "Versuch mal `grep ERROR error.log` um nach Fehlern zu suchen."',
        '💡 Jens: "Mit `-i` ist die Suche case-insensitive: `grep -i failed auth.log`"',
        '💡 Jens: "Mit `-c` zählst du die Treffer: `grep -c ERROR error.log`"',
        '💡 Jens: "Und `-r` sucht rekursiv in allen Dateien: `grep -r ERROR .`"',
        '💡 Jens: "Drei Treffer — und jetzt? Ein Filter zeigt dir nur, wonach du gesucht hast. Was stand DANEBEN?"',
        '💡 Jens: "Sieh dir die ganze Datei an: `cat error.log`. Oder gezielt den Kontext: `grep -A 2 ERROR error.log`."',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux'],
  },
  {
    id: 'evt_tutorial_network',
    weekRange: [1, 3],
    dayPreference: [4, 5],
    probability: 1,
    requiredModes: ['beginner'],
    requires: {
      events: ['evt_tutorial_search'],
    },
    category: 'team',
    title: 'Terminal-Grundlagen: Netzwerk',
    description: `Jens ruft von seinem Platz — was allein schon ein Ereignis ist: "Hey, der Mailserver antwortet nicht. Kannst du mal nachsehen, woran es liegt?"

Das ist deine Chance, die Netzwerk-Befehle auszuprobieren, die du im Handbuch gelesen hast.

"Die Adresse ist mail.warm.local", fügt er hinzu.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'ready',
        // War: „Server ist erreichbar - war wohl nur ein Timeout!" — also
        // ausgerechnet der voreilige Schluss, den dieses Level korrigiert.
        // Die Option darf die Antwort nicht vorwegnehmen.
        text: 'Schauen wir nach, was da los ist.',
        effects: { relationships: { kollegen: 10 }, skills: { netzwerk: 5 } },
        resultText: 'Jens liest deine Meldung zweimal. "Port 25 zu. Also lebt die Kiste, aber der Dienst ist weg." Er greift zum Telefon. "Gut, dass du nicht \'geht doch\' geschrieben hast."',
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
          // Das ^C gehört dazu: Ein nacktes `ping` läuft, bis man es abbricht
          // — genau das sagt der zweite Hinweis. Ohne die Abbruchzeile endete
          // die Simulation von selbst und widerlegte ihren eigenen Hinweis.
          output: `PING mail.warm.local (192.168.1.50) 56(84) bytes of data.
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=1 ttl=64 time=0.523 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=2 ttl=64 time=0.412 ms
64 bytes from mail.warm.local (192.168.1.50): icmp_seq=3 ttl=64 time=0.389 ms
^C
--- mail.warm.local ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms

# Abgebrochen mit Strg+C. Ohne das läuft ping weiter — Paket für Paket.`,
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
        /*
         * Der eigentliche Befund des Levels — und der Grund, warum es nicht bei
         * ping und nslookup aufhört.
         *
         * Ping und DNS sagen: Der Name löst auf, der Rechner antwortet. Beides
         * ist wahr und beantwortet trotzdem nicht Jens' Frage. Erst der Blick
         * auf den PORT zeigt, dass der Dienst weg ist — und damit steht die
         * Lektion nicht als Merksatz im Abschlusstext, sondern auf dem Schirm.
         *
         * Zwei Schreibweisen, weil beide gaengig sind; dieselbe Lektion.
         */
        {
          pattern: 'nc -zv mail.warm.local 25',
          output: `nc: connect to mail.warm.local (192.168.1.50) port 25 (tcp) failed: Connection refused`,
          teachesCommand: 'portcheck',
          skillGain: { netzwerk: 4, troubleshooting: 4 },
        },
        {
          pattern: 'telnet mail.warm.local 25',
          output: `Trying 192.168.1.50...
telnet: Unable to connect to remote host: Connection refused`,
          teachesCommand: 'portcheck',
          skillGain: { netzwerk: 4, troubleshooting: 4 },
        },
      ],
      solutions: [
        {
          commands: ['ping', 'nslookup', 'portcheck'],
          allRequired: true,
          resultText: `Drei Ergebnisse, und das dritte ist das einzige, das Jens' Frage beantwortet:

  Name löst auf        mail.warm.local -> 192.168.1.50
  Rechner antwortet     3 von 3 Paketen, 0 % Verlust
  Port 25               Connection refused

Ping und DNS waren richtig — und hätten dich in die Irre geführt, wenn du dort aufgehört hättest. Ein Rechner, auf dem jeder Dienst abgestürzt ist, antwortet genauso brav auf Ping. „Erreichbar" und „funktioniert" sind zwei verschiedene Aussagen, und nur die zweite hat Jens gefragt.

Merke: Einen Dienst prüft man auf seinem Port, nicht auf seiner IP.`,
          skillGain: { netzwerk: 5, troubleshooting: 5 },
          effects: { stress: -5, relationships: { kollegen: 5 } },
        },
      ],
      hints: [
        '💡 Jens: "Zuerst testen ob der Server antwortet. Probier `ping mail.warm.local`"',
        '💡 Jens: "Du musstest mit Strg+C abbrechen, oder? Mit `ping -c 3` sagst du vorher, wie viele Pakete es sein sollen."',
        '💡 Jens: "Jetzt DNS prüfen: `nslookup mail.warm.local` zeigt die IP-Auflösung."',
        '💡 Jens: "Der Rechner antwortet — meine Frage war aber, ob der MAILSERVER antwortet. Das ist nicht dasselbe."',
        '💡 Jens: "Mail läuft auf Port 25. Klopf da an: `nc -zv mail.warm.local 25` (oder `telnet mail.warm.local 25`)."',
      ],
    },
    tags: ['tutorial', 'terminal', 'beginner', 'linux', 'network'],
  },
];
