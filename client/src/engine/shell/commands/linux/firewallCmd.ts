/**
 * ufw — operates on the per-host FirewallState (ctx.host.firewall).
 * ssh reachability reads the same state, so rules take effect for NEW
 * connections while existing sessions stay alive (checked at ssh time only).
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion } from '../../types';
import { FirewallState, UfwRule } from '../../hosts';
import { port22Blocked } from '../../sshAuth';

const ROOT_ERROR = 'ERROR: You need to be root to run this script';
const NO_SUCH_RULE = 'ERROR: Could not delete non-existent rule';
const SSH_DISRUPT_PROMPT = 'Command may disrupt existing ssh connections. Proceed with operation (y|n)? ';

// Service names normalize to port/tcp so 'allow ssh' and 'allow 22/tcp'
// are the same rule (dedupe, delete, display).
const SERVICE_PORTS: Record<string, { port: number; proto: 'tcp' }> = {
  ssh: { port: 22, proto: 'tcp' },
  http: { port: 80, proto: 'tcp' },
  https: { port: 443, proto: 'tcp' },
};

/** '22/tcp' | '22' | 'ssh' → port/proto, or null when unparseable. */
function parsePortSpec(spec: string): { port: number; proto?: 'tcp' | 'udp' } | null {
  const m = spec.match(/^(\d+)(?:\/(tcp|udp))?$/);
  if (m) {
    const proto = m[2] as 'tcp' | 'udp' | undefined;
    return proto ? { port: parseInt(m[1], 10), proto } : { port: parseInt(m[1], 10) };
  }
  const service = SERVICE_PORTS[spec];
  return service ? { ...service } : null;
}

/**
 * Tokens after allow/deny → rule. Supports '22/tcp'-style specs and the
 * minimal real-ufw from-form: 'from <ip> to any port <port> [proto <p>]'.
 */
function parseRuleTokens(action: 'allow' | 'deny', tokens: string[]): UfwRule | null {
  if (tokens[0] === 'from') {
    if (tokens[1] === undefined || tokens[2] !== 'to' || tokens[3] !== 'any' || tokens[4] !== 'port') return null;
    const port = parseInt(tokens[5] ?? '', 10);
    if (!Number.isFinite(port)) return null;
    const rule: UfwRule = { action, port };
    // 'from any' is no source restriction — same as omitting the clause.
    if (tokens[1] !== 'any') rule.from = tokens[1];
    if (tokens.length > 6) {
      if (tokens[6] !== 'proto' || (tokens[7] !== 'tcp' && tokens[7] !== 'udp')) return null;
      rule.proto = tokens[7];
    }
    return rule;
  }
  if (tokens.length !== 1) return null;
  const spec = parsePortSpec(tokens[0]);
  return spec ? { action, ...spec } : null;
}

function sameRule(a: UfwRule, b: UfwRule): boolean {
  return a.action === b.action && a.port === b.port && a.proto === b.proto && a.from === b.from;
}

const ruleTo = (r: UfwRule): string => (r.proto ? `${r.port}/${r.proto}` : `${r.port}`);
const ruleFrom = (r: UfwRule): string => r.from ?? 'Anywhere';

function statusOutput(fw: FirewallState, numbered: boolean): string {
  if (!fw.enabled) return 'Status: inactive';
  const lines = ['Status: active'];
  if (fw.rules.length > 0) {
    const indent = numbered ? '     ' : '';
    lines.push('', `${indent}${'To'.padEnd(27)}${'Action'.padEnd(12)}From`, `${indent}${'--'.padEnd(27)}${'------'.padEnd(12)}----`);
    fw.rules.forEach((r, i) => {
      const action = numbered
        ? (r.action === 'allow' ? 'ALLOW IN' : 'DENY IN')
        : r.action.toUpperCase();
      const prefix = numbered ? `[${String(i + 1).padStart(2)}] ` : '';
      lines.push(`${prefix}${ruleTo(r).padEnd(27)}${action.padEnd(12)}${ruleFrom(r)}`);
    });
  }
  return lines.join('\n');
}

/**
 * A GLOBAL (from-less) allow-22 keeps port 22 open for everyone, so the
 * disruption prompt can be skipped. A from-restricted allow only admits its
 * own source and must NOT suppress the warning — the caller may still be cut,
 * which the post-apply port22Blocked check decides for real.
 */
function hasAllow22(fw: FirewallState): boolean {
  return fw.rules.some(r => r.action === 'allow' && r.port === 22 && (!r.proto || r.proto === 'tcp') && !r.from);
}

/** Would enabling this firewall block a hypothetical NEW ssh connection? */
function enableWouldBlock22(fw: FirewallState): boolean {
  const denied = fw.rules.some(r => r.action === 'deny' && r.port === 22 && (!r.proto || r.proto === 'tcp') && !r.from);
  return denied || (fw.defaultIncoming === 'deny' && !hasAllow22(fw));
}

