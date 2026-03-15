/**
 * Linux Network Commands
 * ping, ifconfig, ip, netstat, ss, dig, nslookup, curl, wget
 */

import { ShellCommand, ParsedArgs, ExecutionContext, CommandResult, NetworkConfig } from '../../types';

// Default network configuration
const defaultNetworkConfig: NetworkConfig = {
  hostname: 'server',
  interfaces: [
    { name: 'lo', ipv4: '127.0.0.1', ipv6: '::1', mac: '00:00:00:00:00:00', status: 'up', type: 'loopback' },
    { name: 'eth0', ipv4: '10.0.0.50', ipv6: 'fe80::1', mac: '02:42:ac:11:00:02', status: 'up', type: 'ethernet' },
    { name: 'eth1', ipv4: '192.168.1.100', mac: '02:42:ac:11:00:03', status: 'up', type: 'ethernet' },
  ],
  dnsServers: ['8.8.8.8', '8.8.4.4'],
  hosts: {
    'localhost': '127.0.0.1',
    'server': '10.0.0.50',
  },
  pingResponses: {
    '127.0.0.1': { reachable: true, latency: 0.05, ttl: 64 },
    'localhost': { reachable: true, latency: 0.05, ttl: 64 },
    '8.8.8.8': { reachable: true, latency: 15, ttl: 117 },
    '1.1.1.1': { reachable: true, latency: 12, ttl: 57 },
    '10.0.0.1': { reachable: true, latency: 1, ttl: 64 },
    '192.168.1.1': { reachable: true, latency: 2, ttl: 64 },
    'google.com': { reachable: true, latency: 18, ttl: 117 },
    'example.com': { reachable: true, latency: 25, ttl: 56 },
  },
  portResponses: {
    '8.8.8.8:53': { open: true, service: 'domain' },
    '10.0.0.1:22': { open: true, service: 'ssh' },
    '10.0.0.1:80': { open: true, service: 'http' },
    '10.0.0.1:443': { open: true, service: 'https' },
    '192.168.1.1:80': { open: true, service: 'http' },
  },
};

