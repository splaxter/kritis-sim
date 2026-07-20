/**
 * Remote-access commands: ssh, ssh-keygen, ssh-copy-id, scp.
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, VirtualFilesystemInterface } from '../../types';
import { HostState } from '../../hosts';
import { attemptSsh, homeDir } from '../../sshAuth';

const LAST_LOGIN = 'Last login: Thu Jul 17 08:12:03 2026 from 10.0.10.5';

function loginBanner(target: HostState, warning?: string): string {
  const parts: string[] = [];
  if (warning) parts.push(warning);
  parts.push(LAST_LOGIN);
  const motd = target.vfs.readFile('/etc/motd');
  if (motd.ok && motd.value.trim()) parts.push(motd.value.trimEnd());
  return parts.join('\n');
}

/**
 * Masked multi-attempt password prompt against a target account — the shared
 * auth UX of ssh, ssh-copy-id and scp. Wrong attempts re-prompt with
 * 'Permission denied, please try again.'; the last failure yields onFail().
 */
export function promptPassword(
  ctx: ExecutionContext,
  target: HostState,
  targetUser: string,
  opts: { prompt: string; maxAttempts?: number },
  onSuccess: () => CommandResult,
  onFail: () => CommandResult
): CommandResult {
  const max = opts.maxAttempts ?? 3;
  const password = target.accounts.find(a => a.name === targetUser)?.password;
  const attempt = (n: number) => (line: string): CommandResult => {
    if (password !== undefined && line === password) {
      return onSuccess();
    }
    if (n >= max) {
      return onFail();
    }
    return { ...ctx.requestInput(opts.prompt, true, attempt(n + 1)), output: 'Permission denied, please try again.' };
  };
  return ctx.requestInput(opts.prompt, true, attempt(1));
}

export const sshCommand: ShellCommand = {
  name: 'ssh',
  description: 'OpenSSH remote login client',
  usage: 'ssh [user@]host',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // Real ssh options (-p, -i, ...) are not simulated — say so up front.
    if (Object.keys(args.flags).length > 0 || Object.keys(args.options).length > 0) {
      return { output: '', exitCode: 255, error: 'ssh: Optionen werden in dieser Simulation nicht unterstützt' };
    }
    const targetArg = args.positional[0];
    if (!targetArg) {
      return { output: '', exitCode: 255, error: 'usage: ssh [user@]hostname' };
    }
    if (args.positional.length > 1) {
      // Only interactive logins are simulated.
      return { output: '', exitCode: 255, error: 'ssh: Entfernte Einzelbefehle unterstützt diese Simulation nicht — bitte interaktiv einloggen (ssh <host>).' };
    }
    const { host, resolveHost, pushSession } = ctx;
    if (!host || !resolveHost || !pushSession) {
      return { output: '', exitCode: 255, error: `ssh: Could not resolve hostname ${targetArg}: Name or service not known` };
    }

    const { user: targetUser, host: targetName } = parseUserHost(targetArg, ctx);

    const auth = attemptSsh({ host, user: ctx.user }, targetName, targetUser, resolveHost);

    if (auth.kind === 'unreachable' || auth.kind === 'denied') {
      const error = auth.warning ? `${auth.warning}\n${auth.message}` : auth.message;
      return { output: '', exitCode: 255, error };
    }

    const target = resolveHost(targetName)!;

    if (auth.kind === 'ok') {
      // auth.method is 'publickey' here — record it so a loggedIn goal can
      // require the passwordless key login specifically.
      pushSession(target.id, targetUser, auth.method);
      return { output: loginBanner(target, auth.warning), exitCode: 0 };
    }

    // needs-password: up to three masked attempts via chained continuations.
    const first = promptPassword(
      ctx, target, targetUser,
      { prompt: `${targetUser}@${targetName}'s password: ` },
      () => {
        pushSession(target.id, targetUser, 'password');
        return { output: loginBanner(target), exitCode: 0 };
      },
      () => ({ output: '', exitCode: 255, error: `${targetUser}@${targetName}: Permission denied (password).` })
    );
    // A skipped unprotected key still warns before the prompt.
    return auth.warning ? { ...first, output: auth.warning } : first;
  },
};

// ============================================================================
// Deterministic key material — no randomness, seeded by user/host/counter.
// ============================================================================

/** djb2 string hash, unsigned 32 bit. */
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Expand a seed into `length` base36 chars by re-hashing with an index. */
function expandHash(seed: string, length: number): string {
  let out = '';
  for (let i = 0; out.length < length; i++) {
    out += djb2(`${seed}#${i}`).toString(36);
  }
  return out.slice(0, length);
}

