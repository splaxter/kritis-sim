import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Regression for TASK 4.2: entering learning mode must show the Learning Hub,
// NOT auto-serve the first level (learn_01). Before the wiring, App fell through
// to selectNextEvent and rendered learn_01 as an active level.
//
// Drives the real UI flow: intro → menu → Lernbereich.
describe('App — learning mode routes to the hub', () => {
  it('shows "Lernpfad" and does NOT auto-render the first level', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Intro screen → enter (Enter key dismisses it).
    fireEvent.keyDown(window, { key: 'Enter' });

    // 2. Main menu → open the dedicated learning area directly.
    const learningBtn = await screen.findByText(/LERNBEREICH/i);
    await user.click(learningBtn);

    // 3. The Learning Hub heading must be present...
    expect(await screen.findByText('Lernpfad')).toBeInTheDocument();

    // ...and learn_01 must NOT be auto-served as the active level. The level's
    // description ("SYSTEM BOOT...") is rendered ONLY by the active-level view
    // (EventCard), never by the hub. Its absence proves the hub rendered instead
    // of auto-serving the first level.
    expect(screen.queryByText(/SYSTEM BOOT/i)).toBeNull();

    // The recommended-next CTA still surfaces learn_01's title inside the hub —
    // that's expected; the hub is what's showing.
    expect(screen.getByText('Nächste empfohlene Lektion')).toBeInTheDocument();
  });
});
