import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// The optional team-stats name prompt shows once on the menu, then is remembered
// (saved or skipped) and never reappears.
describe('App — optional name prompt', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('kritis_seen_intro', '1'); // skip intro → land on menu
    fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saving a name persists it, POSTs player_named, and hides the prompt', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await screen.findByLabelText('Dein Name');
    await user.type(input, 'Timo');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(localStorage.getItem('kritis_player_name')).toBe('Timo');
    expect(screen.queryByLabelText('Dein Name')).toBeNull();
    const named = fetchMock.mock.calls.find(([, init]) =>
      String((init as RequestInit).body).includes('player_named')
    );
    expect(named).toBeTruthy();
  });

  it('skipping records the skip and hides the prompt permanently', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Dein Name');
    await user.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(localStorage.getItem('kritis_name_skipped')).toBe('1');
    expect(screen.queryByLabelText('Dein Name')).toBeNull();
  });

  it('does not show the prompt once a name already exists', () => {
    localStorage.setItem('kritis_player_name', 'Jens');
    render(<App />);
    expect(screen.queryByLabelText('Dein Name')).toBeNull();
  });

  it('typing Enter in the field does not trigger menu navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await screen.findByLabelText('Dein Name');
    await user.type(input, 'Timo');
    fireEvent.keyDown(input, { key: 'Enter' });
    // Enter in the field saves the name; it must NOT have started a game.
    expect(localStorage.getItem('kritis_player_name')).toBe('Timo');
    expect(screen.getByText(/NEUES SPIEL STARTEN/)).toBeInTheDocument();
  });
});
