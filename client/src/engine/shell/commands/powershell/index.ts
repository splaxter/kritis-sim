/**
 * PowerShell Commands
 * Windows PowerShell cmdlet implementations
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';
import { HASHERS, toBytes } from '../linux/extended';

// ============================================================================
// Navigation Commands
// ============================================================================

export const getLocationCommand: ShellCommand = {
  name: 'Get-Location',
  aliases: ['pwd', 'gl'],
  description: 'Gets the current working location',
  usage: 'Get-Location',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = ctx.vfs.getCurrentPath();
    return {
      output: `\nPath\n----\n${path}\n`,
      exitCode: 0,
    };
  },
};

export const setLocationCommand: ShellCommand = {
  name: 'Set-Location',
  aliases: ['cd', 'sl', 'chdir'],
  description: 'Sets the current working location',
  usage: 'Set-Location [-Path] <path>',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0] || ctx.vfs.getEnv('USERPROFILE') || 'C:\\';
    const result = ctx.vfs.setCurrentPath(path);

    if (!result.ok) {
      return { output: '', exitCode: 1, error: `Set-Location : Cannot find path '${path}' because it does not exist.` };
    }

    return { output: '', exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial).filter(c => c.type === 'directory');
  },
};

export const getChildItemCommand: ShellCommand = {
  name: 'Get-ChildItem',
  aliases: ['dir', 'ls', 'gci'],
  description: 'Gets the items in one or more specified locations',
  usage: 'Get-ChildItem [[-Path] <path>] [-Recurse] [-Force]',
  options: [
    { long: 'Path', description: 'Path to list', takesValue: true },
    { long: 'Recurse', description: 'Get items recursively' },
    { long: 'Force', description: 'Include hidden items' },
    { long: 'Name', description: 'Return only names' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0] || '.';
    const recurse = args.flags['Recurse'] || args.flags['R'];
    const force = args.flags['Force'];
    const nameOnly = args.flags['Name'];

    const resolved = ctx.vfs.resolvePath(path);
    const result = ctx.vfs.readDirectory(resolved);

    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    let entries = result.value;
    if (!force) {
      entries = entries.filter(e => !e.name.startsWith('.'));
    }

    if (nameOnly) {
      return { output: entries.map(e => e.name).join('\n'), exitCode: 0 };
    }

    const lines = [
      '',
      `    Directory: ${resolved}`,
      '',
      'Mode   LastWriteTime       Length  Name',
      '----   -------------       ------  ----',
    ];

    for (const entry of entries) {
      const mode = entry.type === 'directory' ? 'd----' : '-a---';
      const date = entry.modified.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      const time = entry.modified.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateTime = `${date} ${time}`.padEnd(18);
      const size = entry.type === 'directory' ? '' : entry.size.toString();

      lines.push(`${mode}  ${dateTime}  ${size.padStart(6)}  ${entry.name}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ============================================================================
// File Content Commands
// ============================================================================

export const getContentCommand: ShellCommand = {
  name: 'Get-Content',
  aliases: ['cat', 'type', 'gc'],
  description: 'Gets the content of an item',
  usage: 'Get-Content [-Path] <path>',
  options: [
    { long: 'Path', description: 'Path to file', takesValue: true },
    { long: 'Head', description: 'Get first N lines', takesValue: true },
    { long: 'TotalCount', description: 'Get first N lines', takesValue: true },
    { long: 'Tail', description: 'Get last N lines', takesValue: true },
    { long: 'Raw', description: 'Return the entire file as a single string' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0];

    if (!path) {
      return { output: '', exitCode: 1, error: 'Get-Content : Cannot bind argument to parameter \'Path\' because it is null.' };
    }

    const result = ctx.vfs.readFile(path);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    let content = result.value;
    const head = args.options['Head'] || args.options['TotalCount'] || args.options['First'];
    const tail = args.options['Tail'] || args.options['Last'];

    if (head || tail) {
      // Split into real lines; a trailing newline must not add a phantom line.
      const lines = content.split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const sliced = head
        ? lines.slice(0, parseInt(head, 10))
        : lines.slice(-parseInt(tail as string, 10));
      content = sliced.join('\n');
    }

    return { output: content, exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const setContentCommand: ShellCommand = {
  name: 'Set-Content',
  aliases: ['sc'],
  description: 'Writes content to a file',
  usage: 'Set-Content [-Path] <path> [-Value] <content>',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0];
    const value = args.options['Value'] || args.positional.slice(1).join(' ');

    if (!path) {
      return { output: '', exitCode: 1, error: 'Set-Content : Cannot bind argument to parameter \'Path\' because it is null.' };
    }

    const result = ctx.vfs.writeFile(path, value);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    return { output: '', exitCode: 0 };
  },
};

export const selectStringCommand: ShellCommand = {
  name: 'Select-String',
  aliases: ['sls'],
  description: 'Finds text in strings and files',
  usage: 'Select-String [-Pattern] <pattern> [-Path] <path>',
  options: [
    { long: 'Pattern', description: 'Pattern to search for', takesValue: true },
    { long: 'Path', description: 'Path to search', takesValue: true },
    { long: 'CaseSensitive', description: 'Case sensitive search' },
    { long: 'SimpleMatch', description: 'Treat the pattern as a literal string' },
    { long: 'NotMatch', description: 'Return lines that do NOT match' },
    { long: 'Quiet', description: 'Return only True/False' },
    { long: 'List', description: 'Return only the first match per file' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const pattern = args.options['Pattern'] || args.positional[0];
    const paths = args.options['Path']
      ? [args.options['Path']]
      : args.positional.slice(1);
    const caseSensitive = !!args.flags['CaseSensitive'];
    const simple = !!args.flags['SimpleMatch'];
    const notMatch = !!args.flags['NotMatch'];
    const quiet = !!args.flags['Quiet'];
    const listOnly = !!args.flags['List'];
    // Colorize the match only on the terminal, not through a pipe/redirect.
    const colorize = ctx.isTty !== false;

    if (!pattern) {
      return { output: '', exitCode: 1, error: 'Select-String : Cannot bind argument to parameter \'Pattern\' because it is null.' };
    }

    const source = simple ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern;
    let test: RegExp;
    let highlight: RegExp;
    try {
      test = new RegExp(source, caseSensitive ? '' : 'i');
      highlight = new RegExp(source, caseSensitive ? 'g' : 'gi');
    } catch {
      return { output: '', exitCode: 1, error: `Select-String : Invalid pattern '${pattern}'` };
    }

    const RED = '\x1b[31m';
    const RESET = '\x1b[0m';
    const results: string[] = [];
    let any = false;

    // Real Select-String prefixes `file:line:` only when searching files, and
    // prints the bare line for pipeline (stdin) input.
    const scan = (content: string, label: string | null): void => {
      const lines = content.split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      for (let i = 0; i < lines.length; i++) {
        const hit = test.test(lines[i]);
        if (hit === notMatch) continue;
        any = true;
        if (quiet) return;
        const shown = colorize && !notMatch
          ? lines[i].replace(highlight, m => `${RED}${m}${RESET}`)
          : lines[i];
        results.push(label ? `${label}:${i + 1}:${shown}` : shown);
        if (listOnly) return;
      }
    };

    if (paths.length === 0) {
      scan(ctx.stdin ?? '', null);
    } else {
      for (const path of paths) {
        const content = ctx.vfs.readFile(path);
        if (!content.ok) {
          return { output: '', exitCode: 1, error: `Select-String : Cannot find path '${path}' because it does not exist.` };
        }
        scan(content.value, ctx.vfs.basename(path));
      }
    }

    if (quiet) {
      return { output: any ? 'True' : 'False', exitCode: any ? 0 : 1 };
    }
    return { output: results.join('\n'), exitCode: any ? 0 : 1 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ============================================================================
// File Management Commands
// ============================================================================

export const newItemCommand: ShellCommand = {
  name: 'New-Item',
  aliases: ['ni'],
  description: 'Creates a new item',
  usage: 'New-Item [-Path] <path> [-ItemType] <type>',
  options: [
    { long: 'Path', description: 'Path for new item', takesValue: true },
    { long: 'ItemType', description: 'Type: File or Directory', takesValue: true },
    { long: 'Force', description: 'Overwrite existing item' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0];
    const itemType = (args.options['ItemType'] || args.positional[1] || 'File').toLowerCase();

    if (!path) {
      return { output: '', exitCode: 1, error: 'New-Item : Cannot bind argument to parameter \'Path\' because it is null.' };
    }

    if (itemType === 'directory') {
      const result = ctx.vfs.mkdir(path, false);
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
    } else {
      const result = ctx.vfs.writeFile(path, '');
      if (!result.ok) {
        return { output: '', exitCode: 1, error: result.error };
      }
    }

    const now = new Date();
    const dateStr = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
    return {
      output: `
    Directory: ${ctx.vfs.dirname(path)}

Mode   LastWriteTime       Length  Name
----   -------------       ------  ----
${itemType === 'directory' ? 'd----' : '-a---'}  ${dateStr.padEnd(18)}       0  ${ctx.vfs.basename(path)}
`,
      exitCode: 0,
    };
  },
};

export const removeItemCommand: ShellCommand = {
  name: 'Remove-Item',
  aliases: ['rm', 'del', 'rd', 'ri', 'erase'],
  description: 'Deletes items',
  usage: 'Remove-Item [-Path] <path> [-Recurse] [-Force]',
  options: [
    { long: 'Path', description: 'Path to remove', takesValue: true },
    { long: 'Recurse', description: 'Remove recursively' },
    { long: 'Force', description: 'Force removal' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0];
    const recurse = args.flags['Recurse'];

    if (!path) {
      return { output: '', exitCode: 1, error: 'Remove-Item : Cannot bind argument to parameter \'Path\' because it is null.' };
    }

    const result = ctx.vfs.remove(path, recurse);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    return { output: '', exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

export const copyItemCommand: ShellCommand = {
  name: 'Copy-Item',
  aliases: ['cp', 'copy', 'ci', 'cpi'],
  description: 'Copies an item from one location to another',
  usage: 'Copy-Item [-Path] <source> [-Destination] <dest>',
  options: [
    { long: 'Path', description: 'Source path', takesValue: true },
    { long: 'Destination', description: 'Destination path', takesValue: true },
    { long: 'Recurse', description: 'Copy recursively' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const src = args.options['Path'] || args.positional[0];
    const dest = args.options['Destination'] || args.positional[1];
    const recurse = args.flags['Recurse'];

    if (!src || !dest) {
      return { output: '', exitCode: 1, error: 'Copy-Item : Missing required parameter.' };
    }

    const result = ctx.vfs.copy(src, dest, recurse);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    return { output: '', exitCode: 0 };
  },
};

export const moveItemCommand: ShellCommand = {
  name: 'Move-Item',
  aliases: ['mv', 'move', 'mi'],
  description: 'Moves an item from one location to another',
  usage: 'Move-Item [-Path] <source> [-Destination] <dest>',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const src = args.options['Path'] || args.positional[0];
    const dest = args.options['Destination'] || args.positional[1];

    if (!src || !dest) {
      return { output: '', exitCode: 1, error: 'Move-Item : Missing required parameter.' };
    }

    const result = ctx.vfs.move(src, dest);
    if (!result.ok) {
      return { output: '', exitCode: 1, error: result.error };
    }

    return { output: '', exitCode: 0 };
  },
};

// ============================================================================
// Network Commands
// ============================================================================

export const testNetConnectionCommand: ShellCommand = {
  name: 'Test-NetConnection',
  aliases: ['tnc'],
  description: 'Tests network connectivity',
  usage: 'Test-NetConnection [-ComputerName] <host> [-Port] <port>',
  options: [
    { long: 'ComputerName', description: 'Target computer', takesValue: true },
    { long: 'Port', description: 'TCP port to test', takesValue: true },
    { long: 'InformationLevel', description: 'Detail level', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const host = args.options['ComputerName'] || args.positional[0] || 'localhost';
    const port = args.options['Port'] || args.positional[1];

    // Simulated network responses
    const portResponses: Record<string, boolean> = {
      '8.8.8.8:53': true,
      '10.0.0.1:22': true,
      '10.0.0.1:80': true,
      '10.0.0.1:443': true,
      '10.0.0.1:8443': false,
      '192.168.1.1:80': true,
      'localhost:80': true,
      'localhost:443': false,
    };

    if (port) {
      const key = `${host}:${port}`;
      const tcpSuccess = portResponses[key] ?? Math.random() > 0.5;

      const lines = [
        '',
        `ComputerName     : ${host}`,
        `RemoteAddress    : ${host.match(/^\d/) ? host : '10.0.0.' + Math.floor(Math.random() * 255)}`,
        `RemotePort       : ${port}`,
        `InterfaceAlias   : Ethernet`,
        `SourceAddress    : 10.0.0.50`,
        `TcpTestSucceeded : ${tcpSuccess}`,
        '',
      ];

      return { output: lines.join('\n'), exitCode: tcpSuccess ? 0 : 1 };
    }

    // Ping test (no port)
    const reachable = !host.includes('unreachable');
    const latency = Math.floor(Math.random() * 50) + 5;

    const lines = [
      '',
      `ComputerName           : ${host}`,
      `RemoteAddress          : ${host.match(/^\d/) ? host : '10.0.0.' + Math.floor(Math.random() * 255)}`,
      `InterfaceAlias         : Ethernet`,
      `SourceAddress          : 10.0.0.50`,
      `PingSucceeded          : ${reachable}`,
      `PingReplyDetails (RTT) : ${latency} ms`,
      '',
    ];

    return { output: lines.join('\n'), exitCode: reachable ? 0 : 1 };
  },
};

export const testConnectionCommand: ShellCommand = {
  name: 'Test-Connection',
  description: 'Sends ICMP echo request packets (ping)',
  usage: 'Test-Connection [-TargetName] <host> [-Count] <n>',
  options: [
    { long: 'TargetName', description: 'Target to ping', takesValue: true },
    { long: 'Count', description: 'Number of pings', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const host = args.options['TargetName'] || args.positional[0] || 'localhost';
    const count = parseInt(args.options['Count'] || '4', 10);

    const lines = [
      '',
      'Destination: ' + host,
      '',
      'Ping  Source         Address        Latency(ms)  Status',
      '----  ------         -------        -----------  ------',
    ];

    const addr = host.match(/^\d/) ? host : '10.0.0.100';
    for (let i = 0; i < count; i++) {
      const latency = Math.floor(Math.random() * 30) + 5;
      lines.push(`${(i + 1).toString().padStart(4)}  ${'WORKSTATION01'.padEnd(13)}  ${addr.padEnd(13)}  ${latency.toString().padStart(11)}  Success`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const getNetIPAddressCommand: ShellCommand = {
  name: 'Get-NetIPAddress',
  description: 'Gets IP address configuration',
  usage: 'Get-NetIPAddress',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const lines = [
      '',
      'IPAddress         : 10.0.0.50',
      'InterfaceIndex    : 12',
      'InterfaceAlias    : Ethernet',
      'AddressFamily     : IPv4',
      'Type              : Unicast',
      'PrefixLength      : 24',
      'PrefixOrigin      : Manual',
      'SuffixOrigin      : Manual',
      'AddressState      : Preferred',
      'ValidLifetime     : Infinite',
      'PreferredLifetime : Infinite',
      'SkipAsSource      : False',
      '',
      'IPAddress         : 127.0.0.1',
      'InterfaceIndex    : 1',
      'InterfaceAlias    : Loopback Pseudo-Interface 1',
      'AddressFamily     : IPv4',
      'Type              : Unicast',
      'PrefixLength      : 8',
      '',
    ];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const getNetIPConfigurationCommand: ShellCommand = {
  name: 'Get-NetIPConfiguration',
  aliases: ['gip'],
  description: 'Gets IP network configuration',
  usage: 'Get-NetIPConfiguration',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const lines = [
      '',
      'InterfaceAlias       : Ethernet',
      'InterfaceIndex       : 12',
      'InterfaceDescription : Intel(R) Ethernet Connection',
      'NetProfile.Name      : Unternehmensnetzwerk',
      'IPv4Address          : 10.0.0.50',
      'IPv4DefaultGateway   : 10.0.0.1',
      'DNSServer            : 8.8.8.8, 8.8.4.4',
      '',
    ];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const getDnsClientServerAddressCommand: ShellCommand = {
  name: 'Get-DnsClientServerAddress',
  description: 'Gets DNS server address settings',
  usage: 'Get-DnsClientServerAddress',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const lines = [
      '',
      'InterfaceAlias                Index  Family  ServerAddresses',
      '--------------                -----  ------  ---------------',
      'Ethernet                         12  IPv4    {8.8.8.8, 8.8.4.4}',
      'Ethernet                         12  IPv6    {2001:4860:4860::8888}',
      'Loopback Pseudo-Interface 1       1  IPv4    {}',
      '',
    ];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const setDnsClientServerAddressCommand: ShellCommand = {
  name: 'Set-DnsClientServerAddress',
  description: 'Sets DNS server addresses',
  usage: 'Set-DnsClientServerAddress -InterfaceIndex <n> -ServerAddresses <addresses>',
  options: [
    { long: 'InterfaceIndex', description: 'Network interface index', takesValue: true },
    { long: 'InterfaceAlias', description: 'Network interface name', takesValue: true },
    { long: 'ServerAddresses', description: 'DNS server addresses', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const addresses = args.options['ServerAddresses'];

    if (!addresses) {
      return { output: '', exitCode: 1, error: 'Set-DnsClientServerAddress : Missing required parameter ServerAddresses.' };
    }

    return {
      output: `[DNS Server addresses set to: ${addresses}]`,
      exitCode: 0,
    };
  },
};

export const resolveDnsNameCommand: ShellCommand = {
  name: 'Resolve-DnsName',
  description: 'Performs a DNS name query resolution',
  usage: 'Resolve-DnsName [-Name] <name> [-Type] <type>',
  options: [
    { long: 'Name', description: 'DNS name to resolve', takesValue: true },
    { long: 'Type', description: 'Record type (A, AAAA, MX, etc.)', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const name = args.options['Name'] || args.positional[0];
    const type = (args.options['Type'] || 'A').toUpperCase();

    if (!name) {
      return { output: '', exitCode: 1, error: 'Resolve-DnsName : Cannot bind argument to parameter \'Name\' because it is null.' };
    }

    // Simulated DNS responses
    const responses: Record<string, Record<string, string[]>> = {
      'google.com': {
        'A': ['142.250.185.78'],
        'AAAA': ['2a00:1450:4001:82a::200e'],
      },
      'example.com': {
        'A': ['93.184.216.34'],
      },
    };

    const records = responses[name.toLowerCase()]?.[type];

    if (!records) {
      return { output: '', exitCode: 1, error: `Resolve-DnsName : ${name} : DNS name does not exist` };
    }

    const lines = [
      '',
      `Name                                           Type   TTL   Section    ${type === 'A' ? 'IPAddress' : 'NameHost'}`,
      `----                                           ----   ---   -------    ---------`,
    ];

    for (const record of records) {
      lines.push(`${name.padEnd(46)} ${type.padEnd(6)} 300   Answer     ${record}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

// ============================================================================
// Process Commands
// ============================================================================

export const getProcessCommand: ShellCommand = {
  name: 'Get-Process',
  aliases: ['ps', 'gps'],
  description: 'Gets the processes running on the local computer',
  usage: 'Get-Process [[-Name] <name>]',
  options: [
    { long: 'Name', description: 'Process name', takesValue: true },
    { long: 'Id', description: 'Process ID', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const nameFilter = args.options['Name'] || args.positional[0];

    const processes = [
      { name: 'System', pid: 4, cpu: 0.5, mem: 8.2, ws: 128 },
      { name: 'svchost', pid: 456, cpu: 1.2, mem: 25.5, ws: 32768 },
      { name: 'explorer', pid: 1234, cpu: 2.1, mem: 85.3, ws: 98304 },
      { name: 'powershell', pid: 5678, cpu: 0.8, mem: 120.5, ws: 145920 },
      { name: 'notepad', pid: 7890, cpu: 0.1, mem: 12.3, ws: 15360 },
      { name: 'chrome', pid: 9012, cpu: 15.2, mem: 512.8, ws: 524288 },
    ];

    const filtered = nameFilter
      ? processes.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()))
      : processes;

    const lines = [
      '',
      'Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName',
      '-------  ------  -----   -----   ------    --  -----------',
    ];

    for (const p of filtered) {
      const handles = Math.floor(Math.random() * 500 + 100);
      const npm = Math.floor(Math.random() * 30 + 5);
      const pm = Math.floor(p.mem * 1024);
      lines.push(
        `${handles.toString().padStart(7)}  ${npm.toString().padStart(6)}  ${pm.toString().padStart(5)}  ${p.ws.toString().padStart(6)}  ${p.cpu.toFixed(2).padStart(7)}  ${p.pid.toString().padStart(4)}  ${p.name}`
      );
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const stopProcessCommand: ShellCommand = {
  name: 'Stop-Process',
  aliases: ['kill', 'spps'],
  description: 'Stops one or more running processes',
  usage: 'Stop-Process -Id <pid> [-Force]',
  options: [
    { long: 'Id', description: 'Process ID', takesValue: true },
    { long: 'Name', description: 'Process name', takesValue: true },
    { long: 'Force', description: 'Force stop' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const id = args.options['Id'] || args.positional[0];
    const name = args.options['Name'];

    if (!id && !name) {
      return { output: '', exitCode: 1, error: 'Stop-Process : Missing required parameter.' };
    }

    return {
      output: `[Process ${id || name} stopped]`,
      exitCode: 0,
    };
  },
};

// ============================================================================
// Service Commands
// ============================================================================

export const getServiceCommand: ShellCommand = {
  name: 'Get-Service',
  aliases: ['gsv'],
  description: 'Gets the services on the computer',
  usage: 'Get-Service [[-Name] <name>]',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const nameFilter = args.options['Name'] || args.positional[0];

    const services = [
      { name: 'wuauserv', displayName: 'Windows Update', status: 'Running' },
      { name: 'Spooler', displayName: 'Print Spooler', status: 'Running' },
      { name: 'BITS', displayName: 'Background Intelligent Transfer Service', status: 'Running' },
      { name: 'W32Time', displayName: 'Windows Time', status: 'Running' },
      { name: 'WSearch', displayName: 'Windows Search', status: 'Stopped' },
    ];

    const filtered = nameFilter
      ? services.filter(s => s.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
                            s.displayName.toLowerCase().includes(nameFilter.toLowerCase()))
      : services;

    const lines = [
      '',
      'Status   Name               DisplayName',
      '------   ----               -----------',
    ];

    for (const s of filtered) {
      lines.push(`${s.status.padEnd(8)} ${s.name.padEnd(18)} ${s.displayName}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

// ============================================================================
// Pipeline Commands (line-oriented emulation of the object pipeline)
// ============================================================================

export const sortObjectCommand: ShellCommand = {
  name: 'Sort-Object',
  aliases: ['sort'],
  description: 'Sorts objects by property values',
  usage: 'Sort-Object [-Descending] [-Unique]',
  options: [
    { long: 'Descending', description: 'Sort in descending order' },
    { long: 'Unique', description: 'Eliminate duplicates' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
    const descending = !!args.flags['Descending'];
    const unique = !!args.flags['Unique'];

    let lines = ctx.stdin.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();

    lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (descending) lines.reverse();
    if (unique) lines = [...new Set(lines)];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const selectObjectCommand: ShellCommand = {
  name: 'Select-Object',
  aliases: ['select'],
  description: 'Selects objects or object properties',
  usage: 'Select-Object [-First <n>] [-Last <n>] [-Unique]',
  options: [
    { long: 'First', description: 'Select the first N objects', takesValue: true },
    { long: 'Last', description: 'Select the last N objects', takesValue: true },
    { long: 'Unique', description: 'Return only unique objects' },
    { long: 'Skip', description: 'Skip the first N objects', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
    let lines = ctx.stdin.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();

    if (args.options['Skip']) lines = lines.slice(parseInt(args.options['Skip'], 10));
    if (args.options['First']) lines = lines.slice(0, parseInt(args.options['First'], 10));
    if (args.options['Last']) lines = lines.slice(-parseInt(args.options['Last'], 10));
    if (args.flags['Unique']) lines = [...new Set(lines)];

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const measureObjectCommand: ShellCommand = {
  name: 'Measure-Object',
  aliases: ['measure'],
  description: 'Calculates numeric properties and counts of objects',
  usage: 'Measure-Object [-Line] [-Word] [-Character]',
  options: [
    { long: 'Line', description: 'Count lines' },
    { long: 'Word', description: 'Count words' },
    { long: 'Character', description: 'Count characters' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const content = ctx.stdin ?? '';
    const lines = content === '' ? [] : content.replace(/\n$/, '').split('\n');
    const line = !!args.flags['Line'];
    const word = !!args.flags['Word'];
    const char = !!args.flags['Character'];

    if (line || word || char) {
      const lineCount = lines.length;
      const wordCount = lines.reduce((n, l) => n + (l.trim() ? l.trim().split(/\s+/).length : 0), 0);
      const charCount = content.length;
      const header = [
        line ? 'Lines'.padStart(6) : '',
        word ? 'Words'.padStart(6) : '',
        char ? 'Characters'.padStart(11) : '',
      ].filter(Boolean).join(' ');
      const rule = [
        line ? '-----'.padStart(6) : '',
        word ? '-----'.padStart(6) : '',
        char ? '----------'.padStart(11) : '',
      ].filter(Boolean).join(' ');
      const row = [
        line ? String(lineCount).padStart(6) : '',
        word ? String(wordCount).padStart(6) : '',
        char ? String(charCount).padStart(11) : '',
      ].filter(Boolean).join(' ');
      return { output: `\n${header}\n${rule}\n${row}\n`, exitCode: 0 };
    }

    // Default: just the object count, in PowerShell's property-list format.
    return {
      output: `\nCount    : ${lines.length}\nAverage  : \nSum      : \nMaximum  : \nMinimum  : \nProperty : \n`,
      exitCode: 0,
    };
  },
};

export const whereObjectCommand: ShellCommand = {
  name: 'Where-Object',
  aliases: ['where', '?'],
  description: 'Selects objects from a collection based on their property values',
  usage: "Where-Object { $_ -match 'pattern' }",

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
    const lines = ctx.stdin.replace(/\n$/, '').split('\n');

    // Support both `Where-Object { $_ -match 'x' }` and the simple comparison
    // form `Where-Object Status -eq Running`. $_ / the property both map to the
    // whole text line in this line-oriented emulation.
    const raw = args.raw.replace(/^\s*(Where-Object|where|\?)\s*/i, '').trim();
    const body = raw.replace(/^\{|\}$/g, '').replace(/\$_/g, '').trim();

    const m = body.match(/(-\w+)\s+(.+)$/);
    if (!m) {
      // No recognizable filter — pass everything through.
      return { output: lines.join('\n'), exitCode: 0 };
    }
    const op = m[1].toLowerCase();
    const operand = m[2].trim().replace(/^['"]|['"]$/g, '');

    const keep = (l: string): boolean => {
      switch (op) {
        case '-match': return new RegExp(operand, 'i').test(l);
        case '-notmatch': return !new RegExp(operand, 'i').test(l);
        case '-like': return new RegExp('^' + operand.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(l);
        case '-eq': return l.trim().toLowerCase() === operand.toLowerCase();
        case '-ne': return l.trim().toLowerCase() !== operand.toLowerCase();
        case '-gt': return parseFloat(l) > parseFloat(operand);
        case '-lt': return parseFloat(l) < parseFloat(operand);
        case '-ge': return parseFloat(l) >= parseFloat(operand);
        case '-le': return parseFloat(l) <= parseFloat(operand);
        default: return true;
      }
    };

    return { output: lines.filter(keep).join('\n'), exitCode: 0 };
  },
};

export const forEachObjectCommand: ShellCommand = {
  name: 'ForEach-Object',
  aliases: ['foreach', '%'],
  description: 'Performs an operation on each item in a collection',
  usage: "ForEach-Object { ... }",

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // Only the identity/pass-through case is meaningful in a text pipeline.
    return { output: ctx.stdin ?? '', exitCode: 0 };
  },
};

