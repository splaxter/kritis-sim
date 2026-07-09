// client/src/engine/shell/scenarioSeed.ts
// Materializes the paths a level *talks about* into the VFS so free
// exploration confirms the story instead of contradicting it. Canned
// scenario output stays authoritative for scripted commands; everything
// seeded here is a consistent superset underneath. Seeding never overwrites
// existing nodes, so base fs, templates and explicit overlays always win.

export interface SeedPath {
  path: string;
  kind: 'file' | 'dir' | 'listing';
  /** Verbatim file content (exact single-command cat only). */
  content?: string;
  /** Canned ls output to parse into directory entries (kind: 'listing'). */
  output?: string;
}

// Commands whose canned output IS the file content (single-stage only).
const CAT_COMMANDS = new Set(['cat', 'less', 'more', 'head', 'tail', 'type', 'get-content', 'gc']);
// Commands whose canned output is a directory listing.
const LS_COMMANDS = new Set(['ls', 'dir', 'get-childitem', 'gci']);
// Commands whose positional args are directories.
const DIR_ARG_COMMANDS = new Set(['cd', 'set-location', 'sl', 'pushd', 'tree', 'find', 'du']);
// Commands whose positional args include files (beyond the cat set).
const FILE_ARG_COMMANDS = new Set([
  'grep', 'egrep', 'zgrep', 'wc', 'sort', 'uniq', 'awk', 'sed', 'stat', 'file',
  'chmod', 'chown', 'rm', 'cp', 'mv', 'ln', 'tar', 'unzip', 'gzip', 'gunzip',
  'sha256sum', 'md5sum', 'openssl', 'select-string',
]);
// First positional is a pattern/expression, not a file.
const SKIP_FIRST_ARG = new Set(['grep', 'egrep', 'zgrep', 'awk', 'sed', 'select-string']);

const looksLikePath = (token: string): boolean =>
  token.includes('/') || /^[A-Za-z]:\\/.test(token) || /\.[A-Za-z0-9]{1,4}$/.test(token);

const isDirLike = (path: string): boolean => {
  const base = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || '';
  return base.indexOf('.') <= 0; // 'logs' → dir, '.ssh' → dir, 'x.log' → file
};

const stripQuotes = (s: string): string => s.replace(/^['"]|['"]$/g, '');

export function stripCoachingComments(output: string): string {
  const lines = output.split('\n');
  let blank = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '') { blank = i; break; }
    if (!lines[i].trimStart().startsWith('#')) return output;
  }
  if (blank === -1) return output;
  return lines.slice(0, blank).join('\n').replace(/\n+$/, '');
}

export function parseLsOutput(output: string): { name: string; isDir: boolean }[] {
  const entries: { name: string; isDir: boolean }[] = [];
  for (const raw of output.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (/^total\s+\d+/.test(line)) continue;
    if (line.trimStart().startsWith('#')) continue;
    if (/^\s*(Directory:|Mode\s|----)/.test(line)) continue;

    // Unix long format: perms, links, owner, group, size, date(3), name
    const unixLong = line.match(/^([dl-])[rwxsStT-]{9}[+.@]?\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+)$/);
    if (unixLong) {
      const name = unixLong[2].split(' -> ')[0].trim();
      if (name === '.' || name === '..') continue;
      entries.push({ name, isDir: unixLong[1] === 'd' });
      continue;
    }

    // PowerShell table: Mode column then name at the end
    const psRow = line.match(/^([d-])[a-rhs-]{4,5}\s+\S+.*\s(\S+)$/);
    if (psRow && /^\d{2}[./]\d{2}[./]\d{4}/.test(line.slice(7).trimStart())) {
      entries.push({ name: psRow[2], isDir: psRow[1] === 'd' });
      continue;
    }

    // Grid: names split on 2+ spaces
    for (const token of line.split(/\s{2,}/)) {
      const t = token.trim();
      if (!t || t === '.' || t === '..') continue;
      if (t.endsWith('/')) entries.push({ name: t.slice(0, -1), isDir: true });
      else entries.push({ name: t, isDir: false });
    }
  }
  return entries;
}

