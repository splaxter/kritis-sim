/**
 * PowerShell Commands
 * Windows PowerShell cmdlet implementations
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';

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
    { long: 'Tail', description: 'Get last N lines', takesValue: true },
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

    if (args.options['Head']) {
      const n = parseInt(args.options['Head'], 10);
      content = content.split('\n').slice(0, n).join('\n');
    }

    if (args.options['Tail']) {
      const n = parseInt(args.options['Tail'], 10);
      content = content.split('\n').slice(-n).join('\n');
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
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const pattern = args.options['Pattern'] || args.positional[0];
    const paths = args.options['Path'] ? [args.options['Path']] : args.positional.slice(1);
    const caseSensitive = args.flags['CaseSensitive'];

    if (!pattern) {
      return { output: '', exitCode: 1, error: 'Select-String : Cannot bind argument to parameter \'Pattern\' because it is null.' };
    }

    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    const results: string[] = [];

    // Handle stdin
    if (paths.length === 0 && ctx.stdin) {
      const lines = ctx.stdin.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push(`stdin:${i + 1}:${line}`);
        }
        regex.lastIndex = 0;
      });
    }

    for (const path of paths) {
      const content = ctx.vfs.readFile(path);
      if (!content.ok) continue;

      const lines = content.value.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push(`${path}:${i + 1}:${line}`);
        }
        regex.lastIndex = 0;
      });
    }

    return { output: results.join('\n'), exitCode: results.length > 0 ? 0 : 1 };
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
// Utility Commands
// ============================================================================

export const writeOutputCommand: ShellCommand = {
  name: 'Write-Output',
  aliases: ['echo', 'write'],
  description: 'Sends objects to the success pipeline',
  usage: 'Write-Output [-InputObject] <object>',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const output = args.positional.join(' ');
    return { output, exitCode: 0 };
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

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
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
    Datei-Cmdlets:     Get-ChildItem, Get-Content, Set-Content, New-Item, Remove-Item, Copy-Item, Move-Item
    Netzwerk-Cmdlets:  Test-NetConnection, Test-Connection, Get-NetIPAddress, Resolve-DnsName
    Prozess-Cmdlets:   Get-Process, Stop-Process, Get-Service
    Allgemein:         Get-Help, Clear-Host, Write-Output, Get-History

Tippen Sie "Get-Help <cmdlet>" für Details zu einem bestimmten Cmdlet.`,
        exitCode: 0,
      };
    }

    return {
      output: `NAME
    ${command}

SYNTAX
    ${command} [CommonParameters]

BESCHREIBUNG
    Verwenden Sie "Get-Help ${command} -Detailed" für ausführliche Informationen.`,
      exitCode: 0,
    };
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
  // Utility
  writeOutputCommand,
  clearHostCommand,
  getHelpCommand,
  getHistoryCommand,
  getDateCommand,
];
