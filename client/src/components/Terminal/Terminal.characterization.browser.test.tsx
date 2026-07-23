import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { Terminal } from './index';
import { type, enter, written, latestTerm, resetTerms } from './testHarness';

vi.mock('@xterm/xterm', async () => ({ Terminal: (await import('./testHarness')).terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', async () => ({ FitAddon: (await import('./testHarness')).terminalMock.FitAddon }));

// Backspace / DEL key (0x7F) — the byte the input loop's Backspace case handles.
const BS = '';

// A bare linux shell context: `ls`, `pwd`, `whoami` etc. go through the real
// ShellEngine (no scenario commands, no solutions to worry about).
function bareContext(overrides: Partial<TerminalContext> = {}): TerminalContext {
  return {
    type: 'linux',
    hostname: 'ws-admin',
    username: 'timo',
    currentPath: '/home/timo',
    hints: [],
    commands: [],
    solutions: [],
    ...overrides,
  };
}

function setup(context: TerminalContext, gameMode?: GameModeId) {
  const onSolved = vi.fn();
  render(<Terminal context={context} onSolved={onSolved} onCancel={() => {}} gameMode={gameMode} />);
  const term = latestTerm();
  expect(term).toBeDefined();
  return { term, onSolved };
}

beforeEach(() => {
  resetTerms();
});

describe('Terminal input loop characterization', () => {
  it('1. line editing: backspace deletes, then typing continues, and `ls` runs', () => {
    const { term } = setup(bareContext());

    // Type `ls`, backspace back to `l`, type `s` again -> `ls`.
    type(term, 'ls');
    term.emitData(BS); // -> `l`
    type(term, 's');   // -> `ls`

    const before = term.buffer.length;
    term.emitData('\r');
    const after = term.buffer.slice(before).join('');

    // `ls` executed through the real shell (no unknown-command error) and a
    // fresh prompt follows.
    expect(after).not.toContain('command not found');
    expect(after).toContain('timo@ws-admin');
  });

  it('2. up-arrow recalls the previous command onto the input line and it runs again', () => {
    const { term } = setup(bareContext());

    enter(term, 'ls');

    const beforeRecall = term.buffer.length;
    term.emitData('\x1b[A'); // up arrow
    const recalled = term.buffer.slice(beforeRecall).join('');
    expect(recalled).toContain('ls');

    // The recalled command runs again on Enter -> fresh prompt, no error.
    const beforeRun = term.buffer.length;
    term.emitData('\r');
    const afterRun = term.buffer.slice(beforeRun).join('');
    expect(afterRun).not.toContain('command not found');
    expect(afterRun).toContain('timo@ws-admin');
  });

  it('3. Ctrl-U discards the line; Ctrl-A/Ctrl-E leave the line intact', () => {
    const { term, onSolved } = setup(bareContext());

    // Ctrl-U on a dangerous command -> nothing runs.
    type(term, 'rm -rf /');
    term.emitData('\x15'); // Ctrl-U clears the line

    const beforeEnter = term.buffer.length;
    term.emitData('\r');
    const afterEnter = term.buffer.slice(beforeEnter).join('');
    // Empty line on Enter: only a fresh prompt, no `rm` ever executed.
    expect(afterEnter).not.toContain('rm');
    expect(afterEnter).toContain('timo@ws-admin');

    // Ctrl-A (home) then Ctrl-E (end) are pure cursor moves — the word survives.
    type(term, 'pwd');
    term.emitData('\x01'); // Ctrl-A
    term.emitData('\x05'); // Ctrl-E
    const beforePwd = term.buffer.length;
    term.emitData('\r');
    const afterPwd = term.buffer.slice(beforePwd).join('');
    expect(afterPwd).toContain('/home/timo'); // pwd output — line ran intact

    expect(onSolved).not.toHaveBeenCalled();
  });

  it('4. Tab completes a unique scenario command prefix', () => {
    const context = bareContext({
      commands: [{ pattern: 'diagnose-net', output: 'netzdiagnose ok' }],
    });
    const { term } = setup(context);

    const before = term.buffer.length;
    type(term, 'diag');
    term.emitData('\t');
    const after = term.buffer.slice(before).join('');

    expect(after).toContain('diagnose-net');
  });

  it('5. `?` on an empty line reveals hints in order, then reports no more', () => {
    const context = bareContext({ hints: ['Erster Hinweis', 'Zweiter Hinweis'] });
    const { term } = setup(context, 'intermediate');

    // Wrap each keystroke so the hintsUsed state/ref commits between presses,
    // exactly as it would between real keyboard events.
    act(() => { term.emitData('?'); });
    expect(written(term)).toContain('\x1b[33m'); // yellow hint colour
    expect(written(term)).toContain('💡 Erster Hinweis');

    act(() => { term.emitData('?'); });
    expect(written(term)).toContain('💡 Zweiter Hinweis');

    act(() => { term.emitData('?'); });
    expect(written(term)).toContain('Keine weiteren Hinweise');
  });

  it('7. a pending password prompt masks input and login swaps the prompt host', () => {
    const context = bareContext({
      hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
    });
    const { term } = setup(context);

    enter(term, 'ssh admin@web01');
    expect(written(term)).toContain("admin@web01's password: ");

    // Type the password WITHOUT Enter: masked, so the literal chars never echo.
    const beforePw = term.buffer.length;
    type(term, 'pw123');
    const duringPw = term.buffer.slice(beforePw).join('');
    expect(duringPw).not.toContain('pw123');

    // Enter completes the login; the working prompt now belongs to web01.
    term.emitData('\r');
    expect(written(term)).toContain('admin@web01:');
    expect(written(term)).not.toContain('pw123');
  });

  it('8. Ctrl-C aborts a pending prompt: ^C, fresh local prompt, nothing solved', () => {
    const context = bareContext({
      hosts: [{ id: 'web01', hostname: 'web01', accounts: [{ name: 'admin', password: 'pw123' }] }],
    });
    const { term, onSolved } = setup(context);

    enter(term, 'ssh admin@web01');
    expect(written(term)).toContain("admin@web01's password: ");

    term.emitData('\x03'); // Ctrl-C
    const out = written(term);
    expect(out).toContain('^C');
    // Back on the LOCAL prompt after the abort; the remote session was never entered.
    expect(out.lastIndexOf('timo@ws-admin')).toBeGreaterThan(out.indexOf('^C'));
    expect(out).not.toContain('admin@web01:'); // no logged-in prompt

    expect(onSolved).not.toHaveBeenCalled();
  });
});

describe('Terminal ping streaming (paced output)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('6. ping reply lines are paced over time, not dumped at once', () => {
    const pingOutput = [
      'PING 10.0.0.9 (10.0.0.9): 56 data bytes',
      '64 bytes from 10.0.0.9: icmp_seq=0 ttl=64 time=0.1 ms',
      '64 bytes from 10.0.0.9: icmp_seq=1 ttl=64 time=0.1 ms',
      '64 bytes from 10.0.0.9: icmp_seq=2 ttl=64 time=0.1 ms',
      '--- 10.0.0.9 ping statistics ---',
      '3 packets transmitted, 3 received, 0% packet loss',
    ].join('\n');

    const context = bareContext({
      commands: [{ pattern: 'ping -c 3 10.0.0.9', output: pingOutput, teachesCommand: 'ping' }],
    });
    const { term } = setup(context);

    enter(term, 'ping -c 3 10.0.0.9');

    // The header is instant, but no reply line has streamed in yet.
    const immediately = written(term);
    expect(immediately).toContain('PING 10.0.0.9');
    expect(immediately).not.toContain('icmp_seq=0');
    expect(immediately).not.toContain('icmp_seq=2');

    // One tick reveals exactly the first reply, not the later ones.
    act(() => { vi.advanceTimersByTime(450); });
    const afterOne = written(term);
    expect(afterOne).toContain('icmp_seq=0');
    expect(afterOne).not.toContain('icmp_seq=2');

    // Draining the rest of the schedule reveals every reply and a fresh prompt.
    act(() => { vi.advanceTimersByTime(450 * 6); });
    const done = written(term);
    expect(done).toContain('icmp_seq=1');
    expect(done).toContain('icmp_seq=2');
    expect(done).toContain('0% packet loss');
    expect(done).toContain('timo@ws-admin'); // prompt restored after streaming
  });
});
