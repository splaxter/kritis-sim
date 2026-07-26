import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByRole('dialog', { name: 'Simulation wählen' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /Einsteiger/ })).toHaveFocus();
  });

  it('keeps Einsteiger as the recommended, pre-selected mode', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('★ EMPFOHLEN')).toBeInTheDocument();
    // The recommended badge sits on the Einsteiger card, which is also pre-selected.
    expect(screen.getByText('[*]')).toBeInTheDocument();
    // 'Einsteiger' appears in both the guidance blurb and the mode card title.
    expect(screen.getAllByText('Einsteiger').length).toBeGreaterThan(0);
  });

  it('activates Standard after it receives focus through Tab', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<GameModeSelectModal onSelect={onSelect} onClose={vi.fn()} />);

    await user.tab();
    expect(screen.getByRole('button', { name: /Standard/ })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('intermediate');
  });

  it('traps focus after the final control', async () => {
    const user = userEvent.setup();
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Einsteiger/ })).toHaveFocus();
  });

  it('keeps focus and selection across a parent re-render', async () => {
    // onSelect/onClose are created inline by App — new callbacks on every
    // parent render must not reset the highlight to the recommended mode.
    const user = userEvent.setup();
    const { rerender } = render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    await user.keyboard('{ArrowDown}');
    const standard = screen.getByRole('button', { name: /Standard/ });
    expect(standard).toHaveFocus();

    rerender(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(standard).toHaveFocus();
    expect(standard).toHaveAttribute('aria-pressed', 'true');
  });

  it('the overlay scrolls instead of clipping tall content', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Simulation wählen' });
    expect(dialog).toHaveClass('overflow-y-auto');
    // Centred by auto margins, not items-center — auto margins collapse to 0
    // when the card outgrows the viewport, keeping the top reachable.
    expect(dialog).not.toHaveClass('items-center');
    expect(dialog.firstElementChild).toHaveClass('m-auto');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
