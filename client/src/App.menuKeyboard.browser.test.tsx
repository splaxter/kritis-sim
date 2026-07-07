import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Regression guard for the main-menu keyboard handler (App.tsx ~line 216).
// Historical bug: ArrowUp and ArrowDown shared one branch, so ArrowUp moved
// DOWN. NOTE: with exactly 2 menu items (i+1)%2 === (i-1+2)%2, so this test
// passes against the old code too — it pins the *semantics* so any future
// third menu item keeps correct up/down behavior.
describe('App — main menu arrow-key navigation', () => {
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

    // ArrowDown → "SPIEL LADEN".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);
    expect(markerOf(/NEUES SPIEL STARTEN/)).not.toMatch(/^>/);

    // ArrowDown again → wraps back to "NEUES SPIEL STARTEN".
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);

    // ArrowUp from item 0 → wraps UP to the last item ("SPIEL LADEN").
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/SPIEL LADEN/)).toMatch(/^>/);

    // ArrowUp again → back to item 0.
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(markerOf(/NEUES SPIEL STARTEN/)).toMatch(/^>/);
  });
});
