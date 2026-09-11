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

describe('LearningHub — mit Enter durch die Lektionen', () => {
  /**
   * Der Hub ist die Station zwischen zwei Lektionen. Nach einem
   * abgeschlossenen Level landet man hier und will fast immer die nächste
   * Lektion — deshalb liegt der Fokus auf der Empfehlung.
   */
  it('fokussiert die Empfehlung beim Betreten, sodass Enter sie startet', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const state = mkState([]);
    const empfohlen = getRecommendedNext(state, allEvents)!;

    render(<LearningHub state={state} onPick={onPick} />);

    // Der Titel steht auch in der Track-Liste — die CTA ist die mit dem Label.
    const cta = screen.getByRole('button', { name: /Nächste empfohlene Lektion/ });
    expect(cta).toHaveTextContent(empfohlen.title);
    expect(cta).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: empfohlen.id }));
  });

  it('zeigt die Tastenbelegung an, damit man sie überhaupt findet', () => {
    render(<LearningHub state={mkState([])} onPick={vi.fn()} />);
    expect(screen.getByText('[Enter]')).toBeInTheDocument();
  });

  it('Enter wirkt auch, wenn der Fokus im Nichts liegt', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<LearningHub state={mkState([])} onPick={onPick} />);

    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  /** Wer bewusst einen anderen Track wählt, darf nicht überstimmt werden. */
  it('überstimmt keine bewusste Auswahl: Enter auf einem anderen Knopf wählt DIESEN', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const state = mkState([]);
    const empfohlen = getRecommendedNext(state, allEvents)!;

    render(<LearningHub state={state} onPick={onPick} />);

    // Auf einen anderen, spielbaren Level-Knopf tabben …
    const andere = screen
      .getAllByRole('button')
      .filter((b) => !/Nächste empfohlene Lektion/.test(b.textContent ?? ''))
      .filter((b) => !new RegExp(empfohlen.title).test(b.textContent ?? ''));
    const ziel = andere.find((b) => !b.hasAttribute('disabled'));
    if (!ziel) return; // kein zweiter spielbarer Eintrag im Startzustand
    ziel.focus();
    await user.keyboard('{Enter}');

    // … es darf höchstens EIN Pick passieren, und nicht die Empfehlung.
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalledWith(expect.objectContaining({ id: empfohlen.id }));
  });

  it('ohne Empfehlung (alles abgeschlossen) greift kein Enter-Handler', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const alleIds = allEvents.map((e) => e.id);

    render(<LearningHub state={mkState(alleIds)} onPick={onPick} />);
    await user.keyboard('{Enter}');
    expect(onPick).not.toHaveBeenCalled();
  });
});
