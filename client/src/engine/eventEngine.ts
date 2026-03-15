import { GameEvent, GameState, EventChoice, Skills } from '@kritis/shared';
import { isDialogueUnlocked, hasAbility } from './adventureEngine';

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

    // Check mode requirements (e.g., tutorial events only in beginner mode)
    if (event.requiredModes && event.requiredModes.length > 0) {
      if (!event.requiredModes.includes(state.gameMode)) {
        return false;
      }
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

  // Include completed events count so selection varies as you progress through a day
  const hashInput = seed + state.currentWeek + state.currentDay + state.completedEvents.length;
  const hash = simpleHash(hashInput);
  const index = hash % available.length;
  return available[index];
}

export function getVisibleChoices(
  event: GameEvent,
  state: GameState
): EventChoice[] {
  return event.choices.filter((choice) => {
    // Check if this is a sidequest-unlocked choice (marked with unlocks array)
    if (choice.unlocks && choice.unlocks.length > 0) {
      // This choice requires specific unlocks - check if any are met
      const hasRequiredUnlock = choice.unlocks.some(unlock => {
        // Check if it's a dialogue unlock from sidequest
        if (isDialogueUnlocked(state, event.id, choice.id)) {
          return true;
        }
        // Check if it's an ability requirement
        if (hasAbility(state, unlock)) {
          return true;
        }
        // Check if it's a flag
        if (state.flags[unlock]) {
          return true;
        }
        return false;
      });

      if (!hasRequiredUnlock) {
        return false;
      }
    }

    // Standard hidden check
    if (choice.hidden) {
      // Hidden choices can be revealed by sidequest dialogue unlocks
      if (state.isAdventureMode && isDialogueUnlocked(state, event.id, choice.id)) {
        // Choice is unlocked by sidequest - show it
      } else {
        return false;
      }
    }

    // Check skill requirements
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
