/**
 * Remote-access commands: ssh. (scp/ssh-keygen/ssh-copy-id follow later.)
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';
import { HostState } from '../../hosts';
import { attemptSsh } from '../../sshAuth';

const LAST_LOGIN = 'Last login: Thu Jul 17 08:12:03 2026 from 10.0.10.5';

function loginBanner(target: HostState, warning?: string): string {
  const parts: string[] = [];
  if (warning) parts.push(warning);
  parts.push(LAST_LOGIN);
  const motd = target.vfs.readFile('/etc/motd');
  if (motd.ok && motd.value.trim()) parts.push(motd.value.trimEnd());
  return parts.join('\n');
}

export const sshCommand: ShellCommand = {
  name: 'ssh',
  description: 'OpenSSH remote login client',
  usage: 'ssh [user@]host',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const targetArg = args.positional[0];
    if (!targetArg) {
      return { output: '', exitCode: 255, error: 'usage: ssh [user@]hostname' };
    }
    if (args.positional.length > 1) {
      // Only interactive logins are simulated.
      return { output: '', exitCode: 1, error: 'ssh: Entfernte Einzelbefehle unterstützt diese Simulation nicht — bitte interaktiv einloggen (ssh <host>).' };
    }
    const { host, resolveHost, pushSession, requestInput } = ctx;
    if (!host || !resolveHost || !pushSession) {
      return { output: '', exitCode: 255, error: `ssh: Could not resolve hostname ${targetArg}: Name or service not known` };
    }

    const at = targetArg.indexOf('@');
    const targetUser = at > 0 ? targetArg.slice(0, at) : ctx.user;
    const targetName = at >= 0 ? targetArg.slice(at + 1) : targetArg;

    const auth = attemptSsh({ host, user: ctx.user }, targetName, targetUser, resolveHost);

    if (auth.kind === 'unreachable' || auth.kind === 'denied') {
      const error = auth.warning ? `${auth.warning}\n${auth.message}` : auth.message;
      return { output: '', exitCode: 255, error };
    }

    const target = resolveHost(targetName)!;

    if (auth.kind === 'ok') {
      pushSession(target.id, targetUser);
      return { output: loginBanner(target, auth.warning), exitCode: 0 };
    }

    // needs-password: up to three masked attempts via chained continuations.
    const password = target.accounts.find(a => a.name === targetUser)?.password;
    const prompt = `${targetUser}@${targetName}'s password: `;
    const attempt = (n: number) => (line: string): CommandResult => {
      if (password !== undefined && line === password) {
        pushSession(target.id, targetUser);
        return { output: loginBanner(target), exitCode: 0 };
      }
      if (n >= 3) {
        return { output: '', exitCode: 255, error: `${targetUser}@${targetName}: Permission denied (password).` };
      }
      return { ...requestInput(prompt, true, attempt(n + 1)), output: 'Permission denied, please try again.' };
    };
    const first = requestInput(prompt, true, attempt(1));
    // A skipped unprotected key still warns before the prompt.
    return auth.warning ? { ...first, output: auth.warning } : first;
  },
};

export const remoteCommands: ShellCommand[] = [sshCommand];
