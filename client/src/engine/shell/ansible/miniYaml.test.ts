/**
 * miniYaml: the playbook-subset parser. Structural round-trip of the harden
 * fixture, scalar typing (booleans vs. mode strings), quoting, comments,
 * and error positions for every malformation the runner surfaces.
 */
import { describe, it, expect } from 'vitest';
import { parsePlaybook } from './miniYaml';

const HARDEN_FIXTURE = `---
- name: Harden SSH
  hosts: web
  become: true
  tasks:
    - name: Disallow root login
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin no'
    - name: Restart sshd
      service:
        name: ssh
        state: restarted
`;

describe('parsePlaybook: harden fixture round-trip', () => {
  it('parses the full play structure', () => {
    const r = parsePlaybook(HARDEN_FIXTURE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays).toHaveLength(1);
    const play = r.plays[0];
    expect(play.name).toBe('Harden SSH');
    expect(play.hosts).toBe('web');
    expect(play.become).toBe(true);
    expect(play.tasks).toHaveLength(2);

    expect(play.tasks[0]).toEqual({
      name: 'Disallow root login',
      module: 'lineinfile',
      params: {
        path: '/etc/ssh/sshd_config',
        regexp: '^#?PermitRootLogin',
        line: 'PermitRootLogin no',
      },
    });
    expect(play.tasks[1]).toEqual({
      name: 'Restart sshd',
      module: 'service',
      params: { name: 'ssh', state: 'restarted' },
    });
  });

  it('quoted scalars keep inner colons and strip the quotes', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  tasks:',
      '    - name: t',
      '      lineinfile:',
      "        path: /etc/x",
      "        line: 'Key: value with colon'",
      '        regexp: "another: colon"',
    ].join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays[0].tasks[0].params.line).toBe('Key: value with colon');
    expect(r.plays[0].tasks[0].params.regexp).toBe('another: colon');
  });

  it('parses booleans but keeps file modes as strings', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  become: false',
      '  tasks:',
      '    - name: t',
      '      copy:',
      '        dest: /etc/motd',
      '        content: hello',
      '        mode: 0644',
    ].join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays[0].become).toBe(false);
    expect(r.plays[0].tasks[0].params.mode).toBe('0644');
  });

  it('become defaults to false when omitted', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  tasks:',
      '    - name: t',
      '      user:',
      '        name: deploy',
    ].join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays[0].become).toBe(false);
  });

  it('strips full-line and trailing comments, but not # inside quotes', () => {
    const r = parsePlaybook([
      '# top comment',
      '- name: p   # trailing',
      '  hosts: all',
      '  tasks:',
      '    # indented comment line',
      '    - name: t',
      '      lineinfile:',
      "        regexp: '^#?PermitRootLogin'  # keep the quoted hash",
      '        path: /etc/ssh/sshd_config',
      "        line: 'PermitRootLogin no'",
      '',
    ].join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays[0].name).toBe('p');
    expect(r.plays[0].tasks[0].params.regexp).toBe('^#?PermitRootLogin');
  });

  it('parses two plays and two hosts patterns', () => {
    const r = parsePlaybook([
      '---',
      '- name: one',
      '  hosts: web',
      '  tasks:',
      '    - name: a',
      '      user:',
      '        name: x',
      '- name: two',
      '  hosts: db',
      '  tasks:',
      '    - name: b',
      '      user:',
      '        name: y',
    ].join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plays.map(p => p.hosts)).toEqual(['web', 'db']);
  });
});

describe('parsePlaybook: errors carry line/column', () => {
  it('odd indentation is a YAML syntax error with the line number', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  tasks:',
      '    - name: t',
      '      lineinfile:',
      '         path: /etc/x', // 9 spaces — not a multiple of 2
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! Syntax Error while loading YAML.');
    expect(r.error).toContain('line 6, column 10');
    expect(r.line).toBe(6);
  });

  it('unexpected deep indentation is a syntax error', () => {
    const r = parsePlaybook([
      '- name: p',
      '      hosts: all', // jumps from 2-expected to 6
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! Syntax Error while loading YAML.');
    expect(r.line).toBe(2);
  });

  it('a task with no module key errors with no-action wording', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  tasks:',
      '    - name: t',
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! no module/action detected in task');
    expect(r.line).toBe(4);
  });

  it('a task with two module keys errors with conflicting-action wording', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts: all',
      '  tasks:',
      '    - name: t',
      '      lineinfile:',
      '        path: /etc/x',
      "        line: 'y'",
      '      service:',
      '        name: ssh',
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! conflicting action statements: lineinfile, service');
    expect(r.line).toBe(4);
  });

  it('a play without hosts errors with the required-field wording', () => {
    const r = parsePlaybook([
      '- name: p',
      '  tasks:',
      '    - name: t',
      '      user:',
      '        name: x',
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("ERROR! the field 'hosts' is required but was not set");
    expect(r.line).toBe(1);
  });

  it('a non-list top level errors', () => {
    const r = parsePlaybook('name: p\nhosts: all\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! A playbook must be a list of plays');
    expect(r.line).toBe(1);
  });

  it('a line that is not key: value is a syntax error', () => {
    const r = parsePlaybook([
      '- name: p',
      '  hosts all', // missing colon
    ].join('\n'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! Syntax Error while loading YAML.');
    expect(r.line).toBe(2);
  });

  it('an empty playbook errors as non-list', () => {
    const r = parsePlaybook('---\n# nothing here\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('ERROR! A playbook must be a list of plays');
  });
});
