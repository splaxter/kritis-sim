/**
 * Adventure Mode Content Index
 * "Die Probezeit" - A workplace comedy meets cyber thriller
 */

export { adventureChapters, TOTAL_CHAPTERS, TOTAL_STORY_BEATS } from './chapters';
export { adventureSidequests, getSidequestById, TOTAL_SIDEQUESTS } from './sidequests';
export { adventureStoryEvents } from './story-events';
export { adventureSidequestEvents } from './sidequest-events';

// Story summary for display
export const STORY_INFO = {
  title: 'Die Probezeit',
  subtitle: 'Ein IT-Krimi in 12 Kapiteln',
  tagline: 'The Office meets Mr. Robot',
  description: `Du bist der neue Sysadmin bei der Kommunalen Abfallwirtschaft.
Klingt langweilig? Warte ab.

Zwischen kaputten Druckern, einem Chef der "dieses Internet" nicht versteht,
und einem mysteriösen Vorgänger der plötzlich verschwunden ist,
wird deine Probezeit zum Abenteuer.

Finde heraus was wirklich passiert ist. Baue Allianzen.
Und überlebe die nächsten 12 Wochen.`,
  warnings: [
    'Linearer Storymodus - deine Entscheidungen haben Konsequenzen',
    'Sidequests beeinflussen den Verlauf der Geschichte',
    'Drei mögliche Enden basierend auf deinen Beziehungen und Entscheidungen',
  ],
  features: [
    '12 Kapitel in 3 Akten',
    'Optionale Sidequests, die die Story beeinflussen',
    'Charaktere die sich an deine Taten erinnern',
    'Comedy-Drama Ton mit echten Cyber-Gefahren',
  ],
};

// Ending descriptions
export const ENDINGS = {
  good: {
    title: 'Der Held',
    description: 'Du hast den Angriff gestoppt, dein Team steht hinter dir, und der Chef gibt dir einen unbefristeten Vertrag.',
    requirements: 'Hohe Beziehungen, wichtige Sidequests erledigt, richtige Vorbereitung',
  },
  neutral: {
    title: 'Gerade so',
    description: 'Der Angriff wurde gestoppt, aber mit Kollateralschäden. Deine Probezeit wird verlängert.',
    requirements: 'Mittelweg - einige Fehler, aber das Kernproblem wurde gelöst',
  },
  bad: {
    title: 'Pech gehabt',
    description: 'Du wirst entlassen wegen "mangelnder Eignung". Aber das Wissen das du hast... das bleibt.',
    requirements: 'Schlechte Beziehungen, keine Vorbereitung, Vertrauen verspielt',
  },
};

// Character list for the story
export const STORY_CHARACTERS = [
  {
    id: 'bjorg',
    name: 'Bjorg',
    role: 'Dein Kollege',
    description: 'Laut, immer im Weg, nie zuständig. Delegiert alles ("Kannst du das übernehmen? Ich bin gleich in einem wichtigen Termin") und erzählt Witze, über die nur er selbst lacht. Kennste?',
    arcPotential: 'Bleibt exakt so. Bis zum Schluss. Das ist keine Drohung, das ist ein Versprechen.',
  },
  {
    id: 'jens',
    name: 'Jens',
    role: 'Der stille Senior',
    description: 'Sagt wenig, weiß viel. Wenn etwas wirklich brennt, fragst du Jens. Er hat vor Jahren bei einem Energieversorger erlebt, was passiert, wenn niemand zuhört.',
    arcPotential: 'Vom schweigsamen Kollegen zum wichtigsten Verbündeten - wenn du sein Vertrauen verdienst',
  },
  {
    id: 'henry',
    name: 'Henry',
    role: 'Der Macher',
    description: 'Packt an, statt zu reden. Allergisch gegen Meetings und gegen Bjorgs Witze. Wenn irgendwo geschraubt, gepatcht oder um drei Uhr nachts ein Server gerettet werden muss: Henry ist schon da.',
    arcPotential: 'Der unverzichtbare Kollege - wenn ihn vorher niemand abwirbt oder verheizt',
  },
  {
    id: 'chef',
    name: 'Herr Bert',
    role: 'Dein Chef',
    description: 'Erfahrener Chef, der IT versteht und seinem Team den Rücken freihält. Pragmatisch, verlässlich - und wenn es brennt, ruhig.',
    arcPotential: 'Vom verlässlichen Rückhalt zum echten Verbündeten - oder, wenn du sein Vertrauen verspielst, zum Gegner',
  },
  {
    id: 'stefan',
    name: 'Stefan',
    role: 'Dein Vorgänger',
    description: 'Verschwunden. Hat Hinweise hinterlassen. Was wusste er?',
    arcPotential: 'Die Wahrheit über Stefan verändert alles',
  },
  {
    id: 'kaemmerer',
    name: 'Der Kämmerer',
    role: 'Budget-Verwalter',
    description: 'Hat die Macht über das Geld. Ein Excel-Albtraum könnte ihn zum Freund machen.',
    arcPotential: 'Vom Bürokraten zum Helfer - wenn du ihm hilfst',
  },
];
