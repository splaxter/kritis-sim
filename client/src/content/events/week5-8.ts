import { GameEvent } from '@kritis/shared';

export const week5to8Events: GameEvent[] = [
  // =====================
  // WEEK 5
  // =====================
  {
    id: 'evt_pentest_results',
    weekRange: [5, 5],
    dayPreference: [1, 2],
    probability: 1,
    category: 'security',
    title: 'Pentest-Ergebnisse: Der Schmerz',
    description: `Ein externer Penetrationstester hat letzte Woche eure Infrastruktur unter die Lupe genommen. Die Ergebnisse sind da.

{chef} ruft dich in sein Büro. Auf dem Bildschirm: Ein PDF mit dem Titel "Sicherheitsbewertung - KRITISCH".

"23 kritische Schwachstellen. 47 mittlere. Das geht so an die {gf}." Er reibt sich die Schläfen. "Wir haben eine Woche, um einen Maßnahmenplan zu präsentieren."

Die Highlights: Default-Passwörter auf Switches, ungepatchte Windows-Server, ein vergessener Test-FTP mit anonymem Zugang.

Wie reagierst du?`,
    involvedCharacters: ['chef', 'gf'],
    choices: [
      {
        id: 'prioritize_critical',
        text: 'Kritische Schwachstellen nach CVSS-Score priorisieren und Zeitplan erstellen',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          skills: { security: 8, troubleshooting: 5 },
          relationships: { chef: 15, gf: 10 },
          stress: 15,
          compliance: 10,
        },
        resultText: 'Du erstellst eine Matrix mit Risiko, Aufwand und Business-Impact. {chef} ist beeindruckt: "Endlich mal jemand, der Security versteht."',
        teachingMoment: 'CVSS-Scores helfen bei der Priorisierung. Kritisch (9.0+) zuerst, dann High (7.0-8.9).',
        setsFlags: ['pentest_handled_professionally'],
      },
      {
        id: 'blame_predecessors',
        text: '"Das waren alles Altlasten von meinem Vorgänger!"',
        effects: {
          relationships: { chef: -10, kollegen: -15 },
          stress: 10,
        },
        resultText: '{chef} schaut dich kalt an. "Dein Vorgänger ist seit 3 Jahren weg. Das ist jetzt dein Problem."',
      },
      {
        id: 'downplay',
        text: '"Die meisten sind doch nur theoretisch ausnutzbar..."',
        effects: {
          relationships: { chef: -5, gf: -10 },
          stress: 5,
          compliance: -15,
        },
        resultText: '{chef} seufzt. "Sag das mal dem BSI, wenn wir in der Zeitung stehen."',
        teachingMoment: 'In KRITIS-Umgebungen gibt es kein "theoretisch". Angreifer finden immer einen Weg.',
      },
      {
        id: 'quick_wins',
        text: 'Sofort die Low-Hanging-Fruits fixen: Default-Passwörter und FTP',
        effects: {
          skills: { security: 5, windows: 3, netzwerk: 3 },
          relationships: { chef: 5 },
          stress: 20,
          compliance: 5,
        },
        resultText: 'Du arbeitest die Nacht durch. Am nächsten Morgen sind 12 Schwachstellen behoben. {chef}: "Guter Start, aber das war erst der Anfang."',
        terminalCommand: true,
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'admin-ws',
      username: 'itadmin',
      currentPath: '/home/itadmin',
      commands: [
        {
          pattern: 'nmap -sV 192.168.1.0/24',
          output: `Starting Nmap scan...
192.168.1.10 - vsftpd 2.3.4 (VULNERABLE - Backdoor!)
192.168.1.15 - Apache 2.2.8 (OUTDATED)
192.168.1.20 - Windows Server 2012 R2 (MS17-010 VULNERABLE)
192.168.1.50 - Cisco Switch (default credentials)`,
          skillGain: { security: 3, netzwerk: 2 },
        },
        {
          pattern: 'passwd.*switch|switch.*passwd',
          output: 'Connecting to switch... Password changed successfully.',
          skillGain: { netzwerk: 3 },
          isSolution: true,
        },
        {
          pattern: 'systemctl stop vsftpd|service vsftpd stop',
          output: 'Stopping vsftpd... done.',
          skillGain: { linux: 2, security: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['passwd', 'vsftpd'],
          allRequired: true,
          resultText: 'FTP deaktiviert, Switch-Passwörter geändert. Ein guter Anfang.',
          skillGain: { security: 5, netzwerk: 3 },
          effects: { compliance: 5, stress: -5 },
        },
      ],
      hints: [
        'Tipp: nmap kann Dienste und Versionen identifizieren',
        'Tipp: Der FTP-Server sollte sofort deaktiviert werden',
        'Tipp: Default-Passwörter auf Netzwerkgeräten sind ein kritisches Risiko',
      ],
    },
    tags: ['security', 'pentest', 'compliance', 'terminal'],
  },
  {
    id: 'evt_linux_migration_planning',
    weekRange: [5, 5],
    dayPreference: [3, 4],
    probability: 0.9,
    category: 'support',
    title: 'Linux-Migration: Die Planung',
    description: `Die alten CentOS-Server müssen weg. CentOS 7 ist End-of-Life, und ihr habt noch 12 Produktivsysteme darauf laufen.

{kollege} breitet die Übersicht aus: "Fileserver, Monitoring, zwei Webserver, der alte Mailrelay, und... oh je, das SCADA-Gateway."

Die {gf} will wissen: Wie lange, wie teuer, welches Risiko?

Wie gehst du die Planung an?`,
    involvedCharacters: ['kollege', 'gf'],
    choices: [
      {
        id: 'detailed_analysis',
        text: 'Detaillierte Abhängigkeitsanalyse aller Systeme durchführen',
        requires: { skill: 'linux', threshold: 45 },
        effects: {
          skills: { linux: 10, troubleshooting: 5 },
          relationships: { gf: 10, kollegen: 5 },
          stress: 10,
        },
        resultText: 'Du dokumentierst jede Abhängigkeit, jeden Cronjob, jedes Custom-Skript. Nach drei Tagen hast du einen wasserdichten Migrationsplan.',
        teachingMoment: 'Bei Linux-Migrationen: Erst analysieren, dann planen, dann migrieren. Nie andersrum.',
        setsFlags: ['linux_migration_planned'],
        unlocks: ['systemctl', 'journalctl'],
      },
      {
        id: 'rocky_linux',
        text: 'Rocky Linux als Drop-in-Replacement vorschlagen',
        requires: { skill: 'linux', threshold: 35 },
        effects: {
          skills: { linux: 5 },
          relationships: { kollegen: 5 },
          stress: 5,
        },
        resultText: '{kollege} nickt. "Rocky ist binärkompatibel. Sollte die einfachste Option sein." Für die meisten Server stimmt das.',
        teachingMoment: 'Rocky Linux und AlmaLinux sind RHEL-kompatible CentOS-Nachfolger.',
      },
      {
        id: 'outsource',
        text: 'Externe Firma für die Migration beauftragen',
        effects: {
          relationships: { kaemmerer: -20, kollegen: -10 },
          budget: -8000,
          stress: -5,
        },
        resultText: 'Der {kaemmerer} tobt: "8000 Euro für etwas, das ihr selbst könnt?!" {kollege} schaut enttäuscht.',
      },
      {
        id: 'postpone',
        text: 'Migration auf nächstes Quartal verschieben',
        effects: {
          relationships: { gf: -10 },
          compliance: -10,
          stress: -10,
        },
        resultText: '{gf}: "EOL-Systeme in einer KRITIS-Umgebung? Das wird beim nächsten Audit ein Problem."',
      },
    ],
    tags: ['linux', 'migration', 'planning'],
  },
  {
    id: 'evt_fachabteilung_vs_it',
    weekRange: [5, 6],
    probability: 0.85,
    category: 'politics',
    title: 'Abteilungskrieg: Prioritäten',
    description: `Die {fachabteilung} will ein neues Fachverfahren einführen. Dringend. "Bis Ende des Monats!"

Gleichzeitig hast du: Den Pentest-Maßnahmenplan, die Linux-Migration, und 47 offene Tickets.

Der Leiter der {fachabteilung} steht in der Tür: "Ohne das neue System können wir die Gebührenbescheide nicht mehr rechtzeitig rausschicken. Das kostet die Stadt Millionen!"

{chef} schaut dich an. "Deine Einschätzung?"`,
    involvedCharacters: ['chef', 'fachabteilung'],
    choices: [
      {
        id: 'negotiate_compromise',
        text: 'Kompromiss vorschlagen: Basis-Installation jetzt, Full-Rollout nach Security-Fixes',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 15, fachabteilung: 5 },
          stress: 15,
        },
        resultText: 'Du präsentierst einen gestaffelten Plan. Beide Seiten meckern, aber beide bekommen, was sie brauchen. {chef}: "Gut verhandelt."',
        teachingMoment: 'In der IT geht es oft um Kompromisse. Win-Win schlägt Null-Summe.',
        setsFlags: ['political_skills_shown'],
      },
      {
        id: 'side_with_it',
        text: 'Security hat Vorrang - das Fachverfahren muss warten',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          relationships: { fachabteilung: -20, chef: 5, gf: 5 },
          stress: 10,
          compliance: 5,
        },
        resultText: 'Der Abteilungsleiter ist wütend, aber {chef} stützt dich: "Security ist nicht verhandelbar." Du hast dir einen Feind gemacht.',
      },
      {
        id: 'side_with_fach',
        text: 'Das Fachverfahren hat Priorität - dafür sind wir ja da',
        effects: {
          relationships: { fachabteilung: 15, chef: -10, gf: -15 },
          compliance: -10,
          stress: 15,
        },
        resultText: 'Die {fachabteilung} ist happy. {chef} nimmt dich beiseite: "Du hast gerade Security-Maßnahmen für ein Gebührenprogramm geopfert. Nicht klug."',
      },
      {
        id: 'escalate_to_gf',
        text: 'Entscheidung an {gf} eskalieren',
        effects: {
          relationships: { chef: -5, gf: -5 },
          stress: -5,
        },
        resultText: '{gf} entscheidet für Security. Aber {chef} ist genervt: "Das hättest du auch selbst klären können."',
        teachingMoment: 'Nicht jede Entscheidung muss eskaliert werden. Manchmal ist Eigeninitiative gefragt.',
      },
    ],
    tags: ['politics', 'priorities', 'softskills'],
  },
  {
    id: 'evt_ransomware_training',
    weekRange: [5, 5],
    dayPreference: [5],
    probability: 0.9,
    category: 'security',
    title: 'Ransomware-Awareness: Die Schulung',
    description: `Nach dem Pentest-Desaster hat {gf} eine Awareness-Schulung angeordnet. Und du sollst sie halten. Vor 80 Mitarbeitern. In zwei Tagen.

{kollege} grinst: "Viel Spaß. Letzte Schulung hat der Externe gemacht. Die Hälfte hat geschlafen."

Du hast: Eine veraltete PowerPoint von 2019, YouTube-Videos über Ransomware, und Panik.`,
    involvedCharacters: ['gf', 'kollege'],
    choices: [
      {
        id: 'live_demo',
        text: 'Live-Demo vorbereiten: Echte Phishing-Mail analysieren, Ransomware in VM zeigen',
        requires: { skill: 'security', threshold: 50 },
        effects: {
          skills: { security: 10, softSkills: 8 },
          relationships: { gf: 20, fachabteilung: 15, kollegen: 10 },
          stress: 20,
        },
        resultText: 'Die Demo fesselt alle. Als du live zeigst, wie Ransomware Dateien verschlüsselt, ist es mucksmäuschenstill. Standing Ovations.',
        teachingMoment: 'Praktische Demonstrationen sind 10x effektiver als PowerPoint-Slides.',
        setsFlags: ['security_evangelist'],
      },
      {
        id: 'interactive_quiz',
        text: 'Interaktives Quiz erstellen mit Kahoot und Preisen',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: {
          skills: { softSkills: 8, security: 3 },
          relationships: { fachabteilung: 10, gf: 10 },
          stress: 15,
        },
        resultText: 'Gamification funktioniert. Die Leute sind engagiert, lernen was, und der Gewinner bekommt einen Amazon-Gutschein.',
      },
      {
        id: 'boring_ppt',
        text: 'Die alte PowerPoint aufhübschen und durchklicken',
        effects: {
          relationships: { gf: -5, fachabteilung: -10 },
          stress: 5,
        },
        resultText: 'Nach 20 Minuten schläft die erste Reihe. {gf} schaut enttäuscht. Die Schulung wird als "Pflichtveranstaltung" abgehakt.',
      },
      {
        id: 'fake_phishing',
        text: 'Fake-Phishing-Kampagne vorab starten und Ergebnisse präsentieren',
        requires: { skill: 'security', threshold: 45 },
        effects: {
          skills: { security: 8 },
          relationships: { fachabteilung: -10, gf: 15, chef: 10 },
          stress: 10,
        },
        resultText: '34% haben auf den Link geklickt. Die Zahlen sind erschreckend - und wecken alle auf. Manche sind sauer, aber die Botschaft sitzt.',
        teachingMoment: 'Kontrollierte Phishing-Tests sind ein mächtiges Awareness-Tool. Vorher Betriebsrat informieren!',
      },
    ],
    tags: ['security', 'training', 'softskills'],
  },

  // =====================
  // WEEK 6
  // =====================
  {
    id: 'evt_zero_day_patch',
    weekRange: [6, 6],
    dayPreference: [2, 3],
    probability: 1,
    category: 'crisis',
    title: 'Zero-Day-Alarm: Kritischer Patch',
    description: `CERT-Bund meldet: Kritische Schwachstelle in Microsoft Exchange. CVSS 9.8. Wird aktiv ausgenutzt. Betrifft alle Versionen.

Euer Exchange-Server: Mitten in der Produktion. 200 Postfächer. Darunter {gf} und der {kaemmerer}.

{chef} ist im Urlaub. Du bist allein verantwortlich.

Der Patch ist da, aber: "Erfordert Neustart. Downtime: Geschätzt 30-60 Minuten."

Was tust du?`,
    involvedCharacters: ['gf', 'kaemmerer'],
    choices: [
      {
        id: 'emergency_patch',
        text: 'Sofort patchen - Risiko zu hoch. Downtime ankündigen.',
        requires: { skill: 'windows', threshold: 50 },
        effects: {
          skills: { windows: 10, security: 8 },
          relationships: { gf: 10, kaemmerer: -5 },
          stress: 25,
          compliance: 15,
        },
        resultText: 'Du informierst per Rundmail, patchst in der Mittagspause. 45 Minuten Downtime. {kaemmerer} beschwert sich, aber {gf} versteht: "Richtige Entscheidung."',
        teachingMoment: 'Bei Zero-Days mit aktivem Exploit: Sofort patchen. Jede Stunde Verzögerung ist Risiko.',
        setsFlags: ['handled_zero_day'],
        unlocks: ['Update-ExchangeServer'],
      },
      {
        id: 'night_patch',
        text: 'Patch auf heute Nacht verschieben - weniger Impact',
        effects: {
          skills: { windows: 5 },
          relationships: { fachabteilung: 5 },
          stress: 15,
          compliance: -5,
        },
        resultText: 'Du bleibst bis 2 Uhr nachts. Der Patch läuft sauber. Aber: War der Server in der Zwischenzeit kompromittiert? Du weißt es nicht.',
        teachingMoment: 'Bei Zero-Days: Zeit ist kritisch. 12 Stunden können den Unterschied machen.',
      },
      {
        id: 'workaround_first',
        text: 'Erst Workaround implementieren, dann in Ruhe patchen',
        requires: { skill: 'security', threshold: 55 },
        effects: {
          skills: { security: 12, windows: 5 },
          relationships: { gf: 15, fachabteilung: 10 },
          stress: 20,
          compliance: 10,
        },
        resultText: 'Du blockierst die betroffenen Ports an der Firewall, deaktivierst den anfälligen Dienst. Dann patchst du in Ruhe nach Feierabend. Elegant.',
        teachingMoment: 'Workarounds können Zeit kaufen. Aber nur wenn sie dokumentiert und der Patch zeitnah folgt.',
      },
      {
        id: 'wait_for_chef',
        text: '{chef} anrufen und auf Entscheidung warten',
        effects: {
          relationships: { chef: -15 },
          stress: 10,
          compliance: -10,
        },
        resultText: '{chef} ist genervt: "Dafür hast du mich aus dem Urlaub geholt? Patch das Ding!" Du hast Eigenverantwortung vermissen lassen.',
      },
    ],
    tags: ['security', 'windows', 'crisis', 'patch'],
  },
  {
    id: 'evt_cloud_discussion',
    weekRange: [6, 6],
    dayPreference: [4],
    probability: 0.9,
    category: 'budget',
    title: 'Cloud-Migration: Das große Gespräch',
    description: `{gf} hat dich und {chef} zu einem "strategischen Meeting" eingeladen. Thema: Cloud.

"Ich habe mit Microsoft telefoniert. Azure. Alles aus einer Hand. Kein Serverraum mehr. Keine Hardware-Ausfälle. Klingt doch super?"

{chef} schaut dich an. Der {kaemmerer} rechnet bereits: "Das wären 4000 Euro im Monat für die Lizenzen..."

{gf} will deine fachliche Einschätzung.`,
    involvedCharacters: ['gf', 'chef', 'kaemmerer'],
    choices: [
      {
        id: 'balanced_analysis',
        text: 'Nuancierte Analyse: Vorteile, Risiken, Hybrid-Ansatz als Alternative',
        requires: { skill: 'netzwerk', threshold: 45 },
        effects: {
          skills: { netzwerk: 8, softSkills: 5 },
          relationships: { gf: 15, chef: 10, kaemmerer: 5 },
          stress: 10,
        },
        resultText: 'Du präsentierst Pro und Contra: Skalierbarkeit vs. Datenschutz, Kosten vs. Kontrolle. Hybrid als Kompromiss. Alle sind beeindruckt von deiner Sachlichkeit.',
        teachingMoment: 'Cloud ist weder gut noch schlecht - es kommt auf den Use Case an. KRITIS hat besondere Anforderungen.',
        setsFlags: ['cloud_expert'],
      },
      {
        id: 'pro_cloud',
        text: '"Cloud ist die Zukunft - weniger Wartung, mehr Sicherheit"',
        effects: {
          relationships: { gf: 10, kaemmerer: -10, chef: -5 },
          stress: 5,
        },
        resultText: '{kaemmerer}: "Mehr Sicherheit? Unsere Daten auf amerikanischen Servern?" {chef} runzelt die Stirn. Du hast die KRITIS-Perspektive vergessen.',
      },
      {
        id: 'anti_cloud',
        text: '"Für KRITIS ist Cloud zu riskant - Datenschutz, Abhängigkeit, Kontrolle"',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          relationships: { gf: -5, chef: 5, kaemmerer: 10 },
          compliance: 5,
          stress: 5,
        },
        resultText: '{gf} ist enttäuscht, aber deine Argumente sind stichhaltig. {kaemmerer} nickt zufrieden. "Endlich mal jemand mit Verstand."',
      },
      {
        id: 'defer',
        text: '"Da müsste ich mich erst einarbeiten..."',
        effects: {
          relationships: { gf: -10, chef: -5 },
          stress: 5,
        },
        resultText: '{gf}: "Ich dachte, IT kennt sich mit sowas aus?" Peinliche Stille. {chef} rettet die Situation, aber schaut dich danach vorwurfsvoll an.',
      },
    ],
    tags: ['cloud', 'strategy', 'politics', 'budget'],
  },
  {
    id: 'evt_kritis_audit_prep',
    weekRange: [6, 7],
    probability: 0.95,
    category: 'compliance',
    title: 'KRITIS-Audit: Die Vorbereitung',
    description: `In drei Wochen kommt das BSI zur Prüfung. KRITIS-Nachweis nach §8a BSIG.

Die Anforderungsliste ist lang: Netzwerkpläne, Notfallhandbuch, Backup-Konzept, Zugriffskontrollen, Schulungsnachweise...

{chef} verteilt Aufgaben. Du bekommst: "Netzwerkdokumentation aktualisieren und Firewall-Regeln prüfen."

Problem: Die letzte Netzwerkdoku ist von 2021. Seitdem hat sich "einiges" geändert.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'full_discovery',
        text: 'Komplettes Netzwerk-Discovery durchführen und sauber dokumentieren',
        requires: { skill: 'netzwerk', threshold: 50 },
        effects: {
          skills: { netzwerk: 12, troubleshooting: 5 },
          relationships: { chef: 15 },
          stress: 25,
          compliance: 20,
        },
        resultText: 'Drei Tage Arbeit. Du findest: 5 undokumentierte Server, 2 Rogue-Switches, ein IoT-Gerät das niemand kennt. Die neue Doku ist wasserdicht.',
        teachingMoment: 'Netzwerk-Discovery regelmäßig durchführen. Schatten-IT ist ein reales Problem.',
        setsFlags: ['network_documented'],
        terminalCommand: true,
      },
      {
        id: 'update_existing',
        text: 'Bestehende Dokumentation aktualisieren - die groben Änderungen sind bekannt',
        effects: {
          skills: { netzwerk: 5 },
          relationships: { chef: 5 },
          stress: 10,
          compliance: 5,
        },
        resultText: 'Du aktualisierst die offensichtlichen Änderungen. Beim Audit fällt auf, dass 3 Systeme fehlen. "Nachbessern", sagt der Prüfer.',
      },
      {
        id: 'visio_magic',
        text: 'Mit Visio eine schöne neue Grafik erstellen - sieht professionell aus',
        effects: {
          relationships: { chef: -10 },
          compliance: -10,
          stress: 5,
        },
        resultText: 'Die Grafik ist hübsch, aber der Auditor fragt nach Details. "Wo genau ist dieser Switch physisch?" Du weißt es nicht. Peinlich.',
        teachingMoment: 'Audits sind keine Schönheitswettbewerbe. Substanz schlägt Form.',
      },
      {
        id: 'ask_colleague',
        text: '{kollege} fragen - der kennt das Netzwerk besser',
        effects: {
          relationships: { kollegen: 10, chef: -5 },
          skills: { netzwerk: 3 },
          stress: 5,
        },
        resultText: '{kollege} hilft aus und erklärt die Topologie. Du lernst viel, aber {chef} meint: "Du solltest das selbst können."',
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'admin-ws',
      username: 'itadmin',
      currentPath: '/home/itadmin',
      commands: [
        {
          pattern: 'nmap -sn 192.168.0.0/16',
          output: `Nmap scan report for 192.168.1.0/24
Host: 192.168.1.1 - Gateway
Host: 192.168.1.10 - dc01.warm.local
Host: 192.168.1.15 - exchange.warm.local
Host: 192.168.1.50 - UNKNOWN (!)
Host: 192.168.1.51 - UNKNOWN (!)
...
47 hosts found (23 documented, 24 unknown)`,
          skillGain: { netzwerk: 5 },
        },
        {
          pattern: 'arp-scan|netdiscover',
          output: `Interface: eth0
192.168.1.50    08:00:27:xx:xx:xx    (Unknown vendor)
192.168.1.51    b8:27:eb:xx:xx:xx    (Raspberry Pi Foundation)
...`,
          skillGain: { netzwerk: 3, security: 2 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['nmap', 'arp-scan'],
          allRequired: false,
          resultText: 'Du identifizierst alle Geräte im Netzwerk. Zeit für eine saubere Dokumentation.',
          skillGain: { netzwerk: 8 },
          effects: { compliance: 10 },
        },
      ],
      hints: [
        'Tipp: nmap -sn macht einen Ping-Scan ohne Port-Scan',
        'Tipp: arp-scan zeigt MAC-Adressen und Hersteller',
        'Tipp: Unbekannte Geräte könnten Schatten-IT sein',
      ],
    },
    tags: ['compliance', 'audit', 'netzwerk', 'terminal'],
  },
  {
    id: 'evt_team_building',
    weekRange: [6, 6],
    dayPreference: [5],
    probability: 0.8,
    category: 'team',
    title: 'Teambuilding: Escape Room',
    description: `{chef} hat für die IT-Abteilung einen Escape Room gebucht. "Cyber-Heist" - ihr müsst einen fiktiven Hackerangriff stoppen.

{kollege} ist skeptisch: "Teambuilding? Ich hab noch 20 Tickets offen."

Aber {chef} besteht darauf: "Wir arbeiten alle zu viel. Eine Auszeit tut uns gut."

Im Escape Room: Du stehst vor einem Terminal. Die Rätsel basieren auf echten IT-Konzepten. Dein Team schaut dich erwartungsvoll an.`,
    involvedCharacters: ['chef', 'kollege'],
    choices: [
      {
        id: 'take_lead',
        text: 'Führung übernehmen und Team koordinieren',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 15, kollegen: 15 },
          stress: -15,
        },
        resultText: 'Du verteilst Aufgaben nach Stärken. Ihr schafft es in 48 Minuten - neuer Rekord! Das Team ist begeistert.',
        teachingMoment: 'Gute Teamführung: Stärken erkennen, Aufgaben delegieren, Kommunikation sicherstellen.',
        setsFlags: ['team_leader'],
      },
      {
        id: 'tech_expert',
        text: 'Die technischen Rätsel lösen, während andere die "weichen" Aufgaben machen',
        requires: { skill: 'troubleshooting', threshold: 45 },
        effects: {
          skills: { troubleshooting: 8 },
          relationships: { kollegen: 5 },
          stress: -10,
        },
        resultText: 'Du knackst die Terminal-Rätsel in Rekordzeit. {kollege}: "Okay, du bist gut." Ihr schafft es mit 5 Minuten Restzeit.',
      },
      {
        id: 'hang_back',
        text: 'Dich zurückhalten und andere machen lassen',
        effects: {
          relationships: { chef: -5 },
          stress: -5,
        },
        resultText: 'Ihr schafft es knapp. {chef}: "Du warst heute sehr ruhig. Alles okay?" Er macht sich Notizen.',
      },
      {
        id: 'competitive',
        text: 'Alles selbst lösen wollen - du willst zeigen, was du kannst',
        effects: {
          relationships: { kollegen: -10, chef: -5 },
          stress: 5,
        },
        resultText: 'Du löst zwar viele Rätsel, aber das Team fühlt sich übergangen. {kollege} murmelt: "Teamplayer sieht anders aus."',
        teachingMoment: 'Im Team geht es nicht darum, der Beste zu sein, sondern das Beste herauszuholen.',
      },
    ],
    tags: ['team', 'softskills', 'personal'],
  },

  // =====================
  // WEEK 7
  // =====================
  {
    id: 'evt_vendor_outage',
    weekRange: [7, 7],
    dayPreference: [1, 2],
    probability: 1,
    category: 'crisis',
    title: 'Vendor-Ausfall: Totaler Blackout',
    description: `Montag, 9:00 Uhr. Euer Hosting-Provider für das Bürgerportal ist offline. Komplett.

Das Telefon glüht: "Die Bürger können keine Anträge mehr stellen!" "Wann geht es wieder?" "Das ist eine Katastrophe!"

Die Status-Seite des Providers zeigt nur: "Wir arbeiten dran."

{gf} steht in der Tür: "Was ist unser Plan B?"

Problem: Ihr habt keinen Plan B. Der Vertrag enthält ein SLA von 99.5% - aber was nützt das jetzt?`,
    involvedCharacters: ['gf', 'fachabteilung'],
    choices: [
      {
        id: 'failover_improvise',
        text: 'Notfall-Failover improvisieren: Alte lokale Instanz hochfahren',
        requires: { skill: 'linux', threshold: 55 },
        effects: {
          skills: { linux: 12, troubleshooting: 10 },
          relationships: { gf: 20, fachabteilung: 15 },
          stress: 30,
        },
        resultText: 'Du erinnerst dich an den alten Dev-Server. Mit einem gespiegelten Datenbank-Backup und DNS-Umstellung hast du in 2 Stunden ein Notfallsystem.',
        teachingMoment: 'Disaster Recovery: Immer einen Plan B haben. Und testen!',
        setsFlags: ['disaster_recovery_hero'],
        unlocks: ['mysqldump', 'rsync'],
      },
      {
        id: 'vendor_pressure',
        text: 'Druck auf den Vendor machen - SLA-Verletzung dokumentieren',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: {
          skills: { softSkills: 8 },
          relationships: { gf: 5 },
          stress: 15,
        },
        resultText: 'Du eskalierst zum Vendor-Management. Nach 3 Stunden sind sie wieder online. Die SLA-Gutschrift ist minimal, aber du hast alles dokumentiert.',
      },
      {
        id: 'communicate',
        text: 'Transparente Kommunikation: Bürger und Fachabteilungen informieren',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: {
          skills: { softSkills: 8 },
          relationships: { fachabteilung: 10 },
          stress: 10,
        },
        resultText: 'Du formulierst eine Störungsmeldung für die Website und informierst alle Abteilungen. Es hilft nicht technisch, aber dämpft die Panik.',
        teachingMoment: 'Bei Ausfällen: Kommunikation ist die halbe Miete. Ungewissheit macht alles schlimmer.',
      },
      {
        id: 'panic',
        text: 'Hektisch nach Alternativen suchen - vielleicht gibt es eine Schnelllösung',
        effects: {
          relationships: { gf: -10 },
          stress: 25,
        },
        resultText: 'Du googelst verzweifelt, rufst Kollegen an, schaust in alten Dokumenten. Nach 4 Stunden ist der Vendor von selbst wieder online. Du hast nur Zeit verbrannt.',
      },
    ],
    tags: ['crisis', 'vendor', 'linux', 'softskills'],
  },
  {
    id: 'evt_new_employee_onboarding',
    weekRange: [7, 7],
    dayPreference: [3],
    probability: 0.9,
    category: 'team',
    title: 'Neue Kollegin: Du bist der Mentor',
    description: `Die IT bekommt Verstärkung! Lisa, frisch aus der Ausbildung, fängt an. Und {chef} hat dich zum Mentor ernannt.

"Du bist zwar auch noch nicht so lange hier, aber du hast dich gut eingearbeitet. Zeig ihr, wie wir hier arbeiten."

Lisa steht vor dir, nervös aber motiviert. "Ich hab viel theoretisches Wissen, aber... das hier ist mein erster richtiger Job."

Wie gehst du das Onboarding an?`,
    involvedCharacters: ['chef', 'azubi'],
    choices: [
      {
        id: 'structured_onboarding',
        text: 'Strukturiertes Onboarding: Checkliste, Dokumentation durchgehen, erste kleine Aufgaben',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 10, kollegen: 10 },
          stress: 10,
        },
        resultText: 'Du erstellst einen Einarbeitungsplan. Lisa ist dankbar für die Struktur. Nach einer Woche löst sie erste Tickets selbstständig.',
        teachingMoment: 'Gutes Onboarding spart langfristig Zeit. Investition in Menschen zahlt sich aus.',
        setsFlags: ['good_mentor'],
      },
      {
        id: 'hands_on',
        text: 'Learning by Doing: Direkt ans Ticketsystem setzen, du schaust über die Schulter',
        effects: {
          skills: { troubleshooting: 5 },
          relationships: { kollegen: 5 },
          stress: 15,
        },
        resultText: 'Lisa ist anfangs überfordert, aber lernt schnell. Ein paar Fehler passieren, aber die sind lehrreich.',
      },
      {
        id: 'documentation_first',
        text: '"Lies erstmal die Dokumentation durch, dann reden wir weiter"',
        effects: {
          relationships: { kollegen: -10, chef: -5 },
          stress: -5,
        },
        resultText: 'Lisa verbringt drei Tage mit veralteten Wiki-Artikeln und ist frustriert. {chef}: "Mentoring sieht anders aus."',
      },
      {
        id: 'pair_programming',
        text: 'Pair-Administration: Jede Aufgabe zusammen machen, alles erklären',
        requires: { skill: 'troubleshooting', threshold: 45 },
        effects: {
          skills: { troubleshooting: 5, softSkills: 8 },
          relationships: { kollegen: 15, chef: 5 },
          stress: 15,
        },
        resultText: 'Zeitintensiv, aber effektiv. Lisa versteht nicht nur das Was, sondern auch das Warum. Sie wird schnell produktiv.',
        teachingMoment: 'Pair-Programming/-Administration ist einer der effektivsten Wissenstransfer-Methoden.',
      },
    ],
    tags: ['team', 'onboarding', 'softskills', 'mentoring'],
  },
  {
    id: 'evt_compliance_rush',
    weekRange: [7, 7],
    dayPreference: [4, 5],
    probability: 0.9,
    category: 'compliance',
    title: 'Compliance-Rush: Deadline naht',
    description: `Das KRITIS-Audit ist in einer Woche. Und es fehlen noch: Das Notfallhandbuch, die Backup-Tests, und 12 Schulungsnachweise.

{chef} verteilt Aufgaben: "Du machst die Backup-Tests. Dokumentieren, dass alle kritischen Systeme wiederherstellbar sind."

Problem: Der letzte dokumentierte Backup-Test war vor 18 Monaten. Und das Ergebnis war... "teilweise erfolgreich".`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'full_test',
        text: 'Vollständigen Backup-Test durchführen: Alle kritischen Systeme in Test-Umgebung wiederherstellen',
        requires: { skill: 'linux', threshold: 50 },
        effects: {
          skills: { linux: 10, windows: 5 },
          relationships: { chef: 15 },
          stress: 25,
          compliance: 20,
        },
        resultText: 'Du testest jedes System. Ergebnis: 2 von 15 Backups sind korrupt. Du fixst die Backup-Jobs und dokumentierst alles. Beim Audit gibt es Lob.',
        teachingMoment: 'Ein Backup ist nur so gut wie der letzte erfolgreiche Restore-Test.',
        setsFlags: ['backup_hero'],
        terminalCommand: true,
      },
      {
        id: 'spot_check',
        text: 'Stichprobenartig testen - die wichtigsten 5 Systeme',
        effects: {
          skills: { linux: 5 },
          relationships: { chef: 5 },
          stress: 15,
          compliance: 10,
        },
        resultText: 'Die getesteten Systeme sind okay. Beim Audit fällt auf, dass du nicht alle getestet hast. "Nachbessern für nächstes Jahr."',
      },
      {
        id: 'paper_exercise',
        text: 'Nur die Dokumentation erstellen - die Backups werden schon laufen',
        effects: {
          relationships: { chef: -10 },
          compliance: -15,
          stress: 5,
        },
        resultText: 'Der Auditor will einen Live-Test sehen. Das Backup des Mailservers schlägt fehl. Peinlich und ein Major Finding.',
        teachingMoment: 'Compliance-Dokumentation ohne echte Tests ist wertlos - und wird erkannt.',
      },
      {
        id: 'automate',
        text: 'Backup-Monitoring automatisieren und Dashboard erstellen',
        requires: { skill: 'linux', threshold: 55 },
        effects: {
          skills: { linux: 12, troubleshooting: 5 },
          relationships: { chef: 20, kollegen: 10 },
          stress: 20,
          compliance: 15,
        },
        resultText: 'Du richtest automatische Backup-Verifizierung ein. Das Dashboard zeigt: 3 fehlerhafte Jobs. Du fixst sie, und ab jetzt gibt es Alerts.',
        teachingMoment: 'Automatisiertes Monitoring > manuelle Checks. Einmal einrichten, immer profitieren.',
        unlocks: ['bacula', 'rsnapshot'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'backup-srv',
      username: 'root',
      currentPath: '/backup',
      commands: [
        {
          pattern: 'ls -la /backup',
          output: `total 2.3T
drwxr-xr-x  15 root root 4096 Mar 12 backup_dc01_20260312.tar.gz
drwxr-xr-x  15 root root 4096 Mar 12 backup_exchange_20260312.tar.gz
drwxr-xr-x  15 root root    0 Mar 12 backup_fileserver_20260312.tar.gz (!)
drwxr-xr-x  15 root root 4096 Mar 10 backup_webserver_20260310.tar.gz`,
          skillGain: { linux: 2 },
        },
        {
          pattern: 'tar -tzf.*fileserver',
          output: `tar: This does not look like a tar archive
tar: Error exit delayed from previous errors`,
          skillGain: { linux: 3, troubleshooting: 3 },
        },
        {
          pattern: 'systemctl status backup|crontab -l',
          output: `backup.service - Daily Backup Service
   Active: failed (Result: exit-code)
   Last run: Mar 10 02:00:00 (Failed)`,
          skillGain: { linux: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['tar', 'systemctl'],
          allRequired: false,
          resultText: 'Du identifizierst das Problem: Der Backup-Job ist vor 2 Tagen fehlgeschlagen. Zeit für ein Fix.',
          skillGain: { linux: 8, troubleshooting: 5 },
          effects: { compliance: 10 },
        },
      ],
      hints: [
        'Tipp: Prüfe die Backup-Dateien auf Integrität',
        'Tipp: 0-Byte-Dateien sind verdächtig',
        'Tipp: Was sagt der Backup-Service?',
      ],
    },
    tags: ['compliance', 'backup', 'linux', 'terminal'],
  },
  {
    id: 'evt_ac_failure',
    weekRange: [7, 8],
    probability: 0.85,
    category: 'crisis',
    title: 'Serverraum: Die Klimaanlage streikt',
    description: `Freitagnachmittag, 16:30. Der Monitoring-Alert explodiert: "CRITICAL: Server Room Temperature 32°C"

Du rennst zum Serverraum. Die Klimaanlage macht komische Geräusche und bläst warme Luft.

Aktuelle Temperatur: 34°C. Tendenz steigend. Ab 40°C drohen Hardware-Schäden.

Der Haustechniker ist schon im Wochenende. Die Klimafirma kann "frühestens Montag" kommen.

Was tust du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'emergency_shutdown',
        text: 'Nicht-kritische Systeme herunterfahren, um Wärmelast zu reduzieren',
        requires: { skill: 'troubleshooting', threshold: 50 },
        effects: {
          skills: { troubleshooting: 10, linux: 5, windows: 5 },
          relationships: { chef: 10 },
          stress: 25,
        },
        resultText: 'Du identifizierst 8 Server, die übers Wochenende nicht laufen müssen. Mit reduzierter Last stabilisiert sich die Temperatur bei 36°C. Knapp, aber es hält.',
        teachingMoment: 'Im Notfall: Last reduzieren. Jeder ausgeschaltete Server spart Wärme.',
        setsFlags: ['handled_thermal_crisis'],
      },
      {
        id: 'improvise_cooling',
        text: 'Improvisieren: Türen auf, Ventilatoren aus dem Büro holen',
        effects: {
          skills: { troubleshooting: 5 },
          relationships: { chef: 5 },
          stress: 20,
          compliance: -5,
        },
        resultText: 'Du holst jeden Ventilator aus dem Gebäude. Mit offener Tür und Durchzug stabilisiert es sich. {chef}: "Kreativ, aber das Sicherheitskonzept..."',
        teachingMoment: 'Offene Serverraum-Türen sind ein Sicherheitsrisiko. Nur im absoluten Notfall.',
      },
      {
        id: 'call_emergency',
        text: 'Notfall-Nummer der Klimafirma anrufen - das ist ein Notfall!',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: {
          skills: { softSkills: 5 },
          relationships: { chef: 5 },
          budget: -2000,
          stress: 15,
        },
        resultText: 'Der Techniker kostet 180€/Stunde am Freitagabend. Defekter Kondensator, schnell getauscht. 2000€ ungeplante Ausgaben, aber Problem gelöst.',
      },
      {
        id: 'wait_and_see',
        text: 'Abwarten - vielleicht kühlt es ab, wenn die Sonne untergeht',
        effects: {
          relationships: { chef: -20 },
          stress: 10,
          budget: -5000,
        },
        resultText: 'Um 19 Uhr sind es 42°C. Der Exchange-Server schaltet sich ab. Am Montag: Defekte Festplatten, Datenverlust, ein wütendes {chef}.',
        teachingMoment: 'Bei Temperaturproblemen nie abwarten. Hardware-Schäden sind teuer und irreversibel.',
      },
    ],
    tags: ['crisis', 'infrastructure', 'troubleshooting'],
  },

  // =====================
  // WEEK 8
  // =====================
  {
    id: 'evt_mid_probation_review',
    weekRange: [8, 8],
    dayPreference: [1, 2],
    probability: 1,
    category: 'personal',
    title: 'Halbzeit: Das Probezeitgespräch',
    description: `Zwei Monate. Halbzeit der Probezeit. {chef} hat dich zum Feedbackgespräch eingeladen.

Er blättert durch seine Notizen: "Insgesamt bin ich zufrieden. Du hast dich gut eingearbeitet, technisch bist du solide." Pause. "Aber es gibt ein paar Punkte..."

Er schaut dich an: "Wie siehst du selbst die letzten zwei Monate? Was lief gut, was könnte besser laufen?"`,
    involvedCharacters: ['chef'],
    requires: {
      events: ['evt_first_day'],
    },
    choices: [
      {
        id: 'honest_self_assessment',
        text: 'Ehrliche Selbstreflexion: Stärken und Schwächen benennen, Lernbereitschaft zeigen',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 20 },
          stress: -10,
        },
        resultText: '{chef} nickt anerkennend. "Selbstreflexion ist eine seltene Qualität. Weiter so." Er macht sich positive Notizen.',
        teachingMoment: 'In Feedbackgesprächen: Ehrlichkeit zeigt Reife. Niemand erwartet Perfektion.',
        setsFlags: ['positive_review'],
      },
      {
        id: 'highlight_achievements',
        text: 'Erfolge hervorheben: Pentest-Response, Vendor-Ausfall, Audit-Vorbereitung',
        effects: {
          skills: { softSkills: 5 },
          relationships: { chef: 10 },
          stress: 5,
        },
        resultText: '{chef}: "Stimmt, du hast einige Krisen gut gemeistert." Er notiert die Punkte. Gutes Selbstmarketing.',
      },
      {
        id: 'deflect',
        text: '"Ich denke, es läuft ganz gut. Was meinen Sie denn?"',
        effects: {
          relationships: { chef: -5 },
          stress: 10,
        },
        resultText: '{chef} runzelt die Stirn. "Ich frage dich nach deiner Einschätzung." Er macht sich Notizen - keine positiven.',
        teachingMoment: 'Feedbackgespräche sind Dialog, nicht Verhör. Eigene Perspektive ist wichtig.',
      },
      {
        id: 'complain',
        text: 'Probleme ansprechen: Zu viel Arbeit, zu wenig Unterstützung, veraltete Systeme',
        effects: {
          relationships: { chef: -10, kollegen: -5 },
          stress: 15,
        },
        resultText: '{chef}: "Beschwerden sind einfach. Lösungen sind schwerer." Er ist enttäuscht. Du hast dich als Problemmelder statt Problemlöser präsentiert.',
      },
    ],
    tags: ['personal', 'career', 'softskills'],
  },
  {
    id: 'evt_nis2_gap_analysis',
    weekRange: [8, 8],
    dayPreference: [2, 3],
    probability: 0.95,
    category: 'compliance',
    title: 'NIS2: Die Gap-Analyse',
    description: `Die EU-NIS2-Richtlinie ist in Kraft. Kommunale Versorger sind jetzt "wichtige Einrichtungen". Die Anforderungen sind strenger als KRITIS.

{gf} hat eine externe Beratung beauftragt. Ergebnis: 47 Gaps. Davon 12 "kritisch".

Kritische Gaps: Incident Response Plan fehlt, Supply Chain Security undokumentiert, Geschäftsführerhaftung nicht geklärt.

{chef} verteilt: "Du übernimmst den Incident Response Plan. Deadline: 4 Wochen."

Das ist... ambitioniert.`,
    involvedCharacters: ['chef', 'gf'],
    choices: [
      {
        id: 'template_based',
        text: 'BSI-Templates als Basis nehmen und auf eure Umgebung anpassen',
        requires: { skill: 'security', threshold: 50 },
        effects: {
          skills: { security: 12, softSkills: 5 },
          relationships: { chef: 15, gf: 10 },
          stress: 20,
          compliance: 15,
        },
        resultText: 'Du findest das BSI-Template, passt es an, führst eine Tabletop-Übung durch. Nach 3 Wochen steht ein solider Plan. {gf}: "Professionelle Arbeit."',
        teachingMoment: 'Nicht das Rad neu erfinden. BSI, NIST, ISO bieten gute Templates.',
        setsFlags: ['nis2_compliant'],
        unlocks: ['incident-response'],
      },
      {
        id: 'from_scratch',
        text: 'Von Grund auf entwickeln - so lernst du am meisten',
        requires: { skill: 'security', threshold: 60 },
        effects: {
          skills: { security: 15 },
          relationships: { chef: 5 },
          stress: 30,
          compliance: 10,
        },
        resultText: 'Viel Arbeit, aber du verstehst jeden Aspekt. Der Plan ist gut, aber du hast auch viele schlaflose Nächte hinter dir.',
      },
      {
        id: 'external_help',
        text: 'Externen Berater für den Plan beauftragen',
        effects: {
          relationships: { kaemmerer: -15, chef: -5 },
          budget: -5000,
          compliance: 10,
          stress: -5,
        },
        resultText: 'Der {kaemmerer} ist nicht begeistert: "Schon wieder externe Kosten?" Der Plan ist gut, aber du hast nichts dabei gelernt.',
      },
      {
        id: 'minimal_compliance',
        text: 'Nur das absolute Minimum dokumentieren - reicht für die Prüfung',
        effects: {
          relationships: { gf: -10 },
          compliance: -5,
          stress: 5,
        },
        resultText: 'Der Plan ist dünn. Bei der nächsten Übung zeigt sich: Er funktioniert nicht in der Praxis. Nacharbeit nötig.',
        teachingMoment: 'Compliance-Minimum ist keine Sicherheit. Ein Plan muss funktionieren, nicht nur existieren.',
      },
    ],
    tags: ['compliance', 'nis2', 'security', 'planning'],
  },
  {
    id: 'evt_datacenter_visit',
    weekRange: [8, 8],
    dayPreference: [4],
    probability: 0.85,
    category: 'support',
    title: 'Rechenzentrum-Besuch: Die Realität',
    description: `Euer Co-Location-Provider lädt zur Führung ein. Ihr habt dort 2 Racks mit Backup-Systemen.

{kollege} kommt mit: "Ich war da noch nie. Ist bestimmt beeindruckend."

Vor Ort: Professionelle Sicherheit, redundante Stromversorgung, Löschanlage. Aber dann seht ihr eure Racks...

Kabelchaos. Alte Hardware. Ein Server ohne Beschriftung. "Den haben wir seit 2019 nicht mehr angefasst", murmelt {kollege}.`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'document_everything',
        text: 'Alles dokumentieren: Fotos, Seriennummern, Verkabelung',
        requires: { skill: 'troubleshooting', threshold: 40 },
        effects: {
          skills: { troubleshooting: 8, netzwerk: 5 },
          relationships: { kollegen: 10 },
          stress: 10,
        },
        resultText: 'Du fotografierst jedes Kabel, notierst jede Seriennummer. Zurück im Büro hast du endlich eine vollständige Asset-Liste.',
        teachingMoment: 'Physische Dokumentation ist genauso wichtig wie logische. Besonders bei Remote-Standorten.',
        setsFlags: ['datacenter_documented'],
      },
      {
        id: 'identify_mystery_server',
        text: 'Den mysteriösen Server identifizieren - was läuft darauf?',
        requires: { skill: 'linux', threshold: 45 },
        effects: {
          skills: { linux: 8, security: 5 },
          relationships: { kollegen: 5 },
          stress: 15,
        },
        resultText: 'Du verbindest dich remote. Der Server läuft noch auf Debian 8, hostet eine vergessene Test-Anwendung. Sicherheitsrisiko! Sofort runterfahren.',
        teachingMoment: 'Schatten-IT und vergessene Systeme sind häufige Angriffsvektoren.',
      },
      {
        id: 'cable_management',
        text: 'Das Kabelchaos beseitigen - saubere Verkabelung einziehen',
        effects: {
          skills: { netzwerk: 5 },
          relationships: { kollegen: 10 },
          stress: 15,
        },
        resultText: 'Zwei Stunden später sieht es professionell aus. Der RZ-Techniker: "Endlich mal jemand, der sich kümmert."',
      },
      {
        id: 'just_look',
        text: 'Nur kurz durchgehen - im Büro wartet Arbeit',
        effects: {
          relationships: { kollegen: -5 },
          stress: -5,
        },
        resultText: 'Schneller Rundgang, keine Dokumentation. {kollege}: "Hätten wir uns sparen können." Die Chance für Verbesserungen ist vertan.',
      },
    ],
    tags: ['infrastructure', 'datacenter', 'documentation'],
  },
  {
    id: 'evt_network_segmentation',
    weekRange: [8, 8],
    dayPreference: [5],
    probability: 0.9,
    category: 'security',
    title: 'Netzwerk-Segmentierung: Projekt-Kickoff',
    description: `Nach dem Pentest ist klar: Das Netzwerk muss segmentiert werden. IT, Verwaltung, SCADA - alles im selben VLAN ist ein Sicherheits-Albtraum.

{chef} eröffnet das Kickoff-Meeting: "Das ist unser größtes Projekt dieses Jahr. Budget: Genehmigt. Timeline: 6 Monate."

Die Anforderungen: VLANs für jede Zone, Firewall-Regeln, ACLs auf den Switches, Monitoring. Und das alles ohne Produktionsunterbrechung.

Deine Rolle: Technische Planung und Umsetzung der IT-Zone.`,
    involvedCharacters: ['chef', 'kollege'],
    choices: [
      {
        id: 'detailed_planning',
        text: 'Detaillierten Projektplan erstellen: Phasen, Meilensteine, Rollback-Strategien',
        requires: { skill: 'netzwerk', threshold: 55 },
        effects: {
          skills: { netzwerk: 12, security: 8, troubleshooting: 5 },
          relationships: { chef: 20, kollegen: 10 },
          stress: 15,
          compliance: 10,
        },
        resultText: 'Dein Plan ist wasserdicht: Test-Phase, Pilot mit unkritischen Systemen, schrittweiser Rollout. {chef}: "Das nenne ich Professionalität."',
        teachingMoment: 'Große Projekte brauchen große Planung. Lieber mehr Zeit in Planung als in Troubleshooting.',
        setsFlags: ['segmentation_leader'],
        unlocks: ['vlan', 'iptables'],
      },
      {
        id: 'quick_start',
        text: 'Direkt mit der IT-Zone anfangen - Learning by Doing',
        requires: { skill: 'netzwerk', threshold: 45 },
        effects: {
          skills: { netzwerk: 8 },
          relationships: { chef: -5, kollegen: 5 },
          stress: 20,
        },
        resultText: 'Du richtest das erste VLAN ein. Funktioniert! Dann merkst du: Die Firewall-Regeln fehlen. Und die Dokumentation. Und der Rollback-Plan...',
        teachingMoment: 'Einfach anfangen klingt gut, führt aber oft zu Problemen. Planung spart Zeit.',
      },
      {
        id: 'ask_for_training',
        text: 'Um Schulung bitten - das übersteigt dein aktuelles Wissen',
        effects: {
          skills: { netzwerk: 5, softSkills: 3 },
          relationships: { chef: 5 },
          budget: -1500,
          stress: 5,
        },
        resultText: '{chef} genehmigt eine Fortinet-Schulung. Zeit gut investiert - du kommst mit solidem Wissen zurück. Das Projekt startet verzögert, aber sicherer.',
        teachingMoment: 'Die eigenen Grenzen kennen ist Stärke, nicht Schwäche. Fortbildung ist Investition.',
      },
      {
        id: 'delegate_to_colleague',
        text: 'Vorschlagen, dass {kollege} die Führung übernimmt - er hat mehr Erfahrung',
        effects: {
          relationships: { chef: -10, kollegen: 15 },
          stress: -10,
        },
        resultText: '{chef} ist enttäuscht: "Ich dachte, du willst dich entwickeln." {kollege} übernimmt, aber du hast eine Chance verpasst.',
      },
    ],
    tags: ['security', 'netzwerk', 'project', 'planning'],
  },
  {
    id: 'evt_weekend_alert',
    weekRange: [8, 8],
    dayPreference: [5],
    probability: 0.8,
    category: 'crisis',
    title: 'Freitagabend-Alert: Das Worst-Case-Szenario',
    description: `Freitag, 18:45. Du bist fast aus der Tür. Dann piept dein Handy.

"CRITICAL ALERT: Unusual login activity detected - Admin account"

Das Monitoring zeigt: Jemand hat sich mit dem Domain-Admin-Account angemeldet. Von einer externen IP. Und führt PowerShell-Befehle aus.

{chef} ist nicht erreichbar. Du bist der einzige vom IT-Team noch im Haus.

Die Uhr tickt.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'isolate_immediately',
        text: 'Sofort handeln: Betroffene Systeme isolieren, Account sperren',
        requires: { skill: 'security', threshold: 55 },
        effects: {
          skills: { security: 15, windows: 8, troubleshooting: 5 },
          relationships: { chef: 25, gf: 15 },
          stress: 35,
          compliance: 10,
        },
        resultText: 'Du sperrst den Account, isolierst die betroffenen Systeme. Die forensische Analyse zeigt: Es war ein Test von {chef}. "Gut reagiert", sagt er am Montag. "Du hast bestanden."',
        teachingMoment: 'Bei Security-Incidents: Erst isolieren, dann analysieren. Schnelles Handeln begrenzt Schäden.',
        setsFlags: ['incident_responder'],
        terminalCommand: true,
      },
      {
        id: 'analyze_first',
        text: 'Erstmal analysieren - vielleicht ist es ein False Positive',
        requires: { skill: 'security', threshold: 45 },
        effects: {
          skills: { security: 8 },
          relationships: { chef: -5 },
          stress: 20,
        },
        resultText: 'Du analysierst 20 Minuten. Es war ein Test. {chef}: "In der echten Welt wären das 20 Minuten, in denen der Angreifer sich ausbreitet."',
      },
      {
        id: 'call_chef',
        text: '{chef} wiederholt anrufen - das ist über meinem Paygrade',
        effects: {
          relationships: { chef: -15 },
          stress: 15,
        },
        resultText: '{chef} geht nach 10 Minuten ran. "Warum hast du nicht sofort gehandelt?!" Er ist enttäuscht. Der Test sollte deine Selbstständigkeit prüfen.',
      },
      {
        id: 'wait_for_monday',
        text: 'Dokumentieren und bis Montag warten - kann nicht so schlimm sein',
        effects: {
          relationships: { chef: -25, gf: -20 },
          stress: 10,
          compliance: -20,
        },
        resultText: '{chef} am Montag: "Du hast einen aktiven Einbruch ignoriert?!" Es war ein Test, aber deine Reaktion war ein Totalausfall.',
        teachingMoment: 'Security-Alerts niemals ignorieren. Lieber einmal zu viel reagieren als einmal zu wenig.',
      },
    ],
    terminalContext: {
      type: 'windows',
      hostname: 'DC01',
      username: 'admin',
      currentPath: 'C:\\>',
      commands: [
        {
          pattern: 'Get-ADUser.*-Filter|Get-EventLog.*Security',
          output: `Logon Event: Domain Admin
Time: 18:42:31
Source IP: 185.234.xx.xx (External!)
Status: Active session`,
          skillGain: { windows: 3, security: 3 },
        },
        {
          pattern: 'Disable-ADAccount|Set-ADAccountPassword -Reset',
          output: 'Account disabled successfully.',
          skillGain: { windows: 5, security: 5 },
          isSolution: true,
        },
        {
          pattern: 'Disconnect-.*Session|logoff',
          output: 'Session terminated.',
          skillGain: { windows: 3 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['Disable-ADAccount', 'Disconnect'],
          allRequired: true,
          resultText: 'Account gesperrt, Session beendet. Der Angreifer ist draußen.',
          skillGain: { security: 10, windows: 5 },
          effects: { compliance: 10, stress: -10 },
        },
      ],
      hints: [
        'Tipp: Get-EventLog -LogName Security zeigt Login-Events',
        'Tipp: Ein kompromittierter Admin-Account muss sofort gesperrt werden',
        'Tipp: Die aktive Session muss auch beendet werden',
      ],
    },
    tags: ['security', 'incident', 'crisis', 'terminal'],
  },
];
