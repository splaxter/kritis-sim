import { GameEvent, GameState, EventChoice, Skills } from '@kritis/shared';

export function getAvailableEvents(
  events: GameEvent[],
  state: GameState
): GameEvent[] {
  return events.filter((event) => {
    // Check week range
    if (state.currentWeek < event.weekRange[0] || state.currentWeek > event.weekRange[1]) {
      return false;
    }

    // Check day preference
    if (event.dayPreference && !event.dayPreference.includes(state.currentDay)) {
      return false;
    }

    // Check if already completed
    if (state.completedEvents.includes(event.id)) {
      return false;
    }

    // Check prerequisites
    if (event.requires) {
      if (event.requires.events) {
        for (const reqEvent of event.requires.events) {
          if (!state.completedEvents.includes(reqEvent)) {
            return false;
          }
        }
      }

      if (event.requires.flags) {
        for (const flag of event.requires.flags) {
          if (!state.flags[flag]) {
            return false;
          }
        }
      }

      if (event.requires.skills) {
        for (const [skill, value] of Object.entries(event.requires.skills)) {
          if (state.skills[skill as keyof Skills] < (value || 0)) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export function selectNextEvent(
  events: GameEvent[],
  state: GameState,
  seed: string
): GameEvent | null {
  const available = getAvailableEvents(events, state);
  if (available.length === 0) return null;

  // Simple seeded random selection
  const hash = simpleHash(seed + state.currentWeek + state.currentDay);
  const index = hash % available.length;
  return available[index];
}

export function getVisibleChoices(
  event: GameEvent,
  state: GameState
): EventChoice[] {
  return event.choices.filter((choice) => {
    if (choice.hidden) return false;

    if (choice.requires) {
      const skillValue = state.skills[choice.requires.skill];
      return skillValue >= choice.requires.threshold;
    }

    return true;
  });
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