export const groupObjectCommand: ShellCommand = {
  name: 'Group-Object',
  aliases: ['group'],
  description: 'Groups objects that contain the same value for specified properties',
  usage: 'Group-Object [-NoElement]',
  options: [
    { long: 'NoElement', description: 'Omit the members of each group' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
    const noElement = !!args.flags['NoElement'];
    const lines = ctx.stdin.replace(/\n$/, '').split('\n');

    // Group identical lines, preserving first-appearance order (the PowerShell
    // equivalent of `sort | uniq -c`). $_ maps to the whole text line here.
    const order: string[] = [];
    const groups = new Map<string, string[]>();
    for (const l of lines) {
      if (!groups.has(l)) { groups.set(l, []); order.push(l); }
      groups.get(l)!.push(l);
    }

    const out = ['', 'Count Name                      Group', '----- ----                      -----'];
    for (const key of order) {
      const members = groups.get(key)!;
      const count = members.length.toString().padStart(5);
      const name = key.length > 25 ? key.slice(0, 22) + '...' : key.padEnd(25);
      const group = noElement ? '' : `{${members.slice(0, 4).join(', ')}${members.length > 4 ? '...' : ''}}`;
      out.push(`${count} ${name} ${group}`.trimEnd());
    }
    return { output: out.join('\n'), exitCode: 0 };
  },
};

export const getUniqueCommand: ShellCommand = {
  name: 'Get-Unique',
  aliases: ['gu'],
  description: 'Returns unique items from a sorted list',
  usage: 'Get-Unique',

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (ctx.stdin === undefined) return { output: '', exitCode: 0 };
    const lines = ctx.stdin.replace(/\n$/, '').split('\n');
    // Like uniq: collapse only ADJACENT duplicates (expects sorted input).
    const out: string[] = [];
    for (const l of lines) {
      if (out.length === 0 || out[out.length - 1] !== l) out.push(l);
    }
    return { output: out.join('\n'), exitCode: 0 };
  },
};

