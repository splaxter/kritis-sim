import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewGameSelectModal } from './index';

describe('NewGameSelectModal', () => {
  it('presents simulation as the recommended default in an accessible dialog', () => {
    render(
      <NewGameSelectModal
        onSelectSimulation={vi.fn()}
        onSelectStory={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const simulation = screen.getByRole('button', { name: /Freie Simulation/ });
    const story = screen.getByRole('button', { name: /Story: Die Probezeit/ });
    expect(screen.getByRole('dialog', { name: 'Einsatzart wählen' })).toHaveAttribute('aria-modal', 'true');
    expect(simulation).toHaveTextContent('EMPFOHLEN');
    expect(simulation).toHaveAttribute('aria-pressed', 'true');
    expect(simulation).toHaveFocus();
    expect(simulation.className).toContain('focus-visible:ring-2');
    expect(story).toBeInTheDocument();
  });

  it('starts the recommended simulation with Enter', async () => {
    const user = userEvent.setup();
    const onSelectSimulation = vi.fn();
    render(
      <NewGameSelectModal
        onSelectSimulation={onSelectSimulation}
        onSelectStory={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await user.keyboard('{Enter}');

    expect(onSelectSimulation).toHaveBeenCalledOnce();
  });

  it('activates the button that received focus through Tab', async () => {
    const user = userEvent.setup();
    const onSelectStory = vi.fn();
    const onSelectSimulation = vi.fn();
    render(
      <NewGameSelectModal
        onSelectSimulation={onSelectSimulation}
        onSelectStory={onSelectStory}
        onClose={vi.fn()}
      />
    );

    await user.tab();
    expect(screen.getByRole('button', { name: /Story: Die Probezeit/ })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onSelectStory).toHaveBeenCalledOnce();
    expect(onSelectSimulation).not.toHaveBeenCalled();
  });

  it('traps focus inside the modal', async () => {
    const user = userEvent.setup();
    render(
      <NewGameSelectModal
        onSelectSimulation={vi.fn()}
        onSelectStory={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /Zurück/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Freie Simulation/ })).toHaveFocus();
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
