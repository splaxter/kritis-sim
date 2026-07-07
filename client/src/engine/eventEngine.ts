import { GameEvent, GameState, EventChoice, Skills, getGameModeConfig } from '@kritis/shared';
import { isDialogueUnlocked, hasAbility } from './adventureEngine';
import { getActivatedChainEvents } from './chainEngine';

export function getAvailableEvents(
  events: GameEvent[],
  state: GameState
): GameEvent[] {
  const modeConfig = getGameModeConfig(state.gameMode);
  const cliOnly = modeConfig.features.cliOnly;

  return events.filter((event) => {
    // CLI-only mode (learning): only show hands-on levels (terminal OR Windows-GUI)
    // that are explicitly designed for learning mode.
    if (cliOnly) {
      // Must have a terminal challenge or a GUI challenge
      if (!event.terminalContext && !event.guiContext) {
        return false;
      }
      // Must be explicitly designed for learning mode
      if (!event.requiredModes || !event.requiredModes.includes('learning')) {
        return false;
      }
    }

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
  // Chain throttle: serve at most ONE chain consequence per in-game week.
  // Pending consequences cluster in weeks 5–12; without a throttle they fire on
  // consecutive days and pile up. We detect "a chain event already resolved
  // this week" from the decision log (every completed event records its week),
  // then hold the rest — they stay pending and resurface in a later week.
  // cliOnly modes (learning) only serve hands-on terminal/GUI levels. Chain
  // consequences (regular event cards) must NOT leak in via PRIORITY 1 — a
  // "red thread" in learning is built from prerequisites + callback copy, not
  // the chainTrigger system. This keeps the learning contract intact and makes
  // it structurally impossible to mis-author a chainTrigger chain there.
  const cliOnly = getGameModeConfig(state.gameMode).features.cliOnly === true;

  const chainIds = new Set(events.filter((e) => e.isChainEvent).map((e) => e.id));
  const servedChainThisWeek = state.decisions.some(
    (d) => d.week === state.currentWeek && chainIds.has(d.eventId)
  );

  // PRIORITY 1: Activated chain events (consequences from past decisions),
  // unless one already fired this week (throttle) or we're in a cliOnly mode.
  if (!cliOnly && !servedChainThisWeek) {
    const chainEvents = getActivatedChainEvents(state, events);
    if (chainEvents.length > 0) {
      // Highest chainPriority first; the rest wait for a later week.
      return chainEvents[0];
    }
  }

  // PRIORITY 2: Regular event selection (existing logic)
  const available = getAvailableEvents(events, state);
  if (available.length === 0) return null;

  const byId = new Map(events.map((e) => [e.id, e]));
  let pool = available;

  // Reinforce the throttle: once a chain consequence has fired this week, keep
  // chain events out of the regular pool too. If that leaves nothing available,
  // the day stays quiet (return null) instead of serving a second chain — the
  // held consequences simply resurface next week. This makes "at most one chain
  // per week" a hard guarantee, matching the chosen "hold the rest a week" rule.
  if (servedChainThisWeek) {
    pool = pool.filter((e) => !e.isChainEvent);
    if (pool.length === 0) return null;
  }

  // Anti-clustering: allow at most MAX_CONSECUTIVE_GUI Windows-style GUI levels
  // in a row (so an intentional related pair — e.g. bruteforce → persistence —
  // is fine, but GUI levels can't monopolize the queue). Once that many GUI
  // levels have been served consecutively, prefer non-GUI content while any
  // remains. GUI levels only exist in learning mode, so this is a no-op
  // elsewhere.
  const MAX_CONSECUTIVE_GUI = 2;
  let trailingGui = 0;
  for (let i = state.completedEvents.length - 1; i >= 0; i--) {
    if (byId.get(state.completedEvents[i])?.guiContext) trailingGui++;
    else break;
  }
  if (trailingGui >= MAX_CONSECUTIVE_GUI) {
    const nonGui = pool.filter((e) => !e.guiContext);
    if (nonGui.length > 0) pool = nonGui;
  }

  // Include completed events count so selection varies as you progress through a day
  const hashInput = seed + state.currentWeek + state.currentDay + state.completedEvents.length;
  const hash = simpleHash(hashInput);
  const index = hash % pool.length;
  return pool[index];
}

export function getVisibleChoices(
  event: GameEvent,
  state: GameState
): EventChoice[] {
  const visibleChoices = (event.choices ?? []).filter((choice) => {
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
      if (state.isStoryMode && isDialogueUnlocked(state, event.id, choice.id)) {
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

  if (visibleChoices.length > 0) {
    return visibleChoices;
  }

  return [
    {
      id: '__continue__',
      text: 'Weiter',
      effects: {},
      resultText:
        'Es gibt hier keine freigeschaltete Entscheidung. Du nimmst die Lage zur Kenntnis und machst weiter.',
    },
  ];
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
