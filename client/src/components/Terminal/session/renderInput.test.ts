// client/src/components/Terminal/session/renderInput.test.ts
import { describe, it, expect } from 'vitest';
import { renderInput } from './renderInput';

describe('renderInput', () => {
  it('redraws prompt + line with cursor at end (no reposition escape)', () => {
    const out = renderInput({ prompt: 'timo@ws:~$ ', line: 'ls -la', cursor: 6 });
    expect(out).toContain('timo@ws:~$ ls -la');
    // cursor at end → no explicit column-move escape at the tail
    expect(out).not.toMatch(/\x1b\[\d+G$/);
  });

  it('positions the cursor mid-line via a 1-based column escape', () => {
    const prompt = 'timo@ws:~$ ';
    const out = renderInput({ prompt, line: 'ls -la', cursor: 3 });
    // column is 1-based: prompt.length + cursor + 1
    expect(out).toContain(`\x1b[${prompt.length + 3 + 1}G`);
  });

  it('clears the previous line content before redrawing', () => {
    const out = renderInput({ prompt: '$ ', line: '', cursor: 0 });
    expect(out).toContain('\x1b[K'); // erase-to-end so stale chars are gone
  });

  it('handles cursor at position 0 on a non-empty line', () => {
    const prompt = '$ ';
    const out = renderInput({ prompt, line: 'abc', cursor: 0 });
    expect(out).toContain('$ abc');
    expect(out).toContain(`\x1b[${prompt.length + 0 + 1}G`);
  });
});
