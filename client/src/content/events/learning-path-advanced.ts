import { GameEvent, TerminalHostSpec } from '@kritis/shared';

/**
 * Advanced learning levels for the multi-host ShellEngine (real ssh/scp/
 * ssh-keygen/ssh-copy-id, systemd/journal, firewall, ansible). These use
 * declarative `stateGoals` instead of canned command tagging.
 *
 * Track: SSH & Remote-Zugriff (Task B2). The systemd/net/ansible tracks
 * (B3–B5) will append their levels to this same array.
 */

// ============================================================================
// Ansible track shared seeding (Task B5)
// ----------------------------------------------------------------------------
// Ansible connects controller → target via KEY AUTH ONLY. The controller
// (ansible01, user `deploy`) holds a mode-600 private key; every target carries
// the matching public key in deploy's authorized_keys. Same literal key on both
// sides. The private key MUST be 600 — a 644 key is skipped as UNPROTECTED and
// the connection fails UNREACHABLE.
// ============================================================================

const ANSIBLE_PUBKEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKr1t1sd3pl0yAnsibleControllerKey0000000000000000 deploy@ansible01';

const ANSIBLE_PRIVKEY =
  '-----BEGIN OPENSSH PRIVATE KEY-----\n' +
  'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gt\n' +
  'ZWQyNTUxOQAAACCKr1t1sd3pl0yAnsibleControllerKey00000000000000000000AA\n' +
  '-----END OPENSSH PRIVATE KEY-----\n';

/** Controller ~/.ssh: private key (600) + matching public key. */
const controllerSshFiles = [
  { path: '/home/deploy/.ssh/id_ed25519', content: ANSIBLE_PRIVKEY, mode: '600' },
  { path: '/home/deploy/.ssh/id_ed25519.pub', content: ANSIBLE_PUBKEY + '\n' },
];

/** The one authorized_keys line every target trusts for user `deploy`. */
const authorizedKeysFile = {
  path: '/home/deploy/.ssh/authorized_keys',
  content: ANSIBLE_PUBKEY + '\n',
};

const ANSIBLE_INVENTORY = '[web]\nweb01\nweb02\nweb03\n';

/** A managed web host: deploy account trusts the controller key; extra files
 *  layer the level-specific config on top. */
function webHost(
  id: string,
  ip: string,
  files: { path: string; content: string; mode?: string }[] = [],
): TerminalHostSpec {
  return {
    id,
    hostname: id,
    ip,
    accounts: [{ name: 'deploy' }, { name: 'root' }, { name: 'admin' }],
    vfsOverlay: { files: [authorizedKeysFile, ...files] },
  };
}

/** sshd_config with exactly one PermitRootLogin/PasswordAuthentication line
 *  each (lineinfile replaces the FIRST match — no duplicates allowed). */
