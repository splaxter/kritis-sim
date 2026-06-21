/**
 * Windows GUI levels — the point-and-click counterpart to the terminal levels.
 * Rendered via the WindowsLevel component (Fluent UI) instead of xterm.
 *
 * This first level is the vertical slice: a fake Windows 11 Task Manager where
 * the player must spot and end a rogue process.
 */

import { GameEvent } from '@kritis/shared';

export const guiLevelEvents: GameEvent[] = [
  {
    id: 'gui_taskmanager_rogue',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_01_awakening'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Der unbekannte Prozess',
    description: `Auf einem Windows-Arbeitsplatz dreht der Lüfter auf Hochtouren. Die CPU ist am Anschlag.

Ein Kollege meldet: „Mein Rechner ist seit heute Morgen brutal langsam."

\`\`\`
[NACHRICHT VON: bjorg] "Mach den Task-Manager auf. Irgendein Prozess frisst die ganze CPU.
                        Finde ihn. Beende ihn. Aber Finger weg von den System-Prozessen."
\`\`\`

**Deine Aufgabe:** Öffne den Task-Manager, finde den verdächtigen Prozess und beende ihn.`,
    mentorNote:
      'Hohe CPU-Last durch einen unbekannten Prozess mit zufälligem Namen ist ein klassisches Malware-Indiz. Kritische Windows-Prozesse (svchost.exe, System) niemals beenden.',
    choices: [
      {
        id: 'open_taskmanager',
        text: 'Task-Manager öffnen (Strg+Shift+Esc)...',
        effects: { skills: { windows: 4, security: 2 }, stress: -2 },
        resultText:
          'Prozess beendet, CPU-Last normalisiert. Du notierst den Namen für die spätere Analyse — und meldest den Vorfall.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'WS-AZUBI-07',
      briefing:
        'Klicke einen Prozess an, um ihn auszuwählen, und beende ihn mit „Task beenden". Vorsicht bei System-Prozessen.',
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 1, memoryMb: 24, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 980, cpu: 2, memoryMb: 142, description: 'Hostprozess für Windows-Dienste', critical: true },
            { name: 'explorer.exe', pid: 3104, cpu: 1, memoryMb: 188, description: 'Windows-Explorer' },
            { name: 'chrome.exe', pid: 5288, cpu: 6, memoryMb: 612, description: 'Google Chrome' },
            { name: 'MicrosoftEdge.exe', pid: 6012, cpu: 3, memoryMb: 410, description: 'Microsoft Edge' },
            { name: 'xmr-stak-rx.exe', pid: 7341, cpu: 94, memoryMb: 856, description: 'Unbekannt — kein verifizierter Herausgeber' },
            { name: 'OUTLOOK.EXE', pid: 4420, cpu: 2, memoryMb: 322, description: 'Microsoft Outlook' },
          ],
        },
      },
      solutions: [
        {
          interactions: ['endtask:xmr-stak-rx.exe'],
          allRequired: true,
          resultText: 'Richtig! „xmr-stak-rx.exe" ist ein Krypto-Miner. CPU-Last ist sofort gesunken.',
          skillGain: { windows: 6, security: 4 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Sortier im Kopf nach CPU. Welcher Prozess sticht mit ~94% raus?"',
        '🤖 Bjorg: "Ein legitimer Prozess hat einen verifizierten Herausgeber. „kein verifizierter Herausgeber" ist ein Warnsignal."',
        '🤖 Bjorg: "xmr-stak ist ein bekannter Monero-Miner. Wähl ihn aus und klick „Task beenden"."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'malware'],
  },

  {
    id: 'gui_eventviewer_bruteforce',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // After the log/search lessons (grep) — the player can now read a security log.
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Spuren im Sicherheitsprotokoll',
    description: `Das SIEM hat um kurz nach 03:00 Uhr Alarm geschlagen: ungewöhnlich viele fehlgeschlagene Anmeldungen am Domänencontroller.

\`\`\`
[NACHRICHT VON: bjorg] "Mach die Ereignisanzeige auf, Sicherheitsprotokoll.
                        Jemand hat heute Nacht das Admin-Konto durchprobiert.
                        Die Frage ist: Hat er's geschafft? Finde den Beweis und meld ihn."
\`\`\`

**Deine Aufgabe:** Finde im Sicherheitsprotokoll die erfolgreiche Anmeldung des Angreifers und melde sie als Vorfall.`,
    mentorNote:
      'Event-ID 4625 = fehlgeschlagene Anmeldung, 4624 = erfolgreiche Anmeldung. Viele 4625 auf ein Konto von einer IP, gefolgt von einer 4624 von derselben IP = erfolgreicher Brute-Force. Genau das ist der meldepflichtige Vorfall.',
    choices: [
      {
        id: 'open_eventviewer',
        text: 'Ereignisanzeige öffnen...',
        effects: { skills: { windows: 4, security: 5 }, stress: -1 },
        resultText:
          'Du hast den erfolgreichen Einbruch identifiziert, dokumentiert und an das Security-Team eskaliert. Das kompromittierte Konto wird sofort gesperrt.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'DC01',
      briefing:
        'Tipp: Filtere nach „Überwachung fehlgeschlagen", erkenne das Muster, und finde dann die EINE erfolgreiche Anmeldung (4624) von derselben Quelle. Wähle sie aus und klicke „Als Vorfall melden".',
      state: {
        eventViewer: {
          logName: 'Sicherheit',
          entries: [
            {
              id: 'evt-legit-1',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 02:58:04',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: j.weber\nAnmeldetyp: 2 (Interaktiv)\nQuellnetzwerkadresse: 10.0.1.23\nStatus: Normale Benutzeranmeldung am Arbeitsplatz.',
            },
            {
              id: 'evt-fail-1',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '21.06.2026 03:14:11',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: Administrator\nFehlerursache: Unbekannter Benutzername oder ungültiges Kennwort.\nQuellnetzwerkadresse: 10.0.0.66',
            },
            {
              id: 'evt-fail-2',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '21.06.2026 03:14:39',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: Administrator\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 10.0.0.66',
            },
            {
              id: 'evt-fail-3',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '21.06.2026 03:15:52',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: Administrator\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 10.0.0.66',
            },
            {
              id: 'evt-fail-4',
              level: 'Überwachung fehlgeschlagen',
              dateTime: '21.06.2026 03:16:50',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4625,
              task: 'Anmeldung',
              message:
                'Fehler bei der Anmeldung eines Kontos.\nKonto: Administrator\nFehlerursache: Ungültiges Kennwort.\nQuellnetzwerkadresse: 10.0.0.66',
            },
            {
              id: 'evt-breach',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 03:17:42',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: Administrator\nAnmeldetyp: 3 (Netzwerk)\nQuellnetzwerkadresse: 10.0.0.66\n\n⚠ Diese erfolgreiche Anmeldung folgt unmittelbar auf dutzende Fehlversuche von derselben IP.',
            },
            {
              id: 'evt-priv',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 03:17:43',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4672,
              task: 'Spezielle Anmeldung',
              message:
                'Einer neuen Anmeldung wurden besondere Rechte zugewiesen.\nKonto: Administrator\nRechte: SeDebugPrivilege, SeTcbPrivilege.',
            },
            {
              id: 'evt-warn-1',
              level: 'Warnung',
              dateTime: '21.06.2026 03:20:11',
              source: 'Service Control Manager',
              eventId: 7031,
              task: 'Dienst',
              message: 'Der Dienst „Windows Defender" wurde unerwartet beendet.',
            },
            {
              id: 'evt-info-1',
              level: 'Information',
              dateTime: '21.06.2026 06:00:00',
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
          interactions: ['report:evt-breach'],
          allRequired: true,
          resultText:
            'Korrekt! Nach dutzenden Fehlversuchen meldete sich der Angreifer von 10.0.0.66 um 03:17 erfolgreich als „Administrator" an (Event 4624). Das ist der Einbruch.',
          skillGain: { windows: 2, security: 5 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Filter oben auf „Überwachung fehlgeschlagen". Fällt dir ein Muster auf?"',
        '🤖 Bjorg: "Alle Fehlversuche: Konto „Administrator", Quelle 10.0.0.66. Klassischer Brute-Force."',
        '🤖 Bjorg: "Jetzt die entscheidende Frage: Gibt es eine ERFOLGREICHE Anmeldung (4624) von genau dieser IP? Such sie, wähl sie aus, melde sie."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'kritis', 'incident'],
  },

  {
    id: 'gui_uac_unsigned_exe',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Early security/phishing awareness — right after the first hands-on lessons.
    requires: { events: ['learn_02_hidden_notes'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Die verdächtige Berechtigungsanfrage',
    description: `Du hast einen E-Mail-Anhang heruntergeladen — angeblich eine Rechnung. Beim Doppelklick poppt sofort die Benutzerkontensteuerung auf und will Administratorrechte.

\`\`\`
[NACHRICHT VON: bjorg] "Stopp. Lies das Fenster GENAU, bevor du klickst.
                        Herausgeber? Dateiendung? Woher kommt die Datei?
                        Im Zweifel: ablehnen. Ein Klick auf „Ja" gibt vollen Zugriff."
\`\`\`

**Deine Aufgabe:** Entscheide richtig über die UAC-Anfrage.`,
    mentorNote:
      'UAC-Prüfung: (1) Verifizierter Herausgeber? „Unbekannt" = Warnsignal. (2) Dateiendung — „.pdf.exe" ist eine getarnte ausführbare Datei. (3) Herkunft — Download-Ordner aus einer E-Mail. Alle drei sprechen für Ablehnen.',
    choices: [
      {
        id: 'handle_uac',
        text: 'UAC-Dialog prüfen...',
        effects: { skills: { windows: 3, security: 4 }, stress: -1 },
        resultText:
          'Richtig abgelehnt. Die getarnte EXE wurde nicht ausgeführt. Du meldest die Phishing-Mail an die IT-Security und löschst den Anhang.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'uac',
      title: 'Benutzerkontensteuerung',
      hostname: 'WS-AZUBI-07',
      briefing:
        'Prüfe Herausgeber, Dateiendung und Herkunft, bevor du klickst. Eine unsignierte EXE aus dem Download-Ordner gehört abgelehnt.',
      state: {
        uac: {
          program: 'Rechnung_Juni_2026.pdf.exe',
          publisher: 'Kein verifizierter Herausgeber',
          verifiedPublisher: false,
          programPath: 'C:\\Users\\azubi\\Downloads\\Rechnung_Juni_2026.pdf.exe',
          fileOrigin: 'Heruntergeladen aus E-Mail-Anhang (Internet)',
          riskFeedback:
            'Achtung: Das ist die riskante Wahl. „Rechnung_Juni_2026.pdf.exe" ist eine getarnte ausführbare Datei ohne verifizierten Herausgeber. Mit „Ja" bekäme die Datei Administratorrechte. Wähle „Nein".',
        },
      },
      solutions: [
        {
          interactions: ['answer:uac:no'],
          allRequired: true,
          resultText:
            'Korrekt abgelehnt! Endung „.pdf.exe", kein verifizierter Herausgeber, Herkunft E-Mail — eindeutig ein Schadprogramm. Du hast die Ausführung verhindert.',
          skillGain: { windows: 3, security: 6 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Schau auf „Verifizierter Herausgeber". Steht da „Unbekannt"? Schlechtes Zeichen."',
        '🤖 Bjorg: "Und die Dateiendung: „.pdf.exe" — das ist KEIN PDF, das ist ein Programm."',
        '🤖 Bjorg: "Unsigniert + getarnt + aus einer Mail. Klick „Nein"."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'uac', 'phishing'],
  },

  {
    id: 'gui_taskmanager_doppelganger',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Reinforcement of the rogue-process level, gated behind the process lesson.
    requires: { events: ['gui_taskmanager_rogue', 'learn_07_necromancer'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Der Doppelgänger',
    description: `Schon wieder ein Rechner am Anschlag — aber diesmal ist es nicht so offensichtlich. Diesmal versteckt sich der Schädling zwischen den System-Prozessen.

\`\`\`
[NACHRICHT VON: bjorg] "Aufgepasst, der hier ist gerissen. Er nennt sich fast genau wie ein
                        Windows-Prozess — ein Buchstabe vertauscht, und du killst aus Versehen
                        das echte System. Lies die Namen GENAU. Und nicht jeder Prozess mit
                        viel CPU ist böse — manchmal ist es nur der Virenscanner."
\`\`\`

**Deine Aufgabe:** Finde den getarnten Schadprozess — und lass die echten System-Prozesse in Ruhe.`,
    mentorNote:
      'Typosquatting bei Prozessnamen: „scvhost.exe" statt „svchost.exe", „lsass.exe" vs „1sass.exe". Der echte svchost.exe ist ein kritischer Dienst-Hostprozess. Außerdem wichtig: hohe CPU-Last ist nicht automatisch Malware — der Defender-Scan (MsMpEng.exe) lastet einen Rechner kurzzeitig legitim aus.',
    choices: [
      {
        id: 'open_taskmanager_dg',
        text: 'Task-Manager öffnen (Strg+Shift+Esc)...',
        effects: { skills: { windows: 5, security: 3 }, stress: -1 },
        resultText:
          'Den getarnten Prozess identifiziert und beendet, ohne das System zu beschädigen. Du sicherst die Datei für die Forensik und meldest den Fund.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'taskmanager',
      title: 'Task-Manager',
      hostname: 'WS-FINANZ-12',
      briefing:
        'Achtung auf Tippfehler-Tarnung: Ein Schadprozess imitiert einen Systemnamen mit vertauschten Buchstaben. Wähle den ECHTEN Übeltäter aus und beende ihn — System-Prozesse blockt Windows ohnehin.',
      state: {
        taskManager: {
          processes: [
            { name: 'System', pid: 4, cpu: 0, memoryMb: 22, description: 'NT Kernel & System', critical: true },
            { name: 'svchost.exe', pid: 1012, cpu: 2, memoryMb: 156, description: 'Hostprozess für Windows-Dienste', critical: true },
            { name: 'lsass.exe', pid: 776, cpu: 1, memoryMb: 38, description: 'Lokale Sicherheitsautorität', critical: true },
            { name: 'MsMpEng.exe', pid: 2884, cpu: 41, memoryMb: 540, description: 'Antimalware Service Executable (Microsoft Defender — Scan läuft)' },
            { name: 'explorer.exe', pid: 3320, cpu: 1, memoryMb: 201, description: 'Windows-Explorer' },
            { name: 'scvhost.exe', pid: 8123, cpu: 88, memoryMb: 612, description: 'Unbekannt — gestartet aus C:\\Users\\Public\\Temp, kein verifizierter Herausgeber' },
            { name: 'OUTLOOK.EXE', pid: 4501, cpu: 3, memoryMb: 318, description: 'Microsoft Outlook' },
            { name: 'Teams.exe', pid: 6190, cpu: 4, memoryMb: 488, description: 'Microsoft Teams' },
          ],
        },
      },
      solutions: [
        {
          interactions: ['endtask:scvhost.exe'],
          allRequired: true,
          resultText:
            'Richtig! „scvhost.exe" (mit vertauschtem v/c) ist KEIN Windows-Prozess — der echte heißt „svchost.exe". Gestartet aus einem Temp-Ordner, unsigniert: ein getarnter Schädling. Beendet.',
          skillGain: { windows: 3, security: 3 },
        },
      ],
      hints: [
        '🤖 Bjorg: "MsMpEng.exe mit 41% — das ist der Defender beim Scannen. Legitim, Finger weg."',
        '🤖 Bjorg: "Lies die Namen Buchstabe für Buchstabe. svchost… scvhost… Merkst du was?"',
        '🤖 Bjorg: "Der echte svchost.exe ist kritisch und liegt nie unter C:\\Users\\Public\\Temp. Beende „scvhost.exe"."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'malware', 'typosquatting'],
  },

  {
    id: 'gui_eventviewer_persistence',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Follows the brute-force level + the process-hunting lesson.
    requires: { events: ['gui_eventviewer_bruteforce', 'learn_06_zombie_hunt'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Die Hintertür',
    description: `Der Brute-Force von letzter Nacht ist eingedämmt, das Konto gesperrt. Aber Bjorg ist nicht beruhigt.

\`\`\`
[NACHRICHT VON: bjorg] "Ein Angreifer, der einmal drin war, baut sich eine Hintertür — ein
                        eigenes Konto, damit er auch nach dem Passwort-Reset wieder reinkommt.
                        Such im Protokoll, was er NACH dem Einbruch gemacht hat. Irgendwo hat
                        er sich ein Konto angelegt und es zum Admin gemacht. DAS ist die Bombe."
\`\`\`

**Deine Aufgabe:** Finde den Beweis, dass sich der Angreifer dauerhaften Zugang verschafft hat, und melde ihn.`,
    mentorNote:
      'Persistenz nach einem Einbruch: Event-ID 4720 = neues Benutzerkonto erstellt, 4732/4728 = Konto einer privilegierten Gruppe (z. B. Administratoren) hinzugefügt, 1102 = Sicherheitsprotokoll gelöscht (Anti-Forensik). Ein frisch erstelltes Konto, das Minuten später Admin wird, ist eine klassische Backdoor — und meldepflichtig.',
    choices: [
      {
        id: 'open_eventviewer_persist',
        text: 'Ereignisanzeige öffnen...',
        effects: { skills: { windows: 4, security: 6 }, stress: -1 },
        resultText:
          'Du hast das Hintertür-Konto entdeckt, dokumentiert und sofort deaktiviert. Das Incident-Team weitet die Untersuchung auf laterale Bewegung aus.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'eventviewer',
      title: 'Ereignisanzeige',
      hostname: 'DC01',
      briefing:
        'Der Login war nur der Anfang. Suche das Ereignis, mit dem sich der Angreifer DAUERHAFTEN Zugang gesichert hat: ein neu angelegtes Konto, das zum Administrator gemacht wurde. Wähle es aus und klicke „Als Vorfall melden".',
      state: {
        eventViewer: {
          logName: 'Sicherheit',
          entries: [
            {
              id: 'evt-breach-prev',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 03:17:42',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: Administrator\nAnmeldetyp: 3 (Netzwerk)\nQuellnetzwerkadresse: 10.0.0.66\nHinweis: Bereits als kompromittiert gemeldet (Brute-Force).',
            },
            {
              id: 'evt-defender-off',
              level: 'Warnung',
              dateTime: '21.06.2026 03:19:05',
              source: 'Windows Defender',
              eventId: 5001,
              task: 'Echtzeitschutz',
              message: 'Der Echtzeitschutz wurde deaktiviert.',
            },
            {
              id: 'evt-newaccount',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 03:23:48',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4720,
              task: 'Benutzerkontenverwaltung',
              message:
                'Ein Benutzerkonto wurde erstellt.\nNeues Konto: helpdesk-svc$\nErstellt von: Administrator (10.0.0.66)\n\n⚠ Das Konto wurde von dem kompromittierten Administrator-Login angelegt — kein offizieller Onboarding-Vorgang.',
            },
            {
              id: 'evt-addadmin',
              level: 'Überwachung erfolgreich',
              dateTime: '21.06.2026 03:23:55',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4732,
              task: 'Sicherheitsgruppenverwaltung',
              message:
                'Ein Mitglied wurde einer sicherheitsaktivierten lokalen Gruppe hinzugefügt.\nGruppe: Administratoren\nMitglied: helpdesk-svc$\nDurchgeführt von: Administrator\n\n⚠ Frisch erstelltes Konto wird Sekunden später Administrator — Backdoor-Muster.',
            },
            {
              id: 'evt-logclear',
              level: 'Information',
              dateTime: '21.06.2026 03:31:10',
              source: 'Microsoft-Windows-Eventlog',
              eventId: 1102,
              task: 'Protokolllöschung',
              message:
                'Das Sicherheitsprotokoll wurde gelöscht.\nKonto: Administrator\n\nHinweis: Anti-Forensik. Der Angreifer wollte seine Spuren verwischen.',
            },
            {
              id: 'evt-legit-onboard',
              level: 'Überwachung erfolgreich',
              dateTime: '20.06.2026 09:14:02',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4720,
              task: 'Benutzerkontenverwaltung',
              message:
                'Ein Benutzerkonto wurde erstellt.\nNeues Konto: m.schulz\nErstellt von: hr-admin (10.0.1.5)\nStatus: Regulärer Onboarding-Vorgang über das HR-Tool.',
            },
            {
              id: 'evt-backup-ok',
              level: 'Information',
              dateTime: '21.06.2026 06:00:00',
              source: 'Microsoft-Windows-Security-Auditing',
              eventId: 4624,
              task: 'Anmeldung',
              message:
                'Ein Konto wurde erfolgreich angemeldet.\nKonto: backup-svc\nAnmeldetyp: 5 (Dienst)\nStatus: Geplanter Backup-Dienst.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['report:evt-addadmin'],
          allRequired: true,
          resultText:
            'Korrekt! Um 03:23 erstellte der Angreifer das Konto „helpdesk-svc$" (4720) und machte es Sekunden später zum Administrator (4732). Das ist die Hintertür — selbst nach dem Passwort-Reset hätte er so wieder Vollzugriff.',
          skillGain: { windows: 2, security: 4 },
          setsFlags: ['gui_persistence_full'],
        },
        {
          interactions: ['report:evt-newaccount'],
          allRequired: true,
          resultText:
            'Gut erkannt! „helpdesk-svc$" wurde um 03:23 vom kompromittierten Admin-Login erstellt (4720). Aber Achtung: Sekunden später wurde es zum Administrator gemacht (4732) — DIESE Rechte-Eskalation ist der eigentliche Hintertür-Mechanismus, und die hast du noch nicht gemeldet.',
          skillGain: { security: 2 },
          setsFlags: ['gui_persistence_partial'],
        },
      ],
      hints: [
        '🤖 Bjorg: "Der Login von 03:17 kennen wir schon. Schau, was DANACH passiert ist — 03:19, 03:23, 03:31."',
        '🤖 Bjorg: "Event 4720 = neues Konto. Es gibt zwei davon. Eins ist ein reguläres HR-Onboarding vom Vortag, eins kam mitten in der Nacht vom Angreifer."',
        '🤖 Bjorg: "„helpdesk-svc$" wird Sekunden nach der Erstellung Administrator (4732). DAS ist die Hintertür — wähl es aus und melde es."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'kritis', 'incident', 'persistence'],
  },

  {
    id: 'gui_uac_legit_install',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Optional reinforcement of the UAC judgement call — kept off the core path.
    requires: { events: ['gui_uac_unsigned_exe', 'learn_08_network_recon'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Nicht alles ist eine Bedrohung',
    description: `Du installierst gerade das vom Rechenzentrum freigegebene Archiv-Tool, das auf der internen Software-Liste steht. Du hast es selbst aus dem firmeneigenen Software-Portal gestartet. Sofort meldet sich die Benutzerkontensteuerung.

\`\`\`
[NACHRICHT VON: bjorg] "Letztes Mal hast du richtig abgelehnt. Aber pass auf: Sicherheit
                        heißt nicht „immer Nein". Wenn du JEDE Abfrage wegklickst, kann
                        keiner mehr arbeiten — und die Leute schalten die UAC genervt ab.
                        Prüf das Fenster. Wenn alles sauber ist, lass es zu."
\`\`\`

**Deine Aufgabe:** Prüfe die UAC-Anfrage und entscheide richtig.`,
    mentorNote:
      'Die UAC-Prüfung funktioniert in beide Richtungen. Signale für „zulassen": (1) verifizierter, bekannter Herausgeber, (2) erwartete, selbst gestartete Aktion, (3) vertrauenswürdige Herkunft (internes Portal, kein E-Mail-Download). Pauschales Ablehnen blockiert legitime Arbeit und führt dazu, dass Nutzer Schutzmechanismen umgehen — schlechtes Sicherheitsverhalten.',
    choices: [
      {
        id: 'handle_uac_legit',
        text: 'UAC-Dialog prüfen...',
        effects: { skills: { windows: 3, security: 3 }, stress: -1 },
        resultText:
          'Sauber geprüft und korrekt zugelassen. Das freigegebene Tool wird installiert — ohne unnötige Reibung und ohne Sicherheitsrisiko.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'uac',
      title: 'Benutzerkontensteuerung',
      hostname: 'WS-AZUBI-07',
      briefing:
        'Diesmal geht es ums Abwägen: Verifizierter Herausgeber, selbst gestartet, aus dem internen Portal. Prüfe Herausgeber, Herkunft und ob du die Aktion erwartet hast — und entscheide.',
      state: {
        uac: {
          program: '7-Zip 24.08 (x64) Setup',
          publisher: 'Igor Pavlov',
          verifiedPublisher: true,
          programPath: 'C:\\ProgramData\\SoftwarePortal\\Approved\\7z2408-x64.msi',
          fileOrigin: 'Internes Software-Portal (freigegeben durch Rechenzentrum)',
          riskFeedback:
            'Hinweis: Dieser Herausgeber ist verifiziert und die Datei stammt aus dem freigegebenen internen Portal. Hier ist „Ja" die richtige Wahl — pauschales Ablehnen würde nur die genehmigte Installation blockieren.',
        },
      },
      solutions: [
        {
          interactions: ['answer:uac:yes'],
          allRequired: true,
          resultText:
            'Richtig zugelassen! Verifizierter Herausgeber („Igor Pavlov"), Herkunft aus dem freigegebenen internen Portal, von dir selbst gestartet — alle Signale sind sauber. Sicherheit heißt prüfen, nicht pauschal blockieren.',
          skillGain: { windows: 4, security: 5 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Schau zuerst auf „Verifizierter Herausgeber". Diesmal steht da ein echter Name — kein „Unbekannt"."',
        '🤖 Bjorg: "Die Datei liegt in C:\\ProgramData\\SoftwarePortal\\Approved — also freigegeben, nicht aus einer Mail."',
        '🤖 Bjorg: "Signiert + freigegeben + von dir gestartet. Das ist genau der Fall für „Ja"."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'uac', 'judgement'],
  },

  {
    id: 'gui_settings_reharden',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    // Capstone: the re-hardening after the incident-response boss lesson.
    requires: { events: ['gui_eventviewer_persistence', 'learn_10_incident_boss'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Den Schutz wiederherstellen',
    description: `Der Angreifer ist raus, das Hintertür-Konto deaktiviert. Aber er hat den Rechner „blind" gemacht: Microsoft Defender ist aus.

\`\`\`
[NACHRICHT VON: bjorg] "Bevor wir hier weitermachen: Der Kerl hat den Echtzeitschutz und die
                        Firewall abgeschaltet. Und er konnte das nur, weil der Manipulationsschutz
                        aus war. Mach ALLE drei wieder an — sonst schaltet der nächste sie genauso
                        leicht wieder ab. Und lass die Sachen in Ruhe, die schon richtig stehen."
\`\`\`

**Deine Aufgabe:** Stelle den Schutz wieder her — Echtzeitschutz, Firewall (Domäne) und Manipulationsschutz.`,
    mentorNote:
      'Manipulationsschutz (Tamper Protection) ist die Wurzel: Ist er aus, kann Schadcode/Angreifer Defender & Firewall einfach deaktivieren. Reihenfolge in der Praxis: erst Tamper Protection an, dann bleiben die anderen Einstellungen auch geschützt. Cloud-Schutz/SmartScreen stehen bereits richtig — nicht „aus Reflex" alles umschalten.',
    choices: [
      {
        id: 'open_settings_harden',
        text: 'Windows-Sicherheit öffnen...',
        effects: { skills: { windows: 5, security: 5 }, stress: -1 },
        resultText:
          'Schutzfunktionen wiederhergestellt und gegen erneutes Abschalten gehärtet. Du dokumentierst die Änderungen im Incident-Ticket.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'settings',
      title: 'Windows-Sicherheit',
      hostname: 'DC01',
      briefing:
        'Schalte die vom Angreifer deaktivierten Schutzfunktionen wieder ein: Echtzeitschutz, Domänen-Firewall und Manipulationsschutz. Einstellungen, die bereits korrekt (grün) sind, lässt du unverändert.',
      // Callback to the persistence level: the framing reacts to whether the
      // player spotted the privilege escalation (full) or only the new account
      // (partial). Player holds exactly one of these flags by the time they're here.
      briefingVariants: [
        {
          flag: 'gui_persistence_partial',
          briefing:
            'Erinnerung: Du hast das Backdoor-Konto erkannt, aber die Rechte-Eskalation (Event 4732) übersehen — genau die gab dem Angreifer Admin-Macht. Umso wichtiger jetzt: Schalte Echtzeitschutz, Domänen-Firewall und Manipulationsschutz wieder ein. Was schon grün ist, lässt du in Ruhe.',
        },
        {
          flag: 'gui_persistence_full',
          briefing:
            'Gute Arbeit — du hast die Hintertür inklusive Rechte-Eskalation (4732) erkannt und gemeldet. Jetzt der letzte Schritt: Härte den Schutz, den der Angreifer abgeschaltet hat — Echtzeitschutz, Domänen-Firewall und Manipulationsschutz. Was schon grün ist, lässt du unverändert.',
        },
      ],
      state: {
        settings: {
          settings: [
            { id: 'realtime-protection', category: 'Viren- & Bedrohungsschutz', label: 'Echtzeitschutz', description: 'Vom Angreifer um 03:19 deaktiviert (Event 5001).', enabled: false, recommended: true },
            { id: 'tamper-protection', category: 'Viren- & Bedrohungsschutz', label: 'Manipulationsschutz', description: 'Verhindert, dass Schutzfunktionen unbefugt abgeschaltet werden.', enabled: false, recommended: true },
            { id: 'cloud-protection', category: 'Viren- & Bedrohungsschutz', label: 'Über Cloud bereitgestellter Schutz', enabled: true, recommended: true },
            { id: 'sample-submission', category: 'Viren- & Bedrohungsschutz', label: 'Automatische Übermittlung von Beispielen', description: 'Bereits aktiv — kein Handlungsbedarf.', enabled: true, recommended: true },
            { id: 'firewall-domain', category: 'Firewall- & Netzwerkschutz', label: 'Domänennetzwerk-Firewall', description: 'Vom Angreifer deaktiviert.', enabled: false, recommended: true },
            { id: 'firewall-private', category: 'Firewall- & Netzwerkschutz', label: 'Privates Netzwerk-Firewall', enabled: true, recommended: true },
            { id: 'smartscreen', category: 'App- & Browsersteuerung', label: 'SmartScreen für Apps und Dateien', enabled: true, recommended: true },
            {
              id: 'dev-mode',
              category: 'Für Entwickler',
              label: 'Entwicklermodus',
              enabled: false,
              recommended: false,
              locked: true,
              riskFeedback:
                'Der Entwicklermodus gehört auf einem Domänencontroller AUS — und ist hier ohnehin per Richtlinie gesperrt.',
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['enable:realtime-protection', 'enable:firewall-domain', 'enable:tamper-protection'],
          allRequired: true,
          resultText:
            'Stark! Echtzeitschutz und Domänen-Firewall sind wieder an — und durch den Manipulationsschutz kann der nächste Angreifer sie nicht mehr so einfach abschalten. Du hast nicht nur repariert, sondern gehärtet.',
          skillGain: { windows: 2, security: 4 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Drei Sachen sind rot/„Aktion nötig". Genau die hat der Angreifer abgeschaltet."',
        '🤖 Bjorg: "Echtzeitschutz und Domänen-Firewall sind klar. Aber WARUM konnte er die abschalten?"',
        '🤖 Bjorg: "Manipulationsschutz war aus. Mach den auch an — sonst war die ganze Mühe umsonst."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'hardening', 'defender'],
  },

  {
    id: 'gui_explorer_open_share',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_09_windows_realm'] },
    category: 'training',
    involvedCharacters: [],
    title: 'GUI-Lektion: Die offene Freigabe',
    description: `Bei einer Routine-Prüfung der Dateiserver fällt dir der Finanz-Share auf. Du öffnest die Berechtigungen — und stockst.

\`\`\`
[NACHRICHT VON: bjorg] "Finanzdaten, und „Jeder" hat Vollzugriff? Das heißt: jeder im Haus
                        kann Gehaltslisten lesen UND ändern. Räum das auf — aber nur das,
                        was wirklich zu weit offen ist. Buchhaltung und Admins brauchen ihren Zugriff."
\`\`\`

**Deine Aufgabe:** Entferne die zu weit gefasste Berechtigung auf dem Finanz-Share.`,
    mentorNote:
      'Least Privilege: „Jeder"/„Everyone" auf einem sensiblen Share ist eine klassische Fehlkonfiguration — jeder authentifizierte Nutzer (oft sogar mehr) erhält Zugriff. Entfernen, aber legitime Gruppen (Fachabteilung, Administratoren) behalten.',
    choices: [
      {
        id: 'open_share_acl',
        text: 'Freigabe-Berechtigungen öffnen...',
        effects: { skills: { windows: 4, security: 4 }, stress: -1 },
        resultText:
          'Die offene Berechtigung ist weg. Der Finanz-Share ist jetzt auf die Gruppen beschränkt, die ihn wirklich brauchen — dokumentiert im Change-Log.',
        guiCommand: true,
      },
    ],
    guiContext: {
      app: 'explorer',
      title: 'Eigenschaften: Finanzen',
      hostname: 'FILESRV01',
      briefing:
        'Im Reiter „Sicherheit": Wähle den zu weit gefassten Eintrag aus und klicke „Entfernen". Legitime Gruppen (Buchhaltung, Administratoren) lässt du unangetastet.',
      state: {
        explorer: {
          shareName: 'Finanzen',
          sharePath: '\\\\FILESRV01\\Finanzen',
          entries: [
            {
              id: 'admins',
              principal: 'Administratoren',
              permission: 'Vollzugriff',
              critical: true,
              riskFeedback:
                'Ohne die Gruppe „Administratoren" lässt sich die Freigabe nicht mehr verwalten — diesen Eintrag nicht entfernen.',
            },
            {
              id: 'buchhaltung',
              principal: 'Buchhaltung-RW',
              permission: 'Ändern',
              critical: true,
              riskFeedback:
                'Die Buchhaltung benötigt Schreibzugriff für ihre tägliche Arbeit. Das ist eine legitime, gezielte Berechtigung — nicht entfernen.',
            },
            {
              id: 'jeder',
              principal: 'Jeder',
              permission: 'Vollzugriff',
              overlyBroad: true,
            },
          ],
        },
      },
      solutions: [
        {
          interactions: ['remove:jeder'],
          allRequired: true,
          resultText:
            'Richtig! „Jeder: Vollzugriff" auf einem Finanz-Share heißt: das ganze Haus konnte Gehaltslisten lesen UND ändern. Buchhaltung und Administratoren behalten ihren gezielten Zugriff.',
          skillGain: { windows: 2, security: 4 },
        },
      ],
      hints: [
        '🤖 Bjorg: "Schau die Spalte „Berechtigung" an — welcher Eintrag gibt ALLEN Vollzugriff?"',
        '🤖 Bjorg: "„Jeder" (Everyone) auf einem Finanz-Share = jeder im Netz darf lesen und schreiben. Das gehört weg."',
        '🤖 Bjorg: "Wähl „Jeder" aus und „Entfernen". Buchhaltung und Administratoren lässt du in Ruhe."',
      ],
    },
    tags: ['learning', 'gui', 'windows', 'security', 'acl', 'least-privilege'],
  },
];
