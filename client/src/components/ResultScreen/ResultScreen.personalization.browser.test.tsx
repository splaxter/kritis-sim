import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventChoice } from '@kritis/shared';
import { ResultScreen } from './index';

const choice = (resultText: string): EventChoice =>
  ({ text: 'Lösung', resultText, effects: {} } as unknown as EventChoice);

describe('ResultScreen {player} personalization', () => {
  it('substitutes {player} in resultText with the token value', () => {
    render(
      <ResultScreen choice={choice('Gut gemacht, {player}.')} onContinue={vi.fn()} characters={{ player: 'Alex' }} />
    );
    expect(screen.getByText('Gut gemacht, Alex.')).toBeInTheDocument();
  });

  it('renders a $& player value literally (callback replacement)', () => {
    render(
      <ResultScreen choice={choice('Hallo {player}.')} onContinue={vi.fn()} characters={{ player: '$&' }} />
    );
    expect(screen.getByText('Hallo $&.')).toBeInTheDocument();
  });

  it('still substitutes {chef} alongside {player}', () => {
    render(
      <ResultScreen
        choice={choice('{chef} lobt dich, {player}.')}
        onContinue={vi.fn()}
        characters={{ chef: 'Bert', player: 'Alex' }}
      />
    );
    expect(screen.getByText('Bert lobt dich, Alex.')).toBeInTheDocument();
  });
});
