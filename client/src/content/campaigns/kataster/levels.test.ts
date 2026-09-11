import { describe, it, expect, vi } from 'vitest';
import { GameEvent, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { katasterStoryEvents } from './events';

const terminalLevels = katasterStoryEvents.filter(
  (e): e is GameEvent & { terminalContext: TerminalContext } => !!e.terminalContext
);

function freshSession(ctx: TerminalContext) {
  const shell = createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    vfsOverlay: ctx.vfsOverlay,
    commands: ctx.commands,
    hints: ctx.hints,
    taskText: ctx.taskText,
  });
  return new TerminalSession({
    shell,
    context: ctx,
    gameMode: 'story',
    onSolved: vi.fn(),
    onFlagsSet: vi.fn(),
  });
}

function readFile(session: TerminalSession, path: string): string {
  for (const ch of `cat ${path}`) session.handleData(ch);
  return session
    .handleData('\r')
    .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
    .map((e) => e.text)
    .join('\n');
}

describe('Kein Level ist gelöst, bevor der Spieler etwas tut', () => {
  /**
   * Der Grund für diesen Guard (beim Bauen von L5 aufgefallen):
   * `seedVfsFromScenario` materialisiert JEDEN Pfad, der in `taskText` oder in
   * einem Hint vorkommt — und füllt ihn mit dem Dateinamen als Inhalt. Ein
   * Level, dessen Artefaktdatei "suche_notfallhandbuch.txt" heisst und dessen
   * stateGoal auf /notfall/ prüft, ist damit gelöst, bevor die Session steht.
   *
   * Die Regel, die daraus folgt und die dieser Test durchsetzt: der Name der
   * ZU SCHREIBENDEN Datei darf nie das enthalten, worauf ihr Inhaltsziel prüft.
   */
  it.each(terminalLevels.map((l) => [l.id, l] as const))(
    '%s startet ungelöst',
    (_id, level) => {
      const session = freshSession(level.terminalContext);
      expect(session.getSnapshot().solved).toBe(false);
    }
  );

  it('kein Inhaltsziel wird vom vorab materialisierten Platzhalter erfüllt', () => {
    for (const level of terminalLevels) {
      const goals = level.terminalContext.solutions.flatMap((s) => s.stateGoals ?? []);
      const contentGoals = goals.filter((g) => g.file && g.matches);
      for (const goal of contentGoals) {
        const session = freshSession(level.terminalContext);
        const seeded = readFile(session, goal.file!);
        // Entweder existiert die Datei noch gar nicht (bester Fall) …
        if (/No such file/.test(seeded)) continue;
        // … oder ihr Platzhalterinhalt darf das Ziel NICHT erfüllen.
        expect(
          new RegExp(goal.matches!).test(seeded),
          `${level.id}: Platzhalter von ${goal.file} erfüllt bereits /${goal.matches}/`
        ).toBe(false);
      }
    }
  });
});

describe('Jedes Level hat beide Hälften — Lernen und Tun', () => {
  it.each(terminalLevels.map((l) => [l.id, l] as const))(
    '%s lehrt etwas (mentorNote) und verlangt ein Artefakt (stateGoals)',
    (_id, level) => {
      expect(level.mentorNote, 'Lern-Hälfte fehlt').toBeTruthy();
      expect(level.mentorNote!.length).toBeGreaterThan(80);

      const goals = level.terminalContext.solutions.flatMap((s) => s.stateGoals ?? []);
      expect(goals.length, 'Tu-Hälfte fehlt').toBeGreaterThan(0);
      // Mindestens ein Ziel prüft eine vom Spieler ERZEUGTE Datei — kein Level
      // endet mit "gelesen".
      expect(
        goals.some((g) => g.file && g.matches),
        'kein Artefakt-Ziel: das Level endet mit Lesen'
      ).toBe(true);
      // … und mindestens eines prüft, dass wirklich gelesen/gesucht wurde.
      expect(
        goals.some((g) => g.fileRead || g.commandRan),
        'kein Lese-/Suchnachweis: das Artefakt waere abschreibbar'
      ).toBe(true);
    }
  );

  it.each(terminalLevels.map((l) => [l.id, l] as const))(
    '%s eskaliert die Hinweise: erst orientieren, zuletzt Syntax',
    (_id, level) => {
      const hints = level.terminalContext.hints;
      expect(hints.length).toBeGreaterThanOrEqual(3);
      expect(hints[0], 'hints[0] verrät bereits ein Kommando').not.toMatch(/`/);
      expect(hints[hints.length - 1], 'der letzte Hinweis nennt keine Syntax').toMatch(/`/);
    }
  );
});
