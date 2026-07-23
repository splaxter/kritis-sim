import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { writeAutosave } from './engine/autosave';
import { createInitialState } from './engine/gameState';

// Stub the lazy-loaded Terminal so we can reach phase='terminal' without pulling
// in xterm.js. The stub exposes cancel + solve so we can drive both the
// cancel-level (ESC) path and the result phase.
vi.mock('./components/Terminal', () => ({
  Terminal: ({
    onSolved,
    onCancel,
  }: {
    onSolved: (skillGain: Record<string, number>) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="terminal-stub">
      <button onClick={() => onSolved({})}>solve-stub</button>
      <button onClick={onCancel}>cancel-stub</button>
    </div>
  ),
}));

const PLAYER = 'player-backnav-test';
const AUTOSAVE_KEY = `kritis_autosave_${PLAYER}`;

async function enterMenu() {
  render(<App />);
  // Intro screen → Enter dismisses it.
  fireEvent.keyDown(window, { key: 'Enter' });
  return screen.findByText(/NEUES SPIEL STARTEN/i);
}

// Drives: intro → menu → Lernbereich → the Learning Hub.
async function enterLearningHub(user: ReturnType<typeof userEvent.setup>) {
  await enterMenu();
  await user.click(await screen.findByText(/LERNBEREICH/i));
  await screen.findByText('Lernpfad');
}

// From the hub: pick the recommended lesson (learn_01) → its event card.
async function pickRecommendedLesson(user: ReturnType<typeof userEvent.setup>) {
  const recommended = screen.getByText('Nächste empfohlene Lektion').closest('button');
  expect(recommended).not.toBeNull();
  await user.click(recommended!);
  // learn_01 is a hands-on terminal level → its single CTA reads "Aufgabe starten".
  await screen.findByText(/Aufgabe starten/i);
}

describe('App — central back-navigation wiring', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kritis_player_id', PLAYER);
    // NOTE: we intentionally do NOT set kritis_name_skipped/kritis_player_name.
    // The menu name-prompt must not disable in-game back-navigation, so every
    // test here runs as an un-named player and back-nav must still work.
  });

  it('1. ESC in a terminal level cancels back to the event card (leaves terminal)', async () => {
    const user = userEvent.setup();
    await enterLearningHub(user);
    await pickRecommendedLesson(user);

    // Enter the terminal.
    await user.click(screen.getByText(/Aufgabe starten/i));
    expect(await screen.findByTestId('terminal-stub')).toBeInTheDocument();

    // ESC → cancel-level → back to the event card (phase leaves 'terminal').
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('terminal-stub')).toBeNull();
    });
    // The learn_01 event card is showing again.
    expect(screen.getByText(/Aufgabe starten/i)).toBeInTheDocument();
  });

  it('2. ESC on the learning hub reaches the main menu', async () => {
    const user = userEvent.setup();
    await enterLearningHub(user);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(await screen.findByText(/NEUES SPIEL STARTEN/i)).toBeInTheDocument();
    expect(screen.queryByText('Lernpfad')).toBeNull();
  });

  it('3. ESC on a standard active event opens the run-leave dialog; a 2nd ESC closes ONLY the dialog', async () => {
    const user = userEvent.setup();
    writeAutosave(PLAYER, {
      ...createInitialState('BACKNAV_SEED', 'beginner'),
      currentWeek: 3,
      currentDay: 2,
    });

    await enterMenu();
    await user.click(await screen.findByText(/WEITER SPIELEN/i));

    // Wait until content is served — the back affordance only appears then.
    const backBtn = await screen.findByRole('button', { name: /Zum Hauptmenü/i });
    expect(backBtn).toBeInTheDocument();

    // First ESC → confirm-leave-run dialog.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByText(/Run verlassen und zum Hauptmenü/i)).toBeInTheDocument();

    // Second ESC → dialog's own ESC (onContinue) closes it; the global listener
    // is a no-op while the modal is open, so we do NOT navigate to the menu.
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText(/Run verlassen und zum Hauptmenü/i)).toBeNull();
    });
    // Still in the run, not on the menu.
    expect(screen.queryByText(/NEUES SPIEL STARTEN/i)).toBeNull();
    expect(screen.getByText(/Woche 3\//)).toBeInTheDocument();
  });

  it('4. Leaving a run → main menu PRESERVES the persisted GameState byte-for-byte', async () => {
    const user = userEvent.setup();
    writeAutosave(PLAYER, {
      ...createInitialState('PRESERVE_SEED', 'beginner'),
      currentWeek: 4,
      currentDay: 3,
      stress: 42,
    });

    await enterMenu();
    await user.click(await screen.findByText(/WEITER SPIELEN/i));
    await screen.findByRole('button', { name: /Zum Hauptmenü/i });

    // Capture the persisted gameState right before leaving.
    const before = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)!).gameState;

    // Open the dialog, then click „Zum Hauptmenü".
    fireEvent.keyDown(window, { key: 'Escape' });
    await screen.findByText(/Run verlassen und zum Hauptmenü/i);
    await user.click(screen.getByRole('button', { name: /^Zum Hauptmenü$/i }));

    // Back on the menu.
    expect(await screen.findByText(/NEUES SPIEL STARTEN/i)).toBeInTheDocument();

    // The persisted run is untouched: the autosave key still exists and its
    // gameState is identical (only the in-flight React step was discarded).
    const rawAfter = localStorage.getItem(AUTOSAVE_KEY);
    expect(rawAfter).not.toBeNull();
    const after = JSON.parse(rawAfter!).gameState;
    expect(after).toEqual(before);
  });

  it('5. „Weiter spielen" reappears on the menu after leaving a run', async () => {
    const user = userEvent.setup();
    writeAutosave(PLAYER, {
      ...createInitialState('REAPPEAR_SEED', 'beginner'),
      currentWeek: 2,
      currentDay: 1,
    });

    await enterMenu();
    await user.click(await screen.findByText(/WEITER SPIELEN/i));
    await screen.findByRole('button', { name: /Zum Hauptmenü/i });

    fireEvent.keyDown(window, { key: 'Escape' });
    await screen.findByText(/Run verlassen und zum Hauptmenü/i);
    await user.click(screen.getByRole('button', { name: /^Zum Hauptmenü$/i }));

    // Menu re-read the preserved autosave → resume entry is back.
    expect(await screen.findByText(/WEITER SPIELEN/i)).toBeInTheDocument();
  });

  it('6. ESC on a result screen does nothing (no navigation, no dialog)', async () => {
    const user = userEvent.setup();
    await enterLearningHub(user);
    await pickRecommendedLesson(user);

    await user.click(screen.getByText(/Aufgabe starten/i));
    await screen.findByTestId('terminal-stub');
    // Solve → result phase.
    await user.click(screen.getByText('solve-stub'));
    expect(await screen.findByText(/LEVEL 1 ABGESCHLOSSEN/i)).toBeInTheDocument();

    // ESC on result → resolver returns null → no-op.
    fireEvent.keyDown(window, { key: 'Escape' });

    // Still on the result screen; no dialog, not on the menu.
    expect(screen.getByText(/LEVEL 1 ABGESCHLOSSEN/i)).toBeInTheDocument();
    expect(screen.queryByText(/Run verlassen und zum Hauptmenü/i)).toBeNull();
    expect(screen.queryByText(/NEUES SPIEL STARTEN/i)).toBeNull();
  });

  it('7. an UN-named player (never skipped/named) still has in-game back-navigation', async () => {
    // Regression: the menu-only name prompt must NOT be part of anyModalOpen, or
    // an un-named player's back-nav would be disabled everywhere in gameplay.
    expect(localStorage.getItem('kritis_player_name')).toBeNull();
    expect(localStorage.getItem('kritis_name_skipped')).toBeNull();

    const user = userEvent.setup();
    writeAutosave(PLAYER, {
      ...createInitialState('UNNAMED_SEED', 'beginner'),
      currentWeek: 2,
      currentDay: 1,
    });

    await enterMenu();
    // The name prompt is showing on the menu (un-named), but we ignore it and
    // dive straight into the run — exactly the case that used to break back-nav.
    expect(screen.getByLabelText(/Dein Name/i)).toBeInTheDocument();
    await user.click(await screen.findByText(/WEITER SPIELEN/i));
    await screen.findByRole('button', { name: /Zum Hauptmenü/i });

    // ESC on the active event must STILL open the run-leave dialog.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByText(/Run verlassen und zum Hauptmenü/i)).toBeInTheDocument();
  });
});
