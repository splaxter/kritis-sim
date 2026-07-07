import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { writeAutosave } from './engine/autosave';
import { createInitialState } from './engine/gameState';

// App reads/creates 'kritis_player_id' (App.tsx getPlayerId) — pin it so we
// can write the autosave under the id App will look up.
const PLAYER = 'player-resume-test';

async function enterMenu() {
  render(<App />);
  // Intro screen → Enter dismisses it (same flow as App.learningHub.test.tsx).
  fireEvent.keyDown(window, { key: 'Enter' });
  return screen.findByText(/NEUES SPIEL STARTEN/i);
}

describe('App — autosave resume flow', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kritis_player_id', PLAYER);
  });

  it('offers WEITER SPIELEN when a mid-run autosave exists, and restores it', async () => {
    const midRun = {
      ...createInitialState('RESUME_SEED', 'beginner'),
      currentWeek: 3,
      currentDay: 2,
      stress: 45,
    };
    writeAutosave(PLAYER, midRun);

    const user = userEvent.setup();
    await enterMenu();

    const resumeBtn = await screen.findByText(/WEITER SPIELEN/i);
    await user.click(resumeBtn);

    // Menu is gone, run is restored: StatsBar shows "Woche 3/…"
    // (client/src/components/StatsBar/index.tsx:115).
    expect(await screen.findByText(/Woche 3\//)).toBeInTheDocument();
    expect(screen.queryByText(/NEUES SPIEL STARTEN/i)).toBeNull();
  });

  it('shows no resume option without an autosave', async () => {
    await enterMenu();
    expect(screen.queryByText(/WEITER SPIELEN/i)).toBeNull();
  });

  it('boots cleanly when the autosave is corrupted JSON', async () => {
    localStorage.setItem(`kritis_autosave_${PLAYER}`, '{"version":1,###corrupt###');

    await enterMenu(); // must not throw during render
    expect(screen.getByText(/NEUES SPIEL STARTEN/i)).toBeInTheDocument();
    expect(screen.queryByText(/WEITER SPIELEN/i)).toBeNull();
  });
});
