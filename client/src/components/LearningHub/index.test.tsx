import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '@kritis/shared';
import { allEvents } from '../../content/events';
import { getRecommendedNext } from '../../engine/learningPath';
import { LearningHub } from './index';

// Minimal GameState for the hub. Only the fields the engine reads matter.
const mkState = (completed: string[] = [], lastTrackId?: string) =>
  ({
    completedEvents: completed,
    flags: {},
    gameMode: 'learning',
    isStoryMode: false,
    learningState: { lastTrackId },
  } as unknown as GameState);

const FOUNDATIONS_DONE = ['learn_01_awakening', 'learn_02_hidden_notes', 'learn_03_forensics', 'learn_04_grep_hunter'];

describe('LearningHub', () => {
  it('shows the recommended-next CTA', () => {
    const state = mkState();
    const recommended = getRecommendedNext(state, allEvents);
    expect(recommended).not.toBeNull();
    render(<LearningHub state={state} onPick={vi.fn()} />);
    // The CTA button shows the recommended Foundations level's title.
    // (The same level also appears as a clickable entry in its track card, so
    // assert at least one matching button is present.)
    const matches = screen.getAllByRole('button', { name: new RegExp(recommended!.title) });
    expect(matches.length).toBeGreaterThan(0);
  });

  it('locks non-foundations tracks before foundations done', () => {
    render(<LearningHub state={mkState()} onPick={vi.fn()} />);
    // Non-foundations tracks are locked before foundations is done: the
    // "Gesperrt" badge and the reason text both appear (multiple tracks).
    expect(screen.getAllByText('Gesperrt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Schließe zuerst die Grundlagen ab').length).toBeGreaterThan(0);
  });

  it('shows track progress x/y', () => {
    // Foundations done + learn_05 done → Linux & Services shows 1/3.
    const state = mkState([...FOUNDATIONS_DONE, 'learn_05_pipe_filter']);
    render(<LearningHub state={state} onPick={vi.fn()} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('clicking a next-level entry calls onPick with that event', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const state = mkState(FOUNDATIONS_DONE);
    render(<LearningHub state={state} onPick={onPick} />);
    const target = allEvents.find((e) => e.id === 'learn_05_pipe_filter')!;
    // The level entry is rendered as a button containing its title.
    const buttons = screen.getAllByRole('button', { name: new RegExp(target.title) });
    await user.click(buttons[buttons.length - 1]);
    expect(onPick).toHaveBeenCalled();
    expect(onPick.mock.calls.some((c) => c[0]?.id === 'learn_05_pipe_filter')).toBe(true);
  });
});
