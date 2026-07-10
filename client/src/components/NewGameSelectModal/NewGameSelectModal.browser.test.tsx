import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NewGameSelectModal } from './index';

describe('NewGameSelectModal', () => {
  it('presents simulation as the recommended default and story as the alternative', () => {
    render(
      <NewGameSelectModal
        onSelectSimulation={vi.fn()}
        onSelectStory={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const simulation = screen.getByRole('button', { name: /Freie Simulation/ });
    const story = screen.getByRole('button', { name: /Story: Die Probezeit/ });
    expect(simulation).toHaveTextContent('EMPFOHLEN');
    expect(simulation.className).toContain('focus-visible:ring-2');
    expect(story).toBeInTheDocument();
  });

  it('starts the recommended simulation with Enter', () => {
    const onSelectSimulation = vi.fn();
    render(
      <NewGameSelectModal
        onSelectSimulation={onSelectSimulation}
        onSelectStory={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSelectSimulation).toHaveBeenCalledOnce();
  });

  it('selects story with ArrowDown and Enter', () => {
    const onSelectStory = vi.fn();
    render(
      <NewGameSelectModal
        onSelectSimulation={vi.fn()}
        onSelectStory={onSelectStory}
        onClose={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSelectStory).toHaveBeenCalledOnce();
  });

  it('returns to the main menu with Escape', () => {
    const onClose = vi.fn();
    render(
      <NewGameSelectModal
        onSelectSimulation={vi.fn()}
        onSelectStory={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
