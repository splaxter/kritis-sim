/**
 * Multi-host state: each simulated machine owns a VFS plus mutable
 * service/journal/firewall/account state that commands operate on.
 */
import {
  TerminalHostSpec, TerminalJournalEntry, TerminalUnitPrecondition,
  TerminalServiceSpec, TerminalFirewallSpec, TerminalMailboxSpec, NetListener, NetConnection,
  TerminalNftSpec, TerminalProcessSpec,
} from '@kritis/shared';
import { VirtualFilesystemInterface } from './types';
import { createLinuxFilesystem } from './VirtualFilesystem';
import { resolveTemplateIds, applyTemplate } from './templates';
import { NftState, emptyNftState, seedNftState } from './nftables';

export interface SystemdUnitState {
  unit: string;
  active: 'active' | 'inactive' | 'failed';
  sub: 'running' | 'exited' | 'dead' | 'failed';
  enabled: 'enabled' | 'disabled' | 'static';
  pid?: number;
  exec?: string;
  desc: string;
  unitFile?: string;
  /** Snapshot of the unit file at load time — daemon-reload refreshes it. */
  loadedUnitContent?: string;
  startRequires?: TerminalUnitPrecondition[];
  /** Files materialized on the host VFS on a successful start (e.g. a socket). */
  createsOnStart?: string[];
  /** Sockets, die der Dienst haelt — beim Start angelegt, beim Stoppen entfernt. */
  listens?: { proto?: 'tcp' | 'udp'; port: number; address?: string }[];
}

export interface UfwRule { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }
export interface FirewallState {
  enabled: boolean;
  defaultIncoming: 'allow' | 'deny';
  defaultOutgoing: 'allow' | 'deny';
  rules: UfwRule[];
}

/** An Exchange mailbox as far as the game models it: an identity plus its audit
 *  flag. Mutated by Set-Mailbox, read by Get-Mailbox and the `mailbox` stateGoal. */
export interface MailboxState {
  name: string;
  displayName?: string;
  auditEnabled: boolean;
  auditLogAgeLimit?: string;
}

export interface HostState {
  id: string;
  hostname: string;
  ip?: string;
  vfs: VirtualFilesystemInterface;
  services: SystemdUnitState[];
  journal: TerminalJournalEntry[];
  firewall: FirewallState;
  /** nftables ruleset (`nft`); empty unless a level seeds one. */
  nft: NftState;
  accounts: { name: string; password?: string }[];
  /** Exchange mailboxes on this host (empty unless a level seeds them). */
  mailboxes: MailboxState[];
  /** Listening sockets shown by `ss`/`netstat`; `kill <pid>` removes matches. */
  listeners: NetListener[];
  /** Established connections shown by `ss -tp`/`netstat`. */
  connections: NetConnection[];
  /** Laufende Prozesse (`ps`, `Get-Process`); `kill <pid>` entfernt Treffer. */
  processes: ProcessState[];
  sshdEffective: { permitRootLogin: boolean; passwordAuthentication: boolean };
  refreshSshdEffective(): void;
  appendJournal(entry: TerminalJournalEntry): void;
}

/**
 * The listeners a host has when it declares none — mirrors the old static
 * ss/netstat table so existing single-host levels keep their network view.
 */
export const DEFAULT_LISTENERS: NetListener[] = [
  { proto: 'tcp', port: 22, address: '0.0.0.0', pid: 456, program: 'sshd' },
  { proto: 'tcp', port: 80, address: '0.0.0.0', pid: 1234, program: 'apache2' },
  { proto: 'tcp', port: 443, address: '0.0.0.0', pid: 1234, program: 'apache2' },
  { proto: 'tcp', port: 3306, address: '127.0.0.1', pid: 2345, program: 'mysqld' },
  { proto: 'udp', port: 68, address: '0.0.0.0', pid: 123, program: 'dhclient' },
];

/** Ein laufender Prozess — der Zustand hinter `ps`, `kill` und `Stop-Process`. */
export interface ProcessState {
  pid: number;
  name: string;
  user: string;
  cmd: string;
  cpu: number;
}

/** The established connections a host has when it declares none. */
export const DEFAULT_CONNECTIONS: NetConnection[] = [
  { proto: 'tcp', localPort: 22, peer: '192.168.1.50:52413', state: 'ESTABLISHED', pid: 3456, program: 'sshd' },
];

// System services and a root-planted rogue both run as root unless a level
// says otherwise, so ownership defaults to 'root' when a socket is materialised.
const cloneListeners = (list: NetListener[]): NetListener[] => list.map(l => ({ user: 'root', ...l }));
const cloneConnections = (list: NetConnection[]): NetConnection[] => list.map(c => ({ user: 'root', ...c }));

