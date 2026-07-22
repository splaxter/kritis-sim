import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';

type DataHandler = (data: string) => void;

// xterm mock that CAPTURES writes — the multi-host flow is asserted against
// what the hook actually printed (prompts, banners, masked input).
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
    },
  ],
  hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
  commandSkillGain: { ssh: { linux: 2 } },
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

describe('Terminal multi-host: ssh password login + stateGoal solution', () => {
  it('walks ssh password auth to a remote stateGoal solve with merged skill gain', () => {
    const { term, onSolved } = setup();

    // 1. ssh triggers a password prompt; the typed password is never echoed.
    enter(term, 'ssh admin@web01');
    expect(written(term)).toContain("admin@web01's password: ");

    enter(term, 'pw123');
    expect(written(term)).not.toContain('pw123');

    // 2. Logged in: the prompt now reflects the remote session.
    expect(written(term)).toContain('admin@web01');

    // 3. Creating the goal file on web01 solves the level.
    enter(term, 'touch /tmp/done.txt');
    expect(written(term)).toContain('AUFGABE ABGESCHLOSSEN');
    expect(written(term)).toContain('Geschafft!');
    expect(onSolved).not.toHaveBeenCalled();

    // 4. Enter confirms: solution gain {linux:3} + live ssh drip {linux:2} sum up.
    term.emitData('\r');
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ linux: 5 }, undefined, {});
  });

  it('Ctrl+C during the password prompt returns to a normal working prompt', () => {
    const { term, onSolved } = setup();

    enter(term, 'ssh admin@web01');
    expect(written(term)).toContain("admin@web01's password: ");

    term.emitData('\x03');
    expect(written(term)).toContain('^C');
    // Back on the LOCAL prompt — the session was never entered.
    const afterCancel = written(term);
    expect(afterCancel.lastIndexOf('timo@ws-admin')).toBeGreaterThan(afterCancel.indexOf('^C'));

    // Typing works again (normal echo) and nothing is solved.
    const before = term.buffer.length;
    enter(term, 'pwd');
    const after = term.buffer.slice(before).join('');
    expect(after).toContain('pwd');
    expect(after).toContain('/home/timo');
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('keeps the password out of history: arrow-up recalls the ssh command', () => {
    const { term } = setup();

    enter(term, 'ssh admin@web01');
    enter(term, 'pw123');
    expect(written(term)).toContain('admin@web01');

    const before = term.buffer.length;
    term.emitData('\x1b[A');
    const recalled = term.buffer.slice(before).join('');
    expect(recalled).toContain('ssh admin@web01');
    expect(written(term)).not.toContain('pw123');
  });
});
