/**
 * Adventure Mode Content Index
 * "Die Probezeit" - A workplace comedy meets cyber thriller
 */

export { adventureChapters, TOTAL_CHAPTERS, TOTAL_STORY_BEATS } from './chapters';
export { adventureSidequests, getSidequestById, TOTAL_SIDEQUESTS } from './sidequests';
export { adventureStoryEvents } from './story-events';

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
    '15+ Sidequests die die Story beeinflussen',
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
    id: 'thomas',
    name: 'Thomas',
    role: 'Dein Kollege',
    description: 'Der andere IT-Admin. Hat Geheimnisse, aber auch ein gutes Herz.',
    arcPotential: 'Vom Kollegen zum Verbündeten - oder zum Rivalen',
  },
  {
    id: 'chef',
    name: 'Herr Bernd',
    role: 'Dein Chef',
    description: 'Alter Schule. Versteht IT nicht, aber sein Herz ist am rechten Fleck. Meistens.',
    arcPotential: 'Vom Hindernis zum Mentor - oder zum Gegner',
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
