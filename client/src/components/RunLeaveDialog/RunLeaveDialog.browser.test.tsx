import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunLeaveDialog } from './index';

describe('RunLeaveDialog', () => {
  it('shows the honest wording', () => {
    render(<RunLeaveDialog onContinue={() => {}} onLeave={() => {}} />);
    expect(screen.getByText(/Run verlassen und zum Hauptmenü\?/)).toBeTruthy();
    expect(screen.getByText(/noch nicht abgeschlossene Schritt wird möglicherweise neu gestartet/)).toBeTruthy();
  });

  it('„Run fortsetzen" calls onContinue, „Zum Hauptmenü" calls onLeave', () => {
    const onContinue = vi.fn(); const onLeave = vi.fn();
    render(<RunLeaveDialog onContinue={onContinue} onLeave={onLeave} />);
    fireEvent.click(screen.getByRole('button', { name: /Run fortsetzen/ }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Zum Hauptmenü/ }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('ESC calls onContinue (stay), never onLeave', () => {
    const onContinue = vi.fn(); const onLeave = vi.fn();
    render(<RunLeaveDialog onContinue={onContinue} onLeave={onLeave} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('both buttons are 44px touch targets', () => {
    render(<RunLeaveDialog onContinue={() => {}} onLeave={() => {}} />);
    for (const name of [/Run fortsetzen/, /Zum Hauptmenü/]) {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-11');
    }
  });

  it('is a dialog', () => {
    render(<RunLeaveDialog onContinue={() => {}} onLeave={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
