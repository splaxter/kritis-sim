import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GameModeSelectModal } from './index';

describe('GameModeSelectModal — simulation variants', () => {
  it('shows only Einsteiger, Standard, and KRITIS as semantic buttons', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    const choices = screen.getAllByRole('button').filter((button) =>
      /Einsteiger|Standard|KRITIS/.test(button.textContent ?? '')
    );
    expect(choices).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Einsteiger/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Standard/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /KRITIS/ })).toBeInTheDocument();
    expect(screen.queryByText('Lernmodus')).not.toBeInTheDocument();
    expect(screen.queryByText('Story: Die Probezeit')).not.toBeInTheDocument();
  });

  it('keeps Einsteiger as the recommended, pre-selected mode', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('★ EMPFOHLEN')).toBeInTheDocument();
    // The recommended badge sits on the Einsteiger card, which is also pre-selected.
    expect(screen.getByText('[*]')).toBeInTheDocument();
    // 'Einsteiger' appears in both the guidance blurb and the mode card title.
    expect(screen.getAllByText('Einsteiger').length).toBeGreaterThan(0);
  });

  it('selects Standard with ArrowDown and Enter', () => {
    const onSelect = vi.fn();
    render(<GameModeSelectModal onSelect={onSelect} onClose={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('intermediate');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
