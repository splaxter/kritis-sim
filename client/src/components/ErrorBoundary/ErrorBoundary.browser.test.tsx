// client/src/components/ErrorBoundary/ErrorBoundary.browser.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './index';

function Bomb(): never {
  throw new Error('Kaboom');
}

// React logs caught render errors via console.error — keep test output clean.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>alles gut</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('alles gut')).toBeInTheDocument();
  });

  it('shows the German fallback instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Etwas ist schiefgelaufen/i)).toBeInTheDocument();
    // Autosave reassurance + the thrown message for bug reports.
    expect(screen.getByText(/Spielstand wird automatisch gesichert/i)).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });

  it('offers a reload button that triggers the reload callback', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <ErrorBoundary onReload={onReload}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /neu laden/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
