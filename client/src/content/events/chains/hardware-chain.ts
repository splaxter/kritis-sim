import { GameEvent } from '@kritis/shared';

/**
 * Chain G: Der sterbende Server (red-thread continuity — budget/infrastructure)
 *
 * Flow:
 * evt_aging_server (Week 2-4) — the main host is past end-of-life. What now?
 *   -> "Ersatz jetzt beschaffen"           => evt_aging_migration (3 weeks later, calm)
 *   -> ignore / Ersatzplatte / Budgetantrag => evt_server_death   (3-4 weeks later, outage)
 *
 * Same external event (the old box finally dies) seen from two sides; the
 * consequence text calls back to the earlier capital-vs-risk decision. Distinct
 * from the security chains: this is the budget/Kämmerer/availability thread.
 *
 * Scoped away from story (own arc) and learning (cliOnly); scoping the START
 * event gates the whole chain (consequences are only scheduled if it fires).
 */

export const hardwareChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_aging_server',
    weekRange: [2, 4],
    probability: 0.95,
    requiredModes: ['beginner', 'kritis', 'intermediate', 'hard'],
    category: 'budget',
    title: 'Der Server aus einer anderen Zeit',
    description: `Im Serverraum brummt „SRV-FILE01" — der zentrale Datei- und Fachverfahren-Host. Du liest das Typenschild: Baujahr vor 8 Jahren. Die Hersteller-Garantie ist seit drei Jahren abgelaufen, Ersatzteile gibt es nur noch gebraucht.

Im Wartungslog blinken SMART-Warnungen: zwei Platten im RAID melden „pre-fail". {kollege} winkt ab: „Der läuft seit Jahren so. RAID fängt das schon ab."

Ein neuer Host kostet richtig Geld — und {kaemmerer} fragt bei jeder Investition dreimal nach.`,
    involvedCharacters: ['kollege', 'kaemmerer'],
    mentorNote:
      'RAID schützt vor EINEM Plattenausfall, nicht vor einem End-of-Life-Host (Netzteil, Backplane, RAID-Controller, Mainboard — alles gleich alt und gleich müde). „pre-fail" auf mehreren Platten gleichzeitig ist ein Alarm. KRITIS-Betreiber brauchen für kritische Systeme eine geplante Hardware-Lebenszyklus- und Ersatzteilstrategie, kein Hoffen auf RAID.',
    choices: [
      {
        id: 'replace_now',
        text: 'Business Case mit Ausfallrisiko rechnen und Ersatz-Host jetzt beschaffen',
        effects: { skills: { troubleshooting: 5, netzwerk: 4 }, compliance: 8, stress: 6, budget: -4000, relationships: { kaemmerer: -5, chef: 6 } },
        resultText:
          'Du legst {kaemmerer} eine Rechnung vor: Was kostet ein Tag Stillstand der Fachverfahren? Er zahlt zähneknirschend. Der neue Host wird bestellt — Zeit für eine geplante Migration.',
        choiceTags: ['careful', 'prepared', 'capital_planning'],
        teachingMoment:
          'Ein Business Case mit beziffertem Ausfallrisiko ist die Sprache, die ein Kämmerer versteht — nicht „die Kiste ist alt".',
        chainTriggers: [
          {
            targetEventId: 'evt_aging_migration',
            delayWeeks: 3,
            description: 'Proactive replacement leads to a planned migration before failure.',
          },
        ],
      },
      {
        id: 'defer_ignore',
        text: '„Läuft doch." — RAID wird das schon abfangen',
        effects: { stress: -3, compliance: -5 },
        resultText:
          '{kollege} nickt erleichtert. Du hakst es ab. Die SMART-Warnungen blinken weiter vor sich hin.',
        choiceTags: ['negligent', 'hasty'],
        chainTriggers: [
          {
            targetEventId: 'evt_server_death',
            delayWeeks: 3,
            description: 'Ignored end-of-life host fails catastrophically.',
          },
        ],
      },
      {
        id: 'stopgap_disk',
        text: 'Nur eine Ersatzplatte ordern und die Pre-Fail-Platte tauschen',
        effects: { skills: { troubleshooting: 3 }, budget: -300, stress: 2, compliance: 1 },
        resultText:
          'Du tauschst die schlimmste Platte, das RAID baut sich neu auf. Fühlt sich nach Wartung an — aber Netzteil, Controller und Backplane sind weiterhin acht Jahre alt.',
        choiceTags: ['half_measure'],
        teachingMoment:
          'Eine einzelne Platte zu tauschen behebt das Symptom, nicht das End-of-Life des Gesamtsystems. Der Rebuild belastet die anderen müden Platten sogar zusätzlich.',
        chainTriggers: [
          {
            targetEventId: 'evt_server_death',
            delayWeeks: 3,
            description: 'A single new disk does not save an end-of-life host.',
          },
        ],
      },
      {
        id: 'budget_wait',
        text: 'Ersatz ordentlich für das nächste Haushaltsjahr beantragen',
        effects: { stress: 5, relationships: { kaemmerer: 4 } },
        resultText:
          '{kaemmerer} lobt den sauberen Antrag und plant die Beschaffung — fürs nächste Jahr. Bis dahin muss der Alte durchhalten.',
        choiceTags: ['passive', 'bureaucratic'],
        chainTriggers: [
          {
            targetEventId: 'evt_server_death',
            delayWeeks: 4,
            description: 'Replacement stuck in the next budget year; the host dies first.',
          },
        ],
      },
    ],
    tags: ['budget', 'chain_start', 'hardware', 'lifecycle', 'availability'],
  },

  // ── Consequence A: planned migration, no drama ────────────────────
  {
    id: 'evt_aging_migration',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 11,
    title: 'Migration mit Ansage',
    description: `Der neue Host steht im Rack. Du erinnerst dich an die Investitions­entscheidung von vor ein paar Wochen — und genau jetzt zahlt sie sich aus: Du kannst SRV-FILE01 in Ruhe ablösen, BEVOR er stirbt.

Ein Wartungsfenster ist abgestimmt, die {fachabteilung} ist vorgewarnt. Kein Notfall, nur Handwerk.`,
    involvedCharacters: ['fachabteilung', 'chef'],
    mentorNote:
      'Geplante Migration heißt: Daten vorab synchronisieren, Cutover im Wartungsfenster, alten Host als Rückfalloption noch ein paar Tage behalten. Der Luxus, den vorausschauende Beschaffung erkauft, ist Zeit.',
    choices: [
      {
        id: 'migrate_clean',
        text: 'Daten vorab spiegeln, Cutover im Wartungsfenster, alten Host als Fallback behalten',
        effects: { skills: { netzwerk: 6, troubleshooting: 5 }, relationships: { chef: 10, fachabteilung: 8 }, compliance: 8, stress: 4 },
        resultText:
          'Montagfrüh läuft alles auf der neuen Hardware, niemand merkt etwas. {chef}: „Das war ja unspektakulär." Genau so soll es sein.',
        teachingMoment:
          'Die beste Infrastruktur-Arbeit ist die, die niemand bemerkt. „Langweilig" ist bei kritischen Systemen das höchste Lob.',
      },
      {
        id: 'migrate_document',
        text: 'Migration sauber dokumentieren und SRV-FILE01 geordnet ausmustern',
        effects: { skills: { troubleshooting: 4 }, relationships: { chef: 6, kaemmerer: 8 }, compliance: 10, stress: 3 },
        resultText:
          'Du dokumentierst Konfiguration und Cutover und meldest die Altgeräte-Entsorgung. {kaemmerer} sieht: Die Investition war begründet und sauber umgesetzt. Das merkt er sich beim nächsten Antrag.',
        teachingMoment:
          'Eine dokumentierte, begründete Investition macht den nächsten Budgetantrag leichter — Vertrauen ist Währung beim Kämmerer.',
      },
    ],
    tags: ['team', 'chain_consequence', 'hardware', 'migration'],
  },

  // ── Consequence B: the host dies mid-operation ────────────────────
  {
    id: 'evt_server_death',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 11,
    title: 'SRV-FILE01 ist tot',
    description: `Dienstag, mitten im Betrieb. Das Lüftergeräusch im Serverraum bricht ab. SRV-FILE01 reagiert nicht mehr — kein Ping, kein Licht am Netzteil. Die Fachverfahren stehen, die {fachabteilung} kann nicht mehr arbeiten.

Du erinnerst dich an den alten Server, über den du vor ein paar Wochen entschieden hast. Das RAID hat den schleichenden Plattentod überlebt — aber das Netzteil und der Controller eben nicht. Acht Jahre, und heute ist Schluss.

{chef} steht im Türrahmen: „Wie lange?"`,
    involvedCharacters: ['chef', 'fachabteilung', 'kaemmerer'],
    mentorNote:
      'Ein toter End-of-Life-Host ohne Ersatzteile ist der teuerste Moment, um Hardware zu beschaffen — Express-Lieferung, Stillstandskosten, Überstunden. Genau diese Summe stand vorher im Business Case. Wiederanlauf braucht: Ersatz-Hardware, ein aktuelles Backup und einen dokumentierten Wiederherstellungsweg.',
    choices: [
      {
        id: 'emergency_procure',
        text: 'Express-Ersatzhardware bestellen und über Nacht aufsetzen',
        effects: { skills: { troubleshooting: 6, netzwerk: 4 }, relationships: { chef: 4, kaemmerer: -15, fachabteilung: -5 }, budget: -6000, stress: 18, compliance: -3 },
        resultText:
          'Express-Versand, Nachtschicht, Wiederherstellung aus dem letzten Backup. Am nächsten Mittag läuft es wieder — zum dreifachen Preis einer geplanten Beschaffung. {kaemmerer} ist fassungslos über die Notfall-Rechnung.',
        teachingMoment:
          'Der Notkauf kostet ein Vielfaches der geplanten Investition — plus Stillstand und Überstunden. Das ist der Preis des Aufschiebens.',
      },
      {
        id: 'borrow_hardware',
        text: 'Dienste provisorisch auf einen anderen vorhandenen Host umziehen',
        requires: { skill: 'netzwerk', threshold: 35 },
        effects: { skills: { netzwerk: 6, troubleshooting: 6 }, relationships: { chef: 8, fachabteilung: 6 }, stress: 15, compliance: 2 },
        resultText:
          'Du quetschst die wichtigsten Fachverfahren provisorisch auf einen Testserver. Es ruckelt, aber es läuft. Die saubere Lösung verschiebst du auf die nun endlich genehmigte Beschaffung.',
        teachingMoment:
          'Ein Provisorium kauft Zeit, ist aber selbst ein Risiko. Sofort ein Ticket für die endgültige Lösung aufmachen, sonst wird das Provisorium zum Dauerzustand.',
      },
      {
        id: 'blame_no_budget',
        text: '"Ich wollte den Server ersetzen — das Geld gab es nicht."',
        effects: { relationships: { kaemmerer: -10, chef: -8 }, stress: 8, compliance: -5 },
        resultText:
          '{kaemmerer} kontert: „Ich habe nie einen begründeten Antrag mit Ausfallrisiko gesehen." Die Schuldfrage hilft niemandem — die Fachverfahren stehen weiter still.',
        choiceTags: ['deflect'],
        teachingMoment:
          'Ohne dokumentierten, bezifferten Antrag steht im Ernstfall Aussage gegen Aussage. Wer Risiken sauber meldet, steht hinterher nicht als Schuldiger da.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'hardware', 'outage', 'availability'],
  },
];
