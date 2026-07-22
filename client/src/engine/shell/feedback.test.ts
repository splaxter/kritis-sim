import { describe, it, expect, vi } from 'vitest';
import { selectFeedback } from './feedback';
import { CommandAttempt } from './types';
import type { FeedbackRule } from '@kritis/shared';

const A = (command: string, o: Partial<CommandAttempt> = {}): CommandAttempt =>
  ({ command, sequence: 0, hostBefore: 'local', hostAfter: 'local', exitCode: 0, ...o });

describe('selectFeedback', () => {
  it('commandMatches: succeeded requires exit 0', () => {
    const rules: FeedbackRule[] = [
      { when: { commandMatches: { pattern: 'ufw enable', outcome: 'succeeded' } }, text: 'ok' },
    ];
    expect(selectFeedback(rules, [A('ufw enable', { exitCode: 0 })])).toBe('ok');
    expect(selectFeedback(rules, [A('ufw enable', { exitCode: 1 })])).toBeNull();
  });

  it('outcome attempted covers success, failure and cancel(130)', () => {
    const rules: FeedbackRule[] = [
      { when: { commandMatches: { pattern: 'kill 456' } }, text: 'r' }, // default attempted
    ];
    expect(selectFeedback(rules, [A('kill 456', { exitCode: 1 })])).toBe('r');
    expect(selectFeedback(rules, [A('kill 456', { exitCode: 130 })])).toBe('r');
  });

  it('outcome failed requires a nonzero exit', () => {
    const rules: FeedbackRule[] = [
      { when: { commandMatches: { pattern: 'systemctl start api', outcome: 'failed' } }, text: 'f' },
    ];
    expect(selectFeedback(rules, [A('systemctl start api', { exitCode: 1 })])).toBe('f');
    expect(selectFeedback(rules, [A('systemctl start api', { exitCode: 0 })])).toBeNull();
  });

  it('authMethod filters the matched attempt', () => {
    const rules: FeedbackRule[] = [
      { when: { commandMatches: { pattern: 'ssh ', authMethod: 'publickey', outcome: 'succeeded' } }, text: 'pk' },
    ];
    expect(selectFeedback(rules, [A('ssh admin@web01', { authMethod: 'publickey' })])).toBe('pk');
    expect(selectFeedback(rules, [A('ssh admin@web01', { authMethod: 'password' })])).toBeNull();
  });

  it('commandBefore compares first matching attempts by sequence; multiple pairs are AND', () => {
    const log = [
      A('journalctl -u api', { sequence: 1 }),
      A('systemctl start mysql', { sequence: 2 }),
      A('systemctl start api', { sequence: 3 }),
    ];
    const rules: FeedbackRule[] = [
      {
        when: {
          commandBefore: [
            { first: { pattern: 'journalctl' }, second: { pattern: 'start mysql' } },
            { first: { pattern: 'start mysql' }, second: { pattern: 'start api' } },
          ],
        },
        text: 'clean',
      },
    ];
    expect(selectFeedback(rules, log)).toBe('clean');
  });

  it('commandBefore fails when both patterns match the SAME attempt (chained &&)', () => {
    const log = [A('ufw allow 22 && ufw enable', { sequence: 1 })];
    const rules: FeedbackRule[] = [
      {
        when: { commandBefore: [{ first: { pattern: 'ufw allow.*22' }, second: { pattern: 'ufw enable' } }] },
        text: 'x',
      },
    ];
    expect(selectFeedback(rules, log)).toBeNull(); // strict order only BETWEEN attempts
  });

  it('commandBefore fails when a pair is out of order', () => {
    const log = [
      A('systemctl start api', { sequence: 1 }),
      A('journalctl -u api', { sequence: 2 }),
    ];
    const rules: FeedbackRule[] = [
      {
        when: { commandBefore: [{ first: { pattern: 'journalctl' }, second: { pattern: 'start api' } }] },
        text: 'clean',
      },
    ];
    expect(selectFeedback(rules, log)).toBeNull();
  });

  it('commandCount counts matching attempts only', () => {
    const log = [
      A('systemctl start api', { sequence: 1 }),
      A('cat x', { sequence: 2 }),
      A('systemctl restart api', { sequence: 3 }),
    ];
    const rules: FeedbackRule[] = [
      { when: { commandCount: { matcher: { pattern: 'systemctl (re)?start api' }, min: 2 } }, text: 'twice' },
    ];
    expect(selectFeedback(rules, log)).toBe('twice');
  });

  it('commandCount respects max', () => {
    const log = [
      A('sed -i s/x/y/ f', { sequence: 1 }),
      A('sed -i s/a/b/ f', { sequence: 2 }),
    ];
    const rules: FeedbackRule[] = [
      { when: { commandCount: { matcher: { pattern: 'sed -i' }, max: 1 } }, text: 'one' },
    ];
    expect(selectFeedback(rules, log)).toBeNull();
    expect(selectFeedback(rules, [A('sed -i s/x/y/ f', { sequence: 1 })])).toBe('one');
  });

  it('first matching rule wins (risk before praise)', () => {
    const rules: FeedbackRule[] = [
      { when: { commandMatches: { pattern: 'rm .*authorized_keys' } }, text: 'risk' },
      { when: { commandMatches: { pattern: 'sed' } }, text: 'praise' },
    ];
    expect(selectFeedback(rules, [A('rm ~/.ssh/authorized_keys'), A('sed -i ...')])).toBe('risk');
  });

  it('AND across a rule: every declared sub-condition must hold', () => {
    const rules: FeedbackRule[] = [
      {
        when: {
          commandMatches: { pattern: 'ufw enable', outcome: 'succeeded' },
          commandAbsent: { pattern: 'ufw disable' },
        },
        text: 'both',
      },
    ];
    expect(selectFeedback(rules, [A('ufw enable')])).toBe('both');
    expect(selectFeedback(rules, [A('ufw enable'), A('ufw disable')])).toBeNull();
  });

  it('no match → null; commandAbsent inverts', () => {
    expect(
      selectFeedback([{ when: { commandMatches: { pattern: 'zzz' } }, text: 't' }], [A('ls')]),
    ).toBeNull();
    expect(
      selectFeedback([{ when: { commandAbsent: { pattern: 'daemon-reload' } }, text: 'noreload' }], [A('ls')]),
    ).toBe('noreload');
    expect(
      selectFeedback([{ when: { commandAbsent: { pattern: 'daemon-reload' } }, text: 'noreload' }], [A('systemctl daemon-reload')]),
    ).toBeNull();
  });

  it('empty log yields null for a positive matcher but satisfies commandAbsent', () => {
    expect(selectFeedback([{ when: { commandMatches: { pattern: 'x' } }, text: 't' }], [])).toBeNull();
    expect(selectFeedback([{ when: { commandAbsent: { pattern: 'x' } }, text: 't' }], [])).toBe('t');
  });

  it('invalid regex → null, warns once', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(selectFeedback([{ when: { commandMatches: { pattern: '([' } }, text: 't' }], [A('ls')])).toBeNull();
    selectFeedback([{ when: { commandMatches: { pattern: '([' } }, text: 't' }], [A('ls')]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
