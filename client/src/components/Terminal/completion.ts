/**
 * Pure tab-completion logic, extracted from the terminal hook so it can be
 * unit-tested independently of xterm. The hook handles rendering/cycling; this
 * module decides WHAT the completions are and HOW a chosen one edits the line.
 */

import { Completion, ShellEngine } from '../../engine/shell';

/**
 * Trailing text after a completion. A directory value already ends in '/', so
 * it gets no space (you keep typing the subpath); everything else gets a space
 * so the next argument starts cleanly.
 */
export function suffixFor(c: Completion): string {
  return c.type === 'directory' ? '' : ' ';
}

/**
 * Replace the whitespace-delimited token that ends at the cursor with the
 * chosen completion. Swapping the whole token (rather than appending a sliced
 * suffix) makes it correct when the completion's case differs from what was
 * typed (`get-c` → `Get-Content`, `CL` → `clear`) and for subdirectory paths
 * (`logs/ap` → `logs/app.log`).
 */
export function applyCompletionToLine(
  line: string,
  cursor: number,
  completion: Completion,
  addSuffix = true
): { line: string; cursor: number } {
  const before = line.slice(0, cursor);
  const after = line.slice(cursor);
  const lastTok = before.match(/(\S*)$/)?.[1] ?? '';
  const head = before.slice(0, before.length - lastTok.length);
  const newBefore = head + completion.value + (addSuffix ? suffixFor(completion) : '');
  return { line: newBefore + after, cursor: newBefore.length };
}

/** The token (trailing non-space run) that a Tab press would complete. */
export function tokenUnderCursor(line: string, cursor: number): string {
  return line.slice(0, cursor).match(/(\S*)$/)?.[1] ?? '';
}

/**
 * Longest common prefix of the completion values — what bash fills in on the
 * first Tab when several options share a lead (e.g. `Get-Ch…`/`Get-Co…` → `Get-C`).
 */
export function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (const s of strings) {
    while (!s.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

/**
 * Gather, merge, de-duplicate and sort completions for the token under the
 * cursor. Combines the shell engine's completions with scenario command names
 * (which only apply to the first token — the command name).
 */
export function gatherCompletions(
  shell: ShellEngine | null,
  availableCommands: string[],
  line: string,
  cursor: number
): Completion[] {
  const shellCompletions = shell?.complete(line, cursor) ?? [];

  const before = line.slice(0, cursor);
  const isFirstToken = !before.trimStart().includes(' ');
  const currentTok = before.match(/(\S*)$/)?.[1] ?? '';

  const scenarioMatches = isFirstToken
    ? availableCommands.filter(cmd => cmd.toLowerCase().startsWith(currentTok.toLowerCase()))
    : [];

  const map = new Map<string, Completion>();
  for (const c of shellCompletions) map.set(c.value, c);
  for (const cmd of scenarioMatches) {
    if (!map.has(cmd)) {
      map.set(cmd, { value: cmd, display: cmd, type: 'command', description: 'Szenario-Befehl' });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
}
