import { describe, it, expect } from 'vitest';
import { createInitialState } from './gameState';
import { selectNextEvent } from './eventEngine';
import { GameEvent, GameState, PendingChainEvent } from '@kritis/shared';

const chainEvent = (id: string, priority: number): GameEvent => ({
  id,
  weekRange: [1, 24],
  probability: 1,
  category: 'crisis',
  involvedCharacters: [],
  title: id,
  description: id,
  choices: [{ id: 'c', text: 'x', effects: {}, resultText: 'x' }],
  tags: [],
  isChainEvent: true,
  chainPriority: priority,
});

const fillerEvent: GameEvent = {
  id: 'regular_filler',
  weekRange: [1, 24],
  probability: 1,
  category: 'support',
  involvedCharacters: [],
  title: 'filler',
  description: 'filler',
  choices: [{ id: 'c', text: 'x', effects: {}, resultText: 'x' }],
  tags: [],
};

const pending = (eventId: string, availableWeek: number): PendingChainEvent => ({
  eventId,
  availableWeek,
  sourceEventId: 'src',
  sourceChoiceId: 'c0',
  triggeredAt: { week: 1, day: 1 },
});

const C1 = chainEvent('chain_one', 10);
const C2 = chainEvent('chain_two', 5);
const events = [C1, C2, fillerEvent];

function baseState(): GameState {
  return {
    ...createInitialState('SEED', 'intermediate'),
    currentWeek: 5,
    completedEvents: [],
    decisions: [],
    pendingChainEvents: [pending('chain_one', 5), pending('chain_two', 5)],
  };
}

describe('chain throttle — at most one consequence per week', () => {
  it('serves the highest-priority chain consequence first', () => {
    const next = selectNextEvent(events, baseState(), 'SEED');
    expect(next?.id).toBe('chain_one');
  });

  it('holds further chain consequences once one has fired this week', () => {
    // Simulate having resolved chain_one in week 5 (decision recorded + completed).
    const state: GameState = {
      ...baseState(),
      completedEvents: ['chain_one'],
      decisions: [
        { eventId: 'chain_one', choiceIndex: 0, choiceId: 'c', week: 5, day: 1, tags: [] },
      ],
      pendingChainEvents: [pending('chain_two', 5)],
    };
    // chain_two is still pending+available, but the throttle holds it → filler instead.
    const next = selectNextEvent(events, state, 'SEED');
    expect(next?.id).toBe('regular_filler');
  });

  it('never serves chain consequences in cliOnly (learning) mode', () => {
    const state: GameState = {
      ...createInitialState('SEED', 'learning'),
      currentWeek: 5,
      completedEvents: [],
      decisions: [],
      pendingChainEvents: [pending('chain_one', 5), pending('chain_two', 5)],
    };
    // Chain events have no terminal/gui context, so cliOnly leaves nothing to
    // serve — but crucially it must NOT return a chain event card.
    const next = selectNextEvent(events, state, 'SEED');
    expect(next?.isChainEvent).not.toBe(true);
  });

  it('releases the held consequence the following week', () => {
    const state: GameState = {
      ...baseState(),
      currentWeek: 6, // advanced a week
      completedEvents: ['chain_one'],
      decisions: [
        { eventId: 'chain_one', choiceIndex: 0, choiceId: 'c', week: 5, day: 1, tags: [] },
      ],
      pendingChainEvents: [pending('chain_two', 5)],
    };
    const next = selectNextEvent(events, state, 'SEED');
    expect(next?.id).toBe('chain_two');
  });
});
