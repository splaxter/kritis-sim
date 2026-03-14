import { GameEvent } from '@kritis/shared';
import { week1Events } from './week1';

export const allEvents: GameEvent[] = [
  ...week1Events,
  // Future: ...week2Events, etc.
];

export function getEventById(id: string): GameEvent | undefined {
  return allEvents.find((e) => e.id === id);
}
