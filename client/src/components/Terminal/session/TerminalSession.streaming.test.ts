import { describe, it, expect, vi } from 'vitest';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalContext, GameModeId } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { TerminalEffect } from './effects';

const baseCtx: TerminalContext = {
  type: 'linux', hostname: 'ws-admin', username: 'timo',
  currentPath: '/home/timo', hints: [], commands: [], solutions: [],
};

function makeSession(overrides: Partial<TerminalContext> = {}, gameMode: GameModeId = 'intermediate') {
  const context = { ...baseCtx, ...overrides };
  const shell = createShellFromContext({
    type: context.type, hostname: context.hostname, username: context.username,
    currentPath: context.currentPath, commands: context.commands,
    hints: context.hints, taskText: context.taskText, hosts: context.hosts,
  });
  const onSolved = vi.fn();
  const session = new TerminalSession({ shell, context, gameMode, onSolved, onFlagsSet: () => {} });
  return { session, shell, onSolved };
}

// Collect the text of every writeLine effect in order.
const lines = (fx: TerminalEffect[]) =>
  fx.filter((e): e is Extract<TerminalEffect, { type: 'writeLine' }> => e.type === 'writeLine').map(e => e.text);

const drips = (fx: TerminalEffect[]) =>
  fx.filter((e): e is Extract<TerminalEffect, { type: 'scheduleDrip' }> => e.type === 'scheduleDrip');

const renders = (fx: TerminalEffect[]) =>
  fx.filter((e): e is Extract<TerminalEffect, { type: 'renderInput' }> => e.type === 'renderInput');

// Type each character in `s` one at a time; the returned list is the Enter result.
function typeAndEnter(session: TerminalSession, s: string): TerminalEffect[] {
  for (const ch of s) session.handleData(ch);
  return session.handleData('\r');
}

const PING_OUTPUT =
  'PING 10.0.0.9\n' +
  '64 bytes from 10.0.0.9: icmp_seq=1\n' +
  '64 bytes from 10.0.0.9: icmp_seq=2\n' +
  '64 bytes from 10.0.0.9: icmp_seq=3\n' +
  '--- statistics ---';

describe('TerminalSession streaming (drip pacing)', () => {
  it('ping output paces EVERY reply line 450ms, first reply on the first tick', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'ping -c 3 10.0.0.9', teachesCommand: 'ping', output: PING_OUTPUT }],
      solutions: [],
    });

    // Initial Enter: ONLY the leading header + a scheduleDrip. The first reply is
    // delayed 450ms too (matches the original setTimeout stepping), so it must
    // NOT appear in the initial return.
    const fx0 = typeAndEnter(session, 'ping -c 3 10.0.0.9');
    expect(lines(fx0)).toContain('PING 10.0.0.9');
    expect(lines(fx0)).not.toContain('64 bytes from 10.0.0.9: icmp_seq=1');
    expect(lines(fx0)).not.toContain('--- statistics ---');
    expect(drips(fx0)).toEqual([{ type: 'scheduleDrip', delayMs: 450 }]);

    // tick 1: the FIRST reply line + another scheduleDrip.
    const fx1 = session.tick('drip');
    expect(lines(fx1)).toContain('64 bytes from 10.0.0.9: icmp_seq=1');
    expect(lines(fx1)).not.toContain('64 bytes from 10.0.0.9: icmp_seq=2');
    expect(drips(fx1)).toEqual([{ type: 'scheduleDrip', delayMs: 450 }]);

    // tick 2: the SECOND reply line + another scheduleDrip.
    const fx2 = session.tick('drip');
    expect(lines(fx2)).toContain('64 bytes from 10.0.0.9: icmp_seq=2');
    expect(lines(fx2)).not.toContain('64 bytes from 10.0.0.9: icmp_seq=3');
    expect(drips(fx2)).toEqual([{ type: 'scheduleDrip', delayMs: 450 }]);

    // tick 3: LAST reply line + the trailing non-reply line, NO further drip,
    // then a fresh prompt (renderInput) since this isn't a solution.
    const fx3 = session.tick('drip');
    expect(lines(fx3)).toContain('64 bytes from 10.0.0.9: icmp_seq=3');
    expect(lines(fx3)).toContain('--- statistics ---');
    expect(drips(fx3)).toEqual([]);
    expect(renders(fx3).length).toBeGreaterThan(0);

    // Streaming is over: a further tick is a no-op.
    expect(session.tick('drip')).toEqual([]);
  });

  it('gibt waehrend des Streamens kein Echo, verwirft die Eingabe aber nicht', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'ping -c 3 10.0.0.9', teachesCommand: 'ping', output: PING_OUTPUT }],
      solutions: [],
    });
    typeAndEnter(session, 'ping -c 3 10.0.0.9'); // enters streaming mode
    // Kein Echo mitten in der Ausgabe — die soll nicht durchsetzt werden …
    expect(session.handleData('x')).toEqual([]);
    expect(session.getSnapshot().commandsUsed).toEqual(['ping -c 3 10.0.0.9']);
    // … aber das Zeichen ist nicht weg: Beim Leerlaufen wird es nachgeholt und
    // erscheint dann in der Eingabezeile.
    session.tick('drip');
    session.tick('drip');
    const beimLeerlaufen = session.tick('drip');
    // Das Echo laeuft ueber `renderInput` (die Eingabezeile), nicht ueber
    // `write` — deshalb wird hier die Zeile geprueft, nicht die Ausgabe.
    expect(
      beimLeerlaufen.filter((e) => e.type === 'renderInput').map((e) => (e as { line: string }).line),
      'das mitgetippte Zeichen steht nachher in der Eingabezeile'
    ).toContain('x');
    expect(session.tick('drip')).toEqual([]);
  });

  it('non-ping output is emitted instantly without streaming', () => {
    const { session } = makeSession({
      commands: [{ pattern: 'echo hi', output: 'hi\nthere' }],
      solutions: [],
    });
    const fx = typeAndEnter(session, 'echo hi');
    expect(lines(fx)).toContain('hi');
    expect(lines(fx)).toContain('there');
    expect(drips(fx)).toEqual([]);
    // Fresh prompt right away; no streaming state left behind.
    expect(renders(fx).length).toBeGreaterThan(0);
    expect(session.tick('drip')).toEqual([]);
  });

  it('solved guard: Enter fires onSolved once and clears solved', () => {
    const { session, onSolved } = makeSession({
      commands: [{ pattern: 'fix-it', output: 'behoben', isSolution: true, skillGain: { linux: 2 } }],
      solutions: [],
    });
    // isSolution with non-ping output solves synchronously via the fast path.
    typeAndEnter(session, 'fix-it');
    expect(session.getSnapshot().solved).toBe(true);

    // Enter confirms: onSolved fires with (skillGain, undefined, effects).
    const fx = session.handleData('\r');
    expect(fx).toEqual([]);
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ linux: 2 }, undefined, {}, expect.anything());
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('solved guard: non-Enter keystrokes are swallowed and do not fire onSolved', () => {
    const { session, onSolved } = makeSession({
      commands: [{ pattern: 'fix-it', output: 'behoben', isSolution: true, skillGain: { linux: 2 } }],
      solutions: [],
    });
    typeAndEnter(session, 'fix-it');
    expect(session.getSnapshot().solved).toBe(true);

    expect(session.handleData('a')).toEqual([]);
    expect(onSolved).not.toHaveBeenCalled();
    expect(session.getSnapshot().solved).toBe(true);
  });
});