/**
 * Die Prozesstabelle, die eine Kiste ohne eigene Angabe hat — dieselben
 * Eintraege, die `ps` frueher fest verdrahtet ausgab, damit bestehende Level
 * ihre Ansicht behalten. `<user>` wird beim Bauen durch den angemeldeten
 * Nutzer ersetzt.
 */
export const DEFAULT_PROCESSES: TerminalProcessSpec[] = [
  { pid: 1, user: 'root', name: 'systemd', cmd: '/sbin/init', cpu: 2 },
  { pid: 456, user: 'root', name: 'sshd', cmd: '/usr/sbin/sshd -D', cpu: 0 },
  { pid: 789, user: '<user>', name: 'bash', cmd: '-bash', cpu: 0 },
  { pid: 1234, user: 'www-data', name: 'apache2', cmd: '/usr/sbin/apache2 -k start', cpu: 15 },
  { pid: 2345, user: 'mysql', name: 'mysqld', cmd: '/usr/sbin/mysqld', cpu: 323 },
];

const seedProcesses = (list: TerminalProcessSpec[], user: string): ProcessState[] =>
  list.map(p => ({
    pid: p.pid,
    name: p.name,
    user: (p.user ?? 'root') === '<user>' ? user : (p.user ?? 'root'),
    cmd: p.cmd ?? p.name,
    cpu: p.cpu ?? 0,
  }));

/** Materialise a seeded mailbox; auditEnabled defaults to false (the realistic
 *  on-prem Exchange 2019 default a level is usually asked to fix). */
const seedMailbox = (m: TerminalMailboxSpec): MailboxState => ({
  name: m.name,
  displayName: m.displayName,
  auditEnabled: m.auditEnabled ?? false,
  auditLogAgeLimit: m.auditLogAgeLimit ?? '90.00:00:00',
});

