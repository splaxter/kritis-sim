/**
 * SSH authentication core — pure decision logic shared by ssh (and later
 * scp/ssh-copy-id/ansible). The ssh command turns results into output.
 */
import { HostState } from './hosts';
import { VFSPermissions, VirtualFilesystemInterface } from './types';

export type SshAuthResult = (
  | { kind: 'ok'; method: 'publickey' | 'password' }
  | { kind: 'needs-password' }
  | { kind: 'denied'; message: string }
  | { kind: 'unreachable'; message: string }
) & {
  /** UNPROTECTED-PRIVATE-KEY warning to surface before the result, if any. */
  warning?: string;
};

export function homeDir(user: string): string {
  return user === 'root' ? '/root' : `/home/${user}`;
}

/** Render permissions as the octal string ssh prints ('0644'). */
function octalMode(perms: VFSPermissions): string {
  const digit = (p: { read: boolean; write: boolean; execute: boolean }) =>
    (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0);
  return `0${digit(perms.owner)}${digit(perms.group)}${digit(perms.other)}`;
}

function unprotectedKeyWarning(path: string, mode: string): string {
  return [
    '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
    '@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @',
    '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
    `Permissions ${mode} for '${path}' are too open.`,
    'It is required that your private key files are NOT accessible by others.',
    'This private key will be ignored.',
  ].join('\n');
}

/**
 * Does any keypair in the source user's ~/.ssh match the target user's
 * authorized_keys? Group/other-readable private keys are skipped with a
 * warning (kept even when another key succeeds).
 */
export function checkKeyAuth(
  sourceVfs: VirtualFilesystemInterface,
  sourceUser: string,
  target: HostState,
  targetUser: string
): { ok: boolean; warning?: string } {
  const sshDir = `${homeDir(sourceUser)}/.ssh`;
  const listing = sourceVfs.readDirectory(sshDir);
  if (!listing.ok) return { ok: false };

  const akRead = target.vfs.readFile(`${homeDir(targetUser)}/.ssh/authorized_keys`);
  const authorized = akRead.ok
    ? akRead.value.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    : [];

  const warnings: string[] = [];
  const warning = () => (warnings.length ? warnings.join('\n') : undefined);
  let matched = false;
  for (const node of listing.value) {
    if (node.type !== 'file' || !node.name.endsWith('.pub')) continue;
    const privPath = `${sshDir}/${node.name.slice(0, -4)}`;
    const privStat = sourceVfs.stat(privPath);
    if (!privStat.ok) continue; // pubkey without private key is unusable
    const perms = privStat.value.permissions;
    if (perms.group.read || perms.other.read) {
      warnings.push(unprotectedKeyWarning(privPath, octalMode(perms)));
      continue;
    }
    if (matched) continue; // keep scanning only to collect remaining warnings
    const pubRead = sourceVfs.readFile(`${sshDir}/${node.name}`);
    if (!pubRead.ok) continue;
    const pubLine = pubRead.value.trim().split('\n')[0].trim();
    if (pubLine && authorized.includes(pubLine)) {
      matched = true;
    }
  }
  return { ok: matched, warning: warning() };
}

/** Is TCP/22 on the target blocked for connections coming from `source`? */
export function port22Blocked(target: HostState, source: HostState): boolean {
  const fw = target.firewall;
  if (!fw.enabled) return false;
  // Only tcp rules apply to ssh; a udp-only rule never matches.
  const rules = fw.rules.filter(r => r.port === 22 && (!r.proto || r.proto === 'tcp'));
  // A from-restricted deny rule only blocks the exact source IP it names.
  if (rules.some(r => r.action === 'deny' && (!r.from || source.ip === r.from))) return true;
  // A from-restricted allow rule only admits sources with exactly that IP —
  // the base 'local' host has no IP and is therefore not admitted by it.
  const admitted = rules.some(r =>
    r.action === 'allow' && (!r.from || (source.ip !== undefined && source.ip === r.from))
  );
  if (admitted) return false;
  return fw.defaultIncoming === 'deny';
}

/**
 * Full connection + auth decision for `ssh targetUser@targetName`, evaluated
 * from `source` (the host the command runs on, plus the logged-in user).
 */
export function attemptSsh(
  source: { host: HostState; user: string },
  targetName: string,
  targetUser: string,
  resolveHost: (nameOrIp: string) => HostState | undefined
): SshAuthResult {
  const target = resolveHost(targetName);
  if (!target) {
    return { kind: 'unreachable', message: `ssh: Could not resolve hostname ${targetName}: Name or service not known` };
  }
  if (port22Blocked(target, source.host)) {
    return { kind: 'unreachable', message: `ssh: connect to host ${targetName} port 22: Connection timed out` };
  }

  // '(publickey)' when password auth is off, '(publickey,password)' when on.
  const deniedMessage = target.sshdEffective.passwordAuthentication
    ? 'Permission denied (publickey,password).'
    : 'Permission denied (publickey).';

  const account = target.accounts.find(a => a.name === targetUser);
  // Unknown users get the same denial as a key failure — like real sshd,
  // nothing reveals whether the account exists.
  if (!account) {
    return { kind: 'denied', message: deniedMessage };
  }
  if (targetUser === 'root' && !target.sshdEffective.permitRootLogin) {
    // Key auth is not even attempted for root when PermitRootLogin is off.
    return { kind: 'denied', message: 'Permission denied (publickey).' };
  }

  const key = checkKeyAuth(source.host.vfs, source.user, target, targetUser);
  if (key.ok) {
    return { kind: 'ok', method: 'publickey', warning: key.warning };
  }
  if (target.sshdEffective.passwordAuthentication && account.password !== undefined) {
    return { kind: 'needs-password', warning: key.warning };
  }
  return { kind: 'denied', message: deniedMessage, warning: key.warning };
}
