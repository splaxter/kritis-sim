import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';

type DataHandler = (data: string) => void;

// xterm mock that captures writes — the solve banner (incl. the after-action
// feedback line) is asserted against what the hook actually printed.
const terminalMock = vi.hoisted(() => ({
  instances: [] as Array<{ emitData: (data: string) => void; buffer: string[] }>,
  Terminal: class {
    private handlers: DataHandler[] = [];
    buffer: string[] = [];
    cols = 80;

    constructor() {
      terminalMock.instances.push(this);
    }

    loadAddon() {}
    open() {}
    focus() {}
    write(data: string) {
      this.buffer.push(data);
    }
    writeln(data: string) {
      this.buffer.push(data + '\n');
    }
    clear() {}
    dispose() {}

    onData(handler: DataHandler) {
      this.handlers.push(handler);
      return { dispose: () => {} };
    }

    emitData(data: string) {
      this.handlers.forEach((handler) => handler(data));
    }
  },
  FitAddon: class {
    fit() {}
  },
}));

vi.mock('@xterm/xterm', () => ({ Terminal: terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: terminalMock.FitAddon }));

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
  const term = terminalMock.instances.at(-1)!;
  expect(term).toBeDefined();
  return { term, onSolved };
}

function type(term: { emitData: (d: string) => void }, text: string) {
  for (const char of text) term.emitData(char);
}

function enter(term: { emitData: (d: string) => void }, text: string) {
  type(term, text);
  term.emitData('\r');
}

const written = (term: { buffer: string[] }) => term.buffer.join('');

beforeEach(() => {
  terminalMock.instances.length = 0;
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
