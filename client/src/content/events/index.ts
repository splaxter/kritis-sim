import { GameEvent } from '@kritis/shared';
import { week1Events } from './week1';
import { week2to4Events } from './week2-4';
import { week5to8Events } from './week5-8';
import { week9to12Events } from './week9-12';
import { kritisSpecialEvents } from './kritis-special';
import { tutorialEvents } from './tutorials';
import { chainEvents } from './chains';
import { storyEvents } from './story';
import { learningPathEvents } from './learning-path';

export const allEvents: GameEvent[] = [
  ...week1Events,
  ...week2to4Events,
  ...week5to8Events,
  ...week9to12Events,
  ...kritisSpecialEvents,
  ...tutorialEvents,
  ...chainEvents,
  ...storyEvents,
  ...learningPathEvents,
];

export function getEventById(id: string): GameEvent | undefined {
  return allEvents.find((e) => e.id === id);
}
