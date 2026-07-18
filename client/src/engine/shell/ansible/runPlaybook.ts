/**
 * Playbook runner: connection check per host per play (ssh key auth from
 * the controller), task execution with become gating, check/diff rendering,
 * recap with real ansible counters and exit codes.
 */
import { MiniPlay, MiniTask } from './miniYaml';
import { resolveHosts } from './inventory';
import { ANSIBLE_MODULES, ModuleResult } from './modules';
import { HostState } from '../hosts';
import { checkKeyAuth, port22Blocked } from '../sshAuth';

export interface RunPlaybookOptions {
  controllerHost: HostState;
  controllerUser: string;
  resolveHost: (nameOrIp: string) => HostState | undefined;
  inventory: Map<string, string[]>;
  check: boolean;
  diff: boolean;
}

export interface RunPlaybookResult {
  output: string;
  exitCode: number;
}

interface HostCounters {
  ok: number;
  changed: number;
  unreachable: number;
  failed: number;
}

/** 'PLAY [x] ****…' — pad with * to the classic ~70-char rule. */
const header = (text: string): string => `${text} `.padEnd(70, '*');

/** Modules the become gate treats as privileged, or paths under /etc. */
function privilegedTaskPath(task: MiniTask): string | null {
  if (task.module === 'service' || task.module === 'user') return '';
  const path = task.params.path ?? task.params.dest;
  if (typeof path === 'string' && (path === '/etc' || path.startsWith('/etc/'))) return path;
  return null;
}

/** Compact deterministic diff body: removed lines -, added lines +. */
function renderDiff(path: string, diff: { before: string; after: string }): string[] {
  const beforeLines = diff.before.split('\n').filter(l => l !== '');
  const afterLines = diff.after.split('\n').filter(l => l !== '');
  const lines = [`--- before: ${path}`, `+++ after: ${path}`];
  for (const l of beforeLines) if (!afterLines.includes(l)) lines.push(`-${l}`);
  for (const l of afterLines) if (!beforeLines.includes(l)) lines.push(`+${l}`);
  return lines;
}

function connectionError(
  hostname: string,
  target: HostState | undefined,
  opts: RunPlaybookOptions
): string | null {
  if (!target) {
    return `ssh: Could not resolve hostname ${hostname}: Name or service not known`;
  }
  if (port22Blocked(target, opts.controllerHost)) {
    return `ssh: connect to host ${hostname} port 22: Connection timed out`;
  }
  const key = checkKeyAuth(opts.controllerHost.vfs, opts.controllerUser, target, opts.controllerUser);
  if (!key.ok) {
    const methods = target.sshdEffective.passwordAuthentication ? 'publickey,password' : 'publickey';
    return `${opts.controllerUser}@${hostname}: Permission denied (${methods}).`;
  }
  return null;
}

export function runPlaybook(plays: MiniPlay[], opts: RunPlaybookOptions): RunPlaybookResult {
  const out: string[] = [];
  const counters = new Map<string, HostCounters>();
  const counter = (host: string): HostCounters => {
    let c = counters.get(host);
    if (!c) {
      c = { ok: 0, changed: 0, unreachable: 0, failed: 0 };
      counters.set(host, c);
    }
    return c;
  };

  for (const play of plays) {
    out.push('');
    out.push(header(`PLAY [${play.name}]`));

    const hostnames = resolveHosts(opts.inventory, play.hosts);
    if (hostnames.length === 0) {
      out.push('skipping: no hosts matched, nothing to do');
      continue;
    }

    // Ansible checks the connection once per host per play; failures surface
    // under the first TASK header and the host sits the play out.
    const unreachable: { hostname: string; msg: string }[] = [];
    const active: { hostname: string; target: HostState }[] = [];
    for (const hostname of hostnames) {
      counter(hostname);
      const target = opts.resolveHost(hostname);
      const err = connectionError(hostname, target, opts);
      if (err !== null) {
        unreachable.push({ hostname, msg: err });
        counter(hostname).unreachable += 1;
      } else {
        active.push({ hostname, target: target! });
      }
    }

    let firstTask = true;
    for (const task of play.tasks) {
      // After the unreachable fatals were shown, stop rendering headers for
      // tasks no host will run (matches ansible ending the play).
      if (!firstTask && active.length === 0) break;
      out.push('');
      out.push(header(`TASK [${task.name}]`));
      if (firstTask) {
        for (const u of unreachable) {
          out.push(
            `fatal: [${u.hostname}]: UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: ${u.msg}", "unreachable": true}`
          );
        }
        firstTask = false;
      }

      for (let i = 0; i < active.length; i++) {
        const { hostname, target } = active[i];

        const fail = (msg: string): void => {
          out.push(`fatal: [${hostname}]: FAILED! => {"changed": false, "msg": "${msg}"}`);
          counter(hostname).failed += 1;
          active.splice(i, 1);
          i--;
        };

        const privPath = privilegedTaskPath(task);
        if (!play.become && privPath !== null) {
          fail(privPath ? `Permission denied: '${privPath}'` : 'Permission denied');
          continue;
        }

        const module = ANSIBLE_MODULES[task.module];
        if (!module) {
          fail(`The module '${task.module}' was not found in configured module paths`);
          continue;
        }

        // Modules write as the connection would: root under become, else the
        // controller user. Restored afterwards — ssh sessions own vfs users.
        const prevUser = target.vfs.getUser();
        target.vfs.setUser(play.become ? 'root' : opts.controllerUser);
        let result: ModuleResult;
        try {
          result = module(target, task.params, { check: opts.check, controllerVfs: opts.controllerHost.vfs });
        } finally {
          target.vfs.setUser(prevUser);
        }

        if (result.failed) {
          fail(result.failed);
          continue;
        }
        if (result.changed) {
          if (opts.diff && result.diff) {
            const path = String(task.params.path ?? task.params.dest ?? '');
            out.push(...renderDiff(path, result.diff));
          }
          out.push(`changed: [${hostname}]`);
          counter(hostname).ok += 1;
          counter(hostname).changed += 1;
        } else {
          out.push(`ok: [${hostname}]`);
          counter(hostname).ok += 1;
        }
      }
    }
  }

  out.push('');
  out.push(header('PLAY RECAP'));
  let worst = 0;
  for (const [hostname, c] of counters) {
    out.push(
      `${hostname.padEnd(26)} : ok=${c.ok}    changed=${c.changed}    unreachable=${c.unreachable}    failed=${c.failed}    skipped=0    rescued=0    ignored=0`
    );
    if (c.failed > 0 || c.unreachable > 0) worst = 2;
  }

  return { output: out.join('\n').replace(/^\n/, ''), exitCode: worst };
}
