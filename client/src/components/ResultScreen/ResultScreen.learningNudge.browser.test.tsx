import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventChoice } from '@kritis/shared';
import { ResultScreen } from './index';

const choice: EventChoice = {
  text: 'Lösung',
  resultText: 'Erledigt.',
  effects: {},
} as unknown as EventChoice;

describe('ResultScreen — free-play learning nudge', () => {
  it('renders the dismissible nudge and fires onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ResultScreen choice={choice} onContinue={vi.fn()} learningNudge={{ onDismiss }} />
    );
    expect(screen.getByText(/- TIPP -/)).toBeInTheDocument();
    expect(screen.getByText(/Lernmodus/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /nicht mehr anzeigen/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('shows no nudge when learningNudge is absent', () => {
    render(<ResultScreen choice={choice} onContinue={vi.fn()} />);
    expect(screen.queryByText(/- TIPP -/)).toBeNull();
  });
});
