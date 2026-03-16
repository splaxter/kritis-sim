import { GameEvent } from '@kritis/shared';

/**
 * Chain B: The Documentation Trap
 *
 * Flow:
 * evt_docusnap_setup (Week 2-3)
 *   -> Choose to skip/delay documentation
 *   -> evt_docusnap_audit triggers 4 weeks later when auditor asks for network documentation
 */

export const documentationChainEvents: GameEvent[] = [
  // Starting event: Docusnap Setup Request
  {
    id: 'evt_docusnap_setup',
    weekRange: [2, 3],
    probability: 0.85,
    category: 'compliance',
    title: 'Netzwerk-Dokumentation',
    description: `{chef} kommt mit einem USB-Stick zu dir.

"Hier ist die Lizenz fuer Docusnap. Das Tool kann unser komplettes Netzwerk scannen und dokumentieren. Die letzte Dokumentation ist von... 2019."

Er schaut dich erwartungsvoll an. "Das BSI-Audit ist in 6 Wochen. Bis dahin brauchen wir aktuelle Netzwerkplaene."

Du schaust auf deinen Kalender. Diese Woche sind schon drei Tickets eskaliert.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Netzwerkdokumentation ist bei KRITIS-Pruefungen ein Kernthema. Docusnap, Lansweeper, oder selbst eine Excel mit IP-Ranges - Hauptsache aktuell und vollstaendig. Automatisierte Discovery-Tools sparen langfristig Zeit.',
    choices: [
      {
        id: 'docusnap_now',
        text: 'Sofort mit dem Setup anfangen - Dokumentation ist kritisch',
        effects: { stress: 10, skills: { netzwerk: 5 }, compliance: 5 },
        resultText: 'Du installierst Docusnap und startest den ersten Scan. Es dauert 3 Stunden, aber danach hast du einen aktuellen Ueberblick ueber alle 847 Geraete im Netzwerk.',
        choiceTags: ['proactive', 'compliant'],
        teachingMoment: 'Discovery-Scans am besten ausserhalb der Kernarbeitszeit laufen lassen - sie koennen Netzwerklast erzeugen.',
      },
      {
        id: 'docusnap_later',
        text: 'Auf die naechste Woche verschieben - zu viele offene Tickets',
        effects: { stress: -5, compliance: -3 },
        resultText: '{chef}: "Okay, aber spaetestens naechste Woche." Du legst den USB-Stick in die Schublade. Naechste Woche ist bestimmt ruhiger...',
        choiceTags: ['procrastinate'],
        chainTriggers: [{
          targetEventId: 'evt_docusnap_audit',
          delayWeeks: 4,
          description: 'Delayed documentation causes audit problems',
        }],
      },
      {
        id: 'docusnap_delegate',
        text: '{kollege} fragen, ob er das uebernehmen kann',
        effects: { relationships: { kollegen: -5 }, stress: -3 },
        resultText: '{kollege}: "Ich hab selber genug zu tun. Ausserdem bist DU der Neue, der sich einarbeiten soll." Fair point.',
        choiceTags: ['delegate_fail'],
      },
      {
        id: 'docusnap_weekend',
        text: 'Am Wochenende machen, wenn das Netzwerk ruhiger ist',
        effects: { stress: 5, relationships: { gf: -5 }, skills: { netzwerk: 3 } },
        resultText: 'Du opferst deinen Samstagnachmittag, aber der Scan laeuft sauber durch. Die Dokumentation ist aktuell.',
        choiceTags: ['worklife_sacrifice', 'compliant'],
      },
    ],
    tags: ['compliance', 'documentation', 'chain_start', 'tools'],
  },

  // Consequence event: Audit without documentation
  {
    id: 'evt_docusnap_audit',
    weekRange: [6, 8],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 8,
    title: 'BSI-Auditor fragt nach',
    description: `Der BSI-Pruefer sitzt in {chef}s Buero. Du wirst reingerufen.

"Koennen Sie mir die aktuelle Netzwerktopologie zeigen? Insbesondere die Segmentierung zwischen IT und OT?"

Du erinnerst dich an den USB-Stick mit Docusnap. Der liegt immer noch in deiner Schublade. Unberuehrt.

{chef} schaut dich erwartungsvoll an.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote: 'BSI-Auditoren sind nicht da, um dich fertig zu machen - sie wollen sehen, dass ihr die Risiken kennt und managed. Ehrlichkeit plus konkreter Massnahmenplan kommt besser an als schlechte Ausreden.',
    choices: [
      {
        id: 'audit_honest',
        text: 'Ehrlich sein: "Die Dokumentation ist veraltet. Ich kann Ihnen zeigen, was wir haben."',
        effects: { compliance: -10, relationships: { chef: -5 }, skills: { softSkills: 5 } },
        resultText: 'Der Pruefer nickt. "Danke fuer die Ehrlichkeit. Das muss bis zum naechsten Audit behoben sein." Er notiert es als Mangel, aber schreibt auch "kooperativ" in seinen Bericht.',
        teachingMoment: 'Auditoren schaetzen Ehrlichkeit. Ein bekannter Mangel mit Massnahmenplan ist besser als ein verstecktes Problem.',
      },
      {
        id: 'audit_improvise',
        text: 'Schnell ein paar Screenshots vom Switch-Interface machen',
        requires: { skill: 'netzwerk', threshold: 35 },
        effects: { stress: 15, compliance: -5 },
        resultText: 'Du tippst hektisch auf deinem Laptop. Der Pruefer wartet geduldig. Nach 10 Minuten hast du ein halbwegs verstaendliches Netzwerkdiagramm zusammengeklickt. "Das ist... improvisiert", sagt er.',
        choiceTags: ['improvise'],
      },
      {
        id: 'audit_blame',
        text: '"Mein Vorgaenger hat das nicht gepflegt. Ich bin erst seit Wochen hier."',
        effects: { relationships: { chef: -10 }, compliance: -8 },
        resultText: '{chef} rauespert sich. "Das ist korrekt, aber wir hatten vereinbart, das zu aktualisieren." Der Pruefer schreibt etwas in sein Notizbuch.',
        choiceTags: ['blame_others'],
      },
      {
        id: 'audit_visio',
        text: 'Das alte Visio-Diagramm von 2019 zeigen und Aenderungen muendlich erklaeren',
        effects: { stress: 10, compliance: -8 },
        resultText: '"Hier haben wir 2021 neue Switches eingebaut, und hier..." Der Pruefer stoppt dich. "Ich brauche dokumentierte, nachvollziehbare Informationen. Nicht muendliche Erlaeuterungen."',
      },
    ],
    tags: ['compliance', 'chain_consequence', 'bsi', 'audit', 'documentation'],
  },
];
