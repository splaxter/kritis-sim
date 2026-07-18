/**
 * Minimal YAML parser for the exact playbook subset our levels use:
 * a top-level list of plays (name/hosts/become/tasks), each task a name plus
 * exactly one module key whose value is a nested map of scalar params.
 * 2-space indentation, quoted or bare scalars, # comments, optional ---.
 */

export interface MiniTask {
  name: string;
  module: string;
  params: Record<string, string | boolean>;
}

export interface MiniPlay {
  name: string;
  hosts: string;
  become: boolean;
  tasks: MiniTask[];
}

export type MiniYamlResult =
  | { ok: true; plays: MiniPlay[] }
  | { ok: false; error: string; line: number };

interface Line {
  no: number; // 1-based line number in the source
  indent: number;
  isListItem: boolean;
  key: string;
  /** undefined for `key:` introducing a nested block */
  value: string | boolean | undefined;
}

type MiniYamlError = Extract<MiniYamlResult, { ok: false }>;

function syntaxError(no: number, column: number, reason: string): MiniYamlError {
  return {
    ok: false,
    line: no,
    error: `ERROR! Syntax Error while loading YAML.\n  ${reason}\n  line ${no}, column ${column}`,
  };
}

function semanticError(no: number, message: string): MiniYamlError {
  return { ok: false, line: no, error: `ERROR! ${message}\n  line ${no}` };
}

/** Strip a trailing comment that starts outside quotes. */
function stripComment(raw: string): string {
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    // YAML comments need a space (or line start) before the '#'.
    if (ch === '#' && (i === 0 || raw[i - 1] === ' ')) {
      return raw.slice(0, i);
    }
  }
  return raw;
}

/** Unquote a scalar; booleans only from BARE true/false (quoted stays string). */
function parseScalar(raw: string): string | boolean {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

const KEY_VALUE = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s+(.*\S)\s*)?$/;

/** Tokenize into structured lines, or fail with a positioned syntax error. */
function tokenize(text: string): { ok: true; lines: Line[] } | MiniYamlError {
  const lines: Line[] = [];
  const rawLines = text.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const no = i + 1;
    const stripped = stripComment(rawLines[i]).replace(/\s+$/, '');
    if (!stripped.trim()) continue;
    if (no === 1 || lines.length === 0) {
      if (stripped.trim() === '---') continue; // document marker
    }

    const indent = stripped.length - stripped.trimStart().length;
    if (indent % 2 !== 0) {
      return syntaxError(no, indent + 1, 'found a tab or bad indentation (indent must be a multiple of 2)');
    }
    let body = stripped.trim();
    const isListItem = body.startsWith('- ');
    if (isListItem) body = body.slice(2);

    const m = body.match(KEY_VALUE);
    if (!m) {
      return syntaxError(no, indent + 1, `could not parse '${body}' as a key: value pair`);
    }
    lines.push({
      no,
      // A list item's key sits 2 columns past the dash.
      indent: isListItem ? indent + 2 : indent,
      isListItem,
      key: m[1],
      value: m[2] === undefined ? undefined : parseScalar(m[2]),
    });
  }
  return { ok: true, lines };
}

