import { describe, it, expect } from 'vitest';
import { GuiSolution } from '@kritis/shared';
import { isGuiSolutionMet, findMetGuiSolution } from './guiSolution';

const sol = (over: Partial<GuiSolution>): GuiSolution => ({
  interactions: [],
  allRequired: true,
  resultText: 'ok',
  skillGain: {},
  ...over,
});

describe('isGuiSolutionMet', () => {
  it('matches a single required interaction (allRequired)', () => {
    const s = sol({ interactions: ['endtask:suspicious.exe'], allRequired: true });
    expect(isGuiSolutionMet(s, ['endtask:suspicious.exe'])).toBe(true);
    expect(isGuiSolutionMet(s, ['endtask:svchost.exe'])).toBe(false);
    expect(isGuiSolutionMet(s, [])).toBe(false);
  });

  it('requires every interaction when allRequired and unordered', () => {
    const s = sol({ interactions: ['select:a', 'endtask:a'], allRequired: true });
    expect(isGuiSolutionMet(s, ['endtask:a', 'select:a'])).toBe(true); // order irrelevant
    expect(isGuiSolutionMet(s, ['select:a'])).toBe(false);
  });

  it('accepts any interaction when allRequired is false', () => {
    const s = sol({ interactions: ['answer:uac:no', 'close:window'], allRequired: false });
    expect(isGuiSolutionMet(s, ['close:window'])).toBe(true);
    expect(isGuiSolutionMet(s, ['something:else'])).toBe(false);
  });

  it('enforces order as a subsequence when ordered', () => {
    const s = sol({ interactions: ['select:bad', 'endtask:bad'], allRequired: true, ordered: true });
    expect(isGuiSolutionMet(s, ['select:bad', 'endtask:bad'])).toBe(true);
    // changing selection first is fine — still an ordered subsequence
    expect(isGuiSolutionMet(s, ['select:good', 'select:bad', 'endtask:bad'])).toBe(true);
    // wrong order fails
    expect(isGuiSolutionMet(s, ['endtask:bad', 'select:bad'])).toBe(false);
  });

  it('returns false for an empty interaction list', () => {
    expect(isGuiSolutionMet(sol({ interactions: [] }), ['anything'])).toBe(false);
  });
});

describe('findMetGuiSolution', () => {
  it('returns the first satisfied solution', () => {
    const win = sol({ interactions: ['endtask:bad'], resultText: 'win' });
    const fail = sol({ interactions: ['endtask:good'], resultText: 'fail' });
    expect(findMetGuiSolution([win, fail], ['endtask:bad'])?.resultText).toBe('win');
    expect(findMetGuiSolution([win, fail], ['nothing'])).toBeNull();
  });
});
