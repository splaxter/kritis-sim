import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';
import { enter, written, latestTerm, resetTerms } from './testHarness';

vi.mock('@xterm/xterm', async () => ({ Terminal: (await import('./testHarness')).terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', async () => ({ FitAddon: (await import('./testHarness')).terminalMock.FitAddon }));

const RISK_LINE = '⚠ RISKANT-MARKER: legitime Datei angetastet.';

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
      stateGoals: [{ host: 'web01', file: '/tmp/done.txt', fileExists: true }],
      resultText: 'Geschafft!',
      skillGain: { linux: 3 },
      effects: {},
      feedback: [{ when: { commandMatches: { pattern: 'rm\\s' } }, text: RISK_LINE }],
    },
  ],
  hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
};

function setup(onSolved = vi.fn()) {
  render(<Terminal context={context} onSolved={onSolved} onCancel={() => {}} />);
  const term = latestTerm();
  expect(term).toBeDefined();
  return { term, onSolved };
}

beforeEach(() => {
  resetTerms();
});

describe('Terminal after-action feedback on the solve banner', () => {
  it('the risky path appends the risk line below the resultText', () => {
    const { term } = setup();

    enter(term, 'ssh admin@web01');
    enter(term, 'pw123');
    expect(written(term)).toContain('admin@web01');

    // Touch a legitimate file (the risky move), then solve.
    enter(term, 'rm -f /tmp/keep.txt');
    enter(term, 'touch /tmp/done.txt');

    const banner = written(term);
    expect(banner).toContain('AUFGABE ABGESCHLOSSEN');
    expect(banner).toContain('Geschafft!');
    expect(banner).toContain(RISK_LINE);
  });

  it('the clean path shows no false praise — the risk line is absent', () => {
    const { term } = setup();

    enter(term, 'ssh admin@web01');
    enter(term, 'pw123');
    expect(written(term)).toContain('admin@web01');

    // Solve directly, no risky command.
    enter(term, 'touch /tmp/done.txt');

    const banner = written(term);
    expect(banner).toContain('AUFGABE ABGESCHLOSSEN');
    expect(banner).toContain('Geschafft!');
    expect(banner).not.toContain(RISK_LINE);
  });
});
