import { GameEvent } from '@kritis/shared';

/**
 * Act 1 Story Events: Weeks 7-10 (Late Game Challenges)
 * E19-E23: Complex political and technical challenges
 */

export const storyWeek7to10Events: GameEvent[] = [
  // E19: Personalrat
  {
    id: 'evt_personalrat',
    weekRange: [7, 9],
    probability: 0.85,
    category: 'politics',
    title: 'Personalrat',
    description: `Der Personalrat will wissen, warum Baramundi "die PCs ueberwacht." Ein Mitarbeiter hat sich beschwert.

{chef} sagt: "Erklaer denen das mal."

Du sitzt jetzt vor drei Personalratsvertretern. Sie schauen skeptisch.

"Was genau kann dieses... Baramundi... sehen? Bildschirminhalte? Tastenanschlaege? Wann wir auf Toilette gehen?"`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'Baramundi/Endpoint Management und Personalrat: Betriebsvereinbarung ist der Koenigsweg. Definiere genau was inventarisiert wird, wer Zugriff hat, wie lange Daten gespeichert werden. Ohne BV bist du angreifbar.',
    choices: [
      {
        id: 'transparent_presentation',
        text: 'Transparente Erklaerung: Was kann es, was kann es NICHT',
        effects: { relationships: { kaemmerer: 5 }, compliance: 10, stress: 5 },
        resultText: 'Du zeigst live, was Baramundi erfasst: Installierte Software, Hardware-Inventar, Windows-Updates. "Keine Tastaturueberwachung, keine Screenshots, keine Aktivitaetstracking." Der Personalrat entspannt sich.',
        choiceTags: ['honest', 'professional'],
        setsFlags: ['personalrat_informed'],
        teachingMoment: 'Transparenz baut Vertrauen auf. Verstecken macht alles schlimmer.',
      },
      {
        id: 'minimize_details',
        text: 'Technische Details minimieren - "nur Softwareverteilung"',
        effects: { compliance: -5, stress: 3 },
        resultText: '"Es ist nur fuer Softwareverteilung." Der Personalrat nickt. Bis ein IT-affines Mitglied googelt und herausfindet, was Baramundi noch alles kann...',
        choiceTags: ['evasive'],
        chainTriggers: [{
          targetEventId: 'evt_personalrat_escalation',
          delayWeeks: 3,
          probability: 0.6,
          description: 'Incomplete information leads to escalation',
        }],
      },
      {
        id: 'betriebsvereinbarung',
        text: 'Betriebsvereinbarung vorschlagen',
        effects: { compliance: 15, stress: 10, relationships: { chef: 5, kaemmerer: -5 } },
        resultText: '"Wir sollten eine Betriebsvereinbarung aufsetzen. Das schuetzt alle Seiten." Der Personalrat ist beeindruckt. Extra Aufwand, aber rechtssicher.',
        choiceTags: ['by_the_book', 'thorough'],
        teachingMoment: 'Eine BV ist Arbeit, aber sie schuetzt vor spaeterer Eskalation.',
      },
    ],
    tags: ['story', 'politics', 'personalrat', 'compliance', 'week7'],
  },

  // E20: ELO-Workflow kaputt
  {
    id: 'evt_elo_workflow',
    weekRange: [7, 9],
    probability: 0.8,
    category: 'crisis',
    title: 'ELO-Workflow kaputt',
    description: `Das DMS (ELO) hat ein Problem: Rechnungsfreigaben haengen seit zwei Tagen.

Die Buchhaltung dreht durch. {kaemmerer} ruft persoenlich an:

"Wir koennen keine Rechnungen freigeben! Die Lieferanten drohen mit Mahnungen! FIX. THAT. NOW."

Du kennst ELO nicht gut. {kollege} kennt es besser. Der ELO-Support kostet 180 Euro pro Stunde.`,
    involvedCharacters: ['kollege', 'kaemmerer'],
    mentorNote: 'Systeme die du nicht kennst: Nicht heldenhaft selbst fixen. Herstellersupport nutzen und dabei LERNEN. Jedes Ticket das der Support loest, dokumentierst du als Runbook fuer naechstes Mal.',
    choices: [
      {
        id: 'self_debug',
        text: 'Selbst debuggen - kannst ja nicht so schwer sein',
        effects: { stress: 15 },
        resultText: 'Du wuehlst dich durch ELO-Logs. Nach einer Stunde findest du das Problem: Ein Workflow-Skript hat einen Timeout. Du fixst es. {kaemmerer} ist erleichtert.',
        choiceTags: ['heroic'],
        chainTriggers: [{
          targetEventId: 'evt_elo_fix_success',
          delayWeeks: 0,
          probability: 0.5,
          condition: 'state.skills.troubleshooting >= 35',
          description: 'Success depends on skill',
        }, {
          targetEventId: 'evt_elo_fix_failure',
          delayWeeks: 0,
          probability: 0.5,
          condition: 'state.skills.troubleshooting < 35',
          description: 'Failure if skill too low',
        }],
      },
      {
        id: 'call_support',
        text: 'ELO-Support anrufen - 180 Euro/Stunde',
        effects: { budget: -360, relationships: { kaemmerer: 5 }, skills: { troubleshooting: 5 } },
        resultText: 'Der Support findet das Problem in 30 Minuten: Datenbankindex fragmentiert. Du schaust zu und lernst. Teuer, aber lehrreich.',
        choiceTags: ['professional', 'learning'],
        teachingMoment: 'Support-Calls sind Lernmomente. Frag nach dem "Warum", nicht nur nach dem Fix.',
      },
      {
        id: 'ask_colleague',
        text: '{kollege} fragen - er kennt ELO besser',
        effects: { relationships: { kollegen: 5 }, stress: 5 },
        resultText: '{kollege} schaut sich das an. "Ah, der Workflow-Server. Neustart hilft meist." Er hat recht. Problem geloest.',
        choiceTags: ['teamwork'],
      },
    ],
    tags: ['story', 'crisis', 'dms', 'week7'],
  },

  // E21: Datenschutzanfrage
  {
    id: 'evt_datenschutzanfrage',
    weekRange: [7, 10],
    probability: 0.75,
    category: 'compliance',
    title: 'Datenschutzanfrage',
    description: `Ein Buerger stellt einen DSGVO-Auskunftsantrag: Welche Daten hat WARM ueber ihn?

Du hast 30 Tage Zeit zu antworten.

Das Problem: Die Daten liegen in 4 verschiedenen Systemen. Die Fachabteilungen wissen nicht genau, was wo gespeichert ist. Der Datenschutzbeauftragte ist nur halbtags da.`,
    involvedCharacters: ['chef'],
    mentorNote: 'DSGVO-Auskunft: Immer den DSB einschalten. Das ist SEIN Job. Du unterstuetzt technisch (Systemsuche), aber die Koordination und Antwort laeuft ueber den DSB. Dokumentiere den Prozess - naechstes Mal gehts schneller.',
    choices: [
      {
        id: 'systematic_search',
        text: 'Alle Systeme systematisch durchsuchen',
        effects: { stress: 10, compliance: 15, skills: { troubleshooting: 3 } },
        resultText: 'Du gehst System fuer System durch: Fachverfahren, DMS, Fileserver, Email-Archiv. Nach einer Woche hast du alles. Viel Arbeit, aber vollstaendig.',
        choiceTags: ['thorough'],
      },
      {
        id: 'ask_departments',
        text: 'Fachabteilungen anfragen - die kennen ihre Daten',
        effects: { stress: 5, compliance: 5, relationships: { fachabteilung: -5 } },
        resultText: 'Du schickst Rundmails an die Abteilungen. Die Antworten kommen... sporadisch. Manche gar nicht. Die Frist wird knapp.',
        choiceTags: ['delegating'],
      },
      {
        id: 'involve_dsb',
        text: 'Datenschutzbeauftragten einschalten',
        effects: { compliance: 10, stress: 3 },
        resultText: 'Du rufst den DSB an. "Das ist mein Job, danke fuer die Info. Ich koordiniere die Fachabteilungen, du hilfst bei der Technik." So sollte es laufen.',
        choiceTags: ['correct', 'professional'],
        teachingMoment: 'Rollen respektieren: Der DSB ist fuer Datenschutz zustaendig, nicht die IT.',
        setsFlags: ['dsb_involved_properly'],
      },
    ],
    tags: ['story', 'compliance', 'dsgvo', 'week7'],
  },

  // E22: Die Weihnachtsfeier-Mail
  {
    id: 'evt_weihnachtsfeier_mail',
    weekRange: [8, 9],
    probability: 0.7,
    category: 'absurd',
    title: 'Die Weihnachtsfeier-Mail',
    description: `Jemand hat eine "Einladung zur Weihnachtsfeier" an ALLE geschickt.

Mit einem Excel-Anhang. In dem Excel ist ein Makro. Sophos schlaegt nicht an - es ist kein Virus, nur ein schlecht programmiertes VBA-Formular fuer Essenswuensche.

"Bitte Dropdown waehlen: Fleisch / Vegetarisch / Vegan"

{kollege} grinst: "Klassiker. Jedes Jahr."`,
    involvedCharacters: ['kollege'],
    mentorNote: 'Makro-Policies: Goldener Mittelweg mit Baramundi - Makros per Default blocken, Whitelist fuer signierte Makros von definierten Quellen. Nie komplett blockieren ohne die Fachanwendungen zu pruefen.',
    choices: [
      {
        id: 'macro_policy',
        text: 'Makro-Richtlinie verschaerfen - keine Makros mehr',
        effects: { compliance: 10, stress: 3 },
        resultText: 'Du konfigurierst Baramundi: Makros per Default geblockt. Problem: SFirm braucht Makros. Die Buchhaltung ist nicht amused.',
        choiceTags: ['strict'],
        chainTriggers: [{
          targetEventId: 'evt_macro_conflict',
          delayWeeks: 1,
          description: 'Macro policy conflicts with business needs',
        }],
      },
      {
        id: 'replace_excel',
        text: 'Excel entfernen, saubere Version an alle schicken',
        effects: { relationships: { kollegen: 5 }, stress: 5 },
        resultText: 'Du erstellst schnell ein makrofreies Formular und schickst es an alle. "Bitte diese Version verwenden." Pragmatische Loesung.',
        choiceTags: ['pragmatic'],
      },
      {
        id: 'awareness_mail',
        text: 'Awareness-Mail: Bitte keine Makro-Excels verschicken',
        effects: { compliance: 3 },
        resultText: 'Du schickst eine freundliche Erinnerung. Niemand liest sie. Naechstes Jahr: Gleiche Situation.',
        choiceTags: ['ineffective'],
      },
    ],
    tags: ['story', 'absurd', 'security', 'macros', 'week8'],
  },

  // E23: Externer Dienstleister
  {
    id: 'evt_externer_dienstleister',
    weekRange: [7, 10],
    probability: 0.8,
    category: 'security',
    title: 'Externer Dienstleister',
    description: `Ein externer IT-Dienstleister soll die Netzwerk-Switches konfigurieren.

Er braucht:
- VPN-Zugang ins Netz
- Admin-Rechte auf die Switches
- Zugriff fuer "ca. 2 Wochen"

{chef} sagt: "Gib ihm Zugang, wir haben das beauftragt."

Der Dienstleister wartet auf seine Credentials.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Externe Dienstleister: Eigene Zugaenge, zeitlich begrenzt, auf das noetige Segment beschraenkt. NIE geteilte Credentials. Bei KRITIS: Nachweispflicht wer wann auf was zugegriffen hat. Geteilte Accounts machen das unmoeglich.',
    choices: [
      {
        id: 'dedicated_access',
        text: 'Eigenes VPN-Profil mit Zeitlimit + nur Management-VLAN',
        effects: { compliance: 10, stress: 10, relationships: { chef: -3 } },
        resultText: 'Du richtest ein dediziertes Profil ein: Nur Switch-Management, laeuft in 14 Tagen ab, vollstaendige Protokollierung. {chef}: "Muss das so kompliziert sein?" Ja, muss es.',
        choiceTags: ['secure', 'by_the_book'],
        teachingMoment: 'Proper Access Management ist Aufwand, aber es schuetzt bei Audits und Incidents.',
        setsFlags: ['external_access_proper'],
      },
      {
        id: 'share_credentials',
        text: '{chef}s Zugangsdaten teilen - geht am schnellsten',
        effects: { compliance: -20, stress: -5 },
        resultText: 'Du gibst dem Dienstleister {chef}s VPN-Daten. Schnell, aber... bei der naechsten KRITIS-Pruefung wird das zum Problem.',
        choiceTags: ['lazy', 'risky'],
        chainTriggers: [{
          targetEventId: 'evt_shared_credentials_audit',
          delayWeeks: 4,
          description: 'Shared credentials discovered during audit',
        }],
      },
      {
        id: 'onsite_supervision',
        text: 'Vor-Ort-Termin statt VPN - du schaust ihm ueber die Schulter',
        effects: { compliance: 15, stress: 15, skills: { netzwerk: 8 } },
        resultText: 'Du planst einen ganzen Tag mit dem Dienstleister. Er konfiguriert, du lernst. Keine Remote-Risiken, dafuer viel Wissen transferiert.',
        choiceTags: ['secure', 'learning'],
        teachingMoment: 'Dienstleisterbegleitung ist eine Lernchance. Nutze sie.',
      },
    ],
    tags: ['story', 'security', 'vendors', 'access', 'week7'],
  },

  // ELO fix success (chain consequence)
  {
    id: 'evt_elo_fix_success',
    weekRange: [7, 10],
    probability: 1.0,
    category: 'personal',
    isChainEvent: true,
    chainPriority: 4,
    title: 'Held der Buchhaltung',
    description: `Du hast ELO gefixt. Alleine. Ohne Support.

{kaemmerer} kommt persoenlich vorbei: "Das war beeindruckend. Die Rechnungen laufen wieder."

Er macht eine Pause.

"Ich werde das bei der naechsten Budget-Runde nicht vergessen."`,
    involvedCharacters: ['kaemmerer'],
    mentorNote: 'Fachliche Kompetenz baut Vertrauen auf. Aber: Dokumentiere was du getan hast, damit du es beim naechsten Mal schneller findest.',
    choices: [
      {
        id: 'document_fix',
        text: 'Fix dokumentieren fuer naechstes Mal',
        effects: { relationships: { kaemmerer: 15 }, skills: { troubleshooting: 5 }, stress: -5 },
        resultText: 'Du schreibst ein kurzes Runbook: "ELO Workflow-Timeout - Loesung". Naechstes Mal dauert es 5 Minuten statt einer Stunde.',
      },
    ],
    tags: ['story', 'chain_consequence', 'success'],
  },

  // ELO fix failure (chain consequence)
  {
    id: 'evt_elo_fix_failure',
    weekRange: [7, 10],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 4,
    title: 'ELO-Verschlimmbesserung',
    description: `Du hast versucht, ELO zu fixen. Jetzt geht gar nichts mehr.

Der Workflow-Dienst startet nicht. Die Datenbank meldet Fehler. {kaemmerer} steht hinter dir:

"Was haben Sie GEMACHT?"

Der ELO-Support ist jetzt definitiv noetig.`,
    involvedCharacters: ['kaemmerer'],
    mentorNote: 'Wenn du etwas kaputter machst: Transparent kommunizieren. Verstecken macht es nur schlimmer.',
    choices: [
      {
        id: 'admit_call_support',
        text: 'Ehrlich zugeben und sofort Support rufen',
        effects: { relationships: { kaemmerer: -10 }, budget: -500, stress: 10 },
        resultText: 'Der Support braucht 3 Stunden und 500 Euro. Aber ELO laeuft wieder. {kaemmerer} ist nicht happy, aber er respektiert die Ehrlichkeit.',
        teachingMoment: 'Fehler eingestehen ist schwer, aber wichtig. Vertuschen macht es schlimmer.',
      },
    ],
    tags: ['story', 'chain_consequence', 'failure'],
  },

  // Personalrat escalation (chain consequence)
  {
    id: 'evt_personalrat_escalation',
    weekRange: [9, 11],
    probability: 1.0,
    category: 'politics',
    isChainEvent: true,
    chainPriority: 6,
    title: 'Personalrat eskaliert',
    description: `Der Personalrat hat recherchiert. Sie haben herausgefunden, dass Baramundi mehr kann als "nur Softwareverteilung."

"Sie haben uns nicht die ganze Wahrheit gesagt."

Sie fordern jetzt eine vollstaendige Pruefung durch den Datenschutzbeauftragten. {chef} ist nicht erfreut.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Unvollstaendige Information raechen sich. Besser einmal zu viel erklaeren als einmal zu wenig.',
    choices: [
      {
        id: 'full_disclosure',
        text: 'Jetzt alles offenlegen und Betriebsvereinbarung anbieten',
        effects: { compliance: 5, stress: 10, relationships: { chef: -5 } },
        resultText: 'Du legst alle Fakten auf den Tisch und schlägst eine BV vor. Es ist peinlich, aber konstruktiv. Der Personalrat akzeptiert - vorerst.',
      },
    ],
    tags: ['story', 'chain_consequence', 'politics'],
  },
];
