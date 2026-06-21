import { GameEvent } from '@kritis/shared';

/**
 * Chain J: Der Freitags-Change (red-thread continuity — change management)
 *
 * Flow:
 * evt_friday_change (Week 3-5) — Freitagnachmittag, riskante Änderung soll noch live.
 *   -> "Testen + Rollback + Montag-Fenster + Stakeholder informieren" => evt_change_smooth (payoff)
 *   -> Freitag pushen (ungetestet / mit Rollback / weil der Chef drängt) => evt_friday_outage (disaster)
 *
 * Distinct operational-discipline thread (not governance like monitoring/
 * offboarding/backup): the pillars are testing, a rollback plan, change-freeze /
 * maintenance windows, and stakeholder comms. Scoped non-story/non-learning.
 */

export const changeChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_friday_change',
    weekRange: [3, 5],
    probability: 0.95,
    requiredModes: ['beginner', 'kritis', 'intermediate', 'hard'],
    category: 'support',
    title: 'Noch schnell vor dem Wochenende',
    description: `Freitag, 16:30. {chef} steht an deinem Schreibtisch: „Die neue Firewall-Regel fürs Bürgerportal — kannst du die noch eben live nehmen? Wäre schön, wenn das übers Wochenende schon läuft."

Kein Test, kein dokumentierter Rollback, und ab 17:00 ist niemand mehr erreichbar. Nächste Woche ist außerdem eigentlich Change-Freeze wegen der anstehenden Prüfung.

„Ist doch nur eine Regel", sagt {chef}.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'Der „Read-only Friday" ist in vielen Betrieben Policy: Wenn eine Änderung am Freitag bricht, ist das Wochenende die Ausfallzeit und niemand da, um es zu bemerken. Sauberes Change-Management heißt: im Testsystem prüfen, Rollback-Plan dokumentieren, ein geeignetes Wartungsfenster wählen (nicht vor Wochenende/Feiertag/Freeze) und die Betroffenen informieren.',
    choices: [
      {
        id: 'proper_window',
        text: 'Im Test prüfen, Rollback dokumentieren, für Montag früh ins Wartungsfenster legen, Betroffene informieren',
        effects: { skills: { netzwerk: 4, troubleshooting: 3 }, compliance: 8, stress: 5, relationships: { chef: -2, fachabteilung: 4 } },
        resultText:
          'Du erklärst {chef} ruhig: getestet, mit Rollback, Montag im Fenster. Er ist kurz genervt über die Verzögerung — aber die Fachabteilung bekommt eine saubere Ankündigung statt einer Wochenend-Überraschung.',
        choiceTags: ['careful', 'methodical', 'prepared'],
        teachingMoment:
          'Testen + Rollback + Wartungsfenster + Kommunikation ist der ganze Change-Management-Werkzeugkasten in einem Satz.',
        chainTriggers: [
          {
            targetEventId: 'evt_change_smooth',
            delayWeeks: 2,
            description: 'A tested, scheduled change goes in cleanly in the Monday window.',
          },
        ],
      },
      {
        id: 'push_friday_untested',
        text: 'Schnell die Regel setzen und ab ins Wochenende',
        effects: { stress: -3, compliance: -5 },
        resultText:
          'Zwei Klicks, gespeichert, Feierabend. {chef} ist zufrieden. Du denkst nicht weiter drüber nach.',
        choiceTags: ['reckless', 'hasty'],
        chainTriggers: [
          {
            targetEventId: 'evt_friday_outage',
            delayWeeks: 1,
            description: 'Untested Friday change breaks over the weekend.',
          },
        ],
      },
      {
        id: 'push_friday_rollback',
        text: 'Setzen — aber vorher die alte Konfiguration sichern, falls was ist',
        effects: { skills: { netzwerk: 2 }, stress: 2, compliance: -2 },
        resultText:
          'Immerhin ziehst du ein Konfig-Backup, bevor du die Regel aktivierst. Dann gehst du. Erreichbar bist du am Wochenende trotzdem nicht.',
        choiceTags: ['half_measure'],
        setsFlags: ['change_had_rollback'],
        teachingMoment:
          'Ein Rollback bereitzuhalten ist gut — ändert aber nichts daran, dass ein ungetesteter Freitag-Deploy ins unbeobachtete Wochenende geht.',
        chainTriggers: [
          {
            targetEventId: 'evt_friday_outage',
            delayWeeks: 1,
            description: 'Friday change breaks, but a rollback was prepared.',
          },
        ],
      },
      {
        id: 'cave_to_pressure',
        text: 'Nicht diskutieren — {chef} will es, also durchziehen',
        effects: { relationships: { chef: 5 }, stress: 5, compliance: -5 },
        resultText:
          'Du willst dich nicht streiten und setzt die Regel. {chef} klopft dir auf die Schulter. „Sehr gut, unkompliziert."',
        choiceTags: ['passive', 'pressure'],
        chainTriggers: [
          {
            targetEventId: 'evt_friday_outage',
            delayWeeks: 1,
            description: 'Caved to pressure, pushed Friday, it breaks.',
          },
        ],
      },
    ],
    tags: ['support', 'chain_start', 'change_management', 'operations'],
  },

  // ── Consequence A: the boring, correct outcome ────────────────────
  {
    id: 'evt_change_smooth',
    weekRange: [4, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 10,
    title: 'Montag, 7:00, Wartungsfenster',
    description: `Montagfrüh im Wartungsfenster: Du spielst die getestete Änderung ein, der Rollback liegt griffbereit, die Fachabteilung weiß Bescheid. 20 Minuten, alles grün, Funktion geprüft.

