import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';

const ctx: GuiContext = {
  app: 'taskmanager',
  title: 'Task-Manager',
  hostname: 'WS-TEST',
  state: {
    taskManager: {
      processes: [
        { name: 'svchost.exe', pid: 980, cpu: 2, memoryMb: 142, description: 'System', critical: true },
        { name: 'rogue.exe', pid: 7341, cpu: 94, memoryMb: 856, description: 'Unbekannt' },
      ],
    },
  },
  solutions: [
    { interactions: ['endtask:rogue.exe'], allRequired: true, resultText: 'Beendet.', skillGain: { windows: 6 } },
  ],
  hints: [],
};

afterEach(() => {
  cleanup();
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('WindowsLevel lifecycle', () => {
  it('does NOT call onSolved if unmounted during the success animation', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    const { unmount } = render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('rogue.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Solved visually, but onSolved is deferred by the success animation.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();

    // Player cancels (ESC) → component tears down before the timer fires.
    unmount();
    await wait(2000); // past SOLVE_DELAY_MS (1600ms)

    expect(onSolved).not.toHaveBeenCalled();
  });

  it('still calls onSolved exactly once when left to complete', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('rogue.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    await waitFor(() => expect(onSolved).toHaveBeenCalledTimes(1), { timeout: 2500 });
    expect(onSolved).toHaveBeenCalledWith({ windows: 6 }, undefined);
    // Give any erroneous second timer a chance to fire.
    await wait(400);
    expect(onSolved).toHaveBeenCalledTimes(1);
  });
});

describe('WindowsLevel keyboard accessibility', () => {
  it('selects a row via keyboard (focus + Enter) and solves', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    const rows = screen.getAllByRole('option');
    expect(rows.length).toBe(2);

    const rogueRow = screen.getByText('rogue.exe').closest('[role="option"]') as HTMLElement;
    expect(rogueRow).toHaveAttribute('tabindex', '0');
    rogueRow.focus();
    expect(rogueRow).toHaveFocus();

    await user.keyboard('{Enter}'); // keyboard selection
    expect(rogueRow).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: /task beenden/i }));
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ windows: 6 }, undefined), { timeout: 2500 });
  });

  it('exposes rows as a labelled listbox', () => {
    render(<WindowsLevel context={ctx} onSolved={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('listbox', { name: /prozesse/i })).toBeInTheDocument();
  });
});
