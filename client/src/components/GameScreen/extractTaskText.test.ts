import { describe, it, expect } from 'vitest';
import { extractTaskText } from './extractTaskText';

describe('extractTaskText', () => {
  it('returns undefined when there is no task block', () => {
    expect(extractTaskText(undefined)).toBeUndefined();
    expect(extractTaskText('Just some flavour text, no task.')).toBeUndefined();
  });

  it('pulls the "Deine Aufgabe" block and strips markdown', () => {
    const md = [
      'Der Eindringling war hier.',
      '',
      '**Deine Aufgabe:**',
      '- `grep "ALERT" syslog` — Finde alle Alarme',
      '- `grep -c "ERROR" syslog` — Zähle die Fehler',
    ].join('\n');
    const task = extractTaskText(md)!;
    expect(task).toContain('grep "ALERT" syslog — Finde alle Alarme');
    expect(task).not.toContain('`');
    expect(task).not.toContain('**');
  });

  it('stops at the next bold heading', () => {
    const md = [
      '**Deine Aufgabe:**',
      'Finde die IP.',
      '',
      '**Belohnung:**',
      'Ruhm und Ehre.',
    ].join('\n');
    const task = extractTaskText(md)!;
    expect(task).toContain('Finde die IP.');
    expect(task).not.toContain('Belohnung');
    expect(task).not.toContain('Ruhm und Ehre');
  });

  it('stops at a following code fence', () => {
    const md = ['**Deine Aufgabe:**', 'Zähle die Fehler.', '', '```', 'output', '```'].join('\n');
    const task = extractTaskText(md)!;
    expect(task).toBe('Zähle die Fehler.');
  });
});
