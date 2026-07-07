import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventChoice } from '@kritis/shared';
import { ResultScreen } from './index';

// TASK 6.1: learning-mode result screen shows ONE explicit primary CTA.
const choice: EventChoice = {
  text: 'Lösung',
  resultText: 'Erledigt.',
  effects: {},
} as unknown as EventChoice;

describe('ResultScreen — learning next-step CTAs', () => {
  it('track continues → primary "Nächste Lektion" present and fires onNextLesson', async () => {
    const user = userEvent.setup();
    const onNextLesson = vi.fn();
    const onBackToHub = vi.fn();
    render(
      <ResultScreen
        choice={choice}
        onContinue={vi.fn()}
        learningCtas={{ onNextLesson, onBackToHub }}
      />
    );
    const btn = screen.getByRole('button', { name: 'Nächste Lektion' });
    await user.click(btn);
    expect(onNextLesson).toHaveBeenCalledTimes(1);
    // Secondary "Zurück zum Lernpfad" still present.
    expect(screen.getByRole('button', { name: 'Zurück zum Lernpfad' })).toBeInTheDocument();
  });

  it('track complete → primary "Zurück zum Lernpfad" present and fires onBackToHub', async () => {
    const user = userEvent.setup();
    const onBackToHub = vi.fn();
    render(
      <ResultScreen
        choice={choice}
        onContinue={vi.fn()}
        learningCtas={{ onBackToHub }}
      />
    );
    // No "Nächste Lektion" when the track has no next.
    expect(screen.queryByRole('button', { name: 'Nächste Lektion' })).toBeNull();
    const btn = screen.getByRole('button', { name: 'Zurück zum Lernpfad' });
    await user.click(btn);
    expect(onBackToHub).toHaveBeenCalledTimes(1);
  });

  it('finale unlocked → "Finale starten" present and fires onStartFinale', async () => {
    const user = userEvent.setup();
    const onStartFinale = vi.fn();
    const onBackToHub = vi.fn();
    render(
      <ResultScreen
        choice={choice}
        onContinue={vi.fn()}
        learningCtas={{ onBackToHub, onStartFinale }}
      />
    );
    const btn = screen.getByRole('button', { name: 'Finale starten' });
    await user.click(btn);
    expect(onStartFinale).toHaveBeenCalledTimes(1);
  });

  it('without learningCtas the plain "Weiter" button is unchanged (non-learning)', () => {
    render(<ResultScreen choice={choice} onContinue={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Weiter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nächste Lektion' })).toBeNull();
  });
});
