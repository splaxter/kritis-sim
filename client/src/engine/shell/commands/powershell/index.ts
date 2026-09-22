/**
 * PowerShell Commands
 * Windows PowerShell cmdlet implementations
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, Completion, CompletionContext } from '../../types';
import { emptyNetState, pingZiel, portMessen, aufloese, dnsAntwortet } from '../../netzwerk';
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

    // Operand-bound record (see linux cp): canonical source → final dest.
    const destStat = ctx.vfs.stat(dest);
    const finalDest =
      destStat.ok && destStat.value.type === 'directory'
        ? ctx.vfs.join(ctx.vfs.resolvePath(dest), ctx.vfs.basename(src))
        : ctx.vfs.resolvePath(dest);
    ctx.recordFileCopy?.(ctx.vfs.resolvePath(src), finalDest);

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

  /**
   * Misst gegen DASSELBE Netzbild wie `ping` und `nc` (siehe netzwerk.ts).
   *
   * Die frueheren Fassungen hatten eine eigene kleine Tabelle und fielen fuer
   * alles ausserhalb auf `Math.random() > 0.5` zurueck — ein Level, dessen
   * BEWEIS dieser Befehl ist („Port 8443 ist zu, 443 geht"), hat damit
   * gewuerfelt, und zwei Messungen desselben Ports konnten sich widersprechen.
   */
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const host = args.options['ComputerName'] || args.positional[0] || 'localhost';
    const portRoh = args.options['Port'] || args.positional[1];
    const net = ctx.net ?? emptyNetState();
    const quelleIp =
      ctx.host?.ip ??
      net.targets.find(z => z.host === ctx.host?.hostname)?.ip ??
      '10.0.0.50';

    if (portRoh) {
      const port = parseInt(portRoh, 10);
      const mess = portMessen(net, ctx.resolveHost, ctx.host, host, port, 'tcp');
      const offen = mess.lage === 'offen';
      const lines = [
        '',
        `ComputerName     : ${host}`,
        `RemoteAddress    : ${mess.ip}`,
        `RemotePort       : ${port}`,
        'InterfaceAlias   : Ethernet',
        `SourceAddress    : ${quelleIp}`,
        `TcpTestSucceeded : ${offen ? 'True' : 'False'}`,
        '',
      ];
      if (!offen) {
        lines.splice(1, 0, `WARNUNG: TCP connect to (${mess.ip} : ${port}) failed`);
      }
      return { output: lines.join('\n'), exitCode: offen ? 0 : 1 };
    }

    const mess = pingZiel(net, ctx.resolveHost, host);
    const lines = [
      '',
      `ComputerName           : ${host}`,
      `RemoteAddress          : ${mess.ip}`,
      'InterfaceAlias         : Ethernet',
      `SourceAddress          : ${quelleIp}`,
      `PingSucceeded          : ${mess.erreichbar ? 'True' : 'False'}`,
      `PingReplyDetails (RTT) : ${mess.erreichbar ? mess.latenz.toFixed(0) : '0'} ms`,
      '',
    ];
    if (mess.namensfehler) {
      lines.splice(1, 0, `WARNUNG: Name resolution of ${host} failed`);
    }
    return { output: lines.join('\n'), exitCode: mess.erreichbar ? 0 : 1 };
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

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const host = args.options['TargetName'] || args.positional[0] || 'localhost';
    const count = parseInt(args.options['Count'] || '4', 10);
    const net = ctx.net ?? emptyNetState();
    const mess = pingZiel(net, ctx.resolveHost, host);
    const quelle = ctx.host?.hostname ?? 'WORKSTATION01';

    const lines = [
      '',
      'Destination: ' + host,
      '',
      'Ping  Source         Address        Latency(ms)  Status',
      '----  ------         -------        -----------  ------',
    ];

    for (let i = 0; i < count; i++) {
      const latenz = mess.erreichbar ? (mess.latenz + i * 0.05).toFixed(0) : '*';
      const status = mess.erreichbar ? 'Success' : 'TimedOut';
      lines.push(
        `${(i + 1).toString().padStart(4)}  ${quelle.slice(0, 13).padEnd(13)}  ${mess.ip.padEnd(13)}  ${latenz.padStart(11)}  ${status}`
      );
    }

    return { output: lines.join('\n'), exitCode: mess.erreichbar ? 0 : 1 };
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

  execute(_args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const net = ctx.net ?? emptyNetState();
    const lines = [
      '',
      'InterfaceAlias                Index  Family  ServerAddresses',
      '--------------                -----  ------  ---------------',
      `Ethernet                         12  IPv4    {${net.dnsServers.join(', ')}}`,
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

  /**
   * Setzt die Resolver WIRKLICH — danach loest `Resolve-DnsName` wieder auf,
   * wenn der neue Server antwortet. Frueher gab der Befehl nur eine
   * Erfolgsmeldung aus, und ein Level konnte „Umgehung gebaut" nicht pruefen.
   */
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const addresses = args.options['ServerAddresses'];

    if (!addresses) {
      return { output: '', exitCode: 1, error: 'Set-DnsClientServerAddress : Missing required parameter ServerAddresses.' };
    }

    const neu = addresses
      .replace(/^[("']+|[)"']+$/g, '')
      .split(',')
      .map(a => a.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    if (ctx.net) ctx.net.dnsServers = neu;

    return { output: '', exitCode: 0 };
  },
};

export const resolveDnsNameCommand: ShellCommand = {
  name: 'Resolve-DnsName',
  description: 'Performs a DNS name query resolution',
  usage: 'Resolve-DnsName [-Name] <name> [-Type] <type>',
  options: [
    { long: 'Name', description: 'DNS name to resolve', takesValue: true },
    { long: 'Type', description: 'Record type (A, AAAA, MX, etc.)', takesValue: true },
    { long: 'Server', description: 'DNS server to query', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const name = args.options['Name'] || args.positional[0];
    const type = (args.options['Type'] || 'A').toUpperCase();

    if (!name) {
      return { output: '', exitCode: 1, error: 'Resolve-DnsName : Cannot bind argument to parameter \'Name\' because it is null.' };
    }

    const net = ctx.net ?? emptyNetState();
    const server = args.options['Server'];
    if ((server && net.dnsDown.includes(server)) || (!server && !dnsAntwortet(net))) {
      return {
        output: '',
        exitCode: 1,
        error: `Resolve-DnsName : ${name} : Zeitueberschreitung bei der DNS-Anforderung (DNS server failure)`,
      };
    }

    const auf = type === 'A' ? aufloese(net, ctx.resolveHost, name) : { fehler: 'unbekannt' as const };
    if (!auf.ip) {
      return { output: '', exitCode: 1, error: `Resolve-DnsName : ${name} : DNS name does not exist` };
    }

    const lines = [
      '',
      `Name                                           Type   TTL   Section    IPAddress`,
      `----                                           ----   ---   -------    ---------`,
      `${name.padEnd(46)} ${type.padEnd(6)} 300   Answer     ${auf.ip}`,
    ];

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

  /**
   * Liest die Prozesstabelle des HOSTS — dieselbe, die `Stop-Process`
   * veraendert und die ein Level saeen kann. Die frueheren sechs fest
   * verdrahteten Zeilen waren auf jeder Maschine dieselben, und ein beendeter
   * Prozess stand danach wieder da.
   */
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const nameFilter = args.options['Name'] || args.positional[0];
    const idFilter = args.options['Id'];
    let processes = ctx.host?.processes ?? [];

    if (nameFilter) {
      const muster = nameFilter.replace(/\*/g, '');
      processes = processes.filter(p => p.name.toLowerCase().includes(muster.toLowerCase()));
    }
    if (idFilter) {
      processes = processes.filter(p => p.pid === parseInt(idFilter, 10));
    }

    if (processes.length === 0 && (nameFilter || idFilter)) {
      return {
        output: '',
        exitCode: 1,
        error: `Get-Process : Es wurde kein Prozess gefunden, der den Kriterien "${nameFilter ?? idFilter}" entspricht.`,
      };
    }

    const lines = [
      '',
      'Handles  NPM(K)  PM(K)   WS(K)   CPU(s)    Id  ProcessName',
      '-------  ------  -----   -----   ------    --  -----------',
    ];

    for (const p of processes) {
      // Abgeleitet statt gewuerfelt: zwei Aufrufe zeigen dieselbe Zeile.
      const handles = 100 + (p.pid % 400);
      const npm = 5 + (p.pid % 30);
      const pm = 4096 + p.pid * 13;
      const ws = 8192 + p.pid * 29;
      lines.push(
        `${handles.toString().padStart(7)}  ${npm.toString().padStart(6)}  ${pm.toString().padStart(5)}  ${ws.toString().padStart(6)}  ${(p.cpu / 100).toFixed(2).padStart(7)}  ${p.pid.toString().padStart(4)}  ${p.name}`
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

  /**
   * Beendet WIRKLICH: Der Prozess verschwindet aus der Tabelle, und mit ihm
   * seine Sockets. Vorher war der Befehl eine Erfolgsmeldung ohne Wirkung —
   * `Get-Process` zeigte den „beendeten" Prozess danach weiter an.
   */
  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const id = args.options['Id'] || args.positional[0];
    const name = args.options['Name'];

    if (!id && !name) {
      return { output: '', exitCode: 1, error: 'Stop-Process : Missing required parameter.' };
    }

    const host = ctx.host;
    if (!host) return { output: '', exitCode: 0 };

    const pid = id !== undefined ? parseInt(id, 10) : NaN;
    const treffer = host.processes.filter(p =>
      name ? p.name.toLowerCase() === name.toLowerCase() : p.pid === pid
    );
    if (treffer.length === 0) {
      return {
        output: '',
        exitCode: 1,
        error: `Stop-Process : Der Prozess "${name ?? id}" wurde nicht gefunden.`,
      };
    }

    for (const p of treffer) {
      host.processes = host.processes.filter(x => x.pid !== p.pid);
      host.listeners = host.listeners.filter(l => l.pid !== p.pid);
      host.connections = host.connections.filter(c => c.pid !== p.pid);
    }

    return { output: '', exitCode: 0 };
  },
};

/**
 * Das Windows-Gegenstueck zu `ss -tp`: die bestehenden Verbindungen des Hosts.
 * Ohne diesen Befehl laesst sich auf einer Windows-Kiste gar nicht messen,
 * wohin sie gerade spricht — und genau das ist bei einer verdaechtigen
 * Arbeitsstation die entscheidende Frage.
 */
export const getNetTcpConnectionCommand: ShellCommand = {
  name: 'Get-NetTCPConnection',
  aliases: ['netstat'],
  description: 'Gets current TCP connections',
  usage: 'Get-NetTCPConnection [-State <state>] [-RemoteAddress <ip>]',
  options: [
    { long: 'State', description: 'Connection state filter', takesValue: true },
    { long: 'RemoteAddress', description: 'Remote address filter', takesValue: true },
    { long: 'LocalPort', description: 'Local port filter', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const host = ctx.host;
    const eigeneIp = host?.ip ?? '0.0.0.0';
    const zeilen: { lokal: string; fern: string; zustand: string; pid: number | undefined; prog?: string }[] = [];

    for (const l of host?.listeners ?? []) {
      if (l.proto !== 'tcp') continue;
      zeilen.push({ lokal: `${l.address ?? '0.0.0.0'}:${l.port}`, fern: '0.0.0.0:0', zustand: 'Listen', pid: l.pid, prog: l.program });
    }
    for (const c of host?.connections ?? []) {
      if (c.proto !== 'tcp') continue;
      zeilen.push({
        lokal: `${eigeneIp}:${c.localPort}`,
        fern: c.peer,
        zustand: (c.state ?? 'ESTABLISHED') === 'ESTABLISHED' ? 'Established' : (c.state ?? 'Established'),
        pid: c.pid,
        prog: c.program,
      });
    }

    const gefiltert = zeilen.filter(z => {
      const state = args.options['State'];
      const remote = args.options['RemoteAddress'];
      const lport = args.options['LocalPort'];
      if (state && z.zustand.toLowerCase() !== state.toLowerCase()) return false;
      if (remote && !z.fern.startsWith(remote)) return false;
      if (lport && !z.lokal.endsWith(`:${lport}`)) return false;
      return true;
    });

    const lines = [
      '',
      'LocalAddress            LocalPort RemoteAddress           RemotePort State        OwningProcess',
      '------------            --------- -------------           ---------- -----        -------------',
    ];
    for (const z of gefiltert) {
      const [lIp, lPort] = [z.lokal.slice(0, z.lokal.lastIndexOf(':')), z.lokal.slice(z.lokal.lastIndexOf(':') + 1)];
      const [rIp, rPort] = [z.fern.slice(0, z.fern.lastIndexOf(':')), z.fern.slice(z.fern.lastIndexOf(':') + 1)];
      lines.push(
        `${lIp.padEnd(23)} ${lPort.padStart(9)} ${rIp.padEnd(23)} ${rPort.padStart(10)} ${z.zustand.padEnd(12)} ${(z.pid ?? '').toString().padStart(13)}`
      );
    }
    lines.push('');

    return { output: lines.join('\n'), exitCode: 0 };
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
// Exchange (on-prem Exchange Server 2019) — deliberately tiny surface: read a
// mailbox's audit state and toggle it. On-prem audit is per-mailbox via
// Set-Mailbox -AuditEnabled (Exchange Online is org-wide via AuditDisabled and
// on by default). No mailbox content is ever exposed.
// ============================================================================

/** Property-list block (Key : Value), the form Format-List passes through. */
function mailboxDetail(mb: { name: string; displayName?: string; auditEnabled: boolean; auditLogAgeLimit?: string }): string {
  const rows: [string, string][] = [
    ['Name', mb.name],
    ['DisplayName', mb.displayName ?? mb.name],
    ['AuditEnabled', mb.auditEnabled ? 'True' : 'False'],
    ['AuditLogAgeLimit', mb.auditLogAgeLimit ?? '90.00:00:00'],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return '\n' + rows.map(([k, v]) => `${k.padEnd(width)} : ${v}`).join('\n');
}

export const getMailboxCommand: ShellCommand = {
  name: 'Get-Mailbox',
  description: 'Views mailbox objects and attributes (Exchange Server)',
  usage: 'Get-Mailbox [[-Identity] <id>]',
  options: [
    { long: 'Identity', description: 'Mailbox to view', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const mailboxes = ctx.host?.mailboxes ?? [];
    const identity = args.options['Identity'] || args.positional[0];

    if (identity) {
      const mb = mailboxes.find(m => m.name.toLowerCase() === identity.toLowerCase());
      if (!mb) {
        return { output: '', exitCode: 1, error: `Get-Mailbox : The operation couldn't be performed because object '${identity}' couldn't be found.` };
      }
      // Operand-bound record: THIS identity was actually resolved and shown —
      // extra positional args are ignored by the cmdlet, so they are never
      // recorded ('Get-Mailbox poststelle k.mertens' inspects only poststelle).
      ctx.recordMailboxInspected?.(mb.name);
      // Single mailbox → property block (readable, and Format-List-passthrough safe).
      return { output: mailboxDetail(mb), exitCode: 0 };
    }

    // No identity → summary table of all mailboxes.
    const lines = [
      '',
      'Name                      DisplayName               AuditEnabled',
      '----                      -----------               ------------',
    ];
    for (const mb of mailboxes) {
      lines.push(`${mb.name.padEnd(25)} ${(mb.displayName ?? mb.name).padEnd(25)} ${mb.auditEnabled ? 'True' : 'False'}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const setMailboxCommand: ShellCommand = {
  name: 'Set-Mailbox',
  description: 'Modifies mailbox settings (Exchange Server)',
  usage: 'Set-Mailbox [-Identity] <id> -AuditEnabled <$true|$false>',
  options: [
    { long: 'Identity', description: 'Mailbox to modify', takesValue: true },
    { long: 'AuditEnabled', description: 'Enable or disable mailbox audit logging', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    const identity = args.options['Identity'] || args.positional[0];
    if (!identity) {
      return { output: '', exitCode: 1, error: 'Set-Mailbox : Cannot process command because of one or more missing mandatory parameters: Identity.' };
    }
    const mb = ctx.host?.mailboxes.find(m => m.name.toLowerCase() === identity.toLowerCase());
    if (!mb) {
      return { output: '', exitCode: 1, error: `Set-Mailbox : The operation couldn't be performed because object '${identity}' couldn't be found.` };
    }

    // -AuditEnabled: $true/$false expand to True/False (see expandVariables). A
    // missing value lands as a switch flag (no options entry). ANY value that is
    // not a clean boolean must FAIL without mutating — a typo like `$ture` (which
    // expands to '') or `banana` must never silently disable a live mailbox.
    const raw = args.options['AuditEnabled'];
    const givenAsSwitch = args.flags['AuditEnabled'] === true; // present but valueless
    if (raw === undefined && !givenAsSwitch) {
      // -AuditEnabled not supplied at all → nothing to change (valid no-op).
      return { output: '', exitCode: 0 };
    }
    const bool = parseStrictBool(raw);
    if (bool === null) {
      return { output: '', exitCode: 1, error: `Set-Mailbox : Cannot process argument transformation on parameter 'AuditEnabled'. Cannot convert value "${raw ?? ''}" to type "System.Boolean".` };
    }
    mb.auditEnabled = bool;
    return { output: '', exitCode: 0 };
  },
};

/** Strict boolean coercion for cmdlet parameters: only true/false/1/0 (and the
 *  literal $true/$false, in case expansion is bypassed). Anything else → null. */
function parseStrictBool(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  if (/^(true|\$true|1)$/i.test(value)) return true;
  if (/^(false|\$false|0)$/i.test(value)) return false;
  return null;
}

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
    // Operand-bound record: the digest was computed for THIS file.
    ctx.recordHashComputed?.(resolved, algorithm);
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
      const output = format
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
  getNetTcpConnectionCommand,
  getServiceCommand,
  // Exchange
  getMailboxCommand,
  setMailboxCommand,
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
