/**
 * ansible-playbook — runs a playbook from the current host (the controller)
 * against registered hosts, connecting like ssh (key auth only).
 */
import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';
import { parsePlaybook } from '../../ansible/miniYaml';
import { parseInventory } from '../../ansible/inventory';
import { runPlaybook } from '../../ansible/runPlaybook';

const DEFAULT_INVENTORY = '/etc/ansible/hosts';

export const ansiblePlaybookCommand: ShellCommand = {
  name: 'ansible-playbook',
  description: 'Run Ansible playbooks against inventory hosts',
  usage: 'ansible-playbook [-i INVENTORY] [--check] [--diff] [--syntax-check] PLAYBOOK',
  options: [
    { short: 'i', long: 'inventory', description: 'Inventory file path', takesValue: true },
    { long: 'check', description: "Don't make any changes; predict them instead" },
    { long: 'diff', description: 'Show file differences when changing them' },
    { long: 'syntax-check', description: 'Perform a syntax check on the playbook, do not execute it' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const playbookArg = args.positional[0];
    if (!playbookArg) {
      return { output: '', exitCode: 1, error: 'ERROR! You must specify a playbook file to run' };
    }

    const path = ctx.vfs.resolvePath(playbookArg);
    const read = ctx.vfs.readFile(path);
    if (!read.ok) {
      return { output: '', exitCode: 1, error: `ERROR! the playbook: ${playbookArg} could not be found` };
    }

    const parsed = parsePlaybook(read.value);
    if (!parsed.ok) {
      return { output: '', exitCode: 4, error: parsed.error };
    }
    if (args.flags['syntax-check']) {
      return { output: `\nplaybook: ${path}`, exitCode: 0 };
    }

    if (!ctx.host || !ctx.resolveHost) {
      return { output: '', exitCode: 1, error: 'ansible-playbook: no host context available' };
    }

    const warnings: string[] = [];
    const invPath = args.options['i'] ?? args.options['inventory'] ?? DEFAULT_INVENTORY;
    const invRead = ctx.vfs.readFile(ctx.vfs.resolvePath(invPath));
    let inventory: Map<string, string[]>;
    if (!invRead.ok || invRead.value.trim() === '') {
      warnings.push('[WARNING]: No inventory was parsed, only implicit localhost is available');
      inventory = new Map([['all', []]]);
    } else {
      inventory = parseInventory(invRead.value);
    }

    const run = runPlaybook(parsed.plays, {
      controllerHost: ctx.host,
      controllerUser: ctx.user,
      resolveHost: ctx.resolveHost,
      inventory,
      check: Boolean(args.flags['check']),
      diff: Boolean(args.flags['diff']),
    });

    const output = warnings.length > 0 ? `${warnings.join('\n')}\n${run.output}` : run.output;
    return { output, exitCode: run.exitCode };
  },
};

export const ansibleCommands: ShellCommand[] = [ansiblePlaybookCommand];
