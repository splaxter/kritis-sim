import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VISIBLE_MODES } from '@kritis/shared';
import { GameModeSelectModal } from './index';

describe('GameModeSelectModal — Standard mode exposed', () => {
  it('VISIBLE_MODES includes intermediate (Standard, 1.0x) between story and kritis', () => {
    expect(VISIBLE_MODES).toEqual(['beginner', 'learning', 'story', 'intermediate', 'kritis']);
  });

  it('renders the Standard mode card', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText(/klassische Spielerlebnis/)).toBeInTheDocument();
  });

  it('keeps Einsteiger as the recommended, pre-selected mode', () => {
    render(<GameModeSelectModal onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('★ EMPFOHLEN')).toBeInTheDocument();
    // The recommended badge sits on the Einsteiger card, which is also pre-selected.
    expect(screen.getByText('[*]')).toBeInTheDocument();
    // 'Einsteiger' appears in both the guidance blurb and the mode card title.
    expect(screen.getAllByText('Einsteiger').length).toBeGreaterThan(0);
  });
});
