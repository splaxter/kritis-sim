/**
 * ansible-playbook end-to-end through the shell: idempotency (the core),
 * check/diff, unreachable hosts, module failures, syntax errors, become
 * gating, and the B5 finale flow (lineinfile + service restart → sshd
 * config re-parsed on the target).
 */
import { describe, it, expect } from 'vitest';
import { createShell } from '../index';
import { createHostState, HostState } from '../hosts';
import { ShellEngine } from '../ShellEngine';

const PUBKEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AnsKey timo@ansible01';

const IDEMPOTENT_YML = [
  '---',
  '- name: Baseline',
  '  hosts: web',
  '  become: true',
  '  tasks:',
  '    - name: Disallow root login',
  '      lineinfile:',
  '        path: /etc/ssh/sshd_config',
  "        regexp: '^#?PermitRootLogin'",
  "        line: 'PermitRootLogin no'",
  '    - name: Deploy motd',
  '      copy:',
  '        dest: /etc/motd',
  "        content: 'KRITIS Zone'",
  '',
].join('\n');

const HARDEN_YML = [
  '---',
  '- name: Harden SSH',
  '  hosts: web',
  '  become: true',
  '  tasks:',
  '    - name: Disallow root login',
  '      lineinfile:',
  '        path: /etc/ssh/sshd_config',
  "        regexp: '^#?PermitRootLogin'",
  "        line: 'PermitRootLogin no'",
  '    - name: Disable password auth',
  '      lineinfile:',
  '        path: /etc/ssh/sshd_config',
  "        regexp: '^#?PasswordAuthentication'",
  "        line: 'PasswordAuthentication no'",
  '    - name: Restart sshd',
  '      service:',
  '        name: ssh',
  '        state: restarted',
  '',
].join('\n');

function webHost(id: string, opts: { withKey?: boolean } = {}): HostState {
  const files = [
    { path: '/etc/ssh/sshd_config', content: 'PermitRootLogin yes\nPasswordAuthentication yes\n' },
  ];
  if (opts.withKey !== false) {
    files.push({ path: '/home/timo/.ssh/authorized_keys', content: `${PUBKEY}\n` });
  }
  return createHostState({
    id,
    hostname: id,
    accounts: [{ name: 'timo' }, { name: 'root' }],
    vfsOverlay: { files },
  });
}

/** Controller with keypair, inventory, playbooks; web01+web02 registered. */
function fleet(opts: { web02Key?: boolean } = {}): { shell: ShellEngine; web01: HostState; web02: HostState } {
  const shell = createShell({ type: 'bash', user: 'timo', hostname: 'ansible01' });
  const vfs = shell.getVfs();
  vfs.addFile('/home/timo/.ssh/id_ed25519', '-----PRIVATE-----\n');
  vfs.chmod('/home/timo/.ssh/id_ed25519', '600');
  vfs.addFile('/home/timo/.ssh/id_ed25519.pub', `${PUBKEY}\n`);
  vfs.addFile('/etc/ansible/hosts', '[web]\nweb01\nweb02\n');
  vfs.addFile('/opt/playbooks/baseline.yml', IDEMPOTENT_YML);
  vfs.addFile('/opt/playbooks/harden.yml', HARDEN_YML);
  const web01 = webHost('web01');
  const web02 = webHost('web02', { withKey: opts.web02Key !== false });
  shell.registerHost(web01);
  shell.registerHost(web02);
  return { shell, web01, web02 };
}

describe('ansible-playbook: idempotency (the core)', () => {
  it('first run changed=2 per host, second run changed=0 ok=2', () => {
    const { shell, web01, web02 } = fleet();

    const first = shell.execute('ansible-playbook /opt/playbooks/baseline.yml');
    expect(first.exitCode).toBe(0);
    expect(first.output).toContain('PLAY [Baseline]');
    expect(first.output).toContain('TASK [Disallow root login]');
    expect(first.output).toContain('changed: [web01]');
    expect(first.output).toContain('changed: [web02]');
    expect(first.output).toMatch(/web01\s+: ok=2\s+changed=2\s+unreachable=0\s+failed=0/);
    expect(first.output).toMatch(/web02\s+: ok=2\s+changed=2\s+unreachable=0\s+failed=0/);

    expect(web01.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
      ok: true,
      value: 'PermitRootLogin no\nPasswordAuthentication yes\n',
    });
    expect(web02.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'KRITIS Zone' });

    const second = shell.execute('ansible-playbook /opt/playbooks/baseline.yml');
    expect(second.exitCode).toBe(0);
    expect(second.output).toContain('ok: [web01]');
    expect(second.output).not.toContain('changed: [web01]');
    expect(second.output).toMatch(/web01\s+: ok=2\s+changed=0\s+unreachable=0\s+failed=0/);
    expect(second.output).toMatch(/web02\s+: ok=2\s+changed=0\s+unreachable=0\s+failed=0/);
  });
});

