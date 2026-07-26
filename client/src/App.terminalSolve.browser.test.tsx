import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TerminalContext, Skills, EventEffects } from '@kritis/shared';
import App from './App';
import { createInitialState } from './engine/gameState';
import { writeAutosave, readAutosave } from './engine/autosave';

/**
 * Integration guard for the terminal solve path THROUGH the real App:
 * Terminal.onSolved → GameScreen → App's onTerminalSolved → useGame.closeTerminal.
 *
 * The regression this pins: App's handler used to accept only (skillGain,
 * setsFlags) and silently dropped the third argument, so authored
 * solution.effects (e.g. L1's stress relief) never reached the game state.
 *
 * Only the Terminal component itself is mocked (xterm.js cannot mount in
 * jsdom); the mock calls onSolved exactly like TerminalSession does —
 * (pendingSkillGain, undefined, pendingSolutionEffects) — which is the contract
 * TerminalSession's own tests already verify from the other side.
 */
vi.mock('./components/Terminal', () => ({
  Terminal: ({
    context,
    onSolved,
    onCancel,
    onFlagsSet,
  }: {
    context: TerminalContext;
    onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], effects?: EventEffects) => void;
    onCancel: () => void;
    onFlagsSet: (flags: string[]) => void;
  }) => {
    const sol = context.solutions[0];
    const honeypot = context.commands.find((c) => c.setsFlags);
    return (
      <div>
        <button onClick={() => onSolved(sol.skillGain, undefined, sol.effects)}>
          MOCK-SOLVE
        </button>
        {honeypot && (
          <button onClick={() => onFlagsSet(honeypot.setsFlags!)}>MOCK-HONEYPOT</button>
        )}
        <button onClick={() => onCancel()}>MOCK-CANCEL</button>
      </div>
    );
  },
}));

const PLAYER_ID = 'player-int-test';
const START_STRESS = 30;
let startLinux = 0;

function pressEnter() {
  fireEvent.keyDown(window, { key: 'Enter' });
}

function prepareRun(chapter: string, beatIndex: number) {
  localStorage.clear();
  localStorage.setItem('kritis_player_id', PLAYER_ID);
  localStorage.setItem('kritis_seen_intro', '1');
  localStorage.setItem('kritis_name_skipped', '1');

  const state = createInitialState('int-seed', 'story', 'audit-trail');
  state.stress = START_STRESS;
  state.storyState = { ...state.storyState!, currentChapter: chapter, currentBeatIndex: beatIndex };
  startLinux = state.skills.linux;
  writeAutosave(PLAYER_ID, state);
}

beforeEach(() => {
  // Default: parked directly at the L1 beat (ch01, beat 2).
  prepareRun('at_ch01_onboarding', 2);
});

describe('App — solved terminal level applies solution effects end-to-end', () => {
  it('L1 solve flows through App into the game state (stress relief + progression)', async () => {
    render(<App />);

    // Menu offers the resume; item 0 is "Weiter spielen" → Enter resumes.
    await screen.findByText(/Weiter spielen/i);
    act(() => pressEnter());

    // The story effect serves L1; hands-on story levels render a single
    // "Aufgabe starten" button that opens the terminal.
    await screen.findByText('Der erste Arbeitstag');
    const startButton = await screen.findByText(/Aufgabe starten/);
    fireEvent.click(startButton);

    // Terminal phase → mocked Terminal renders; solve it like TerminalSession
    // would (3-arg onSolved with the level's authored solution payload).
    const solveButton = await screen.findByText('MOCK-SOLVE');
    fireEvent.click(solveButton);

    // Result phase reached and autosaved synchronously — assert on the save.
    await waitFor(() => {
      const save = readAutosave(PLAYER_ID);
      expect(save).not.toBeNull();
      const s = save!.gameState;
      // The solution's effects ({ stress: -2 }) actually landed.
      expect(s.stress).toBeLessThan(START_STRESS);
      // Solution skillGain landed too (linux increased from the mode base).
      expect(s.skills.linux).toBeGreaterThan(startLinux);
      // And the beat advanced exactly once past L1.
      expect(s.completedEvents).toContain('at_l1_first_day');
      expect(s.storyState?.currentBeatIndex).toBe(3);
    });
  });

  it('the L4 honeypot flag reaches the autosave and SURVIVES cancelling the level', async () => {
    // Park the run directly at the L4 beat (ch02, beat 1).
    prepareRun('at_ch02_trail', 1);
    render(<App />);

    await screen.findByText(/Weiter spielen/i);
    act(() => pressEnter());

    await screen.findByText('Die Spur im IIS-Log');
    fireEvent.click(await screen.findByText(/Aufgabe starten/));

    // In the terminal: read the PST (honeypot fires), then bail out with ESC.
    fireEvent.click(await screen.findByText('MOCK-HONEYPOT'));
    fireEvent.click(screen.getByText('MOCK-CANCEL'));

    await waitFor(() => {
      const save = readAutosave(PLAYER_ID);
      expect(save).not.toBeNull();
      const s = save!.gameState;
      // Seen is seen: the scope violation is persisted although the level
      // was cancelled and never solved …
      expect(s.flags.mailbox_scope_exceeded).toBe(true);
      // … and the beat did NOT advance (the level stays retryable).
      expect(s.completedEvents).not.toContain('at_l4_iis_log');
      expect(s.storyState?.currentBeatIndex).toBe(1);
      expect(s.storyState?.currentChapter).toBe('at_ch02_trail');
    });
  });
});
