import { describe, it, expect, beforeEach } from 'vitest';
import { createShell } from './index';
import { ShellEngine } from './ShellEngine';

function ps(): ShellEngine {
  const shell = createShell({
    type: 'powershell',
    user: 'Administrator',
    hostname: 'WIN-SRV01',
    directories: ['C:\\Users\\Administrator\\logs'],
    files: [
      { path: 'C:\\Users\\Administrator\\app.log', content: 'INFO start\nERROR disk full\nINFO tick\nERROR timeout\nINFO stop\n' },
      { path: 'C:\\Users\\Administrator\\hosts.txt', content: 'web01\nweb02\ndb01\nweb01\n' },
    ],
  });
  shell.getVfs().setCurrentPath('C:\\Users\\Administrator');
  return shell;
}

describe('PowerShell case-insensitivity', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('resolves cmdlet names regardless of case', () => {
    expect(shell.execute('get-process').exitCode).toBe(0);
    expect(shell.execute('GET-PROCESS').output).toContain('ProcessName');
    expect(shell.execute('Get-Process').output).toContain('ProcessName');
  });

  it('resolves aliases (gps, gci)', () => {
    expect(shell.execute('gci').exitCode).toBe(0);
    expect(shell.execute('gps').output).toContain('ProcessName');
  });

  it('reports unknown cmdlets with the PowerShell wording', () => {
    const result = shell.execute('Get-Nonsense');
    expect(result.exitCode).toBe(127);
    expect(result.error).toContain("is not recognized as the name of a cmdlet");
  });
});

describe('PowerShell parameter binding', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('binds single-dash long parameters with values', () => {
    const result = shell.execute('Test-NetConnection -ComputerName 10.0.0.1 -Port 22');
    expect(result.output).toContain('RemotePort       : 22');
    expect(result.output).toContain('TcpTestSucceeded : true');
  });

  it('is case-insensitive for parameter names', () => {
    const result = shell.execute('Test-NetConnection -computername 10.0.0.1 -port 80');
    expect(result.output).toContain('RemotePort       : 80');
  });

  it('accepts unambiguous parameter abbreviations', () => {
    const result = shell.execute('Test-NetConnection -Comp 10.0.0.1 -Port 443');
    expect(result.output).toContain('RemotePort       : 443');
  });

  it('binds -Param:value colon syntax', () => {
    const result = shell.execute('Get-Content -Path:app.log -Tail:2');
    expect(result.output.trim().split('\n').length).toBe(2);
    expect(result.output).toContain('INFO stop');
  });

  it('treats switch parameters as booleans', () => {
    const result = shell.execute('Get-ChildItem -Force');
    expect(result.exitCode).toBe(0);
  });
});

describe('Select-String', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('prefixes file:line:text when searching a file', () => {
    // Pipe through Select-Object so Select-String is not the terminal stage
    // (as the last stage it colorizes, exactly like grep on a TTY).
    const result = shell.execute('Select-String -Pattern ERROR -Path app.log | Select-Object');
    expect(result.output.split('\n')).toEqual([
      'app.log:2:ERROR disk full',
      'app.log:4:ERROR timeout',
    ]);
  });

  it('emits bare lines for pipeline input', () => {
    const result = shell.execute('Get-Content app.log | Select-String ERROR | Select-Object');
    expect(result.output).toBe('ERROR disk full\nERROR timeout');
  });

  it('colorizes matches when it is the terminal stage', () => {
    const result = shell.execute('Get-Content app.log | Select-String ERROR');
    expect(result.output).toContain('\x1b[31mERROR\x1b[0m');
  });

  it('supports -NotMatch', () => {
    const result = shell.execute('Get-Content app.log | Select-String INFO -NotMatch');
    expect(result.output).toBe('ERROR disk full\nERROR timeout');
  });

  it('supports -Quiet returning True/False', () => {
    expect(shell.execute('Get-Content app.log | Select-String ERROR -Quiet').output).toBe('True');
    expect(shell.execute('Get-Content app.log | Select-String NOPE -Quiet').output).toBe('False');
  });
});