/** Monotonic generation counter — successive keys differ even for the same seed. */
let keygenCounter = 0;

export type KeyType = 'rsa' | 'ed25519';

const KEY_PREFIX: Record<KeyType, string> = { rsa: 'ssh-rsa AAAAB3', ed25519: 'ssh-ed25519 AAAAC3' };
const ART_HEADER: Record<KeyType, string> = { rsa: '+---[RSA 3072]----+', ed25519: '+--[ED25519 256]--+' };

export interface Keypair {
  /** Public key line WITHOUT the trailing comment. */
  pubBody: string;
  privateKey: string;
  fingerprint: string;
  randomart: string;
}

/** Deterministic keypair for (user, host, generation n). */
export function keypairFor(user: string, host: string, n: number, type: KeyType = 'ed25519'): Keypair {
  const seed = `${user}@${host}:${n}:${type}`;
  const pubBody = `${KEY_PREFIX[type]}${expandHash(seed, 40)}`;
  const privBody = expandHash(`${seed}:priv`, 192);
  const privLines: string[] = [];
  for (let i = 0; i < privBody.length; i += 64) {
    privLines.push(privBody.slice(i, i + 64));
  }
  const privateKey = [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAAB',
    ...privLines,
    '-----END OPENSSH PRIVATE KEY-----',
    '',
  ].join('\n');
  const fingerprint = `SHA256:${expandHash(`${seed}:fp`, 43)}`;

  // Simple deterministic randomart: 9 rows x 17 cols mapped from the hash.
  const ART_CHARS = ' .o+=*BOX@%&#/^S';
  const artSeed = expandHash(`${seed}:art`, 9 * 17);
  const rows: string[] = [ART_HEADER[type]];
  for (let r = 0; r < 9; r++) {
    let row = '';
    for (let c = 0; c < 17; c++) {
      const ch = artSeed.charCodeAt(r * 17 + c);
      row += ART_CHARS[ch % ART_CHARS.length];
    }
    rows.push(`|${row}|`);
  }
  rows.push('+----[SHA256]-----+');
  return { pubBody, privateKey, fingerprint, randomart: rows.join('\n') };
}

// ============================================================================
// ssh-keygen
// ============================================================================

/** Hostname of the machine the command runs on — for the default key comment. */
function localHostname(ctx: ExecutionContext): string {
  return ctx.host?.hostname ?? ctx.env['HOSTNAME'] ?? 'localhost';
}

