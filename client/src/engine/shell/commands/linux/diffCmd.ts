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

const NO_EOL = '\\ No newline at end of file';

/** Split into lines plus a flag for a missing final newline. A single trailing
 *  newline is a terminator ("a\nb\n" → two lines); its ABSENCE ("a\nb") is a
 *  real difference from the terminated form, reported with `\ No newline at end
 *  of file` like GNU diff. Empty file → no lines. */
function splitFile(content: string): { lines: string[]; noEol: boolean } {
  if (content.length === 0) return { lines: [], noEol: false };
  const noEol = !content.endsWith('\n');
  const body = noEol ? content : content.slice(0, -1);
  return { lines: body.split('\n'), noEol };
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

/** Render the edit script as GNU normal-format hunks. `noEolA`/`noEolB` append
 *  the "\ No newline at end of file" marker after a printed final line whose
 *  file lacks a terminating newline. */
function formatNormalDiff(
  a: string[], b: string[], noEolA: boolean, noEolB: boolean,
): string {
  const ops = lcsDiff(a, b);
  const out: string[] = [];
  // Emit a `<` (file1) or `>` (file2) line, tagging the file's unterminated
  // final line with the no-newline marker.
  const pushDel = (lineNo: number, text: string) => {
    out.push(`< ${text}`);
    if (noEolA && lineNo === a.length) out.push(NO_EOL);
  };
  const pushAdd = (lineNo: number, text: string) => {
    out.push(`> ${text}`);
    if (noEolB && lineNo === b.length) out.push(NO_EOL);
  };
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
      dels.forEach((l, i) => pushDel(aStart + 1 + i, l));
      out.push('---');
      adds.forEach((l, i) => pushAdd(bStart + 1 + i, l));
    } else if (dels.length > 0) {
      out.push(`${aRange}d${bStart}`);
      dels.forEach((l, i) => pushDel(aStart + 1 + i, l));
    } else {
      out.push(`${aStart}a${bRange}`);
      adds.forEach((l, i) => pushAdd(bStart + 1 + i, l));
    }
  }

  // Content is identical but exactly one file lacks a final newline → GNU still
  // reports the last line as changed, with the marker on the unterminated side.
  if (out.length === 0 && noEolA !== noEolB && a.length > 0 && a.length === b.length) {
    const n = a.length;
    out.push(`${n}c${n}`);
    pushDel(n, a[n - 1]);
    out.push('---');
    pushAdd(n, b[n - 1]);
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
      const missing = args.positional.length === 1 ? 'diff: missing operand after operand' : 'diff: missing operand';
      return { output: '', exitCode: 2, error: missing };
    }
    if (args.positional.length > 2) {
      return { output: '', exitCode: 2, error: `diff: extra operand '${args.positional[2]}'` };
    }
    const [p1, p2] = args.positional;

    // Read each operand; a directory or unreadable path is "trouble" (exit 2),
    // distinguished the way GNU diff distinguishes them.
    const read = (path: string): { value: string } | { error: string } => {
      if (ctx.vfs.isDirectory(path)) return { error: `diff: ${path}: Is a directory` };
      const r = ctx.vfs.readFile(path);
      if (!r.ok) return { error: `diff: ${path}: No such file or directory` };
      return { value: r.value };
    };
    const r1 = read(p1);
    if ('error' in r1) return { output: '', exitCode: 2, error: r1.error };
    const r2 = read(p2);
    if ('error' in r2) return { output: '', exitCode: 2, error: r2.error };

    const f1 = splitFile(r1.value);
    const f2 = splitFile(r2.value);
    const body = formatNormalDiff(f1.lines, f2.lines, f1.noEol, f2.noEol);
    return { output: body, exitCode: body.length > 0 ? 1 : 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};
