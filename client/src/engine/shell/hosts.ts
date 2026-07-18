/**
 * Multi-host state: each simulated machine owns a VFS plus mutable
 * service/journal/firewall/account state that commands operate on.
 */
import {
  TerminalHostSpec, TerminalJournalEntry, TerminalUnitPrecondition,
} from '@kritis/shared';
import { VirtualFilesystemInterface } from './types';
import { createLinuxFilesystem } from './VirtualFilesystem';
import { resolveTemplateIds, applyTemplate } from './templates';

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
}

export interface UfwRule { action: 'allow' | 'deny'; port: number; proto?: 'tcp' | 'udp'; from?: string }
export interface FirewallState {
  enabled: boolean;
  defaultIncoming: 'allow' | 'deny';
  defaultOutgoing: 'allow' | 'deny';
  rules: UfwRule[];
}

export interface HostState {
  id: string;
  hostname: string;
  ip?: string;
  vfs: VirtualFilesystemInterface;
  services: SystemdUnitState[];
  journal: TerminalJournalEntry[];
  firewall: FirewallState;
  accounts: { name: string; password?: string }[];
  sshdEffective: { permitRootLogin: boolean; passwordAuthentication: boolean };
  refreshSshdEffective(): void;
  appendJournal(entry: TerminalJournalEntry): void;
}

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
  }

  const services: SystemdUnitState[] = DEFAULT_UNITS.map(u => ({ ...u }));
  for (const svc of spec.services ?? []) {
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

  const host: HostState = {
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
    accounts: (spec.accounts ?? [{ name: 'root' }, { name: 'admin' }]).map(a => ({ ...a })),
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
