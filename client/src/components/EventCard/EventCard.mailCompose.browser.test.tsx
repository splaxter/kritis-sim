import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameEvent, EventChoice } from '@kritis/shared';
import { createInitialState } from '../../engine/gameState';
import { StoryBackgroundProvider } from '../../contexts/StoryBackgroundContext';
import { EventCard } from './index';

const state = createInitialState('MAIL_SEED', 'intermediate'); // standard layout

const baseEvent = (over: Partial<GameEvent>): GameEvent => ({
  id: 'e',
  weekRange: [1, 12],
  probability: 1,
  category: 'support',
  involvedCharacters: [],
  title: 'Schnittstellen-Mail',
  description: 'Formuliere die Übergabe.',
  choices: [],
  tags: [],
  ...over,
});

const choice = (over: Partial<EventChoice>): EventChoice => ({
  id: 'c',
  text: 'senden',
  effects: {},
  resultText: 'ok',
  ...over,
});

const renderCard = (event: GameEvent, onChoice = vi.fn()) => {
  render(
    <StoryBackgroundProvider>
      <EventCard event={event} state={state} onChoice={onChoice} />
    </StoryBackgroundProvider>
  );
  return onChoice;
};

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', { configurable: true, writable: true, value: vi.fn() });
});

describe('EventCard — mail-compose presentation', () => {
  const mailEvent = baseEvent({
    mailCompose: {
      from: 'admin@warm.local',
      to: 'bjorg@warm.local',
      cc: 'bert@warm.local',
      subject: 'BASTION-01 — MFA-Paket',
    },
    choices: [
      choice({ id: 'cc_bert', text: 'An Bjorg, CC an Bert (mit Zeitstempel)', setsFlags: ['handover_mail_sent'] }),
      choice({ id: 'no_cc', text: 'Nur an Bjorg (knapp)' }),
    ],
  });

  it('renders the mail header with from/to/cc/subject', () => {
    renderCard(mailEvent);
    expect(screen.getByTestId('mail-compose')).toBeTruthy();
    expect(screen.getByText('admin@warm.local')).toBeTruthy();
    expect(screen.getByText('bjorg@warm.local')).toBeTruthy();
    expect(screen.getByText('bert@warm.local')).toBeTruthy();
    expect(screen.getByText(/Kopie \(CC\)/)).toBeTruthy();
    expect(screen.getByText('BASTION-01 — MFA-Paket')).toBeTruthy();
  });

  it('still routes a chosen send variant through onChoice', () => {
    const onChoice = renderCard(mailEvent);
    fireEvent.click(screen.getByText('An Bjorg, CC an Bert (mit Zeitstempel)'));
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice.mock.calls[0][0].id).toBe('cc_bert');
  });

  it('does not render a mail header for an ordinary event', () => {
    renderCard(baseEvent({ choices: [choice({})] }));
    expect(screen.queryByTestId('mail-compose')).toBeNull();
  });
});