export const pingCommand: ShellCommand = {
  name: 'ping',
  description: 'Send ICMP ECHO_REQUEST to network hosts',
  usage: 'ping [OPTIONS] HOST',
  options: [
    { short: 'c', long: 'count', description: 'Stop after sending COUNT packets', takesValue: true },
    { short: 'i', long: 'interval', description: 'Seconds between packets', takesValue: true },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'ping: usage: ping [-c count] host' };
    }

    const host = args.positional[0];
    const count = parseInt(args.options['c'] || args.options['count'] || '4', 10);
    const config = defaultNetworkConfig;

    // Check if host is reachable
    const response = config.pingResponses[host] ||
                     config.pingResponses[host.toLowerCase()] ||
                     { reachable: false, error: 'Destination Host Unreachable' };

    if (!response.reachable) {
      const lines = [
        `PING ${host} (${host}): 56 data bytes`,
        '',
        `--- ${host} ping statistics ---`,
        `${count} packets transmitted, 0 received, 100% packet loss`,
      ];
      return { output: lines.join('\n'), exitCode: 1 };
    }

    // Simulate successful pings
    const ip = config.hosts[host] || host;
    const lines = [`PING ${host} (${ip}): 56 data bytes`];

    for (let i = 0; i < count; i++) {
      const latency = response.latency! + (Math.random() * 2 - 1);
      lines.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=${response.ttl} time=${latency.toFixed(3)} ms`);
    }

    lines.push('');
    lines.push(`--- ${host} ping statistics ---`);
    lines.push(`${count} packets transmitted, ${count} packets received, 0.0% packet loss`);
    lines.push(`round-trip min/avg/max/stddev = ${(response.latency! - 0.5).toFixed(3)}/${response.latency!.toFixed(3)}/${(response.latency! + 0.5).toFixed(3)}/0.500 ms`);

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const ifconfigCommand: ShellCommand = {
  name: 'ifconfig',
  description: 'Configure network interface parameters',
  usage: 'ifconfig [interface]',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const config = defaultNetworkConfig;
    const specificInterface = args.positional[0];

    const interfaces = specificInterface
      ? config.interfaces.filter(i => i.name === specificInterface)
      : config.interfaces;

    if (interfaces.length === 0) {
      return { output: '', exitCode: 1, error: `ifconfig: interface ${specificInterface} does not exist.` };
    }

    const lines: string[] = [];

    for (const iface of interfaces) {
      lines.push(`${iface.name}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`);
      if (iface.ipv4) {
        lines.push(`        inet ${iface.ipv4}  netmask 255.255.255.0  broadcast ${iface.ipv4.replace(/\.\d+$/, '.255')}`);
      }
      if (iface.ipv6) {
        lines.push(`        inet6 ${iface.ipv6}  prefixlen 64  scopeid 0x20<link>`);
      }
      lines.push(`        ether ${iface.mac}  txqueuelen 1000  (Ethernet)`);
      lines.push(`        RX packets 12345  bytes 1234567 (1.2 MB)`);
      lines.push(`        TX packets 6789  bytes 567890 (567.8 KB)`);
      lines.push('');
    }

    return { output: lines.join('\n').trim(), exitCode: 0 };
  },
};

export const ipCommand: ShellCommand = {
  name: 'ip',
  description: 'Show/manipulate routing, network devices, interfaces',
  usage: 'ip [OPTIONS] OBJECT { COMMAND | help }',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const config = defaultNetworkConfig;
    const object = args.positional[0] || 'addr';
    const command = args.positional[1] || 'show';

    if (object === 'addr' || object === 'a' || object === 'address') {
      const lines: string[] = [];
      let idx = 1;

      for (const iface of config.interfaces) {
        const state = iface.status === 'up' ? 'UP' : 'DOWN';
        lines.push(`${idx}: ${iface.name}: <BROADCAST,MULTICAST,${state}> mtu 1500 qdisc fq_codel state ${state}`);
        lines.push(`    link/ether ${iface.mac} brd ff:ff:ff:ff:ff:ff`);
        if (iface.ipv4) {
          lines.push(`    inet ${iface.ipv4}/24 brd ${iface.ipv4.replace(/\.\d+$/, '.255')} scope global ${iface.name}`);
        }
        if (iface.ipv6) {
          lines.push(`    inet6 ${iface.ipv6}/64 scope link`);
        }
        idx++;
      }

      return { output: lines.join('\n'), exitCode: 0 };
    }

    if (object === 'route' || object === 'r') {
      const lines = [
        'default via 10.0.0.1 dev eth0 proto static',
        '10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.50',
        '192.168.1.0/24 dev eth1 proto kernel scope link src 192.168.1.100',
      ];
      return { output: lines.join('\n'), exitCode: 0 };
    }

    if (object === 'link' || object === 'l') {
      const lines: string[] = [];
      let idx = 1;

      for (const iface of config.interfaces) {
        const state = iface.status === 'up' ? 'UP' : 'DOWN';
        lines.push(`${idx}: ${iface.name}: <BROADCAST,MULTICAST,${state}> mtu 1500 qdisc fq_codel state ${state}`);
        lines.push(`    link/ether ${iface.mac} brd ff:ff:ff:ff:ff:ff`);
        idx++;
      }

      return { output: lines.join('\n'), exitCode: 0 };
    }

    return { output: '', exitCode: 1, error: `ip: object "${object}" is unknown` };
  },
};

export const netstatCommand: ShellCommand = {
  name: 'netstat',
  description: 'Print network connections, routing tables, interface statistics',
  usage: 'netstat [OPTIONS]',
  options: [
    { short: 't', description: 'Show TCP connections' },
    { short: 'u', description: 'Show UDP connections' },
    { short: 'l', description: 'Show only listening sockets' },
    { short: 'p', description: 'Show PID and program name' },
    { short: 'n', description: 'Show numerical addresses' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    const showTcp = args.flags['t'];
    const showUdp = args.flags['u'];
    const listeningOnly = args.flags['l'];
    const showProgram = args.flags['p'];
    const numeric = args.flags['n'];

    const connections = [
      { proto: 'tcp', recv: 0, send: 0, local: '0.0.0.0:22', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '456', program: 'sshd' },
      { proto: 'tcp', recv: 0, send: 0, local: '0.0.0.0:80', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '1234', program: 'apache2' },
      { proto: 'tcp', recv: 0, send: 0, local: '0.0.0.0:443', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '1234', program: 'apache2' },
      { proto: 'tcp', recv: 0, send: 0, local: '127.0.0.1:3306', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '2345', program: 'mysqld' },
      { proto: 'tcp', recv: 0, send: 0, local: '10.0.0.50:22', foreign: '192.168.1.50:52413', state: 'ESTABLISHED', pid: '3456', program: 'sshd' },
      { proto: 'udp', recv: 0, send: 0, local: '0.0.0.0:68', foreign: '0.0.0.0:*', state: '', pid: '123', program: 'dhclient' },
    ];

    let filtered = connections;
    if (showTcp && !showUdp) {
      filtered = filtered.filter(c => c.proto === 'tcp');
    } else if (showUdp && !showTcp) {
      filtered = filtered.filter(c => c.proto === 'udp');
    }

    if (listeningOnly) {
      filtered = filtered.filter(c => c.state === 'LISTEN' || c.proto === 'udp');
    }

    const header = showProgram
      ? 'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name'
      : 'Proto Recv-Q Send-Q Local Address           Foreign Address         State';

    const lines = [header];

    for (const conn of filtered) {
      const local = numeric ? conn.local : conn.local;
      const foreign = numeric ? conn.foreign : conn.foreign;
      const program = showProgram ? `${conn.pid}/${conn.program}` : '';

      let line = `${conn.proto.padEnd(5)} ${conn.recv.toString().padStart(6)} ${conn.send.toString().padStart(6)} ${local.padEnd(24)} ${foreign.padEnd(24)} ${conn.state.padEnd(11)}`;
      if (showProgram) {
        line += ` ${program}`;
      }
      lines.push(line);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const ssCommand: ShellCommand = {
  name: 'ss',
  description: 'Another utility to investigate sockets',
  usage: 'ss [OPTIONS]',
  options: [
    { short: 't', description: 'Show TCP sockets' },
    { short: 'u', description: 'Show UDP sockets' },
    { short: 'l', description: 'Show listening sockets' },
    { short: 'n', description: 'Do not resolve service names' },
    { short: 'p', description: 'Show process using socket' },
  ],

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult {
    // ss uses similar output to netstat
    return netstatCommand.execute(args, ctx);
  },
};

export const digCommand: ShellCommand = {
  name: 'dig',
  description: 'DNS lookup utility',
  usage: 'dig [OPTIONS] name [type]',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'dig: usage: dig name [type]' };
    }

    const name = args.positional[0];
    const type = (args.positional[1] || 'A').toUpperCase();

    // Simulated DNS responses
    const dnsRecords: Record<string, Record<string, string[]>> = {
      'google.com': {
        'A': ['142.250.185.78'],
        'AAAA': ['2a00:1450:4001:82a::200e'],
        'MX': ['10 smtp.google.com.', '20 smtp2.google.com.'],
        'NS': ['ns1.google.com.', 'ns2.google.com.'],
      },
      'example.com': {
        'A': ['93.184.216.34'],
        'AAAA': ['2606:2800:220:1:248:1893:25c8:1946'],
        'NS': ['a.iana-servers.net.', 'b.iana-servers.net.'],
      },
    };

    const records = dnsRecords[name.toLowerCase()];
    const answers = records?.[type] || [];

    const lines = [
      '',
      `; <<>> DiG 9.18.18-0ubuntu0.22.04.1-Ubuntu <<>> ${name} ${type}`,
      ';; global options: +cmd',
      ';; Got answer:',
      `;; ->>HEADER<<- opcode: QUERY, status: ${answers.length > 0 ? 'NOERROR' : 'NXDOMAIN'}, id: ${Math.floor(Math.random() * 65535)}`,
      `;; flags: qr rd ra; QUERY: 1, ANSWER: ${answers.length}, AUTHORITY: 0, ADDITIONAL: 1`,
      '',
      ';; QUESTION SECTION:',
      `;${name}.\t\t\tIN\t${type}`,
      '',
    ];

    if (answers.length > 0) {
      lines.push(';; ANSWER SECTION:');
      for (const answer of answers) {
        lines.push(`${name}.\t\t300\tIN\t${type}\t${answer}`);
      }
    }

    lines.push('');
    lines.push(`;; Query time: ${Math.floor(Math.random() * 50) + 10} msec`);
    lines.push(';; SERVER: 8.8.8.8#53(8.8.8.8) (UDP)');
    lines.push(`;; WHEN: ${new Date().toString()}`);
    lines.push(`;; MSG SIZE  rcvd: ${128 + answers.length * 20}`);

    return { output: lines.join('\n'), exitCode: answers.length > 0 ? 0 : 1 };
  },
};

export const nslookupCommand: ShellCommand = {
  name: 'nslookup',
  description: 'Query Internet name servers',
  usage: 'nslookup name [server]',

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'nslookup: usage: nslookup name [server]' };
    }

    const name = args.positional[0];
    const server = args.positional[1] || '8.8.8.8';

    // Simulated responses
    const responses: Record<string, string[]> = {
      'google.com': ['142.250.185.78', '142.250.185.79'],
      'example.com': ['93.184.216.34'],
      'localhost': ['127.0.0.1'],
    };

    const addresses = responses[name.toLowerCase()];

    if (!addresses) {
      return {
        output: `Server:\t\t${server}\nAddress:\t${server}#53\n\n** server can't find ${name}: NXDOMAIN`,
        exitCode: 1,
      };
    }

    const lines = [
      `Server:\t\t${server}`,
      `Address:\t${server}#53`,
      '',
      'Non-authoritative answer:',
      `Name:\t${name}`,
    ];

    for (const addr of addresses) {
      lines.push(`Address: ${addr}`);
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const curlCommand: ShellCommand = {
  name: 'curl',
  description: 'Transfer data from or to a server',
  usage: 'curl [OPTIONS] URL',
  options: [
    { short: 'I', long: 'head', description: 'Show document info only' },
    { short: 'v', long: 'verbose', description: 'Make the operation more talkative' },
    { short: 's', long: 'silent', description: 'Silent mode' },
    { short: 'o', long: 'output', description: 'Write to file instead of stdout', takesValue: true },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'curl: try \'curl --help\' for more information' };
    }

    const url = args.positional[0];
    const headOnly = args.flags['I'] || args.flags['head'];
    const verbose = args.flags['v'] || args.flags['verbose'];

    // Simulated responses
    const responses: Record<string, { status: number; headers: string[]; body: string }> = {
      'http://example.com': {
        status: 200,
        headers: [
          'HTTP/1.1 200 OK',
          'Content-Type: text/html; charset=UTF-8',
          'Content-Length: 1256',
          'Connection: keep-alive',
          'Date: Fri, 14 Mar 2026 10:00:00 GMT',
          'Server: ECS (dcb/7F84)',
        ],
        body: '<!doctype html>\n<html>\n<head>\n    <title>Example Domain</title>\n</head>\n<body>\n<div>\n    <h1>Example Domain</h1>\n    <p>This domain is for use in illustrative examples in documents.</p>\n</div>\n</body>\n</html>',
      },
      'https://api.example.com/health': {
        status: 200,
        headers: [
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          'Content-Length: 15',
        ],
        body: '{"status":"ok"}',
      },
    };

    const response = responses[url];

    if (!response) {
      return {
        output: '',
        exitCode: 6,
        error: `curl: (6) Could not resolve host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`,
      };
    }

    if (headOnly) {
      return { output: response.headers.join('\n'), exitCode: 0 };
    }

    if (verbose) {
      const lines = [
        `* Trying ${url}...`,
        '* Connected',
        '> GET / HTTP/1.1',
        `> Host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`,
        '> User-Agent: curl/7.81.0',
        '> Accept: */*',
        '>',
        ...response.headers.map(h => `< ${h}`),
        '<',
        response.body,
      ];
      return { output: lines.join('\n'), exitCode: 0 };
    }

    return { output: response.body, exitCode: 0 };
  },
};