export const sshKeygenCommand: ShellCommand = {
  name: 'ssh-keygen',
  description: 'OpenSSH authentication key utility',
  usage: "ssh-keygen [-t rsa|ed25519] [-f keyfile] [-C comment] [-N passphrase]",
  options: [
    { short: 't', description: 'key type', takesValue: true },
    { short: 'f', description: 'key file', takesValue: true },
    { short: 'C', description: 'comment', takesValue: true },
    { short: 'N', description: 'passphrase', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const type = (args.options['t'] ?? 'rsa') as KeyType;
    if (type !== 'rsa' && type !== 'ed25519') {
      return { output: '', exitCode: 1, error: `unknown key type ${args.options['t']}` };
    }
    const comment = args.options['C'] ?? `${ctx.user}@${localHostname(ctx)}`;
    const defaultPath = `${homeDir(ctx.user)}/.ssh/id_${type}`;
    const generating = `Generating public/private ${type} key pair.`;

    // The 'Generating...' announce is emitted exactly once by the caller
    // (with the first prompt, or prepended to a synchronous -f result).
    const finish = (path: string): CommandResult => {
      keygenCounter += 1;
      const pair = keypairFor(ctx.user, localHostname(ctx), keygenCounter, type);
      const vfs = ctx.vfs;
      const dir = vfs.dirname(path);
      if (!vfs.isDirectory(dir)) {
        const made = vfs.mkdir(dir, true);
        if (!made.ok) {
          return { output: '', exitCode: 1, error: `Saving key "${path}" failed: No such file or directory` };
        }
      }
      // ~/.ssh must be private for sshd to accept the keys — enforce it.
      if (dir.endsWith('/.ssh')) vfs.chmod(dir, '700');
      vfs.writeFile(path, pair.privateKey);
      vfs.chmod(path, '600');
      vfs.writeFile(`${path}.pub`, `${pair.pubBody} ${comment}\n`);
      vfs.chmod(`${path}.pub`, '644');
      const summary = [
        `Your identification has been saved in ${path}`,
        `Your public key has been saved in ${path}.pub`,
        'The key fingerprint is:',
        `${pair.fingerprint} ${comment}`,
        "The key's randomart image is:",
        pair.randomart,
      ].join('\n');
      return { output: summary, exitCode: 0 };
    };

    // Passphrase is accepted but ignored (keys behave as unencrypted).
    const askPassphrase = (path: string, retried: boolean): CommandResult =>
      ctx.requestInput('Enter passphrase (empty for no passphrase): ', true, first =>
        ctx.requestInput('Enter same passphrase again: ', true, second => {
          if (first === second) return finish(path);
          if (retried) {
            return { output: '', exitCode: 1, error: 'Passphrases do not match.  Try again.' };
          }
          return { ...askPassphrase(path, true), output: 'Passphrases do not match.  Try again.' };
        })
      );

    const afterPath = (path: string): CommandResult => {
      const proceed = (): CommandResult =>
        args.options['N'] !== undefined ? finish(path) : askPassphrase(path, false);
      if (ctx.vfs.exists(path)) {
        return ctx.requestInput(`${path} already exists.\nOverwrite (y/n)? `, false, answer =>
          answer.trim() === 'y' ? proceed() : { output: '', exitCode: 1 }
        );
      }
      return proceed();
    };

    if (args.options['f'] !== undefined) {
      const path = ctx.vfs.resolvePath(args.options['f']);
      const r = afterPath(path);
      // Announce once with whatever comes back synchronously (prompt or summary).
      return { ...r, output: [generating, r.output].filter(Boolean).join('\n') };
    }
    const first = ctx.requestInput(
      `Enter file in which to save the key (${defaultPath}): `, false,
      line => afterPath(line.trim() ? ctx.vfs.resolvePath(line.trim()) : defaultPath)
    );
    return { ...first, output: generating };
  },
};

// ============================================================================
// ssh-copy-id
// ============================================================================

/** Split '[user@]host' — user defaults to the current session user. */
function parseUserHost(arg: string, ctx: ExecutionContext): { user: string; host: string } {
  const at = arg.indexOf('@');
  return {
    user: at > 0 ? arg.slice(0, at) : ctx.user,
    host: at >= 0 ? arg.slice(at + 1) : arg,
  };
}

const PUBKEY_LINE = /^ssh-(rsa|ed25519) /;

type PubkeyLookup =
  | { kind: 'ok'; path: string; line: string }
  | { kind: 'not-pubkey'; path: string }
  | { kind: 'none' };

/** First pubkey in the source user's ~/.ssh, or an explicit -i path. */
function findPubkey(ctx: ExecutionContext, explicit?: string): PubkeyLookup {
  const vfs = ctx.vfs;
  if (explicit) {
    let path = vfs.resolvePath(explicit);
    if (!path.endsWith('.pub') && vfs.isFile(`${path}.pub`)) path = `${path}.pub`;
    const read = vfs.readFile(path);
    if (!read.ok) return { kind: 'none' };
    const line = read.value.trim().split('\n')[0].trim();
    // -i may point at a private key with no .pub next to it — reject it.
    if (!PUBKEY_LINE.test(line)) return { kind: 'not-pubkey', path };
    return { kind: 'ok', path, line };
  }
  const sshDir = `${homeDir(ctx.user)}/.ssh`;
  const listing = vfs.readDirectory(sshDir);
  if (!listing.ok) return { kind: 'none' };
  for (const node of listing.value) {
    if (node.type !== 'file' || !node.name.endsWith('.pub')) continue;
    const read = vfs.readFile(`${sshDir}/${node.name}`);
    if (!read.ok) continue;
    const line = read.value.trim().split('\n')[0].trim();
    if (PUBKEY_LINE.test(line)) return { kind: 'ok', path: `${sshDir}/${node.name}`, line };
  }
  return { kind: 'none' };
}

const ALL_KEYS_SKIPPED = 'All keys were skipped because they already exist on the remote system.';

export const sshCopyIdCommand: ShellCommand = {
  name: 'ssh-copy-id',
  description: 'Install a public key in a remote authorized_keys file',
  usage: 'ssh-copy-id [-i identity] [user@]host',
  options: [{ short: 'i', description: 'identity file', takesValue: true }],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const targetArg = args.positional[0];
    if (!targetArg) {
      return { output: '', exitCode: 1, error: 'usage: ssh-copy-id [-i identity] [user@]host' };
    }
    const { host, resolveHost } = ctx;
    if (!host || !resolveHost) {
      return { output: '', exitCode: 255, error: `ssh: Could not resolve hostname ${targetArg}: Name or service not known` };
    }
    const key = findPubkey(ctx, args.options['i']);
    if (key.kind === 'not-pubkey') {
      return { output: '', exitCode: 1, error: `ssh-copy-id: ERROR: ${key.path} is not a public key` };
    }
    if (key.kind === 'none') {
      return { output: '', exitCode: 1, error: 'ssh-copy-id: ERROR: No identities found' };
    }

    const { user: targetUser, host: targetName } = parseUserHost(targetArg, ctx);
    const auth = attemptSsh({ host, user: ctx.user }, targetName, targetUser, resolveHost);

    if (auth.kind === 'unreachable' || auth.kind === 'denied') {
      const error = auth.warning ? `${auth.warning}\n${auth.message}` : auth.message;
      return { output: '', exitCode: 255, error };
    }

    const target = resolveHost(targetName)!;
    const install = (): CommandResult => {
      const sshDir = `${homeDir(targetUser)}/.ssh`;
      const akPath = `${sshDir}/authorized_keys`;
      const tvfs = target.vfs;
      if (!tvfs.isDirectory(sshDir)) {
        tvfs.mkdir(sshDir, true);
        tvfs.chmod(sshDir, '700');
      }
      const existing = tvfs.readFile(akPath);
      const lines = existing.ok
        ? existing.value.split('\n').map(l => l.trim()).filter(Boolean)
        : [];
      if (lines.includes(key.line)) {
        return { output: ALL_KEYS_SKIPPED, exitCode: 0 };
      }
      tvfs.writeFile(akPath, [...lines, key.line].join('\n') + '\n');
      tvfs.chmod(akPath, '644');
      return {
        output: [
          'Number of key(s) added: 1',
          '',
          `Now try logging into the machine, with:   "ssh '${targetUser}@${targetName}'"`,
          'and check to make sure that only the key(s) you wanted were added.',
        ].join('\n'),
        exitCode: 0,
      };
    };

    if (auth.kind === 'ok') {
      // Existing key auth skips the password prompt, but a NEW -i identity
      // must still be installed — install() dedupes and emits the skip message.
      const r = install();
      return auth.warning ? { ...r, output: [auth.warning, r.output].filter(Boolean).join('\n') } : r;
    }

    const first = promptPassword(
      ctx, target, targetUser,
      { prompt: `${targetUser}@${targetName}'s password: ` },
      install,
      () => ({ output: '', exitCode: 255, error: `${targetUser}@${targetName}: Permission denied (password).` })
    );
    return auth.warning ? { ...first, output: auth.warning } : first;
  },
};