// Format-* and Out-String reshape objects for display; in this text-oriented
// pipeline they pass their input straight through so composed pipelines work.
export const formatTableCommand: ShellCommand = {
  name: 'Format-Table',
  aliases: ['ft'],
  description: 'Formats the output as a table',
  usage: 'Format-Table',
  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    return { output: ctx.stdin ?? '', exitCode: 0 };
  },
};

export const formatListCommand: ShellCommand = {
  name: 'Format-List',
  aliases: ['fl'],
  description: 'Formats the output as a list of properties',
  usage: 'Format-List',
  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    return { output: ctx.stdin ?? '', exitCode: 0 };
  },
};

export const outStringCommand: ShellCommand = {
  name: 'Out-String',
  description: 'Sends objects to the host as a series of strings',
  usage: 'Out-String',
  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    return { output: ctx.stdin ?? '', exitCode: 0 };
  },
};

export const outNullCommand: ShellCommand = {
  name: 'Out-Null',
  description: 'Deletes output instead of sending it down the pipeline',
  usage: 'Out-Null',
  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    return { output: '', exitCode: 0 };
  },
};

// ============================================================================
// Integrity / IOC Commands
// ============================================================================

export const getFileHashCommand: ShellCommand = {
  name: 'Get-FileHash',
  description: 'Computes the hash value for a file using a specified algorithm',
  usage: 'Get-FileHash [-Path] <file> [-Algorithm <SHA256|SHA1|MD5>]',
  options: [
    { long: 'Path', description: 'Path to the file', takesValue: true },
    { long: 'Algorithm', description: 'Hash algorithm (default SHA256)', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const path = args.options['Path'] || args.positional[0];
    if (!path) {
      return { output: '', exitCode: 1, error: 'Get-FileHash : Cannot bind argument to parameter \'Path\' because it is null.' };
    }
    const algorithm = (args.options['Algorithm'] || 'SHA256').toUpperCase();
    const hasher = HASHERS[algorithm];
    if (!hasher) {
      return {
        output: '',
        exitCode: 1,
        error: `Get-FileHash : Der Wert "${algorithm}" kann nicht in den Typ "Algorithm" konvertiert werden. Gültig: SHA1, SHA256, MD5.`,
      };
    }
    const file = ctx.vfs.readFile(path);
    if (!file.ok) {
      return { output: '', exitCode: 1, error: `Get-FileHash : Cannot find path '${path}' because it does not exist.` };
    }
    // PowerShell renders hashes in uppercase, as an Algorithm/Hash/Path table.
    const hash = hasher(toBytes(file.value)).toUpperCase();
    const resolved = ctx.vfs.resolvePath(path);
    const lines = [
      '',
      'Algorithm       Hash                                                                   Path',
      '---------       ----                                                                   ----',
      `${algorithm.padEnd(15)} ${hash.padEnd(70)} ${resolved}`,
      '',
    ];
    return { output: lines.join('\n'), exitCode: 0 };
  },

  getCompletions(partial: string, ctx: CompletionContext): Completion[] {
    return ctx.vfs.getPathCompletions(partial);
  },
};

// ============================================================================
// Utility Commands
// ============================================================================

export const writeOutputCommand: ShellCommand = {
  name: 'Write-Output',
  aliases: ['echo', 'write'],
  description: 'Sends objects to the success pipeline',
  usage: 'Write-Output [-InputObject] <object>',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // With arguments, echo them; otherwise pass pipeline input straight through.
    if (args.positional.length > 0) {
      return { output: args.positional.join(' '), exitCode: 0 };
    }
    return { output: ctx.stdin ?? '', exitCode: 0 };
  },
};

