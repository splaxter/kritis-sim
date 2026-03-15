import { GameEvent } from '@kritis/shared';
import { week1Events } from './week1';
import { week2to4Events } from './week2-4';
import { week9to12Events } from './week9-12';
import { kritisSpecialEvents } from './kritis-special';

export const allEvents: GameEvent[] = [
  ...week1Events,
  ...week2to4Events,
  ...week9to12Events,
  ...kritisSpecialEvents,
];

export function getEventById(id: string): GameEvent | undefined {
  return allEvents.find((e) => e.id === id);
}
