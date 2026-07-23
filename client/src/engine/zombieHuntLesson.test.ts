import { describe, expect, it } from 'vitest';
import { learningPathEvents } from '../content/events/learning-path';

const lesson = learningPathEvents.find((event) => event.id === 'learn_06_zombie_hunt')!;
const ctx = lesson.terminalContext!;

describe('learning lesson: learn_06_zombie_hunt', () => {
  it('does not diagnose a Cryptominer before process evidence is inspected', () => {
    expect(lesson.description).not.toMatch(/Cryptominer|Bitcoin/i);
    expect(lesson.description).toContain('unbekannter Prozess');
  });

  it('contains concrete process evidence for the later diagnosis', () => {
    const ps = ctx.commands.find((command) => command.pattern === 'ps aux')!;
    expect(ps.output).toContain('malware');
    expect(ps.output).toContain('99.0');
    expect(ps.output).toContain('/tmp/.hidden/miner.sh');
  });

  it('does not claim an unproven cryptocurrency after completion', () => {
    const visibleCompletionText = [
      ...lesson.choices.map((choice) => choice.resultText ?? ''),
      ...ctx.solutions.map((solution) => solution.resultText),
    ].join('\n');

    expect(visibleCompletionText).not.toMatch(/Bitcoin/i);
  });
});
