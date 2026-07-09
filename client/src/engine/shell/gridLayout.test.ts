import { describe, it, expect } from 'vitest';
import { formatGrid } from './gridLayout';

describe('formatGrid', () => {
  it('lays items into width-fitted columns, filling top-to-bottom like GNU ls', () => {
    // colW = 5+2 = 7 → 3 cols at width 21 → 2 rows, vertical fill
    const lines = formatGrid(['aaaaa', 'b', 'cc', 'ddd', 'e'], 21);
    expect(lines).toEqual([
      'aaaaa  cc     e',
      'b      ddd',
    ]);
  });

  it('falls back to one column when the terminal is narrower than the widest item', () => {
    expect(formatGrid(['file-with-a-long-name.log', 'a'], 10))
      .toEqual(['file-with-a-long-name.log', 'a']);
  });

  it('pads by visible length, ignoring ANSI color codes', () => {
    const blue = '\x1b[34m\x1b[1mdir\x1b[0m';
    const lines = formatGrid([blue, 'file1', 'file2'], 80);
    // one row; the colored entry still gets exactly (maxLen+2 - 3) spaces after it
    expect(lines).toHaveLength(1);
    expect(lines[0].replace(/\x1b\[[0-9;]*m/g, '')).toBe('dir    file1  file2');
  });

  it('returns [] for no items', () => {
    expect(formatGrid([], 80)).toEqual([]);
  });
});