// ============================================================================
// scp
// ============================================================================

interface ScpRemote { user: string; host: string; path: string }

/** '[user@]host:path' → remote parts; null when the arg is a local path. */
function parseScpArg(arg: string, ctx: ExecutionContext): ScpRemote | null {
  const colon = arg.indexOf(':');
  if (colon <= 0 || arg.slice(0, colon).includes('/')) return null;
  const { user, host } = parseUserHost(arg.slice(0, colon), ctx);
  return { user, host, path: arg.slice(colon + 1) };
}

/** Progress line like real scp — size from content length, fixed fake rate. */
function progressLine(name: string, size: number): string {
  return `${name.padEnd(32)} 100% ${String(size).padStart(4)}B   1.2MB/s   00:00`;
}

/**
 * Resolve where the copied file lands: an existing directory (or trailing
 * slash) appends the source basename; the parent directory must exist.
 */
function resolveDestination(
  vfs: VirtualFilesystemInterface, destPath: string, destAsTyped: string, srcName: string
): { ok: true; path: string } | { ok: false; error: string } {
  let dest = destPath;
  if (vfs.isDirectory(dest) || destAsTyped.endsWith('/')) {
    dest = `${dest.replace(/\/+$/, '')}/${srcName}`;
  }
  if (!vfs.isDirectory(vfs.dirname(dest))) {
    return { ok: false, error: `scp: ${destAsTyped}: No such file or directory` };
  }
  return { ok: true, path: dest };
}