/** Same defaults the static systemctl table has — kept consistent with `ps`. */
export const DEFAULT_UNITS: SystemdUnitState[] = [
  { unit: 'ssh.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 456, exec: '/usr/sbin/sshd -D', desc: 'OpenBSD Secure Shell server' },
  { unit: 'apache2.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 1234, exec: '/usr/sbin/apache2 -k start', desc: 'The Apache HTTP Server' },
  { unit: 'mysql.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 2345, exec: '/usr/sbin/mysqld', desc: 'MySQL Community Server' },
  { unit: 'cron.service', active: 'active', sub: 'running', enabled: 'enabled', pid: 512, exec: '/usr/sbin/cron -f', desc: 'Regular background program processing daemon' },
  { unit: 'systemd-journald.service', active: 'active', sub: 'running', enabled: 'static', pid: 210, exec: '/lib/systemd/systemd-journald', desc: 'Journal Service' },
  { unit: 'networking.service', active: 'active', sub: 'exited', enabled: 'enabled', desc: 'Raise network interfaces' },
  { unit: 'ufw.service', active: 'active', sub: 'exited', enabled: 'enabled', desc: 'Uncomplicated firewall' },
];

/** Alternate spellings for units — sshd is the syslog identifier of ssh.service. */
export const UNIT_ALIASES: Record<string, string> = { sshd: 'ssh.service' };

/** Resolve aliases, then append `.service` when the name has no unit suffix. */
export function canonicalUnitName(name: string): string {
  const resolved = UNIT_ALIASES[name] ?? name;
  return resolved.includes('.') ? resolved : `${resolved}.service`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD HH:MM:SS' → syslog-style 'Jul 18 HH:MM:SS' — shared by journalctl and systemctl status. */
export function formatJournalTs(ts: string): string {
  const m = ts.match(/^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/);
  if (!m) return ts;
  return `${MONTHS[parseInt(m[1], 10) - 1]} ${m[2]} ${m[3]}`;
}

/**
 * Deterministic fake PID for a unit without a live one — shared by
 * `systemctl status` and `journalctl` so both show the same pid.
 */
export function derivedUnitPid(unitName: string): number {
  const short = unitName.replace(/\.service$/, '');
  let sum = 0;
  for (let i = 0; i < short.length; i++) sum += short.charCodeAt(i);
  return (sum % 900) + 100;
}

const SUB_FOR_ACTIVE: Record<SystemdUnitState['active'], SystemdUnitState['sub']> = {
  active: 'running',
  failed: 'failed',
  inactive: 'dead',
};

/** Missing directive or any value other than 'no' counts as enabled — matches sshd defaults. */
function parseSshdConfig(content: string): { permitRootLogin: boolean; passwordAuthentication: boolean } {
  const directive = (key: string): boolean => {
    const m = content.match(new RegExp(`^\\s*${key}\\s+(\\S+)`, 'm'));
    return m ? m[1].toLowerCase() !== 'no' : true;
  };
  return {
    permitRootLogin: directive('PermitRootLogin'),
    passwordAuthentication: directive('PasswordAuthentication'),
  };
}

/**
 * Merge authored service specs over an existing unit array (in place). Shared
 * by createHostState and the primary-host seeding path so both apply the same
 * override/snapshot rules (loadedUnitContent from the VFS, sub from active).
 */
export function applyServiceSpecs(
  vfs: VirtualFilesystemInterface,
  services: SystemdUnitState[],
  specs: TerminalServiceSpec[],
): void {
  for (const svc of specs) {
    const existing = services.find(s => s.unit === svc.unit);
    const active = svc.active ?? existing?.active ?? 'active';
    const merged: SystemdUnitState = {
      unit: svc.unit,
      active,
      // Only recompute sub when the spec sets active — a partial override
      // (e.g. enabled only) must keep an existing unit's sub ('exited' etc.).
      sub: svc.active !== undefined || !existing ? SUB_FOR_ACTIVE[active] : existing.sub,
      enabled: svc.enabled ?? existing?.enabled ?? 'enabled',
      pid: active === 'active' ? existing?.pid : undefined,
      exec: svc.exec ?? existing?.exec,
      desc: svc.desc ?? existing?.desc ?? svc.unit,
      unitFile: svc.unitFile,
      startRequires: svc.startRequires?.map(p => ({ ...p })),
      createsOnStart: svc.createsOnStart ? [...svc.createsOnStart] : undefined,
      listens: svc.listens?.map(l => ({ ...l })),
    };
    if (merged.unitFile) {
      const read = vfs.readFile(merged.unitFile);
      merged.loadedUnitContent = read.ok ? read.value : '';
    }
    if (existing) {
      services[services.indexOf(existing)] = merged;
    } else {
      services.push(merged);
    }
  }
}

/**
 * Seed custom services/journal/firewall onto an EXISTING host (the primary
 * host of a single-host level, which has no `hosts` entry of its own). Applied
 * after the VFS overlay so unit files are present when their content is
 * snapshotted into loadedUnitContent.
 */
export function seedPrimaryHost(
  host: HostState,
  spec: {
    services?: TerminalServiceSpec[];
    journal?: TerminalJournalEntry[];
    firewall?: TerminalFirewallSpec;
    nft?: TerminalNftSpec;
    listeners?: NetListener[];
    connections?: NetConnection[];
    mailboxes?: TerminalMailboxSpec[];
    processes?: TerminalProcessSpec[];
  },
): void {
  if (spec.services) applyServiceSpecs(host.vfs, host.services, spec.services);
  if (spec.mailboxes) host.mailboxes = spec.mailboxes.map(seedMailbox);
  for (const entry of spec.journal ?? []) host.journal.push({ ...entry });
  if (spec.firewall) {
    host.firewall = {
      enabled: spec.firewall.enabled ?? host.firewall.enabled,
      defaultIncoming: spec.firewall.defaultIncoming ?? host.firewall.defaultIncoming,
      defaultOutgoing: host.firewall.defaultOutgoing,
      rules: (spec.firewall.rules ?? []).map(r => ({ ...r })),
    };
  }
  if (spec.nft) host.nft = seedNftState(spec.nft);
  // Listeners/connections replace the defaults when a level authors them —
  // a forensic level owns its full port view, not a merge of the baseline.
  if (spec.listeners) host.listeners = cloneListeners(spec.listeners);
  if (spec.services) host.listeners = sockelsAusDiensten(host.services, host.listeners);
  if (spec.connections) host.connections = cloneConnections(spec.connections);
  if (spec.processes) host.processes = seedProcesses(spec.processes, host.vfs.getUser());
}

/**
 * Die Sockets aktiver Einheiten in die Lauscherliste aufnehmen (und die
 * toter Einheiten heraushalten). So kann ein Level Dienst und Port nicht
 * auseinanderlaufen lassen — es pflegt nur noch den Dienst.
 */
function sockelsAusDiensten(services: SystemdUnitState[], listeners: NetListener[]): NetListener[] {
  const ergebnis = [...listeners];
  for (const unit of services) {
    for (const sock of unit.listens ?? []) {
      const proto = sock.proto ?? 'tcp';
      const idx = ergebnis.findIndex(l => l.port === sock.port && l.proto === proto);
      if (unit.active === 'active') {
        if (idx === -1) {
          ergebnis.push({
            proto,
            port: sock.port,
            address: sock.address ?? '0.0.0.0',
            pid: unit.pid ?? derivedUnitPid(unit.unit),
            program: unit.unit.replace(/\.service$/, ''),
            user: 'root',
          });
        }
      } else if (idx !== -1) {
        ergebnis.splice(idx, 1);
      }
    }
  }
  return ergebnis;
}

export function createHostState(spec: TerminalHostSpec, opts?: { user?: string }): HostState {
  const vfs = createLinuxFilesystem({ user: opts?.user ?? 'root', hostname: spec.hostname });

  for (const template of resolveTemplateIds(spec.templateIds ?? [])) {
    applyTemplate(vfs, template);
  }
  for (const dir of spec.vfsOverlay?.directories ?? []) {
    vfs.addDirectory(dir);
  }
  for (const file of spec.vfsOverlay?.files ?? []) {
    vfs.addFile(file.path, file.content);
    // Overlay files land at 644; a 600 SSH private key must be re-chmod'd or
    // key auth skips it as UNPROTECTED (group/other-readable).
    if (file.mode) vfs.chmod(file.path, file.mode);
  }

  const services: SystemdUnitState[] = DEFAULT_UNITS.map(u => ({ ...u }));
  applyServiceSpecs(vfs, services, spec.services ?? []);

  return buildHostState({
    id: spec.id,
    hostname: spec.hostname,
    ip: spec.ip,
    vfs,
    services,
    journal: (spec.journal ?? []).map(e => ({ ...e })),
    firewall: {
      enabled: spec.firewall?.enabled ?? true,
      defaultIncoming: spec.firewall?.defaultIncoming ?? 'allow',
      defaultOutgoing: 'allow',
      rules: (spec.firewall?.rules ?? []).map(r => ({ ...r })),
    },
    nft: spec.nft ? seedNftState(spec.nft) : emptyNftState(),
    accounts: (spec.accounts ?? [{ name: 'root' }, { name: 'admin' }]).map(a => ({ ...a })),
    listeners: sockelsAusDiensten(services, cloneListeners(spec.listeners ?? DEFAULT_LISTENERS)),
    connections: cloneConnections(spec.connections ?? DEFAULT_CONNECTIONS),
    processes: seedProcesses(spec.processes ?? DEFAULT_PROCESSES, vfs.getUser()),
    mailboxes: (spec.mailboxes ?? []).map(seedMailbox),
  });
}

/**
 * Build a HostState around an EXISTING vfs — used to wrap the shell's local
 * filesystem as the base host of the session stack. Shell-type agnostic.
 */
export function wrapVfsAsHost(vfs: VirtualFilesystemInterface, hostname?: string): HostState {
  return buildHostState({
    id: 'local',
    hostname: hostname ?? vfs.getEnv('HOSTNAME') ?? vfs.getEnv('COMPUTERNAME') ?? 'localhost',
    vfs,
    services: DEFAULT_UNITS.map(u => ({ ...u })),
    journal: [],
    firewall: { enabled: true, defaultIncoming: 'allow', defaultOutgoing: 'allow', rules: [] },
    nft: emptyNftState(),
    accounts: [{ name: vfs.getUser() }],
    listeners: cloneListeners(DEFAULT_LISTENERS),
    connections: cloneConnections(DEFAULT_CONNECTIONS),
    processes: seedProcesses(DEFAULT_PROCESSES, vfs.getUser()),
  });
}

function buildHostState(
  base: Omit<HostState, 'sshdEffective' | 'refreshSshdEffective' | 'appendJournal' | 'mailboxes'>
    & { mailboxes?: MailboxState[] },
): HostState {
  const { vfs } = base;
  const host: HostState = {
    ...base,
    mailboxes: base.mailboxes ?? [],
    sshdEffective: { permitRootLogin: true, passwordAuthentication: true },
    refreshSshdEffective() {
      const read = vfs.readFile('/etc/ssh/sshd_config');
      if (read.ok) {
        host.sshdEffective = parseSshdConfig(read.value);
      }
    },
    appendJournal(entry: TerminalJournalEntry) {
      host.journal.push(entry);
    },
  };

  if (vfs.exists('/etc/ssh/sshd_config')) {
    host.refreshSshdEffective();
  }
  return host;
}
