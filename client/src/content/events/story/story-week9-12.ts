import { GameEvent } from '@kritis/shared';

/**
 * Act 1 Story Events: Weeks 9-12 (Endgame / Probezeit-Finale)
 * E24-E28: Final challenges and the probation decision
 */

export const storyWeek9to12Events: GameEvent[] = [
  // E24: Das Probezeitgespräch naht
  {
    id: 'evt_probezeitgespraech_naht',
    weekRange: [9, 10],
    probability: 0.95,
    category: 'personal',
    title: 'Das Probezeitgespraech naht',
    description: `{chef} erwaehnt beilaeufig: "Wir sollten bald mal ueber deine Probezeit reden."

Noch 2-3 Wochen bis zum offiziellen Ende.

Du denkst an die letzten Wochen: Die Krisen, die Erfolge, die Konflikte. Wie wird das Gespraech laufen?`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Probezeitende proaktiv ansprechen zeigt Eigeninitiative. Eine Seite: Was wurde erreicht (mit messbaren Ergebnissen), was steht an, wo siehst du Entwicklungspotential. Zahlen schlagen Bauchgefuehl.',
    choices: [
      {
        id: 'prepare_summary',
        text: 'Eine Zusammenfassung vorbereiten: Erreicht, geplant, gelernt',
        effects: { skills: { softSkills: 5 }, relationships: { chef: 5, gf: 5 }, stress: 5 },
        resultText: 'Du erstellst eine Seite: Projekte abgeschlossen, Krisen bewaeltigt, Skills entwickelt, naechste Ziele. {chef} ist beeindruckt von der Initiative.',
        choiceTags: ['proactive', 'prepared'],
        setsFlags: ['probezeit_summary_prepared'],
        teachingMoment: 'Vorbereitung zeigt Professionalitaet und macht das Gespraech leichter.',
      },
      {
        id: 'wait_for_meeting',
        text: 'Abwarten - nicht zu keen wirken',
        effects: { stress: 5 },
        resultText: 'Du wartest auf den Termin. Wenn die Stats gut sind, passiert nichts Schlimmes. Wenn nicht... haettest du dich vorbereiten sollen.',
        choiceTags: ['passive'],
      },
      {
        id: 'ask_colleague',
        text: '{kollege} fragen, wie das bei ihm war',
        effects: { relationships: { kollegen: 5 } },
        resultText: '{kollege} lacht. "Bei mir wollten sie vor allem wissen, ob ich mit dem {chef} klarkomme. Und ob ich die Technik verstehe. Entspann dich - du machst das gut."',
        choiceTags: ['social', 'learning'],
      },
    ],
    tags: ['story', 'probezeit', 'career', 'week9'],
  },

  // E25: KRITIS-Audit Ankündigung
  {
    id: 'evt_kritis_audit_ankuendigung',
    weekRange: [9, 11],
    probability: 0.9,
    category: 'compliance',
    title: 'KRITIS-Audit Ankuendigung',
    description: `Brief vom BSI: Ein KRITIS-Audit ist in 8 Wochen geplant.

Du wirst noch in der Probezeit sein, wenn die Vorbereitung beginnt. {gf} ist nervoes.

{chef} sagt: "Das wird DEIN Projekt."

Das ist entweder eine grosse Chance oder eine grosse Falle.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'KRITIS-Audit Vorbereitung: BSI IT-Grundschutz-Kompendium als Checkliste, Gap-Analyse gegen die 10 NIS2-Massnahmenbereiche, Nachweisdokumentation sammeln. Externe Berater fuer den ersten Audit sind Gold wert - die kennen die Pruefer-Perspektive.',
    choices: [
      {
        id: 'all_in',
        text: 'Audit-Vorbereitung als Probezeit-Projekt - all-in',
        effects: { stress: 20, compliance: 15, relationships: { gf: 15 }, skills: { security: 10 } },
        resultText: 'Du stuertzt dich rein: Checklisten, Gap-Analyse, Dokumentation. Die {gf} sieht deinen Einsatz. Hohes Risiko, hohe Belohnung.',
        choiceTags: ['ambitious', 'risky'],
        setsFlags: ['audit_lead_role'],
      },
      {
        id: 'realistic_plan',
        text: 'Realistisch: Vorbereitungsplan erstellen, Erwartungen managen',
        effects: { stress: 10, compliance: 10, relationships: { chef: 5 } },
        resultText: 'Du erstellst einen realistischen Timeline mit klaren Verantwortlichkeiten. Nicht heldenhaft, aber nachhaltig.',
        choiceTags: ['sustainable', 'professional'],
      },
      {
        id: 'external_help',
        text: 'Externe Hilfe vorschlagen - Auditor-Berater',
        effects: { budget: -5000, compliance: 10, stress: 5 },
        resultText: 'Du schlägst einen BSI-erfahrenen Berater vor. {kaemmerer} stoehnt wegen der Kosten, aber die {gf} stimmt zu. "Beim ersten Audit lieber auf Nummer sicher."',
        choiceTags: ['smart', 'resourceful'],
        teachingMoment: 'Externe Experten bei komplexen Compliance-Themen sind eine gute Investition.',
      },
    ],
    tags: ['story', 'compliance', 'audit', 'bsi', 'week9'],
  },

  // E26: Server-Ausfall Freitagabend
  {
    id: 'evt_server_ausfall_freitag',
    weekRange: [9, 12],
    probability: 0.85,
    category: 'crisis',
    title: 'Server-Ausfall Freitagabend',
    description: `Freitag, 18:30 Uhr. Du bist auf dem Weg nach Hause.

Das Handy klingelt: Der Hauptserver ist down. Exchange, Fileserver, Fachverfahren - alles weg.

"Wahrscheinlich ein Festplattenausfall im RAID", sagt die Monitoring-Meldung.

Du stehst an der Bushaltestelle. Das Wochenende winkt.`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Rufbereitschaft und Ueberstunden: Kein Vertrag = keine Pflicht. Aber in der Probezeit zeigt Commitment. Langfristig: Rufbereitschaftsregelung formalisieren mit TVoeD-Zuschlaegen. Monitoring + Backup ist besser als Heldentum.',
    choices: [
      {
        id: 'turn_around',
        text: 'Umdrehen und fixen - du musst zeigen, dass du da bist',
        effects: { stress: 20, relationships: { chef: 15, gf: 5 } },
        resultText: 'Du faehrst zurueck. Vier Stunden spaeter laeuft alles wieder: Eine Festplatte im RAID hatte Timeout-Fehler, Rebuild läuft. Du bist muede, aber stolz.',
        choiceTags: ['heroic', 'committed'],
        chainTriggers: [{
          targetEventId: 'evt_weekend_hero',
          delayWeeks: 0,
          condition: 'state.stress < 80',
          description: 'Hero moment if not too stressed',
        }, {
          targetEventId: 'evt_burnout_warning',
          delayWeeks: 0,
          condition: 'state.stress >= 80',
          description: 'Burnout risk if too stressed',
        }],
      },
      {
        id: 'call_chef',
        text: '{chef} anrufen - nach Feierabend ist sein Problem',
        effects: { stress: 5 },
        resultText: '{chef} geht nicht ran. Natuerlich nicht - Freitag Abend. Du hinterlaesst eine Nachricht. Am Montag ist das Problem groesser.',
        choiceTags: ['by_the_book'],
        chainTriggers: [{
          targetEventId: 'evt_monday_disaster',
          delayWeeks: 0,
          description: 'Unaddressed problem escalates',
        }],
      },
      {
        id: 'vpn_troubleshoot',
        text: 'Remote per VPN analysieren, nur wenn noetig reinfahren',
        effects: { stress: 10, skills: { troubleshooting: 5 } },
        resultText: 'Du verbindest dich per VPN. Schnelle Analyse: RAID degraded, aber stabil. Du startest einen Rebuild remote und ueberwachst per Handy. Intelligente Loesung.',
        choiceTags: ['smart', 'balanced'],
        setsFlags: ['server_crisis_handled_smart'],
      },
    ],
    tags: ['story', 'crisis', 'server', 'weekend', 'week10'],
  },

  // E27: Colleague's Side Project
  {
    id: 'evt_colleague_side_project',
    weekRange: [10, 12],
    probability: 0.7,
    category: 'team',
    title: 'Side Project',
    description: `Du schaust zufaellig auf den Monitor von {kollege}, als du vorbeigehst.

Er arbeitet an einer Website. Einer privaten Website. Mit professionellem Design. Auf dem Dienst-PC. Waehrend der Arbeitszeit.

Er hat dich noch nicht bemerkt.

Dienstvereinbarung: Private Nutzung waehrend der Arbeitszeit ist untersagt.`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote: 'Private Nutzung am Arbeitsplatz: Dienstvereinbarung pruefen. Im OeD meist streng geregelt. Unter vier Augen ansprechen ist fast immer der richtige Weg - es zeigt Loyalitaet zum Kollegen UND Verantwortungsbewusstsein.',
    choices: [
      {
        id: 'talk_privately',
        text: 'Unter vier Augen ansprechen',
        effects: { relationships: { kollegen: -5 }, skills: { softSkills: 5 }, stress: 5 },
        resultText: 'Du nimmst ihn zur Seite. "Hey, ich hab gesehen... das ist nicht mein Ding, aber wenn jemand anderes das sieht..." Er wird rot. "Danke. Ich... ja, du hast recht."',
        choiceTags: ['diplomatic', 'loyal'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_grateful',
          delayWeeks: 2,
          probability: 0.7,
          description: 'Colleague appreciates the discrete warning',
        }],
      },
      {
        id: 'ignore',
        text: 'Ignorieren - nicht dein Problem',
        effects: { stress: 3 },
        resultText: 'Du gehst weiter. Nicht dein Zirkus, nicht deine Affen. Hoffentlich erwischt ihn niemand anderes.',
        choiceTags: ['passive'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_caught',
          delayWeeks: 3,
          probability: 0.4,
          description: 'Colleague gets caught, you knew',
        }],
      },
      {
        id: 'tell_chef',
        text: '{chef} informieren',
        effects: { compliance: 5, relationships: { kollegen: -30 } },
        resultText: '{chef} dankt dir fuer die Info. {kollege} wird zum Gespraech gebeten. Als er zurueckkommt, schaut er durch dich hindurch. "Petze."',
        choiceTags: ['by_the_book', 'snitch'],
      },
    ],
    tags: ['story', 'team', 'ethics', 'week10'],
  },

  // E28: Das finale Probezeitgespräch
  {
    id: 'evt_finales_probezeitgespraech',
    weekRange: [11, 12],
    dayPreference: [5],
    probability: 1.0,
    category: 'personal',
    title: 'Das Gespraech',
    description: `{chef} und {gf} sitzen dir gegenueber.

"So", sagt {gf}. "Drei Monate. Wie ist Ihr Fazit?"

Du denkst an alles, was passiert ist. Die Krisen, die du bewaeltigt hast. Die Fehler, die du gemacht hast. Die Beziehungen, die du aufgebaut - oder beschaedigt - hast.

Das ist der Moment.`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote: 'Probezeitgespraeche im OeD: Dein Vorgesetzter muss eine Beurteilung schreiben. Vorbereitung auf Fragen: "Was haben Sie erreicht?", "Wo sehen Sie Verbesserungsbedarf?", "Wie ist die Zusammenarbeit im Team?"',
    choices: [
      {
        id: 'confident_summary',
        text: 'Selbstbewusst zusammenfassen: Erreicht, gelernt, Ziele',
        effects: { skills: { softSkills: 10 } },
        resultText: 'Du praesentierst deine Erfolge: Server-Krisen geloest, Compliance verbessert, Team unterstuetzt. {gf} nickt. {chef} laechelt.',
        choiceTags: ['confident', 'prepared'],
        setsFlags: ['probezeit_presentation_good'],
      },
      {
        id: 'honest_reflection',
        text: 'Ehrlich reflektieren: Erfolge UND Fehler benennen',
        effects: { skills: { softSkills: 15 }, relationships: { chef: 5, gf: 5 } },
        resultText: '"Ich habe viel richtig gemacht, aber auch Fehler. Der ELO-Vorfall... der Personalrat... daraus habe ich gelernt." {gf}: "Selbstreflexion. Das ist selten."',
        choiceTags: ['honest', 'mature'],
        setsFlags: ['probezeit_presentation_honest'],
        teachingMoment: 'Ehrliche Selbstreflexion zeigt Reife und Entwicklungspotential.',
      },
      {
        id: 'deflect_blame',
        text: 'Auf schwierige Umstaende verweisen',
        effects: { relationships: { chef: -10, gf: -10 }, stress: 5 },
        resultText: '"Die Infrastruktur war veraltet, die Dokumentation fehlte..." {chef} unterbricht: "Das war bei allen Vorgaengern so. Wir fragen nach IHNEN."',
        choiceTags: ['defensive'],
      },
    ],
    tags: ['story', 'probezeit', 'finale', 'week12'],
  },

  // Weekend hero (chain consequence)
  {
    id: 'evt_weekend_hero',
    weekRange: [9, 12],
    probability: 1.0,
    category: 'personal',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Wochenend-Held',
    description: `Montag morgen. {chef} kommt an deinen Schreibtisch.

"Ich hab gehoert, du warst Freitagabend noch hier. Und die Server laufen wieder."

Er macht eine Pause.

"Das vergesse ich nicht. Sowas macht einen Unterschied bei der Probezeit-Beurteilung."`,
    involvedCharacters: ['chef'],
    mentorNote: 'Heldenmomente werden bemerkt - aber sie sollten Ausnahme sein, nicht Regel.',
    choices: [
      {
        id: 'humble_response',
        text: 'Bescheiden bleiben',
        effects: { relationships: { chef: 10 }, stress: -10 },
        resultText: '"War selbstverstaendlich. Die Server muessen laufen." {chef} nickt. So muss es sein.',
      },
    ],
    tags: ['story', 'chain_consequence', 'recognition'],
  },

  // Burnout warning (chain consequence)
  {
    id: 'evt_burnout_warning',
    weekRange: [9, 12],
    probability: 1.0,
    category: 'personal',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Warnsignal',
    description: `Du sitzt vor dem Bildschirm. Die Buchstaben verschwimmen.

Freitagabend. Samstagmorgen. Jetzt ist es Sonntagnacht und du hast immer noch nicht richtig geschlafen.

Der Server laeuft wieder. Aber du?`,
    involvedCharacters: [],
    mentorNote: 'Burnout-Praevention ist Teil des Jobs. Wenn du ausfaellst, hilft das niemandem.',
    choices: [
      {
        id: 'take_break',
        text: 'Morgen einen halben Tag frei nehmen',
        effects: { stress: -15 },
        resultText: 'Du nimmst dir den Vormittag. {chef} versteht: "Nach so einem Wochenende - klar." Selbstfuersorge ist kein Schwaeche.',
        teachingMoment: 'Regeneration ist Teil der Produktivitaet.',
      },
      {
        id: 'push_through',
        text: 'Durchhalten - nur noch ein paar Wochen Probezeit',
        effects: { stress: 10 },
        resultText: 'Du machst weiter. Die naechsten Tage fuehlen sich zaeher an als sonst. Aber du schaffst das. Hoffentlich.',
        choiceTags: ['stubborn'],
      },
    ],
    tags: ['story', 'chain_consequence', 'health'],
  },

  // Monday disaster (chain consequence)
  {
    id: 'evt_monday_disaster',
    weekRange: [10, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 7,
    title: 'Montag-Desaster',
    description: `Montag, 8:00 Uhr. Du kommst ins Buero.

Das Chaos ist perfekt: Keine E-Mails, keine Dateien, die Fachabteilung kann nicht arbeiten.

"Seit Freitag Abend", sagt {kollege}. "Warum hat niemand was gemacht?!"

{chef} schaut dich an. Er weiss, dass du am Freitag gegangen bist.`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Eskalationen nicht zu handeln hat Kosten. Die Frage ist: War es deine Verantwortung?',
    choices: [
      {
        id: 'fix_now',
        text: 'Sofort fixen - Erklaerungen spaeter',
        effects: { stress: 20, skills: { troubleshooting: 5 } },
        resultText: 'Du stuertzt dich auf das Problem. Zwei Stunden spaeter laeuft alles. Die Erklaerung? Die kommt spaeter. Oder nie.',
        choiceTags: ['action_first'],
      },
      {
        id: 'point_to_oncall',
        text: 'Auf fehlende Rufbereitschaftsregelung hinweisen',
        effects: { relationships: { chef: -5 }, compliance: 5 },
        resultText: '"Es gibt keine Rufbereitschaft. Freitagabend bin ich nicht verantwortlich." {chef} will widersprechen, aber du hast recht. Das System ist das Problem.',
        choiceTags: ['correct', 'confrontational'],
      },
    ],
    tags: ['story', 'chain_consequence', 'crisis'],
  },

  // Colleague grateful (chain consequence)
  {
    id: 'evt_colleague_grateful',
    weekRange: [11, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 4,
    title: 'Schulden bezahlt',
    description: `{kollege} kommt zu dir.

"Hey. Wegen der Sache letzte Woche... danke, dass du das unter uns geklaert hast. Ich hab das Projekt auf einen privaten Server verschoben."

Er macht eine Pause.

"Wenn du mal Hilfe brauchst - ich bin da."`,
    involvedCharacters: ['kollege'],
    mentorNote: 'Loyalitaet im Team zahlt sich aus. Aber nur, wenn die Grenzen klar sind.',
    choices: [
      {
        id: 'accept_thanks',
        text: 'Danke annehmen',
        effects: { relationships: { kollegen: 15 }, stress: -5 },
        resultText: '"War selbstverstaendlich. Wir sind ein Team." Die Stimmung ist besser als je zuvor.',
      },
    ],
    tags: ['story', 'chain_consequence', 'team'],
  },

  // Colleague caught (chain consequence)
  {
    id: 'evt_colleague_caught',
    weekRange: [11, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 4,
    title: 'Erwischt',
    description: `{chef} erwaehnt beilaeufig: "Der {kollege} wurde verwarnt. Private Projekte waehrend der Arbeitszeit."

Du schluckst. Du wusstest davon.

"Wusstest du das?", fragt {chef}.`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Schweigen hat Konsequenzen. Aber auch Reden.',
    choices: [
      {
        id: 'admit_knew',
        text: 'Ja, ich wusste davon',
        effects: { relationships: { chef: -5, kollegen: -15 }, stress: 10 },
        resultText: '{chef}: "Und du hast nichts gesagt? Interessant." {kollege} hoert davon. Die Stimmung ist vergiftet.',
      },
      {
        id: 'deny',
        text: 'Nein, keine Ahnung',
        effects: { stress: 10 },
        resultText: 'Du luegst. Es fuehlt sich nicht gut an. Aber die Alternative waere schlimmer gewesen. Oder?',
        choiceTags: ['lie'],
      },
    ],
    tags: ['story', 'chain_consequence', 'ethics'],
  },
];
