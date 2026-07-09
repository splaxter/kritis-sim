import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// The intro is a first-run-only splash: it plays once, we remember it in
// localStorage ('kritis_seen_intro'), and returning players skip straight to
// the menu.
describe('App — first-run intro gating', () => {
  beforeEach(() => localStorage.clear());

  it('shows the intro on a fresh profile and records that it was seen', async () => {
    render(<App />);
    expect(screen.getByText(/KLICKEN ODER ENTER ZUM STARTEN/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });
    await screen.findByText(/NEUES SPIEL STARTEN/);
    expect(localStorage.getItem('kritis_seen_intro')).toBe('1');
  });

  it('skips the intro when it has already been seen', () => {
    localStorage.setItem('kritis_seen_intro', '1');
    render(<App />);
    expect(screen.queryByText(/KLICKEN ODER ENTER ZUM STARTEN/)).toBeNull();
    expect(screen.getByText(/NEUES SPIEL STARTEN/)).toBeInTheDocument();
  });
});