describe('PowerShell pipeline cmdlets', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('Measure-Object -Line counts lines from the pipeline', () => {
    const result = shell.execute('Get-Content app.log | Select-String ERROR | Measure-Object -Line');
    expect(result.output).toContain('Lines');
    expect(result.output).toMatch(/\n\s+2\n/);
  });

  it('Select-Object -First limits output', () => {
    const result = shell.execute('Get-Content app.log | Select-Object -First 2');
    expect(result.output).toBe('INFO start\nERROR disk full');
  });

  it('Sort-Object -Unique sorts and dedupes', () => {
    const result = shell.execute('Get-Content hosts.txt | Sort-Object -Unique');
    expect(result.output).toBe('db01\nweb01\nweb02');
  });

  it('Where-Object filters with -match on $_', () => {
    const result = shell.execute("Get-Content app.log | Where-Object { $_ -match 'ERROR' }");
    expect(result.output).toBe('ERROR disk full\nERROR timeout');
  });

  it('supports the ? alias for Where-Object', () => {
    const result = shell.execute("Get-Content app.log | ? { $_ -match 'INFO' } | Measure-Object -Line");
    expect(result.output).toMatch(/\n\s+3\n/);
  });
});

describe('PowerShell more pipeline cmdlets', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('Group-Object counts identical lines (sort|uniq -c equivalent)', () => {
    const result = shell.execute('Get-Content hosts.txt | Group-Object');
    // web01 appears twice, web02 once, db01 once
    expect(result.output).toContain('Count Name');
    const web01Row = result.output.split('\n').find(l => l.includes('web01'));
    expect(web01Row).toMatch(/^\s*2 web01/);
  });

  it('Get-Unique collapses adjacent duplicates after sorting', () => {
    const result = shell.execute('Get-Content hosts.txt | Sort-Object | Get-Unique');
    expect(result.output).toBe('db01\nweb01\nweb02');
  });

  it('Format-Table passes input through so pipelines still compose', () => {
    const result = shell.execute('Get-Content app.log | Select-String INFO | Select-Object | Format-Table');
    expect(result.output).toContain('INFO start');
  });

  it('Out-Null discards pipeline output', () => {
    const result = shell.execute('Get-Content app.log | Out-Null');
    expect(result.output).toBe('');
  });
});

describe('PowerShell tab completion', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('completes single-dash long parameters', () => {
    const c = shell.complete('Test-NetConnection -Comp', 'Test-NetConnection -Comp'.length);
    expect(c.map(x => x.value)).toContain('-ComputerName');
  });

  it('completes parameters case-insensitively on a lowercase cmdlet', () => {
    const c = shell.complete('get-content -ta', 'get-content -ta'.length);
    expect(c.map(x => x.value)).toContain('-Tail');
  });

  it('completes cmdlet names case-insensitively', () => {
    const c = shell.complete('sort-obj', 'sort-obj'.length);
    expect(c.map(x => x.value.toLowerCase())).toContain('sort-object');
  });
});

describe('Get-FileHash', () => {
  function shellWithFile() {
    const shell = createShell({
      type: 'powershell', user: 'Admin', hostname: 'WIN',
      files: [{ path: 'C:\\evidence\\sample.bin', content: 'abc' }],
    });
    shell.getVfs().setCurrentPath('C:\\evidence');
    return shell;
  }

  it('computes uppercase SHA256 by default (verified vector for "abc")', () => {
    const r = shellWithFile().execute('Get-FileHash sample.bin');
    expect(r.output).toContain('SHA256');
    expect(r.output).toContain('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
  });

  it('supports -Algorithm MD5', () => {
    const r = shellWithFile().execute('Get-FileHash sample.bin -Algorithm MD5');
    expect(r.output).toContain('900150983CD24FB0D6963F7D28E17F72');
  });

  it('supports -Algorithm SHA1', () => {
    const r = shellWithFile().execute('Get-FileHash -Algorithm SHA1 sample.bin');
    expect(r.output).toContain('A9993E364706816ABA3E25717850C26C9CD0D89D');
  });

  it('rejects an unknown algorithm', () => {
    const r = shellWithFile().execute('Get-FileHash sample.bin -Algorithm SHA999');
    expect(r.exitCode).toBe(1);
    expect(r.error).toContain('SHA999');
  });
});

describe('PowerShell help and $?', () => {
  let shell: ShellEngine;
  beforeEach(() => { shell = ps(); });

  it('generates Get-Help from cmdlet metadata', () => {
    const result = shell.execute('Get-Help Select-String');
    expect(result.output).toContain('NAME');
    expect(result.output).toContain('Select-String');
    expect(result.output).toContain('-Pattern');
  });

  it('answers the -? help switch', () => {
    const result = shell.execute('Get-Process -?');
    expect(result.output).toContain('Usage:');
  });

  it('renders $? as a boolean', () => {
    shell.execute('Get-Process');
    expect(shell.execute('Write-Output $?').output.trim()).toBe('True');
    shell.execute('Get-Nonsense');
    expect(shell.execute('Write-Output $?').output.trim()).toBe('False');
  });
});