describe('Tippen waehrend gestreamter Ausgabe', () => {
  /**
   * Beim Probespielen gefunden: Der Waechter im Kopf von `handleData` hat
   * Tastendruecke waehrend des Tropfens VERWORFEN — lautlos. Wer waehrend
   * eines `ping` seinen naechsten Befehl tippte, sah weder Echo noch Meldung,
   * und die Zeile war weg. Die Absicht (die Ausgabe nicht durchsetzen) war
   * richtig, die Dosierung nicht: Ein echtes Terminal puffert.
   */
  const tippe = (session: TerminalSession, text: string): TerminalEffect[] =>
    [...text].flatMap((z) => session.handleData(z));

  /** Alle Tropfen abarbeiten, wie es die Oberflaeche tut. */
  function ausstreamen(session: TerminalSession, effekte: TerminalEffect[]): TerminalEffect[] {
    const alle = [...effekte];
    let offen = effekte.some((e) => e.type === 'scheduleDrip');
    for (let i = 0; offen && i < 40; i++) {
      const weitere = session.tick('drip');
      alle.push(...weitere);
      offen = weitere.some((e) => e.type === 'scheduleDrip');
    }
    return alle;
  }

  it('haelt die Eingabe fest und spielt sie nach, statt sie zu verwerfen', () => {
    const { session } = makeSession();
    // Eine ADRESSE, kein Name: Seit das Netzbild echt ist, laeuft ein Name,
    // den kein Resolver kennt, nicht mehr in vier Zeitueberschreitungen,
    // sondern bricht sofort ab („Name or service not known") — wie echtes
    // ping. Gebraucht wird hier aber eine Ausgabe, die wirklich tropft.
    tippe(session, 'ping 10.0.0.1');
    const start = session.handleData('\r');
    expect(start.some((e) => e.type === 'scheduleDrip'), 'ping streamt').toBe(true);

    // Mitten in die Ausgabe tippen — vorher ging genau das verloren.
    expect(tippe(session, 'whoami'), 'waehrend des Tropfens kein Echo').toEqual([]);
    expect(session.handleData('\r'), 'auch das Enter wird gepuffert').toEqual([]);
    // Die Ausgabe zu Ende tropfen lassen; dabei wird nachgeholt.
    const nachher = ausstreamen(session, start);

    // Die Eingabezeile wurde nachgetippt …
    expect(
      nachher.filter((e) => e.type === 'renderInput').map((e) => (e as { line: string }).line),
      'der gepufferte Befehl erscheint in der Eingabezeile'
    ).toContain('whoami');
    // … und das mitgepufferte Enter hat ihn auch ausgefuehrt.
    const geschrieben = nachher.filter((e) => e.type === 'writeLine')
      .map((e) => (e as { text: string }).text).join('\n');
    expect(geschrieben, 'seine Ausgabe steht auf dem Schirm').toContain('timo');
  });

  it('der Puffer laeuft nicht unbegrenzt voll', () => {
    const { session } = makeSession();
    tippe(session, 'ping 10.0.0.1');
    session.handleData('\r');
    tippe(session, 'x'.repeat(2000));
    const nachher = ausstreamen(session, [{ type: 'scheduleDrip', delayMs: 0 } as TerminalEffect]);
    const zeilen = nachher.filter((e) => e.type === 'renderInput').map((e) => (e as { line: string }).line);
    const laengste = zeilen.reduce((m, z) => Math.max(m, z.length), 0);
    expect(laengste, 'gedeckelt statt unbegrenzt').toBeLessThanOrEqual(512);
    expect(laengste, 'aber es wurde wirklich gepuffert').toBeGreaterThan(100);
  });
});