describe('ansible-playbook: --check and --diff', () => {
  it('--check reports changed but mutates nothing, twice', () => {
    const { shell, web01 } = fleet();
    for (let i = 0; i < 2; i++) {
      const r = shell.execute('ansible-playbook --check /opt/playbooks/baseline.yml');
      expect(r.exitCode).toBe(0);
      expect(r.output).toContain('changed: [web01]');
      expect(r.output).toMatch(/web01\s+: ok=2\s+changed=2/);
    }
    expect(web01.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
      ok: true,
      value: 'PermitRootLogin yes\nPasswordAuthentication yes\n',
    });
    expect(web01.vfs.exists('/etc/motd')).toBe(false);
  });

  it('--check --diff prints before/after blocks, still no mutation', () => {
    const { shell, web01 } = fleet();
    const r = shell.execute('ansible-playbook --check --diff /opt/playbooks/baseline.yml');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('--- before: /etc/ssh/sshd_config');
    expect(r.output).toContain('+++ after: /etc/ssh/sshd_config');
    expect(r.output).toContain('-PermitRootLogin yes');
    expect(r.output).toContain('+PermitRootLogin no');
    expect(r.output).toContain('--- before: /etc/motd');
    expect(web01.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
      ok: true,
      value: 'PermitRootLogin yes\nPasswordAuthentication yes\n',
    });
  });
});

describe('ansible-playbook: unreachable hosts', () => {
  it('a host without key auth goes UNREACHABLE; the other still converges', () => {
    const { shell, web01, web02 } = fleet({ web02Key: false });
    const r = shell.execute('ansible-playbook /opt/playbooks/baseline.yml');
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain('fatal: [web02]: UNREACHABLE! =>');
    expect(r.output).toContain('"unreachable": true');
    expect(r.output).toContain('Permission denied (publickey');
    expect(r.output).toMatch(/web02\s+: ok=0\s+changed=0\s+unreachable=1\s+failed=0/);
    expect(r.output).toMatch(/web01\s+: ok=2\s+changed=2\s+unreachable=0\s+failed=0/);
    expect(web01.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
      ok: true,
      value: 'PermitRootLogin no\nPasswordAuthentication yes\n',
    });
    expect(web02.vfs.exists('/etc/motd')).toBe(false);
  });
});

describe('ansible-playbook: module failure and task skipping', () => {
  it('a broken param fails the task, names it, and skips the rest on that host', () => {
    const { shell } = fleet();
    shell.getVfs().addFile('/opt/playbooks/broken.yml', IDEMPOTENT_YML.replace('        path: /etc/ssh/sshd_config', '        pathh: /etc/ssh/sshd_config'));
    const r = shell.execute('ansible-playbook /opt/playbooks/broken.yml');
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain('TASK [Disallow root login]');
    expect(r.output).toContain('fatal: [web01]: FAILED! =>');
    expect(r.output).toContain('missing required arguments: path');
    // Both hosts failed on task 1 → task 2 never renders a header.
    expect(r.output).not.toContain('TASK [Deploy motd]');
    expect(r.output).toMatch(/web01\s+: ok=0\s+changed=0\s+unreachable=0\s+failed=1/);
  });

  it('an invalid player regexp fails the TASK, not the run', () => {
    const { shell, web01 } = fleet();
    shell.getVfs().addFile('/opt/playbooks/badre.yml', [
      '- name: Regexp kaputt',
      '  hosts: web',
      '  become: true',
      '  tasks:',
      '    - name: Deploy motd',
      '      copy:',
      '        dest: /etc/motd',
      "        content: 'KRITIS Zone'",
      '    - name: Broken pattern',
      '      lineinfile:',
      '        path: /etc/ssh/sshd_config',
      "        regexp: '^(PermitRootLogin'",
      "        line: 'PermitRootLogin no'",
    ].join('\n'));
    const r = shell.execute('ansible-playbook /opt/playbooks/badre.yml');
    expect(r.exitCode).toBe(2);
    // The run itself stays intact: play/task structure and recap render.
    expect(r.output).toContain('PLAY [Regexp kaputt]');
    expect(r.output).toContain('TASK [Broken pattern]');
    expect(r.output).toContain('fatal: [web01]: FAILED! =>');
    expect(r.output).toContain("The regular expression '^(PermitRootLogin' is invalid");
    expect(r.output).toContain('PLAY RECAP');
    expect(r.output).toMatch(/web01\s+: ok=1\s+changed=1\s+unreachable=0\s+failed=1/);
    // The prior task's mutation is legitimate and stays.
    expect(web01.vfs.readFile('/etc/motd')).toMatchObject({ ok: true, value: 'KRITIS Zone' });
  });

  it('an unknown module fails ansible-style', () => {
    const { shell } = fleet();
    shell.getVfs().addFile('/opt/playbooks/unknown.yml', [
      '- name: p',
      '  hosts: web',
      '  become: true',
      '  tasks:',
      '    - name: t',
      '      pingpong:',
      '        target: web01',
    ].join('\n'));
    const r = shell.execute('ansible-playbook /opt/playbooks/unknown.yml');
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain("The module 'pingpong' was not found");
  });
});

