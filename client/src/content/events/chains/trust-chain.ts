import { GameEvent } from '@kritis/shared';

/**
 * Chain C: The Trust Betrayal
 *
 * Flow:
 * evt_chef_credit (Week 4-6)
 *   -> If you let chef take credit: evt_chef_asks_more (1-2 weeks later)
 *   -> If you confront him: evt_chef_cold (1-2 weeks later)
 */

export const trustChainEvents: GameEvent[] = [
  // Starting event: Chef takes credit for your work
  {
    id: 'evt_chef_credit',
    weekRange: [4, 6],
    probability: 0.8,
    category: 'politics',
    title: 'Fremde Federn',
    description: `Du sitzt im wöchentlichen Abteilungsmeeting. {chef} präsentiert die Ergebnisse der letzten Woche.

"...und dank meiner Initiative haben wir die Backup-Strategie komplett überarbeitet. Die 3-2-1 Regel ist jetzt implementiert."

Du blinzelst. Das war DEINE Analyse. DEIN Plan. Du hast drei Nächte daran gearbeitet.

Jens schaut dich von der Seite an und zieht eine Augenbraue hoch.`,
    involvedCharacters: ['chef', 'kollege', 'kaemmerer'],
    mentorNote: 'Beförderungen hängen oft davon ab, wer sichtbar ist - nicht nur, wer arbeitet. Dokumentiere deine Erfolge, kommuniziere sie proaktiv. "Managing up" ist eine wichtige Fähigkeit, aber Integrität geht vor.',
    choices: [
      {
        id: 'credit_accept',
        text: 'Nichts sagen - er ist der Chef, er darf das',
        effects: { stress: 10, relationships: { chef: 5, kollegen: -5 } },
        resultText: 'Du schluckst deinen Aerger runter. Jens schüttelt fast unmerklich den Kopf. Nach dem Meeting sagt er: "Ich hätte das nicht durchgehen lassen."',
        choiceTags: ['passive', 'doormat'],
        chainTriggers: [{
          targetEventId: 'evt_chef_asks_more',
          delayWeeks: 2,
          description: 'Chef sees you as someone who accepts being walked over',
        }],
      },
      {
        id: 'credit_confront_meeting',
        text: 'Im Meeting korrigieren: "Eigentlich habe ich das erarbeitet."',
        effects: { relationships: { chef: -20, kollegen: 10, kaemmerer: 5 }, stress: 15 },
        resultText: 'Die Stille ist ohrenbetäubend. {chef} läuft rot an. "Natürlich, du hast die Ausführung gemacht. Unter meiner Anleitung." Der Rest des Meetings ist eisig.',
        choiceTags: ['confrontational', 'honest'],
        chainTriggers: [{
          targetEventId: 'evt_chef_cold',
          delayWeeks: 1,
          description: 'Chef is cold after being publicly called out',
        }],
      },
      {
        id: 'credit_later',
        text: 'Nach dem Meeting privat ansprechen',
        effects: { relationships: { chef: -5 }, stress: 8, skills: { softSkills: 5 } },
        resultText: 'Du fängst {chef} nach dem Meeting ab. "Die Backup-Sache war meine Arbeit." Er seufzt. "Du hast recht. Im nächsten Meeting erwähne ich dich." Ob er das wirklich tut?',
        choiceTags: ['diplomatic'],
        teachingMoment: 'Direktes, privates Feedback ist oft effektiver als öffentliche Konfrontation. Aber: Dokumentiere solche Gespräche für dich.',
      },
      {
        id: 'credit_document',
        text: 'Eine Mail an alle schicken mit deiner Dokumentation der Backup-Strategie',
        requires: { skill: 'softSkills', threshold: 35 },
        effects: { relationships: { chef: -10, kollegen: 5, fachabteilung: 5 }, stress: 5 },
        resultText: '"Hier die technische Dokumentation zur neuen Backup-Strategie, wie von mir erarbeitet." {chef} antwortet nicht, aber alle wissen jetzt Bescheid.',
        choiceTags: ['passive_aggressive', 'documented'],
        teachingMoment: 'Dokumentation macht Leistung nachweisbar. "Written culture" schützt vor Aneignung.',
      },
    ],
    tags: ['politics', 'chain_start', 'career', 'trust'],
  },

  // Consequence: Chef asks for more (if you accepted being walked over)
  {
    id: 'evt_chef_asks_more',
    weekRange: [6, 9],
    probability: 1.0,
    category: 'politics',
    isChainEvent: true,
    chainPriority: 6,
    title: 'Noch ein Gefallen',
    description: `{chef} kommt an deinen Schreibtisch.

"Du bist doch so gut in diesen technischen Dokumenten. Ich muss morgen einen Bericht für den Bürgermeister abliefern. Kannst du das schnell fertig machen? Mein Name steht dann drauf, aber du weisst ja, wie das läuft."

Er lächelt kumpelhaft. Oder ist das ein Haifischlächeln?

Jens tippt demonstrativ laut auf seiner Tastatur.`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Wenn du einmal nachgibst, wird oft mehr verlangt. Grenzen setzen ist wichtig - aber die Art und Weise entscheidet, ob du als "schwierig" oder als "selbstbewusst" wahrgenommen wirst.',
    choices: [
      {
        id: 'more_accept',
        text: 'Seufzen und den Bericht schreiben',
        effects: { stress: 15, relationships: { chef: 5, kollegen: -10 } },
        resultText: 'Du schreibst den Bericht. Er ist gut. Dein Name taucht nirgends auf. Jens: "Du weisst, dass er das immer wieder machen wird, oder?"',
        choiceTags: ['pushover'],
      },
      {
        id: 'more_negotiate',
        text: '"Klar, aber diesmal mit Co-Autor-Nennung."',
        effects: { relationships: { chef: -5 }, stress: 8, skills: { softSkills: 8 } },
        resultText: '{chef} überlegt. "Na gut, als technischer Ansprechpartner. Aber ich bleibe Hauptautor." Besser als nichts.',
        choiceTags: ['negotiate'],
        teachingMoment: 'Kleine Zugeständnisse bei gleichzeitiger Grenzziehung zeigen Kompetenz ohne Konfrontation.',
      },
      {
        id: 'more_refuse',
        text: '"Das ist nicht meine Aufgabe. Ich habe eigene Projekte."',
        effects: { relationships: { chef: -15 }, stress: 5, skills: { softSkills: 5 } },
        resultText: '{chef}s Lächeln gefriert. "Aha. Na dann." Er dreht sich um und geht. Du spürst, dass das Konsequenzen haben wird.',
        choiceTags: ['boundary_setting'],
      },
      {
        id: 'more_redirect',
        text: '"Vielleicht kann Jens helfen? Er kennt die Historie besser."',
        effects: { relationships: { kollegen: -10, chef: 0 }, stress: 5 },
        resultText: 'Jens schiesst dir einen giftigen Blick zu. "Nein danke, ICH habe Prinzipien." Unangenehm.',
        choiceTags: ['redirect'],
      },
    ],
    tags: ['politics', 'chain_consequence', 'boundaries', 'career'],
  },

  // Consequence: Chef is cold (if you confronted him)
  {
    id: 'evt_chef_cold',
    weekRange: [5, 8],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 6,
    title: 'Kalte Schulter',
    description: `Es ist Mittwoch und {chef} hat dich diese Woche noch nicht einmal angesprochen.

Meetings, an denen du teilnehmen solltest? Du wirst nicht eingeladen. Emails werden nicht beantwortet. Als du ihn auf dem Flur grüßt, nickt er nur kurz und geht weiter.

Jens bemerkt es auch: "Seit deiner Aktion im Meeting läuft das irgendwie anders, oder?"`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'Workplace Icing ist eine passive-aggressive Taktik. Dokumentiere die fehlende Kommunikation, suche aktiv andere Kommunikationswege, und wenn es eskaliert: HR einschalten. Das ist kein professionelles Verhalten.',
    choices: [
      {
        id: 'cold_confront',
        text: 'Direkt ansprechen: "Können wir reden? Die Stimmung ist merkwürdig."',
        requires: { skill: 'softSkills', threshold: 40 },
        effects: { relationships: { chef: 5 }, stress: 10, skills: { softSkills: 8 } },
        resultText: '{chef} ist überrascht von der Direktheit. "Ich war... ja, vielleicht überempfindlich. Lass uns nach vorne schauen." Die Luft ist gereinigt - erstmal.',
        teachingMoment: 'Konflikte direkt anzusprechen verhindert, dass sie eitern. Aber: Timing und Tonfall sind entscheidend.',
      },
      {
        id: 'cold_ignore',
        text: 'Ignorieren und weiterarbeiten - er wird schon wieder auftauen',
        effects: { stress: 15, relationships: { chef: -5 } },
        resultText: 'Wochen vergehen. Die Situation normalisiert sich... oberflächlich. Aber du spürst, dass etwas kaputt ist.',
        choiceTags: ['avoidant'],
      },
      {
        id: 'cold_hr',
        text: 'Mit HR sprechen - das ist nicht professionell',
        effects: { relationships: { chef: -20 }, stress: 10, compliance: 5 },
        resultText: 'HR notiert deine Beschwerde. Eine Woche später gibt es ein "Klärungsgespräch". {chef} ist danach noch kälter, aber zumindest dokumentiert alles.',
        choiceTags: ['escalate'],
      },
      {
        id: 'cold_ally',
        text: 'Bei Jens und anderen Allianzen aufbauen',
        effects: { relationships: { kollegen: 10, fachabteilung: 5 }, stress: 5, skills: { softSkills: 5 } },
        resultText: 'Du konzentrierst dich auf die Beziehungen, die funktionieren. Jens: "Gut gemacht. Einen Chef kann man überleben, wenn man die anderen auf seiner Seite hat."',
        teachingMoment: 'Ein starkes Netzwerk macht dich weniger abhängig von einzelnen Personen.',
      },
    ],
    tags: ['team', 'chain_consequence', 'conflict', 'politics'],
  },
];