export function parsePlaybook(text: string): MiniYamlResult {
  const tok = tokenize(text);
  if (!tok.ok) return tok;
  const lines = tok.lines;

  if (lines.length === 0) {
    return { ok: false, line: 1, error: 'ERROR! A playbook must be a list of plays (the file is empty)\n  line 1' };
  }
  if (!lines[0].isListItem || lines[0].indent !== 2) {
    return { ok: false, line: lines[0].no, error: 'ERROR! A playbook must be a list of plays\n  line ' + lines[0].no };
  }

  const plays: MiniPlay[] = [];
  let i = 0;
  while (i < lines.length) {
    const start = lines[i];
    if (!start.isListItem || start.indent !== 2) {
      return syntaxError(start.no, start.indent + 1, 'unexpected indentation (expected a new play at column 1)');
    }
    const playLine = start.no;
    const play: MiniPlay = { name: '', hosts: '', become: false, tasks: [] };
    let sawHosts = false;

    // Play keys live at effective indent 2; the first is on the dash line.
    let first = true;
    while (i < lines.length) {
      const ln = lines[i];
      if (!first && (ln.indent < 2 || (ln.isListItem && ln.indent === 2))) break; // next play
      if (ln.indent > 2) {
        return syntaxError(ln.no, ln.indent + 1, 'unexpected indentation');
      }
      first = false;

      if (ln.key === 'tasks') {
        if (ln.value !== undefined) {
          return syntaxError(ln.no, ln.indent + 1, "'tasks' must introduce a list");
        }
        i++;
        const tasks = parseTasks(lines, () => i, n => { i = n; });
        if ('error' in tasks) return tasks;
        play.tasks = tasks.tasks;
        continue;
      }

      if (ln.value === undefined) {
        return syntaxError(ln.no, ln.indent + 1, `play key '${ln.key}' has no value`);
      }
      if (ln.key === 'name') play.name = String(ln.value);
      else if (ln.key === 'hosts') { play.hosts = String(ln.value); sawHosts = true; }
      else if (ln.key === 'become') play.become = ln.value === true;
      else return semanticError(ln.no, `'${ln.key}' is not a valid attribute for a Play`);
      i++;
    }

    if (!sawHosts) {
      return semanticError(playLine, "the field 'hosts' is required but was not set");
    }
    plays.push(play);
  }

  return { ok: true, plays };
}

function parseTasks(
  lines: Line[],
  getIndex: () => number,
  setIndex: (n: number) => void
): { tasks: MiniTask[] } | MiniYamlError {
  const tasks: MiniTask[] = [];
  let i = getIndex();

  while (i < lines.length) {
    const start = lines[i];
    if (start.indent < 6) break; // end of the tasks list
    if (!start.isListItem || start.indent !== 6) {
      setIndex(i);
      return syntaxError(start.no, start.indent + 1, 'expected a task list item (- name: ...)');
    }
    const taskLine = start.no;
    let name = '';
    const modules: { key: string; params: Record<string, string | boolean> }[] = [];

    let first = true;
    while (i < lines.length) {
      const ln = lines[i];
      if (!first && (ln.indent < 6 || (ln.isListItem && ln.indent === 6))) break; // next task / end
      first = false;
      if (ln.indent !== 6) {
        setIndex(i);
        return syntaxError(ln.no, ln.indent + 1, 'unexpected indentation inside a task');
      }

      if (ln.key === 'name') {
        if (ln.value === undefined) {
          setIndex(i);
          return syntaxError(ln.no, ln.indent + 1, "task 'name' has no value");
        }
        name = String(ln.value);
        i++;
        continue;
      }

      // Any other key is a module: value must be a nested param map.
      if (ln.value !== undefined) {
        setIndex(i);
        return syntaxError(ln.no, ln.indent + 1, `module '${ln.key}' must have an indented param map`);
      }
      i++;
      const params: Record<string, string | boolean> = {};
      while (i < lines.length && lines[i].indent >= 8) {
        const p = lines[i];
        if (p.indent !== 8 || p.isListItem) {
          setIndex(i);
          return syntaxError(p.no, p.indent + 1, 'unexpected indentation in module parameters');
        }
        if (p.value === undefined) {
          setIndex(i);
          return syntaxError(p.no, p.indent + 1, `parameter '${p.key}' has no value`);
        }
        params[p.key] = p.value;
        i++;
      }
      modules.push({ key: ln.key, params });
    }

    if (modules.length === 0) {
      setIndex(i);
      return semanticError(taskLine, 'no module/action detected in task');
    }
    if (modules.length > 1) {
      setIndex(i);
      return semanticError(taskLine, `conflicting action statements: ${modules.map(m => m.key).join(', ')}`);
    }
    tasks.push({ name, module: modules[0].key, params: modules[0].params });
  }

  setIndex(i);
  return { tasks };
}
