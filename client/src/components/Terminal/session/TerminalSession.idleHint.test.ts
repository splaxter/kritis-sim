import { describe, it, expect, vi } from 'vitest';
import { TerminalContext } from '@kritis/shared';
import { TerminalSession } from './TerminalSession';
import { createShellFromContext } from '../../../engine/shell';

/**
 * Der Leerlauf-Hinweis darf keinen Fortschritt behaupten.
 *
 * Playtest-Befund: Die Hinweise eines Tutorials sind SCHRITTE und reden so
 * („Super! Jetzt `ls` …"). Der Index folgte aber der Uhr — nach acht Sekunden
 * Pause kam der naechste, egal was der Spieler getan hatte. Wer `pwd`
 * wiederholte, bekam „Super! Jetzt `ls`" zu lesen.
 */

const HINTS = [
  'Schritt 1: tippe `pwd`.',
  'Super! Jetzt `ls`.',
  'Und nun `cd Dokumente`.',
];

const context: TerminalContext = {
  type: 'linux',
  hostname: 'warm-pc-admin',
  username: 'admin',
  currentPath: '~',
  commands: [
    { pattern: 'pwd', output: '/home/admin', teachesCommand: 'pwd' },
    { pattern: 'ls', output: 'Dokumente', teachesCommand: 'ls' },
    { pattern: 'cd Dokumente', output: '', teachesCommand: 'cd' },
  ],
  solutions: [
    {
      commands: ['pwd', 'ls', 'cd'],
      allRequired: true,
      resultText: 'Geschafft.',
      skillGain: {},
      effects: {},
    },
  ],
  hints: HINTS,
};

function session() {
  return new TerminalSession({
    shell: createShellFromContext(context),
    context,
    gameMode: 'beginner',
    onSolved: vi.fn(),
    onFlagsSet: vi.fn(),
  });
}

/** Den Hinweistext aus den Effekten eines handleIdleHint()-Aufrufs ziehen. */
function idleHint(s: TerminalSession): string | null {
  const effekte = s.handleIdleHint();
  const zeile = effekte.find(
    (e) => e.type === 'writeLine' && typeof e.text === 'string' && e.text.includes('💡')
  ) as { text: string } | undefined;
  return zeile ? zeile.text.replace(/\x1b\[[0-9;]*m/g, '').replace('💡 ', '') : null;
}

/** Einen Befehl wirklich ausfuehren (inkl. Enter). */
function tippe(s: TerminalSession, cmd: string) {
  s.handleData(cmd);
  s.handleData('\r');
}

describe('handleIdleHint — folgt dem Fortschritt, nicht der Uhr', () => {
  it('zeigt zuerst den ersten Schritt', () => {
    expect(idleHint(session())).toBe(HINTS[0]);
  });

  /** DER Playtest-Befund. */
  it('wiederholt den Schritt, solange nichts Neues geschafft ist', () => {
    const s = session();
    expect(idleHint(s)).toBe(HINTS[0]);
    tippe(s, 'pwd');
    tippe(s, 'pwd'); // dasselbe nochmal — kein neuer Schritt
    expect(idleHint(s), 'nach einer Wiederholung darf kein neuer Schritt kommen').toBe(HINTS[1]);
    // pwd IST erledigt, also ist Schritt 2 ehrlich. Aber weiter geht es nicht:
    expect(idleHint(s), 'Schritt 3 waere eine Behauptung ueber ls').toBe(HINTS[1]);
    expect(idleHint(s)).toBe(HINTS[1]);
  });

  it('geht erst weiter, wenn der Schritt wirklich erledigt ist', () => {
    const s = session();
    idleHint(s);
    tippe(s, 'pwd');
    expect(idleHint(s)).toBe(HINTS[1]);
    tippe(s, 'ls');
    expect(idleHint(s)).toBe(HINTS[2]);
  });

  it('ohne jeden Befehl laeuft die Liste nicht im Leerlauf durch', () => {
    const s = session();
    expect(idleHint(s)).toBe(HINTS[0]);
    expect(idleHint(s)).toBe(HINTS[0]);
    expect(idleHint(s)).toBe(HINTS[0]);
  });

  /**
   * Die Restanzeige („Hinweis (N uebrig)") darf durch Wiederholungen nicht
   * schrumpfen — sonst verbraucht Warten die Hilfe, die man noch nicht hatte.
   */
  it('eine Wiederholung verbraucht keinen Hinweis', () => {
    const s = session();
    idleHint(s);
    expect(s.getSnapshot().hintsUsed).toBe(1);
    idleHint(s);
    idleHint(s);
    expect(s.getSnapshot().hintsUsed, 'Warten hat Hinweise aufgebraucht').toBe(1);
  });

  it('ist die Liste erschoepft, kommt nichts mehr', () => {
    const s = session();
    idleHint(s);
    tippe(s, 'pwd');
    idleHint(s);
    tippe(s, 'ls');
    idleHint(s);
    tippe(s, 'cd Dokumente');
    expect(idleHint(s)).toBeNull();
  });
});
