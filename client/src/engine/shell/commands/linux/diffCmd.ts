/**
 * diff — compare two files line by line (GNU "normal" format).
 *
 * A real, general-purpose tool (not a level-specific gimmick): the output is
 * the classic `NcM` / `NaM` / `NdM` hunk format with `<` (file1) and `>`
 * (file2) lines. Exit codes follow diff(1): 0 = identical, 1 = differences,
 * 2 = trouble (missing operand / unreadable file). Unified format (-u) is not
 * implemented in v1.
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, CompletionContext, Completion } from '../../types';

type Op = { type: 'eq' | 'del' | 'add'; line: string };

/** Split into lines, treating a single trailing newline as a terminator (so
 *  "a\nb\n" is two lines, matching how diff counts). Empty file → no lines. */
function toLines(content: string): string[] {
  if (content.length === 0) return [];
  return content.replace(/\n$/, '').split('\n');
}

/** Longest-common-subsequence edit script between two line arrays. */
function lcsDiff(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'eq', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: a[i] }); i++; }
    else { ops.push({ type: 'add', line: b[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'del', line: a[i] }); i++; }
  while (j < m) { ops.push({ type: 'add', line: b[j] }); j++; }
  return ops;
}

/** `n` or `n,m` — a normal-format line range. */
function range(start: number, end: number): string {
  return start === end ? `${start}` : `${start},${end}`;
}

/** Render the edit script as GNU normal-format hunks. */
function formatNormalDiff(a: string[], b: string[]): string {
  const ops = lcsDiff(a, b);
  const out: string[] = [];
  let aConsumed = 0;
  let bConsumed = 0;
  let k = 0;
  while (k < ops.length) {
    if (ops[k].type === 'eq') { aConsumed++; bConsumed++; k++; continue; }
    const dels: string[] = [];
    const adds: string[] = [];
    const aStart = aConsumed;
    const bStart = bConsumed;
    while (k < ops.length && ops[k].type !== 'eq') {
      if (ops[k].type === 'del') { dels.push(ops[k].line); aConsumed++; }
      else { adds.push(ops[k].line); bConsumed++; }
      k++;
    }
    const aRange = range(aStart + 1, aStart + dels.length);
    const bRange = range(bStart + 1, bStart + adds.length);
    if (dels.length > 0 && adds.length > 0) {
      out.push(`${aRange}c${bRange}`);
      for (const l of dels) out.push(`< ${l}`);
      out.push('---');
      for (const l of adds) out.push(`> ${l}`);
    } else if (dels.length > 0) {
      out.push(`${aRange}d${bStart}`);
      for (const l of dels) out.push(`< ${l}`);
    } else {
      out.push(`${aStart}a${bRange}`);
      for (const l of adds) out.push(`> ${l}`);
    }
  }
  return out.join('\n');
}

export const diffCommand: ShellCommand = {
  name: 'diff',
  description: 'Compare files line by line',
  usage: 'diff FILE1 FILE2',
  options: [
    { short: 'u', long: 'unified', description: 'Output unified format (not implemented; normal format is used)' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length < 2) {
      return { output: '', exitCode: 2, error: 'diff: missing operand' };
    }
    const [p1, p2] = args.positional;
    const r1 = ctx.vfs.readFile(p1);
    if (!r1.ok) {
      return { output: '', exitCode: 2, error: `diff: ${p1}: No such file or directory` };
    }
    const r2 = ctx.vfs.readFile(p2);
    if (!r2.ok) {
      return { output: '', exitCode: 2, error: `diff: ${p2}: No such file or directory` };
    }

    const body = formatNormalDiff(toLines(r1.value), toLines(r2.value));
    return { output: body, exitCode: body.length > 0 ? 1 : 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};