export const ufwCommand: ShellCommand = {
  name: 'ufw',
  description: 'Uncomplicated Firewall',
  usage: 'ufw [status [numbered] | enable | disable | default POLICY DIRECTION | allow|deny RULE | delete RULE]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // Real ufw refuses everything (status included) without root.
    if (ctx.user !== 'root') {
      return { output: '', exitCode: 1, error: ROOT_ERROR };
    }
    const host = ctx.host;
    if (!host) {
      return { output: '', exitCode: 1, error: 'ERROR: problem running ufw' };
    }
    const fw = host.firewall;
    const [sub, ...rest] = args.positional;

    // Real-ufw confirmation before an action that could cut this ssh session.
    const confirmSshDisrupt = (proceed: () => CommandResult): CommandResult =>
      ctx.requestInput(SSH_DISRUPT_PROMPT, false, answer => {
        const a = answer.trim().toLowerCase();
        if (a !== 'y' && a !== 'yes') return { output: 'Aborted', exitCode: 1 };
        const result = proceed();
        // If applying the change cut THIS session's own inbound path, drop it.
        // The source is the previous session frame (where the ssh came from).
        if (
          result.exitCode === 0 &&
          ctx.host && ctx.sessionSourceHost &&
          port22Blocked(ctx.host, ctx.sessionSourceHost) &&
          ctx.popSession
        ) {
          const closed = ctx.host.hostname;
          ctx.popSession();
          return { ...result, output: `${result.output}\nConnection to ${closed} closed by remote host.` };
        }
        return result;
      });
    const overSsh = (ctx.sessionDepth ?? 1) > 1;

    if (sub === 'status') {
      return { output: statusOutput(fw, rest[0] === 'numbered'), exitCode: 0 };
    }

    if (sub === 'enable') {
      const proceed = (): CommandResult => {
        fw.enabled = true;
        return { output: 'Firewall is active and enabled on system startup', exitCode: 0 };
      };
      if (overSsh && enableWouldBlock22(fw)) {
        return confirmSshDisrupt(proceed);
      }
      return proceed();
    }

    if (sub === 'disable') {
      fw.enabled = false;
      return { output: 'Firewall stopped and disabled on system startup', exitCode: 0 };
    }

    if (sub === 'default') {
      const [policy, direction] = rest;
      if ((policy !== 'allow' && policy !== 'deny') || (direction !== 'incoming' && direction !== 'outgoing')) {
        return { output: '', exitCode: 1, error: 'ERROR: Unsupported policy' };
      }
      const proceed = (): CommandResult => {
        if (direction === 'incoming') fw.defaultIncoming = policy;
        else fw.defaultOutgoing = policy;
        return {
          output: `Default ${direction} policy changed to '${policy}'\n(be sure to update your rules accordingly)`,
          exitCode: 0,
        };
      };
      if (policy === 'deny' && direction === 'incoming' && overSsh && !hasAllow22(fw)) {
        return confirmSshDisrupt(proceed);
      }
      return proceed();
    }

    if (sub === 'allow' || sub === 'deny') {
      const rule = parseRuleTokens(sub, rest);
      if (!rule) {
        return { output: '', exitCode: 1, error: 'ERROR: Wrong number of arguments' };
      }
      if (fw.rules.some(r => sameRule(r, rule))) {
        return { output: 'Skipping adding existing rule', exitCode: 0 };
      }
      fw.rules.push(rule);
      return { output: 'Rule added', exitCode: 0 };
    }

    if (sub === 'delete') {
      // By 1-based number: 'delete 2'.
      if (/^\d+$/.test(rest[0] ?? '')) {
        const index = parseInt(rest[0], 10);
        if (index < 1 || index > fw.rules.length) {
          return { output: '', exitCode: 1, error: NO_SUCH_RULE };
        }
        fw.rules.splice(index - 1, 1);
        return { output: 'Rule deleted', exitCode: 0 };
      }
      // By rule: 'delete allow 22/tcp'.
      if (rest[0] === 'allow' || rest[0] === 'deny') {
        const rule = parseRuleTokens(rest[0], rest.slice(1));
        const index = rule ? fw.rules.findIndex(r => sameRule(r, rule)) : -1;
        if (index === -1) {
          return { output: '', exitCode: 1, error: NO_SUCH_RULE };
        }
        fw.rules.splice(index, 1);
        return { output: 'Rule deleted', exitCode: 0 };
      }
      return { output: '', exitCode: 1, error: NO_SUCH_RULE };
    }

    return { output: '', exitCode: 1, error: `ERROR: Invalid syntax\nUsage: ${ufwCommand.usage}` };
  },

  getCompletions(partial: string): Completion[] {
    const verbs = ['status', 'enable', 'disable', 'default', 'allow', 'deny', 'delete'];
    return verbs
      .filter(v => v.startsWith(partial))
      .map(v => ({ value: v, display: v, type: 'argument' as const }));
  },
};

export const firewallCommands: ShellCommand[] = [ufwCommand];