export const clearHostCommand: ShellCommand = {
  name: 'Clear-Host',
  aliases: ['cls', 'clear'],
  description: 'Clears the display in the host program',
  usage: 'Clear-Host',

  execute(_args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    return { output: '', exitCode: 0, clearScreen: true };
  },
};

export const getHelpCommand: ShellCommand = {
  name: 'Get-Help',
  aliases: ['help', 'man'],
  description: 'Displays information about PowerShell commands',
  usage: 'Get-Help [[-Name] <command>]',

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const command = args.options['Name'] || args.positional[0];

    if (!command) {
      return {
        output: `TOPIC
    Windows PowerShell Help System

KURZBESCHREIBUNG
    Zeigt Hilfe zu PowerShell-Cmdlets und -Konzepten an.

SYNTAX
    Get-Help [[-Name] <String>]

VERFÜGBARE CMDLETS
    Datei-Cmdlets:     Get-ChildItem, Get-Content, Set-Content, Select-String, New-Item, Remove-Item, Copy-Item, Move-Item
    Netzwerk-Cmdlets:  Test-NetConnection, Test-Connection, Get-NetIPAddress, Resolve-DnsName
    Prozess-Cmdlets:   Get-Process, Stop-Process, Get-Service
    Pipeline-Cmdlets:  Where-Object, Select-Object, Sort-Object, Measure-Object, Group-Object, Get-Unique, ForEach-Object, Format-Table, Format-List
    Allgemein:         Get-Help, Clear-Host, Write-Output, Get-History

Tippen Sie "Get-Help <cmdlet>" für Details zu einem bestimmten Cmdlet.`,
        exitCode: 0,
      };
    }

    // Generate the help page from the cmdlet's own metadata (registry lookup
    // is case-insensitive), instead of a generic stub.
    const lower = command.toLowerCase();
    const cmd = ctx.commands
      ? [...ctx.commands.values()].find(c => c.name.toLowerCase() === lower)
      : undefined;

    if (!cmd) {
      return {
        output: '',
        exitCode: 1,
        error: `Get-Help : Get-Help konnte keine Hilfedateien für '${command}' auf diesem Computer finden.`,
      };
    }

    const lines = [
      'NAME',
      `    ${cmd.name}`,
      '',
      'ÜBERSICHT',
      `    ${cmd.description}`,
      '',
      'SYNTAX',
      `    ${cmd.usage}`,
    ];
    if (cmd.aliases && cmd.aliases.length > 0) {
      lines.push('', 'ALIASE', `    ${cmd.aliases.join(', ')}`);
    }
    if (cmd.options && cmd.options.length > 0) {
      lines.push('', 'PARAMETER');
      for (const opt of cmd.options) {
        lines.push(`    -${opt.long ?? opt.short}`);
        lines.push(`        ${opt.description}`);
        lines.push('');
      }
    }
    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const getHistoryCommand: ShellCommand = {
  name: 'Get-History',
  aliases: ['h', 'history', 'ghy'],
  description: 'Gets a list of the commands entered during the current session',
  usage: 'Get-History [-Count <n>]',
  options: [
    { long: 'Count', description: 'Number of entries', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const count = args.options['Count'] ? parseInt(args.options['Count'], 10) : undefined;
    const history = count ? ctx.shell.history.slice(-count) : ctx.shell.history;

    const lines = [
      '',
      '  Id CommandLine',
      '  -- -----------',
    ];

    history.forEach((entry, i) => {
      lines.push(`  ${(i + 1).toString().padStart(2)} ${entry.command}`);
    });

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const getDateCommand: ShellCommand = {
  name: 'Get-Date',
  description: 'Gets the current date and time',
  usage: 'Get-Date [-Format <format>]',
  options: [
    { long: 'Format', description: 'Date format string', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const now = new Date();
    const format = args.options['Format'];

    if (format) {
      // Simple format handling
      let output = format
        .replace(/yyyy/g, now.getFullYear().toString())
        .replace(/MM/g, (now.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/dd/g, now.getDate().toString().padStart(2, '0'))
        .replace(/HH/g, now.getHours().toString().padStart(2, '0'))
        .replace(/mm/g, now.getMinutes().toString().padStart(2, '0'))
        .replace(/ss/g, now.getSeconds().toString().padStart(2, '0'));
      return { output, exitCode: 0 };
    }

    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    return {
      output: `\n${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()} ${now.toTimeString().slice(0, 8)}\n`,
      exitCode: 0,
    };
  },
};

// ============================================================================
// Export All Commands
// ============================================================================

export const allPowerShellCommands: ShellCommand[] = [
  // Navigation
  getLocationCommand,
  setLocationCommand,
  getChildItemCommand,
  // File content
  getContentCommand,
  setContentCommand,
  selectStringCommand,
  // File management
  newItemCommand,
  removeItemCommand,
  copyItemCommand,
  moveItemCommand,
  // Network
  testNetConnectionCommand,
  testConnectionCommand,
  getNetIPAddressCommand,
  getNetIPConfigurationCommand,
  getDnsClientServerAddressCommand,
  setDnsClientServerAddressCommand,
  resolveDnsNameCommand,
  // Process/Service
  getProcessCommand,
  stopProcessCommand,
  getServiceCommand,
  // Pipeline
  sortObjectCommand,
  selectObjectCommand,
  measureObjectCommand,
  whereObjectCommand,
  forEachObjectCommand,
  groupObjectCommand,
  getUniqueCommand,
  formatTableCommand,
  formatListCommand,
  outStringCommand,
  outNullCommand,
  // Integrity
  getFileHashCommand,
  // Utility
  writeOutputCommand,
  clearHostCommand,
  getHelpCommand,
  getHistoryCommand,
  getDateCommand,
];
