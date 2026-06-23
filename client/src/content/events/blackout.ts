import { GameEvent } from '@kritis/shared';

/**
 * Blackout — Operation Dunkelkammer.
 *
 * A linear, engine-native learning track (see docs/BLACKOUT_SLICE.md). Five
 * hands-on levels, each a single modality, chained via `requires.events`:
 *
 *   blk_c1_logread   (EventViewer GUI)  → blk_login_found [+ blk_sloppy]
 *   blk_c1_hunt_gui  (Task-Manager GUI) → blk_process_stopped
 *   blk_c1_hunt_cli  (PowerShell CLI)   → blk_persistence_cleared
 *   blk_c2_jumpserver(Linux CLI)        → blk_attacker_cut, blk_source_ip_known
 *   blk_c3_firewall  (Core-Firewall GUI)→ solution_firewall_locked
 *
 * Pressure comes from Thomas Bergmann (Leitstand-Operator) via the established
 * [LEITSTAND: …] radio pattern in briefings/hints and flag-driven
 * briefingVariants — no new mechanic, no Ending/Score refactor.
 *
 * Track unlock gates on the Foundations exit (learn_04_grep_hunter); every
 * later level gates on its predecessor (track-internal — see
 * learning-tracks.test.ts). Flags are only used for reactivity, not gating.
 */
