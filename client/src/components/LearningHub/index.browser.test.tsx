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

  // Regression: the finale must stay hub-gated. Its level's `requires` is only
  // the Foundations exit, so without the track-lock guard its card entry would be
  // clickable and bypass the ≥3-tracks rule.
  it('does NOT make the finale level clickable while the finale track is locked', () => {
    // Foundations done but 0 core tracks complete → finale locked.
    render(<LearningHub state={mkState(FOUNDATIONS_DONE)} onPick={vi.fn()} />);
    expect(screen.getByText('Schließe 3 Tracks ab')).toBeInTheDocument();
    // The finale level title must not render as a launch button.
    expect(screen.queryByRole('button', { name: /Finale: Root Awakening/ })).toBeNull();
  });

  it('makes the finale level clickable once 3 core tracks are complete', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    // 3 completed core tracks: linux_services (05/06/07), network_dns (08), incident_response (10).
    const state = mkState([
      ...FOUNDATIONS_DONE,
      'learn_05_pipe_filter', 'learn_06_zombie_hunt', 'learn_07_necromancer',
      'learn_08_network_recon',
      'learn_10_incident_boss',
    ]);
    render(<LearningHub state={state} onPick={onPick} />);
    const finaleBtn = screen.getByRole('button', { name: /Finale: Root Awakening/ });
    await user.click(finaleBtn);
    expect(onPick.mock.calls.some((c) => c[0]?.id === 'learn_11_final_boss')).toBe(true);
  });

  it('allows long track headers to shrink while keeping the status badge visible', () => {
    render(<LearningHub state={mkState()} onPick={vi.fn()} />);

    const title = screen.getByText('Ansible & Konfigurationsmanagement');
    const content = title.parentElement?.parentElement;
    const row = content?.parentElement;
    const badge = screen.getAllByText('Gesperrt').find((node) => node.parentElement === row);

    expect(content).toHaveClass('min-w-0', 'flex-1');
    expect(title.parentElement).toHaveClass('flex-wrap');
    expect(title).toHaveClass('break-words');
    expect(badge).toHaveClass('shrink-0');
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
