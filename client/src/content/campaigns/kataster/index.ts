/**
 * "DAS KATASTER" — die dritte WARM-Kampagne als CampaignDefinition.
 *
 * Leitfrage eine Ebene vor AUDIT TRAIL: nicht „kann ich beweisen, was ich getan
 * habe", sondern „weiss ich überhaupt, was wir schulden — und wer es tut".
 * Gegner ist die verwaiste Pflicht, kein Mensch.
 *
 * Eigenständige Parallelgeschichte: bekannte Besetzung, frischer Flag- und
 * Beziehungszustand, kein Import eines Endes aus einer anderen Kampagne.
 */
import { CampaignDefinition } from '../types';
import { katasterChapters } from './chapters';
import { katasterStoryEvents } from './events';
import { KATASTER_CHARACTERS } from './characters';
import { KATASTER_ACT_BREAKS } from './actBreaks';
import { KATASTER_ENDING_TEXTS, buildKatasterEpilogue } from './endings';
import { deriveKatasterEnding } from './domains';

export const katasterCampaign: CampaignDefinition = {
  id: 'kataster',
  title: 'Das Kataster',
  menu: {
    eyebrow: 'KAMPAGNE 3',
    description:
      'Der neue ISB stellt eine Frage, die niemand im Haus beantworten kann: Welche Regelwerke gelten für Sie? Dein Vorgänger ist in Rente, sein Ordner halb leer — und jede Pflicht ohne Aufpasser ist eine Uhr, die schon läuft.',
    // Kurz gehalten, weil gemessen: auf 320 px kostet jede Zeile hier rund 16 px
    // Kartenhöhe, und eine Karte, die nicht mehr in den Bildschirm passt, warnt
    // erst nach dem Scrollen. Die Begründung steht im Level, die Warnung hier.
    prerequisite:
      'Voraussetzung: Terminal-Grundlagen. Du suchst, liest und schreibst hier selbst in der Shell. Ohne CLI-Erfahrung: erst Kampagne 1.',
    meta: '6 Kapitel · 3 Enden · Hands-on (Terminal & Kataster)',
    badge: 'TERMINAL',
    badgeClass: 'border-terminal-warning text-terminal-warning',
  },
  // Sichtbar, weil sie gefunden werden soll — aber NICHT die einsteigerfreundlichste:
  // im Stoff ja (die Leitfrage braucht kein Vorwissen), im Werkzeug nein. Jedes
  // Level verlangt Suchen, Lesen UND Schreiben in der Shell; Kampagne 1 ist der
  // sanfte Einstieg. Deshalb die Voraussetzungszeile oben.
  startChapterId: 'kt_ch01_ordner',
  chapters: katasterChapters,
  sidequests: [],
  storyEvents: katasterStoryEvents,
  sidequestEvents: [],
  endingTexts: KATASTER_ENDING_TEXTS,
  actBreaks: KATASTER_ACT_BREAKS,
  characters: KATASTER_CHARACTERS,
  // {token} → Anzeigename in Erzähltext. Kampagnen-eigen, damit App keine
  // fest verdrahtete Besetzung kennt.
  characterTokens: {
    chef: 'Bert',
    gf: 'Dr. Müller',
    kaemmerer: 'Frau Petersen',
    kollege: 'Bjorg',
    isb: 'Herr Michael',
  },
  endingHeadline: 'DAS KATASTER — ABGESCHLOSSEN',
  // Text-only wie AUDIT TRAIL (keine Chapter-Art), Ende über Domänen statt
  // Punktestand.
  usesScoreStats: false,
  // Bert ist wohlwollend, das Team neutral: die Kampagne lebt nicht von
  // Misstrauen, sondern von Unwissen.
  startingRelationships: { chef: 5, kollegen: 5 },
  deriveEnding: (state) => deriveKatasterEnding(state.flags),
  buildEpilogue: (state) => buildKatasterEpilogue(state.flags),
};

export { deriveKatasterEnding, satisfiedDomains, KATASTER_DOMAINS } from './domains';
export { buildKatasterEpilogue } from './endings';
