import { GameEvent } from '@kritis/shared';

/**
 * Chain D: The Colleague's Mistake
 *
 * Flow:
 * evt_colleague_baramundi (Week 3-5)
 *   -> If you cover for colleague: evt_colleague_loyalty (2-3 weeks later)
 *   -> If you report colleague: evt_colleague_resentment (2 weeks later)
 */

export const colleagueChainEvents: GameEvent[] = [
  // Starting event: Colleague makes a serious mistake in Baramundi
  {
    id: 'evt_colleague_baramundi',
    weekRange: [3, 5],
    probability: 0.85,
    category: 'team',
    title: 'Falscher Klick',
    description: `{kollege} kommt blass zu dir.

"Ich hab Mist gebaut. In Baramundi. Ich wollte nur EIN Software-Paket deployen, aber ich hab... ich hab es auf ALLE Clients gepusht."

Du schaust auf den Bildschirm. 347 Rechner installieren gerade eine Test-Version eines Druckertreibers. Die Wasserwerke sind dabei.

"Das darf {chef} nicht erfahren", fleht {kollege}. "Ich bin noch in der Probezeit. Bitte."

Im Baramundi-Dashboard siehst du die Installation: 23% abgeschlossen.`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote: 'Softwareverteilung ohne Testgruppe ist ein klassischer Fehler. Baramundi, SCCM, Intune - alle haben Staging-Funktionen. Nutze sie! Bei KRITIS: Jeder Rollout muss geplant und dokumentiert sein, inklusive Rollback-Plan.',
    choices: [
      {
        id: 'baramundi_cover',
        text: 'Den Rollout stoppen und gemeinsam einen Cleanup machen',
        effects: { relationships: { kollegen: 15 }, stress: 20, skills: { windows: 5 } },
        resultText: 'Ihr stoppt den Job bei 31%. 108 Rechner sind betroffen. Ihr arbeitet die Nacht durch, um den alten Treiber wiederherzustellen. Um 5 Uhr morgens ist alles wieder normal. {kollege}: "Ich schulde dir was. Grosses."',
        choiceTags: ['cover_up', 'loyal'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_loyalty',
          delayWeeks: 3,
          description: 'Colleague remembers your loyalty and returns the favor',
        }],
      },
      {
        id: 'baramundi_report',
        text: '{chef} informieren - das ist zu gross, um es zu verstecken',
        effects: { relationships: { kollegen: -20, chef: 10 }, stress: 10, compliance: 5 },
        resultText: '{chef} kommt sofort. "Wer? {kollege}? Verstehe." {kollege} wird zum Gespraech gebeten. Als er zurueckkommt, redet er nicht mehr mit dir.',
        choiceTags: ['report', 'honest'],
        chainTriggers: [{
          targetEventId: 'evt_colleague_resentment',
          delayWeeks: 2,
          description: 'Colleague resents you for reporting them',
        }],
      },
      {
        id: 'baramundi_blame_system',
        text: 'Den Rollout stoppen und einen "Systemfehler" melden',
        effects: { relationships: { kollegen: 10 }, stress: 15, compliance: -10 },
        resultText: 'Ihr schiebt es auf einen "Bug in Baramundi". {chef} ist misstrauisch, aber kann nichts beweisen. Die Luege liegt schwer im Raum.',
        choiceTags: ['lie', 'cover_up'],
        teachingMoment: 'Luegen funktionieren kurzfristig, aber Audit-Logs existieren. Spaeter kann das sehr unangenehm werden.',
      },
      {
        id: 'baramundi_let_run',
        text: 'Abwarten - vielleicht ist der Treiber ja gar nicht so schlimm',
        effects: { stress: 5, relationships: { fachabteilung: -15, kollegen: -5 } },
        resultText: 'Der Treiber ist schlimm. Sehr schlimm. 47 Drucker funktionieren nicht mehr. Die Fachabteilungen kochen vor Wut. {kollege}: "Warum hast du nichts gemacht?!"',
        choiceTags: ['passive', 'negligent'],
      },
    ],
    terminalContext: {
      type: 'linux',
      hostname: 'baramundi-srv',
      username: 'admin',
      currentPath: '/opt/baramundi$',
      commands: [
        {
          pattern: 'bms job list',
          output: `ID     Name                    Status    Targets  Progress
---    ----                    ------    -------  --------
4281   Deploy-PrinterDriver    RUNNING   347      31%
4280   Security-Update-Feb     DONE      347      100%
4279   Chrome-Update           DONE      298      100%`,
          teachesCommand: 'bms job list',
          skillGain: { windows: 2 },
        },
        {
          pattern: 'bms job stop 4281',
          output: `Job 4281 stopped. 108 clients affected, 239 clients skipped.`,
          skillGain: { windows: 5 },
          isSolution: true,
        },
      ],
      solutions: [
        {
          commands: ['bms job stop 4281'],
          allRequired: true,
          resultText: 'Job gestoppt! Jetzt muss der Schaden auf den 108 betroffenen Clients repariert werden.',
          skillGain: { windows: 5, troubleshooting: 3 },
          effects: { stress: -5 },
        },
      ],
      hints: [
        'Tipp: In Baramundi koennen laufende Jobs gestoppt werden.',
        'Tipp: Je schneller du handelst, desto weniger Rechner sind betroffen.',
      ],
    },
    tags: ['team', 'chain_start', 'baramundi', 'deployment', 'mistake'],
  },

  // Consequence: Colleague's Loyalty (if you covered for them)
  {
    id: 'evt_colleague_loyalty',
    weekRange: [6, 9],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Schulden werden bezahlt',
    description: `{chef} ist nicht im Haus. Du hast einen kritischen Server-Ausfall - der Exchange ist down, und du findest den Fehler nicht.

{kollege} kommt vorbei. "Brauchst du Hilfe?"

Er setzt sich neben dich. "Exchange? Lass mich mal schauen. Ich hab sowas schon dreimal gesehen."

Er erinnert sich an die Nacht mit dem Baramundi-Desaster. Jetzt ist er an der Reihe.`,
    involvedCharacters: ['kollege'],
    mentorNote: 'Kollegiale Solidaritaet ist unbezahlbar. In der IT loest man Probleme selten allein. Ein Team, das zusammenhaelt, uebersteht auch schwere Krisen.',
    choices: [
      {
        id: 'loyalty_accept',
        text: 'Dankbar die Hilfe annehmen',
        effects: { relationships: { kollegen: 10 }, stress: -15, skills: { windows: 5 } },
        resultText: '{kollege} findet das Problem in 20 Minuten - ein korruptes Transaction Log. "Klassiker", sagt er. "Jetzt sind wir quitt." Aber ihr wisst beide: Das ist mehr als Schulden abzahlen.',
        teachingMoment: 'Ein gutes Team ist mehr wert als jede Technologie. Investiere in Beziehungen.',
      },
      {
        id: 'loyalty_proud',
        text: '"Danke, aber ich schaff das alleine."',
        effects: { relationships: { kollegen: -5 }, stress: 10 },
        resultText: '{kollege} zuckt die Schultern. "Wie du willst." Du brauchst noch 2 Stunden fuer das Problem, das er in 20 Minuten geloest haette.',
        choiceTags: ['proud', 'stubborn'],
      },
      {
        id: 'loyalty_learn',
        text: '"Zeig mir, wie du das machst - ich will lernen."',
        effects: { relationships: { kollegen: 15 }, skills: { windows: 8, troubleshooting: 5 }, stress: -10 },
        resultText: '{kollege} erklaert jeden Schritt. "Event Log hier, dann ESEUTIL..." Du schreibst mit. "Beim naechsten Mal machst du das alleine", sagt er mit einem Laecheln.',
        teachingMoment: 'Die beste Lernmethode: Einem Experten ueber die Schulter schauen.',
      },
    ],
    tags: ['team', 'chain_consequence', 'help', 'exchange'],
  },

  // Consequence: Colleague's Resentment (if you reported them)
  {
    id: 'evt_colleague_resentment',
    weekRange: [5, 8],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 5,
    title: 'Vergiftete Atmosphaere',
    description: `Seit dem Baramundi-Vorfall ist die Stimmung im Buero anders.

{kollege} redet nur noch das Noetigste mit dir. Tickets, die normalerweise als Team geloest wurden, macht jetzt jeder fuer sich. Als du eine Frage stellst, sagt er: "Google es."

Heute Morgen hoerst du ihn zu einem anderen Kollegen sagen: "Pass auf, was du ihm erzaehlst. Er laeuft direkt zum Chef."

Du hattest nur getan, was richtig war... oder?`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote: 'Die Entscheidung zwischen Loyalitaet und Integritaet ist schwer. Beides ist wichtig. Langfristig ist Integritaet wichtiger, aber die sozialen Kosten koennen hoch sein. Such dir Mentoren ausserhalb der direkten Situation.',
    choices: [
      {
        id: 'resentment_confront',
        text: '{kollege} direkt ansprechen: "Koennen wir das klaeren?"',
        requires: { skill: 'softSkills', threshold: 35 },
        effects: { relationships: { kollegen: 5 }, stress: 10, skills: { softSkills: 5 } },
        resultText: 'Es wird ein schwieriges Gespraech. "Ich musste es melden - 347 Rechner waren betroffen." {kollege}: "Ich weiss. Macht es trotzdem nicht leichter." Aber die Luft ist etwas leichter danach.',
        teachingMoment: 'Konflikte ansprechen ist unangenehm, aber Schweigen macht es schlimmer.',
      },
      {
        id: 'resentment_ignore',
        text: 'Ignorieren - mit der Zeit wird es besser',
        effects: { relationships: { kollegen: -5 }, stress: 10 },
        resultText: 'Es wird nicht besser. Die naechsten Wochen arbeitet ihr nebeneinander her, aber nicht miteinander.',
        choiceTags: ['avoidant'],
      },
      {
        id: 'resentment_chef',
        text: '{chef} um Rat fragen - das belastet das Team',
        effects: { relationships: { chef: 5, kollegen: -10 }, stress: 5 },
        resultText: '{chef} seufzt. "Professionelle Erwachsene sollten das unter sich klaeren." Nicht hilfreich, und {kollege} hoert davon.',
        choiceTags: ['escalate'],
      },
      {
        id: 'resentment_apologize',
        text: 'Sich entschuldigen: "Es tut mir leid, wie ich das gehandhabt habe."',
        effects: { relationships: { kollegen: 10 }, stress: -5, skills: { softSkills: 8 } },
        resultText: '{kollege} ist ueberrascht. "Du... entschuldigst dich? Du hast doch nur deinen Job gemacht." "Ja, aber ich haette es anders kommunizieren koennen." Langsam taut er auf.',
        teachingMoment: 'Man kann fuer die Art und Weise Verantwortung uebernehmen, auch wenn die Entscheidung richtig war.',
      },
    ],
    tags: ['team', 'chain_consequence', 'conflict', 'trust'],
  },
];
