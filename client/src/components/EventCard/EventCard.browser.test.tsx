import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameEvent, EventChoice } from '@kritis/shared';
import { createInitialState } from '../../engine/gameState';
import { StoryBackgroundProvider } from '../../contexts/StoryBackgroundContext';
import { EventCard } from './index';

const state = createInitialState('SEED', 'intermediate'); // isStoryMode = false → standard layout

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

const renderCard = (event: GameEvent, onChoice = vi.fn()) => {
  render(
    <StoryBackgroundProvider>
      <EventCard event={event} state={state} onChoice={onChoice} />
    </StoryBackgroundProvider>
  );
  return onChoice;
};

let scrollIntoViewSpy: ReturnType<typeof vi.spyOn>;
let scrollToSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoViewSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  scrollToSpy = vi.fn();
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: scrollToSpy,
  });
});

afterEach(() => {
  scrollIntoViewSpy.mockRestore();
});

describe('EventCard card kinds', () => {
  it('hands-on (single GUI/terminal choice) renders an "Aufgabe starten" CTA', async () => {
    const onChoice = renderCard(
      baseEvent({ guiContext: undefined, choices: [choice({ id: 'open', text: 'Task-Manager öffnen', guiCommand: true })] })
    );
    const cta = screen.getByRole('button', { name: /Aufgabe starten/i });
    await userEvent.setup().click(cta);
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice.mock.calls[0][0].id).toBe('open');
    // not rendered as a numbered decision row
    expect(screen.queryByText(/^\[1\]/)).not.toBeInTheDocument();
  });

  it('flavor (single plain choice) renders a "Weiter" CTA', async () => {
    const onChoice = renderCard(baseEvent({ choices: [choice({ id: 'ack', text: 'Zur Kenntnis genommen' })] }));
    expect(screen.getByText(/Zwischenfall/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /Weiter/i });
    await userEvent.setup().click(cta);
    expect(onChoice.mock.calls[0][0].id).toBe('ack');
  });

  it('decision (multiple choices) renders the numbered list', () => {
    renderCard(baseEvent({ choices: [choice({ id: 'a', text: 'Option A' }), choice({ id: 'b', text: 'Option B' })] }));
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aufgabe starten|^Weiter ▶/i })).not.toBeInTheDocument();
  });

  it('chain consequence is classified from visible choices and renders as a result card when one is visible', () => {
    renderCard(baseEvent({
      isChainEvent: true,
      choices: [
        choice({ id: 'visible', text: 'Visible consequence' }),
        choice({ id: 'hidden', text: 'Hidden alternative', hidden: true }),
      ],
    }));
    expect(screen.getByText(/Folge deiner Entscheidung/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Weiter/i })).toBeInTheDocument();
    expect(screen.queryByText('Hidden alternative')).not.toBeInTheDocument();
  });

  it('chain consequence with multiple visible choices remains a real decision', () => {
    renderCard(baseEvent({ isChainEvent: true, choices: [choice({ id: 'a', text: 'A' }), choice({ id: 'b', text: 'B' })] }));
    expect(screen.queryByText(/Folge deiner Entscheidung/i)).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('null-safety uses the engine fallback when no authored choice is visible', async () => {
    const onChoice = renderCard(baseEvent({
      choices: [choice({ id: 'hidden-reward', text: 'Reward', hidden: true, effects: { budget: 9999 } })],
    }));
    const cta = screen.getByRole('button', { name: /Weiter/i });
    await userEvent.setup().click(cta);
    expect(onChoice.mock.calls[0][0]).toMatchObject({ id: '__continue__', effects: {} });
  });
});

describe('EventCard scrolling', () => {
  it('starts a newly opened event at the top without scrolling its first action into view', () => {
    renderCard(baseEvent({
      id: 'mobile-entry',
      description: 'Anfang der Beschreibung',
      choices: [choice({ terminalCommand: true })],
    }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('scrolls the newly selected choice into view after keyboard navigation', () => {
    renderCard(baseEvent({
      choices: [choice({ id: 'a', text: 'A' }), choice({ id: 'b', text: 'B' })],
    }));
    scrollIntoViewSpy.mockClear();

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('keeps wide preformatted descriptions inside a local horizontal scroller', () => {
    renderCard(baseEvent({
      description: '═'.repeat(80),
      choices: [choice({ terminalCommand: true })],
    }));

    expect(screen.getByText('═'.repeat(80))).toHaveClass('min-w-0', 'max-w-full', 'overflow-x-auto');
  });
});
