/**
 * Linux System Information Commands
 * whoami, hostname, uname, id, uptime, date, df, du, free, ps, kill, env, export
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult } from '../../types';

export const whoamiCommand: ShellCommand = {
  name: 'whoami',
  description: 'Print effective user ID',
  usage: 'whoami',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    return { output: ctx.user, exitCode: 0 };
  },
};

export const hostnameCommand: ShellCommand = {
  name: 'hostname',
  description: 'Show or set the system hostname',
  usage: 'hostname',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const hostname = ctx.vfs.getEnv('HOSTNAME') || 'localhost';
    return { output: hostname, exitCode: 0 };
  },
};

export const unameCommand: ShellCommand = {
  name: 'uname',
  description: 'Print system information',
  usage: 'uname [OPTIONS]',
  options: [
    { short: 'a', long: 'all', description: 'Print all information' },
    { short: 's', long: 'kernel-name', description: 'Print the kernel name' },
    { short: 'r', long: 'kernel-release', description: 'Print the kernel release' },
    { short: 'n', long: 'nodename', description: 'Print the network node hostname' },
    { short: 'm', long: 'machine', description: 'Print the machine hardware name' },
    { short: 'o', long: 'operating-system', description: 'Print the operating system' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const all = args.flags['a'] || args.flags['all'];
    const kernelName = args.flags['s'] || args.flags['kernel-name'];
    const kernelRelease = args.flags['r'] || args.flags['kernel-release'];
    const nodename = args.flags['n'] || args.flags['nodename'];
    const machine = args.flags['m'] || args.flags['machine'];
    const os = args.flags['o'] || args.flags['operating-system'];

    const hostname = ctx.vfs.getEnv('HOSTNAME') || 'server';

    const info = {
      kernel: 'Linux',
      release: '5.15.0-91-generic',
      node: hostname,
      machine: 'x86_64',
      os: 'GNU/Linux',
    };

    if (all) {
      return {
        output: `${info.kernel} ${info.node} ${info.release} #101-Ubuntu SMP x86_64 ${info.machine} ${info.os}`,
        exitCode: 0,
      };
    }

    const parts: string[] = [];
    if (kernelName || (!kernelRelease && !nodename && !machine && !os)) {
      parts.push(info.kernel);
    }
    if (nodename) parts.push(info.node);
    if (kernelRelease) parts.push(info.release);
    if (machine) parts.push(info.machine);
    if (os) parts.push(info.os);

    return { output: parts.join(' ') || info.kernel, exitCode: 0 };
  },
};

export const idCommand: ShellCommand = {
  name: 'id',
  description: 'Print user and group IDs',
  usage: 'id [USER]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const user = args.positional[0] || ctx.user;
    const isRoot = user === 'root';

    const uid = isRoot ? 0 : 1000;
    const gid = isRoot ? 0 : 1000;
    const groups = isRoot
      ? 'root'
      : `${user} adm cdrom sudo dip plugdev lpadmin sambashare`;

    return {
      output: `uid=${uid}(${user}) gid=${gid}(${user}) groups=${gid}(${groups})`,
      exitCode: 0,
    };
  },
};

export const uptimeCommand: ShellCommand = {
  name: 'uptime',
  description: 'Show how long the system has been running',
  usage: 'uptime',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const days = Math.floor(Math.random() * 30) + 1;
    const hours = Math.floor(Math.random() * 24);
    const mins = Math.floor(Math.random() * 60);
    const users = Math.floor(Math.random() * 5) + 1;
    const load1 = (Math.random() * 2).toFixed(2);
    const load5 = (Math.random() * 1.5).toFixed(2);
    const load15 = (Math.random() * 1).toFixed(2);

    return {
      output: ` ${time} up ${days} days, ${hours}:${mins.toString().padStart(2, '0')}, ${users} users, load average: ${load1}, ${load5}, ${load15}`,
      exitCode: 0,
    };
  },
};

export const dateCommand: ShellCommand = {
  name: 'date',
  description: 'Print or set the system date and time',
  usage: 'date [+FORMAT]',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const now = new Date();

    if (args.positional.length > 0 && args.positional[0].startsWith('+')) {
      const format = args.positional[0].slice(1);
      let output = format;

      const replacements: Record<string, string> = {
        '%Y': now.getFullYear().toString(),
        '%m': (now.getMonth() + 1).toString().padStart(2, '0'),
        '%d': now.getDate().toString().padStart(2, '0'),
        '%H': now.getHours().toString().padStart(2, '0'),
        '%M': now.getMinutes().toString().padStart(2, '0'),
        '%S': now.getSeconds().toString().padStart(2, '0'),
        '%F': `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
        '%T': `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
        '%s': Math.floor(now.getTime() / 1000).toString(),
      };

      for (const [key, value] of Object.entries(replacements)) {
        output = output.replace(new RegExp(key, 'g'), value);
      }

      return { output, exitCode: 0 };
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dateStr = `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate().toString().padStart(2)} ${now.toTimeString().slice(0, 8)} CET ${now.getFullYear()}`;

    return { output: dateStr, exitCode: 0 };
  },
};

export const dfCommand: ShellCommand = {
  name: 'df',
  description: 'Report file system disk space usage',
  usage: 'df [OPTIONS] [FILE...]',
  options: [
    { short: 'h', long: 'human-readable', description: 'Print sizes in human readable format' },
    { short: 'T', description: 'Print file system type' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const humanReadable = args.flags['h'] || args.flags['human-readable'];
    const showType = args.flags['T'];

    const formatSize = (gb: number): string => {
      if (!humanReadable) return (gb * 1024 * 1024).toString();
      if (gb >= 1) return `${gb}G`;
      return `${Math.round(gb * 1024)}M`;
    };

    const filesystems = [
      { fs: '/dev/sda1', type: 'ext4', size: 50, used: 23, mount: '/' },
      { fs: '/dev/sda2', type: 'ext4', size: 200, used: 89, mount: '/home' },
      { fs: 'tmpfs', type: 'tmpfs', size: 8, used: 0.5, mount: '/tmp' },
      { fs: '/dev/sdb1', type: 'ext4', size: 500, used: 234, mount: '/var' },
    ];

    const header = showType
      ? 'Filesystem     Type      Size  Used Avail Use% Mounted on'
      : 'Filesystem     Size  Used Avail Use% Mounted on';

    const lines = [header];

    for (const fs of filesystems) {
      const avail = fs.size - fs.used;
      const usePercent = Math.round((fs.used / fs.size) * 100);

      if (showType) {
        lines.push(
          `${fs.fs.padEnd(14)} ${fs.type.padEnd(9)} ${formatSize(fs.size).padStart(5)} ${formatSize(fs.used).padStart(5)} ${formatSize(avail).padStart(5)} ${usePercent.toString().padStart(3)}% ${fs.mount}`
        );
      } else {
        lines.push(
          `${fs.fs.padEnd(14)} ${formatSize(fs.size).padStart(5)} ${formatSize(fs.used).padStart(5)} ${formatSize(avail).padStart(5)} ${usePercent.toString().padStart(3)}% ${fs.mount}`
        );
      }
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const duCommand: ShellCommand = {
  name: 'du',
  description: 'Estimate file space usage',
  usage: 'du [OPTIONS] [FILE...]',
  options: [
    { short: 'h', long: 'human-readable', description: 'Print sizes in human readable format' },
    { short: 's', long: 'summarize', description: 'Display only a total for each argument' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const humanReadable = args.flags['h'] || args.flags['human-readable'];
    const summarize = args.flags['s'] || args.flags['summarize'];
    const paths = args.positional.length > 0 ? args.positional : ['.'];

    const formatSize = (bytes: number): string => {
      if (!humanReadable) return bytes.toString();
      if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
      if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
      return bytes.toString();
    };

    const lines: string[] = [];

    function calculateSize(path: string): number {
      const stat = ctx.vfs.stat(path);
      if (!stat.ok) return 0;

      if (stat.value.type === 'file') {
        return stat.value.size;
      }

      let total = 4096; // Directory overhead
      const entries = ctx.vfs.readDirectory(path);
      if (entries.ok) {
        for (const entry of entries.value) {
          const entryPath = ctx.vfs.join(path, entry.name);
          const entrySize = calculateSize(entryPath);
          total += entrySize;

          if (!summarize) {
            lines.push(`${formatSize(entrySize).padStart(8)}\t${entryPath}`);
          }
        }
      }
      return total;
    }

    for (const path of paths) {
      const resolved = ctx.vfs.resolvePath(path);
      const size = calculateSize(resolved);
      lines.push(`${formatSize(size).padStart(8)}\t${resolved}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const freeCommand: ShellCommand = {
  name: 'free',
  description: 'Display amount of free and used memory',
  usage: 'free [OPTIONS]',
  options: [
    { short: 'h', long: 'human', description: 'Show human-readable output' },
    { short: 'm', description: 'Display in megabytes' },
    { short: 'g', description: 'Display in gigabytes' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const human = args.flags['h'] || args.flags['human'];
    const mega = args.flags['m'];
    const giga = args.flags['g'];

    // Simulated memory stats
    const total = 16 * 1024 * 1024; // 16GB in KB
    const used = Math.floor(total * 0.45);
    const free = Math.floor(total * 0.15);
    const shared = Math.floor(total * 0.02);
    const cache = Math.floor(total * 0.38);
    const available = free + cache;

    const swapTotal = 8 * 1024 * 1024;
    const swapUsed = Math.floor(swapTotal * 0.1);
    const swapFree = swapTotal - swapUsed;

    const format = (kb: number): string => {
      if (human) {
        if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)}Gi`;
        if (kb >= 1024) return `${(kb / 1024).toFixed(0)}Mi`;
        return `${kb}Ki`;
      }
      if (giga) return Math.floor(kb / 1024 / 1024).toString();
      if (mega) return Math.floor(kb / 1024).toString();
      return kb.toString();
    };

    const lines = [
      '              total        used        free      shared  buff/cache   available',
      `Mem:    ${format(total).padStart(11)} ${format(used).padStart(11)} ${format(free).padStart(11)} ${format(shared).padStart(11)} ${format(cache).padStart(11)} ${format(available).padStart(11)}`,
      `Swap:   ${format(swapTotal).padStart(11)} ${format(swapUsed).padStart(11)} ${format(swapFree).padStart(11)}`,
    ];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const psCommand: ShellCommand = {
  name: 'ps',
  description: 'Report process status',
  usage: 'ps [OPTIONS]',
  options: [
    { short: 'a', description: 'Select all processes except session leaders' },
    { short: 'u', description: 'Display user-oriented format' },
    { short: 'x', description: 'Select processes without controlling ttys' },
    { short: 'e', description: 'Select all processes' },
    { short: 'f', description: 'Full format listing' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const all = args.flags['a'] || args.flags['e'];
    const userFormat = args.flags['u'];
    const full = args.flags['f'];

    const processes = [
      { pid: 1, user: 'root', cpu: '0.0', mem: '0.2', vsz: 169936, rss: 11328, tty: '?', stat: 'Ss', start: '09:00', time: '0:02', command: '/sbin/init' },
      { pid: 456, user: 'root', cpu: '0.0', mem: '0.1', vsz: 42088, rss: 3944, tty: '?', stat: 'Ss', start: '09:00', time: '0:00', command: '/usr/sbin/sshd -D' },
      { pid: 789, user: ctx.user, cpu: '0.1', mem: '0.5', vsz: 21468, rss: 5324, tty: 'pts/0', stat: 'Ss', start: '10:15', time: '0:00', command: '-bash' },
      { pid: 1234, user: 'www-data', cpu: '0.5', mem: '1.2', vsz: 345678, rss: 23456, tty: '?', stat: 'S', start: '09:01', time: '0:15', command: '/usr/sbin/apache2 -k start' },
      { pid: 2345, user: 'mysql', cpu: '2.1', mem: '8.5', vsz: 1567890, rss: 456789, tty: '?', stat: 'Sl', start: '09:00', time: '5:23', command: '/usr/sbin/mysqld' },
      { pid: 3456, user: ctx.user, cpu: '0.0', mem: '0.1', vsz: 11320, rss: 2456, tty: 'pts/0', stat: 'R+', start: '10:30', time: '0:00', command: 'ps aux' },
    ];

    let filteredProcesses = all ? processes : processes.filter(p => p.user === ctx.user || p.tty !== '?');

    if (userFormat) {
      const header = 'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND';
      const lines = filteredProcesses.map(p =>
        `${p.user.padEnd(12)} ${p.pid.toString().padStart(5)} ${p.cpu.padStart(4)} ${p.mem.padStart(4)} ${p.vsz.toString().padStart(6)} ${p.rss.toString().padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start} ${p.time.padStart(6)} ${p.command}`
      );
      return { output: [header, ...lines].join('\n'), exitCode: 0 };
    }

    if (full) {
      const header = 'UID          PID    PPID  C STIME TTY          TIME CMD';
      const lines = filteredProcesses.map(p =>
        `${p.user.padEnd(12)} ${p.pid.toString().padStart(5)} ${Math.floor(p.pid / 2).toString().padStart(7)}  0 ${p.start} ${p.tty.padEnd(12)} ${p.time} ${p.command}`
      );
      return { output: [header, ...lines].join('\n'), exitCode: 0 };
    }

    // Default format
    const header = '    PID TTY          TIME CMD';
    const lines = filteredProcesses.map(p =>
      `${p.pid.toString().padStart(7)} ${p.tty.padEnd(12)} ${p.time} ${p.command.split(' ')[0]}`
    );
    return { output: [header, ...lines].join('\n'), exitCode: 0 };
  },
};

export const killCommand: ShellCommand = {
  name: 'kill',
  description: 'Send a signal to a process',
  usage: 'kill [-SIGNAL] PID...',
  options: [
    { short: '9', description: 'SIGKILL - Force kill' },
    { short: '15', description: 'SIGTERM - Terminate (default)' },
    { short: 'l', description: 'List signal names' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.flags['l']) {
      return {
        output: ' 1) SIGHUP       2) SIGINT       3) SIGQUIT      4) SIGILL\n 5) SIGTRAP      6) SIGABRT      7) SIGBUS       8) SIGFPE\n 9) SIGKILL     10) SIGUSR1     11) SIGSEGV     12) SIGUSR2\n13) SIGPIPE     14) SIGALRM     15) SIGTERM     16) SIGSTKFLT',
        exitCode: 0,
      };
    }

    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]' };
    }

    const signal = args.flags['9'] ? 'SIGKILL' : 'SIGTERM';
    const pids = args.positional;

    // Simulate kill (always succeeds in our simulation)
    return {
      output: '',
      exitCode: 0,
    };
  },
};

export const envCommand: ShellCommand = {
  name: 'env',
  description: 'Print environment variables',
  usage: 'env',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const env = ctx.env;
    const vfsEnv: Record<string, string> = {};

    // Get VFS environment variables
    for (const key of ['USER', 'HOME', 'PWD', 'PATH', 'SHELL', 'TERM', 'LANG', 'HOSTNAME']) {
      const val = ctx.vfs.getEnv(key);
      if (val) vfsEnv[key] = val;
    }

    const allEnv = { ...vfsEnv, ...env };
    const lines = Object.entries(allEnv).map(([k, v]) => `${k}=${v}`);
    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const exportCommand: ShellCommand = {
  name: 'export',
  description: 'Set environment variables',
  usage: 'export NAME=VALUE',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      // List exported variables
      const env = ctx.env;
      const lines = Object.entries(env).map(([k, v]) => `declare -x ${k}="${v}"`);
      return { output: lines.join('\n'), exitCode: 0 };
    }

    for (const arg of args.positional) {
      const match = arg.match(/^(\w+)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        ctx.shell.env[name] = value;
        ctx.vfs.setEnv(name, value);
      } else {
        // Just export existing variable (no-op in our simulation)
      }
    }

    return { output: '', exitCode: 0 };
  },
};

export const systemCommands: ShellCommand[] = [
  whoamiCommand,
  hostnameCommand,
  unameCommand,
  idCommand,
  uptimeCommand,
  dateCommand,
  dfCommand,
  duCommand,
  freeCommand,
  psCommand,
  killCommand,
  envCommand,
  exportCommand,
];
