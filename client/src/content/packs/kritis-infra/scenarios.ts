/**
 * KRITIS Infrastructure Scenarios
 * Advanced scenarios utilizing VFS templates and full shell engine
 */

import { Scenario } from '@kritis/shared';

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
      commands: [
        {
          pattern: 'ping',
          patternRegex: 'ping.*10\\.0\\.0\\.12',
          output: `PING 10.0.0.12 (10.0.0.12) 56(84) bytes of data.
64 bytes from 10.0.0.12: icmp_seq=1 ttl=64 time=0.5 ms
64 bytes from 10.0.0.12: icmp_seq=2 ttl=64 time=0.4 ms
64 bytes from 10.0.0.12: icmp_seq=3 ttl=64 time=0.4 ms

# PLC ist erreichbar! Das Problem ist nicht das Netzwerk...`,
          skillGain: { netzwerk: 2, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'nc',
          patternRegex: 'nc.*502|netcat.*502',
          output: `Connection to 10.0.0.12 502 port [tcp/modbus] failed: Connection refused

# Modbus-Port 502 ist ZU! Der PLC-Service läuft nicht!`,
          skillGain: { netzwerk: 3, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'nmap',
          patternRegex: 'nmap.*10\\.0\\.0\\.12',
          output: `Starting Nmap scan of 10.0.0.12
PORT    STATE  SERVICE
22/tcp  open   ssh
80/tcp  open   http (HMI Web Interface)
502/tcp closed modbus

# Port 502 (Modbus) ist geschlossen! Der PLC-Dienst ist abgestürzt.`,
          skillGain: { netzwerk: 4, security: 2, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'tail',
          patternRegex: 'tail.*operations',
          output: `2026-03-14 09:55:00 [WARN] PLC03: Response timeout (attempt 1/3)
2026-03-14 09:55:05 [WARN] PLC03: Response timeout (attempt 2/3)
2026-03-14 09:55:10 [ERROR] PLC03: Connection lost after 3 attempts
2026-03-14 09:55:10 [CRIT] PLC03: Sensor data stale - last update 5 minutes ago

# Verbindung ging um 09:55:10 verloren, nach 3 Timeout-Versuchen`,
          skillGain: { troubleshooting: 2 },
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*plc_config',
          output: `{
  "plc_devices": [
    {"id": "PLC01", "ip": "10.0.0.10", "type": "S7-1200", "function": "Pumpensteuerung", "status": "online"},
    {"id": "PLC02", "ip": "10.0.0.11", "type": "S7-1200", "function": "Ventilsteuerung", "status": "online"},
    {"id": "PLC03", "ip": "10.0.0.12", "type": "S7-300", "function": "Sensorik", "status": "OFFLINE"}
  ]
}

# PLC03 ist der einzige mit Status OFFLINE`,
          skillGain: { troubleshooting: 2 },
        },
        {
          pattern: 'ssh',
          patternRegex: 'ssh.*10\\.0\\.0\\.12',
          output: `Connecting to 10.0.0.12...
PLC03-SENSORHUB login: operator
Password: ********

Welcome to PLC03 Sensor Hub
Firmware: 4.2.1 (2024-01-15)
ALERT: Modbus service not running!

PLC03> systemctl status modbus
● modbus.service - Modbus TCP Server
   Loaded: loaded
   Active: failed (Result: exit-code)

PLC03> systemctl restart modbus
Restarting modbus service...
modbus.service: Started successfully.

# Modbus-Service war abgestürzt und wurde neu gestartet!`,
          skillGain: { linux: 3, troubleshooting: 4 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['ping', 'nc'],
          allRequired: true,
          resultText: 'Perfekte Diagnose! Ping geht, aber Modbus-Port ist zu. Der PLC-Service braucht einen Neustart.',
          skillGain: { netzwerk: 4, troubleshooting: 5, linux: 2 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Bevor du tiefer gräbst — ist der PLC 10.0.0.12 überhaupt im Netz erreichbar? Fang mit einem simplen Erreichbarkeits-Test an.',
        'Tipp: SCADA nutzt Modbus auf Port 502. Selbst wenn der Host antwortet, kann der Service-Port zu sein — prüf gezielt den Port.',
        'Tipp: Festgefahren? ping 10.0.0.12 prüft den Host, nc -z 10.0.0.12 502 prüft den Modbus-Port.',
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
      commands: [
        {
          pattern: 'cat',
          patternRegex: 'cat.*alerts',
          output: `=== Network Alerts ===
2026-03-14 09:00:00 [WARN] FS01 (192.168.10.2): Outbound traffic 523 MB/h (baseline: 50 MB/h)
2026-03-14 09:00:00 [INFO] Destination: 142.250.185.78 (Google Cloud Storage)
2026-03-14 09:00:00 [INFO] Top talker: 192.168.20.45 (user.schmidt Workstation)

# Traffic geht zu Google Cloud von user.schmidt's Rechner`,
          skillGain: { security: 3, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'tcpdump',
          patternRegex: 'tcpdump|iftop|nethogs',
          output: `Capturing on eth0...
192.168.20.45 -> 142.250.185.78:443  HTTPS  15.2 MB/s
192.168.20.45 -> 142.250.185.78:443  HTTPS  14.8 MB/s

Source Analysis:
  Host: WORKSTATION-SCHMIDT
  User: user.schmidt (Marketing)
  Process: chrome.exe -> upload.google.com

# user.schmidt lädt etwas zu Google Cloud hoch`,
          skillGain: { netzwerk: 4, security: 3 },
          isSolution: true,
        },
        {
          pattern: 'whois',
          patternRegex: 'whois.*142\\.250',
          output: `NetRange:       142.250.0.0 - 142.250.255.255
Organization:   Google LLC (GOGL)
OrgName:        Google LLC

# Das ist legitimer Google-Traffic, keine verdächtige IP`,
          skillGain: { netzwerk: 2, security: 2 },
        },
        {
          pattern: 'grep',
          patternRegex: 'grep.*(schmidt|192\\.168\\.20\\.45)',
          output: `access.log:192.168.20.45 user.schmidt [14/Mar/2026:08:45:12] "GET /Marketing/Kampagne2026/Video_final.mp4" 200 523456789
access.log:192.168.20.45 user.schmidt [14/Mar/2026:09:00:01] "POST upload.google.com/drive" 201

# schmidt hat Video_final.mp4 (500MB) zu Google Drive hochgeladen`,
          skillGain: { troubleshooting: 3, security: 2 },
          isSolution: true,
        },
        {
          pattern: 'tail',
          patternRegex: 'tail.*/var/log',
          output: `=== Recent Events ===
09:00:00 [CRIT] Anomaly detected: FS01 outbound traffic 10x baseline
09:00:01 [INFO] Auto-correlation: Single source 192.168.20.45
09:00:02 [INFO] User context: user.schmidt, Department: Marketing

# System hat bereits identifiziert: user.schmidt ist die Quelle`,
          skillGain: { security: 2 },
        },
      ],
      solutions: [
        {
          commands: ['cat', 'grep'],
          allRequired: false,
          resultText: 'Gute Analyse! Der Traffic war legitim - Marketing-Video zu Google Drive. Aber: Richtlinien für Cloud-Uploads fehlen!',
          skillGain: { security: 4, netzwerk: 4, troubleshooting: 3 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Bevor du Alarm schlägst — lies erstmal die Alert-Details selbst. Die liegen unter /var/log/monitoring/.',
        'Tipp: Wer ist die Quelle des Traffics? Filter die Logs nach der verdächtigen IP oder dem User.',
        'Tipp: Festgefahren? cat /var/log/monitoring/alerts.log zeigt die Details, grep filtert nach der IP, whois prüft das Ziel.',
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
      commands: [
        {
          pattern: 'git',
          patternRegex: 'git\\s+(log|diff|show)',
          output: `commit 8a3f2b1 (HEAD)
Author: admin.extern <admin@extern.de>
Date:   Thu Mar 13 23:00:15 2026

    Add geo-blocking for non-EU traffic

diff --git a/rules.d/50-geo-blocking.conf b/rules.d/50-geo-blocking.conf
new file mode 100644
+++ b/rules.d/50-geo-blocking.conf
@@ -0,0 +1,5 @@
+# Geo-blocking rule - block non-EU
+-A INPUT -m geoip ! --src-cc EU -j DROP
+-A FORWARD -m geoip ! --src-cc EU -j DROP

# Die neue Regel blockiert alles was nicht "EU" ist...
# Aber dynamische DSL-IPs werden manchmal falsch zugeordnet!`,
          skillGain: { security: 4, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'iptables',
          patternRegex: 'iptables.*-L',
          output: `Chain INPUT (policy DROP)
target     prot  source          destination
ACCEPT     all   10.0.0.0/8      anywhere
ACCEPT     all   192.168.0.0/16  anywhere
DROP       all   anywhere        anywhere    geoip match ! EU  # <-- HIER!

Chain FORWARD (policy DROP)
target     prot  source          destination
DROP       all   anywhere        anywhere    geoip match ! EU  # <-- UND HIER!

# Geo-Blocking droppt ALLES was nicht als EU klassifiziert ist`,
          skillGain: { netzwerk: 3, security: 3 },
          isSolution: true,
        },
        {
          pattern: 'geoiplookup',
          patternRegex: 'geoiplookup|geoip',
          output: `GeoIP lookup for 87.123.45.67 (Außenstelle-Nord VPN):
  WARNING: IP not in database, defaulting to: UNKNOWN

GeoIP lookup for 91.234.56.78 (Außenstelle-Süd VPN):
  Country: DE (Germany)
  Status: OK

# Außenstelle-Nord hat eine IP die nicht in der GeoIP-DB ist!
# Wird als "nicht EU" klassifiziert und geblockt!`,
          skillGain: { netzwerk: 4, troubleshooting: 4 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*/var/log/iptables',
          output: `Mar 14 06:00:01 fw01 kernel: IPT-GEO-BLOCK: IN=eth0 SRC=87.123.45.67 DST=10.10.0.1 PROTO=UDP DPT=500
Mar 14 06:00:01 fw01 kernel: IPT-GEO-BLOCK: IN=eth0 SRC=87.123.45.67 DST=10.10.0.1 PROTO=UDP DPT=4500
Mar 14 06:00:02 fw01 kernel: IPT-GEO-BLOCK: IN=eth0 SRC=87.123.45.67 DST=10.10.0.1 PROTO=UDP DPT=500

# Die Logs zeigen: 87.123.45.67 wird von der Geo-Regel geblockt!`,
          skillGain: { troubleshooting: 3, security: 2 },
        },
        {
          pattern: 'vim',
          patternRegex: '(vim|nano|edit).*geo-blocking',
          output: `Editing /etc/firewall/rules.d/50-geo-blocking.conf...

# OLD RULE (blocking):
# -A INPUT -m geoip ! --src-cc EU -j DROP

# NEW RULE (whitelist known VPN endpoints):
-A INPUT -s 87.123.45.67 -j ACCEPT  # Außenstelle-Nord
-A INPUT -m geoip ! --src-cc EU -j DROP

File saved. Applying changes...
Firewall rules reloaded successfully.

# Whitelist für bekannte VPN-Endpoints hinzugefügt!`,
          skillGain: { security: 4, netzwerk: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['git', 'iptables'],
          allRequired: false,
          resultText: 'Exzellent! Du hast die fehlerhafte Geo-Blocking-Regel identifiziert und verstanden warum sie legitimen Traffic blockt.',
          skillGain: { security: 5, netzwerk: 5, troubleshooting: 4 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Was wurde gestern Abend geändert? Vielleicht gibt es ein Change-Log oder git history.',
        'Tipp: iptables -L zeigt die aktiven Regeln',
        'Tipp: Die VPN-Endpoints haben deutsche IPs - werden die wirklich als EU erkannt?',
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
      commands: [
        {
          pattern: 'Get-Process',
          output: `Handles  NPM(K)    PM(K)      WS(K)   CPU(s)     Id  ProcessName
-------  ------    -----      -----   ------     --  -----------
    234      15    45678      67890     1.23   1234  siemens_tia
    567      25    23456      34567     2.34   2345  chrome
    123      10    12345      23456     0.45   3456  PsExec64        # <-- VERDÄCHTIG?

# PsExec64 läuft... Das ist ein legitimes Admin-Tool, aber auch Ransomware-Favorit!`,
          skillGain: { security: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'Get-WinEvent',
          patternRegex: 'Get-WinEvent|eventvwr',
          output: `TimeCreated          ProviderName         Message
-----------          ------------         -------
14.03.2026 09:15:00  Defender             Verdächtige Aktivität: PsExec64.exe
14.03.2026 09:15:00  Defender             Verhaltensanalyse: Datei-Enumeration
14.03.2026 09:14:55  Security             Neuer Prozess: PsExec64.exe
14.03.2026 09:14:50  Security             Admin-Login: engineer

# PsExec wurde um 09:14:55 gestartet, Defender schlug um 09:15:00 an`,
          skillGain: { security: 4, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'netstat',
          patternRegex: 'netstat|Get-NetTCPConnection',
          output: `Proto  LocalAddress         ForeignAddress       State
TCP    192.168.20.100:49152  10.0.0.1:445         ESTABLISHED  # SCADA-Master!
TCP    192.168.20.100:49153  10.0.0.10:102        ESTABLISHED  # PLC01!

# ALARM: Die Workstation hat aktive Verbindungen ins OT-Netz!`,
          skillGain: { netzwerk: 4, security: 4 },
          isSolution: true,
        },
        {
          pattern: 'taskkill',
          patternRegex: 'taskkill|Stop-Process.*PsExec',
          output: `ERFOLGREICH: Der Prozess "PsExec64.exe" mit PID 3456 wurde beendet.

# PsExec wurde gestoppt. Aber hat er schon Schaden angerichtet?`,
          skillGain: { security: 2 },
        },
        {
          pattern: 'Get-ChildItem',
          patternRegex: 'Get-ChildItem.*-Recurse.*\\.(encrypted|locked)',
          output: `Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
<Keine Dateien gefunden>

# Keine verschlüsselten Dateien gefunden - noch nicht ausgebrochen!`,
          skillGain: { security: 3 },
        },
      ],
      solutions: [
        {
          commands: ['netstat', 'Get-Process'],
          allRequired: false,
          resultText: 'Du hast die Situation analysiert: PsExec ist ein Admin-Tool, aber die OT-Verbindungen sind besorgniserregend. Isolation wäre trotzdem die richtige erste Reaktion gewesen!',
          skillGain: { security: 5, netzwerk: 4, troubleshooting: 4 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Welche Prozesse laufen? Get-Process zeigt sie',
        'Tipp: Hat die Workstation Verbindungen zum OT-Netz? netstat -an',
        'Tipp: Die Windows Event Logs zeigen wann was passiert ist',
      ],
    },
  },

  // ============================================
  // VENDOR MANAGEMENT SCENARIOS
  // ============================================
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
      commands: [
        {
          pattern: 'ls',
          patternRegex: '^ls(\\s.*)?$',
          output: `total 24576
drwxr-xr-x 2 root engineer 4096 Mar 14 08:00 .
drwxr-xr-x 4 root root     4096 Jan 15 08:00 ..
-rw-r--r-- 1 root engineer 8234567 Mar 14 08:00 S7-1200_FW_4.6.2.upd
-rw-r--r-- 1 root engineer    1234 Mar 14 08:00 S7-1200_FW_4.6.2.md5
-rw-r--r-- 1 root engineer    5678 Mar 14 08:00 README_CVE-2026-1234.txt

# Firmware-Datei und Dokumentation vorhanden`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*README',
          output: `=== Siemens Security Advisory SSA-2026-1234 ===
CVE-2026-1234: Remote Code Execution via Modbus

AFFECTED VERSIONS: S7-1200 FW 4.6.0, 4.6.1
FIXED IN: 4.6.2

SEVERITY: CVSS 9.8 (CRITICAL)

MITIGATION: Update to 4.6.2 IMMEDIATELY
            Alternative: Disable Modbus interface (not recommended)

UPDATE PROCEDURE:
1. Stop PLC gracefully
2. Upload firmware via TIA Portal or plc-updater
3. Reboot PLC
4. Verify firmware version
5. Test process control

ESTIMATED DOWNTIME: 5-10 minutes per PLC

# Kritisches Update! 5-10 Minuten pro PLC ist machbar`,
          skillGain: { security: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'md5sum',
          patternRegex: 'md5sum.*\\.upd',
          output: `a3f2b1c9d8e7f6a5b4c3d2e1f0a9b8c7  S7-1200_FW_4.6.2.upd
Comparing with S7-1200_FW_4.6.2.md5... OK

# Checksumme stimmt - Firmware ist integer`,
          skillGain: { security: 2 },
        },
        {
          pattern: 'plc-status',
          patternRegex: 'plc-status|./check-plcs',
          output: `=== PLC Status Overview ===
PLC01 (10.0.0.10): RUNNING  FW: 4.6.1  Load: 45%  Redundancy: PLC02
PLC02 (10.0.0.11): RUNNING  FW: 4.6.1  Load: 52%  Redundancy: PLC01
PLC03 (10.0.0.12): RUNNING  FW: 4.6.1  Load: 38%  Redundancy: none

Update Plan:
- PLC01 first (PLC02 provides redundancy)
- PLC02 second (PLC01 provides redundancy)
- PLC03 last (schedule during low-activity window)

# Rolling Update möglich! PLC01 und PLC02 haben Redundanz`,
          skillGain: { troubleshooting: 4, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'plc-update',
          patternRegex: 'plc-update|./update-plc',
          output: `=== PLC Firmware Update Tool ===
Usage: plc-update <PLC-IP> <firmware-file> [--dry-run]

Example: plc-update 10.0.0.10 S7-1200_FW_4.6.2.upd

Options:
  --dry-run     Simulate update without applying
  --verify      Verify firmware after update
  --rollback    Rollback to previous version

# Tool zur Verfügung. Mit --dry-run kann man testen`,
          skillGain: { linux: 2 },
        },
      ],
      solutions: [
        {
          commands: ['cat', 'plc-status'],
          allRequired: true,
          resultText: 'Exzellent! Du hast die Firmware-Dokumentation gelesen und einen Rolling-Update-Plan entwickelt. Mit PLC-Redundanz ist das Update im Betrieb möglich!',
          skillGain: { security: 4, troubleshooting: 4, softSkills: 5 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Was steht in der README zum Update-Prozess?',
        'Tipp: Welche PLCs haben Redundanz? Das ermöglicht Rolling Updates',
        'Tipp: plc-status oder ./check-plcs zeigt den aktuellen Stand',
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
      commands: [
        {
          pattern: 'cat',
          patternRegex: 'cat.*ticket',
          output: `=== Ticket #2026-03-09-001 ===
System: HMI-Panel hmi-station (192.168.10.50)
Model: Siemens Comfort Panel TP1500
Issue: Grafikfehler, verzögerter Touchscreen

Timeline:
  09.03.2026 08:00 - Ticket eröffnet (Priority: HIGH)
  09.03.2026 08:01 - Auto-Response: "Ticket erhalten"
  09.03.2026 18:00 - Status: "In Bearbeitung"
  10.03.2026       - Keine Aktivität
  11.03.2026       - Keine Aktivität
  12.03.2026       - Keine Aktivität
  13.03.2026       - Keine Aktivität
  14.03.2026 09:00 - HEUTE - Immer noch "In Bearbeitung"

SLA: Premium Support - 24h Reaktionszeit
SLA STATUS: VERLETZT (5 Tage ohne substantielle Reaktion)

# Klare SLA-Verletzung! 5 Tage statt 24 Stunden!`,
          skillGain: { softSkills: 4, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*contract|cat.*sla',
          output: `=== Siemens Premium Support Contract ===
Contract ID: PREM-2024-KRITIS-001
Valid: 01.01.2024 - 31.12.2026

Service Levels:
  CRITICAL: 4h Response, 24h Resolution
  HIGH:     24h Response, 72h Resolution
  NORMAL:   48h Response, 5 Business Days Resolution

Penalties for SLA Breach:
  - 1st Violation: 10% credit on next invoice
  - 2nd Violation: 25% credit
  - 3rd Violation: Contract review

Current Status:
  Violations this year: 2 (this would be #3!)

# Bei der dritten Verletzung gibt es Contract Review!`,
          skillGain: { softSkills: 5 },
          isSolution: true,
        },
        {
          pattern: 'ping',
          patternRegex: 'ping.*192\\.168\\.10\\.50',
          output: `PING 192.168.10.50 (192.168.10.50) 56(84) bytes of data.
64 bytes from 192.168.10.50: icmp_seq=1 ttl=64 time=1.2 ms
64 bytes from 192.168.10.50: icmp_seq=2 ttl=64 time=0.9 ms
64 bytes from 192.168.10.50: icmp_seq=3 ttl=64 time=1.0 ms

# HMI ist erreichbar`,
          skillGain: { netzwerk: 1 },
        },
        {
          pattern: 'screenshot',
          patternRegex: 'screenshot|grab|vnc',
          output: `Taking screenshot of hmi-station (192.168.10.50)...
Screenshot saved to: /tmp/hmi_issue_2026-03-14_0900.png

Visual defects documented:
- Garbled graphics on main process screen
- Touch calibration off by ~2cm
- Occasional screen flicker

# Screenshots für Dokumentation gesichert`,
          skillGain: { troubleshooting: 2 },
        },
        {
          pattern: 'mail',
          patternRegex: 'mail|sendmail|escalate',
          output: `Composing escalation email...

To: sabine.koch@siemens.com
CC: support-escalation@siemens.com, chef@firma.de
Subject: DRINGEND: SLA-Verletzung Ticket #2026-03-09-001

Attachments:
- ticket_history.txt
- sla_contract.pdf
- hmi_issue_2026-03-14_0900.png

Status: Ready to send

# Eskalation vorbereitet mit allen Dokumenten`,
          skillGain: { softSkills: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['cat'],
          allRequired: false,
          resultText: 'Du hast die SLA-Verletzung sauber dokumentiert. Mit dem Vertrag in der Hand hast du eine starke Verhandlungsposition!',
          skillGain: { softSkills: 6, troubleshooting: 3 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Bevor du dich auf eine Diskussion einlässt — verschaff dir den kompletten Ticket-Verlauf. Wann wurde was zugesagt, wann tatsächlich reagiert?',
        'Tipp: Sichere die Fakten: Was steht im Support-Vertrag zur Reaktionszeit, und wie dokumentierst du den Verlauf belastbar?',
        'Tipp: Konkret: cat ticket*.log zeigt den Verlauf, Screenshots sichern die Beweise.',
      ],
    },
  },

  // ============================================
  // COMPLIANCE SCENARIOS
  // ============================================
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
      commands: [
        {
          pattern: 'ls',
          patternRegex: '^ls(\\s.*)?$',
          output: `total 48
drwxr-xr-x 6 root admin 4096 Mar 14 09:00 .
drwxr-xr-x 4 root root  4096 Jan 15 08:00 ..
drwxr-xr-x 2 root admin 4096 Feb 01 10:00 netzwerk/
drwxr-xr-x 2 root admin 4096 Jan 15 08:00 zugriffskontrollen/
drwxr-xr-x 2 root admin 4096 Dec 10 14:00 incident_response/
drwxr-xr-x 2 root admin 4096 Nov 01 09:00 pentests/
-rw-r--r-- 1 root admin 1234 Mar 14 09:00 audit_checklist.md

# Grundstruktur vorhanden, aber wie aktuell?`,
          skillGain: { linux: 1 },
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*checklist',
          output: `# BSI Audit Checklist - Stand: 14.03.2026

## Netzwerkplan mit Segmentierung IT/OT
- [ ] Aktueller Netzwerkplan (letzte Version: 2024-06-15) ⚠️ VERALTET
- [x] Segmentierung dokumentiert
- [ ] Firewall-Regeln dokumentiert ❌ FEHLT

## Dokumentation der Zugriffskontrollen
- [x] Berechtigungskonzept vorhanden
- [x] AD-Gruppen dokumentiert
- [ ] OT-Zugänge dokumentiert ❌ FEHLT

## Incident-Response-Prozess
- [x] Prozess definiert
- [ ] Letzte Übung: nie durchgeführt ⚠️ KRITISCH
- [ ] Kontaktlisten aktuell? ❌ PRÜFEN

## Penetrationstest-Ergebnisse
- Letzter Test: November 2025 ✓ AKTUELL
- Offene Findings: 3 von 12 ⚠️

# Gap-Analyse: ~40% noch zu tun!`,
          skillGain: { security: 5, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'find',
          patternRegex: 'find.*-mtime|find.*-newer',
          output: `Finding files modified in last 30 days...
./netzwerk/ip_liste.xlsx                    (2 days ago)
./zugriffskontrollen/ad_gruppen.pdf         (15 days ago)
./audit_checklist.md                        (today)

Files older than 6 months:
./netzwerk/netzwerkplan_v2.3.vsd            (9 months old!) ⚠️
./incident_response/kontaktliste.xlsx       (14 months old!) ⚠️
./pentests/findings_2024_q4.pdf             (4 months old) ✓

# Mehrere kritische Dokumente sind veraltet!`,
          skillGain: { linux: 3, security: 3 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*netzwerk|cat.*firewall',
          output: `=== Netzwerkplan v2.3 (VERALTET!) ===
Erstellt: 2024-06-15
Status: NICHT MEHR AKTUELL

Änderungen seit letzter Aktualisierung:
- Neue Monitoring-Server installiert (nicht dokumentiert)
- OT-Netz erweitert um PLC03 (nicht dokumentiert)
- VPN-Außenstellen hinzugefügt (nicht dokumentiert)

Fehlende Dokumentation:
- Firewall-Regelwerk (nur in Firewall selbst)
- DMZ-Konfiguration
- OT/IT-Übergänge

# Netzwerkplan muss dringend aktualisiert werden!`,
          skillGain: { netzwerk: 2, security: 3 },
        },
        {
          pattern: 'grep',
          patternRegex: 'grep.*(FEHLT|KRITISCH|VERALTET)',
          output: `audit_checklist.md:- [ ] Firewall-Regeln dokumentiert ❌ FEHLT
audit_checklist.md:- [ ] OT-Zugänge dokumentiert ❌ FEHLT
audit_checklist.md:- [ ] Letzte Übung: nie durchgeführt ⚠️ KRITISCH
audit_checklist.md:- [ ] Aktueller Netzwerkplan (letzte Version: 2024-06-15) ⚠️ VERALTET
audit_checklist.md:- [ ] Kontaktlisten aktuell? ❌ PRÜFEN

# 5 kritische Lücken identifiziert!`,
          skillGain: { security: 4, troubleshooting: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['cat', 'find', 'grep'],
          allRequired: false,
          resultText: 'Gap-Analyse abgeschlossen! Du weißt jetzt genau was fehlt: Netzwerkplan aktualisieren, Firewall-Regeln dokumentieren, OT-Zugänge erfassen, IR-Übung durchführen.',
          skillGain: { security: 6, troubleshooting: 4 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Die audit_checklist.md zeigt was gefordert wird',
        'Tipp: find -mtime zeigt wie alt die Dokumente sind',
        'Tipp: grep nach FEHLT oder KRITISCH zeigt die Lücken',
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
      commands: [
        {
          pattern: 'cat',
          patternRegex: 'cat.*assessment|cat.*status',
          output: `=== NIS2 Compliance Assessment ===
Stand: 14.03.2026
Gesamtstatus: 70% compliant

ARTIKEL 21 - Risikomanagement:
  [x] Risikoanalyse durchgeführt (Score: 85%)
  [x] Maßnahmen dokumentiert
  [ ] Jährliche Überprüfung ❌ (letzte: 18 Monate her!)

ARTIKEL 23 - Incident Reporting:
  [ ] 72h-Meldefrist definiert ❌ KRITISCH!
  [ ] Meldeprozess dokumentiert ❌
  [x] BSI-Kontakt vorhanden

SUPPLY CHAIN SECURITY:
  [ ] Lieferanten-Risikoanalyse ❌ FEHLT!
  [x] Verträge mit Sicherheitsklauseln
  [ ] Regelmäßige Überprüfung ❌

SCHULUNGEN:
  [x] Awareness-Training durchgeführt
  [x] Dokumentiert
  [ ] Management-Training ⚠️ (geplant für Q2)

# 3 kritische Lücken bei Incident Reporting und Supply Chain!`,
          skillGain: { security: 5, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*incident|cat.*melde',
          output: `=== Incident Reporting Prozess ===
Status: NICHT DEFINIERT

NIS2 Anforderungen:
- Erstmeldung an BSI: innerhalb 24h
- Vollständiger Report: innerhalb 72h
- Abschlussbericht: innerhalb 30 Tage

Aktueller Stand:
- Keine dokumentierte Prozesskette
- Keine Vorlagen für BSI-Meldungen
- Keine definierten Verantwortlichkeiten
- Keine Übung durchgeführt

RISIKO: Bei einem Vorfall werdet ihr die 72h-Frist reißen!

# Incident-Reporting-Prozess muss DRINGEND definiert werden!`,
          skillGain: { security: 4, softSkills: 2 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*supplier|cat.*lieferant',
          output: `=== Lieferanten-Risikoanalyse ===
Status: NICHT VORHANDEN

Bekannte kritische Lieferanten:
- Siemens (PLCs, HMI) - Vertrag vorhanden, keine Risikoanalyse
- Microsoft (Windows, M365) - Kein separater Sicherheitsvertrag
- Deutsche Telekom (Internet, VPN) - Standard-AGB
- div. kleinere Dienstleister - nicht erfasst

NIS2 fordert:
- Systematische Identifikation kritischer Lieferanten
- Risikoanalyse pro Lieferant
- Sicherheitsanforderungen in Verträgen
- Regelmäßige Überprüfung

# Lieferanten-Risikoanalyse muss erstellt werden!`,
          skillGain: { security: 4, softSkills: 3 },
          isSolution: true,
        },
        {
          pattern: 'nis2-report',
          patternRegex: 'nis2-report|generate-report',
          output: `Generating NIS2 Compliance Report...

=== NIS2 Compliance Report ===
Date: 14.03.2026
Overall Score: 70%

COMPLIANT (10/14 requirements):
✓ Risikoanalyse durchgeführt
✓ Maßnahmen dokumentiert
✓ BSI-Kontakt vorhanden
✓ Verträge mit Sicherheitsklauseln
✓ Awareness-Training durchgeführt
... (5 weitere)

NON-COMPLIANT (4/14 requirements):
✗ 72h-Incident-Meldefrist - KRITISCH
✗ Incident-Meldeprozess - KRITISCH
✗ Lieferanten-Risikoanalyse - KRITISCH
✗ Jährliche Risikoüberprüfung - HOCH

Empfohlene Maßnahmen:
1. Incident-Reporting-Prozess sofort definieren
2. Lieferanten-Risikoanalyse durchführen
3. Risikoüberprüfung planen

Report saved to: /tmp/nis2_report_2026-03-14.pdf`,
          skillGain: { security: 5 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['cat', 'nis2-report'],
          allRequired: false,
          resultText: 'NIS2-Assessment abgeschlossen! Kritische Lücken: Incident-Reporting (72h-Frist!) und Lieferanten-Risikoanalyse. Du hast einen konkreten Maßnahmenplan.',
          skillGain: { security: 7, softSkills: 4 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Wo steht ihr bei der NIS2-Umsetzung gerade? Verschaff dir erst einen Überblick über den aktuellen Compliance-Status.',
        'Tipp: Die 72h-Meldefrist bei Incidents ist ein häufiger Stolperstein — prüf, ob die eingehalten wird.',
        'Tipp: Konkret: cat assessment.conf zeigt den Status, nis2-report generiert den Compliance-Report.',
      ],
    },
  },

  // ============================================
  // CRISIS MANAGEMENT SCENARIOS
  // ============================================
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
      commands: [
        {
          pattern: 'ups-status',
          patternRegex: 'ups-status|apcaccess',
          output: `=== USV Status ===
Model: APC Smart-UPS 5000
Status: ON BATTERY
Battery Charge: 85%
Runtime Remaining: 28 minutes

Load Distribution:
- SCADA Systems: 2.1 kW (42%)
- Network Equipment: 0.8 kW (16%)
- Non-Critical Systems: 2.1 kW (42%)

WARNING: Generator failed to start!
ERROR: Diesel tank sensor: EMPTY

# 28 Minuten Restlaufzeit! Non-Critical verbraucht 42%!`,
          skillGain: { troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'list-systems',
          patternRegex: 'list-systems|show-priorities',
          output: `=== System Priority List ===
PRIORITY 1 (KRITISCH - niemals abschalten):
  scada-master (10.0.0.1)     - SCADA Control    - 800W
  plc-gateway (10.0.0.254)    - PLC Communication - 200W

PRIORITY 2 (WICHTIG - letzte zum Abschalten):
  hmi-station (192.168.10.50) - Operator Display  - 300W
  historian-db (192.168.10.60) - Prozessdaten     - 500W

PRIORITY 3 (NORMAL - kann heruntergefahren werden):
  file-server (192.168.10.2)   - Dateien          - 400W
  backup-srv (192.168.10.3)    - Backup           - 300W
  dev-server (192.168.10.4)    - Entwicklung      - 400W

PRIORITY 4 (NIEDRIG - sofort abschalten):
  test-server-1..5             - Test/Dev         - 1000W

# Wenn Priority 3+4 aus: +45 Minuten Laufzeit!`,
          skillGain: { troubleshooting: 4, softSkills: 4 },
          isSolution: true,
        },
        {
          pattern: 'shutdown',
          patternRegex: 'shutdown.*priority|shutdown.*batch',
          output: `=== Emergency Shutdown Sequence ===
Shutting down Priority 4 systems...
  test-server-1: shutdown complete
  test-server-2: shutdown complete
  test-server-3: shutdown complete
  test-server-4: shutdown complete
  test-server-5: shutdown complete

Power saved: 1000W
New runtime: 28 min → 52 minutes

Shutting down Priority 3 systems...
  file-server: shutdown complete
  backup-srv: shutdown complete
  dev-server: shutdown complete

Power saved: 1100W
New runtime: 52 min → 98 minutes

# Fast 2 Stunden Laufzeit für SCADA!`,
          skillGain: { softSkills: 5, troubleshooting: 4 },
          isSolution: true,
        },
        {
          pattern: 'call',
          patternRegex: 'call.*energieversorger|notify',
          output: `=== Emergency Notification ===
Calling Stadtwerke Emergency Line...
Connected.

You: "Hier ist die Wasserversorgung. Wir haben Stromausfall,
     Generator ist leer, USV läuft. Dringende Wiederherstellung!"

Stadtwerke: "Wir wissen Bescheid, Trafo-Ausfall in Ihrem Bezirk.
            Geschätzte Wiederherstellung: 45-60 Minuten."

# Strom kommt in 45-60 Minuten wieder!`,
          skillGain: { softSkills: 3 },
        },
        {
          pattern: 'diesel',
          patternRegex: 'diesel|generator|fuel',
          output: `=== Generator Status ===
Model: Caterpillar C15
Status: STANDBY (failed to start)
Error: "Low fuel level - tank sensor shows empty"

Tank Capacity: 500L
Sensor Reading: 2L (0.4%)

Last Refueling: 2025-06-15 (9 months ago!)
Last Test: 2025-12-01 (PASSED - tank was 40% full)

PROBLEM: Diesel wurde nie nachgefüllt!
         Tank ist über 9 Monate leergelaufen/verdunstet?

# Das ist ein Wartungsversagen! Für später dokumentieren.`,
          skillGain: { troubleshooting: 3 },
        },
      ],
      solutions: [
        {
          commands: ['ups-status', 'list-systems', 'shutdown'],
          allRequired: false,
          resultText: 'Exzellentes Krisenmanagement! Du hast die Systeme priorisiert und die USV-Laufzeit fast verdreifacht. SCADA bleibt online bis der Strom wiederkommt.',
          skillGain: { softSkills: 7, troubleshooting: 5 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Stromausfall — wie viel Zeit bleibt dir? Check zuerst Restlaufzeit und Last der USV.',
        'Tipp: Welche Systeme kannst du abschalten, um Strom zu sparen? Die kritischen müssen am längsten durchhalten.',
        'Tipp: Konkret: ups-status zeigt Restlaufzeit und Last, list-systems (oder show-priorities) zeigt die Prioritäten.',
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
      commands: [
        {
          pattern: 'show-alerts',
          patternRegex: 'show-alerts|tail.*alerts',
          output: `=== CRITICAL ALERTS ===
02:15:00 [HIGH] VPN-GW: Successful login - admin.extern (unusual time!)
02:18:00 [CRIT] AD-DC01: NTLM relay attack detected
02:22:00 [CRIT] AD-DC01: New admin account created: "svc_backup"
02:25:00 [HIGH] FS01: Mass file enumeration by svc_backup
02:28:00 [CRIT] FS01: Mimikatz detected! Credential dumping!
02:30:00 [CRIT] FW-IT-OT: Connection attempt from svc_backup to 10.0.0.1
02:30:01 [CRIT] FW-IT-OT: Connection attempt from svc_backup to 10.0.0.254

CURRENT STATUS: ACTIVE ATTACK IN PROGRESS!
ATTACKER POSITION: IT Network, attempting OT access!

# Angreifer versucht gerade ins OT-Netz zu kommen!`,
          skillGain: { security: 5, softSkills: 4 },
          isSolution: true,
        },
        {
          pattern: 'block',
          patternRegex: 'block.*svc_backup|disable.*account',
          output: `=== Emergency Account Disable ===
Disabling account: svc_backup
Status: DISABLED

Checking for active sessions...
Active sessions found: 3
  - FS01: terminated
  - AD-DC01: terminated
  - VPN-GW: terminated

All sessions terminated.
Account locked.

# Angreifer-Konto ist gesperrt!`,
          skillGain: { security: 4, softSkills: 3 },
          isSolution: true,
        },
        {
          pattern: 'isolate',
          patternRegex: 'isolate.*ot|firewall.*block.*it-ot',
          output: `=== IT/OT Network Isolation ===
Activating emergency firewall rules on FW-IT-OT...

Rules applied:
- BLOCK all traffic from IT (192.168.x.x) to OT (10.0.0.x)
- BLOCK all traffic from OT to IT
- ALLOW only: Monitoring server (read-only)
- ALLOW only: Engineering workstation (pre-authorized)

Verification:
  ping from IT to scada-master: BLOCKED ✓
  ping from IT to plc-gateway: BLOCKED ✓

OT NETWORK IS NOW ISOLATED!

# IT/OT-Segmentierung aktiviert! OT ist geschützt.`,
          skillGain: { security: 5, netzwerk: 4, softSkills: 5 },
          isSolution: true,
        },
        {
          pattern: 'check-ot',
          patternRegex: 'check-ot|verify.*scada',
          output: `=== OT Network Status Check ===
Scanning OT network (10.0.0.0/24)...

scada-master (10.0.0.1): ONLINE - No anomalies detected ✓
plc-gateway (10.0.0.254): ONLINE - No anomalies detected ✓
PLC01 (10.0.0.10): ONLINE - Normal operation ✓
PLC02 (10.0.0.11): ONLINE - Normal operation ✓
PLC03 (10.0.0.12): ONLINE - Normal operation ✓
hmi-station (10.0.0.100): ONLINE - Normal operation ✓

Last IT→OT connection attempt: 02:30:01 (BLOCKED)
Successful IT→OT connections since 02:00: 0

# OT-Netz ist sicher! Keine Kompromittierung!`,
          skillGain: { security: 3, troubleshooting: 2 },
        },
        {
          pattern: 'timeline',
          patternRegex: 'timeline|attack-path',
          output: `=== Attack Timeline Reconstruction ===

02:15:00 - Initial Access
  VPN-Gateway: Login with admin.extern credentials
  Source IP: 185.243.xxx.xxx (VPN, Ukraine)
  Note: Credentials likely phished or leaked

02:18:00 - Privilege Escalation
  NTLM Relay attack on AD-DC01
  Gained Domain Admin privileges

02:22:00 - Persistence
  Created new admin account: svc_backup
  Added to Domain Admins group

02:25:00 - Discovery
  Enumerated file shares on FS01
  Downloaded: network_documentation.pdf, credentials.xlsx

02:28:00 - Credential Harvesting
  Executed Mimikatz on FS01
  Dumped cached credentials

02:30:00 - Lateral Movement Attempt (BLOCKED)
  Attempted access to OT network
  Firewall blocked connection

# Angriff kam über VPN mit gestohlenen Credentials!`,
          skillGain: { security: 5, softSkills: 4 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['show-alerts', 'isolate', 'block'],
          allRequired: false,
          resultText: 'Exzellente Incident Response! Du hast den Angreifer identifiziert, das OT-Netz isoliert, und die kompromittierten Konten gesperrt. Zeit für forensische Analyse und BSI-Meldung.',
          skillGain: { security: 7, softSkills: 7, netzwerk: 4 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Verschaff dir erst ein Lagebild — welche verdächtige Aktivität läuft gerade? Wirf einen Blick in die aktuellen Alerts.',
        'Tipp: Das OT-Netz muss isoliert werden! Nutz die IT/OT-Firewall, um die Ausbreitung zu stoppen — und sperr die kompromittierten Konten.',
        'Tipp: Konkret bekommst du die Aktivität mit show-alerts oder tail -f alerts.log angezeigt.',
      ],
    },
  },

  // ============================================
  // ADDITIONAL TROUBLESHOOTING SCENARIOS
  // ============================================
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
