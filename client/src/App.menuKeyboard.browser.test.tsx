import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Regression guard for the main-menu keyboard handler. Historical bug: ArrowUp
// and ArrowDown shared one branch, so ArrowUp moved DOWN. The menu now has three
// items (New → Lernmodus → Laden), so wrap-around exercises real up/down deltas.
describe('App — main menu arrow-key navigation', () => {
  // Fresh localStorage → the first-run intro shows, so the Enter below dismisses
// it (rather than triggering a menu action on an already-visible menu).
  beforeEach(() => localStorage.clear());

  // The selected item is rendered with a '> ' prefix inside the button.
  function markerOf(re: RegExp): string {
    return (screen.getByText(re).textContent ?? '').trimStart();
  }

  it('ArrowDown moves down, ArrowUp moves up, both wrap around', async () => {
    render(<App />);

    // Intro screen → Enter dismisses it, main menu appears.
    fireEvent.keyDown(window, { key: 'Enter' });
    await screen.findByText(/NEUES SPIEL STARTEN/);

    // Initially item 0 ("NEUES SPIEL STARTEN") is selected.
    expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

    // ArrowDown → "LERNBEREICH".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/LERNBEREICH/)).toMatch(/^>/);
    expect(markerOf(/NEUES SPIEL STARTEN/)).not.toMatch(/^>/);

    // ArrowDown → "SPIELSTÄNDE".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/SPIELSTÄNDE/)).toMatch(/^>/);

    // ArrowDown again → wraps back to "NEUES SPIEL STARTEN".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

    // ArrowUp from item 0 → wraps UP to the last item ("SPIELSTÄNDE").
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/SPIELSTÄNDE/)).toMatch(/^>/);

    // ArrowUp → "LERNBEREICH".
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/LERNBEREICH/)).toMatch(/^>/);
  });

  it('opens the progressive new-game flow without a duplicate learning mode', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });

    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));

    expect(await screen.findByRole('button', { name: /Freie Simulation/ })).toBeInTheDocument();
    // The story option leads to the campaign picker, so it names no campaign.
    const storyOption = screen.getByRole('button', { name: /Story-Kampagne/ });
    expect(storyOption).toBeInTheDocument();
    expect(storyOption).not.toHaveTextContent('Die Probezeit');
    expect(screen.queryByText('Lernmodus')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Freie Simulation/ }));

    expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
    expect(screen.queryByText('Lernmodus')).not.toBeInTheDocument();
    expect(screen.queryByText('Story-Kampagne')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByRole('button', { name: /Freie Simulation/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts a story campaign through the campaign picker and Standard through the simulation branch', async () => {
    const first = render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));
    // Story is now two steps: experience → campaign.
    fireEvent.click(await screen.findByRole('button', { name: /Story-Kampagne/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Die Probezeit/ }));
    expect(await screen.findByText('Willkommen im Team')).toBeInTheDocument();

    first.unmount();
    localStorage.clear();

    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));
    fireEvent.click(await screen.findByRole('button', { name: /Freie Simulation/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Standard/ }));
    expect(await screen.findByText(/Woche 1\/12/)).toBeInTheDocument();
  });

  it('hides AUDIT TRAIL in the picker until the secret code is typed', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));
    fireEvent.click(await screen.findByRole('button', { name: /Story-Kampagne/ }));

    // The normal path through the menu offers exactly one campaign.
    expect(await screen.findByRole('dialog', { name: 'Kampagne wählen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Die Probezeit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Audit Trail/ })).not.toBeInTheDocument();
  });

  it('starts AUDIT TRAIL through the picker — its own first beat, not probation\'s', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));
    fireEvent.click(await screen.findByRole('button', { name: /Story-Kampagne/ }));
    // Trick 17: the code is typed blind into the campaign picker.
    for (const key of 'trick17') fireEvent.keyDown(window, { key });
    fireEvent.click(await screen.findByRole('button', { name: /Audit Trail/ }));

    // The run boots into AUDIT TRAIL's first authored beat; probation's opener
    // must not appear (campaign content is selected by the picked campaign).
    expect(await screen.findByText('Ein zusätzlicher Auftrag')).toBeInTheDocument();
    expect(screen.queryByText('Willkommen im Team')).not.toBeInTheDocument();
  });

  it('Escape in the campaign picker returns to the experience picker, not the menu', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(await screen.findByText(/NEUES SPIEL STARTEN/));
    fireEvent.click(await screen.findByRole('button', { name: /Story-Kampagne/ }));

    expect(await screen.findByRole('dialog', { name: 'Kampagne wählen' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByRole('dialog', { name: 'Einsatzart wählen' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the existing load dialog through Spielstände', async () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Enter' });

    fireEvent.click(await screen.findByText(/SPIELSTÄNDE/));

    expect(await screen.findByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Schließen/ })).toBeInTheDocument();
  });
});