const sshdConfig = (permitRoot: 'yes' | 'no', passwordAuth: 'yes' | 'no'): string =>
  `# Managed by Stadtwerke IT\nPort 22\nPermitRootLogin ${permitRoot}\nPasswordAuthentication ${passwordAuth}\nX11Forwarding no\n`;
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
      'Reihenfolge ist alles: zuerst testen, dass der Schlüssel-Login funktioniert — erst dann Passwort-Authentifizierung abschalten. sshd wertet die erste passende Zeile aus; ändere die BESTEHENDE Zeile, häng keine zweite an (sonst gewinnt weiter das alte „yes“). Systemdateien unter /etc gehören root — dafür brauchst du sudo.',
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
        sudo: { linux: 1, security: 1 },
        sed: { linux: 1, security: 1 },
      },
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Both directives must end up on "no" AND the insecure "yes" line
            // must be GONE — otherwise appending a "no" below the surviving
            // "yes" would pass while sshd still honours the first (yes) match.
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web01', file: '/etc/ssh/sshd_config', absentMatches: '^PermitRootLogin yes' },
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PasswordAuthentication no' },
            { host: 'web01', file: '/etc/ssh/sshd_config', absentMatches: '^PasswordAuthentication yes' },
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
        '🤖 Jens: Zeilen gezielt ersetzen geht mit sed -i und einem Suchmuster am Zeilenanfang (^). Die Konfig liegt root, also mit sudo. Danach den Dienst neu laden.',
        "🤖 Jens: `ssh admin@web01` → `sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config` → dasselbe für `PasswordAuthentication` → `sudo systemctl restart ssh`.",
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
            // Must be the REAL report copied from db01 (content marker) — a bare
            // `touch` of an empty file would bypass the whole jump-through lesson.
            { host: 'jump01', file: '/tmp/statusbericht.txt', matches: 'DB-STATUS db01' },
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
            // Evidence must be the FULL rogue key line (a bare `echo wartung@extern`
            // can't fake it); the live key must be gone from db01.
            { file: '/home/timo/evidenz_db01.txt', matches: 'RogueFenrisBackdoorKey00 wartung@extern-2019' },
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

  // ==========================================================================
  // Track: systemd & Journal
  // ==========================================================================

  {
    id: 'learn_sysd_01_silent_service',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: ['bjorg'],
    title: 'systemd 1: Der stumme Dienst',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ANRUF — Bjørg (Mobil)                                       ║
║  Betreff: „Telemetrie is' tot, mach ma' eben“              ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bjørg brüllt ins Telefon, im Hintergrund klappert eine Kaffee-
maschine: „Ej, die Telemetrie is' tot! Grün war gestern, heut
alles grau. Ich sitz gleich im Termin, das schaffst du doch mit
links, ne? War ja bei uns früher auch kein Hexenwerk. Ruf NICHT
zurück, mach einfach — ich verlass mich auf dich!“ Klick.

Kein Wort dazu, WAS kaputt ist. Also fängst du da an, wo das
System selbst mitschreibt.

**Deine Aufgabe:**
- Finde heraus, warum \`telemetryd\` nicht läuft (Status + Journal)
- Lege die fehlende Konfiguration an (\`interval=60\`)
- Starte den Dienst und aktiviere ihn dauerhaft (enable)`,
    mentorNote:
      'systemctl status zeigt den Ist-Zustand, journalctl -u <dienst> die Vorgeschichte — dort steht meist im Klartext, was fehlt. Ein Dienst, der nach einem Neustart automatisch wieder hochkommen soll, muss aktiviert (enabled) sein. Dateien unter /etc gehören root, dafür brauchst du sudo.',
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
        text: 'Erst kurz durchatmen (kostet Zeit, +Ruhe)',
        effects: { stress: -2 },
        resultText:
          'Du legst das Telefon weg und atmest einmal durch. Bjørgs Lautstärke ist kein Argument — der Dienst wird methodisch repariert, nicht hektisch.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-telemetrie',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Warum läuft telemetryd nicht? Status + Journal lesen, /etc/telemetryd.conf (interval=60) anlegen, Dienst starten und aktivieren.',
      services: [
        {
          unit: 'telemetryd.service',
          active: 'failed',
          enabled: 'disabled',
          desc: 'KRITIS Telemetrie-Sammeldienst',
          exec: '/usr/local/bin/telemetryd',
          startRequires: [
            // Gate on real content, not mere existence: the scenario auto-seeder
            // materializes an EMPTY /etc/telemetryd.conf from the hint/task
            // mentions, so a fileExists-only gate (or a bare touch) would pass
            // without the config the lesson is about. Require the interval key.
            {
              file: '/etc/telemetryd.conf',
              matches: 'interval\\s*=\\s*\\d',
              failMessage: 'telemetryd[812]: FATAL: /etc/telemetryd.conf: missing required key "interval"',
            },
          ],
        },
      ],
      journal: [
        { ts: '2026-07-18 08:41:02', unit: 'telemetryd', priority: 'info', message: 'Starting KRITIS Telemetrie-Sammeldienst...' },
        { ts: '2026-07-18 08:41:02', unit: 'telemetryd', priority: 'err', message: 'telemetryd[812]: FATAL: /etc/telemetryd.conf: No such file or directory' },
        { ts: '2026-07-18 08:41:02', unit: 'telemetryd', priority: 'err', message: 'telemetryd.service: Main process exited, code=exited, status=1/FAILURE' },
        { ts: '2026-07-18 08:41:02', unit: 'telemetryd', priority: 'err', message: 'telemetryd.service: Failed with result \'exit-code\'.' },
        { ts: '2026-07-18 08:41:02', unit: 'telemetryd', priority: 'info', message: 'Failed to start KRITIS Telemetrie-Sammeldienst.' },
      ],
      commandSkillGain: {
        systemctl: { linux: 2, troubleshooting: 1 },
        journalctl: { linux: 1, troubleshooting: 2 },
        sudo: { linux: 1, security: 1 },
        tee: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Running AND enabled: both systemctl steps are required. A bare
            // touch of the config can't fake either — only a real start flips
            // the unit to active, only enable flips it to enabled.
            { service: 'telemetryd', serviceState: 'active' },
            { service: 'telemetryd', serviceEnabled: true },
          ],
          resultText:
            'Der Dienst läuft wieder — und diesmal kommt er nach einem Neustart von selbst hoch, weil du ihn aktiviert hast. Das Journal hat dir die Ursache frei Haus geliefert: eine fehlende Konfiguration, kein Drama.\n\nMerke: Erst lesen, was das System dir sagt (status + journalctl), dann gezielt handeln. Bjørgs „mach du das mal eben“ war ein 30-Sekunden-Fix — wenn man weiß, wo man hinschaut.',
          skillGain: { linux: 3, troubleshooting: 4 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Ein Dienst ist ausgefallen. Verschaff dir erst einen Überblick über seinen Zustand — und lies nach, was das System beim letzten Startversuch mitgeschrieben hat.',
        '🤖 Jens: Der Dienst heißt telemetryd. Sein Zustand steht in systemctl status, die Absturzursache im Journal — dort filterst du mit -u auf genau diesen Dienst.',
        '🤖 Jens: Im Journal steht, dass /etc/telemetryd.conf fehlt. Lege sie mit dem Inhalt interval=60 an — weil /etc root gehört, per sudo (z. B. mit tee). Danach den Dienst starten UND dauerhaft aktivieren (enable).',
        "🤖 Jens: `journalctl -u telemetryd` → `echo 'interval=60' | sudo tee /etc/telemetryd.conf` → `sudo systemctl start telemetryd` → `sudo systemctl enable telemetryd`.",
      ],
    },
    tags: ['learning', 'systemd', 'terminal', 'troubleshooting'],
  },

  {
    id: 'learn_sysd_02_time_travel',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_sysd_01_silent_service'] },
    category: 'training',
    involvedCharacters: ['jens'],
    title: 'systemd 2: Die Zeitreise',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ALARM — SSH-Anmeldungen srv-portal                         ║
║  Zeitraum: Nacht auf den 17.07.                            ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Das Monitoring hat nachts Alarm geschlagen: eine Welle fehl-
geschlagener SSH-Logins auf srv-portal, irgendwann nach zwei
Uhr morgens. Wer, woher, wie lange — das steht alles im Journal.
Du musst nur zur richtigen Zeit hinschauen.

Finde die IP, von der die Angriffswelle ausging, und trag sie in
die Sperrliste \`/etc/ssh/denylist.txt\` ein. Die Zahl steht NICHT
in diesem Ticket — die holst du dir aus den Logs.

**Deine Aufgabe:**
- Grenze das Journal auf das Zeitfenster der Angriffe ein (nach 02:00)
- Finde die Angreifer-IP in den fehlgeschlagenen Anmeldungen
- Trag die IP in \`/etc/ssh/denylist.txt\` ein`,
    mentorNote:
      'journalctl reist in der Zeit: --since und --until schneiden ein Fenster heraus, statt tausende Zeilen zu durchscrollen. Kombiniert mit grep auf „Failed password“ fällt die immer gleiche Quelle sofort auf. Der sshd-Dienst heißt im Journal sshd — erreichbar über -u sshd.',
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
        text: 'Erst den Alarm im Monitoring nachlesen (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Der Alarm feuerte um 02:14 das erste Mal. Ein Zeitfenster hast du damit schon — der Rest steht im Journal.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-portal',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Journal auf die Nacht des 17.07. (nach 02:00) eingrenzen, Angreifer-IP in den fehlgeschlagenen Logins finden, in /etc/ssh/denylist.txt eintragen.',
      journal: [
        { ts: '2026-07-16 22:14:07', unit: 'sshd', priority: 'info', message: 'Accepted publickey for admin from 10.0.10.5 port 51022 ssh2: ED25519 SHA256:7c2b…' },
        { ts: '2026-07-16 23:47:19', unit: 'sshd', priority: 'info', message: 'Received disconnect from 10.0.10.5 port 51022:11: disconnected by user' },
        { ts: '2026-07-17 01:52:41', unit: 'sshd', priority: 'warning', message: 'Failed password for root from 203.0.113.9 port 40122 ssh2' },
        { ts: '2026-07-17 02:13:44', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user oracle from 185.220.101.34 port 44012 ssh2' },
        { ts: '2026-07-17 02:13:46', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user postgres from 185.220.101.34 port 44090 ssh2' },
        { ts: '2026-07-17 02:13:48', unit: 'sshd', priority: 'warning', message: 'Failed password for root from 185.220.101.34 port 44163 ssh2' },
        { ts: '2026-07-17 02:13:50', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user admin from 185.220.101.34 port 44241 ssh2' },
        { ts: '2026-07-17 02:13:52', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user test from 185.220.101.34 port 44318 ssh2' },
        { ts: '2026-07-17 02:13:54', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user git from 185.220.101.34 port 44397 ssh2' },
        { ts: '2026-07-17 02:13:56', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user deploy from 185.220.101.34 port 44475 ssh2' },
        { ts: '2026-07-17 02:13:58', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user jenkins from 185.220.101.34 port 44551 ssh2' },
        { ts: '2026-07-17 02:14:00', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user ubuntu from 185.220.101.34 port 44630 ssh2' },
        { ts: '2026-07-17 02:14:02', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user backup from 185.220.101.34 port 44708 ssh2' },
        { ts: '2026-07-17 02:14:04', unit: 'sshd', priority: 'warning', message: 'Failed password for root from 185.220.101.34 port 44786 ssh2' },
        { ts: '2026-07-17 02:14:06', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user pi from 185.220.101.34 port 44863 ssh2' },
        { ts: '2026-07-17 02:14:08', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user mysql from 185.220.101.34 port 44941 ssh2' },
        { ts: '2026-07-17 02:14:10', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user www-data from 185.220.101.34 port 45018 ssh2' },
        { ts: '2026-07-17 02:14:12', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user ftp from 185.220.101.34 port 45096 ssh2' },
        { ts: '2026-07-17 02:14:14', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user user from 185.220.101.34 port 45173 ssh2' },
        { ts: '2026-07-17 02:14:16', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user teamspeak from 185.220.101.34 port 45251 ssh2' },
        { ts: '2026-07-17 02:14:18', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user gitlab from 185.220.101.34 port 45329 ssh2' },
        { ts: '2026-07-17 02:14:20', unit: 'sshd', priority: 'warning', message: 'Failed password for invalid user nagios from 185.220.101.34 port 45406 ssh2' },
        { ts: '2026-07-17 06:31:55', unit: 'sshd', priority: 'info', message: 'Accepted publickey for admin from 10.0.10.5 port 51188 ssh2: ED25519 SHA256:7c2b…' },
      ],
      commandSkillGain: {
        journalctl: { linux: 2, troubleshooting: 2, security: 1 },
        grep: { linux: 1 },
        sudo: { linux: 1, security: 1 },
        tee: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // The find IS the lesson — the concrete attacker IP must land in the
            // denylist. A distinctive marker (not in the briefing) means only a
            // real journal read produces it; a wrong IP fails.
            { file: '/etc/ssh/denylist.txt', matches: '185\\.220\\.101\\.34' },
          ],
          resultText:
            'Die Quelle ist eindeutig: 185.220.101.34, ein bekannter Tor-Exit, hat zwischen 02:13 und 02:14 im Sekundentakt Benutzernamen durchprobiert. Kein Treffer — deine Schlüssel-Härtung aus dem letzten Ticket hat gehalten. Jetzt steht die IP auf der Sperrliste.\n\nMerke: Man muss nicht tausend Zeilen lesen. Ein Zeitfenster (--since/--until) und ein gezieltes grep, und der Angreifer zeigt sich von selbst.',
          skillGain: { linux: 3, security: 3, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Die Angriffe fielen in ein enges Zeitfenster nach zwei Uhr morgens. Statt alles durchzuscrollen, schneidest du im Journal genau diese Nacht heraus — und suchst nach den fehlgeschlagenen Anmeldungen.',
        '🤖 Jens: Das Journal lässt sich auf einen Zeitraum eingrenzen (--since / --until) und nach Text durchsuchen. Der SSH-Dienst heißt im Journal sshd, die Zeilen enthalten „Failed password“.',
        '🤖 Jens: Grenz auf die Nacht des 17.07. ein und filter auf „Failed password“ — eine IP taucht im Sekundentakt auf. Die trägst du dann per sudo in /etc/ssh/denylist.txt ein.',
        "🤖 Jens: `journalctl -u sshd --since '2026-07-17 02:00' --until '2026-07-17 03:00' | grep 'Failed password'` → die IP ablesen → `echo '185.220.101.34' | sudo tee /etc/ssh/denylist.txt`.",
      ],
    },
    tags: ['learning', 'systemd', 'terminal', 'security', 'forensics'],
  },

  {
    id: 'learn_sysd_03_revenant',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_sysd_02_time_travel'] },
    category: 'training',
    involvedCharacters: ['jens'],
    title: 'systemd 3: Der Wiedergänger',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  STÖRUNG — Pumpen-Monitoring pumpmon                        ║
║  Anlage: Hebewerk Nord                                     ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Die Pumpenüberwachung am Hebewerk Nord ist ausgefallen. Im
Journal steht die Ursache glasklar: der Dienst startet mit einer
falschen Option. Jemand hat sich in der Unit-Datei vertippt —
\`--confg\` statt \`--config\`.

Du wirst die Zeile korrigieren. Und dann wirst du erleben, warum
das allein nicht reicht: systemd merkt sich den ALTEN Stand,
bis man ihm ausdrücklich sagt, die Unit-Dateien neu einzulesen.

**Deine Aufgabe:**
- Lies im Journal, warum \`pumpmon\` nicht startet
- Korrigiere den Tippfehler in \`/etc/systemd/system/pumpmon.service\`
- Bring den Dienst zum Laufen (denk an das erneute Einlesen)`,
    mentorNote:
      'systemd liest Unit-Dateien beim Booten in den Speicher und arbeitet dann mit dieser Kopie. Änderst du die Datei auf der Platte, sieht systemd das erst nach einem daemon-reload. Ein Restart allein startet die ALTE, gespeicherte Fassung — der Fehler kommt wieder wie ein Wiedergänger, bis du neu einliest. Die Unit-Datei liegt unter /etc, also mit sudo bearbeiten.',
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
        text: 'Erst die Unit-Datei überfliegen (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Ein einziges fehlendes „i“ in --config legt eine ganze Pumpenüberwachung lahm. So klein können Ursachen sein.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-scada',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Tippfehler --confg in /etc/systemd/system/pumpmon.service korrigieren, daemon-reload, pumpmon starten.',
      vfsOverlay: {
        files: [
          {
            path: '/etc/systemd/system/pumpmon.service',
            content:
              '[Unit]\nDescription=Pumpen-Monitoring Hebewerk Nord\nAfter=network.target\n\n[Service]\nType=simple\nExecStart=/usr/local/bin/pumpmond --confg /etc/pumpmon.yml\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n',
          },
          {
            path: '/etc/pumpmon.yml',
            content: 'sensors: 12\npoll_interval: 5\nalarm_threshold: 0.8\n',
          },
        ],
      },
      services: [
        {
          unit: 'pumpmon.service',
          active: 'failed',
          enabled: 'enabled',
          desc: 'Pumpen-Monitoring Hebewerk Nord',
          exec: '/usr/local/bin/pumpmond --confg /etc/pumpmon.yml',
          unitFile: '/etc/systemd/system/pumpmon.service',
          startRequires: [
            {
              unitFileMatches: 'ExecStart=/usr/local/bin/pumpmond --config /etc/pumpmon\\.yml',
              failMessage: 'pumpmond: unknown option --confg',
            },
          ],
        },
      ],
      journal: [
        { ts: '2026-07-18 07:12:33', unit: 'pumpmon', priority: 'info', message: 'Starting Pumpen-Monitoring Hebewerk Nord...' },
        { ts: '2026-07-18 07:12:33', unit: 'pumpmon', priority: 'err', message: 'pumpmond: unknown option --confg' },
        { ts: '2026-07-18 07:12:33', unit: 'pumpmon', priority: 'err', message: 'pumpmon.service: Main process exited, code=exited, status=64/USAGE' },
        { ts: '2026-07-18 07:12:33', unit: 'pumpmon', priority: 'err', message: 'pumpmon.service: Failed with result \'exit-code\'.' },
        { ts: '2026-07-18 07:12:33', unit: 'pumpmon', priority: 'info', message: 'Failed to start Pumpen-Monitoring Hebewerk Nord.' },
      ],
      commandSkillGain: {
        systemctl: { linux: 2, troubleshooting: 2 },
        journalctl: { linux: 1, troubleshooting: 1 },
        sudo: { linux: 1, security: 1 },
        sed: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Active proves the fix took effect through a daemon-reload; the
            // absentMatches guard proves the typo is really gone from the unit
            // file (not merely masked by a second appended line).
            { service: 'pumpmon', serviceState: 'active' },
            { file: '/etc/systemd/system/pumpmon.service', absentMatches: '--confg' },
          ],
          resultText:
            'Die Pumpenüberwachung läuft. Aber der eigentliche Lerneffekt lag zwischendrin: Nach dem sed-Fix ist der Neustart TROTZDEM gescheitert — systemd hielt noch an der alten, gespeicherten Unit fest. Erst \`daemon-reload\` hat die korrigierte Datei eingelesen, dann klappte der Start.\n\nMerke: Nach jeder Änderung an einer Unit-Datei gilt: erst \`systemctl daemon-reload\`, dann starten. Sonst startet der Wiedergänger — die alte Fassung mit dem alten Fehler.',
          skillGain: { linux: 4, troubleshooting: 4 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Der Dienst startet mit einer falschen Option — das Journal nennt sie beim Namen. Der Fehler steckt nicht im Programm, sondern in der Unit-Datei, die systemd zum Starten benutzt.',
        '🤖 Jens: In /etc/systemd/system/pumpmon.service steht --confg statt --config. Korrigiere die Zeile (die Datei gehört root, also mit sudo). Aber Achtung: ein simpler Neustart wird danach immer noch scheitern.',
        '🤖 Jens: systemd arbeitet mit einer gespeicherten Kopie der Unit-Datei. Nachdem du den Tippfehler behoben hast, musst du systemd die Datei erst neu einlesen lassen — DANN starten.',
        "🤖 Jens: `sudo sed -i 's/--confg/--config/' /etc/systemd/system/pumpmon.service` → `sudo systemctl daemon-reload` → `sudo systemctl start pumpmon`.",
      ],
    },
    tags: ['learning', 'systemd', 'terminal', 'troubleshooting'],
  },

  {
    id: 'learn_sysd_04_chain_reaction',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_sysd_03_revenant'] },
    category: 'training',
    involvedCharacters: ['henry'],
    title: 'systemd 4: Die Kettenreaktion',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  STÖRUNG — Leitstand-API leitstand-api                      ║
║  Auswirkung: Dashboard ohne Live-Daten                     ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Die Leitstand-API ist tot, das Dashboard zeigt nur noch Fehler.
Der erste Reflex — den Dienst einfach fünfmal neu starten —
bringt nichts. Henry lehnt sich rüber: „Bevor du blind neu
startest: lies, WARUM er nicht hochkommt. Ein Dienst hängt oft
an einem anderen. Reparier die Ursache, nicht das Symptom.“

Im Journal steht, woran es hakt: Die API findet die Datenbank
nicht. Und die Datenbank? Steht still.

**Deine Aufgabe:**
- Lies im Journal, warum \`leitstand-api\` nicht startet
- Bring den Dienst ans Laufen, an dem die API hängt
- Starte danach die API — in der richtigen Reihenfolge`,
    mentorNote:
      'Abhängigkeiten denken: systemctl status und das Journal sagen dir, WORAN ein Dienst scheitert. Die API braucht die Datenbank — solange mysql steht, findet sie den Datenbank-Socket nicht. Erst die Ursache (Datenbank) starten, dann die abhängige Seite (API). Blindes Neustarten der API ändert nichts, solange die Wurzel fehlt.',
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
        text: 'Erst Henrys Hinweis sacken lassen (kostet Zeit, +Ruhe)',
        effects: { stress: -2 },
        resultText:
          'Ursache statt Symptom. Du wirst nicht fünfmal denselben Dienst antippen, sondern einmal richtig hinschauen.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-leitstand',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Journal von leitstand-api lesen, zuerst mysql starten (erzeugt den DB-Socket), dann leitstand-api starten.',
      services: [
        {
          unit: 'mysql.service',
          active: 'inactive',
          enabled: 'enabled',
          desc: 'MariaDB Datenbankserver',
          createsOnStart: ['/run/mysqld/mysqld.sock'],
        },
        {
          unit: 'leitstand-api.service',
          active: 'failed',
          enabled: 'enabled',
          desc: 'Leitstand REST-API',
          exec: '/usr/local/bin/leitstand-api',
          startRequires: [
            {
              file: '/run/mysqld/mysqld.sock',
              failMessage: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock',
            },
          ],
        },
      ],
      journal: [
        { ts: '2026-07-18 06:55:10', unit: 'mysql', priority: 'info', message: 'Stopped MariaDB Datenbankserver.' },
        { ts: '2026-07-18 07:02:41', unit: 'leitstand-api', priority: 'info', message: 'Starting Leitstand REST-API...' },
        { ts: '2026-07-18 07:02:41', unit: 'leitstand-api', priority: 'err', message: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock' },
        { ts: '2026-07-18 07:02:41', unit: 'leitstand-api', priority: 'err', message: 'leitstand-api.service: Main process exited, code=exited, status=1/FAILURE' },
        { ts: '2026-07-18 07:02:41', unit: 'leitstand-api', priority: 'err', message: 'leitstand-api.service: Failed with result \'exit-code\'.' },
        { ts: '2026-07-18 07:05:12', unit: 'leitstand-api', priority: 'err', message: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock' },
        { ts: '2026-07-18 07:08:39', unit: 'leitstand-api', priority: 'err', message: 'leitstand-api: cannot connect to database socket /run/mysqld/mysqld.sock' },
      ],
      commandSkillGain: {
        systemctl: { linux: 2, troubleshooting: 2 },
        journalctl: { linux: 1, troubleshooting: 2 },
        sudo: { linux: 1, security: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Both up. leitstand-api can only reach 'active' AFTER mysql created
            // the socket — so the order (cause before symptom) is enforced by
            // the engine, not just asserted here.
            { service: 'mysql', serviceState: 'active' },
            { service: 'leitstand-api', serviceState: 'active' },
          ],
          resultText:
            'Beide Dienste laufen — und du hast die API kein einziges Mal blind neu gestartet. Das Journal hat die Kette offengelegt: Die API hing an der Datenbank, die Datenbank stand still. Ursache zuerst (mysql), dann die abhängige Seite (leitstand-api), und die Kettenreaktion löst sich von selbst.\n\nMerke: Ein Dienst, der nicht startet, ist oft nur das letzte Glied. Lies, woran er hängt — und repariere die Wurzel.',
          skillGain: { linux: 3, troubleshooting: 5 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Nicht blind neu starten. Lies erst, woran die API beim Start scheitert — die Meldung nennt genau das, was ihr fehlt.',
        '🤖 Jens: Im Journal steht, dass leitstand-api den Datenbank-Socket nicht findet. Dieser Socket entsteht erst, wenn die Datenbank läuft. Und die steht gerade still.',
        '🤖 Jens: Reihenfolge ist alles: erst mysql starten (das legt den Socket an), dann leitstand-api. Beides braucht root, also sudo.',
        '🤖 Jens: `journalctl -u leitstand-api` → `sudo systemctl start mysql` → `sudo systemctl start leitstand-api`.',
      ],
    },
    tags: ['learning', 'systemd', 'terminal', 'troubleshooting'],
  },

  // ==========================================================================
  // Track: Netz-Forensik
  // ==========================================================================

  {
    id: 'learn_net_01_open_doors',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: ['henry'],
    title: 'Netz 1: Offene Türen',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  PORT-AUDIT — srv-web                                        ║
║  Soll-Portliste (freigegeben)                              ║
╠══════════════════════════════════════════════════════════════╣
║   22/tcp   SSH                                              ║
║   80/tcp   HTTP                                             ║
║  443/tcp   HTTPS                                            ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Henry legt dir die Freigabeliste hin: „Auf srv-web dürfen genau
drei Ports nach außen lauschen — 22, 80 und 443, mehr nicht.
Das Monitoring meldet aber, dass die Kiste auf einem Port
horcht, der in keiner Freigabe steht. Vergleich die offenen
Ports mit der Soll-Liste, und wenn was übrig bleibt: findest du
raus, WELCHER Prozess da lauscht, und machst ihn dicht.“

**Deine Aufgabe:**
- Liste die lauschenden Ports auf srv-web auf
- Vergleiche sie mit der Soll-Liste (22/80/443)
- Finde den fremden Prozess und beende ihn`,
    mentorNote:
      'Baseline kennen ist die halbe Miete: Wer weiß, was laufen SOLL, erkennt den Ausreißer sofort. `ss -tulpen` zeigt zu jedem lauschenden Port den Prozess (Programm + PID). Den beendest du gezielt über seine PID — nicht die legitimen Dienste.',
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
        text: 'Erst die Soll-Portliste einprägen (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Drei Ports, mehr nicht. Alles andere ist per Definition verdächtig. Mit dieser Liste im Kopf fällt der Ausreißer sofort auf.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-web',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Lauschende Ports auf srv-web auflisten, mit der Soll-Liste (22/80/443) vergleichen, den fremden Prozess über seine PID beenden.',
      listeners: [
        { proto: 'tcp', port: 22, address: '0.0.0.0', pid: 456, program: 'sshd' },
        { proto: 'tcp', port: 80, address: '0.0.0.0', pid: 1234, program: 'apache2' },
        { proto: 'tcp', port: 443, address: '0.0.0.0', pid: 1234, program: 'apache2' },
        { proto: 'tcp', port: 31337, address: '0.0.0.0', pid: 6666, program: 'nc' },
      ],
      commandSkillGain: {
        ss: { linux: 2, security: 2 },
        netstat: { linux: 1, security: 1 },
        sudo: { linux: 1, security: 1 },
        kill: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // The rogue listener on 31337 must be gone. kill removes the
            // listener whose PID matches — a real "close the port", not a note.
            { listenerAbsent: { port: 31337 } },
          ],
          resultText:
            'Port 31337 ist zu — der Prozess „nc" (netcat) lauscht nicht mehr. Genau der stand in keiner Freigabe: eine offene Hintertür, über die jemand von außen eine Shell hätte abgreifen können. Die drei erlaubten Dienste (22/80/443) laufen unberührt weiter.\n\nMerke: Man muss nicht raten. Man kennt die Soll-Liste, listet den Ist-Zustand, und was übrig bleibt, ist der Befund. Jeder offene Port gehört einem Prozess — über dessen PID macht man ihn gezielt dicht.',
          skillGain: { linux: 3, security: 4, troubleshooting: 1 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Du kennst die Soll-Liste — drei Ports. Lass dir anzeigen, worauf die Maschine WIRKLICH lauscht, und halt beides nebeneinander. Was nicht auf der Liste steht, ist dein Fund.',
        '🤖 Jens: Die lauschenden Sockets mit Prozess und PID zeigt ss — die passenden Flags stehen für tcp, udp, listening, process, numeric. Ein Port fällt aus der Reihe.',
        '🤖 Jens: Der Ausreißer ist Port 31337, dahinter der Prozess nc mit seiner PID. Einen Prozess beendest du gezielt über seine PID — als root, also mit sudo.',
        '🤖 Jens: `ss -tulpen` → in der Zeile mit 31337 die PID (6666) ablesen → `sudo kill 6666`. Danach nochmal `ss -tulpen`: der Port ist weg.',
      ],
    },
    tags: ['learning', 'network', 'terminal', 'security', 'forensics'],
  },

  {
    id: 'learn_net_02_backchannel',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_net_01_open_doors'] },
    category: 'training',
    involvedCharacters: ['jens'],
    title: 'Netz 2: Der Rückkanal',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ANOMALIE — srv-web telefoniert nach draußen                ║
║  Ziel: 91.203.5.77:443                                      ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Nicht jeder böse Port lauscht — manche rufen selbst raus. Das
Monitoring zeigt eine stehende Verbindung von srv-web zu einer
fremden Adresse auf Port 443. Sieht aus wie HTTPS, ist aber
keiner deiner Dienste. Und in der \`/etc/hosts\` steht ein
Eintrag, der diese IP auf einen harmlos klingenden Namen
umbiegt — damit im Log niemand stutzig wird.

Erst sicherst du den Beweis, DANN drehst du den Kanal zu.

**Deine Aufgabe:**
- Finde die stehende Verbindung nach draußen (welcher Prozess?)
- Finde den manipulierten Eintrag in \`/etc/hosts\`
- Sichere \`/etc/hosts\` als Beweis nach \`/root/incident/hosts.bak\`
- Entferne die manipulierte Zeile aus \`/etc/hosts\``,
    mentorNote:
      'Beweissicherung zuerst: erst die Kopie ziehen, dann bereinigen — wer die Reihenfolge dreht, sichert nur noch den bereinigten Zustand. `ss -tp` zeigt auch stehende Verbindungen samt Prozess. Eine manipulierte /etc/hosts biegt eine IP auf einen vertrauenswürdig klingenden Namen um. Beides liegt root, also mit sudo arbeiten.',
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
        text: 'Erst überlegen, was „unauffällig" heißen soll (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'Ein Angreifer, der auffliegen will, benennt seine IP nicht um. Der Eintrag in /etc/hosts ist genau deshalb ein Alarmsignal: jemand wollte, dass die Verbindung harmlos aussieht.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-web',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Stehende Ausgangsverbindung finden (ss -tp), manipulierten /etc/hosts-Eintrag finden, /etc/hosts als Beweis nach /root/incident/hosts.bak sichern, dann die Zeile entfernen.',
      vfsOverlay: {
        directories: ['/root/incident'],
        files: [
          {
            path: '/etc/hosts',
            content:
              '127.0.0.1\tlocalhost\n::1\tlocalhost ip6-localhost ip6-loopback\n10.0.20.11\tsrv-web\n91.203.5.77\tupdate.vendor.de\n',
          },
        ],
      },
      connections: [
        { proto: 'tcp', localPort: 54210, peer: '91.203.5.77:443', state: 'ESTAB', pid: 4242, program: 'updater' },
      ],
      commandSkillGain: {
        ss: { linux: 1, security: 2 },
        cat: { linux: 1 },
        cp: { security: 2, linux: 1 },
        sudo: { linux: 1, security: 1 },
        sed: { security: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Evidence must be the REAL /etc/hosts with the poison line still in
            // it — only possible if the backup was taken BEFORE cleaning.
            { file: '/root/incident/hosts.bak', matches: '91\\.203\\.5\\.77' },
            // And the live /etc/hosts must no longer resolve the C2 IP.
            { file: '/etc/hosts', absentMatches: '91\\.203\\.5\\.77' },
          ],
          resultText:
            'Der Rückkanal ist zu: Die manipulierte Zeile aus /etc/hosts ist raus, und die Beweiskopie liegt in /root/incident — gezogen BEVOR du etwas verändert hast. Der Prozess „updater" gab sich als Update-Client aus und telefonierte in Wahrheit zu 91.203.5.77, getarnt hinter dem Namen „update.vendor.de".\n\nMerke: Erst sichern, dann bereinigen — immer in dieser Reihenfolge. Und ein Blick in /etc/hosts lohnt sich: Namensauflösung ist Vertrauen, und genau da setzen Angreifer gern den Hebel an.',
          skillGain: { linux: 3, security: 5, troubleshooting: 2 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Nicht nur lauschende Ports sind gefährlich — eine Maschine, die selbst nach draußen telefoniert, auch. Schau dir die stehenden Verbindungen an und welcher Prozess dahintersteckt. Und wirf einen Blick darauf, wie Namen auf dieser Kiste aufgelöst werden.',
        '🤖 Jens: Stehende TCP-Verbindungen mit Prozess zeigt ss -tp. Die fremde IP taucht auch in /etc/hosts auf — dort wurde sie auf einen harmlosen Namen umgebogen. Bevor du aufräumst: sichern.',
        '🤖 Jens: Zieh erst eine Kopie von /etc/hosts nach /root/incident/hosts.bak (das gehört root, also sudo). ERST DANN entfernst du die Zeile mit der IP 91.203.5.77 gezielt aus /etc/hosts.',
        "🤖 Jens: `ss -tp` → `cat /etc/hosts` → `sudo cp /etc/hosts /root/incident/hosts.bak` → `sudo sed -i '/91.203.5.77/d' /etc/hosts`.",
      ],
    },
    tags: ['learning', 'network', 'terminal', 'security', 'forensics'],
  },

  {
    id: 'learn_net_03_the_wall',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_net_02_backchannel'] },
    category: 'training',
    involvedCharacters: ['bert'],
    title: 'Netz 3: Die Mauer',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  HÄRTUNG — Firewall srv-web                                  ║
║  Auftrag: Bert (IT-Leitung)                                ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert: „Die Kiste steht mit offener Firewall im Netz — alles rein,
was anklopft. Das drehen wir um: rein darf nur noch, was rein
MUSS — 22, 80 und 443. Alles andere bleibt draußen. Aber pass
auf die Reihenfolge auf: Wenn du erst alles zumachst und dich
DANN um Port 22 kümmerst, sperrst du dich selbst aus. Erst die
Türen aufschließen, die du brauchst — dann die Mauer hochziehen."

**Deine Aufgabe:**
- Erlaube eingehend genau 22/tcp, 80/tcp und 443/tcp
- Setze die Standard-Richtung für eingehend auf „deny"
- Aktiviere die Firewall — in der richtigen Reihenfolge`,
    mentorNote:
      'Reihenfolge rettet dich: erst die nötigen Ports freigeben (ufw allow 22/tcp …), DANN die Standardrichtung auf deny setzen und die Firewall aktivieren. Wer die Regeln umdreht, kappt sich womöglich den eigenen SSH-Zugang. ufw braucht root — also sudo.',
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
        text: 'Erst die Reihenfolge durchdenken (kostet Zeit, +Ruhe)',
        effects: { stress: -2 },
        resultText:
          'Erst aufschließen, was du brauchst — dann abriegeln. In dieser Reihenfolge sperrt man sich nicht aus. Du gehst es ruhig an.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-web',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Firewall härten: eingehend 22/80/443 erlauben, Standard-Richtung eingehend auf deny, Firewall aktivieren — Reihenfolge beachten (erst allow 22, dann deny).',
      firewall: {
        enabled: false,
        defaultIncoming: 'allow',
        rules: [],
      },
      commandSkillGain: {
        sudo: { linux: 1, security: 1 },
        ufw: { linux: 2, security: 3 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // The three needed ports are open AND the default is deny. The
            // "don't lock yourself out" order is taught in the hints; the goal
            // only checks the end state.
            { firewallRule: { action: 'allow', port: 22, present: true } },
            { firewallRule: { action: 'allow', port: 80, present: true } },
            { firewallRule: { action: 'allow', port: 443, present: true } },
            { firewallDefaultIncoming: 'deny' },
          ],
          resultText:
            'Die Mauer steht: Eingehend kommt nur noch durch, was durch muss — 22, 80 und 443. Alles andere prallt an der Standardregel „deny" ab. Und weil du zuerst die Türen aufgeschlossen und erst dann die Mauer hochgezogen hast, sitzt du noch drin und nicht ausgesperrt vor der Tür.\n\nMerke: Bei Firewalls zählt die Reihenfolge. Erst die nötigen Freigaben, dann die Standardsperre, dann aktivieren. Umgekehrt kappst du dir womöglich den eigenen Zugang.',
          skillGain: { linux: 3, security: 5, troubleshooting: 1 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Jens: Im Moment lässt die Firewall alles rein. Das Ziel ist umgekehrt: standardmäßig zu, und nur die drei nötigen Türen offen. Denk an die Reihenfolge — erst aufschließen, was du brauchst, dann abriegeln.',
        '🤖 Jens: Die unkomplizierte Firewall heißt ufw. Du gibst einzelne Ports frei (allow), setzt eine Standardrichtung (default) und schaltest sie scharf (enable). Alles davon braucht root, also sudo.',
        '🤖 Jens: Erst die Freigaben für 22/tcp, 80/tcp und 443/tcp. DANN default deny incoming. Erst am Schluss enable. Drehst du das um, riskierst du deinen eigenen SSH-Zugang.',
        '🤖 Jens: `sudo ufw allow 22/tcp` → `sudo ufw allow 80/tcp` → `sudo ufw allow 443/tcp` → `sudo ufw default deny incoming` → `sudo ufw enable`.',
      ],
    },
    tags: ['learning', 'network', 'terminal', 'security', 'hardening'],
  },

  {
    id: 'learn_net_04_spider',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_net_03_the_wall'] },
    category: 'training',
    involvedCharacters: ['henry'],
    title: 'Netz ★: Die Spinne im Netz',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ★ INCIDENT — Querbewegung im Netz                          ║
║  Umfang: web01 → db01                                       ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Alles zusammen jetzt. Auf web01 zeigt das Journal eine
SSH-Anmeldung, die dort nicht hingehört: jemand hat sich als
admin eingeloggt — von \`10.0.20.12\`. Das ist db01, dein eigener
Datenbankserver. Sprich: Der Angreifer sitzt schon auf db01 und
hat sich von dort weitergehangelt. Eine Spinne, die von Host zu
Host krabbelt.

Du gehst der Spur auf db01 nach. Dort wartet mehr: ein
Cron-Job, der im Minutentakt etwas nachlädt, und ein fremder
Port, der lauscht. Sichere die Beweise, entferne den Cron-Job,
und riegle den Port ab.

**Deine Aufgabe:**
- Finde im Journal von web01, von welchem Host die Anmeldung kam
- Sichere db01s root-Crontab als Beweis nach \`~/evidenz_cron.txt\`
- Entferne die Backdoor-Zeile (\`beacon\`) aus db01s Crontab
- Riegle auf db01 den fremden Port \`31337\` per Firewall ab`,
    mentorNote:
      'Die Synthese: Journal lesen (Querbewegung erkennen), per SSH auf den Nachbarhost, Beweise sichern BEVOR du bereinigst (scp holt die Datei zu dir — die Kopie zuerst!), die Backdoor gezielt entfernen und den fremden Port eindämmen. Die root-Crontab liegt unter /var/spool/cron/crontabs/root und gehört root — auf db01 also mit sudo bearbeiten. ufw braucht ebenfalls root.',
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
        text: 'Erst die Angriffskette skizzieren (kostet Zeit, +Kontext)',
        effects: { stress: -1 },
        resultText:
          'db01 → web01, als admin, per Schlüssel. Der Angreifer ist bereits drin und bewegt sich seitwärts. Der Ausgangspunkt ist db01 — dort fängst du an.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'web01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Im Journal von web01 den Herkunftshost (db01) finden, db01s root-Crontab per scp nach ~/evidenz_cron.txt sichern, die beacon-Zeile auf db01 entfernen, Port 31337 auf db01 per ufw sperren.',
      vfsOverlay: {
        files: [
          {
            path: '/home/timo/zugang-db01.txt',
            content: 'db01 (Datenbank) / admin\nPasswort: notstrom-db-2024',
          },
        ],
      },
      journal: [
        { ts: '2026-07-17 21:03:11', unit: 'sshd', priority: 'info', message: 'Accepted publickey for admin from 10.0.10.5 port 51022 ssh2: ED25519 SHA256:7c2b…' },
        { ts: '2026-07-18 02:47:52', unit: 'sshd', priority: 'info', message: 'Accepted publickey for admin from 10.0.20.12 port 39114 ssh2: ED25519 SHA256:a1f9…' },
        { ts: '2026-07-18 02:48:03', unit: 'sshd', priority: 'info', message: 'pam_unix(sshd:session): session opened for user admin by (uid=0)' },
        { ts: '2026-07-18 03:15:40', unit: 'sshd', priority: 'info', message: 'Received disconnect from 10.0.20.12 port 39114:11: disconnected by user' },
      ],
      hosts: [
        {
          id: 'db01',
          hostname: 'db01',
          ip: '10.0.20.12',
          accounts: [{ name: 'admin', password: 'notstrom-db-2024' }, { name: 'root' }],
          listeners: [
            { proto: 'tcp', port: 22, address: '0.0.0.0', pid: 456, program: 'sshd' },
            { proto: 'tcp', port: 3306, address: '0.0.0.0', pid: 2345, program: 'mysqld' },
            { proto: 'tcp', port: 31337, address: '0.0.0.0', pid: 6666, program: 'beacon' },
          ],
          vfsOverlay: {
            files: [
              {
                path: '/var/spool/cron/crontabs/root',
                content:
                  '# DO NOT EDIT THIS FILE - edit the master and reinstall.\n0 3 * * * /usr/local/bin/db-backup.sh\n* * * * * /tmp/.hidden/beacon.sh\n',
              },
            ],
          },
        },
      ],
      commandSkillGain: {
        journalctl: { linux: 1, troubleshooting: 2, security: 1 },
        ssh: { linux: 1, security: 1 },
        scp: { security: 2, linux: 1 },
        sudo: { linux: 1, security: 1 },
        sed: { security: 1 },
        ufw: { security: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Evidence secured on web01 BEFORE cleaning (must still contain the
            // backdoor line) — evidence-first coupling.
            { file: '/home/timo/evidenz_cron.txt', matches: 'beacon' },
            // Backdoor removed from db01's crontab.
            { host: 'db01', file: '/var/spool/cron/crontabs/root', absentMatches: 'beacon' },
            // Rogue port contained on db01 by firewall.
            { host: 'db01', firewallRule: { action: 'deny', port: 31337, present: true } },
          ],
          resultText:
            'Die Spinne sitzt fest: Die Beweiskopie der Crontab liegt sicher auf web01 (gezogen, bevor du db01 angefasst hast), die Backdoor-Zeile ist raus, und Port 31337 ist per Firewall dicht. Der Cron-Job hätte im Minutentakt \`/tmp/.hidden/beacon.sh\` nachgeladen — ein klassischer Persistenz-Mechanismus, versteckt in einem Punkt-Verzeichnis.\n\nDrei Tracks in einem Fall: Journal-Forensik hat die Querbewegung von db01 aufgedeckt, SSH hat dich sauber auf den Nachbarhost gebracht, und die Netz-Werkzeuge (ss, ufw) haben den Port geschlossen. Genau so arbeitet man einen Incident ab — der Reihe nach, mit Beweissicherung zuerst.\n\nHenry, leise: „Ein Beacon auf db01, eine Querbewegung nach web01… das war kein Skript-Kiddie. Das gehört in die FENRIS-Akte."',
          skillGain: { security: 6, linux: 3, troubleshooting: 3 },
          effects: { stress: -4 },
        },
      ],
      hints: [
        '🤖 Jens: Fang bei der Spur auf web01 an: Im Journal steht eine SSH-Anmeldung, die nicht hierher gehört — samt der IP, von der sie kam. Diese IP ist dein nächster Host. Und bevor du dort etwas veränderst: Beweise sichern.',
        '🤖 Jens: Die IP 10.0.20.12 ist db01. Dort liegt die root-Crontab unter /var/spool/cron/crontabs/root — mit einer Zeile, die im Minutentakt etwas nachlädt (beacon). Und ein fremder Port lauscht. Hol dir die Crontab als Beweiskopie zu dir, BEVOR du db01 aufräumst.',
        '🤖 Jens: Kopier db01s Crontab per scp nach ~/evidenz_cron.txt (das liest die Datei, ohne dass du dich einloggst). ERST DANN: per ssh auf db01, die beacon-Zeile mit sudo aus der Crontab entfernen und Port 31337 per ufw sperren.',
        "🤖 Jens: `scp admin@db01:/var/spool/cron/crontabs/root ~/evidenz_cron.txt` → `ssh admin@db01` → `sudo sed -i '/beacon/d' /var/spool/cron/crontabs/root` → `sudo ufw deny 31337` (Passwort: siehe zugang-db01.txt).",
      ],
    },
    tags: ['learning', 'network', 'terminal', 'security', 'forensics', 'kritis'],
  },

  // ==========================================================================
  // Track: Ansible & Konfigurationsmanagement (Task B5)
  // ==========================================================================
  {
    id: 'learn_ans_01_inventory',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_04_grep_hunter'] },
    category: 'training',
    involvedCharacters: ['bert'],
    title: 'Ansible 1: Die Inventur',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  TICKET #5001 — Ansible-Einstieg                            ║
║  Melder: Bert (IT-Leitung)                                  ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert stellt dir einen frisch aufgesetzten Steuerungsrechner hin:
„Das ist \`ansible01\`. Von hier aus pflegen wir ab jetzt die
Webserver — web01, web02, web03 — an EINER Stelle, statt uns
per Hand auf jeden Server einzeln zu klemmen. Die Schlüssel
liegen schon, du kommst überall passwortlos rauf.

Fang harmlos an: In \`/opt/playbooks\` liegt \`motd.yml\`. Das
Playbook schreibt allen Hosts eine Login-Meldung. Schau dir
zuerst mit einem Trockenlauf an, WAS es ändern würde — und
dann roll es aus."

**Deine Aufgabe:**
- Sieh dir Inventar (\`/etc/ansible/hosts\`) und \`motd.yml\` an
- Trockenlauf: zeig, was das Playbook ändern WÜRDE
- Roll das Playbook wirklich aus
- Prüf auf einem Host per SSH, dass die Meldung angekommen ist`,
    mentorNote:
      'Ansible arbeitet deklarativ: Du beschreibst den Soll-Zustand, das Werkzeug gleicht ihn ab. Der Trockenlauf (--check) zeigt die Änderungen, ohne etwas anzufassen — erst schauen, dann anwenden. Das Inventar sagt, WELCHE Hosts gemeint sind; das Playbook sagt, WAS passieren soll.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du setzt dich an ansible01 und öffnest die Playbooks.',
      },
      {
        id: 'later',
        text: 'Erst das Playbook zu Ende lesen (kostet Zeit, +Kontext)',
        effects: { stress: -2 },
        resultText:
          'Ein Play, ein Host-Muster (web), eine Aufgabe: das copy-Modul schreibt /etc/motd. Nichts Wildes — ein sauberer Einstieg.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ansible01',
      username: 'deploy',
      currentPath: '/opt/playbooks',
      taskText:
        'motd.yml zuerst mit --check ansehen, dann ausrollen; per SSH auf web01 prüfen, dass /etc/motd die Meldung enthält.',
      vfsOverlay: {
        files: [
          ...controllerSshFiles,
          { path: '/etc/ansible/hosts', content: ANSIBLE_INVENTORY },
          {
            path: '/opt/playbooks/motd.yml',
            content:
              '---\n' +
              '- name: MOTD verteilen\n' +
              '  hosts: web\n' +
              '  become: true\n' +
              '  tasks:\n' +
              '    - name: Wartungshinweis setzen\n' +
              '      copy:\n' +
              "        content: 'WARTUNGSFENSTER aktiv. Zugriff nur nach Freigabe durch die IT-Leitung.'\n" +
              '        dest: /etc/motd\n',
          },
        ],
      },
      hosts: [
        webHost('web01', '10.0.20.11'),
        webHost('web02', '10.0.20.12'),
        webHost('web03', '10.0.20.13'),
      ],
      commandSkillGain: {
        'ansible-playbook': { linux: 2, netzwerk: 1 },
        cat: { linux: 1 },
        ssh: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'web01', file: '/etc/motd', matches: 'Zugriff nur nach Freigabe' },
            { host: 'web02', file: '/etc/motd', matches: 'Zugriff nur nach Freigabe' },
          ],
          resultText:
            'Ausgerollt. Auf allen drei Webservern steht jetzt dieselbe Login-Meldung — geschrieben aus einer einzigen Datei, in einem einzigen Lauf. Genau das ist der Gewinn von Konfigurationsmanagement: eine Wahrheit für die ganze Flotte.\n\nUnd du hast es richtig gemacht: erst \`--check\` (der Trockenlauf zeigt, was passieren WÜRDE), dann der echte Lauf. In der Produktion ist diese Reihenfolge kein Luxus, sondern Pflicht.',
          skillGain: { linux: 3, security: 2, netzwerk: 1 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Verschaff dir erst den Überblick: Welche Hosts stehen im Inventar, und was steht im Playbook? Beide Dateien kannst du einfach anzeigen.',
        '🤖 Jens: Das Werkzeug heißt ansible-playbook. Es gibt einen Schalter für einen Trockenlauf — er rechnet die Änderungen aus, ohne sie anzuwenden.',
        '🤖 Jens: Trockenlauf zuerst, dann echt: derselbe Aufruf einmal mit dem Trockenlauf-Schalter, einmal ohne. Danach per SSH auf einen Host schauen.',
        '🤖 Jens: `ansible-playbook motd.yml --check` (Trockenlauf) → `ansible-playbook motd.yml` (echt) → `ssh web01` → `cat /etc/motd`.',
      ],
    },
    tags: ['learning', 'ansible', 'terminal', 'automation'],
  },

  {
    id: 'learn_ans_02_drift',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ans_01_inventory'] },
    category: 'training',
    involvedCharacters: ['bjorg'],
    title: 'Ansible 2: Der Drift',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  BETREFF: Fwd: hab web02 kurz aufgemacht                    ║
║  Von: Bjorg                                                 ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Eine Mail von Bjorg, quer über den Flur auch noch laut
vorgetragen: „Jaaa, web02 — da hab ich für'n Test schnell
\`PermitRootLogin yes\` reingesetzt, war einfacher so. Wollt
ich später wieder zumachen, haha, weißt ja wie das ist. Mach
du das mal eben, ne? Bin gleich im Termin."

web01 und web03 stehen sauber auf \`no\`. Nur web02 driftet.
Genau dafür gibt es \`harden.yml\`: Es setzt die Regel auf ALLEN
Hosts — die konformen bleiben unberührt, der Ausreißer wird
zurückgezogen. Und danach beweist du die Idempotenz.

**Deine Aufgabe:**
- Trockenlauf mit Diff: zeig, dass NUR web02 abweicht
- Roll \`harden.yml\` aus und zieh web02 zurück auf \`no\`
- Lauf es ein zweites Mal — der Beweis: \`changed=0\``,
    mentorNote:
      'Konfigurations-Drift = ein Host weicht heimlich vom Soll ab. Idempotenz heißt: Ein Playbook mehrfach anzuwenden ändert nach dem ersten Mal nichts mehr. Der zweite Lauf mit changed=0 ist der Beweis, dass der Soll-Zustand erreicht ist. --diff zeigt dir Zeile für Zeile, was sich ändert.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest harden.yml und machst dich an den Drift.',
      },
      {
        id: 'later',
        text: 'Bjorgs Mail zweimal lesen und tief durchatmen (+Ruhe)',
        effects: { stress: -3 },
        resultText:
          '„Wollt ich später zumachen." Aha. Du atmest durch. Nicht dein Chaos — aber dein Aufräumen. Wenigstens sauber und nachvollziehbar.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ansible01',
      username: 'deploy',
      currentPath: '/opt/playbooks',
      taskText:
        'harden.yml mit --check --diff prüfen (nur web02 weicht ab), ausrollen, dann ein zweites Mal laufen lassen (changed=0). Ziel: web02 sshd_config auf PermitRootLogin no.',
      vfsOverlay: {
        files: [
          ...controllerSshFiles,
          { path: '/etc/ansible/hosts', content: ANSIBLE_INVENTORY },
          {
            path: '/opt/playbooks/harden.yml',
            content:
              '---\n' +
              '- name: SSH-Drift korrigieren\n' +
              '  hosts: web\n' +
              '  become: true\n' +
              '  tasks:\n' +
              '    - name: Root-Login abschalten\n' +
              '      lineinfile:\n' +
              '        path: /etc/ssh/sshd_config\n' +
              "        regexp: '^#?PermitRootLogin'\n" +
              "        line: 'PermitRootLogin no'\n",
          },
        ],
      },
      hosts: [
        webHost('web01', '10.0.20.11', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('no', 'no') },
        ]),
        webHost('web02', '10.0.20.12', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('yes', 'no') },
        ]),
        webHost('web03', '10.0.20.13', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('no', 'no') },
        ]),
      ],
      commandSkillGain: {
        'ansible-playbook': { linux: 2, security: 1 },
        ssh: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'web02', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web02', file: '/etc/ssh/sshd_config', absentMatches: '^PermitRootLogin yes' },
          ],
          resultText:
            'web02 steht wieder auf \`PermitRootLogin no\` — und web01/web03 hat das Playbook nicht angefasst, weil dort schon alles stimmte. Das ist der Kern von Idempotenz: Das Playbook beschreibt den Soll-Zustand, nicht eine Abfolge von Befehlen.\n\nDer zweite Lauf ist der Beweis: \`changed=0\` auf allen Hosts. Wenn ein Playbook beim zweiten Mal noch etwas ändert, ist es NICHT idempotent — dann stimmt etwas nicht. Bjorgs „kurzer Test" ist Geschichte, sauber und nachvollziehbar zurückgedreht.',
          skillGain: { linux: 3, security: 3, troubleshooting: 2 },
          effects: { stress: -3 },
        },
      ],
      hints: [
        '🤖 Henry: Schau erst, WO der Drift sitzt, bevor du etwas ausrollst. Ansible kann dir einen Trockenlauf mit Zeilen-Diff zeigen — dann siehst du, welcher Host abweicht.',
        '🤖 Henry: Der Trockenlauf braucht zwei Schalter: einen für „nichts ändern", einen für „zeig mir den Diff". Nur web02 sollte als geändert auftauchen.',
        '🤖 Henry: Nach dem Trockenlauf: Playbook echt ausrollen, dann ein zweites Mal starten. Beim zweiten Lauf muss changed=0 stehen.',
        '🤖 Henry: `ansible-playbook harden.yml --check --diff` (nur web02 changed) → `ansible-playbook harden.yml` (anwenden) → `ansible-playbook harden.yml` nochmal (changed=0, der Idempotenz-Beweis).',
      ],
    },
    tags: ['learning', 'ansible', 'terminal', 'security', 'automation'],
  },

  {
    id: 'learn_ans_03_broken_playbook',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ans_02_drift'] },
    category: 'training',
    involvedCharacters: ['jens'],
    title: 'Ansible 3: Das kaputte Playbook',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  TICKET #5033 — Playbook bricht ab                          ║
║  Melder: Jens                                               ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Jens, sachlich wie immer: „Ich hab \`deploy.yml\` angefangen —
es soll allen Webservern ein Wartungsbanner unter
\`/etc/banner.txt\` verpassen. Aber es bricht sofort ab. Muss
ein Tippfehler sein, ich komm gerade nicht dazu. Schau's dir
an: Die Fehlermeldung sagt dir, in welcher Aufgabe es hakt —
und welcher Parameter fehlt."

Ein Modul-Parameter ist verschrieben. Ansible nennt dir die
Aufgabe und den fehlenden Pflichtparameter. Lies die Meldung,
korrigier den Tippfehler in der Datei, lauf es sauber durch.

**Deine Aufgabe:**
- Starte \`deploy.yml\` und lies die Fehlermeldung
- Finde und korrigier den Tippfehler im Playbook
- Roll es sauber aus — Banner auf allen drei Hosts`,
    mentorNote:
      'Ansible-Fehler sind präzise: Sie nennen die Aufgabe (TASK) und den Grund (hier: ein Pflichtparameter fehlt, weil sein Name verschrieben ist). Das lineinfile-Modul braucht zwingend `path`. Ein verschriebenes `pathh` ist für Ansible schlicht ein unbekannter Parameter — und `path` fehlt. sed korrigiert den Tippfehler in der Datei an genau einer Stelle.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du startest das Playbook und liest, wo es klemmt.',
      },
      {
        id: 'later',
        text: 'Erst überlegen, welche Pflichtparameter lineinfile hat (+Kontext)',
        effects: { stress: -1 },
        resultText:
          'lineinfile braucht eine Zieldatei — den Parameter `path`. Fehlt der, kann das Modul nicht wissen, WO es schreiben soll. Genau da wirst du den Fehler finden.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ansible01',
      username: 'deploy',
      currentPath: '/opt/playbooks',
      taskText:
        'deploy.yml starten, Fehlermeldung lesen, den Tippfehler (pathh statt path) mit sed korrigieren, sauber ausrollen. Ziel: Banner auf web01/web02/web03.',
      vfsOverlay: {
        files: [
          ...controllerSshFiles,
          { path: '/etc/ansible/hosts', content: ANSIBLE_INVENTORY },
          {
            path: '/opt/playbooks/deploy.yml',
            content:
              '---\n' +
              '- name: Wartungsbanner ausrollen\n' +
              '  hosts: web\n' +
              '  become: true\n' +
              '  tasks:\n' +
              '    - name: Banner-Datei schreiben\n' +
              '      lineinfile:\n' +
              '        pathh: /etc/banner.txt\n' +
              "        line: 'KRITIS-Zone - Zugriff wird protokolliert.'\n" +
              '        create: true\n',
          },
        ],
      },
      hosts: [
        webHost('web01', '10.0.20.11'),
        webHost('web02', '10.0.20.12'),
        webHost('web03', '10.0.20.13'),
      ],
      commandSkillGain: {
        'ansible-playbook': { linux: 2, troubleshooting: 1 },
        sed: { linux: 1, troubleshooting: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { file: '/opt/playbooks/deploy.yml', absentMatches: 'pathh' },
            { host: 'web01', file: '/etc/banner.txt', matches: 'KRITIS-Zone' },
            { host: 'web02', file: '/etc/banner.txt', matches: 'KRITIS-Zone' },
            { host: 'web03', file: '/etc/banner.txt', matches: 'KRITIS-Zone' },
          ],
          resultText:
            'Ein Buchstabe zu viel — \`pathh\` statt \`path\` — und das ganze Playbook stand. So arbeitet Ansible: Es rät nicht, es meldet präzise, welche Aufgabe an welchem Pflichtparameter scheitert. Wer die Meldung liest, statt blind neu zu starten, ist in Sekunden fertig.\n\nNach der Korrektur lief es sauber durch: Das Banner steht jetzt auf allen drei Webservern. Und weil lineinfile idempotent ist, kannst du es beliebig oft wiederholen, ohne Schaden anzurichten.',
          skillGain: { linux: 3, troubleshooting: 4, security: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Starte das Playbook und LIES die Fehlermeldung genau. Sie nennt die Aufgabe und den Pflichtparameter, der fehlt — das ist schon der halbe Weg.',
        '🤖 Jens: Der Parameter heißt `path`, im Playbook steht aber etwas leicht anderes. Vergleich die Zeile mit dem, was das Modul erwartet.',
        '🤖 Jens: Korrigier den Tippfehler direkt in der Datei — ein Stream-Editor ersetzt das falsche Wort in einem Rutsch. Danach dasselbe Playbook nochmal starten.',
        "🤖 Jens: `sudo sed -i 's/pathh:/path:/' /opt/playbooks/deploy.yml` → dann `ansible-playbook deploy.yml`.",
      ],
    },
    tags: ['learning', 'ansible', 'terminal', 'automation'],
  },

  {
    id: 'learn_ans_04_fleet_hardening',
    weekRange: [1, 12],
    probability: 1,
    requiredModes: ['learning'],
    requires: { events: ['learn_ans_03_broken_playbook'] },
    category: 'training',
    involvedCharacters: ['bert'],
    title: 'Ansible 4: Die Flottenhärtung',
    description: `\`\`\`
╔══════════════════════════════════════════════════════════════╗
║  ★ ABSCHLUSS — Flottenhärtung nach Richtlinie               ║
║  Melder: Bert (IT-Leitung)                                  ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

Bert legt dir die Härtungsrichtlinie hin: „Auf ALLEN Webservern
gilt ab sofort: kein Root-Login per SSH, und keine Passwort-
Anmeldung mehr — nur noch Schlüssel. \`harden-fleet.yml\` gibt
es schon, aber es deckt bisher nur den Root-Login ab. Erweiter
es um die Passwort-Regel und roll es auf die ganze Flotte aus.

Du kannst das jetzt — Inventar, Playbook, Idempotenz. Zeig mir,
dass du eine Richtlinie in ein sauberes, wiederholbares Playbook
gießen kannst."

Das Playbook hat eine \`lineinfile\`-Aufgabe für PermitRootLogin.
Du hängst eine zweite Aufgabe für PasswordAuthentication an —
gleiche Struktur, andere Regel — und rollst dann aus.

**Deine Aufgabe:**
- Häng eine zweite lineinfile-Aufgabe für \`PasswordAuthentication no\` an \`harden-fleet.yml\` an
- Roll das erweiterte Playbook auf web01/web02/web03 aus
- Prüf auf einem Host per SSH, dass beide Regeln stehen`,
    mentorNote:
      'Die Synthese: Eine Richtlinie in ein Playbook übersetzen. Die zweite Aufgabe ist eine Kopie der ersten mit anderem Ziel — dieselbe Struktur (name, lineinfile, path, regexp, line). Anhängen kannst du zeilenweise mit echo und dem Anhänge-Umleiter >>. Achte auf die Einrückung: Aufgabe 4 Leerzeichen, Modul 6, Parameter 8. Prüf dein erweitertes Playbook mit --syntax-check auf Einrückungsfehler, BEVOR du ausrollst — so fängst du einen YAML-Fehler ab, bevor er auf die Flotte trifft. Danach: ausrollen, per SSH gegenprüfen.',
    choices: [
      {
        id: 'start',
        text: 'Terminal öffnen...',
        terminalCommand: true,
        effects: {},
        resultText: 'Du öffnest harden-fleet.yml und machst dich an die Erweiterung.',
      },
      {
        id: 'later',
        text: 'Erst die Richtlinie in Playbook-Struktur skizzieren (+Kontext)',
        effects: { stress: -2 },
        resultText:
          'Zwei Regeln, zwei lineinfile-Aufgaben, ein Playbook. Die zweite ist die Kopie der ersten mit PasswordAuthentication statt PermitRootLogin. Sauber gedacht ist halb getippt.',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'ansible01',
      username: 'deploy',
      currentPath: '/opt/playbooks',
      taskText:
        'harden-fleet.yml um eine zweite lineinfile-Aufgabe (PasswordAuthentication no) erweitern, dann auf web01/web02/web03 ausrollen. Ziel: alle drei Hosts mit PermitRootLogin no UND PasswordAuthentication no.',
      vfsOverlay: {
        files: [
          ...controllerSshFiles,
          { path: '/etc/ansible/hosts', content: ANSIBLE_INVENTORY },
          {
            // Ends with a trailing newline so an appended task starts on its
            // own line and does not merge into `line: 'PermitRootLogin no'`.
            path: '/opt/playbooks/harden-fleet.yml',
            content:
              '---\n' +
              '- name: Flotte härten\n' +
              '  hosts: web\n' +
              '  become: true\n' +
              '  tasks:\n' +
              '    - name: Root-Login abschalten\n' +
              '      lineinfile:\n' +
              '        path: /etc/ssh/sshd_config\n' +
              '        regexp: ^#?PermitRootLogin\n' +
              '        line: PermitRootLogin no\n',
          },
        ],
      },
      hosts: [
        webHost('web01', '10.0.20.11', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('yes', 'yes') },
        ]),
        webHost('web02', '10.0.20.12', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('yes', 'yes') },
        ]),
        webHost('web03', '10.0.20.13', [
          { path: '/etc/ssh/sshd_config', content: sshdConfig('yes', 'yes') },
        ]),
      ],
      commandSkillGain: {
        'ansible-playbook': { linux: 2, security: 2 },
        echo: { linux: 1 },
        ssh: { linux: 1, security: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web01', file: '/etc/ssh/sshd_config', matches: '^PasswordAuthentication no' },
            { host: 'web02', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web02', file: '/etc/ssh/sshd_config', matches: '^PasswordAuthentication no' },
            { host: 'web03', file: '/etc/ssh/sshd_config', matches: '^PermitRootLogin no' },
            { host: 'web03', file: '/etc/ssh/sshd_config', matches: '^PasswordAuthentication no' },
          ],
          resultText:
            'Die ganze Flotte steht: kein Root-Login, keine Passwort-Anmeldung, nur noch Schlüssel — auf allen drei Webservern, aus einem einzigen Playbook. Du hast eine Richtlinie in wiederholbaren, nachvollziehbaren Code übersetzt. Genau das ist Konfigurationsmanagement.\n\nUnd das Beste: Morgen kommt web04 dazu, du trägst einen Hostnamen ins Inventar ein, lässt das Playbook laufen — und der neue Server ist ohne Handarbeit konform. Eine Wahrheit für alle Hosts. Bert nickt zufrieden: „Das nehmen wir als Standard."',
          skillGain: { security: 6, linux: 4, troubleshooting: 3 },
          effects: { stress: -4 },
        },
      ],
      hints: [
        '🤖 Henry: Die zweite Regel ist strukturell die Kopie der ersten — nur mit PasswordAuthentication statt PermitRootLogin. Du hängst sie als weitere Aufgabe hinten an das Playbook an.',
        '🤖 Henry: Anhängen geht zeilenweise: Jede YAML-Zeile mit echo ausgeben und mit dem Anhänge-Umleiter (zwei spitze Klammern) in die Datei schreiben. Pass auf die Einrückung auf — Aufgabe 4 Leerzeichen, Modul 6, Parameter 8.',
        '🤖 Henry: Fünf Zeilen kommen dazu: die Aufgaben-Zeile (- name:), die Modul-Zeile (lineinfile:), und darunter path, regexp und line.',
        '🤖 Henry: Prüf mit `ansible-playbook harden-fleet.yml --syntax-check`, ob dein YAML sauber ist, bevor du ausrollst — der Trockenlauf zeigt dir Einrückungsfehler, solange sie noch harmlos sind.',
        "🤖 Henry: `echo '    - name: Passwort-Login abschalten' >> harden-fleet.yml` → `echo '      lineinfile:' >> harden-fleet.yml` → `echo '        path: /etc/ssh/sshd_config' >> harden-fleet.yml` → `echo '        regexp: ^#?PasswordAuthentication' >> harden-fleet.yml` → `echo '        line: PasswordAuthentication no' >> harden-fleet.yml` → prüfen mit `ansible-playbook harden-fleet.yml --syntax-check`, dann `ansible-playbook harden-fleet.yml`.",
      ],
    },
    tags: ['learning', 'ansible', 'terminal', 'security', 'automation', 'kritis'],
  },
];
