import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameEvent, EventChoice } from '@kritis/shared';
import { createInitialState } from '../../engine/gameState';
import { StoryBackgroundProvider } from '../../contexts/StoryBackgroundContext';
import { EventCard } from './index';

const state = createInitialState('SEED', 'intermediate'); // standard layout

const baseEvent = (over: Partial<GameEvent>): GameEvent => ({
  id: 'e',
  weekRange: [1, 12],
  probability: 1,
  category: 'support',
  involvedCharacters: [],
  title: 'Test',
  description: 'Test desc',
  choices: [],
  tags: [],
  ...over,
});

const choice = (over: Partial<EventChoice>): EventChoice => ({
  id: 'c',
  text: 'do it',
  effects: {},
  resultText: 'ok',
  ...over,
});

const renderCard = (event: GameEvent, characters: Record<string, string>) => {
  render(
    <StoryBackgroundProvider>
      <EventCard event={event} state={state} onChoice={vi.fn()} characters={characters} />
    </StoryBackgroundProvider>
  );
};

describe('EventCard {player} personalization', () => {
  it('substitutes {player} in the description with the token value', () => {
    renderCard(
      baseEvent({ description: 'Willkommen, {player}!', choices: [choice({ text: 'Los' })] }),
      { player: 'Alex' }
    );
    expect(screen.getByText('Willkommen, Alex!')).toBeInTheDocument();
  });

  it('substitutes {player} in a choice text', () => {
    renderCard(
      baseEvent({ choices: [choice({ id: 'a', text: 'Sag {player} Bescheid' }), choice({ id: 'b', text: 'Ignorieren' })] }),
      { player: 'Alex' }
    );
    expect(screen.getByText(/Sag Alex Bescheid/)).toBeInTheDocument();
  });

  it('renders a $& player value literally (callback replacement, not $-syntax)', () => {
    renderCard(
      baseEvent({ description: 'Hallo {player}.', choices: [choice({ text: 'Los' })] }),
      { player: '$&' }
    );
    expect(screen.getByText('Hallo $&.')).toBeInTheDocument();
  });

  it('still substitutes {chef} with the character value', () => {
    renderCard(
      baseEvent({ description: '{chef} ruft an, {player}.', choices: [choice({ text: 'Los' })] }),
      { chef: 'Bert', player: 'Alex' }
    );
    expect(screen.getByText('Bert ruft an, Alex.')).toBeInTheDocument();
  });
});
