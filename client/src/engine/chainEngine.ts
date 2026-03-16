import {
  GameState,
  GameEvent,
  EventChoice,
  DecisionRecord,
  PendingChainEvent,
  ChainTrigger,
} from '@kritis/shared';

/**
 * Records a decision made by the player for future reference and chain evaluation.
 */
export function recordDecision(
  state: GameState,
  event: GameEvent,
  choice: EventChoice,
  choiceIndex: number
): GameState {
  const decision: DecisionRecord = {
    eventId: event.id,
    choiceIndex,
    choiceId: choice.id,
    week: state.currentWeek,
    day: state.currentDay,
    tags: [...(event.tags || []), ...(choice.choiceTags || [])],
  };

  return {
    ...state,
    decisions: [...state.decisions, decision],
  };
}

/**
 * Evaluates a condition expression against the current game state.
 * Conditions can reference: state, event, choice, decisions
 */
export function evaluateCondition(
  condition: string,
  state: GameState,
  event: GameEvent,
  choice: EventChoice
): boolean {
  try {
    // Create a safe evaluation context with useful helpers
    const context = {
      state,
      event,
      choice,
      decisions: state.decisions,
      // Helper functions for common checks
      hasFlag: (flag: string) => state.flags[flag] === true,
      hasDecision: (eventId: string) => state.decisions.some(d => d.eventId === eventId),
      getDecision: (eventId: string) => state.decisions.find(d => d.eventId === eventId),
      hasTag: (tag: string) => state.decisions.some(d => d.tags.includes(tag)),
      skillAbove: (skill: keyof typeof state.skills, threshold: number) =>
        state.skills[skill] >= threshold,
      relationshipAbove: (rel: keyof typeof state.relationships, threshold: number) =>
        state.relationships[rel] >= threshold,
    };

    // Use Function constructor for controlled evaluation
    // eslint-disable-next-line no-new-func
    const evalFn = new Function(
      'state',
      'event',
      'choice',
      'decisions',
      'hasFlag',
      'hasDecision',
      'getDecision',
      'hasTag',
      'skillAbove',
      'relationshipAbove',
      `return (${condition});`
    );

    return evalFn(
      context.state,
      context.event,
      context.choice,
      context.decisions,
      context.hasFlag,
      context.hasDecision,
      context.getDecision,
      context.hasTag,
      context.skillAbove,
      context.relationshipAbove
    );
  } catch (error) {
    console.error(`Chain condition evaluation failed for: "${condition}"`, error);
    return false;
  }
}

/**
 * Schedules chain events based on triggers from the current event and choice.
 * Choice-level triggers override event-level triggers.
 */
export function scheduleChainEvents(
  state: GameState,
  event: GameEvent,
  choice: EventChoice
): GameState {
  // Choice triggers take precedence over event triggers
  const triggers: ChainTrigger[] = choice.chainTriggers || event.chainTriggers || [];

  if (triggers.length === 0) {
    return state;
  }

  const newPending: PendingChainEvent[] = [];

  for (const trigger of triggers) {
    // Evaluate condition if present
    if (trigger.condition) {
      const conditionMet = evaluateCondition(trigger.condition, state, event, choice);
      if (!conditionMet) {
        continue;
      }
    }

    // Check probability (default 1.0 = always trigger)
    const probability = trigger.probability ?? 1.0;
    if (probability < 1.0 && Math.random() > probability) {
      continue;
    }

    // Check if this event is already pending (avoid duplicates)
    const alreadyPending = state.pendingChainEvents.some(
      p => p.eventId === trigger.targetEventId
    );
    if (alreadyPending) {
      continue;
    }

    newPending.push({
      eventId: trigger.targetEventId,
      availableWeek: state.currentWeek + trigger.delayWeeks,
      sourceEventId: event.id,
      sourceChoiceId: choice.id,
      triggeredAt: { week: state.currentWeek, day: state.currentDay },
    });
  }

  if (newPending.length === 0) {
    return state;
  }

  return {
    ...state,
    pendingChainEvents: [...state.pendingChainEvents, ...newPending],
  };
}

/**
 * Gets all chain events that should be activated based on current week.
 * Returns events sorted by priority (highest first).
 */
export function getActivatedChainEvents(
  state: GameState,
  allEvents: GameEvent[]
): GameEvent[] {
  const activated: GameEvent[] = [];

  for (const pending of state.pendingChainEvents) {
    // Check if the event should be available this week
    if (pending.availableWeek > state.currentWeek) {
      continue;
    }

    // Find the event definition
    const event = allEvents.find(e => e.id === pending.eventId);
    if (!event) {
      console.warn(`Chain event not found: ${pending.eventId}`);
      continue;
    }

    // Skip if already completed
    if (state.completedEvents.includes(event.id)) {
      continue;
    }

    activated.push(event);
  }

  // Sort by chainPriority (higher = first, default 0)
  return activated.sort((a, b) => (b.chainPriority || 0) - (a.chainPriority || 0));
}

/**
 * Removes a pending chain event after it has been triggered or completed.
 */
export function cleanupPendingEvent(
  state: GameState,
  eventId: string
): GameState {
  const filtered = state.pendingChainEvents.filter(p => p.eventId !== eventId);

  if (filtered.length === state.pendingChainEvents.length) {
    return state; // Nothing to clean up
  }

  return {
    ...state,
    pendingChainEvents: filtered,
  };
}

/**
 * Gets the source decision that triggered a chain event (for UI/debug purposes).
 */
export function getChainEventSource(
  state: GameState,
  eventId: string
): { sourceEventId: string; sourceChoiceId: string; triggeredAt: { week: number; day: number } } | null {
  const pending = state.pendingChainEvents.find(p => p.eventId === eventId);
  if (!pending) {
    return null;
  }

  return {
    sourceEventId: pending.sourceEventId,
    sourceChoiceId: pending.sourceChoiceId,
    triggeredAt: pending.triggeredAt,
  };
}

/**
 * Checks if a specific tag was present in any past decision.
 * Useful for content authoring conditions.
 */
export function hasDecisionTag(state: GameState, tag: string): boolean {
  return state.decisions.some(d => d.tags.includes(tag));
}

/**
 * Gets all decisions from a specific event (for multi-part chains).
 */
export function getDecisionsForEvent(state: GameState, eventId: string): DecisionRecord[] {
  return state.decisions.filter(d => d.eventId === eventId);
}
