import { GameEvent } from '@kritis/shared';

/**
 * Advanced learning levels for the multi-host ShellEngine (real ssh/scp/
 * ssh-keygen/ssh-copy-id, systemd/journal, firewall, ansible). These use
 * declarative `stateGoals` instead of canned command tagging.
 *
 * Track: SSH & Remote-Zugriff (Task B2). The systemd/net/ansible tracks
 * (B3–B5) will append their levels to this same array.
 */
export const advancedLearningEvents: GameEvent[] = [
  // ==========================================================================
  // Track: SSH & Remote-Zugriff
  // ==========================================================================

  {
    id: 'learn_ssh_01_first_key',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: ['bert'],
    title: 'SSH 1: Der erste Schlüssel',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  TICKET #4711 — Zugriff web01                                ║
║  Melder: Bert (IT-Leitung)                                   ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert lehnt sich in deine Tür: „Der Webserver braucht ab heute
gepflegte Zugänge. Passwörter tippen wir hier nicht mehr durch
die Gegend — bau dir ein SSH-Schlüsselpaar und hinterleg es
auf web01. Das Admin-Passwort steht im Safe-Zettel in deinem
Home. Danach will ich sehen, dass du OHNE Passwort raufkommst.“

**Deine Aufgabe:**
- Erzeuge ein Schlüsselpaar (ed25519)
- Hinterlege den öffentlichen Schlüssel auf web01 (User: admin)
- Logge dich passwortlos auf web01 ein`,
    mentorNote:
      'Öffentlicher Schlüssel = Schloss (darf jeder sehen), privater Schlüssel = Schlüssel (bleibt bei dir, Rechte 600).',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest das Terminal und machst dich an die Arbeit.',
      },
      {
        id: 'later',
        text: 'Erst das Ticket zu Ende lesen (kostet Zeit, +Kontext)',
        effects: { stress: -2 },
        resultText:
          'Du atmest durch und liest das Ticket zweimal. Kein Ruhm, aber ein klarer Kopf.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ws-admin',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Schlüsselpaar erzeugen, Public Key auf web01 (admin) hinterlegen, passwortlos einloggen.',
      vfsOverlay: {
        files: [
          {
            path: '/home/timo/safe-zettel.txt',
            content:
              'web01 / admin\nPasswort: sonnenblume23\n(NACH KEY-ROLLOUT VERNICHTEN — Bert)',
          },
        ],
      },
      hosts: [
        {
          id: 'web01',
          hostname: 'web01',
          ip: '10.0.20.11',
          templateIds: ['linux-webserver'],
          accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
        },
      ],
      commands: [],
      commandSkillGain: {
        'ssh-keygen': { linux: 2, security: 1 },
        'ssh-copy-id': { linux: 1, security: 2 },
        ssh: { linux: 2 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'web01', file: '/home/admin/.ssh/authorized_keys', matches: 'ssh-ed25519' },
          ],
          resultText:
            'Der Schlüssel liegt auf web01. Beim nächsten `ssh admin@web01` fragt niemand mehr nach einem Passwort — und der Safe-Zettel kann in den Schredder.\n\nMerke: Der PRIVATE Schlüssel hat deinen Rechner nie verlassen. Genau so soll es sein.',
          skillGain: { linux: 3, security: 3 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Erst brauchst du ein Schlüsselpaar. Es gibt ein Standard-Werkzeug dafür — der Name beginnt mit ssh-…',
        '🤖 Jens: `ssh-keygen -t ed25519` erzeugt das Paar in ~/.ssh/. Die Passphrase darfst du hier leer lassen.',
        '🤖 Jens: Zum Verteilen gibt es ssh-copy-id. Das Admin-Passwort steht im Safe-Zettel (`cat safe-zettel.txt`).',
        '🤖 Jens: Komplett: `ssh-keygen -t ed25519` → `ssh-copy-id admin@web01` (Passwort: siehe Zettel) → `ssh admin@web01`.',
      ],
    },
    tags: ['learning', 'ssh', 'terminal'],
  },

  {
    id: 'learn_ssh_02_open_door',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ssh_01_first_key'] },
    category: 'training',
    involvedCharacters: ['bert'],
    title: 'SSH 2: Die offene Tür',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  AUDIT-BEFUND — web01 sshd                                   ║
║  Weitergeleitet von: Bert (IT-Leitung)                      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert schiebt dir den Audit-Befund über den Tisch: „Auf web01
steht die Tür sperrangelweit offen — Root darf sich per SSH
einloggen, und Passwort-Logins sind erlaubt. Beides gehört zu.
Aber pass auf mit der Reihenfolge: Erst prüfst du, dass DEIN
Schlüssel greift, DANN drehst du die Passwörter ab. Wer das
umdreht und keinen Key hat, sperrt sich selbst aus — und dann
klingle ich dich nachts aus dem Rechenzentrum.“

**Deine Aufgabe:**
- Melde dich auf web01 an (admin)
- Setze \`PermitRootLogin no\` und \`PasswordAuthentication no\`
- Lade den SSH-Dienst neu, damit die Härtung greift`,
    mentorNote:
      'Reihenfolge ist alles: zuerst testen, dass der Schlüssel-Login funktioniert — erst dann Passwort-Authentifizierung abschalten. sshd wertet die erste passende Zeile aus; ändere die BESTEHENDE Zeile, häng keine zweite an.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest das Terminal und machst dich an die Arbeit.',
      },
      {
        id: 'later',
        text: 'Erst den Audit-Befund komplett lesen (kostet Zeit, +Kontext)',
        effects: { stress: -2 },
        resultText:
          'Du liest den Befund zu Ende. Zwei Zeilen, ein klarer Auftrag — und eine Reihenfolge, die man nicht vertauschen darf.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ws-admin',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Auf web01 einloggen, PermitRootLogin no und PasswordAuthentication no setzen, sshd neu laden.',
      vfsOverlay: {
        files: [
          {
            path: '/home/timo/zugang-web01.txt',
            content: 'web01 / admin\nPasswort: sonnenblume23',
          },
        ],
      },
      hosts: [
        {
          id: 'web01',
          hostname: 'web01',
          ip: '10.0.20.11',
          templateIds: ['linux-webserver'],
          accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
          vfsOverlay: {
            files: [
              {
                path: '/etc/ssh/sshd_config',
                content:
                  '# SSH-Daemon Konfiguration web01\nPort 22\nPermitRootLogin yes\nPasswordAuthentication yes\nX11Forwarding no\n',
              },
            ],
          },
        },
      ],
      commands: [],
      commandSkillGain: {
        ssh: { linux: 1 },
        sed: { linux: 1, security: 1 },
        sudo: { linux: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PasswordAuthentication no' },
            { host: 'web01', service: 'ssh', serviceState: 'active' },
          ],
          resultText:
            'Beide Zeilen stehen jetzt auf „no“, der Dienst läuft mit der neuen Konfiguration. Root-Login und Passwort-Logins sind zu — ab jetzt kommt nur noch rein, wer einen hinterlegten Schlüssel hat.\n\nMerke: Erst den Schlüssel-Login testen, DANN die Passwort-Authentifizierung abschalten. Wer die Reihenfolge dreht und keinen Key hat, sperrt sich selbst aus.',
          skillGain: { linux: 3, security: 4 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Zwei Zeilen in der sshd-Konfiguration stehen auf „yes“, die gehören auf „no“. Aber log dich erst ein — und ändere die BESTEHENDEN Zeilen, häng keine neuen an.',
        '🤖 Jens: Rein kommst du mit ssh admin@web01 (Passwort steht in zugang-web01.txt). Die Konfiguration liegt in /etc/ssh/sshd_config.',
        '🤖 Jens: Zeilen gezielt ersetzen geht mit sed -i und einem Suchmuster am Zeilenanfang (^). Danach den Dienst neu laden.',
        "🤖 Jens: `ssh admin@web01` → `sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config` → dasselbe für `PasswordAuthentication` → `sudo systemctl restart ssh`.",
      ],
    },
    tags: ['learning', 'ssh', 'terminal', 'hardening'],
  },

  {
    id: 'learn_ssh_03_jumphost',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ssh_02_open_door'] },
    category: 'training',
    involvedCharacters: [],
    title: 'SSH 3: Sprung durch die Zone',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  NETZ-ZONEN — Zugriff Datenbank db01                         ║
║  Zone: KRITIS-DB (abgeschottet)                             ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Die Datenbank db01 liegt in einer eigenen, abgeschotteten Zone.
Direkt kommst du da nicht ran — die Firewall lässt nur EINE
Maschine auf Port 22: den Jumphost jump01. So ist das in der
kritischen Infrastruktur gebaut: Wer in die DB-Zone will, geht
über den Sprungserver, der als Einziger Vertrauen genießt.

**Deine Aufgabe:**
- Springe über jump01 in die abgeschottete Zone
- Hol den aktuellen Statusbericht der Datenbank (\`/var/dbdumps/status.txt\`)
- Leg ihn auf jump01 unter \`/tmp/statusbericht.txt\` ab`,
    mentorNote:
      'Netzsegmentierung: kritische Systeme sind nur über definierte Sprungpunkte erreichbar. Der Jumphost ist der einzige Host, dessen IP in der Firewall der DB-Zone freigeschaltet ist. Direktverbindungen laufen bewusst in die Zeitüberschreitung.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest das Terminal und machst dich an die Arbeit.',
      },
      {
        id: 'later',
        text: 'Erst den Zonenplan ansehen (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Du prägst dir den Weg ein: erst auf den Jumphost, von dort in die Zone. Nie direkt.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ws-admin',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Über jump01 auf db01 springen, /var/dbdumps/status.txt per scp auf jump01 nach /tmp/statusbericht.txt holen.',
      vfsOverlay: {
        files: [
          {
            path: '/home/timo/zonen-zugang.txt',
            content:
              'jump01 (Sprungserver) / admin\nPasswort: sprungbrett07\n\ndb01 (DB-Zone) / admin\nPasswort: kraftwerk-db-2024',
          },
        ],
      },
      hosts: [
        {
          id: 'jump01',
          hostname: 'jump01',
          ip: '10.0.30.5',
          accounts: [{ name: 'admin', password: 'sprungbrett07' }, { name: 'root' }],
        },
        {
          id: 'db01',
          hostname: 'db01',
          ip: '10.0.40.9',
          accounts: [{ name: 'admin', password: 'kraftwerk-db-2024' }, { name: 'root' }],
          firewall: {
            enabled: true,
            defaultIncoming: 'deny',
            rules: [{ action: 'allow', port: 22, from: '10.0.30.5' }],
          },
          vfsOverlay: {
            files: [
              {
                path: '/var/dbdumps/status.txt',
                content:
                  'DB-STATUS db01 — 2026-07-18 06:00\nReplikation: OK\nletztes Backup: 2026-07-18 03:00 (vollständig)\nfreier Speicher: 41%\n',
              },
            ],
          },
        },
      ],
      commands: [],
      commandSkillGain: {
        ssh: { linux: 1, security: 1 },
        scp: { linux: 2, security: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'jump01', file: '/tmp/statusbericht.txt', fileExists: true },
          ],
          resultText:
            'Der Statusbericht liegt auf dem Jumphost — und db01 hat keine einzige Direktverbindung von außen gesehen. Genau dafür gibt es die Zone: Die Datenbank kennt nur den Sprungserver, alles andere läuft ins Leere.\n\nMerke: In KRITIS-Netzen bewegt man sich in Zonen. Der Jumphost ist die kontrollierte Schleuse — nicht die Abkürzung drumherum.',
          skillGain: { linux: 3, security: 3 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: db01 liegt in einer abgeschotteten Zone — direkt kommst du da nicht ran, das läuft in die Zeitüberschreitung. Es gibt genau einen Weg hinein: über die Maschine, der die Zone vertraut.',
        '🤖 Jens: Zuerst auf den Sprungserver: ssh admin@jump01. Von DORT aus ist db01 erreichbar — die Firewall lässt nur den Jumphost auf Port 22.',
        '🤖 Jens: Den Bericht holst du nicht per Login, sondern per Dateikopie über SSH. Das Werkzeug dafür kopiert entfernt↔lokal.',
        '🤖 Jens: `ssh admin@jump01` → dann `scp admin@db01:/var/dbdumps/status.txt /tmp/statusbericht.txt` (Passwörter siehe zonen-zugang.txt).',
      ],
    },
    tags: ['learning', 'ssh', 'terminal', 'network', 'kritis'],
  },

  {
    id: 'learn_ssh_04_key_graveyard',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ssh_03_jumphost'] },
    category: 'training',
    involvedCharacters: [],
    title: 'SSH ★: Der Schlüsselfriedhof',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ★ AUDIT — verwaiste SSH-Schlüssel                          ║
║  Umfang: web01, jump01, db01                                ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Ein Key-Audit über alle drei Hosts. Auf den meisten Maschinen
stehen nur die Schlüssel, die dort hingehören — die von Jens und
Henry. Aber auf db01 hängt eine Zeile, die zu niemandem im Haus
gehört: Kommentar \`wartung@extern-2019\`. Kein Offboarding-
Protokoll kennt diesen Zugang.

Erst sicherst du den Ist-Zustand als Beweis — DANN räumst du auf.
In dieser Reihenfolge. Immer.

**Deine Aufgabe:**
- Sichere die \`authorized_keys\` von db01 als Beweiskopie auf deinen Rechner
- Entferne gezielt die verwaiste Zeile (\`wartung@extern-2019\`) auf db01
- Die legitimen Schlüssel (jens@, henry@) bleiben unangetastet`,
    mentorNote:
      'Beweissicherung zuerst: Wer eine Datei bereinigt, bevor er sie gesichert hat, vernichtet Spuren. Erst die Kopie ziehen, dann die eine verwaiste Zeile gezielt entfernen — niemals die ganze Datei löschen oder die Rechte zerstören, das sperrt die legitimen Keys mit aus.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest das Terminal und machst dich an die Arbeit.',
      },
      {
        id: 'later',
        text: 'Erst die Offboarding-Liste gegenprüfen (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Kein einziger Eintrag passt zu „extern-2019“. Was auch immer das ist — geplant war es nicht.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ws-admin',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'authorized_keys von db01 als Beweis sichern, dann die verwaiste Zeile wartung@extern-2019 auf db01 entfernen.',
      vfsOverlay: {
        files: [
          {
            path: '/home/timo/zugangsdaten.txt',
            content:
              'web01 / admin — Passwort: sonnenblume23\njump01 / admin — Passwort: sprungbrett07\ndb01 / admin — Passwort: kraftwerk-db-2024',
          },
        ],
      },
      hosts: [
        {
          id: 'web01',
          hostname: 'web01',
          ip: '10.0.20.11',
          accounts: [{ name: 'admin', password: 'sonnenblume23' }, { name: 'root' }],
          vfsOverlay: {
            files: [
              {
                path: '/home/admin/.ssh/authorized_keys',
                content:
                  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitJensKeyMaterial01 jens@ws-jens\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitHenryKeyMaterial1 henry@ws-henry\n',
              },
            ],
          },
        },
        {
          id: 'jump01',
          hostname: 'jump01',
          ip: '10.0.30.5',
          accounts: [{ name: 'admin', password: 'sprungbrett07' }, { name: 'root' }],
          vfsOverlay: {
            files: [
              {
                path: '/home/admin/.ssh/authorized_keys',
                content:
                  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitJensKeyMaterial01 jens@ws-jens\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitHenryKeyMaterial1 henry@ws-henry\n',
              },
            ],
          },
        },
        {
          id: 'db01',
          hostname: 'db01',
          ip: '10.0.40.9',
          accounts: [{ name: 'admin', password: 'kraftwerk-db-2024' }, { name: 'root' }],
          vfsOverlay: {
            files: [
              {
                path: '/home/admin/.ssh/authorized_keys',
                content:
                  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitJensKeyMaterial01 jens@ws-jens\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILegitHenryKeyMaterial1 henry@ws-henry\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIRogueFenrisBackdoorKey00 wartung@extern-2019\n',
              },
            ],
          },
        },
      ],
      commands: [],
      commandSkillGain: {
        scp: { security: 2, linux: 1 },
        ssh: { linux: 1 },
        sed: { security: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { file: '/home/timo/evidenz_db01.txt', matches: 'wartung@extern' },
            { host: 'db01', file: '/home/admin/.ssh/authorized_keys', absentMatches: 'wartung@extern' },
          ],
          resultText:
            'Der Wartungsschlüssel „wartung@extern-2019“ ist raus — und die Beweiskopie liegt sicher auf deinem Rechner, gezogen BEVOR du etwas verändert hast. Genau diese Reihenfolge zählt: erst sichern, dann bereinigen. Die legitimen Keys von Jens und Henry sind unangetastet.\n\nDer Kommentar „extern-2019“ passt in kein Offboarding-Protokoll, das wir haben. Jens wird still: „Das Ding liegt seit Jahren auf db01. Wenn das zu FENRIS gehört, reden wir nicht über einen Zufall.“ Du markierst den Fund für die Incident-Akte.',
          skillGain: { security: 6, linux: 3, troubleshooting: 2 },
          effects: { stress: -4 },
        },
      ],
      hints: [
        '🤖 Jens: Auf einem der Hosts hängt ein Schlüssel, der zu niemandem mehr gehört. Bevor du etwas löschst: sichere den Ist-Zustand. Beweise erst, dann aufräumen.',
        '🤖 Jens: Zieh dir die authorized_keys von db01 als Kopie auf deinen Rechner — per Dateikopie über SSH. Erst wenn die Beweiskopie liegt, fasst du das Original an.',
        '🤖 Jens: Der fremde Key trägt den Kommentar wartung@extern-2019. Die legitimen Schlüssel (jens@, henry@) bleiben. Entferne gezielt nur die eine Zeile.',
        "🤖 Jens: `scp admin@db01:/home/admin/.ssh/authorized_keys evidenz_db01.txt` → dann `ssh admin@db01` → `sed -i '/wartung@extern/d' /home/admin/.ssh/authorized_keys`.",
      ],
    },
    tags: ['learning', 'ssh', 'terminal', 'security', 'forensics', 'offboarding'],
  },
];
