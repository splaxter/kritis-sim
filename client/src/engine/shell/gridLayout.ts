// client/src/engine/shell/gridLayout.ts
// GNU-ls-style grid: uniform column width, fill top-to-bottom then left-to-
// right. Width math uses the *visible* length so colored entries align.

const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function visibleLength(s: string): number {
  return s.replace(ANSI_RE, '').length;
}

export function formatGrid(items: string[], width: number = 80): string[] {
  if (items.length === 0) return [];

  const colWidth = Math.max(...items.map(visibleLength)) + 2;
  const cols = Math.max(1, Math.floor(width / colWidth));
  const rows = Math.ceil(items.length / cols);

  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const index = col * rows + row;
      if (index >= items.length) break;
      const item = items[index];
      line += item + ' '.repeat(colWidth - visibleLength(item));
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines;
}