export const blackoutEvents: GameEvent[] = [
  // ── Kapitel 1 — Der EDR-Alert (WS-042) ─────────────────────────────────────
  {
    id: 'blk_c1_logread',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Blackout 1: Der EDR-Alert',
    description: `Mitten in der Nachtschicht schlägt das EDR auf dem Arbeitsplatz **WS-042** im Leitstand-Vorraum Alarm: „Suspicious Activity".

\`\`\`
[LEITSTAND: Bergmann] "Hier Bergmann vom Leitstand. Bei uns flackert eine Warnung
                       auf der Operator-Workstation. Ich hab hier Pumpen am Laufen,
                       da kann ich keinen Hacker im Rücken gebrauchen.
                       Schau ins Sicherheitsprotokoll und sag mir, was wirklich passiert ist."
\`\`\`

**Deine Aufgabe:** Öffne die Ereignisanzeige von WS-042 und melde den Eintrag, der den Einbruch **beweist** — nicht nur das Symptom.`,
    mentorNote:
      'Ein verdächtiger Login (4624, Typ 10 = RemoteInteractive/RDP) ist ein Symptom. Der Beweis für die Ausführung von Schadcode ist die Prozesserstellung (4688): eine als „svch0st.exe" getarnte Datei, gestartet aus einem Benutzer-Temp-Ordner von powershell.exe. Genau diesen Eintrag meldet man.',
    choices: [
      {
        id: 'open_eventviewer',
        text: 'Ereignisanzeige öffnen...',
        effects: { skills: { windows: 3, security: 3 }, stress: -1 },
        resultText:
          'Du hast den Vorfall dokumentiert und an Bergmann zurückgemeldet. WS-042 ist kompromittiert — die Jagd beginnt.',
        guiCommand: true,
        setsFlags: ['blk_login_found'],
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'WS-042',
      briefing:
        'Tipp: Ein Login allein ist nur die offene Tür. Such den Eintrag, der zeigt, dass etwas AUSGEFÜHRT wurde — eine Prozesserstellung (4688) mit verdächtigem Pfad. Wähl ihn aus und klick „Als Vorfall melden".',
      state: {
        eventViewer: {
          logName: 'Sicherheit',
          entries: [
            {
              id: 'evt-logon-normal',
              level: 'Überwachung erfolgreich',
              dateTime: '22.06.2026 22:58:04',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: j.weber\nAnmeldetyp: 2 (Interaktiv)\nQuellnetzwerkadresse: 10.20.0.23\nStatus: Normale Schichtanmeldung am Arbeitsplatz.',
            },
            {
              id: 'evt-rdp-login',
              level: 'Überwachung erfolgreich',
              dateTime: '23.06.2026 01:14:11',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: svc-backup\nAnmeldetyp: 10 (RemoteInteractive)\nQuellnetzwerkadresse: 10.20.9.66\n\n⚠ Ein Dienstkonto meldet sich um 01:14 per RDP an — ungewöhnlich für diesen Arbeitsplatz.',
            },
            {
              id: 'evt-defender-off',
              level: 'Warnung',
              dateTime: '23.06.2026 01:15:50',
              source: 'Windows Defender',
              eventId: 5001,
              task: 'Echtzeitschutz',
              message:
                'Der Echtzeitschutz wurde deaktiviert.\nDie Deaktivierung erfolgte durch ein Skript im Benutzerkontext „svc-backup".',
            },
            {
              id: 'evt-proc-svch0st',
              level: 'Überwachung erfolgreich',
              dateTime: '23.06.2026 01:16:02',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4688,
              task: 'Prozesserstellung',
              message:
                'Ein neuer Prozess wurde erstellt.\nNeuer Prozess: C:\\Users\\svc-backup\\AppData\\Local\\Temp\\svch0st.exe\nErstellender Prozess: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\n\n⚠ „svch0st.exe" (Null statt o) liegt im Temp-Ordner — der echte svchost.exe läuft nur aus System32. Das ist die Schadsoftware.',
            },
            {
              id: 'evt-priv',
              level: 'Überwachung erfolgreich',
              dateTime: '23.06.2026 01:16:03',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4672,
              task: 'Spezielle Anmeldung',
              message:
                'Einer neuen Anmeldung wurden besondere Rechte zugewiesen.\nKonto: svc-backup\nRechte: SeDebugPrivilege, SeTcbPrivilege.',
            },
            {
              id: 'evt-info-backup',
              level: 'Information',
              dateTime: '23.06.2026 06:00:00',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: backup-svc\nAnmeldetyp: 5 (Dienst)\nQuellnetzwerkadresse: -\nStatus: Geplanter Backup-Dienst.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['report:evt-proc-svch0st'],
          allRequired: true,
          resultText:
            'Korrekt! Die Prozesserstellung (4688) von „svch0st.exe" aus dem Temp-Ordner — gestartet von PowerShell — ist der Beweis: hier wurde Schadcode ausgeführt. Genau das ist der meldepflichtige Vorfall.',
          skillGain: { windows: 3, security: 6 },
        },
        {
          interactions: ['report:evt-rdp-login'],
          allRequired: true,
          resultText:
            'Du hast den verdächtigen RDP-Login gemeldet — nicht falsch, aber das ist nur die offene Tür. Den eigentlichen Schadcode (svch0st.exe, 4688) hast du übersehen. Bergmann wird das später anmerken.',
          skillGain: { windows: 2, security: 2 },
          setsFlags: ['blk_sloppy'],
        },
      ],
      hints: [
        '🤖 Bergmann: "Ein Login heißt nur, dass jemand reingekommen ist. Mich interessiert: Was hat er DANN gemacht?"',
        '🤖 Bergmann: "Filter im Kopf auf Prozesserstellung — Event 4688. Schau dir die Pfade an. Was läuft aus einem Temp-Ordner?"',
        '🤖 Bergmann: "svch0st.exe — mit Null statt o — im Temp-Ordner, gestartet von PowerShell. Das ist die Tarnung. Wähl den 4688-Eintrag aus und meld ihn."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'kritis', 'blackout', 'incident'],
  },

  {
    id: 'blk_c1_hunt_gui',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['blk_c1_logread'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Blackout 2: Prozess-Jagd (Task-Manager)',
    description: `Du weißt jetzt, wonach du suchst. Der getarnte Prozess läuft noch auf **WS-042** und zieht die CPU hoch.

\`\`\`
[LEITSTAND: Bergmann] "Dann mach ihn tot. Task-Manager auf, das Ding raus —
                       aber Finger weg von den echten Systemprozessen,
                       sonst steht mir hier die halbe Visualisierung."
\`\`\`

**Deine Aufgabe:** Finde den getarnten Prozess im Task-Manager und beende ihn — ohne die kritischen Windows-Prozesse anzufassen.`,
    mentorNote:
      'svch0st.exe (Null statt o) ist die Tarnung — der echte svchost.exe ist als critical markiert und kann nicht beendet werden (Zugriff verweigert). Genau diese Verwechslung will der Angreifer provozieren.',
    choices: [
      {
        id: 'open_taskmanager',
        text: 'Task-Manager öffnen (Strg+Shift+Esc)...',
        effects: { skills: { windows: 4, security: 2 }, stress: -2 },
        resultText:
          'Getarnter Prozess beendet, CPU-Last fällt. Aber lehn dich nicht zurück — getarnte Malware kommt selten allein zurück.',
        guiCommand: true,
        setsFlags: ['blk_process_stopped'],
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'WS-042',
      briefing:
        'Wähl einen Prozess aus und beende ihn mit „Task beenden". Der echte svchost.exe läuft aus System32 und ist geschützt — der Eindringling tarnt sich mit einem fast identischen Namen.',
      briefingVariants: [
        {
          flag: 'blk_sloppy',
          briefing:
            'Bergmann (knapp): "Diesmal genau hinschauen, ja? Wähl den getarnten Prozess aus und beende ihn — NICHT den echten svchost.exe."',
        },
      ],
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 1, memoryMb: 24, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 916, cpu: 2, memoryMb: 148, description: 'Hostprozess für Windows-Dienste (System32)', critical: true },
            { name: 'csrss.exe', pid: 612, cpu: 0, memoryMb: 12, description: 'Client-Server-Laufzeitprozess', critical: true },
            { name: 'explorer.exe', pid: 3104, cpu: 1, memoryMb: 190, description: 'Windows-Explorer' },
            { name: 'svch0st.exe', pid: 6112, cpu: 88, memoryMb: 734, description: 'Unbekannt — kein verifizierter Herausgeber · C:\\Users\\svc-backup\\AppData\\Local\\Temp' },
            { name: 'WinSCADAView.exe', pid: 4288, cpu: 4, memoryMb: 410, description: 'Leitstand-Visualisierung (HMI-Client)' },
            { name: 'OUTLOOK.EXE', pid: 4420, cpu: 2, memoryMb: 322, description: 'Microsoft Outlook' },
          ],
        },
      },
      solutions: [
        {
          interactions: ['endtask:svch0st.exe'],
          allRequired: true,
          resultText:
            'Richtig! „svch0st.exe" (Null statt o) aus dem Temp-Ordner ist die Tarnung. Beendet — die CPU-Last normalisiert sich sofort.',
          skillGain: { windows: 5, security: 4 },
        },
      ],
      hints: [
        '🤖 Bergmann: "Welcher Prozess frisst die CPU? Das ist meistens schon der halbe Treffer."',
        '🤖 Bergmann: "Zwei heißen fast gleich. Schau auf den Pfad: der echte läuft aus System32, der falsche aus einem Temp-Ordner."',
        '🤖 Bergmann: "svch0st.exe — Null statt o, PID 6112, 88% CPU. Den wählst du aus und beendest ihn. Den echten svchost.exe lässt du in Ruhe."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'malware', 'blackout'],
  },

  {
    id: 'blk_c1_hunt_cli',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['blk_c1_hunt_gui'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Blackout 3: Er kommt zurück (PowerShell)',
    description: `Kaum gemeldet, ist svch0st.exe wieder da. Der Prozess hat **Persistenz** — er startet sich selbst neu. Den Task-Manager-Klick kannst du nicht ewig wiederholen. Zeit für die Shell.

\`\`\`
[LEITSTAND: Bergmann] "Das Ding ist wieder oben. Ich seh's an der Last.
                       So einen Wiedergänger killst du nicht mit der Maus —
                       du musst die Wurzel rausziehen. PowerShell. Mach."
\`\`\`

**Deine Aufgabe:** Finde in PowerShell den Autostart-Mechanismus (geplante Aufgabe), **beende den Prozess** und **entferne die Persistenz** — sonst ist er beim nächsten Blick wieder da.`,
    mentorNote:
      'Reflex ist „Prozess killen". Aber ein Prozess mit Persistenz (geplante Aufgabe, Autorun, Dienst) startet neu. Erst die Wurzel — die geplante Aufgabe — entfernen, dann ist das Beenden endgültig. Get-ScheduledTask findet sie, Unregister-ScheduledTask entfernt sie.',
    choices: [
      {
        id: 'open_powershell',
        text: 'PowerShell öffnen...',
        effects: { skills: { windows: 5, security: 5, troubleshooting: 3 } },
        resultText: `\`\`\`
[SYSTEM] svch0st.exe beendet.
[SYSTEM] Geplante Aufgabe „WindowsUpdateHelper" entfernt.
[SYSTEM] Kein Neustart des Prozesses mehr erkannt.
\`\`\`

Diesmal endgültig: ohne die geplante Aufgabe fehlt dem Implantat der Wiedergänger-Mechanismus. WS-042 ist sauber.`,
        terminalCommand: true,
        setsFlags: ['blk_persistence_cleared'],
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'WS-042',
      username: 'azubi-admin',
      currentPath: 'C:\\Windows\\system32',
      commands: [
        {
          pattern: 'Get-Process',
          patternRegex: '^Get-Process(\\s+(-Name\\s+)?svch0st)?\\s*$',
          output: `Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName
-------  ------  -----   -----   ------    --  -----------
    234      15  12345   23456     1.23  3104  explorer
    567      25  34567   45678     2.10  4288  WinSCADAView
    890      35  56789   67890     5.40  5678  powershell
    712      28  88321  751232    88.10  6240  svch0st

# Da ist er wieder — PID 6240. Killen allein bringt nichts,
# solange der Autostart steht. Wo kommt der Neustart her?`,
          teachesCommand: 'Get-Process',
          skillGain: { windows: 2 },
        },
        {
          pattern: 'Get-ScheduledTask',
          patternRegex: 'Get-ScheduledTask|schtasks(\\s+/query)?',
          output: `TaskPath                        TaskName                State
--------                        --------                -----
\\Microsoft\\Windows\\UpdateOrch\\  ScheduleScan             Ready
\\                               WindowsUpdateHelper      Running
\\Microsoft\\Windows\\Defender\\    Defender Scheduled Scan  Ready

# „WindowsUpdateHelper" im Root-Pfad? Microsoft legt seine Tasks
# unter \\Microsoft\\Windows\\ ab. Diese Aufgabe ist die Tarnung.`,
          teachesCommand: 'find-persistence',
          skillGain: { windows: 3, security: 3 },
        },
        {
          pattern: 'Get-ScheduledTask -TaskName WindowsUpdateHelper | Select-Object -ExpandProperty Actions',
          patternRegex: 'Get-ScheduledTask.*WindowsUpdateHelper.*Action|Export-ScheduledTask.*WindowsUpdateHelper',
          output: `Execute                                                   Arguments
-------                                                   ---------
C:\\Users\\svc-backup\\AppData\\Local\\Temp\\svch0st.exe   -silent

# Bestätigt: die Aufgabe startet exakt unsere svch0st.exe neu.
# Das ist die Wurzel.`,
          skillGain: { windows: 2, security: 2 },
        },
        {
          pattern: 'Stop-Process -Name svch0st -Force',
          patternRegex: 'Stop-Process\\s+(-Name\\s+svch0st|-Id\\s+6240)',
          output: `# Prozess 6240 (svch0st) beendet.
[SYSTEM] CPU-Last fällt — aber die geplante Aufgabe lebt noch.
# Wenn du jetzt aufhörst, ist er in Minuten zurück.`,
          teachesCommand: 'stop-process',
          skillGain: { windows: 3 },
        },
        {
          pattern: 'Unregister-ScheduledTask -TaskName WindowsUpdateHelper -Confirm:$false',
          patternRegex: 'Unregister-ScheduledTask.*WindowsUpdateHelper|schtasks\\s+/delete\\s+/tn\\s+WindowsUpdateHelper',
          output: `# Geplante Aufgabe „WindowsUpdateHelper" entfernt.
[SYSTEM] Persistenz beseitigt. Der Prozess startet nicht mehr neu.`,
          teachesCommand: 'remove-persistence',
          skillGain: { windows: 4, security: 4 },
        },
        {
          pattern: 'Restart-Computer',
          patternRegex: 'Restart-Computer|shutdown\\s+/r',
          output: `# Stopp. Ein Neustart killt den Prozess nur kurz — die geplante
# Aufgabe startet ihn beim Hochfahren sofort wieder. Erst die
# Persistenz entfernen, dann hat ein Neustart überhaupt einen Sinn.`,
          wrongApproachFeedback:
            'Neustarten beseitigt die Persistenz nicht — die geplante Aufgabe überlebt den Reboot.',
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['remove-persistence', 'stop-process'],
          allRequired: true,
          resultText:
            'Sauber gelöst: erst die geplante Aufgabe „WindowsUpdateHelper" als Autostart entlarvt und entfernt, dann den Prozess beendet. Ohne Wurzel kein Wiedergänger — WS-042 bleibt sauber.',
          skillGain: { windows: 6, security: 5, troubleshooting: 4 },
          effects: { stress: -4 },
        },
      ],
      hints: [
        '🤖 Bergmann: "Er kommt zurück, also startet ihn irgendwas neu. Killen allein reicht nicht — wo ist der Autostart?"',
        '🤖 Bergmann: "Schau dir die geplanten Aufgaben an: Get-ScheduledTask. Eine steht im falschen Pfad und heißt harmlos."',
        '🤖 Bergmann: "WindowsUpdateHelper ist die Tarnung. Stop-Process -Name svch0st -Force, und dann Unregister-ScheduledTask -TaskName WindowsUpdateHelper -Confirm:$false."',
      ],
    },
    tags: ['learning', 'terminal', 'windows', 'powershell', 'security', 'blackout', 'persistence'],
  },

  // ── Kapitel 2 — Lateral Movement (Jump-Server, Linux) ──────────────────────
  {
    id: 'blk_c2_jumpserver',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['blk_c1_hunt_cli'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Blackout 4: Lateral Movement',
    description: `WS-042 ist sauber — aber das RDP-Dienstkonto kam von **10.20.9.66**, dem Linux-**Jump-Server** zwischen Büronetz und Leittechnik. Von dort hat sich der Angreifer bewegt. Du musst die offene Verbindung kappen.

\`\`\`
[LEITSTAND: Bergmann] "Der Sprung kam über den Jump-Server. Solange der da
                       eine offene Sitzung hält, sitzt er quasi in meinem Vorzimmer.
                       Find die Verbindung und schneid sie durch."
\`\`\`

**Deine Aufgabe:** Finde im Auth-Log die Brute-Force-Quelle, identifiziere die aktive Verbindung des Angreifers und beende den zugehörigen Prozess.`,
    mentorNote:
      'grep "Failed password" /var/log/auth.log zeigt die Brute-Force-Quelle (eine IP sticht heraus). ss -tnp (oder netstat -tnp) zeigt die aktive Verbindung dieser IP samt PID. kill -9 <PID> beendet die Angreifer-Sitzung. Reihenfolge: Quelle finden → Verbindung finden → Prozess beenden.',
    choices: [
      {
        id: 'open_terminal',
        text: 'SSH auf den Jump-Server...',
        effects: { skills: { linux: 5, netzwerk: 5, security: 4 } },
        resultText: `\`\`\`
[SYSTEM] Verbindung 203.0.113.66:51022 → sshd[20144] terminiert.
[SYSTEM] Angreifer-Sitzung auf dem Jump-Server beendet.
\`\`\`

Die offene Sitzung ist gekappt, die Quell-IP 203.0.113.66 notiert. Aber der Angreifer kennt jetzt den Weg — und die Firewall steht als Nächstes auf der Kippe.`,
        terminalCommand: true,
        setsFlags: ['blk_attacker_cut', 'blk_source_ip_known'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'jump-01',
      username: 'root',
      currentPath: '/var/log',
      commands: [
        {
          pattern: 'ls',
          output: `auth.log  kern.log  syslog  nginx/

# auth.log enthält die SSH-Anmeldeversuche. Da fängst du an.`,
        },
        {
          pattern: 'grep "Failed password" /var/log/auth.log',
          patternRegex: 'grep\\s+.*[Ff]ailed\\s*password.*auth\\.log|grep\\s+.*auth\\.log.*[Ff]ailed',
          output: `Jun 23 01:02:11 jump-01 sshd[19980]: Failed password for invalid user admin from 203.0.113.66 port 50922
Jun 23 01:02:13 jump-01 sshd[19980]: Failed password for invalid user admin from 203.0.113.66 port 50930
Jun 23 01:02:15 jump-01 sshd[19981]: Failed password for root from 203.0.113.66 port 50944
Jun 23 01:02:41 jump-01 sshd[19984]: Failed password for svc-backup from 203.0.113.66 port 50990
Jun 23 01:03:09 jump-01 sshd[20144]: Accepted password for svc-backup from 203.0.113.66 port 51022

# Dutzende Fehlversuche von 203.0.113.66 — dann EIN Erfolg auf
# svc-backup. Das ist die Quelle und das gekaperte Konto.`,
          teachesCommand: 'find-source',
          skillGain: { linux: 3, security: 4 },
        },
        {
          pattern: 'tail /var/log/auth.log',
          patternRegex: '^(tail|cat)\\s+.*auth\\.log',
          output: `Jun 23 01:03:09 jump-01 sshd[20144]: Accepted password for svc-backup from 203.0.113.66 port 51022
Jun 23 01:03:10 jump-01 sshd[20144]: pam_unix(sshd:session): session opened for user svc-backup
Jun 23 06:00:01 jump-01 CRON[20510]: pam_unix(cron:session): session opened for user root

# Die Sitzung von 203.0.113.66 wurde um 01:03 geöffnet — und nie
# geschlossen. Sie läuft noch. Welcher Prozess hält sie?`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'ss -tnp',
          patternRegex: '^(ss|netstat)\\s+-[a-z]*tnp',
          output: `State   Recv-Q  Send-Q   Local Address:Port    Peer Address:Port   Process
ESTAB   0       0        10.20.9.66:22         203.0.113.66:51022  users:(("sshd",pid=20144,fd=3))
ESTAB   0       0        10.20.9.66:22         10.20.0.23:49880    users:(("sshd",pid=18002,fd=3))
ESTAB   0       0        10.20.9.66:443        10.20.0.40:51500    users:(("nginx",pid=1455,fd=8))

# Die ESTAB-Verbindung zu 203.0.113.66:51022 hängt an sshd PID 20144.
# Das ist die Angreifer-Sitzung.`,
          teachesCommand: 'find-session',
          skillGain: { netzwerk: 4, security: 3 },
        },
        {
          pattern: 'kill -9 20144',
          patternRegex: 'kill\\s+(-9|-KILL|-s\\s+(9|KILL))\\s+20144',
          output: `# Prozess 20144 (sshd-Sitzung von 203.0.113.66) beendet.
[SYSTEM] Verbindung getrennt. Die Angreifer-Sitzung ist tot.`,
          teachesCommand: 'kill-session',
          skillGain: { linux: 3, security: 4 },
        },
        {
          pattern: 'kill -9 18002',
          patternRegex: 'kill\\s+.*\\b18002\\b',
          output: `# STOPP — PID 18002 ist die SSH-Sitzung von 10.20.0.23, deinem
# eigenen Admin-Zugang aus dem Büronetz. Die killst du gerade selbst.
# Die Angreifer-Sitzung hängt an PID 20144 (Peer 203.0.113.66).`,
          wrongApproachFeedback:
            'Falsche PID: 18002 ist deine eigene legitime Sitzung. Die Angreifer-Verbindung kommt von 203.0.113.66 → PID 20144.',
          skillGain: {},
        },
      ],
      solutions: [
        {
          commands: ['find-source', 'find-session', 'kill-session'],
          allRequired: true,
          resultText:
            'Vorbildlich: erst die Brute-Force-Quelle 203.0.113.66 im auth.log identifiziert, dann die aktive Sitzung über ss -tnp der PID 20144 zugeordnet und gezielt beendet. Die Quell-IP ist notiert — die brauchst du gleich an der Firewall.',
          skillGain: { linux: 5, netzwerk: 5, security: 5 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        '🤖 Bergmann: "Brute-Force hinterlässt Spuren. Im auth.log häufen sich die Fehlversuche — von welcher IP?"',
        '🤖 Bergmann: "Such die fehlgeschlagenen Logins: grep \\"Failed password\\" /var/log/auth.log. Eine IP sticht raus."',
        '🤖 Bergmann: "Jetzt die offene Verbindung: ss -tnp zeigt dir die PID zu 203.0.113.66. Dann kill -9 auf genau diese PID — nicht auf deine eigene Sitzung."',
      ],
    },
    tags: ['learning', 'terminal', 'linux', 'netzwerk', 'security', 'blackout', 'incident'],
  },

  // ── Kapitel 3 — Die Firewall-Panik (Core-Firewall) ─────────────────────────
  {
    id: 'blk_c3_firewall',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['blk_c2_jumpserver'] },
    category: 'training',
    involvedCharacters: [],
    title: 'Blackout 5: Die Firewall-Panik',
    description: `Der Angreifer kennt den Weg ins Prozessnetz und probiert jetzt direkt die **Core-Firewall** vor dem Leitstand. Du musst seine IP aussperren und das SCADA-Netz isolieren — ohne den Leitstand selbst vom Netz zu nehmen.

\`\`\`
[LEITSTAND: Bergmann] "Pumpe 3 verliert Druck. Wenn die SPS jetzt kippt, geht hier
                       das Licht aus — und zwar in der halben Stadt. Sperr den Angreifer
                       und riegel das Prozessnetz ab. ABER: kapp mir nicht die
                       Management-Leitung, sonst bin ich blind!"
\`\`\`

**Deine Aufgabe:** Blockiere die Angreifer-IP eingehend und isoliere das SCADA-Netz — aber lass die kritische Leitstand-Management-Regel und das Sicherheitssystem unangetastet.`,
    mentorNote:
      'Zwei richtige Aktionen: die eingehende Regel der Angreifer-IP (203.0.113.66) blockieren UND das SCADA-Prozessnetz isolieren. Zwei Fallen: die Leitstand-Management-Regel ist critical (blockieren = Leitstand blind) und das Sicherheitssystem (SIS) muss erreichbar bleiben (isolieren = Anlage offline). Beide sind geschützt und geben nur eine Warnung.',
    choices: [
      {
        id: 'open_firewall',
        text: 'Core-Firewall-Konsole öffnen...',
        effects: { skills: { netzwerk: 3, security: 3 }, stress: -2 },
        resultText:
          'SCADA isoliert, Angreifer-IP geblockt — und die Management-Leitung steht. Die Pumpen bleiben am Netz. Blackout verhindert.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'corefirewall',
      title: 'Core-Firewall — Konsole',
      hostname: 'KRITIS-FW-CORE',
      briefing:
        'Blockiere die eingehende Regel der Angreifer-IP und isoliere das SCADA-Netz. Die mit 🔒 markierten Einträge (Leitstand-Management, Sicherheitssystem) sind betriebskritisch — die anzufassen verweigert die Konsole.',
      briefingVariants: [
        {
          flag: 'blk_sloppy',
          briefing:
            'Bergmann (angespannt): "Jetzt zählt jede Sekunde — und diesmal KEIN Schnellschuss. Angreifer-IP eingehend blocken, SCADA-Netz isolieren. Management-Leitung und Sicherheitssystem (🔒) bleiben unberührt!"',
        },
      ],
      state: {
        coreFirewall: {
          zoneName: 'Leitstand-Perimeter',
          rules: [
            {
              id: 'atk-inbound',
              label: 'SSH/RDP von extern → HMI-Leitstand',
              direction: 'inbound',
              target: '203.0.113.66 → 10.20.5.0/24',
              action: 'allow',
              hostile: true,
            },
            {
              id: 'leitstand-mgmt',
              label: 'Management: Leitstand-Operator ↔ SPS-Gateway',
              direction: 'inbound',
              target: '10.20.1.10 → 10.20.5.1',
              action: 'allow',
              critical: true,
              riskFeedback:
                'Diese Regel trägt den Steuer- und Sichtverkehr des Leitstands. Blockieren = Bergmann ist blind und kann die Pumpen nicht mehr regeln.',
            },
            {
              id: 'erp-https',
              label: 'ERP-Reporting (HTTPS) → Rechenzentrum',
              direction: 'outbound',
              target: '10.20.0.0/16 → 192.0.2.40:443',
              action: 'allow',
            },
            {
              id: 'ntp-out',
              label: 'Zeitsync (NTP) → Stratum-1',
              direction: 'outbound',
              target: '10.20.0.0/16 → 192.0.2.123:123',
              action: 'allow',
            },
          ],
          subnets: [
            {
              id: 'scada-net',
              label: 'SCADA / Prozessnetz (SPS, RTU, HMI)',
              isolated: false,
            },
            {
              id: 'safety-sis',
              label: 'Sicherheitssystem (SIS) — Not-Aus & Überdruckschutz',
              isolated: false,
              critical: true,
              riskFeedback:
                'Das Sicherheitssystem muss jederzeit erreichbar bleiben. Eine Isolation nimmt den Not-Aus- und Überdruckschutz vom Netz — das ist genau das, was du verhindern willst.',
            },
            {
              id: 'office-net',
              label: 'Büronetz (Arbeitsplätze, Drucker)',
              isolated: false,
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['block:atk-inbound', 'isolate:scada-net'],
          allRequired: true,
          setsFlags: ['solution_firewall_locked'],
          resultText:
            'Geschafft! Die Angreifer-IP 203.0.113.66 ist eingehend blockiert, das SCADA-Prozessnetz isoliert — und die Management-Leitung sowie das Sicherheitssystem stehen unangetastet. Pumpe 3 fängt sich. Der Blackout ist abgewendet.',
          skillGain: { netzwerk: 5, security: 5 },
        },
      ],
      hints: [
        '🤖 Bergmann: "Zwei Dinge: den Angreifer aussperren und mein Prozessnetz abriegeln. Fang mit der fremden IP an."',
        '🤖 Bergmann: "Die eingehende Regel von 203.0.113.66 gehört blockiert. Und das SCADA-Netz isolierst du, damit er nicht weiterspringt."',
        '🤖 Bergmann: "Blockier die Regel „atk-inbound" (eingehend, 203.0.113.66) und isolier das SCADA-Netz. Finger weg von den 🔒-Einträgen — Management-Leitung und Sicherheitssystem bleiben dran!"',
      ],
    },
    tags: ['learning', 'gui', 'netzwerk', 'security', 'kritis', 'blackout', 'firewall', 'incident'],
  },
];
