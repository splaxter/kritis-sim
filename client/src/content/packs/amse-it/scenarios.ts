// AMSE IT Solutions GmbH - Scenarios with Terminal Challenges
import { Scenario } from '@kritis/shared';

export const amseScenarios: Scenario[] = [
  {
    id: 'AMSE-SC-001',
    title: 'Die Firewall-Regel die nicht existiert',
    category: 'vendor_management',
    difficulty: 2,
    flavorText: 'Du richtest einen neuen Dienst ein der Port 8443 von intern nach extern braucht. Du fragst Marco bei AMSE, ob er die Firewall-Regel anlegen kann. Marco antwortet nach 2 Stunden: \'Ist erledigt, Regel ist drin.\' Du testest — Port ist immer noch zu.\n\n📍 System: Dein Admin-PC (WARM-PC-ADMIN)\n🎯 Aufgabe: Teste die Verbindung zu "ziel-server.warm.local" auf Port 8443',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Marco zurückschreiben: \'Funktioniert nicht, Port ist noch zu\'',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Marco: \'Das kann nicht sein, ich hab die Regel angelegt. Vielleicht liegt es an eurem internen Routing?\' Du verbringst 45 Minuten mit internem Troubleshooting. Alles ok auf deiner Seite. Du schreibst Marco nochmal. Er meldet sich morgen.',
        scoreChange: 0,
        reputationChange: 0,
        lesson: 'Bei externen Dienstleistern reicht \'funktioniert nicht\' oft nicht. Du brauchst Beweise.',
      },
      {
        id: 'B',
        text: 'Selbst testen und Beweise sammeln (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Du hast handfeste Beweise: Port 8443 ist zu, aber Port 443 geht. Du schickst Marco den Screenshot: \'Test-Connection zeigt: Port 8443 blocked. Bitte Regel prüfen.\' Marco: \'...ah, ich hab 443 statt 8443 eingetragen. Sorry.\'',
        scoreChange: 100,
        reputationChange: 15,
        lesson: 'IMMER selbst verifizieren mit Test-NetConnection oder telnet. Konkrete Testergebnisse sind unwiderlegbar.',
      },
      {
        id: 'C',
        text: 'Auf Marcos Wort vertrauen und intern weiter suchen',
        outcome: 'FAIL',
        consequence: 'Du verbringst 3 Stunden mit Routing-Checks, DNS-Diagnose, und Windows-Firewall-Prüfung. Alles ok. Am Ende testest du den Port selbst: zu. Marco hatte sich vertippt. 3 Stunden verloren.',
        scoreChange: -75,
        reputationChange: -5,
        lesson: 'Wenn der Dienstleister sagt \'bei uns ist alles ok\', ist das eine Behauptung, kein Beweis. Prüfe immer selbst bevor du intern suchst.',
      },
    ],
    realWorldReference: 'Managed Security Service Provider (MSSPs) betreuen oft 20+ Kunden gleichzeitig. Tippfehler bei Portnummern sind häufig.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.1 Outsourcing',
    involvedNpcs: ['AMSE-MARCO'],
    tags: ['firewall', 'sophos', 'vendor', 'verify'],
    terminalContext: {
      type: 'windows',
      hostname: 'WARM-PC-ADMIN',
      username: 'admin.mueller',
      currentPath: 'C:\\Users\\admin.mueller',
      // Das Level ist ein Beweis, kein Rätsel — und deshalb muss die Messung
      // wirklich eine sein. Sie war es nicht: Der Portest hatte eine kleine
      // feste Tabelle und würfelte für alles andere. Jetzt entscheidet das
      // Netzbild des Levels, zweimal dieselbe Frage gibt zweimal dieselbe
      // Antwort, und genau das ist das Argument gegenüber Marco.
      taskText:
        'Marco sagt, die Regel sei drin. Miss nach: Test-NetConnection auf ziel-server.warm.local, einmal auf Port 8443 (den du brauchst) und einmal auf 443 (zum Vergleich).\n\nDann den Nachweis nach C:\\Users\\admin.mueller\\nachweis.txt schreiben — echo "…" > datei für die erste Zeile, echo "…" >> datei für jede weitere. Genau diese drei Zeilen:\nadresse: <RemoteAddress aus der Messung>\nport8443: offen | zu\nport443: offen | zu',
      net: {
        records: { 'ziel-server.warm.local': '10.10.5.100' },
        targets: [
          // Marco hat sich vertippt: 443 statt 8443. Der Unterschied ist
          // nirgends dokumentiert — er ist nur messbar.
          { host: 'ziel-server.warm.local', ip: '10.10.5.100', openPorts: [443] },
        ],
      },
      commandSkillGain: {
        'Test-NetConnection': { netzwerk: 3, troubleshooting: 2 },
        'Get-Content': { windows: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Der Kern: Die Aussage über 8443 muss GEMESSEN sein. Ein
            // Nachweis, den man auch ohne Messung hätte schreiben können, ist
            // genau das, was Marco geliefert hat.
            { commandRan: { pattern: 'Test-NetConnection.*8443|tnc.*8443', ignoreCase: true } },
            {
              file: 'C:\\Users\\admin.mueller\\nachweis.txt',
              reportFields: [
                // Die Adresse steht in keiner Datei — sie kommt aus der
                // Antwort des Ziels.
                { key: 'adresse', matches: '^10\\.10\\.5\\.100$' },
                { key: 'port8443', matches: '^zu$' },
                { key: 'port443', matches: '^offen$' },
              ],
            },
          ],
          resultText:
            'Das ist der Unterschied zwischen „funktioniert nicht" und einem Nachweis. Zwei Messungen, eine Minute, und die Aussage ist nicht mehr bestreitbar: 8443 zu, 443 offen, dasselbe Ziel, dieselbe Leitung, dieselbe Sekunde. Der Vergleichswert ist dabei das Entscheidende — ohne ihn hätte Marco „dann liegt es an eurem Routing" antworten können, und die Antwort wäre nicht zu widerlegen gewesen.\n\nMit der Messung ist die Sache in zwei Sätzen erledigt: Ein Port, der antwortet, und ein Port, der es nicht tut, unterscheiden sich nicht im Netz dazwischen. Marco hat 443 eingetragen.\n\nMerksatz für den Rest der Zusammenarbeit: „Ist erledigt" ist eine Behauptung. Sie kostet dich nichts, wenn du sie prüfst — und drei Stunden, wenn du ihr glaubst und intern zu suchen anfängst.',
          skillGain: { troubleshooting: 5, netzwerk: 4 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: Marcos „ist erledigt" ist eine Behauptung. Bevor du intern anfängst zu suchen, prüf sie — es gibt ein Werkzeug, das genau einen TCP-Port testet, nicht nur die Erreichbarkeit.',
        '🤖 Jens: Miss zweimal: den Port, um den es geht, und einen, von dem du weißt, dass er gehen muss. Erst der Vergleich macht aus der Messung ein Argument — sonst heißt es „dann liegt es an eurem Netz".',
        '🤖 Jens: In der Antwort steht auch die Adresse, die hinter dem Namen steckt. Die gehört in den Nachweis, damit klar ist, welche Kiste gemeint war.',
        '🤖 Jens: Konkret: `Test-NetConnection ziel-server.warm.local -Port 8443` → `Test-NetConnection ziel-server.warm.local -Port 443` → `echo "adresse: 10.10.5.100" > C:\\Users\\admin.mueller\\nachweis.txt` → `echo "port8443: zu" >> C:\\Users\\admin.mueller\\nachweis.txt` → `echo "port443: offen" >> C:\\Users\\admin.mueller\\nachweis.txt`.',
      ],
    },
  },
  {
    id: 'AMSE-SC-002',
    title: 'VPN funktioniert nicht — \'Liegt nicht an der Firewall\'',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: '5 Mitarbeiter im Homeoffice melden: VPN trennt sich alle 30 Minuten und reconnected. Du fragst Marco. Antwort: \'VPN-Konfiguration ist korrekt, das liegt am Provider der Mitarbeiter oder an deren Heimnetzwerken.\'\n\n📍 System: Log-Server (warm-log-srv) unter /var/log\n🎯 Aufgabe: Analysiere die VPN/IPsec-Logs um die Ursache zu finden',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Marcos Aussage akzeptieren und die 5 Mitarbeiter bitten, ihren Heim-Router zu prüfen',
        outcome: 'FAIL',
        consequence: 'Die Mitarbeiter rufen ihre Provider an, die sagen \'bei uns ist alles ok\'. 5 verschiedene Provider, 5 verschiedene Router, alle das gleiche Problem. Nach 2 Tagen findest du es selbst raus: VPN-Timeout steht auf 1800 Sekunden.',
        scoreChange: -100,
        reputationChange: -10,
        lesson: 'Wenn alle das gleiche Problem haben, liegt es nicht am Einzelnen. Das ist ein Server-/Config-Problem.',
      },
      {
        id: 'B',
        text: 'Selbst die Logs analysieren (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Die Logs zeigen es glasklar: Phase 2 lifetime expired alle 1800 Sekunden. Du schickst Marco den Log-Auszug. Marco: \'...ich passe den Timeout an.\' Problem gelöst in 10 Minuten statt 2 Tagen.',
        scoreChange: 150,
        reputationChange: 20,
        lesson: 'Logs sind Beweise. Mit konkreten Logeinträgen und Timestamps kann der Dienstleister nicht mehr sagen \'liegt nicht an uns\'.',
      },
      {
        id: 'C',
        text: 'Marco bitten, sich per Fernwartung bei einem betroffenen Mitarbeiter aufzuschalten',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Marco schaltet sich auf, wartet 30 Minuten, sieht den Disconnect live. Er prüft JETZT erst die Config und findet den Timeout. Problem gelöst — aber es hat einen Tag gedauert.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Den Dienstleister dazu bringen, das Problem live zu sehen, kann helfen — aber eigene Log-Analyse ist schneller.',
      },
    ],
    realWorldReference: 'IPsec-VPN-Timeouts sind eine der häufigsten Ursachen für VPN-Disconnects. Default-Werte passen selten zur produktiven Nutzung.',
    bsiReference: 'BSI IT-Grundschutz: NET.3.3 VPN',
    involvedNpcs: ['AMSE-MARCO'],
    tags: ['vpn', 'ipsec', 'logs', 'troubleshooting'],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-log-srv',
      username: 'admin',
      currentPath: '/var/log',
      // Der Log-Server ist ein Log-Server: Reparieren kann der Spieler hier
      // nichts, die Firewall gehört AMSE. Was er kann, ist den Beleg bauen,
      // gegen den „liegt am Provider der Mitarbeiter" nicht mehr steht. Die
      // Falle ist eine zweite Zahl, die richtig aussieht.
      taskText:
        'Zwei Quellen lesen: /var/log/vpn/ipsec.log (wann bricht es ab) und /var/log/vpn/ipsec.conf.export (was ist eingestellt). Die Ausfuhr der Konfiguration liegt hier, weil sie fürs Audit jede Nacht gezogen wird.\n\nBeleg nach /home/admin/beleg.md schreiben — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese drei Zeilen:\nintervall: <Abstand der Abbrüche in Minuten, nur die Zahl>\nursache: leitung | lifetime | dpd | unklar\nwert: <der eingestellte Wert in Sekunden, nur die Zahl>\n\nIn der Konfiguration stehen mehrere Zeitwerte. Gefragt ist der, der zum gemessenen Abstand passt.',
      vfsOverlay: {
        directories: ['/var/log/vpn', '/home/admin'],
        files: [
          {
            path: '/var/log/vpn/ipsec.log',
            content:
              'Mar 14 08:00:01 fw01 pluto[1234]: "homeoffice" #4521: IPsec SA established\n' +
              'Mar 14 08:14:52 fw01 pluto[1234]: "homeoffice" #4521: DPD: peer responded\n' +
              'Mar 14 08:30:01 fw01 pluto[1234]: "homeoffice" #4521: Phase 2 lifetime expired\n' +
              'Mar 14 08:30:01 fw01 pluto[1234]: "homeoffice" #4521: deleting connection\n' +
              'Mar 14 08:30:02 fw01 pluto[1234]: "homeoffice" #4522: initiating Quick Mode\n' +
              'Mar 14 08:30:03 fw01 pluto[1234]: "homeoffice" #4522: IPsec SA established\n' +
              'Mar 14 08:47:11 fw01 pluto[1234]: "homeoffice" #4522: DPD: peer responded\n' +
              'Mar 14 09:00:03 fw01 pluto[1234]: "homeoffice" #4522: Phase 2 lifetime expired\n' +
              'Mar 14 09:00:03 fw01 pluto[1234]: "homeoffice" #4522: deleting connection\n' +
              'Mar 14 09:00:04 fw01 pluto[1234]: "homeoffice" #4523: initiating Quick Mode\n' +
              'Mar 14 09:00:05 fw01 pluto[1234]: "homeoffice" #4523: IPsec SA established\n' +
              'Mar 14 09:30:05 fw01 pluto[1234]: "homeoffice" #4523: Phase 2 lifetime expired\n' +
              'Mar 14 09:30:05 fw01 pluto[1234]: "homeoffice" #4523: deleting connection\n' +
              '\n' +
              '# Zur Einordnung: „DPD: peer responded" heißt, die Gegenstelle war\n' +
              '# erreichbar. Eine Leitung, die wegbricht, sähe anders aus — dann\n' +
              '# stünde hier „DPD: no response" und kein sauberes Neuaufbauen\n' +
              '# eine Sekunde später.\n',
          },
          {
            path: '/var/log/vpn/ipsec.conf.export',
            content:
              '# Ausfuhr der Tunnelkonfiguration, automatisch erzeugt 03:00\n' +
              'conn homeoffice\n' +
              '    keyexchange=ikev2\n' +
              '    ike=aes256-sha256-modp2048\n' +
              '    esp=aes256-sha256\n' +
              '    ikelifetime=86400s\n' +
              '    lifetime=1800s\n' +
              '    dpddelay=30s\n' +
              '    dpdtimeout=120s\n' +
              '    dpdaction=restart\n' +
              '\n' +
              '# Zu den Zeitwerten: ikelifetime gilt für die Aushandlung (Phase 1)\n' +
              '# und liegt hier bei 24 Stunden. lifetime gilt für den Datentunnel\n' +
              '# selbst (Phase 2). Läuft der ab, wird neu ausgehandelt — und die\n' +
              '# Sitzungen darüber reißen ab.\n',
          },
        ],
      },
      commandSkillGain: {
        cat: { linux: 1 },
        grep: { linux: 2, troubleshooting: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            { fileRead: '/var/log/vpn/ipsec.log' },
            { fileRead: '/var/log/vpn/ipsec.conf.export' },
            {
              file: '/home/admin/beleg.md',
              reportFields: [
                { key: 'intervall', matches: '^30$' },
                { key: 'ursache', matches: '^lifetime$' },
                // 86400 ist die Zahl, die man nimmt, wenn man die erste
                // Zeitangabe abschreibt statt die passende zu suchen.
                { key: 'wert', matches: '^1800$' },
              ],
            },
          ],
          resultText:
            'Damit ist die Diskussion vorbei. Die Abbrüche liegen exakt 30 Minuten auseinander — 08:30, 09:00, 09:30. Etwas, das auf die Sekunde regelmäßig passiert, ist kein Provider und kein Heimnetz; es ist ein Timer. Und der Timer steht in der Konfiguration: lifetime=1800s, also genau 30 Minuten.\n\nDie Zeile darüber ist die Falle: ikelifetime=86400s sieht nach demselben aus und ist es nicht. Sie gilt für die Aushandlung, nicht für den Datentunnel. Wer sie abschreibt, liefert Marco eine Zahl, die nicht zur Messung passt — und bekommt die Zuständigkeit zurückgeschoben.\n\nDer eigentliche Beleg ist aber die Zeile „DPD: peer responded" dazwischen: Die Gegenstelle war die ganze Zeit erreichbar. Eine wegbrechende Leitung sähe anders aus. Das Protokoll widerlegt Marcos Vermutung, bevor er sie äußert.',
          skillGain: { troubleshooting: 5, security: 3, linux: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: „Alle 30 Minuten" ist eine Behauptung der Nutzer. Schau erst nach, ob sie stimmt — im Protokoll stehen die Zeitpunkte der Abbrüche untereinander.',
        '🤖 Jens: Etwas, das auf die Sekunde regelmäßig passiert, ist kein Provider. Suche nach einem Wert in der Konfiguration, der zu deinem gemessenen Abstand passt.',
        '🤖 Jens: Achtung, es gibt mehrere Zeitwerte. Einer gilt für die Aushandlung, einer für den Tunnel selbst — in der Datei steht darunter, welcher was ist. Und lies auch die DPD-Zeilen im Protokoll: Die sagen dir, ob die Gegenstelle überhaupt weg war.',
        '🤖 Jens: Konkret: `cat /var/log/vpn/ipsec.log` → `cat /var/log/vpn/ipsec.conf.export` → `echo "intervall: 30" > /home/admin/beleg.md` → `echo "ursache: lifetime" >> /home/admin/beleg.md` → `echo "wert: 1800" >> /home/admin/beleg.md`.',
      ],
    },
  },
  {
    id: 'AMSE-SC-003',
    title: 'Freitag 16:47 — \'Wir spielen kurz ein Update ein\'',
    category: 'vendor_management',
    difficulty: 4,
    flavorText: 'Freitag, 16:47 Uhr. Du willst gerade gehen. Mail von Marco: \'Hi, wir spielen heute Abend das Sophos-Firmware-Update ein. Sollte ca. 15 Min Downtime geben. Gruß, Marco.\' Keine Abstimmung, kein Change-Request, kein Wartungsfenster vereinbart.',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Sofort Marco anrufen: \'STOPP — kein Update ohne Change-Request und genehmigtes Wartungsfenster\'',
        outcome: 'PERFECT',
        consequence: 'Du erreichst Marco gerade noch. Er ist genervt: \'Ist doch nur ein Minor-Update.\' Du erklärst: KRITIS-Betreiber brauchen dokumentierte Change-Prozesse. Ihr vereinbart ein Wartungsfenster für nächsten Dienstag 22 Uhr.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Änderungen an KRITIS-Infrastruktur brauchen IMMER: Change-Request, Genehmigung, Wartungsfenster, Rollback-Plan. Freitag 17 Uhr ist der schlechteste Zeitpunkt.',
      },
      {
        id: 'B',
        text: 'OK sagen aber dabei bleiben und das Update überwachen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Du bleibst bis 19 Uhr. Das Update läuft durch — mit 45 Minuten Downtime statt 15. Dabei fällt auch die VoIP-Telefonie aus, was Marco \'vergessen\' hatte zu erwähnen.',
        scoreChange: 25,
        reputationChange: 5,
        lesson: 'Dabei bleiben ist besser als blind vertrauen, aber ohne Change-Prozess gibt es keine Dokumentation und kein Rollback-Konzept.',
      },
      {
        id: 'C',
        text: 'Die Mail erst Montag lesen — ist ja schon Feierabend',
        outcome: 'CRITICAL_FAIL',
        consequence: 'Marco spielt das Update Freitagabend ein. VPN-Config wird zurückgesetzt. Samstag: Leitstelle offline, Müllabfuhr fährt ohne Disposition. Montag hast du viel zu erklären.',
        scoreChange: -300,
        reputationChange: -25,
        lesson: 'E-Mails von Dienstleistern am Freitagnachmittag mit dem Wort \'Update\' SOFORT lesen. Freitag + Update + keine Abstimmung = Desaster.',
        triggersEvent: 'WEEKEND_OUTAGE',
      },
      {
        id: 'D',
        text: 'Antworten: \'Bitte erst nach Rücksprache. Und: Warum Freitag Abend?\'',
        outcome: 'SUCCESS',
        consequence: 'Marco: \'Weil ich heute Abend sowieso noch bei einem anderen Kunden Updates mache.\' BINGO — er wollte dein Update zwischen zwei andere Kunden quetschen. Du bestehst auf separatem Termin.',
        scoreChange: 100,
        reputationChange: 15,
        lesson: 'Dienstleister konsolidieren gerne Wartungsarbeiten. Das spart IHNEN Zeit, erhöht aber DEIN Risiko.',
      },
    ],
    realWorldReference: 'Freitag-Deployments sind laut DevOps-Statistiken 3x häufiger fehlerursächlich als Dienstag-Deployments.',
    bsiReference: 'BSI IT-Grundschutz: OPS.1.1.3 Patch- und Änderungsmanagement',
    involvedNpcs: ['AMSE-MARCO'],
    tags: ['change-management', 'update', 'kritis', 'friday'],
  },
  {
    id: 'AMSE-SC-004',
    title: 'Die kopierte Firewall-Regel vom anderen Kunden',
    category: 'security_incident',
    difficulty: 4,
    flavorText: 'Du prüfst routinemäßig die Firewall-Regeln und findest eine Regel die dir nicht bekannt vorkommt: \'Allow ANY → ANY von IP 10.42.0.0/16\'. Euer Netzwerk ist 10.10.0.0/16. Das 10.42er Netz gehört euch nicht.\n\n📍 System: Firewall-Management (warm-fw-mgmt)\n🎯 Aufgabe: Prüfe die Firewall-Regeln und finde heraus wem das 10.42.0.0/16 Netz gehört',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Erst mal prüfen was 10.42.0.0/16 ist (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'Die Regel existiert wirklich und ist aktiv. Whois zeigt: 10.42.0.0/16 ist einem anderen Unternehmen zugeordnet. Marco hat Copy-Paste-Fehler gemacht. Du hast jetzt Beweise für das Gespräch mit AMSE.',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Regelmäßige Firewall-Audits sind Pflicht. Jede Regel muss einem dokumentierten Zweck zugeordnet sein. Unbekannte Regeln = Sicherheitsrisiko.',
        followupEvent: 'AMSE_CONFIG_AUDIT',
      },
      {
        id: 'B',
        text: 'Marco sofort konfrontieren ohne weitere Prüfung',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Marco wird defensiv: \'Das war bestimmt für einen Test und ist inaktiv.\' Du hast keine Beweise. Marco verspricht zu prüfen, meldet sich aber tagelang nicht.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Ohne eigene Beweise ist man dem Dienstleister ausgeliefert. Erst dokumentieren, dann konfrontieren.',
      },
      {
        id: 'C',
        text: 'Ignorieren — die Regel tut wahrscheinlich nichts',
        outcome: 'CRITICAL_FAIL',
        consequence: '3 Monate später: AMSE richtet ein Site-to-Site-VPN ein — mit dem 10.42er Netz. Durch die Regel kann der andere Kunde auf euer Netz zugreifen. Datenleck.',
        scoreChange: -400,
        reputationChange: -30,
        lesson: 'Unbekannte Firewall-Regeln sind NIEMALS harmlos. Heute wirkungslos, morgen ein Einfallstor.',
        triggersEvent: 'CROSS_CUSTOMER_BREACH',
      },
    ],
    realWorldReference: 'MSSP-Konfigurationsfehler durch Copy-Paste zwischen Kunden sind ein reales Problem. Der Kaseya-Angriff 2021 nutzte genau solche Vertrauensstellungen.',
    bsiReference: 'BSI IT-Grundschutz: NET.3.2 Firewall, OPS.2.1 Outsourcing',
    involvedNpcs: ['AMSE-MARCO'],
    tags: ['security', 'firewall', 'cross-customer', 'audit'],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-fw-mgmt',
      username: 'admin',
      currentPath: '/etc/firewall',
      // Die Regel ist echt, und sie wirkt. Deshalb entscheidet hier ein
      // Paketlauf und keine Textsuche: Wer sie entfernt, sieht die Wirkung;
      // wer sie mit `flush` gleich mit dem ganzen Regelwerk entsorgt, hat die
      // Kiste offen und merkt es an derselben Bedingung.
      taskText:
        'In der Eingangskette steht eine Regel, die ein Netz durchlässt, das nicht zu WARM gehört. Finde heraus, wem 10.42.0.0/16 gehört (/etc/firewall/netzverzeichnis.txt) und wer die Regel angelegt hat (/etc/firewall/aenderungen.log), und nimm dem fremden Netz den Zugang.\n\nWas WARM selbst braucht, muss weiter funktionieren: das eigene Netz 10.10.0.0/16 auf 443 und 8443 und der Zugang zur Verwaltung auf 22.',
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
              'ip saddr 10.10.0.0/16 tcp dport 443 accept',
              'ip saddr 10.10.0.0/16 tcp dport 8443 accept',
              // Der Fremdkörper: kein Port, kein Ziel, keine Begründung.
              'ip saddr 10.42.0.0/16 accept',
              'ip saddr 10.10.0.0/16 tcp dport 22 accept',
            ],
          },
        ],
      },
      vfsOverlay: {
        directories: ['/etc/firewall'],
        files: [
          {
            path: '/etc/firewall/netzverzeichnis.txt',
            content:
              '# Netzverzeichnis — gepflegt vom Netzbetrieb WARM\n' +
              '# bereich            inhaber                          anmerkung\n' +
              '10.10.0.0/16         WARM Abfallwirtschaft            eigenes Netz\n' +
              '10.10.100.0/24       WARM Abfallwirtschaft            entmilitarisierte Zone\n' +
              '10.42.0.0/16         Stadtwerke Nachbarstadt GmbH     FREMD — kein Vertrag, keine Kopplung\n' +
              '203.0.113.0/24       Telekom Business                 unser Anschluss\n' +
              '\n' +
              '# Zum Eintrag 10.42.0.0/16: Die Stadtwerke Nachbarstadt werden vom\n' +
              '# selben Dienstleister betreut wie wir. Zwischen den beiden Häusern\n' +
              '# gibt es keine Verbindung, keinen Vertrag und keinen Grund für\n' +
              '# einen Durchlass.\n',
          },
          {
            path: '/etc/firewall/aenderungen.log',
            content:
              '# Änderungsprotokoll Perimeter — warm-fw-mgmt\n' +
              '2024-01-15 09:12  admin        Regeln 443 und 22 für 10.10.0.0/16 angelegt\n' +
              '2024-02-20 16:41  admin_amse   Regel für 10.42.0.0/16 angelegt (ohne Ticket)\n' +
              '2024-03-01 11:05  admin        Regel 8443 für 10.10.0.0/16 angelegt (Ticket 2281)\n' +
              '\n' +
              '# Zur Änderung vom 20.02.: Kein Ticket, keine Begründung, kein Port.\n' +
              '# Der Zeitstempel liegt in der Nacht einer Wartung beim Nachbarhaus.\n',
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
            // Wem das Netz gehört, steht nur in einer Datei. Ohne sie ist das
            // Entfernen einer produktiven Regel ein Bauchgefühl.
            { fileRead: '/etc/firewall/netzverzeichnis.txt' },
            // Die Aufgabe: Das fremde Netz kommt nicht mehr herein — und zwar
            // nirgends, nicht nur auf einem Port.
            { nftVerdict: { from: '10.42.0.7', port: 22, expect: 'drop' } },
            { nftVerdict: { from: '10.42.0.7', port: 443, expect: 'drop' } },
            // Bewahrend: das eigene Haus arbeitet weiter.
            { nftVerdict: { from: '10.10.5.20', port: 443, expect: 'accept' } },
            { nftVerdict: { from: '10.10.5.20', port: 8443, expect: 'accept' } },
            { nftVerdict: { from: '10.10.0.50', port: 22, expect: 'accept' } },
          ],
          resultText:
            'Weg damit — und der Rest steht noch. Das ist der Teil, der beim Aufräumen unter Ärger gern verloren geht: Eine Regel zu entfernen ist leicht, dabei nicht versehentlich den eigenen Zugang mitzunehmen, ist die eigentliche Arbeit.\n\nWas hier passiert ist, ist keine Bosheit und auch kein Angriff. Der Dienstleister betreut beide Häuser, und in einer Wartungsnacht hat jemand eine Regel in die falsche Konfiguration kopiert. Genau deshalb steht im Änderungsprotokoll kein Ticket und keine Begründung — es war keine Entscheidung, es war ein Handgriff.\n\nUnd genau deshalb ist es ernst. Eine Regel ohne Port, ohne Ziel und ohne Vorgang lässt ein fremdes Haus vollständig herein. Wäre dort etwas passiert, hätte es hier weitergehen können, und niemand hätte den Weg erklärt. Das Gespräch mit AMSE führt man nicht über diese eine Regel, sondern über die Frage, wer Konfigurationen zwischen Kunden kopiert und was das Vier-Augen-Prinzip dort bedeutet.',
          skillGain: { security: 5, netzwerk: 4, troubleshooting: 2 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Erst nachsehen, wem das Netz gehört — das Netzverzeichnis des Netzbetriebs liegt neben der Konfiguration. Eine produktive Regel entfernt man nicht auf Verdacht.',
        '🤖 Jens: Und im Änderungsprotokoll steht, wer sie angelegt hat und mit welcher Begründung. Die fehlende Begründung ist hier die Information.',
        '🤖 Jens: Zum Entfernen brauchst du den Handle der Regel — den zeigt der Regelsatz mit -a. Vorsicht beim Aufräumen: Der eigene ssh-Zugang steht in derselben Kette.',
        '🤖 Jens: Konkret: `cat /etc/firewall/netzverzeichnis.txt` → `cat /etc/firewall/aenderungen.log` → `sudo nft -a list ruleset` → `sudo nft delete rule inet filter input handle 7`.',
      ],
    },
  },
  {
    id: 'AMSE-SC-005',
    title: 'SLA-Realitätscheck — Der \'kritische\' Ausfall',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: 'Montagmorgen, 8:02 Uhr. Die Internet-Verbindung ist komplett weg. 120 Mitarbeiter betroffen. Marco nach 25 Minuten Warteschleife: \'Ach, bei euch auch? Ich hab hier 3 andere Kunden mit dem gleichen Problem.\'\n\n📍 System: Dein Admin-PC (WARM-PC-ADMIN)\n🎯 Aufgabe: Diagnostiziere ob es ein Leitungs- oder DNS-Problem ist',
    urgency: 'critical',
    choices: [
      {
        id: 'A',
        text: 'Marco drängen: \'Wir sind KRITIS, wir haben Priorität laut SLA!\'',
        outcome: 'SUCCESS',
        consequence: 'Marco priorisiert dich — nach 2 Stunden. Ursache: AMSE hat am Wochenende ein DNS-Update ausgerollt. Dein Internet war nie \'weg\' — nur DNS funktionierte nicht.',
        scoreChange: 50,
        reputationChange: 10,
        lesson: 'SLA-Eskalation funktioniert, aber ist reaktiv. Eigene Diagnose wäre schneller gewesen.',
      },
      {
        id: 'B',
        text: 'Selbst diagnostizieren: Leitung oder DNS? (Terminal)',
        outcome: 'PERFECT',
        terminalCommand: true,
        consequence: 'In 2 Minuten hast du es: Ping auf IP geht, Ping auf Hostname nicht. DNS! Du setzt temporär 1.1.1.1 als DNS — läuft. Dann rufst du Marco an: \'Euer DNS ist kaputt, wir laufen auf Fallback.\'',
        scoreChange: 250,
        reputationChange: 25,
        lesson: 'Ping IP vs. Ping Hostname unterscheidet sofort zwischen Leitungsproblem und DNS-Problem. Eigene DNS-Fallback-Config macht unabhängig.',
      },
      {
        id: 'C',
        text: 'Warten bis AMSE das Problem löst — dafür bezahlen wir sie ja',
        outcome: 'FAIL',
        consequence: '4 Stunden später ist DNS wieder da. 4 Stunden kein Internet für 120 Mitarbeiter. Für ein Problem, das du in 5 Minuten hättest umgehen können.',
        scoreChange: -200,
        reputationChange: -15,
        lesson: '100% Abhängigkeit vom Dienstleister ist ein Risiko. Basis-Problemlösung muss intern möglich sein.',
      },
    ],
    realWorldReference: 'DNS ist die häufigste Ursache für \'Internet geht nicht\' — laut Cloudflare verursachen DNS-Probleme 30% aller Internet-Ausfälle.',
    bsiReference: 'BSI IT-Grundschutz: NET.1.2 Netzmanagement, APP.3.6 DNS-Server',
    involvedNpcs: ['AMSE-MARCO', 'AMSE-STEFAN'],
    tags: ['dns', 'outage', 'sla', 'troubleshooting'],
    terminalContext: {
      type: 'windows',
      hostname: 'WARM-PC-ADMIN',
      username: 'admin.mueller',
      currentPath: 'C:\\Users\\admin.mueller',
      // „Internet geht nicht" ist die Diagnose der Anwender. Hier wird sie
      // zerlegt: Die Leitung steht, die Namen sind weg. Beides ist wirklich
      // messbar, und die Umgehung wirkt wirklich — danach löst derselbe
      // Befehl auf, der eben noch in den Timeout lief.
      taskText:
        'Prüf getrennt, was die Anwender zusammengeworfen haben: die Leitung (eine Adresse) und die Namensauflösung (ein Name). Schau dir außerdem an, welche Namensserver dieser Rechner befragt.\n\nDann bau die Umgehung: Trag 1.1.1.1 als Namensserver ein (Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses 1.1.1.1) und prüf nach, dass es wieder auflöst.\n\nZum Schluss der Befund nach C:\\Users\\admin.mueller\\befund.txt — echo "…" > datei für die erste Zeile, echo "…" >> datei für jede weitere. Genau diese drei Zeilen:\nleitung: ok | tot\ndns: <Adresse des Namensservers, der nicht antwortet>\nursache: leitung | namensdienst | stromausfall | unklar',
      net: {
        // Beide AMSE-Resolver schweigen. Die Leitung selbst ist in Ordnung —
        // das ist der ganze Punkt.
        dnsServers: ['10.10.1.10', '10.10.1.11'],
        dnsDown: ['10.10.1.10', '10.10.1.11'],
        records: {
          'google.de': '142.250.185.78',
          'www.telekom.de': '80.149.68.20',
        },
        targets: [
          { host: '8.8.8.8', openPorts: [53] },
          { host: '1.1.1.1', openPorts: [53] },
          { host: '142.250.185.78', openPorts: [80, 443] },
          { host: '80.149.68.20', openPorts: [443] },
          { host: '10.10.1.10', ping: true, openPorts: [] },
        ],
      },
      commandSkillGain: {
        'Test-NetConnection': { netzwerk: 2 },
        'Test-Connection': { netzwerk: 2 },
        'Resolve-DnsName': { netzwerk: 3, troubleshooting: 2 },
        'Get-DnsClientServerAddress': { netzwerk: 2 },
        'Set-DnsClientServerAddress': { netzwerk: 3, troubleshooting: 2 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Die Umgehung steht wirklich — nicht nur als Satz im Bericht.
            { dnsServers: { contains: '1.1.1.1' } },
            {
              file: 'C:\\Users\\admin.mueller\\befund.txt',
              reportFields: [
                { key: 'leitung', matches: '^ok$' },
                // Die Adresse steht in keiner Datei; sie kommt aus der
                // Abfrage der Einstellungen.
                { key: 'dns', matches: '^10\\.10\\.1\\.1[01]$' },
                { key: 'ursache', matches: '^namensdienst$' },
              ],
            },
          ],
          resultText:
            '120 Leute können wieder arbeiten, und du weißt, warum sie es vorher nicht konnten. Der Trick war, die Meldung zu zerlegen: „Internet geht nicht" sind zwei Fragen. Eine Adresse anzupingen prüft die Leitung, einen Namen aufzulösen prüft etwas ganz anderes — und genau dazwischen lag das Problem.\n\nDie Umgehung ist ein Eintrag und wirkt sofort. Was sie nicht ist: eine Lösung. Der Namensserver gehört AMSE, und der muss wieder laufen; bis dahin läuft der Betrieb über einen öffentlichen Dienst, der eure internen Namen nicht kennt.\n\nDie Frage für das Gespräch danach ist aber eine andere, und sie ist unbequem: Warum zeigen beide eingetragenen Namensserver auf denselben Dienstleister, und warum gibt es keinen dritten, der woanders steht? Ein zweiter Server im selben Rechenzentrum ist keine Redundanz. Das ist eine Architekturentscheidung, die 25 Minuten Warteschleife gekostet hat — und Marcos Satz „ich hab hier drei andere Kunden mit dem gleichen Problem" ist der Beweis, dass sie alle dieselbe Abhängigkeit haben.',
          skillGain: { netzwerk: 5, troubleshooting: 5 },
          effects: { stress: -2 },
        },
      ],
      hints: [
        '🤖 Jens: „Internet geht nicht" sind zwei Fragen. Prüf erst die Leitung — mit einer ADRESSE, nicht mit einem Namen, sonst prüfst du beides auf einmal.',
        '🤖 Jens: Wenn die Adresse durchgeht und der Name nicht, liegt es nicht an der Leitung. Was übersetzt Namen in Adressen, und wen fragt dieser Rechner dafür?',
        '🤖 Jens: Die eingetragenen Namensserver lassen sich anzeigen und ändern. Trag einen öffentlichen ein und prüf danach mit demselben Namen nach, der eben noch scheiterte.',
        '🤖 Jens: Konkret: `Test-NetConnection 8.8.8.8` → `Resolve-DnsName google.de` → `Get-DnsClientServerAddress` → `Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses 1.1.1.1` → `Resolve-DnsName google.de` → `echo "leitung: ok" > C:\\Users\\admin.mueller\\befund.txt` → `echo "dns: 10.10.1.10" >> C:\\Users\\admin.mueller\\befund.txt` → `echo "ursache: namensdienst" >> C:\\Users\\admin.mueller\\befund.txt`.',
      ],
    },
  },
  {
    id: 'AMSE-SC-006',
    title: 'Die Sophos-Lizenz ist abgelaufen',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: 'Du bekommst eine Sophos-Warnmail: \'Ihre Lizenz für Web Protection läuft in 7 Tagen ab.\' AMSE sollte das organisiert haben. Marco nach 2 Tagen: \'Ups, das ist durchgerutscht. Ich kümmere mich.\'',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Marco vertrauen und warten',
        outcome: 'FAIL',
        consequence: 'Tag 7: Lizenz abgelaufen. Web Protection deaktiviert. Alle User surfen ungefiltert. Marco: \'Die Bestellung dauert 3-5 Werktage.\' 5 Tage ohne Web-Filter im KRITIS-Netz.',
        scoreChange: -300,
        reputationChange: -20,
        lesson: 'Lizenzverwaltung NIEMALS komplett dem Dienstleister überlassen. Eigene Erinnerungen einrichten.',
      },
      {
        id: 'B',
        text: 'Selbst in Sophos Central den Status prüfen und Plan B vorbereiten',
        outcome: 'PERFECT',
        consequence: 'Du prüfst: Lizenz läuft wirklich in 7 Tagen aus. Du kontaktierst parallel Sophos-Vertrieb für Notfall-Verlängerung. AMSE schafft es knapp — aber du hattest einen Backup-Plan.',
        scoreChange: 200,
        reputationChange: 15,
        lesson: 'Kritische Lizenzen intern überwachen. Eigene Lizenz-Alerts aktivieren, nicht nur dem Dienstleister vertrauen.',
      },
      {
        id: 'C',
        text: 'Eskalation an Stefan (AMSE-GF) mit Verweis auf SLA-Verletzung',
        outcome: 'SUCCESS',
        consequence: 'Stefan verspricht \'sofortige Lösung\'. Bestellung kommt 2 Tage vor Ablauf. Aber nur weil Stefan persönlich interveniert hat.',
        scoreChange: 75,
        reputationChange: 10,
        lesson: 'GF-Eskalation funktioniert kurzfristig, ist aber keine Prozessverbesserung.',
      },
    ],
    realWorldReference: 'Abgelaufene Security-Lizenzen: Laut Gartner haben 25% der Unternehmen mindestens eine abgelaufene Security-Lizenz aktiv.',
    bsiReference: 'BSI IT-Grundschutz: OPS.1.1.5 Protokollierung, OPS.2.1 Outsourcing',
    involvedNpcs: ['AMSE-MARCO', 'AMSE-STEFAN'],
    tags: ['license', 'sophos', 'security', 'deadline'],
  },
  {
    id: 'AMSE-SC-007',
    title: 'Die Dokumentation die es nicht gibt',
    category: 'vendor_management',
    difficulty: 3,
    flavorText: 'NIS2-Audit steht an. Du fragst Marco nach Firewall-Dokumentation: Regelwerk, Netzplan, VPN-Topologie. Marco: \'Klar, schick ich morgen.\' 2 Wochen später: nichts.\n\n📍 System: Firewall-Management (warm-fw-mgmt)\n🎯 Aufgabe: Exportiere die Firewall-Konfiguration selbst für die Dokumentation',
    urgency: 'medium',
    choices: [
      {
        id: 'A',
        text: 'Dokumentation selbst exportieren (Terminal)',
        outcome: 'SUCCESS',
        terminalCommand: true,
        consequence: 'Du exportierst alles selbst. Dauert einen Tag, aber du hast jetzt vollständige Dokumentation — die DU pflegst und kontrollierst.',
        scoreChange: 150,
        reputationChange: 10,
        lesson: 'Wenn der Dienstleister nicht dokumentiert, musst du es selbst tun. Eigene Doku ist sowieso besser.',
      },
      {
        id: 'B',
        text: 'Schriftlich mit Fristsetzung anfordern',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Marco liefert Freitagabend ein 4-seitiges PDF ohne Details. \'Rest folgt.\' (Spoiler: folgt nie.) Aber du hast schriftlichen Nachweis für den Audit.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Fristen und schriftliche Kommunikation sind bei Dienstleistern essentiell. Mündliche Zusagen sind wertlos.',
      },
      {
        id: 'C',
        text: 'Im Vertrag nachschauen ob Dokumentation Teil der Leistung ist',
        outcome: 'PERFECT',
        consequence: '§7 Absatz 3: \'Auftragnehmer übergibt quartalsmäßig vollständige Dokumentation.\' AMSE hat seit 5 Jahren keine geliefert. Du schreibst Stefan mit Vertragsreferenz. Doku kommt in 10 Tagen.',
        scoreChange: 200,
        reputationChange: 25,
        lesson: 'IMMER den Vertrag kennen. Dokumentationspflichten stehen oft drin, werden aber nie eingefordert.',
      },
    ],
    realWorldReference: 'Fehlende Dokumentation durch externe Dienstleister ist eines der häufigsten Audit-Findings.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.1 Outsourcing, ORP.5 Compliance Management',
    involvedNpcs: ['AMSE-MARCO', 'AMSE-STEFAN'],
    tags: ['documentation', 'nis2', 'audit', 'contract'],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-fw-mgmt',
      username: 'admin',
      currentPath: '/etc/firewall',
      // Dokumentation ist hier kein Selbstzweck: Der Auszug ist leicht, der
      // Abgleich ist die Arbeit — und der Abgleich findet die Regel, die
      // niemand erklären kann. Genau deshalb schreibt man Dokumentation.
      taskText:
        'Exportier das laufende Regelwerk nach /srv/doku/regelwerk.txt (nft list ruleset mit einer Umlenkung), und gleich es dann gegen /etc/firewall/regelzweck.txt ab — dort ist zu jeder Regel der Zweck hinterlegt.\n\nErgebnis nach /srv/doku/abgleich.md — kein Editor da, also echo "…" > datei und echo "…" >> datei. Genau diese zwei Zeilen:\nregeln: <Anzahl der Regeln in der Eingangskette, nur die Zahl>\nohne_zweck: <Zielport der Regel, zu der kein Zweck hinterlegt ist, nur die Zahl>',
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
              'ip saddr 10.10.0.0/16 tcp dport 22 accept',
              'ip saddr 10.10.0.0/16 tcp dport 443 accept',
              'ip saddr 10.10.100.0/24 tcp dport 8443 accept',
              // Die Regel, zu der es keinen Zweck gibt: Fernwartung über RDP,
              // von überall.
              'tcp dport 3389 accept',
            ],
          },
        ],
      },
      vfsOverlay: {
        directories: ['/etc/firewall', '/srv/doku'],
        files: [
          {
            path: '/etc/firewall/regelzweck.txt',
            content:
              '# Zweckbindung der Firewallregeln — gepflegt von WARM\n' +
              '# Zu jeder Regel gehört ein Zweck und ein Vorgang. Regeln ohne\n' +
              '# Eintrag hier sind entweder undokumentiert oder unberechtigt.\n' +
              '\n' +
              'Rückkanal bestehender Verbindungen   technisch notwendig\n' +
              'Loopback                             technisch notwendig\n' +
              'ssh aus dem eigenen Netz             Vorgang 1102, Administration\n' +
              'https aus dem eigenen Netz           Vorgang 1102, Verwaltungsoberfläche\n' +
              'https-alt aus der DMZ                Vorgang 2281, Übergabeschnittstelle\n' +
              '\n' +
              '# Stand: 01.03.2026. Sechs Regeln sind aktiv, fünf sind hier\n' +
              '# beschrieben. Die sechste hat nie jemand eingetragen.\n',
          },
        ],
      },
      commandSkillGain: {
        nft: { netzwerk: 3, security: 3 },
        cat: { linux: 1 },
        echo: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Der Auszug muss wirklich aus der Kiste kommen …
            { commandRan: { pattern: 'nft.*list ruleset', outcome: 'succeeded' } },
            // … und das, was dabei herauskam, muss auch dort gelandet sein.
            { file: '/srv/doku/regelwerk.txt', matches: 'policy drop' },
            { file: '/srv/doku/regelwerk.txt', matches: 'tcp dport 3389 accept' },
            { fileRead: '/etc/firewall/regelzweck.txt' },
            {
              file: '/srv/doku/abgleich.md',
              reportFields: [
                { key: 'regeln', matches: '^6$' },
                { key: 'ohne_zweck', matches: '^3389$' },
              ],
            },
          ],
          resultText:
            'Jetzt gibt es eine Dokumentation — und sie hat sich beim Schreiben selbst bezahlt gemacht. Der Auszug allein ist ein Abzug des Ist-Zustands und sagt nichts; interessant wird er erst gegen die Zweckbindung gehalten. Sechs Regeln sind aktiv, fünf haben einen Vorgang. Die sechste macht den Fernwartungsport für die ganze Welt auf, und niemand kann sagen, seit wann oder warum.\n\nDas ist der eigentliche Grund, warum ein Audit Dokumentation verlangt: nicht, damit ein Ordner existiert, sondern weil beim Aufschreiben auffällt, was sich nicht aufschreiben lässt. Zwei Wochen lang hat Marco „schick ich morgen" gesagt — in der Zeit hättest du es dreimal selbst gemacht und dabei diese Regel gefunden.\n\nFür das Gespräch mit AMSE heißt das: Du fragst nicht mehr nach Unterlagen. Du legst deine hin und fragst nach dieser einen Regel.',
          skillGain: { security: 5, netzwerk: 3, softSkills: 3 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Warte nicht länger auf Marco. Das Regelwerk liegt auf der Kiste, und es lässt sich in eine Datei umlenken — das ist der ganze Export.',
        '🤖 Jens: Der Auszug allein ist noch keine Dokumentation, sondern ein Abzug. Halte ihn gegen die Zweckbindung: Zu welcher aktiven Regel gibt es dort KEINEN Eintrag?',
        '🤖 Jens: Zähl die Regeln in der Eingangskette — die Rückkanal- und Loopback-Zeilen zählen mit, das sind auch Regeln. Und die Regel ohne Zweck erkennst du daran, dass sie keine Quelle einschränkt.',
        '🤖 Jens: Konkret: `sudo nft list ruleset > /srv/doku/regelwerk.txt` → `cat /srv/doku/regelwerk.txt` → `cat /etc/firewall/regelzweck.txt` → `echo "regeln: 6" > /srv/doku/abgleich.md` → `echo "ohne_zweck: 3389" >> /srv/doku/abgleich.md`.',
      ],
    },
  },
  {
    id: 'AMSE-SC-008',
    title: 'AMSE-Techniker hat offene Session — seit 47 Tagen',
    category: 'security_incident',
    difficulty: 3,
    flavorText: 'Bei einer Routine-Prüfung siehst du: \'Letzte Admin-Anmeldung: admin_amse — Aktiv seit 47 Tagen.\' Marco hat eine Session offen gelassen. 47 Tage. Von einer unbekannten IP.\n\n📍 System: Firewall-Management (warm-fw-mgmt)\n🎯 Aufgabe: Prüfe die aktiven Sessions und finde heraus wem die IP 85.214.47.123 gehört',
    urgency: 'high',
    choices: [
      {
        id: 'A',
        text: 'Session sofort beenden und Passwort ändern',
        outcome: 'PERFECT',
        consequence: 'Du beendest die Session, änderst das Passwort, und rufst Marco an: \'Ich hab deine 47-Tage-Session geschlossen. Wir richten jetzt MFA ein.\' Marco: \'...äh, ja, sollten wir.\'',
        scoreChange: 200,
        reputationChange: 20,
        lesson: 'Admin-Sessions ohne Timeout sind ein massives Sicherheitsrisiko. MFA und Session-Timeouts sind Pflicht.',
      },
      {
        id: 'B',
        text: 'Erst prüfen wem die IP gehört (Terminal)',
        outcome: 'PERFECT_ALTERNATIVE',
        terminalCommand: true,
        consequence: 'Whois zeigt: Die IP ist Marcos Homeoffice-DSL. Nicht kompromittiert — aber Marco administriert KRITIS-Firewall von seinem privaten Netz ohne VPN! Du eskalierst an Stefan.',
        scoreChange: 250,
        reputationChange: 25,
        lesson: 'KRITIS-Administration über private Netzwerke ohne VPN ist ein NIS2-Verstoß. Dienstleister müssen dieselben Standards einhalten.',
        triggersEvent: 'AMSE_SECURITY_AUDIT',
      },
      {
        id: 'C',
        text: 'Marco informieren und ihn bitten die Session zu schließen',
        outcome: 'PARTIAL_SUCCESS',
        consequence: 'Marco: \'Ach, ich lass die manchmal offen für schnellen Zugriff.\' Er schließt sie. Nächste Woche: wieder eine offene Session.',
        scoreChange: 50,
        reputationChange: 5,
        lesson: 'Bitten hilft nicht nachhaltig. Technische Maßnahmen (Timeout, MFA) sind die Lösung.',
      },
    ],
    realWorldReference: 'SolarWinds 2020 nutzte kompromittierte Dienstleister-Zugänge. MSSP-Accounts sind bevorzugte Angriffsziele.',
    bsiReference: 'BSI IT-Grundschutz: OPS.2.1 Outsourcing, ORP.4 Identitäts- und Berechtigungsmanagement',
    involvedNpcs: ['AMSE-MARCO', 'AMSE-STEFAN'],
    tags: ['security', 'mfa', 'session', 'compliance'],
    terminalContext: {
      type: 'linux',
      hostname: 'warm-fw-mgmt',
      username: 'admin',
      currentPath: '/etc/firewall',
      // Die eigentliche Frage ist nicht „wer war das", sondern „von wo darf
      // er". Deshalb reicht es nicht, die Sitzung zu kappen: Solange der
      // ssh-Port für jeden offen steht, ist er in einer Minute wieder drauf.
      // Und die Gegenrichtung ist genauso wichtig — wer beim Zuschnüren den
      // eigenen Zugang vergisst, steht vor seiner eigenen Firewall.
      taskText:
        'Eine Sitzung läuft seit 47 Tagen von 85.214.47.123. Sieh nach, wem die Adresse gehört (/etc/firewall/netzverzeichnis.txt) und was der Wartungsvertrag über die Herkunft von Fernzugriffen sagt (/etc/firewall/wartungsvertrag.txt).\n\nDann zwei Dinge: die offene Sitzung beenden (der Prozess dazu steht in ps aux; kill braucht sudo), und den ssh-Zugang auf die Adressen begrenzen, die laut Vertrag zulässig sind. Der Weg dorthin führt über ufw.\n\nVorsicht: Dein eigener Arbeitsplatz ist 10.10.0.50. Wer nur den Dienstleister einträgt, sperrt sich selbst aus.',
      firewall: {
        enabled: true,
        defaultIncoming: 'deny',
        // Die Tür, die für alle offen steht — der Grund, warum eine private
        // DSL-Adresse überhaupt bis zum Anmeldedialog kommt.
        rules: [{ action: 'allow', port: 22 }],
      },
      processes: [
        { pid: 1, name: 'systemd', user: 'root', cmd: '/sbin/init' },
        { pid: 456, name: 'sshd', user: 'root', cmd: '/usr/sbin/sshd -D' },
        { pid: 4711, name: 'sshd', user: 'root', cmd: 'sshd: admin_amse@pts/2 (85.214.47.123)' },
        { pid: 4750, name: 'bash', user: 'admin', cmd: '-bash' },
      ],
      connections: [
        { proto: 'tcp', localPort: 22, peer: '85.214.47.123:51022', state: 'ESTABLISHED', pid: 4711, program: 'sshd' },
        { proto: 'tcp', localPort: 22, peer: '10.10.0.50:49812', state: 'ESTABLISHED', pid: 4750, program: 'sshd', user: 'admin' },
      ],
      vfsOverlay: {
        directories: ['/etc/firewall'],
        files: [
          {
            path: '/etc/firewall/netzverzeichnis.txt',
            content:
              '# Netzverzeichnis — gepflegt vom Netzbetrieb WARM\n' +
              '# bereich            inhaber                     einstufung\n' +
              '10.10.0.0/16         WARM Abfallwirtschaft       eigenes Netz\n' +
              '203.0.113.50         AMSE IT Solutions GmbH      Büroanschluss, fest\n' +
              '85.214.0.0/16        Deutsche Telekom AG         Einwahlbereich Privatkunden\n' +
              '\n' +
              '# Zum Bereich 85.214.0.0/16: Das sind private Anschlüsse. Eine\n' +
              '# Adresse daraus gehört keinem Unternehmen, sondern einem Haushalt —\n' +
              '# und sie wechselt regelmäßig.\n',
          },
          {
            path: '/etc/firewall/wartungsvertrag.txt',
            content:
              'Wartungsvertrag AMSE IT Solutions — Auszug\n' +
              '==========================================\n' +
              '\n' +
              'Fernzugriff\n' +
              '-----------\n' +
              'Zugriffe auf Systeme der WARM erfolgen ausschließlich aus dem\n' +
              'Firmennetz des Auftragnehmers. Der Büroanschluss ist fest und\n' +
              'lautet 203.0.113.50.\n' +
              '\n' +
              'Zugriffe aus privaten Anschlüssen, aus Mobilfunknetzen oder über\n' +
              'Dritte sind nicht zulässig.\n' +
              '\n' +
              'Sitzungen\n' +
              '---------\n' +
              'Sitzungen sind nach Abschluss der Arbeiten zu beenden. Eine\n' +
              'Sitzungsdauer von mehr als 24 Stunden gilt als Verstoß.\n',
          },
        ],
      },
      commandSkillGain: {
        ps: { linux: 2 },
        ss: { linux: 2, netzwerk: 2 },
        kill: { linux: 2, security: 2 },
        ufw: { security: 3, netzwerk: 2 },
        cat: { linux: 1 },
      },
      commands: [],
      solutions: [
        {
          commands: [],
          allRequired: false,
          stateGoals: [
            // Wo die Adresse herkommt, steht nur im Netzverzeichnis.
            { fileRead: '/etc/firewall/netzverzeichnis.txt' },
            // Die offene Sitzung ist beendet …
            { connectionAbsent: { peer: '85.214.47.123' } },
            // … die offene TÜR ist zu (das ist der Teil, den man vergisst) …
            { firewallRule: { action: 'allow', port: 22, from: null, present: false } },
            // … der Dienstleister kommt weiterhin von seinem Büroanschluss …
            { firewallRule: { action: 'allow', port: 22, from: '203.0.113.50', present: true } },
            // … und du dich selbst nicht ausgesperrt hast.
            { firewallRule: { action: 'allow', port: 22, from: '10.10.0.50', present: true } },
            { firewallEnabled: true },
          ],
          resultText:
            'Beides erledigt, und das zweite ist das wichtigere. Die Sitzung zu kappen fühlt sich nach Handeln an und hält genau so lange, bis Marco sich neu anmeldet — der ssh-Port stand für jeden offen, das war die eigentliche Lücke. Jetzt kommt er noch herein, aber nur vom Büroanschluss, den der Vertrag nennt.\n\nDass dein eigener Arbeitsplatz dabei eingetragen ist, klingt selbstverständlich und ist es nicht: Eine Firewall auf einer entfernten Kiste zuzuschnüren, ohne die eigene Quelle mitzudenken, ist der klassische Weg, sich vor die eigene Tür zu setzen — und danach braucht man jemanden vor Ort.\n\nZur Adresse selbst: 85.214.47.123 liegt im Einwahlbereich für Privatkunden. Marco hat eure Perimeter-Firewall 47 Tage lang von seinem Wohnzimmer aus administriert, mit einer Adresse, die niemandem zugeordnet ist und regelmäßig wechselt. Das ist kein Angriff und trotzdem ein meldepflichtiger Mangel: Der Vertrag verlangt das Firmennetz, und im Protokoll steht eine Adresse, hinter der kein Unternehmen steht.',
          skillGain: { security: 6, netzwerk: 4, troubleshooting: 3 },
          effects: { stress: -1 },
        },
      ],
      hints: [
        '🤖 Jens: Ein Konto namens admin_amse mit einer Sitzung von draußen — schau dir zuerst an, welche Verbindungen die Kiste offen hat und welcher Prozess dahintersteht.',
        '🤖 Jens: Bevor du etwas kappst: Wem gehört 85.214.47.123? Das Netzverzeichnis sagt es dir, und der Wartungsvertrag sagt, von wo Fernzugriffe überhaupt kommen dürfen.',
        '🤖 Jens: Die Sitzung zu beenden ist die halbe Arbeit — solange der ssh-Port für alle offen ist, meldet er sich in einer Minute neu an. Die offene Regel muss weg und durch zwei eingeschränkte ersetzt werden: der Büroanschluss des Dienstleisters und dein eigener Arbeitsplatz.',
        '🤖 Jens: Konkret: `ss -tnp` → `ps aux` → `cat /etc/firewall/netzverzeichnis.txt` → `cat /etc/firewall/wartungsvertrag.txt` → `sudo kill 4711` → `sudo ufw delete allow 22` → `sudo ufw allow from 203.0.113.50 to any port 22` → `sudo ufw allow from 10.10.0.50 to any port 22`.',
      ],
    },
  },
];
