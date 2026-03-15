import { GameEvent } from '@kritis/shared';

export const week9to12Events: GameEvent[] = [
  // ============================================
  // WEEK 9 - Crisis Escalation
  // ============================================
  {
    id: 'evt_security_breach_alert',
    weekRange: [9, 9],
    dayPreference: [1],
    probability: 1,
    category: 'security',
    title: 'Alarmstufe Rot',
    description: `Montagmorgen, 6:47 Uhr. Dein Handy klingelt. {chef} klingt angespannt.

"Wir haben ein Problem. Das SIEM hat in der Nacht 3.000 Alerts generiert. Unser Firewall-Log zeigt ausgehende Verbindungen zu einer IP in Osteuropa. Von einem Server im Wasserwerk-Netz."

Du bist sofort hellwach. Das könnte ein echter Sicherheitsvorfall sein - oder ein False Positive.

"Ich bin in 20 Minuten da", sagst du. Wie gehst du vor?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'isolate_immediately',
        text: 'Server sofort vom Netz trennen (Netzwerksegment isolieren)',
        requires: { skill: 'security', threshold: 50 },
        effects: {
          skills: { security: 10, netzwerk: 5 },
          stress: 20,
          relationships: { chef: 15 },
          compliance: 10
        },
        resultText: 'Du rufst die Netzwerk-Dokumentation auf und isolierst das VLAN über den Core-Switch. Der Server ist offline - und damit auch potenzielle Angreifer.',
        teachingMoment: 'Bei Verdacht auf Kompromittierung: Erst isolieren, dann analysieren. Evidenz sichern ist wichtiger als schnelles Fixen.',
        setsFlags: ['security_incident_handled_well'],
      },
      {
        id: 'investigate_first',
        text: 'Erst die Logs analysieren bevor ich drastische Maßnahmen ergreife',
        effects: {
          skills: { security: 5, troubleshooting: 5 },
          stress: 30,
          relationships: { chef: -5 }
        },
        resultText: 'Du analysierst zwei Stunden lang Logs. Die Verbindungen waren real - ein kompromittierter Dienst. Die Verzögerung könnte Daten gekostet haben.',
        teachingMoment: 'Bei kritischer Infrastruktur gilt: Im Zweifel lieber zu vorsichtig als zu spät reagieren.',
      },
      {
        id: 'call_bsi',
        text: 'Sofort BSI-Meldepflicht prüfen und ggf. melden',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          skills: { security: 8, softSkills: 5 },
          stress: 25,
          compliance: 15,
          relationships: { gf: 10, chef: 5 }
        },
        resultText: 'Du informierst {chef} über die Meldepflicht nach IT-Sicherheitsgesetz. Die fristgerechte Meldung schützt die Gemeinde vor Bußgeldern.',
        teachingMoment: 'KRITIS-Betreiber haben Meldepflicht bei IT-Sicherheitsvorfällen. 72 Stunden Frist beachten!',
        setsFlags: ['bsi_notified'],
      },
    ],
    tags: ['security', 'kritis', 'incident', 'critical'],
  },
  {
    id: 'evt_budget_cut_announcement',
    weekRange: [9, 9],
    dayPreference: [3],
    probability: 0.95,
    category: 'budget',
    title: 'Haushaltskonsolidierung',
    description: `{kaemmerer} hat eine E-Mail an alle Abteilungsleiter geschickt. {chef} leitet sie dir weiter.

"Aufgrund der angespannten Haushaltslage müssen alle Abteilungen 15% ihrer geplanten Ausgaben einsparen. Die IT-Abteilung wird gebeten, einen Sparvorschlag bis Ende der Woche einzureichen."

{chef} seufzt. "Wir haben gerade erst das neue Backup-System eingeplant. Und die Firewall-Lizenzen laufen nächstes Jahr aus. Was können wir streichen?"`,
    involvedCharacters: ['chef', 'kaemmerer'],
    choices: [
      {
        id: 'cut_training',
        text: 'Schulungsbudget streichen - wir lernen im Job',
        effects: {
          budget: 5000,
          skills: { softSkills: -5 },
          relationships: { kaemmerer: 10, kollegen: -10 }
        },
        resultText: 'Der Kämmerer ist zufrieden. Die Kollegen weniger - die geplante Linux-Schulung fällt aus.',
      },
      {
        id: 'negotiate_partial',
        text: 'Mit dem Kämmerer verhandeln - 10% statt 15%',
        requires: { skill: 'softSkills', threshold: 45 },
        effects: {
          budget: 2500,
          relationships: { kaemmerer: 5, chef: 10 },
          skills: { softSkills: 5 }
        },
        resultText: 'Du präsentierst {kaemmerer} die KRITIS-Anforderungen. Er willigt ein, die Einsparung auf 10% zu reduzieren.',
        teachingMoment: 'Gute Argumentation mit Compliance-Anforderungen kann Budget-Diskussionen gewinnen.',
        setsFlags: ['negotiated_budget'],
      },
      {
        id: 'propose_alternative',
        text: 'Alternativen vorschlagen: Open-Source statt teurer Lizenzen',
        requires: { skill: 'linux', threshold: 40 },
        effects: {
          budget: 3000,
          skills: { linux: 5 },
          relationships: { kaemmerer: 15, chef: 5 }
        },
        resultText: 'Du schlägst vor, einige Windows-Server auf Linux zu migrieren. Die Lizenzkosten sinken, die Anforderungen werden erfüllt.',
        teachingMoment: 'Open-Source kann Kosten sparen - aber nur wenn das Know-how vorhanden ist.',
        setsFlags: ['linux_migration_planned'],
      },
    ],
    tags: ['budget', 'politics', 'kaemmerer'],
  },
  {
    id: 'evt_critical_dependency',
    weekRange: [9, 9],
    dayPreference: [4],
    probability: 0.9,
    category: 'crisis',
    title: 'Das Kartenhaus',
    description: `Du dokumentierst gerade die Netzwerk-Topologie, als dir etwas auffällt.

Der zentrale Datenbankserver, auf dem ALLE kritischen Anwendungen laufen - Wasserwerk-Steuerung, Finanzwesen, Bürgerdienste - hat keinen Failover. Kein Cluster. Keine Redundanz.

Wenn diese eine Maschine ausfällt, steht die komplette Verwaltung still.

Du überprüfst das Datum der letzten Wartung: Vor 847 Tagen.

Was tust du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'immediate_backup_plan',
        text: 'Sofort Notfall-Backup-Konzept erstellen',
        effects: {
          skills: { troubleshooting: 10, netzwerk: 5 },
          stress: 15,
          compliance: 5
        },
        resultText: 'Du erstellst ein Notfallkonzept mit Cold-Standby-Möglichkeit. Nicht perfekt, aber besser als nichts.',
        setsFlags: ['backup_concept_created'],
      },
      {
        id: 'propose_cluster',
        text: 'Cluster-Lösung für das nächste Budget vorschlagen',
        requires: { skill: 'netzwerk', threshold: 50 },
        effects: {
          skills: { netzwerk: 5 },
          relationships: { chef: 10 },
          budget: -8000
        },
        resultText: '{chef} genehmigt die Cluster-Planung. "Das hätte schon längst passieren müssen. Gut erkannt."',
        teachingMoment: 'Single Points of Failure in KRITIS-Umgebungen sind ein kritisches Risiko. Redundanz ist Pflicht.',
        setsFlags: ['cluster_approved'],
      },
      {
        id: 'document_risk',
        text: 'Risiko dokumentieren und an GF eskalieren',
        effects: {
          skills: { softSkills: 5 },
          relationships: { gf: 5, chef: -5 },
          compliance: 10
        },
        resultText: 'Du eskalierst das Risiko schriftlich. {gf} ist alarmiert. {chef} fühlt sich übergangen.',
        teachingMoment: 'Manchmal muss man eskalieren - aber vorher den direkten Vorgesetzten informieren.',
      },
    ],
    tags: ['infrastructure', 'risk', 'kritis'],
  },
  {
    id: 'evt_staff_shortage',
    weekRange: [9, 9],
    dayPreference: [5],
    probability: 0.85,
    category: 'team',
    title: 'Personalengpass',
    description: `{chef} ruft dich ins Büro. Er sieht müde aus.

"Schlechte Nachrichten. Müller geht in Rente, Ende des Monats. Und Schneider hat heute gekündigt - geht in die Privatwirtschaft, doppeltes Gehalt."

Er reibt sich die Schläfen. "Das bedeutet: Wir sind zu dritt für alles. Server, Support, Sicherheit, Projekte. Bis eine Neubesetzung durch ist, vergehen Monate."

Wie reagierst du?`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'offer_overtime',
        text: '"Ich übernehme zusätzliche Aufgaben. Wir schaffen das."',
        effects: {
          stress: 25,
          relationships: { chef: 15, kollegen: 5 }
        },
        resultText: '{chef} lächelt erschöpft. "Danke. Ich wusste, dass ich mich auf dich verlassen kann. Aber pass auf dich auf."',
        setsFlags: ['took_extra_work'],
      },
      {
        id: 'prioritize_critical',
        text: 'Vorschlagen, nur noch KRITIS-kritische Aufgaben zu bearbeiten',
        requires: { skill: 'softSkills', threshold: 35 },
        effects: {
          skills: { softSkills: 5 },
          relationships: { chef: 10, fachabteilung: -10 }
        },
        resultText: 'Ihr erstellt eine Priorisierung. Die Fachabteilungen werden nicht glücklich sein, aber die kritische Infrastruktur hat Vorrang.',
        teachingMoment: 'In Krisensituationen: Priorisieren statt alles halb machen.',
      },
      {
        id: 'suggest_external',
        text: 'Externen Support oder Managed Services vorschlagen',
        effects: {
          budget: -3000,
          skills: { softSkills: 3 },
          relationships: { chef: 5 }
        },
        resultText: 'Du recherchierst Managed Service Optionen. {chef} findet den Ansatz interessant, aber das Budget ist knapp.',
      },
    ],
    tags: ['team', 'personal', 'crisis'],
  },

  // ============================================
  // WEEK 10 - Audit & Politics
  // ============================================
  {
    id: 'evt_bsi_audit_day',
    weekRange: [10, 10],
    dayPreference: [1, 2],
    probability: 1,
    category: 'compliance',
    title: 'BSI-Audit',
    description: `Der Tag ist gekommen. Zwei Prüfer vom BSI stehen vor der Tür.

"Guten Tag. Wir sind hier für die IT-Sicherheitsprüfung nach BSI-Grundschutz für KRITIS-Betreiber."

Sie haben Checklisten. Viele Checklisten. Und sie wollen alles sehen: Dokumentation, Prozesse, Server, Backups, Notfallpläne.

{chef} flüstert dir zu: "Das wird ein langer Tag. Zeig ihnen, was wir haben."`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'confident_presentation',
        text: 'Selbstbewusst die Dokumentation präsentieren',
        requires: { skill: 'softSkills', threshold: 50 },
        effects: {
          skills: { softSkills: 10, security: 5 },
          compliance: 15,
          relationships: { chef: 10, gf: 10 }
        },
        resultText: 'Du führst die Prüfer souverän durch die Systeme. Sie nicken anerkennend bei der Backup-Dokumentation.',
        teachingMoment: 'Gute Dokumentation ist die halbe Miete bei Audits. Die andere Hälfte: Souveränes Auftreten.',
        setsFlags: ['audit_went_well'],
      },
      {
        id: 'honest_gaps',
        text: 'Ehrlich Lücken zugeben und Maßnahmenplan präsentieren',
        requires: { skill: 'security', threshold: 40 },
        effects: {
          skills: { security: 8, softSkills: 5 },
          compliance: 10,
          relationships: { chef: 5 }
        },
        resultText: 'Die Prüfer schätzen deine Ehrlichkeit. "Wir sehen, dass Sie die Probleme erkannt haben. Der Maßnahmenplan ist solide."',
        teachingMoment: 'Auditoren mögen keine Überraschungen. Ehrlichkeit mit Lösungsvorschlag wirkt professioneller als Vertuschen.',
      },
      {
        id: 'nervous_performance',
        text: 'Versuchen, alles perfekt darzustellen',
        effects: {
          stress: 20,
          compliance: -5,
          relationships: { chef: -5 }
        },
        resultText: 'Die Prüfer merken, dass etwas nicht stimmt. Bei der Nachfrage zur Backup-Frequenz gerätst du ins Schwitzen.',
      },
    ],
    tags: ['audit', 'bsi', 'compliance', 'kritis'],
  },
  {
    id: 'evt_system_upgrade_decision',
    weekRange: [10, 10],
    dayPreference: [3],
    probability: 0.95,
    category: 'politics',
    title: 'Die Grundsatzentscheidung',
    description: `Das Wasserwerk-Leitsystem muss erneuert werden. Die aktuelle Software ist 15 Jahre alt und wird nicht mehr unterstützt.

Zwei Optionen liegen auf dem Tisch:

**Option A:** Proprietäres System von Siemens. Teuer (180.000 EUR), aber "bewährt" und mit Support.

**Option B:** Open-Source-basierte Lösung (SCADA-LTS). Günstiger (60.000 EUR), aber erfordert mehr interne Expertise.

{gf} und {kaemmerer} sitzen mit am Tisch. Die Entscheidung wird auch politisch bewertet.`,
    involvedCharacters: ['chef', 'gf', 'kaemmerer'],
    choices: [
      {
        id: 'recommend_proprietary',
        text: 'Siemens empfehlen - Sicherheit geht vor',
        effects: {
          budget: -180000,
          relationships: { gf: 10, kaemmerer: -10 },
          skills: { softSkills: 3 }
        },
        resultText: '{gf} nickt zufrieden. {kaemmerer} rechnet kopfschüttelnd. "Das sprengt den Haushaltsplan..."',
      },
      {
        id: 'recommend_opensource',
        text: 'Open-Source empfehlen - mit Schulungskonzept',
        requires: { skill: 'linux', threshold: 50 },
        effects: {
          budget: -70000,
          relationships: { kaemmerer: 15, chef: 10 },
          skills: { linux: 10 }
        },
        resultText: 'Du präsentierst einen detaillierten Migrationsplan. {kaemmerer} ist begeistert von den Einsparungen.',
        teachingMoment: 'Open-Source in KRITIS erfordert Expertise, kann aber langfristig Unabhängigkeit und Kosten sparen.',
        setsFlags: ['opensource_scada_chosen'],
      },
      {
        id: 'request_time',
        text: 'Um mehr Zeit für eine fundierte Analyse bitten',
        effects: {
          skills: { softSkills: 5 },
          relationships: { gf: -5, chef: 5 }
        },
        resultText: '{gf} runzelt die Stirn. "Die Entscheidung duldet keinen Aufschub." {chef} verteidigt dich: "Gründlichkeit ist hier wichtig."',
      },
    ],
    tags: ['decision', 'budget', 'scada', 'kritis'],
  },
  {
    id: 'evt_political_pressure',
    weekRange: [10, 10],
    dayPreference: [4],
    probability: 0.9,
    category: 'politics',
    title: 'Druck von oben',
    description: `{gf} bittet dich in sein Büro. Ungewöhnlich - normalerweise läuft alles über {chef}.

"Setzen Sie sich. Ich habe gehört, Sie machen gute Arbeit." Er macht eine Pause. "Ich brauche einen Gefallen. Der Bürgermeister hat angefragt, ob wir nicht schnell eine Bürger-App einführen können. Vor der Wahl im Herbst. Andere Gemeinden haben das schon."

Er schaut dich erwartungsvoll an. "Das wäre gut für die Verwaltung. Und für meine Position."`,
    involvedCharacters: ['gf'],
    choices: [
      {
        id: 'agree_quickly',
        text: '"Ich schaue, was sich machen lässt."',
        effects: {
          stress: 20,
          relationships: { gf: 15, chef: -10 }
        },
        resultText: '{gf} strahlt. "Ausgezeichnet! Ich wusste, dass Sie der Richtige sind." Du fragst dich, wie du das zeitlich schaffen sollst.',
        setsFlags: ['promised_citizen_app'],
      },
      {
        id: 'professional_concern',
        text: 'Sicherheitsbedenken äußern - Bürgerdaten sind sensibel',
        requires: { skill: 'security', threshold: 45 },
        effects: {
          skills: { security: 5, softSkills: 5 },
          relationships: { gf: -5, chef: 10 }
        },
        resultText: '{gf} ist nicht begeistert, aber du erklärst die DSGVO-Anforderungen. "Na gut, dann eben ordentlich. Aber schnell."',
        teachingMoment: 'Auch politischer Druck rechtfertigt keine Abkürzungen bei IT-Sicherheit.',
      },
      {
        id: 'redirect_to_chef',
        text: 'Vorschlagen, das über den Dienstweg zu besprechen',
        effects: {
          relationships: { gf: -10, chef: 5 },
          skills: { softSkills: 3 }
        },
        resultText: '{gf} ist verärgert. "Ich dachte, Sie sind flexibler." Aber du hast deinen Chef nicht übergangen.',
        teachingMoment: 'Den Dienstweg einzuhalten schützt vor politischen Spielchen.',
      },
    ],
    tags: ['politics', 'gf', 'pressure'],
  },
  {
    id: 'evt_vendor_renegotiation',
    weekRange: [10, 10],
    dayPreference: [5],
    probability: 0.85,
    category: 'budget',
    title: 'Vertragspoker',
    description: `Die Lizenzen für die zentrale Verwaltungssoftware laufen aus. Der Hersteller hat ein "Erneuerungsangebot" geschickt: 40% mehr als bisher.

"Marktübliche Anpassung", nennen sie es.

{chef} hat dich gebeten, die Verhandlung zu führen. Der Vertriebsmensch der Firma sitzt jetzt vor dir, lächelnd.

"Wir schätzen die lange Partnerschaft mit der Gemeinde sehr. Diese Preisanpassung ist wirklich moderat, wenn Sie bedenken..."`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'hardball_negotiate',
        text: 'Hart verhandeln - Wettbewerber recherchiert',
        requires: { skill: 'softSkills', threshold: 55 },
        effects: {
          skills: { softSkills: 10 },
          budget: 8000,
          relationships: { chef: 15, kaemmerer: 10 }
        },
        resultText: 'Du legst Angebote der Konkurrenz auf den Tisch. Der Vertriebsmensch wird blass. "+15% ist das Maximum."',
        teachingMoment: 'Verhandlungsmacht kommt aus Alternativen. Immer den Markt kennen.',
        setsFlags: ['great_negotiator'],
      },
      {
        id: 'accept_with_conditions',
        text: 'Akzeptieren, aber zusätzliche Leistungen fordern',
        effects: {
          budget: 3000,
          skills: { softSkills: 5 },
          relationships: { chef: 5 }
        },
        resultText: 'Du akzeptierst die Erhöhung, bekommst aber kostenlose Schulungen und verlängerten Support dazu.',
      },
      {
        id: 'accept_defeat',
        text: 'Zähneknirschend akzeptieren - keine Alternative',
        effects: {
          budget: -5000,
          stress: 10,
          relationships: { kaemmerer: -5 }
        },
        resultText: 'Der Vertriebsmensch freut sich. Du unterschreibst. {kaemmerer} wird nicht begeistert sein.',
      },
    ],
    tags: ['budget', 'vendor', 'negotiation'],
  },

  // ============================================
  // WEEK 11 - Preparation & Relationships
  // ============================================
  {
    id: 'evt_crisis_simulation',
    weekRange: [11, 11],
    dayPreference: [1, 2],
    probability: 1,
    category: 'crisis',
    title: 'Feuerprobe',
    description: `{chef} hat eine Überraschung: Eine angekündigte Krisenübung. Heute.

"Das BSI empfiehlt regelmäßige Notfallübungen. Also: Stell dir vor, unser Rechenzentrum brennt. Alle Server offline. Was tun wir?"

Die Kollegen schauen dich erwartungsvoll an. {chef} hat die Stoppuhr gestartet.

"Die Zeit läuft. Erste Maßnahme?"`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'structured_response',
        text: 'Notfallplan aktivieren, Kommunikationskette starten',
        requires: { skill: 'troubleshooting', threshold: 50 },
        effects: {
          skills: { troubleshooting: 10, softSkills: 5 },
          relationships: { chef: 15, kollegen: 10 }
        },
        resultText: 'Du holst den Notfallordner, weist Rollen zu, rufst die Bereitschaftsliste ab. {chef} nickt anerkennend.',
        teachingMoment: 'Strukturierte Reaktion schlägt panisches Aktivismus. Notfallpläne vorher lesen!',
        setsFlags: ['crisis_simulation_excellent'],
      },
      {
        id: 'technical_focus',
        text: 'Sofort Backup-Wiederherstellung planen',
        requires: { skill: 'linux', threshold: 45 },
        effects: {
          skills: { linux: 8, troubleshooting: 3 },
          relationships: { chef: 5, kollegen: 5 }
        },
        resultText: 'Du skizzierst die Recovery-Reihenfolge. Gut, aber {chef} erinnert: "Erst Kommunikation, dann Technik."',
      },
      {
        id: 'panic_mode',
        text: 'Improvisieren - "Äh, erstmal schauen was noch geht?"',
        effects: {
          stress: 15,
          relationships: { chef: -10, kollegen: -5 }
        },
        resultText: 'Die Übung zeigt Lücken. {chef} seufzt. "Wir müssen den Notfallplan nochmal durchgehen. Alle zusammen."',
      },
    ],
    tags: ['crisis', 'training', 'notfall'],
  },
  {
    id: 'evt_documentation_review',
    weekRange: [11, 11],
    dayPreference: [3],
    probability: 0.95,
    category: 'compliance',
    title: 'Papierkram',
    description: `Das BSI-Audit hat Dokumentationslücken aufgezeigt. {chef} hat dir die Liste gegeben:

- Netzwerkdokumentation: veraltet
- Backup-Konzept: unvollständig
- Berechtigungsmatrix: fehlt
- Notfallhandbuch: lückenhaft

"Das muss bis Ende der Woche fertig sein. Für die Nachprüfung."

Du schaust auf den Berg Arbeit. Drei Tage Zeit.`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'systematic_documentation',
        text: 'Systematisch abarbeiten mit Confluence-Vorlagen',
        effects: {
          skills: { troubleshooting: 5, softSkills: 3 },
          stress: 20,
          compliance: 15
        },
        resultText: 'Du erstellst saubere Dokumentation. Nächte werden kurz, aber das Ergebnis ist vorzeigbar.',
        setsFlags: ['documentation_complete'],
      },
      {
        id: 'delegate_parts',
        text: 'Aufgaben verteilen - Kollegen einbinden',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: {
          skills: { softSkills: 8 },
          stress: 10,
          compliance: 10,
          relationships: { kollegen: 5 }
        },
        resultText: 'Du verteilst die Arbeit fair. Gemeinsam schafft ihr mehr. Die Dokumentation ist rechtzeitig fertig.',
        teachingMoment: 'Delegation ist keine Schwäche, sondern Führungskompetenz.',
      },
      {
        id: 'minimum_effort',
        text: 'Nur das Nötigste dokumentieren - Zeit sparen',
        effects: {
          stress: 5,
          compliance: 5,
          relationships: { chef: -5 }
        },
        resultText: 'Die Dokumentation ist dünn. Das BSI wird nachfragen müssen.',
      },
    ],
    tags: ['documentation', 'compliance', 'bsi'],
  },
  {
    id: 'evt_kaemmerer_confrontation',
    weekRange: [11, 11],
    dayPreference: [4],
    probability: 0.9,
    category: 'politics',
    title: 'Zahlen, bitte',
    description: `{kaemmerer} hat dich in sein Büro zitiert. Er schaut auf einen Stapel Rechnungen.

"Können Sie mir erklären, warum die IT-Kosten dieses Jahr 23% über Plan liegen?"

Er schiebt dir die Aufstellung hin. Tatsächlich: Die Sicherheitsinvestitionen nach dem Vorfall, die neue Backup-Hardware, die Notfall-Lizenzen...

"Der Gemeinderat wird fragen. Ich brauche Antworten."`,
    involvedCharacters: ['kaemmerer'],
    choices: [
      {
        id: 'justify_investments',
        text: 'Investitionen mit Risikovermeidung rechtfertigen',
        requires: { skill: 'softSkills', threshold: 50 },
        effects: {
          skills: { softSkills: 10, security: 3 },
          relationships: { kaemmerer: 15 }
        },
        resultText: 'Du rechnest vor, was ein erfolgreicher Angriff kosten würde. {kaemmerer} wird nachdenklich. "Das... ist ein Argument."',
        teachingMoment: 'IT-Sicherheit in Geld zu übersetzen ist eine der wichtigsten Fähigkeiten für IT-Leiter.',
        setsFlags: ['kaemmerer_convinced'],
      },
      {
        id: 'blame_circumstances',
        text: 'Auf unvorhergesehene Umstände verweisen',
        effects: {
          relationships: { kaemmerer: -5 },
          stress: 10
        },
        resultText: '{kaemmerer} seufzt. "Das sagen alle. Ich brauche konkrete Zahlen, keine Ausreden."',
      },
      {
        id: 'offer_savings_plan',
        text: 'Konkreten Sparplan für nächstes Jahr anbieten',
        effects: {
          skills: { softSkills: 5 },
          relationships: { kaemmerer: 10, chef: 5 },
          budget: 2000
        },
        resultText: 'Du präsentierst einen realistischen Plan. {kaemmerer} ist zufrieden. "Das kann ich dem Gemeinderat präsentieren."',
      },
    ],
    tags: ['budget', 'politics', 'kaemmerer'],
  },
  {
    id: 'evt_modernization_proposal',
    weekRange: [11, 11],
    dayPreference: [5],
    probability: 0.85,
    category: 'politics',
    title: 'Zukunftsvision',
    description: `{chef} bittet dich, eine Präsentation für den Gemeinderat vorzubereiten: "IT-Strategie 2025-2030".

"Das ist deine Chance zu zeigen, was du kannst. Die Räte entscheiden über unsere Zukunft - Personal, Budget, Projekte."

Du hast das Wochenende Zeit. Was ist dein Fokus?`,
    involvedCharacters: ['chef', 'gf'],
    choices: [
      {
        id: 'security_focus',
        text: 'Fokus auf IT-Sicherheit und KRITIS-Compliance',
        requires: { skill: 'security', threshold: 45 },
        effects: {
          skills: { security: 5, softSkills: 5 },
          relationships: { chef: 10, gf: 5 },
          compliance: 10
        },
        resultText: 'Deine Präsentation zeigt die Bedrohungslage und nötige Investitionen. Der Rat ist beeindruckt.',
        setsFlags: ['security_strategy_presented'],
      },
      {
        id: 'efficiency_focus',
        text: 'Fokus auf Digitalisierung und Effizienzgewinne',
        effects: {
          skills: { softSkills: 5 },
          relationships: { kaemmerer: 10, gf: 10 }
        },
        resultText: 'Du zeigst Einsparpotenziale durch Automatisierung. {kaemmerer} nickt zustimmend.',
      },
      {
        id: 'balanced_approach',
        text: 'Ausgewogene Strategie: Sicherheit, Effizienz, Innovation',
        requires: { skill: 'softSkills', threshold: 55 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { chef: 15, gf: 10, kaemmerer: 5 }
        },
        resultText: 'Deine Präsentation überzeugt auf allen Ebenen. {gf} flüstert {chef} zu: "Den müssen wir halten."',
        teachingMoment: 'Strategische Kommunikation berücksichtigt alle Stakeholder.',
        setsFlags: ['excellent_presentation'],
      },
    ],
    tags: ['strategy', 'presentation', 'career'],
  },

  // ============================================
  // WEEK 12 - Final Week (Probation Decision)
  // ============================================
  {
    id: 'evt_final_evaluation_meeting',
    weekRange: [12, 12],
    dayPreference: [1],
    probability: 1,
    category: 'personal',
    title: 'Das Gespräch',
    description: `Montagmorgen. {chef} bittet dich in sein Büro. Die Tür ist zu. Das ist selten.

"Setz dich. Wie du weißt, endet deine Probezeit am Freitag."

Er blättert in einer Akte. Deiner Akte.

"Ich möchte mir ein Bild machen. Wie siehst du selbst deine ersten drei Monate hier?"`,
    involvedCharacters: ['chef'],
    choices: [
      {
        id: 'confident_reflection',
        text: 'Selbstbewusst Erfolge und Learnings nennen',
        requires: { skill: 'softSkills', threshold: 50 },
        effects: {
          skills: { softSkills: 5 },
          relationships: { chef: 10 }
        },
        resultText: 'Du zählst konkrete Erfolge auf - gelöste Incidents, verbesserte Dokumentation, bestandenes Audit. {chef} nickt.',
        setsFlags: ['good_self_evaluation'],
      },
      {
        id: 'humble_honest',
        text: 'Ehrlich über Fehler und Wachstum sprechen',
        effects: {
          skills: { softSkills: 8 },
          relationships: { chef: 15 }
        },
        resultText: '"Ich habe Fehler gemacht", sagst du, "aber daraus gelernt." {chef} lächelt. "Das ist die richtige Einstellung."',
        teachingMoment: 'Ehrliche Selbstreflexion zeigt Reife. Fehler zugeben ist keine Schwäche.',
        setsFlags: ['honest_reflection'],
      },
      {
        id: 'defensive',
        text: 'Defensiv auf Herausforderungen verweisen',
        effects: {
          relationships: { chef: -5 },
          stress: 10
        },
        resultText: '{chef} runzelt die Stirn. "Herausforderungen hatten wir alle. Die Frage ist, wie man damit umgeht."',
      },
    ],
    tags: ['career', 'evaluation', 'personal'],
  },
  {
    id: 'evt_gf_interview',
    weekRange: [12, 12],
    dayPreference: [2],
    probability: 1,
    category: 'politics',
    title: 'Beim Geschäftsführer',
    description: `{gf} hat dich zum Gespräch gebeten. Das ist ungewöhnlich - Probezeit-Entscheidungen laufen normalerweise über die Abteilungsleiter.

"Ich möchte Sie persönlich kennenlernen", sagt er. "Die IT ist das Rückgrat unserer Verwaltung. Ich muss wissen, wem ich vertrauen kann."

Er lehnt sich zurück. "Was würden Sie ändern, wenn Sie könnten?"`,
    involvedCharacters: ['gf'],
    choices: [
      {
        id: 'bold_vision',
        text: 'Mutige Vision für IT-Modernisierung präsentieren',
        requires: { skill: 'softSkills', threshold: 55 },
        effects: {
          skills: { softSkills: 10 },
          relationships: { gf: 20 }
        },
        resultText: 'Du sprichst von Cloud-Transformation, Automatisierung, digitaler Bürgernähe. {gf} ist beeindruckt.',
        setsFlags: ['impressed_gf'],
      },
      {
        id: 'practical_improvements',
        text: 'Konkrete, umsetzbare Verbesserungen vorschlagen',
        effects: {
          skills: { softSkills: 5 },
          relationships: { gf: 10 }
        },
        resultText: 'Du nennst realistische Projekte mit klarem ROI. {gf} nickt. "Pragmatisch. Das gefällt mir."',
      },
      {
        id: 'play_safe',
        text: 'Vorsichtig antworten - nicht zu viel versprechen',
        effects: {
          relationships: { gf: -5 }
        },
        resultText: '{gf} wirkt enttäuscht. "Ich hatte auf mehr Eigeninitiative gehofft."',
      },
    ],
    tags: ['career', 'politics', 'gf'],
  },
  {
    id: 'evt_final_emergency',
    weekRange: [12, 12],
    dayPreference: [3, 4],
    probability: 1,
    category: 'crisis',
    title: 'Die letzte Prüfung',
    description: `Mittwochabend, 22:15 Uhr. Dein Handy vibriert. Monitoring-Alarm.

Der Haupt-Datenbankserver zeigt RAID-Degraded. Eine Festplatte ist ausgefallen. Bei aktivem Schreibvorgang - die Monatsabrechnung der Wasserwerke läuft.

Du bist allein. {chef} ist im Urlaub, erster Tag. Die Kollegen nicht erreichbar.

Was tust du?`,
    involvedCharacters: [],
    choices: [
      {
        id: 'handle_alone',
        text: 'Selbst ins Rechenzentrum fahren und Festplatte tauschen',
        requires: { skill: 'linux', threshold: 55 },
        effects: {
          skills: { linux: 10, troubleshooting: 10 },
          stress: 25,
          relationships: { chef: 20, kollegen: 10 }
        },
        resultText: 'Du fährst ins Rechenzentrum, tauschst die Platte, startest den RAID-Rebuild. Um 3 Uhr ist alles stabil.',
        teachingMoment: 'Manchmal muss man selbst anpacken. Hot-Spare-Festplatten sind Gold wert.',
        setsFlags: ['handled_emergency_alone'],
      },
      {
        id: 'call_support',
        text: 'Hardware-Support des Herstellers anrufen',
        effects: {
          skills: { troubleshooting: 5 },
          stress: 15,
          budget: -1500
        },
        resultText: 'Der Support-Techniker kommt um 2 Uhr nachts. Die Festplatte wird getauscht. Teuer, aber erledigt.',
      },
      {
        id: 'disturb_chef',
        text: '{chef} im Urlaub anrufen',
        effects: {
          stress: 10,
          relationships: { chef: -15 }
        },
        resultText: '{chef} klingt verschlafen und genervt. Er erklärt dir den Prozess am Telefon. Es funktioniert, aber der Urlaub ist gestört.',
      },
    ],
    tags: ['emergency', 'hardware', 'crisis', 'linux'],
  },
  {
    id: 'evt_probation_decision',
    weekRange: [12, 12],
    dayPreference: [5],
    probability: 1,
    category: 'personal',
    title: 'Der letzte Tag',
    description: `Freitag. Dein letzter Tag in der Probezeit.

{chef} hat dich für 14 Uhr eingeladen. "Bring Zeit mit", hat er gesagt.

Du sitzt vor seinem Büro. Die Minuten ziehen sich.

Dann öffnet sich die Tür.

{chef} lächelt - oder nicht?`,
    involvedCharacters: ['chef', 'gf'],
    requires: {
      // This event always fires, but outcomes depend on accumulated stats
    },
    choices: [
      {
        id: 'ending_excellent',
        text: '[Voraussetzung: Hohe Skills & Beziehungen] Hereinkommen',
        requires: {
          skill: 'softSkills',
          threshold: 60
        },
        effects: {
          stress: -50,
          relationships: { chef: 20, gf: 20, kollegen: 20 }
        },
        resultText: `{chef} steht auf und schüttelt dir die Hand. "Herzlichen Glückwunsch. Du hast die Probezeit nicht nur bestanden - du hast sie mit Auszeichnung bestanden."

{gf} tritt ein. "Wir möchten Ihnen eine Festanstellung anbieten. Und in sechs Monaten... sprechen wir über die Stellvertretung der IT-Leitung."

Du hast es geschafft. Von Tag Eins bis heute - und die Reise geht weiter.

**ENDE: Der aufsteigende Stern**`,
        setsFlags: ['ending_excellent'],
      },
      {
        id: 'ending_good',
        text: '[Standard] Hereinkommen',
        effects: {
          stress: -30,
          relationships: { chef: 10 }
        },
        resultText: `{chef} nickt dir zu. "Setz dich. Ich mache es kurz: Du hast die Probezeit bestanden."

Er reicht dir den Vertrag. "Festanstellung. Du hast gute Arbeit geleistet. Nicht perfekt, aber solide. Willkommen im Team - richtig diesmal."

Du unterschreibst. Erleichterung. Du gehörst dazu.

**ENDE: Der solide Start**`,
        setsFlags: ['ending_good'],
      },
      {
        id: 'ending_warning',
        text: '[Voraussetzung: Niedrige Beziehungen] Hereinkommen',
        requires: {
          skill: 'softSkills',
          threshold: 25
        },
        effects: {
          stress: 20,
          relationships: { chef: -5 }
        },
        resultText: `{chef} sieht ernst aus. "Ich bin ehrlich mit dir. Es war knapp."

Er schiebt dir einen Vertrag hin. "Wir verlängern die Probezeit um drei Monate. Du hast Potenzial, aber auch Baustellen. Nutze die Zeit."

Keine Entlassung. Aber auch keine Sicherheit. Noch nicht.

**ENDE: Die zweite Chance**`,
        setsFlags: ['ending_warning'],
      },
      {
        id: 'ending_bad',
        text: '[Voraussetzung: Sehr niedrige Stats] Hereinkommen',
        requires: {
          skill: 'troubleshooting',
          threshold: 15
        },
        effects: {
          stress: 50
        },
        resultText: `{chef} vermeidet deinen Blick. "Es tut mir leid. Die Entscheidung ist gefallen."

Er schiebt dir ein Zeugnis hin. "Wir wünschen dir alles Gute für die Zukunft. Die Stelle... war vielleicht nicht die richtige für dich."

Du packst deinen Schreibtisch. Der Kaffee schmeckt bitter.

**ENDE: Das frühe Ende**

*Aber jede Ende ist auch ein Anfang. Neues Spiel, neues Glück?*`,
        setsFlags: ['ending_bad'],
      },
    ],
    tags: ['ending', 'career', 'final'],
  },
  {
    id: 'evt_colleague_farewell',
    weekRange: [12, 12],
    dayPreference: [5],
    probability: 0.8,
    requires: {
      relationships: { kollegen: 20 }
    },
    category: 'team',
    title: 'Feierabend',
    description: `Nach dem Gespräch mit {chef} kommen die Kollegen auf dich zu.

"Und? Wie ist es gelaufen?"

Du erzählst. Sie nicken, lächeln, klopfen dir auf die Schulter.

"Komm, wir gehen ein Bier trinken. Du hast es dir verdient."`,
    involvedCharacters: ['kollege'],
    choices: [
      {
        id: 'join_celebration',
        text: 'Mitgehen und feiern',
        effects: {
          stress: -20,
          relationships: { kollegen: 15 }
        },
        resultText: 'Ihr sitzt bis spät in der Kneipe. Geschichten werden erzählt, Insider-Witze geboren. Du gehörst dazu.',
        teachingMoment: 'Teambuilding passiert nicht im Meeting, sondern beim Feierabend-Bier.',
      },
      {
        id: 'raincheck',
        text: 'Absagen - brauchst Zeit zum Verarbeiten',
        effects: {
          stress: -10,
          relationships: { kollegen: -5 }
        },
        resultText: 'Die Kollegen verstehen. "Nächste Woche dann." Du gehst nach Hause, allein mit deinen Gedanken.',
      },
    ],
    tags: ['team', 'social', 'ending'],
  },
];
