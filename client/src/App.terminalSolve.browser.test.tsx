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
  }: {
    context: TerminalContext;
    onSolved: (skillGain: Partial<Skills>, setsFlags?: string[], effects?: EventEffects) => void;
  }) => {
    const sol = context.solutions[0];
    return (
      <button onClick={() => onSolved(sol.skillGain, undefined, sol.effects)}>
        MOCK-SOLVE
      </button>
    );
  },
}));

const PLAYER_ID = 'player-int-test';
const START_STRESS = 30;
let startLinux = 0;

function pressEnter() {
  fireEvent.keyDown(window, { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kritis_player_id', PLAYER_ID);
  localStorage.setItem('kritis_seen_intro', '1');
  localStorage.setItem('kritis_name_skipped', '1');

  // An AUDIT TRAIL story run parked directly at the L1 beat (ch01, beat 2).
  const state = createInitialState('int-seed', 'story', 'audit-trail');
  state.stress = START_STRESS;
  state.storyState = { ...state.storyState!, currentBeatIndex: 2 };
  startLinux = state.skills.linux;
  writeAutosave(PLAYER_ID, state);
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
});