Du erinnerst dich an den Freitag, an dem du NICHT gepusht hast. Genau deshalb ist heute ein ruhiger Morgen.`,
    involvedCharacters: ['chef', 'fachabteilung'],
    mentorNote:
      'So sieht ein gut gemanagter Change aus: geplant, getestet, kommuniziert, mit Rückweg — und damit unspektakulär. Kurz im Change-Log dokumentieren, dann ist es auch audit-fest.',
    choices: [
      {
        id: 'verify_and_close',
        text: 'Funktion prüfen, Change dokumentieren, Ticket schließen',
        effects: { skills: { netzwerk: 4, troubleshooting: 3 }, relationships: { chef: 8, fachabteilung: 5 }, compliance: 8, stress: -3 },
        resultText:
          'Alles läuft, der Change ist sauber dokumentiert, das Ticket zu. {chef}: „War ja unkompliziert." Genau so soll es sein.',
        teachingMoment: 'Der beste Change ist der, von dem niemand etwas mitbekommt.',
      },
      {
        id: 'write_change_log',
        text: 'Ein kurzes Change-Protokoll für die Doku und das nächste Audit schreiben',
        effects: { skills: { troubleshooting: 2 }, relationships: { kaemmerer: 6, chef: 4 }, compliance: 10, stress: 2 },
        resultText:
          'Du hältst Was/Wann/Warum/Rollback in zwei Sätzen fest. Beim nächsten Audit ist genau das der Unterschied zwischen „dokumentierter Prozess" und „Bauchgefühl".',
        choiceTags: ['thorough'],
        teachingMoment: 'Ein knappes Change-Protokoll kostet zwei Minuten und ist im Audit Gold wert.',
      },
    ],
    tags: ['team', 'chain_consequence', 'change_management'],
  },

  // ── Consequence B: the weekend outage ─────────────────────────────
  {
    id: 'evt_friday_outage',
    weekRange: [4, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 10,
    title: 'Das ganze Wochenende down',
    description: `Montag, 7:50 Uhr. Dein Postfach quillt über. Die Firewall-Regel von Freitag hat das Bürgerportal lahmgelegt — seit Samstagmorgen. Zwei Tage lang kein Portal, keine Anträge, und niemand war da, um es überhaupt zu bemerken.

Du erinnerst dich an den Freitag-Push. {chef} steht schon in der Tür, das Telefon klingelt parallel.`,
    involvedCharacters: ['chef', 'fachabteilung'],
    mentorNote:
      'Der klassische Freitag-Schaden: nicht der Fehler selbst, sondern die zwei Tage unbemerkter Ausfallzeit. Erst zurückrollen und das System stabilisieren, dann den eigentlichen Fehler in Ruhe analysieren — und künftig riskante Changes nicht mehr vor das Wochenende legen.',
    choices: [
      {
        id: 'rollback_now',
        text: 'Sofort auf die alte Konfiguration zurückrollen',
        effects: { skills: { netzwerk: 5, troubleshooting: 5 }, relationships: { chef: 2, fachabteilung: -5 }, stress: 15 },
        resultText:
          'Du spielst die alte Konfiguration zurück. Nach 15 Minuten läuft das Portal wieder — 15 Minuten, denen aber ein ganzes verlorenes Wochenende vorausging.',
        teachingMoment: 'Ein vorbereiteter Rollback macht genau diesen Moment kurz. Hattest du keinen, wird aus 15 Minuten schnell ein halber Tag.',
      },
      {
        id: 'rollback_and_policy',
        text: 'Zurückrollen, Postmortem schreiben und eine „kein Deploy am Freitag"-Regel einführen',
        effects: { skills: { netzwerk: 4, troubleshooting: 3 }, relationships: { chef: 6 }, compliance: 8, stress: 18 },
        resultText:
          'Du stellst den Betrieb wieder her und ziehst die Lehre: ein kurzes Postmortem und eine Freeze-Regel für Freitage und Vor-Feiertage. {chef}: „Hätten wir das mal vorher gehabt." Hättet ihr.',
        choiceTags: ['lessons_learned'],
        teachingMoment: 'Aus dem Ausfall eine Regel zu machen ist die eigentliche Reife — nur diesmal teuer mit einem Wochenend-Ausfall bezahlt.',
      },
      {
        id: 'blame_the_push',
        text: '"Der {chef} wollte es ja unbedingt noch am Freitag."',
        effects: { relationships: { chef: -8, kaemmerer: -5 }, compliance: -5, stress: 8 },
        resultText:
          '{chef}: „Und du bist der Admin — du hättest Nein sagen können." Die Schuldzuweisung hilft niemandem, und das Portal war trotzdem zwei Tage offline.',
        choiceTags: ['deflect'],
        teachingMoment: 'Den Deploy-Zeitpunkt verantwortet am Ende die IT. „Nein, nicht Freitag" zu sagen gehört zum Job.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'change_management', 'outage'],
  },
];
