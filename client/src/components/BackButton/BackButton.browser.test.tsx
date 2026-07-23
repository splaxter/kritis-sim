import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackButton } from './index';

describe('BackButton', () => {
  it('renders the label and fires onClick, with a 44px touch target', () => {
    const onClick = vi.fn();
    render(<BackButton label="Zum Lernpfad" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /Zum Lernpfad/ });
    expect(btn.className).toContain('min-h-11'); // 44px
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges an extra className', () => {
    render(<BackButton label="Zum Hauptmenü" onClick={() => {}} className="mt-2" />);
    const btn = screen.getByRole('button', { name: /Zum Hauptmenü/ });
    expect(btn.className).toContain('mt-2');
    expect(btn.className).toContain('min-h-11');
  });
});