describe('ansible-playbook: parse errors and syntax-check', () => {
  it('a YAML syntax error exits 4 with the line number', () => {
    const { shell } = fleet();
    shell.getVfs().addFile('/opt/playbooks/bad.yml', '- name: p\n  hosts all\n');
    const r = shell.execute('ansible-playbook /opt/playbooks/bad.yml');
    expect(r.exitCode).toBe(4);
    expect(r.error).toContain('ERROR! Syntax Error while loading YAML.');
    expect(r.error).toContain('line 2');
  });

  it('--syntax-check on a valid playbook prints the path, exit 0, runs nothing', () => {
    const { shell, web01 } = fleet();
    const r = shell.execute('ansible-playbook --syntax-check /opt/playbooks/baseline.yml');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('playbook: /opt/playbooks/baseline.yml');
    expect(r.output).not.toContain('PLAY');
    expect(web01.vfs.exists('/etc/motd')).toBe(false);
  });

  it('a missing playbook could not be found, exit 1', () => {
    const { shell } = fleet();
    const r = shell.execute('ansible-playbook /opt/playbooks/nix.yml');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('ERROR! the playbook: /opt/playbooks/nix.yml could not be found');
  });
});

describe('ansible-playbook: inventory handling', () => {
  it('missing inventory warns and matches no hosts', () => {
    const { shell } = fleet();
    shell.getVfs().remove('/etc/ansible/hosts');
    const r = shell.execute('ansible-playbook /opt/playbooks/baseline.yml');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('[WARNING]: No inventory was parsed, only implicit localhost is available');
    expect(r.output).toContain('skipping: no hosts matched');
  });

  it('-i selects an alternative inventory', () => {
    const { shell, web01, web02 } = fleet();
    shell.getVfs().addFile('/opt/inventar.ini', '[web]\nweb01\n');
    const r = shell.execute('ansible-playbook -i /opt/inventar.ini /opt/playbooks/baseline.yml');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('changed: [web01]');
    expect(r.output).not.toContain('web02');
    expect(web01.vfs.exists('/etc/motd')).toBe(true);
    expect(web02.vfs.exists('/etc/motd')).toBe(false);
  });
});

describe('ansible-playbook: become gate', () => {
  it('become:false play touching /etc fails with Permission denied', () => {
    const { shell, web01 } = fleet();
    shell.getVfs().addFile('/opt/playbooks/nobecome.yml', IDEMPOTENT_YML.replace('  become: true', '  become: false'));
    const r = shell.execute('ansible-playbook /opt/playbooks/nobecome.yml');
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain('fatal: [web01]: FAILED! =>');
    expect(r.output).toContain('Permission denied');
    expect(web01.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
      ok: true,
      value: 'PermitRootLogin yes\nPasswordAuthentication yes\n',
    });
  });

  it('service and user modules also require become', () => {
    const { shell } = fleet();
    shell.getVfs().addFile('/opt/playbooks/svc-nobecome.yml', [
      '- name: p',
      '  hosts: web',
      '  become: false',
      '  tasks:',
      '    - name: restart',
      '      service:',
      '        name: ssh',
      '        state: restarted',
    ].join('\n'));
    const r = shell.execute('ansible-playbook /opt/playbooks/svc-nobecome.yml');
    expect(r.exitCode).toBe(2);
    expect(r.output).toContain('Permission denied');
  });
});

describe('ansible-playbook: the B5 finale flow', () => {
  it('harden playbook flips sshdEffective on all targets via service restart', () => {
    const { shell, web01, web02 } = fleet();
    expect(web01.sshdEffective).toEqual({ permitRootLogin: true, passwordAuthentication: true });

    const r = shell.execute('ansible-playbook /opt/playbooks/harden.yml');
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('TASK [Restart sshd]');
    expect(r.output).toMatch(/web01\s+: ok=3\s+changed=3/);

    for (const host of [web01, web02]) {
      expect(host.sshdEffective).toEqual({ permitRootLogin: false, passwordAuthentication: false });
      expect(host.vfs.readFile('/etc/ssh/sshd_config')).toMatchObject({
        ok: true,
        value: 'PermitRootLogin no\nPasswordAuthentication no\n',
      });
    }
  });
});