export const scpCommand: ShellCommand = {
  name: 'scp',
  description: 'OpenSSH secure file copy',
  usage: 'scp <source> <target> (one side [user@]host:path)',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (Object.keys(args.flags).length > 0 || Object.keys(args.options).length > 0) {
      return { output: '', exitCode: 1, error: 'scp: Optionen werden in dieser Simulation nicht unterstützt' };
    }
    if (args.positional.length !== 2) {
      return { output: '', exitCode: 1, error: 'usage: scp <source> <target>' };
    }
    const [srcArg, dstArg] = args.positional;
    const srcRemote = parseScpArg(srcArg, ctx);
    const dstRemote = parseScpArg(dstArg, ctx);
    if ((srcRemote === null) === (dstRemote === null)) {
      return { output: '', exitCode: 1, error: 'scp: genau eine Seite muss entfernt sein ([user@]host:pfad) — diese Simulation kopiert nur lokal↔entfernt' };
    }
    const { host, resolveHost } = ctx;
    const remote = (srcRemote ?? dstRemote)!;
    if (!host || !resolveHost) {
      return { output: '', exitCode: 255, error: `ssh: Could not resolve hostname ${remote.host}: Name or service not known` };
    }

    const auth = attemptSsh({ host, user: ctx.user }, remote.host, remote.user, resolveHost);
    if (auth.kind === 'unreachable' || auth.kind === 'denied') {
      const error = auth.warning ? `${auth.warning}\n${auth.message}` : auth.message;
      return { output: '', exitCode: 255, error };
    }
    const target = resolveHost(remote.host)!;
    const tvfs = target.vfs;
    // Relative remote paths resolve against the remote user's home.
    const remoteHome = homeDir(remote.user);
    const remoteAbs = (p: string): string =>
      p.startsWith('/') ? p : `${remoteHome}${p ? `/${p}` : ''}`;

    // The transfer itself — runs after auth succeeded; never opens a session.
    const transfer = (): CommandResult => {
      if (srcRemote) {
        // Download
        const srcPath = remoteAbs(srcRemote.path);
        if (tvfs.isDirectory(srcPath)) {
          return { output: '', exitCode: 1, error: `scp: ${srcRemote.path || srcPath}: not a regular file` };
        }
        const read = tvfs.readFile(srcPath);
        if (!read.ok) {
          return { output: '', exitCode: 1, error: `scp: ${srcRemote.path || srcPath}: No such file or directory` };
        }
        const name = tvfs.basename(srcPath);
        const dest = resolveDestination(ctx.vfs, ctx.vfs.resolvePath(dstArg), dstArg, name);
        if (!dest.ok) return { output: '', exitCode: 1, error: dest.error };
        const write = ctx.vfs.writeFile(dest.path, read.value);
        if (!write.ok) return { output: '', exitCode: 1, error: `scp: ${dstArg}: ${write.error}` };
        return { output: progressLine(name, read.value.length), exitCode: 0 };
      }
      // Upload
      const srcPath = ctx.vfs.resolvePath(srcArg);
      if (ctx.vfs.isDirectory(srcPath)) {
        return { output: '', exitCode: 1, error: `scp: ${srcArg}: not a regular file` };
      }
      const read = ctx.vfs.readFile(srcPath);
      if (!read.ok) {
        return { output: '', exitCode: 1, error: `scp: ${srcArg}: No such file or directory` };
      }
      const name = ctx.vfs.basename(srcPath);
      const dest = resolveDestination(tvfs, remoteAbs(dstRemote!.path), dstRemote!.path || remoteAbs(''), name);
      if (!dest.ok) return { output: '', exitCode: 1, error: dest.error };
      const write = tvfs.writeFile(dest.path, read.value);
      if (!write.ok) return { output: '', exitCode: 1, error: `scp: ${dstRemote!.path}: ${write.error}` };
      return { output: progressLine(name, read.value.length), exitCode: 0 };
    };

    if (auth.kind === 'ok') {
      const r = transfer();
      return auth.warning ? { ...r, output: [auth.warning, r.output].filter(Boolean).join('\n') } : r;
    }
    const first = promptPassword(
      ctx, target, remote.user,
      { prompt: `${remote.user}@${remote.host}'s password: ` },
      transfer,
      () => ({ output: '', exitCode: 255, error: `${remote.user}@${remote.host}: Permission denied (password).` })
    );
    return auth.warning ? { ...first, output: auth.warning } : first;
  },
};

export const remoteCommands: ShellCommand[] = [sshCommand, sshKeygenCommand, sshCopyIdCommand, scpCommand];
