import { GameEvent } from '@kritis/shared';
import { storyWeek1to2Events } from './story-week1-2';
import { storyWeek3to5Events } from './story-week3-5';
import { storyWeek5to8Events } from './story-week5-8';
import { storyWeek7to10Events } from './story-week7-10';
import { storyWeek9to12Events } from './story-week9-12';
import { conditionalEvents } from './conditional-events';
import { randomFlavorEvents } from './random-events';

export const storyEvents: GameEvent[] = [
  ...storyWeek1to2Events,
  ...storyWeek3to5Events,
  ...storyWeek5to8Events,
  ...storyWeek7to10Events,
  ...storyWeek9to12Events,
  ...conditionalEvents,
  ...randomFlavorEvents,
];

// Re-export individual event sets for testing/debugging
export {
  storyWeek1to2Events,
  storyWeek3to5Events,
  storyWeek5to8Events,
  storyWeek7to10Events,
  storyWeek9to12Events,
  conditionalEvents,
  randomFlavorEvents,
};