export const wgetCommand: ShellCommand = {
  name: 'wget',
  description: 'Non-interactive network downloader',
  usage: 'wget [OPTIONS] URL',
  options: [
    { short: 'O', long: 'output-document', description: 'Write to FILE', takesValue: true },
    { short: 'q', long: 'quiet', description: 'Quiet mode' },
  ],

  execute(args: ParsedArgs, _ctx: ExecutionContext): CommandResult {
    if (args.positional.length === 0) {
      return { output: '', exitCode: 1, error: 'wget: missing URL' };
    }

    const url = args.positional[0];
    const quiet = args.flags['q'] || args.flags['quiet'];
    const output = args.options['O'] || args.options['output-document'] || url.split('/').pop() || 'index.html';

    // Simulate download
    const lines: string[] = [];

    if (!quiet) {
      lines.push(`--2026-03-14 10:00:00--  ${url}`);
      lines.push(`Resolving ${url.replace(/^https?:\/\//, '').split('/')[0]}... done.`);
      lines.push('Connecting... connected.');
      lines.push('HTTP request sent, awaiting response... 200 OK');
      lines.push('Length: 1256 (1.2K) [text/html]');
      lines.push(`Saving to: '${output}'`);
      lines.push('');
      lines.push(`${output}              100%[===================>]   1.23K  --.-KB/s    in 0s`);
      lines.push('');
      lines.push('2026-03-14 10:00:00 (12.3 MB/s) - \'index.html\' saved [1256/1256]');
    }

    return { output: lines.join('\n'), exitCode: 0 };
  },
};

export const networkCommands: ShellCommand[] = [
  pingCommand,
  ifconfigCommand,
  ipCommand,
  netstatCommand,
  ssCommand,
  digCommand,
  nslookupCommand,
  curlCommand,
  wgetCommand,
];
