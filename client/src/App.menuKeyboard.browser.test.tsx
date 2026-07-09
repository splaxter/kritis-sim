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

    // ArrowDown → "LERNMODUS".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/LERNMODUS/)).toMatch(/^>/);
    expect(markerOf(/NEUES SPIEL STARTEN/)).not.toMatch(/^>/);

    // ArrowDown → "SPIEL LADEN".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);

    // ArrowDown again → wraps back to "NEUES SPIEL STARTEN".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

    // ArrowUp from item 0 → wraps UP to the last item ("SPIEL LADEN").
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);

    // ArrowUp → "LERNMODUS".
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/LERNMODUS/)).toMatch(/^>/);
  });
});
