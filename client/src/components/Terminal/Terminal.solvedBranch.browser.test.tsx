import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';
import { enter, latestTerm, resetTerms } from './testHarness';

vi.mock('@xterm/xterm', async () => ({ Terminal: (await import('./testHarness')).terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', async () => ({ FitAddon: (await import('./testHarness')).terminalMock.FitAddon }));

/**
 * Der geloeste Zweig muss durch den ADAPTER kommen, nicht nur aus der Session.
 *
 * `TerminalSession` reichte den Befund als viertes Argument heraus, `useTerminal`
 * gab aber nur drei weiter. Folge: Bei GUI-Leveln stand der Befund auf dem
 * Ergebnisbildschirm, bei Terminal-Leveln nicht — er war im Terminal zu sehen
 * und nach Enter verschwunden. Ein Test auf der Session allein haette das nie
 * gefunden, weil dort alles stimmte.
 */

const BEFUND = 'Drei Zahlen, die nicht zueinander passen.';

const context: TerminalContext = {
  type: 'linux',
  hostname: 'ws-admin',
  username: 'timo',
  currentPath: '/home/timo',
  hints: [],
  commands: [],
  solutions: [
    {
      commands: [],
      allRequired: false,
      stateGoals: [{ file: '/home/timo/befund.md', matches: 'fertig' }],
      resultText: BEFUND,
      skillGain: { linux: 3 },
      effects: {},
    },
  ],
};

beforeEach(() => resetTerms());

describe('Terminal — der geloeste Zweig erreicht den Aufrufer', () => {
  it('reicht den Befund als viertes Argument an onSolved durch', () => {
    const onSolved = vi.fn();
    render(<Terminal context={context} onSolved={onSolved} onCancel={() => {}} onFlagsSet={() => {}} />);
    const term = latestTerm()!;

    enter(term, 'echo "fertig" > /home/timo/befund.md');
    expect(onSolved, 'die Loesung wartet auf Enter').not.toHaveBeenCalled();

    enter(term, '');
    expect(onSolved).toHaveBeenCalledTimes(1);

    const branch = onSolved.mock.calls[0][3];
    expect(branch, 'ohne viertes Argument erreicht der Befund den Ergebnisbildschirm nie').toBeDefined();
    expect(branch.resultText).toBe(BEFUND);
  });
});
