/**
 * Interactive input continuations: a command returns pendingInput and the
 * engine feeds it the next line the player types (password prompts etc.).
 */
import { describe, it, expect } from 'vitest';
import { createShell } from './index';
import { CommandResult, ExecutionContext, ParsedArgs } from './types';

describe('pending input continuations', () => {
  it('a command can request further input and consume the next line', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'askname', description: '', usage: 'askname',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('name: ', false, (line) => ({ output: `hello ${line}`, exitCode: 0 }));
      },
    });
    const r1 = shell.execute('askname');
    expect(r1.pendingInput).toEqual({ prompt: 'name: ', mask: false });
    expect(shell.hasPendingInput()).toBe(true);
    const r2 = shell.continueInput('Timo');
    expect(r2.output).toBe('hello Timo');
    expect(shell.hasPendingInput()).toBe(false);
  });

  it('chained continuations: a continuation returning pendingInput keeps the loop alive', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'login', description: '', usage: 'login',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        // Three password attempts, like ssh.
        const attempt = (n: number) => (line: string): CommandResult => {
          if (line === 'geheim') return { output: 'access granted', exitCode: 0 };
          if (n >= 3) return { output: 'Permission denied (password).', exitCode: 255 };
          return ctx.requestInput!('Password: ', true, attempt(n + 1));
        };
        return ctx.requestInput!('Password: ', true, attempt(1));
      },
    });
    const r1 = shell.execute('login');
    expect(r1.pendingInput).toEqual({ prompt: 'Password: ', mask: true });
    const r2 = shell.continueInput('falsch');
    expect(r2.pendingInput).toEqual({ prompt: 'Password: ', mask: true });
    expect(shell.hasPendingInput()).toBe(true);
    const r3 = shell.continueInput('auch-falsch');
    expect(r3.pendingInput).toEqual({ prompt: 'Password: ', mask: true });
    const r4 = shell.continueInput('geheim');
    expect(r4.output).toBe('access granted');
    expect(r4.exitCode).toBe(0);
    expect(shell.hasPendingInput()).toBe(false);
  });

  it('third failed attempt ends the loop with the command result', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'login', description: '', usage: 'login',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        const attempt = (n: number) => (line: string): CommandResult => {
          if (line === 'geheim') return { output: 'access granted', exitCode: 0 };
          if (n >= 3) return { output: 'Permission denied (password).', exitCode: 255 };
          return ctx.requestInput!('Password: ', true, attempt(n + 1));
        };
        return ctx.requestInput!('Password: ', true, attempt(1));
      },
    });
    shell.execute('login');
    shell.continueInput('a');
    shell.continueInput('b');
    const last = shell.continueInput('c');
    expect(last.output).toBe('Permission denied (password).');
    expect(last.exitCode).toBe(255);
    expect(shell.hasPendingInput()).toBe(false);
  });

  it('cancelPendingInput clears the continuation', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'askname', description: '', usage: 'askname',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('name: ', false, (line) => ({ output: `hello ${line}`, exitCode: 0 }));
      },
    });
    shell.execute('askname');
    expect(shell.hasPendingInput()).toBe(true);
    shell.cancelPendingInput();
    expect(shell.hasPendingInput()).toBe(false);
    expect(shell.getPendingPrompt()).toBeNull();
    // Normal execution works again.
    expect(shell.execute('echo ok').output).toBe('ok');
  });

  it('while pending, execute() refuses and returns the pending prompt again', () => {
    const shell = createShell({ type: 'bash' });
    let ran = 0;
    shell.registerCommand({
      name: 'askname', description: '', usage: 'askname',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('name: ', false, (line) => ({ output: `hello ${line}`, exitCode: 0 }));
      },
    });
    shell.registerCommand({
      name: 'sideeffect', description: '', usage: 'sideeffect',
      execute() { ran++; return { output: 'ran', exitCode: 0 }; },
    });
    shell.execute('askname');
    const blocked = shell.execute('sideeffect');
    expect(blocked).toEqual({ output: '', exitCode: 1, pendingInput: { prompt: 'name: ', mask: false } });
    expect(ran).toBe(0);
    // The continuation is still live afterwards.
    expect(shell.continueInput('Timo').output).toBe('hello Timo');
  });

  it('getPendingPrompt returns the current prompt/mask or null', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'askpw', description: '', usage: 'askpw',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('Password: ', true, () => ({ output: '', exitCode: 0 }));
      },
    });
    expect(shell.getPendingPrompt()).toBeNull();
    shell.execute('askpw');
    expect(shell.getPendingPrompt()).toEqual({ prompt: 'Password: ', mask: true });
    shell.continueInput('x');
    expect(shell.getPendingPrompt()).toBeNull();
  });

  it('masked prompts carry mask: true through chaining', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'twice', description: '', usage: 'twice',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('Password: ', true, () =>
          ctx.requestInput!('Repeat: ', true, () => ({ output: 'done', exitCode: 0 }))
        );
      },
    });
    const r1 = shell.execute('twice');
    expect(r1.pendingInput).toEqual({ prompt: 'Password: ', mask: true });
    const r2 = shell.continueInput('a');
    expect(r2.pendingInput).toEqual({ prompt: 'Repeat: ', mask: true });
    expect(shell.getPendingPrompt()).toEqual({ prompt: 'Repeat: ', mask: true });
    expect(shell.continueInput('a').output).toBe('done');
  });

  it('a throwing continuation does not wedge the engine', () => {
    const shell = createShell({ type: 'bash' });
    shell.registerCommand({
      name: 'boom', description: '', usage: 'boom',
      execute(_args: ParsedArgs, ctx: ExecutionContext) {
        return ctx.requestInput!('x: ', false, () => { throw new Error('kaputt'); });
      },
    });
    shell.execute('boom');
    const r = shell.continueInput('egal');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('kaputt');
    expect(shell.hasPendingInput()).toBe(false);
    expect(shell.execute('echo ok').output).toBe('ok');
  });

  it('continueInput without a pending continuation fails gracefully', () => {
    const shell = createShell({ type: 'bash' });
    const r = shell.continueInput('nichts');
    expect(r.exitCode).toBe(1);
    expect(shell.hasPendingInput()).toBe(false);
  });
});
