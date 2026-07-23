import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';
import { terminalMock } from './testHarness';

vi.mock('@xterm/xterm', async () => ({
  Terminal: (await import('./testHarness')).terminalMock.Terminal,
}));

vi.mock('@xterm/addon-fit', async () => ({
  FitAddon: (await import('./testHarness')).terminalMock.FitAddon,
}));

const context: TerminalContext = {
  type: 'linux',
  hostname: 'srv-test',
  username: 'azubi',
  currentPath: '/home/azubi',
  hints: [],
  commands: [
    {
      pattern: 'unsafe-fix',
      output: 'Rollback gestartet, aber Ursache nicht geprueft.',
      isPartialSolution: true,
      wrongApproachFeedback: 'Pruefe erst die Ursache, sonst kommt der Fehler zurueck.',
    },
  ],
  solutions: [],
};

describe('Terminal partial solution feedback', () => {
  it('renders feedback when a partial solution command is entered', async () => {
    render(<Terminal context={context} onSolved={() => {}} onCancel={() => {}} />);

    const terminal = terminalMock.instances.at(-1);
    expect(terminal).toBeDefined();

    for (const char of 'unsafe-fix') {
      terminal!.emitData(char);
    }
    terminal!.emitData('\r');

    await waitFor(() => {
      expect(screen.getByText(/Pruefe erst die Ursache/i)).toBeInTheDocument();
    });
  });
});
