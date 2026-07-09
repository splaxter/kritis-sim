import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const context: GuiContext = {
  app: 'taskmanager',
  title: 'Task-Manager',
  hostname: 'WS-TEST',
  state: {
    taskManager: {
      processes: [
        { name: 'svchost.exe', pid: 980, cpu: 2, memoryMb: 142, description: 'System', critical: true },
        { name: 'explorer.exe', pid: 3104, cpu: 1, memoryMb: 188, description: 'Explorer' },
        { name: 'rogue-miner.exe', pid: 7341, cpu: 94, memoryMb: 856, description: 'Unbekannt' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['endtask:rogue-miner.exe'],
      allRequired: true,
      resultText: 'Krypto-Miner beendet.',
      skillGain: { windows: 6, security: 4 },
    },
  ],
  hints: ['Welcher Prozess zieht 94% CPU?'],
};

installFakeTimers();

describe('WindowsLevel — Task Manager', () => {
  it('solves when the rogue process is selected and ended', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    // The fake app renders its processes.
    expect(screen.getByText('rogue-miner.exe')).toBeInTheDocument();

    // Select the rogue process, then end it.
    await user.click(screen.getByText('rogue-miner.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Success overlay appears immediately; onSolved fires after a short delay.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ windows: 6, security: 4 }, undefined);
  });

  it('refuses to end a critical system process and does not solve', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('svchost.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Access-denied message shown, process still listed, level not solved.
    expect(screen.getByText(/kritischer Windows-Prozess/i)).toBeInTheDocument();
    expect(screen.getByText('svchost.exe')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('reveals hints on demand', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);

    expect(screen.queryByText(/94% CPU/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Hinweis/i }));
    expect(screen.getByText(/94% CPU/i)).toBeInTheDocument();
  });
});
