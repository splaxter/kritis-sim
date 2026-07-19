/**
 * Ansible module implementations. Each module mutates target host state and
 * reports changed/failed/diff; check mode computes without writing. The
 * become gate lives in the runner, not here.
 */
import { HostState, canonicalUnitName } from '../hosts';
import { applyUnitState, UnitTargetState } from '../unitControl';
import { VirtualFilesystemInterface } from '../types';

export interface ModuleResult {
  changed: boolean;
  failed?: string;
  diff?: { before: string; after: string };
}

export interface ModuleRunOptions {
  check: boolean;
  /** The vfs of the host ansible-playbook runs on — copy's src reads from it. */
  controllerVfs: VirtualFilesystemInterface;
}

export type ModuleParams = Record<string, string | boolean>;
export type AnsibleModule = (target: HostState, params: ModuleParams, opts: ModuleRunOptions) => ModuleResult;

const str = (v: string | boolean | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined;

const failed = (msg: string): ModuleResult => ({ changed: false, failed: msg });

/** Split file content into lines, dropping the final newline's empty tail. */
const toLines = (content: string): string[] =>
  content === '' ? [] : content.replace(/\n$/, '').split('\n');

const fromLines = (lines: string[]): string =>
  lines.length === 0 ? '' : lines.join('\n') + '\n';

/** Player-authored patterns may be invalid — that fails the task, not the run. */
const compileRegexp = (pattern: string): RegExp | null => {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
};

const lineinfileModule: AnsibleModule = (target, params, opts) => {
  const path = str(params.path);
  if (!path) return failed('missing required arguments: path');
  const state = str(params.state) ?? 'present';

  const read = target.vfs.readFile(path);
  const before = read.ok ? read.value : '';
  const lines = toLines(before);

  if (state === 'absent') {
    const regexp = str(params.regexp);
    if (!regexp) return failed('regexp is required with state=absent');
    const re = compileRegexp(regexp);
    if (!re) return failed(`The regular expression '${regexp}' is invalid`);
    if (!read.ok) return { changed: false };
    const kept = lines.filter(l => !re.test(l));
    if (kept.length === lines.length) return { changed: false };
    const after = fromLines(kept);
    if (!opts.check) {
      const w = target.vfs.writeFile(path, after);
      if (!w.ok) return failed(w.error);
    }
    return { changed: true, diff: { before, after } };
  }

  const line = str(params.line);
  if (line === undefined) return failed('line is required with state=present');
  const regexp = str(params.regexp);
  const re = regexp !== undefined ? compileRegexp(regexp) : undefined;
  if (re === null) return failed(`The regular expression '${regexp}' is invalid`);

  let newLines: string[];
  if (!read.ok) {
    // Real ansible refuses to invent the file unless create is set.
    if (params.create !== true) return failed(`Destination ${path} does not exist !`);
    newLines = [line];
  } else if (re) {
    const idx = lines.findIndex(l => re.test(l));
    if (idx >= 0) {
      if (lines[idx] === line) return { changed: false };
      newLines = [...lines];
      newLines[idx] = line;
    } else if (lines.includes(line)) {
      return { changed: false };
    } else {
      newLines = [...lines, line];
    }
  } else if (lines.includes(line)) {
    return { changed: false };
  } else {
    newLines = [...lines, line];
  }

  const after = fromLines(newLines);
  if (after === before) return { changed: false };
  if (!opts.check) {
    const w = target.vfs.writeFile(path, after);
    if (!w.ok) return failed(w.error);
  }
  return { changed: true, diff: { before, after } };
};

const copyModule: AnsibleModule = (target, params, opts) => {
  const dest = str(params.dest);
  if (!dest) return failed('missing required arguments: dest');

  let content = str(params.content);
  const src = str(params.src);
  if (content === undefined) {
    if (src === undefined) return failed('src (or content) is required');
    const read = opts.controllerVfs.readFile(opts.controllerVfs.resolvePath(src));
    if (!read.ok) return failed(`could not find src=${src}`);
    content = read.value;
  }

  const read = target.vfs.readFile(dest);
  const before = read.ok ? read.value : '';
  const changed = !read.ok || before !== content;
  if (!opts.check) {
    if (changed) {
      const w = target.vfs.writeFile(dest, content);
      if (!w.ok) return failed(w.error);
    }
    const mode = str(params.mode);
    if (mode) {
      // vfs.chmod takes 3-digit octal; ansible modes carry a leading 0.
      target.vfs.chmod(dest, mode.replace(/^0(?=[0-7]{3}$)/, ''));
    }
  }
  return changed ? { changed: true, diff: { before, after: content } } : { changed: false };
};

const SERVICE_STATES: UnitTargetState[] = ['started', 'stopped', 'restarted'];

const serviceModule: AnsibleModule = (target, params, opts) => {
  const name = str(params.name);
  if (!name) return failed('missing required arguments: name');
  const state = str(params.state);
  const enabled = typeof params.enabled === 'boolean' ? params.enabled : undefined;

  const unit = target.services.find(u => u.unit === canonicalUnitName(name));
  if (!unit) return failed(`Could not find the requested service ${name}: host`);

  let changed = false;
  if (state !== undefined) {
    if (!SERVICE_STATES.includes(state as UnitTargetState)) {
      return failed(`value of state must be one of: ${SERVICE_STATES.join(', ')}, got: ${state}`);
    }
    if (opts.check) {
      // Report what WOULD change; preconditions are not evaluated in check.
      if (state === 'restarted') changed = true;
      else if (state === 'started') changed = unit.active !== 'active';
      else changed = unit.active === 'active';
    } else {
      const out = applyUnitState(target, name, state as UnitTargetState);
      if (!out.ok) return failed(out.failMessage ?? `unable to ${state} service ${name}`);
      changed = out.changed;
    }
  }

  if (enabled !== undefined && unit.enabled !== 'static') {
    const want = enabled ? 'enabled' : 'disabled';
    if (unit.enabled !== want) {
      if (!opts.check) unit.enabled = want;
      changed = true;
    }
  }

  return { changed };
};

const userModule: AnsibleModule = (target, params, opts) => {
  const name = str(params.name);
  if (!name) return failed('missing required arguments: name');
  const state = str(params.state) ?? 'present';
  const idx = target.accounts.findIndex(a => a.name === name);

  if (state === 'absent') {
    if (idx < 0) return { changed: false };
    if (!opts.check) target.accounts.splice(idx, 1);
    return { changed: true };
  }

  if (idx >= 0) return { changed: false };
  if (!opts.check) {
    target.accounts.push({ name });
    target.vfs.mkdir(`/home/${name}`, true);
  }
  return { changed: true };
};

export const ANSIBLE_MODULES: Record<string, AnsibleModule> = {
  lineinfile: lineinfileModule,
  copy: copyModule,
  service: serviceModule,
  user: userModule,
};