export function extractPathsFromPattern(pattern: string, output: string): SeedPath[] {
  const stages = pattern.split('|').map(s => s.trim()).filter(Boolean);
  if (stages.length === 0) return [];
  const results: SeedPath[] = [];

  stages.forEach((stage, stageIndex) => {
    let tokens = stage.split(/\s+/);
    if (tokens[0] === 'sudo') tokens = tokens.slice(1);
    const cmd = (tokens[0] || '').toLowerCase();
    const positionals = tokens.slice(1)
      .filter(t => !t.startsWith('-'))
      .map(stripQuotes)
      // stop at redirects
      .filter(t => t !== '>' && t !== '>>' && t !== '<');

    if (CAT_COMMANDS.has(cmd)) {
      for (const p of positionals) {
        if (stages.length === 1 && stageIndex === 0) {
          results.push({ path: p, kind: 'file', content: stripCoachingComments(output) });
        } else {
          results.push({ path: p, kind: 'file' });
        }
      }
    } else if (LS_COMMANDS.has(cmd)) {
      // Listing only meaningful for the first stage (its canned output).
      if (stageIndex === 0) {
        results.push({ path: positionals[0] || '.', kind: 'listing', output });
      } else if (positionals[0]) {
        results.push({ path: positionals[0], kind: 'dir' });
      }
    } else if (DIR_ARG_COMMANDS.has(cmd)) {
      for (const p of positionals) {
        if (p !== '-' && p !== '~') results.push({ path: p, kind: 'dir' });
      }
    } else if (FILE_ARG_COMMANDS.has(cmd)) {
      const args = SKIP_FIRST_ARG.has(cmd) ? positionals.slice(1) : positionals;
      for (const p of args) {
        if (looksLikePath(p)) results.push({ path: p, kind: isDirLike(p) ? 'dir' : 'file' });
      }
    }
  });

  return results;
}

const UNIX_PATH_RE = /(?<![\w:/])\/(?:[\w.\-+]+\/)*[\w.\-+]+\/?/g;
const WIN_PATH_RE = /[A-Za-z]:\\(?:[\w.\-+ ]+\\)*[\w.\-+]+/g;

export function extractPathsFromText(text: string): SeedPath[] {
  const results: SeedPath[] = [];
  const seen = new Set<string>();
  const push = (path: string) => {
    const clean = path.replace(/[.,;:!?)]+$/, '').replace(/\/+$/, '');
    if (clean.length < 2 || seen.has(clean)) return;
    seen.add(clean);
    results.push({ path: clean, kind: isDirLike(clean) ? 'dir' : 'file' });
  };
  for (const m of text.match(UNIX_PATH_RE) || []) {
    // skip URL remainders (the regex lookbehind already excludes '://', belt & braces)
    if (text.includes('//' + m) || text.includes(':' + m)) continue;
    push(m);
  }
  for (const m of text.match(WIN_PATH_RE) || []) push(m);
  return results;
}

export function stubContent(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.log')) {
    return [
      'Jan  5 08:12:01 srv systemd[1]: Started Session 12 of user admin.',
      'Jan  5 08:15:33 srv CRON[812]: (root) CMD (run-parts /etc/cron.hourly)',
      'Jan  5 08:17:09 srv systemd[1]: Reached target Timers.',
      '',
    ].join('\n');
  }
  if (/\.(conf|cfg|ini|cnf)$/.test(lower)) return `# ${name}\n# Konfigurationsdatei\n`;
  if (lower.endsWith('.sh')) return `#!/bin/bash\n# ${name}\n`;
  if (/\.(txt|md)$/.test(lower)) return `${name}\n`;
  return `[${name}]\n`;
}
