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
      currentPath: 'C:\\Users\\admin.mueller>',
      commands: [
        {
          pattern: 'Test-NetConnection',
          patternRegex: 'Test-NetConnection.*-Port\\s+8443',
          output: `ComputerName     : ziel-server.warm.local
RemoteAddress    : 10.10.5.100
RemotePort       : 8443
TcpTestSucceeded : False

# Hmm, Port 8443 ist zu...`,
          skillGain: { troubleshooting: 2, netzwerk: 2 },
        },
        {
          pattern: 'Test-NetConnection',
          patternRegex: 'Test-NetConnection.*-Port\\s+443',
          output: `ComputerName     : ziel-server.warm.local
RemoteAddress    : 10.10.5.100
RemotePort       : 443
TcpTestSucceeded : True

# Port 443 geht! Marco hat wohl 443 statt 8443 freigegeben...`,
          skillGain: { troubleshooting: 3, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'ping',
          output: `Ping wird ausgeführt für ziel-server.warm.local [10.10.5.100] mit 32 Bytes Daten:
Antwort von 10.10.5.100: Bytes=32 Zeit<1ms TTL=128
Antwort von 10.10.5.100: Bytes=32 Zeit<1ms TTL=128

# Server ist erreichbar, also kein generelles Netzwerkproblem`,
          skillGain: { netzwerk: 1 },
        },
        {
          pattern: 'telnet',
          patternRegex: 'telnet.*8443',
          output: `Verbindungsaufbau zu ziel-server.warm.local...
Verbindung konnte nicht hergestellt werden.

# Telnet bestätigt: Port 8443 ist dicht`,
          skillGain: { troubleshooting: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['Test-NetConnection'],
          allRequired: false,
          resultText: 'Mit Test-NetConnection hast du bewiesen: Port 8443 ist blockiert, Port 443 funktioniert. Marco hat sich vertippt.',
          skillGain: { troubleshooting: 5, netzwerk: 3 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Test-NetConnection kann TCP-Ports testen. Versuch mal Test-NetConnection ziel-server.warm.local -Port 8443',
        'Tipp: Teste auch Port 443 zum Vergleich — vielleicht hat Marco den falschen Port eingetragen?',
        'Tipp: Alternativ geht auch: telnet ziel-server.warm.local 8443',
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
      commands: [
        {
          pattern: 'grep',
          patternRegex: 'grep.*(VPN|vpn|ipsec|phase).*log',
          output: `==> /var/log/vpn/ipsec.log <==
Mar 14 09:00:00 fw01 pluto[1234]: "homeoffice-vpn" #4523: initiating Quick Mode
Mar 14 09:00:01 fw01 pluto[1234]: "homeoffice-vpn" #4523: IPsec SA established
Mar 14 09:30:01 fw01 pluto[1234]: "homeoffice-vpn" #4523: Phase 2 lifetime expired
Mar 14 09:30:01 fw01 pluto[1234]: "homeoffice-vpn" #4523: deleting connection
Mar 14 09:30:02 fw01 pluto[1234]: "homeoffice-vpn" #4524: initiating Quick Mode
Mar 14 09:30:03 fw01 pluto[1234]: "homeoffice-vpn" #4524: IPsec SA established
Mar 14 10:00:03 fw01 pluto[1234]: "homeoffice-vpn" #4524: Phase 2 lifetime expired
# ... Pattern wiederholt sich alle 30 Minuten (1800 Sekunden)

# AHA! Phase 2 lifetime ist auf 1800 Sekunden = 30 Minuten gesetzt!`,
          skillGain: { troubleshooting: 5, security: 2 },
          isSolution: true,
        },
        {
          pattern: 'tail',
          patternRegex: 'tail.*(vpn|ipsec)',
          output: `Mar 14 10:00:03 fw01 pluto[1234]: "homeoffice-vpn" #4524: Phase 2 lifetime expired
Mar 14 10:00:03 fw01 pluto[1234]: "homeoffice-vpn" #4524: deleting connection
Mar 14 10:00:04 fw01 pluto[1234]: "homeoffice-vpn" #4525: initiating Quick Mode

# Die Disconnects passieren exakt alle 30 Minuten...`,
          skillGain: { troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'cat',
          patternRegex: 'cat.*/etc/ipsec',
          output: `conn homeoffice-vpn
    keyexchange=ikev2
    ike=aes256-sha256-modp2048
    esp=aes256-sha256
    ikelifetime=86400s
    lifetime=1800s          # <-- DA IST DAS PROBLEM! Nur 30 Minuten!

# Standard sollte 3600s (1 Stunde) oder mehr sein`,
          skillGain: { security: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'ls',
          output: `vpn/  syslog  auth.log  kern.log  messages  dmesg

# VPN-Logs sind im vpn/ Ordner`,
          skillGain: { linux: 1 },
        },
      ],
      solutions: [
        {
          commands: ['grep', 'cat'],
          allRequired: false,
          resultText: 'Du hast den Beweis: Phase 2 lifetime ist auf 1800s (30 Min) gesetzt. Das ist der Default, den AMSE nie angepasst hat!',
          skillGain: { troubleshooting: 5, security: 3, linux: 2 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: VPN-Logs findest du meist unter /var/log/vpn/ oder mit grep in syslog',
        'Tipp: Suche nach "Phase 2" oder "lifetime" in den Logs',
        'Tipp: Die IPsec-Config liegt oft unter /etc/ipsec.conf oder /etc/ipsec.d/',
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
      currentPath: '~',
      commands: [
        {
          pattern: 'show',
          patternRegex: 'show.*(rule|firewall|policy)',
          output: `Firewall Rules - Policy: WARM-MAIN
=====================================
ID    Source          Dest            Port    Action  Created      By
----  --------------  --------------  ------  ------  -----------  ----------
101   10.10.0.0/16    ANY             443     ALLOW   2024-01-15   admin
102   10.10.0.0/16    ANY             8443    ALLOW   2024-03-01   admin
103   10.42.0.0/16    ANY             ANY     ALLOW   2024-02-20   admin_amse  # <-- WTF?!
104   ANY             10.10.5.0/24    22      ALLOW   2024-01-15   admin

# Regel 103 sieht verdächtig aus... 10.42.0.0/16 ist nicht unser Netz!`,
          skillGain: { security: 3, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'whois',
          patternRegex: 'whois.*10\\.42',
          output: `% RIPE Database Query

inetnum:        10.42.0.0 - 10.42.255.255
netname:        STADTWERKE-NACHBARSTADT-NET
descr:          Stadtwerke Nachbarstadt GmbH
country:        DE
admin-c:        SW1234-RIPE

# Das ist das Netz der Stadtwerke Nachbarstadt!
# Die sind auch AMSE-Kunde... Marco hat Copy-Paste gemacht!`,
          skillGain: { security: 4, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'grep',
          patternRegex: 'grep.*10\\.42',
          output: `config/rules.conf:103: src=10.42.0.0/16 dst=any port=any action=allow # Added by admin_amse

# Nur eine Regel mit diesem Netz, aber die ist aktiv!`,
          skillGain: { security: 2, linux: 2 },
        },
        {
          pattern: 'nslookup',
          patternRegex: 'nslookup.*10\\.42',
          output: `Server:  warm-dns.warm.local
Address:  10.10.1.10

*** warm-dns.warm.local kann 10.42.0.1 nicht finden: Non-existent domain

# Das Netz ist von hier aus nicht erreichbar (noch nicht...)`,
          skillGain: { netzwerk: 2 },
        },
      ],
      solutions: [
        {
          commands: ['show', 'whois'],
          allRequired: true,
          resultText: 'Du hast die verdächtige Regel gefunden UND herausgefunden wem das Netz gehört. Handfeste Beweise für das Gespräch mit AMSE!',
          skillGain: { security: 5, netzwerk: 3, troubleshooting: 2 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Zeig dir erstmal die Firewall-Regeln an. Oft geht das mit "show firewall rules" oder ähnlich.',
        'Tipp: Whois kann dir sagen wem eine IP-Range gehört. Versuch: whois 10.42.0.0',
        'Tipp: Wer hat die Regel angelegt? Schau auf den "Created by" Eintrag.',
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
      currentPath: 'C:\\Users\\admin.mueller>',
      commands: [
        {
          pattern: 'ping',
          patternRegex: 'ping\\s+8\\.8\\.8\\.8',
          output: `Ping wird ausgeführt für 8.8.8.8 mit 32 Bytes Daten:
Antwort von 8.8.8.8: Bytes=32 Zeit=12ms TTL=118
Antwort von 8.8.8.8: Bytes=32 Zeit=11ms TTL=118

Ping-Statistik für 8.8.8.8:
    Pakete: Gesendet = 2, Empfangen = 2, Verloren = 0

# Die Leitung funktioniert! Das Problem liegt woanders...`,
          skillGain: { netzwerk: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'ping',
          patternRegex: 'ping\\s+(google|www)',
          output: `Ping-Anforderung konnte Host "google.de" nicht finden.
Überprüfen Sie den Namen, und versuchen Sie es erneut.

# Hostname kann nicht aufgelöst werden = DNS-Problem!`,
          skillGain: { netzwerk: 2, troubleshooting: 3 },
          isSolution: true,
        },
        {
          pattern: 'nslookup',
          output: `DNS-Anforderungstimeout.
    Timeout war 2 Sekunden.
Server:  UnKnown
Address:  10.10.1.10

*** Zeitüberschreitung bei Anforderung an UnKnown.

# DNS-Server 10.10.1.10 (AMSE) antwortet nicht!`,
          skillGain: { netzwerk: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'ipconfig',
          patternRegex: 'ipconfig\\s*/all',
          output: `Windows-IP-Konfiguration

   DNS-Server . . . . . . . . . . . : 10.10.1.10
                                       10.10.1.11

# DNS zeigt auf AMSE-verwaltete Server. Kein Fallback auf 1.1.1.1 konfiguriert!`,
          skillGain: { netzwerk: 2 },
        },
        {
          pattern: 'Set-DnsClientServerAddress',
          patternRegex: 'Set-DnsClientServerAddress.*1\\.1\\.1\\.1',
          output: `DNS-Server erfolgreich auf 1.1.1.1 geändert.

# Workaround aktiv! Internet sollte jetzt wieder gehen.`,
          skillGain: { netzwerk: 3, troubleshooting: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['ping'],
          allRequired: false,
          resultText: 'Perfekte Diagnose! Ping auf IP geht, Ping auf Hostname nicht = DNS-Problem. Du hast AMSE kalten Beweis geliefert.',
          skillGain: { netzwerk: 5, troubleshooting: 5 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: Teste erstmal ob die Leitung überhaupt geht. Ping 8.8.8.8 testet die reine Verbindung.',
        'Tipp: Wenn IP-Ping geht aber google.de nicht — was könnte das Problem sein?',
        'Tipp: nslookup zeigt dir ob DNS funktioniert. Probier: nslookup google.de',
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
      currentPath: '~',
      commands: [
        {
          pattern: 'show',
          patternRegex: 'show.*(config|rule|all)',
          output: `=== WARM Abfallwirtschaft - Firewall Configuration Export ===
Generated: 2024-03-14

[INTERFACES]
eth0: WAN - 203.0.113.1/24 (Telekom Business)
eth1: LAN - 10.10.0.1/16 (Intern)
eth2: DMZ - 10.10.100.1/24 (Webserver)

[FIREWALL RULES]
ID    Src             Dst             Port    Action  Comment
1     10.10.0.0/16    ANY             443     ALLOW   HTTPS ausgehend
2     10.10.0.0/16    ANY             80      ALLOW   HTTP ausgehend
3     10.10.0.0/16    10.10.1.10      53      ALLOW   DNS intern
...
(47 weitere Regeln)

# Export erfolgreich! Das ist schonmal ein Anfang für die Doku.`,
          skillGain: { security: 3, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'export',
          patternRegex: 'export.*(config|backup|rules)',
          output: `Exporting configuration to /tmp/warm-fw-backup-20240314.tar.gz...
- Firewall rules: 52 rules exported
- NAT configuration: 8 rules exported
- VPN tunnels: 3 tunnels exported
- Routing tables: 4 tables exported

Export complete: /tmp/warm-fw-backup-20240314.tar.gz (245 KB)

# Perfekt! Jetzt hast du eine vollständige Sicherung der Config.`,
          skillGain: { security: 4, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'show vpn',
          output: `=== VPN Tunnel Status ===
Tunnel              Peer            Status    Uptime
homeoffice-vpn     dynamic         UP        14d 3h
standort-sued      10.20.30.1      UP        89d 12h
backup-rz          10.30.40.1      DOWN      -

# 2 von 3 VPN-Tunnels aktiv. Standort-Süd und Backup-RZ dokumentieren!`,
          skillGain: { netzwerk: 3, security: 2 },
        },
        {
          pattern: 'help',
          output: `Available commands:
  show config    - Show running configuration
  show rules     - Show firewall rules
  show vpn       - Show VPN tunnel status
  export config  - Export full configuration backup

# Tipp: "export config" erstellt ein vollständiges Backup`,
          skillGain: { troubleshooting: 1 },
        },
      ],
      solutions: [
        {
          commands: ['show', 'export'],
          allRequired: false,
          resultText: 'Du hast die komplette Firewall-Konfiguration exportiert. Damit kannst du deine eigene Dokumentation erstellen.',
          skillGain: { security: 4, netzwerk: 3, troubleshooting: 2 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: "help" zeigt dir die verfügbaren Befehle',
        'Tipp: Mit "show config" oder "show rules" siehst du die aktuelle Konfiguration',
        'Tipp: "export config" erstellt ein vollständiges Backup das du dokumentieren kannst',
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
      currentPath: '~',
      commands: [
        {
          pattern: 'show',
          patternRegex: 'show.*(session|user|login)',
          output: `=== Active Admin Sessions ===
User          IP Address      Login Time           Duration   Last Activity
admin         10.10.0.50      2024-03-14 08:15    2h 15m     2m ago
admin_amse    85.214.47.123   2024-01-27 14:32    47d 18h    3h ago  # <-- WTF?!

# 47 Tage?! Und von einer externen IP 85.214.47.123?!`,
          skillGain: { security: 3, troubleshooting: 2 },
          isSolution: true,
        },
        {
          pattern: 'whois',
          patternRegex: 'whois.*85\\.214',
          output: `% RIPE Database Query

inetnum:        85.214.0.0 - 85.214.255.255
netname:        DTAG-DIAL
descr:          Deutsche Telekom AG
descr:          Residential DSL Pool
country:        DE
remarks:        * Dialup/DSL Pool *

# Das ist eine private DSL-Adresse... Marcos Homeoffice?!
# Er administriert unsere KRITIS-Firewall von seinem privaten DSL?!`,
          skillGain: { security: 4, netzwerk: 2 },
          isSolution: true,
        },
        {
          pattern: 'kill',
          patternRegex: 'kill.*(session|admin_amse)',
          output: `Terminating session for user admin_amse...
Session terminated successfully.

# Session beendet. Jetzt noch das Passwort ändern!`,
          skillGain: { security: 3 },
        },
        {
          pattern: 'passwd',
          patternRegex: '(passwd|password).*admin_amse',
          output: `Changing password for admin_amse...
New password: ********
Confirm: ********
Password changed successfully.

# Passwort geändert. Marco wird sich melden müssen.`,
          skillGain: { security: 2 },
        },
        {
          pattern: 'history',
          patternRegex: 'history.*admin_amse',
          output: `Command history for admin_amse (last 10):
2024-03-12 09:15 - show interfaces
2024-03-11 14:22 - show firewall rules
2024-03-08 11:45 - edit rule 47
2024-03-08 11:44 - show rule 47
2024-02-28 16:30 - commit

# Aktivität sieht normal aus, keine verdächtigen Befehle.`,
          skillGain: { security: 2, troubleshooting: 2 },
        },
      ],
      solutions: [
        {
          commands: ['show', 'whois'],
          allRequired: true,
          resultText: 'Du hast die offene Session gefunden UND herausgefunden dass Marco von seinem privaten DSL aus arbeitet. Das ist ein NIS2-Compliance-Problem!',
          skillGain: { security: 5, netzwerk: 3, troubleshooting: 3 },
          effects: {},
        },
      ],
      hints: [
        'Tipp: "show sessions" oder ähnlich zeigt aktive Admin-Sessions',
        'Tipp: Die IP 85.214.47.123 sieht extern aus. Wem gehört sie? Versuch: whois 85.214.47.123',
        'Tipp: Prüfe auch die Command-History des Accounts auf verdächtige Aktivitäten',
      ],
    },
  },
];
