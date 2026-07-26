/**
 * "Die Probezeit" — the original campaign, packaged as a CampaignDefinition by
 * wrapping the existing content modules verbatim. No content is moved or
 * changed; this only groups it behind the campaign registry so a second
 * campaign can coexist.
 */
import { CampaignDefinition, StoryCharacter } from './types';
import { adventureChapters } from '../adventure/chapters';
import { adventureSidequests } from '../adventure/sidequests';
import { adventureStoryEvents } from '../adventure/story-events';
import { adventureSidequestEvents } from '../adventure/sidequest-events';
import { ADVENTURE_ENDINGS } from '../adventure/endings';
import { ACT_BREAK_BODIES } from '../adventure/actBreaks';
import { STORY_CHARACTERS } from '../adventure';
import { deriveProbationEnding } from '../adventure/probationEnding';

export const probationCampaign: CampaignDefinition = {
  id: 'probation',
  title: 'Die Probezeit',
  menu: {
    eyebrow: 'KAMPAGNE 1',
    description:
      'Ein zusammenhängender IT-Krimi in 12 Kapiteln mit Beziehungen und mehreren Enden — vorwiegend Text & Entscheidungen, wenig Hands-on.',
    meta: '12 Kapitel · 3 Enden · Casual',
    badge: 'EMPFOHLEN',
    badgeClass: 'border-terminal-info text-terminal-info',
  },
  startChapterId: 'ch01_first_day',
  chapters: adventureChapters,
  sidequests: adventureSidequests,
  storyEvents: adventureStoryEvents,
  sidequestEvents: adventureSidequestEvents,
  endingTexts: ADVENTURE_ENDINGS,
  actBreaks: ACT_BREAK_BODIES,
  characters: STORY_CHARACTERS as StoryCharacter[],
  characterTokens: {
    chef: 'Bert',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Bjorg',
  },
  endingHeadline: 'PROBEZEIT BEENDET',
  usesScoreStats: true,
  defaultBackgroundImage: '/images/events/evt_erster_arbeitstag.webp',
  deriveEnding: deriveProbationEnding,
};
