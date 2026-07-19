/**
 * Linux Shell Built-in Commands
 * help, clear, history, man, alias, exit, type, which, sudo
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';

export const helpCommand: ShellCommand = {
  name: 'help',
  description: 'Display help information',
  usage: 'help [command]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length > 0) {
      // Help for specific command — answer from the real registry.
      const cmdName = args.positional[0];
      const cmd = ctx.commands?.get(cmdName);
      if (!cmd) {
        return {
          output: '',
          exitCode: 1,
          error: `bash: help: no help topics match \`${cmdName}'. Try \`man ${cmdName}'.`,
        };
      }
      const lines = [`${cmdName}: ${cmd.usage}`, `    ${cmd.description}`];
      if (cmd.options && cmd.options.length > 0) {
        lines.push('');
        lines.push('    Options:');
        for (const opt of cmd.options) {
          const names = [opt.short ? `-${opt.short}` : '', opt.long ? `--${opt.long}` : '']
            .filter(Boolean).join(', ');
          lines.push(`      ${names.padEnd(24)} ${opt.description}`);
        }
      }
      return { output: lines.join('\n'), exitCode: 0 };
    }

    const output = `GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)
Diese Shell-Befehle sind intern definiert. Tippen Sie \`help' um diese Liste zu sehen.

Verfügbare Befehle:
  Navigation:     cd, pwd, ls, tree
  Dateien:        cat, head, tail, less, touch, mkdir, rm, cp, mv, chmod
  Suche:          grep, find
  Text:           echo, sort, uniq, cut, wc, sed, awk, tr, nl, tac, rev
  Analyse:        base64, sha256sum, md5sum, strings, xxd, stat, file, tee
  System:         whoami, hostname, uname, id, date, uptime, ps, kill, df, du, free
  Netzwerk:       ping, ifconfig, ip, netstat, dig, nslookup, curl, wget
  Shell:          help, history, clear, exit, export, env, alias, man, which, type
  Sonstiges:      sudo

Tippen Sie \`help name' für mehr Informationen über \`name'.
Tippen Sie \`man name' für die Manualseite von \`name'.`;

    return { output, exitCode: 0 };
  },
};

export const clearCommand: ShellCommand = {
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear the terminal screen',
  usage: 'clear',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    return {
      output: '',
      exitCode: 0,
      clearScreen: true,
    };
  },
};

export const historyCommand: ShellCommand = {
  name: 'history',
  description: 'Display command history',
  usage: 'history [n]',
  options: [
    { short: 'c', description: 'Clear the history list' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.flags['c']) {
      ctx.shell.history = [];
      return { output: '', exitCode: 0 };
    }

    const limit = args.positional[0] ? parseInt(args.positional[0], 10) : undefined;
    const history = ctx.shell.history;
    const entries = limit ? history.slice(-limit) : history;
    const startIndex = limit ? Math.max(0, history.length - limit) : 0;

    const lines = entries.map((entry, i) =>
      `${(startIndex + i + 1).toString().padStart(5)}  ${entry.command}`
    );

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const manCommand: ShellCommand = {
  name: 'man',
  description: 'Display manual pages',
  usage: 'man command',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'What manual page do you want?' };
    }

    const command = args.positional[0];

    // Simplified man pages
    const manPages: Record<string, string> = {
      'ls': `LS(1)                            User Commands                           LS(1)

NAME
       ls - list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List  information  about  the FILEs (the current directory by default).
       Sort entries alphabetically if none of -cftuvSUX nor --sort is specified.

       -a, --all
              do not ignore entries starting with .

       -l     use a long listing format

       -h, --human-readable
              with -l, print sizes in human readable format

       -R, --recursive
              list subdirectories recursively

       --color[=WHEN]
              colorize the output

SEE ALSO
       Full documentation <https://www.gnu.org/software/coreutils/ls>`,

      'grep': `GREP(1)                          User Commands                         GREP(1)

NAME
       grep - print lines that match patterns

SYNOPSIS
       grep [OPTION...] PATTERNS [FILE...]

DESCRIPTION
       grep  searches  for  PATTERNS  in  each  FILE.   PATTERNS  is  one  or
       more patterns separated by newline characters, and grep prints each line that matches a pattern.

       -i, --ignore-case
              Ignore case distinctions in patterns and input data

       -v, --invert-match
              Invert the sense of matching, to select non-matching lines.

       -n, --line-number
              Prefix each line of output with the line number within its input file.

       -r, --recursive
              Read all files under each directory, recursively

       -c, --count
              Suppress normal output; instead print a count of matching lines for each input file.

SEE ALSO
       Full documentation <https://www.gnu.org/software/grep/>`,

      'cat': `CAT(1)                           User Commands                          CAT(1)

NAME
       cat - concatenate files and print on the standard output

SYNOPSIS
       cat [OPTION]... [FILE]...

DESCRIPTION
       Concatenate FILE(s) to standard output.

       -n, --number
              number all output lines

       -b, --number-nonblank
              number nonempty output lines, overrides -n

EXAMPLES
       cat f g
              Output f's contents, then g's contents.

       cat
              Copy standard input to standard output.

SEE ALSO
       Full documentation <https://www.gnu.org/software/coreutils/cat>`,
    };

    const page = manPages[command];
    if (page) {
      return { output: page, exitCode: 0 };
    }

    // No handwritten page — generate one from the command's own metadata so
    // every registered command has a real man page instead of an error.
    const cmd = _ctx.commands?.get(command);
    if (!cmd) {
      return { output: '', exitCode: 16, error: `No manual entry for ${command}` };
    }

    const title = `${command.toUpperCase()}(1)`;
    const mid = 'User Commands';
    const gap = ' '.repeat(Math.max(1, Math.floor((72 - title.length * 2 - mid.length) / 2)));
    const header = `${title}${gap}${mid}${gap}${title}`;
    const lines = [
      header,
      '',
      'NAME',
      `       ${cmd.name} - ${cmd.description.toLowerCase()}`,
      '',
      'SYNOPSIS',
      `       ${cmd.usage}`,
    ];
    if (cmd.options && cmd.options.length > 0) {
      lines.push('', 'DESCRIPTION');
      for (const opt of cmd.options) {
        const names = [opt.short ? `-${opt.short}` : '', opt.long ? `--${opt.long}` : '']
          .filter(Boolean).join(', ');
        lines.push(`       ${names}`);
        lines.push(`              ${opt.description}`);
        lines.push('');
      }
    }
    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const aliasCommand: ShellCommand = {
  name: 'alias',
  description: 'Define or display aliases',
  usage: 'alias [name[=value]]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      // List all aliases
      const aliases = ctx.shell.aliases;
      const lines = Object.entries(aliases).map(([name, value]) =>
        `alias ${name}='${value}'`
      );
      return { output: lines.join('\n'), exitCode: 0 };
    }

    for (const arg of args.positional) {
      const match = arg.match(/^(\w+)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        ctx.shell.aliases[name] = value;
      } else {
        // Show specific alias
        const value = ctx.shell.aliases[arg];
        if (value) {
          return { output: `alias ${arg}='${value}'`, exitCode: 0 };
        } else {
          return { output: '', exitCode: 1, error: `alias: ${arg}: not found` };
        }
      }
    }

    return { output: '', exitCode: 0 };
  },
};

export const unaliasCommand: ShellCommand = {
  name: 'unalias',
  description: 'Remove alias definitions',
  usage: 'unalias name...',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'unalias: usage: unalias name ...' };
    }

    for (const name of args.positional) {
      delete ctx.shell.aliases[name];
    }

    return { output: '', exitCode: 0 };
  },
};

export const exitCommand: ShellCommand = {
  name: 'exit',
  aliases: ['logout'],
  description: 'Exit the shell',
  usage: 'exit [n]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const code = args.positional[0] ? parseInt(args.positional[0], 10) : 0;
    // Inside an ssh session, exit closes the remote session instead of the
    // shell; like real ssh it propagates the remote exit status. No 'exit'
    // solution side-effect here — closing a remote session must not count as
    // the player leaving the terminal level.
    if ((ctx.sessionDepth ?? 1) > 1 && ctx.popSession) {
      const popped = ctx.popSession();
      if (popped) {
        return {
          output: `logout\nConnection to ${popped.closedHostname} closed.`,
          exitCode: code,
        };
      }
    }
    return {
      output: 'logout',
      exitCode: code,
      sideEffects: [{ type: 'solution', payload: { action: 'exit' } }],
    };
  },
};

export const typeCommand: ShellCommand = {
  name: 'type',
  description: 'Display information about command type',
  usage: 'type name...',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'type: usage: type name ...' };
    }

    const outputs: string[] = [];
    const errors: string[] = [];

    for (const name of args.positional) {
      // Check if it's an alias
      if (ctx.shell.aliases[name]) {
        outputs.push(`${name} is aliased to \`${ctx.shell.aliases[name]}'`);
        continue;
      }

      // Check if it's a builtin
      const builtins = ['cd', 'pwd', 'echo', 'export', 'alias', 'exit', 'history', 'type', 'source', 'help', 'unalias'];
      if (builtins.includes(name)) {
        outputs.push(`${name} is a shell builtin`);
        continue;
      }

      // Only claim a path for commands that actually exist here.
      if (ctx.commands?.has(name)) {
        outputs.push(`${name} is /usr/bin/${name}`);
      } else {
        errors.push(`bash: type: ${name}: not found`);
      }
    }

    return {
      output: outputs.join('\n'),
      exitCode: errors.length > 0 ? 1 : 0,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  },
};

export const whichCommand: ShellCommand = {
  name: 'which',
  description: 'Locate a command',
  usage: 'which command...',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1 };
    }

    const outputs: string[] = [];
    let missing = 0;

    for (const name of args.positional) {
      // Real which: print the path only for commands that exist, stay silent
      // and exit non-zero otherwise.
      if (ctx.commands?.has(name)) {
        outputs.push(`/usr/bin/${name}`);
      } else {
        missing++;
      }
    }

    return { output: outputs.join('\n'), exitCode: missing > 0 ? 1 : 0 };
  },
};

export const sudoCommand: ShellCommand = {
  name: 'sudo',
  description: 'Execute a command as another user',
  usage: 'sudo command [args]',
  options: [
    { short: 'u', long: 'user', description: 'Run command as specified user', takesValue: true },
    { short: 's', long: 'shell', description: 'Run a shell' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const interactiveError: CommandResult = {
      output: '',
      exitCode: 1,
      error: 'sudo: an interactive shell is not available here, run `sudo COMMAND` instead',
    };

    // No wrapped command word: the -i/-s the parser saw (if any) are sudo's OWN
    // options. `sudo -i`/`sudo -s` request an interactive shell; bare `sudo` is
    // a usage error. Crucially we must NOT reach here for `sudo sed -i ...`,
    // where -i belongs to the wrapped command (positional[0] === 'sed').
    if (args.positional.length === 0) {
      if (args.flags['s'] || args.flags['shell'] || args.flags['i']) {
        return interactiveError;
      }
      return {
        output: '',
        exitCode: 1,
        error: 'usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command [args]',
      };
    }

    // Actually run the command as root (NOPASSWD-style, like most lab VMs):
    // temporarily switch the VFS user so permission checks pass, then restore.
    // Rebuild the command from the raw input — going through args.positional
    // would drop the inner command's own flags (e.g. `sudo cat -n file`,
    // `sudo sed -i ...`). Consume sudo's OWN leading options here so a wrapped
    // command's flags never get misread as sudo's.
    let command = args.raw.replace(/^\s*sudo\s+/, '');
    let runAs = 'root';
    for (;;) {
      const userOpt = command.match(/^(?:-u\s+|--user[= ])(\S+)\s+/);
      if (userOpt) {
        runAs = userOpt[1];
        command = command.slice(userOpt[0].length);
        continue;
      }
      // -i/-s BEFORE the wrapped command word = sudo's own interactive request.
      if (/^(-i|-s|--shell)(\s+|$)/.test(command)) {
        return interactiveError;
      }
      break;
    }
    const previousUser = ctx.vfs.getUser();
    ctx.vfs.setUser(runAs);
    try {
      if (ctx.execute) {
        return ctx.execute(command);
      }
      return { output: '', exitCode: 1, error: `sudo: ${command}: command not found` };
    } finally {
      ctx.vfs.setUser(previousUser);
    }
  },
};

export const sourceCommand: ShellCommand = {
  name: 'source',
  aliases: ['.'],
  description: 'Execute commands from a file in the current shell',
  usage: 'source filename',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'source: filename argument required' };
    }

    const file = args.positional[0];
    const result = ctx.vfs.readFile(file);

    if (!result.ok) {
      return { output: '', exitCode: 1, error: `bash: ${file}: No such file or directory` };
    }

    // Actually execute the file line by line, like a real `source`.
    const outputs: string[] = [];
    const errors: string[] = [];
    let exitCode = 0;
    for (const line of result.value.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !ctx.execute) continue;
      const res = ctx.execute(trimmed);
      if (res.output) outputs.push(res.output);
      if (res.error) errors.push(res.error);
      exitCode = res.exitCode;
    }

    return {
      output: outputs.join('\n'),
      exitCode,
      error: errors.length > 0 ? errors.join('\n') : undefined,
    };
  },
};

export const builtinCommands: ShellCommand[] = [
  helpCommand,
  clearCommand,
  historyCommand,
  manCommand,
  aliasCommand,
  unaliasCommand,
  exitCommand,
  typeCommand,
  whichCommand,
  sudoCommand,
  sourceCommand,
];
