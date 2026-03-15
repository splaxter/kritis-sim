/**
 * Virtual Filesystem Implementation
 * Provides a complete in-memory filesystem for terminal emulation
 */

import {
  VFSNode,
  VFSPermissions,
  VirtualFilesystemInterface,
  Result,
  ok,
  err,
  Completion,
} from './types';

const DEFAULT_PERMISSIONS: VFSPermissions = {
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  other: { read: true, write: false, execute: false },
};

const DIR_PERMISSIONS: VFSPermissions = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
};

export class VirtualFilesystem implements VirtualFilesystemInterface {
  private root: VFSNode;
  private currentPath: string;
  private currentUser: string;
  private currentGroup: string;
  private homeDirectory: string;
  private env: Record<string, string>;
  private shellType: 'bash' | 'powershell';

  constructor(options: {
    shellType?: 'bash' | 'powershell';
    user?: string;
    group?: string;
    home?: string;
    env?: Record<string, string>;
  } = {}) {
    this.shellType = options.shellType || 'bash';
    this.currentUser = options.user || 'admin';
    this.currentGroup = options.group || 'admin';
    this.homeDirectory = options.home || (this.shellType === 'bash' ? `/home/${this.currentUser}` : `C:\\Users\\${this.currentUser}`);
    this.currentPath = this.homeDirectory;
    this.env = {
      USER: this.currentUser,
      HOME: this.homeDirectory,
      PWD: this.currentPath,
      PATH: '/usr/local/bin:/usr/bin:/bin',
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      LANG: 'de_DE.UTF-8',
      ...options.env,
    };

    // Initialize root
    this.root = this.createDirectoryNode('', 'root', 'root');
  }

  // ============================================================================
  // State Methods
  // ============================================================================

  getCurrentPath(): string {
    return this.currentPath;
  }

  setCurrentPath(path: string): Result<void> {
    const resolved = this.resolvePath(path);

    if (!this.exists(resolved)) {
      return err(`cd: ${path}: No such file or directory`);
    }

    if (!this.isDirectory(resolved)) {
      return err(`cd: ${path}: Not a directory`);
    }

    if (!this.checkPermission(resolved, 'execute')) {
      return err(`cd: ${path}: Permission denied`);
    }

    this.currentPath = resolved;
    this.env.PWD = resolved;
    return ok(undefined);
  }

  getUser(): string {
    return this.currentUser;
  }

  getEnv(key: string): string | undefined {
    return this.env[key];
  }

  setEnv(key: string, value: string): void {
    this.env[key] = value;
  }

  // ============================================================================
  // Path Operations
  // ============================================================================

  resolvePath(path: string): string {
    if (!path) return this.currentPath;

    // Handle home directory
    if (path === '~' || path.startsWith('~/')) {
      path = this.homeDirectory + path.slice(1);
    }

    // Handle environment variables
    path = path.replace(/\$(\w+)/g, (_, name) => this.env[name] || '');
    path = path.replace(/\$\{(\w+)\}/g, (_, name) => this.env[name] || '');

    // Handle Windows vs Unix paths
    const isWindows = this.shellType === 'powershell';
    const sep = isWindows ? '\\' : '/';

    // Absolute path check
    const isAbsolute = isWindows
      ? /^[A-Z]:\\/i.test(path)
      : path.startsWith('/');

    let parts: string[];
    if (isAbsolute) {
      parts = path.split(/[/\\]/).filter(Boolean);
      if (isWindows && /^[A-Z]:$/i.test(parts[0])) {
        // Keep drive letter
      }
    } else {
      // Relative path
      const currentParts = this.currentPath.split(/[/\\]/).filter(Boolean);
      const pathParts = path.split(/[/\\]/).filter(Boolean);
      parts = [...currentParts, ...pathParts];
    }

    // Resolve . and ..
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (resolved.length > 0 && !resolved[resolved.length - 1].includes(':')) {
          resolved.pop();
        }
        continue;
      }
      resolved.push(part);
    }

    if (isWindows) {
      return resolved.length > 0 ? resolved.join('\\') : 'C:\\';
    }
    return '/' + resolved.join('/');
  }

  dirname(path: string): string {
    const sep = this.shellType === 'powershell' ? '\\' : '/';
    const parts = path.split(/[/\\]/).filter(Boolean);
    parts.pop();
    if (this.shellType === 'powershell') {
      return parts.length > 0 ? parts.join('\\') : 'C:\\';
    }
    return '/' + parts.join('/');
  }

  basename(path: string): string {
    const parts = path.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || '';
  }

  join(...parts: string[]): string {
    const sep = this.shellType === 'powershell' ? '\\' : '/';
    return parts.join(sep).replace(/[/\\]+/g, sep);
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  private getNode(path: string): VFSNode | null {
    const resolved = this.resolvePath(path);
    const parts = resolved.split(/[/\\]/).filter(Boolean);

    let current = this.root;
    for (const part of parts) {
      if (!current.children) return null;
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }
    return current;
  }

  private getParentNode(path: string): { parent: VFSNode; name: string } | null {
    const resolved = this.resolvePath(path);
    const parts = resolved.split(/[/\\]/).filter(Boolean);

    if (parts.length === 0) return null;

    const name = parts.pop()!;
    let current = this.root;

    for (const part of parts) {
      if (!current.children) return null;
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }

    return { parent: current, name };
  }

  exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  isFile(path: string): boolean {
    const node = this.getNode(path);
    return node?.type === 'file';
  }

  isDirectory(path: string): boolean {
    const node = this.getNode(path);
    return node?.type === 'directory';
  }

  stat(path: string): Result<VFSNode> {
    const node = this.getNode(path);
    if (!node) {
      return err(`stat: cannot stat '${path}': No such file or directory`);
    }
    return ok(node);
  }

  readFile(path: string): Result<string> {
    const node = this.getNode(path);

    if (!node) {
      return err(`cat: ${path}: No such file or directory`);
    }

    if (node.type === 'directory') {
      return err(`cat: ${path}: Is a directory`);
    }

    if (!this.checkPermission(path, 'read')) {
      return err(`cat: ${path}: Permission denied`);
    }

    return ok(node.content || '');
  }

  readDirectory(path: string): Result<VFSNode[]> {
    const node = this.getNode(path);

    if (!node) {
      return err(`ls: cannot access '${path}': No such file or directory`);
    }

    if (node.type !== 'directory') {
      return err(`ls: ${path}: Not a directory`);
    }

    if (!this.checkPermission(path, 'read')) {
      return err(`ls: cannot open directory '${path}': Permission denied`);
    }

    const entries = Array.from(node.children?.values() || []);
    return ok(entries);
  }

  writeFile(path: string, content: string): Result<void> {
    const resolved = this.resolvePath(path);
    const parentInfo = this.getParentNode(resolved);

    if (!parentInfo) {
      return err(`cannot create '${path}': No such file or directory`);
    }

    const { parent, name } = parentInfo;

    if (!parent.children) {
      parent.children = new Map();
    }

    const existing = parent.children.get(name);
    if (existing && existing.type === 'directory') {
      return err(`cannot overwrite directory '${path}'`);
    }

    const node: VFSNode = {
      name,
      type: 'file',
      permissions: { ...DEFAULT_PERMISSIONS },
      owner: this.currentUser,
      group: this.currentGroup,
      size: content.length,
      created: existing?.created || new Date(),
      modified: new Date(),
      content,
    };

    parent.children.set(name, node);
    return ok(undefined);
  }

  appendFile(path: string, content: string): Result<void> {
    const existing = this.readFile(path);
    const newContent = existing.ok ? existing.value + content : content;
    return this.writeFile(path, newContent);
  }

  private createDirectoryNode(name: string, owner?: string, group?: string): VFSNode {
    return {
      name,
      type: 'directory',
      permissions: { ...DIR_PERMISSIONS },
      owner: owner || this.currentUser,
      group: group || this.currentGroup,
      size: 4096,
      created: new Date(),
      modified: new Date(),
      children: new Map(),
    };
  }

  mkdir(path: string, recursive: boolean = false): Result<void> {
    const resolved = this.resolvePath(path);
    const parts = resolved.split(/[/\\]/).filter(Boolean);

    let current = this.root;
    const toCreate: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children) {
        current.children = new Map();
      }

      const child = current.children.get(part);
      if (child) {
        if (child.type !== 'directory') {
          return err(`mkdir: cannot create directory '${path}': Not a directory`);
        }
        current = child;
      } else {
        if (!recursive && i < parts.length - 1) {
          return err(`mkdir: cannot create directory '${path}': No such file or directory`);
        }
        toCreate.push(part);
      }
    }

    // Create remaining directories
    for (const part of toCreate) {
      if (!current.children) {
        current.children = new Map();
      }
      const newDir = this.createDirectoryNode(part);
      current.children.set(part, newDir);
      current = newDir;
    }

    return ok(undefined);
  }

  remove(path: string, recursive: boolean = false): Result<void> {
    const resolved = this.resolvePath(path);
    const parentInfo = this.getParentNode(resolved);

    if (!parentInfo) {
      return err(`rm: cannot remove '${path}': No such file or directory`);
    }

    const { parent, name } = parentInfo;
    const node = parent.children?.get(name);

    if (!node) {
      return err(`rm: cannot remove '${path}': No such file or directory`);
    }

    if (node.type === 'directory') {
      if (!recursive) {
        return err(`rm: cannot remove '${path}': Is a directory`);
      }
      if (node.children && node.children.size > 0 && !recursive) {
        return err(`rm: cannot remove '${path}': Directory not empty`);
      }
    }

    parent.children?.delete(name);
    return ok(undefined);
  }

  copy(src: string, dest: string, recursive: boolean = false): Result<void> {
    const srcNode = this.getNode(src);

    if (!srcNode) {
      return err(`cp: cannot stat '${src}': No such file or directory`);
    }

    if (srcNode.type === 'directory' && !recursive) {
      return err(`cp: -r not specified; omitting directory '${src}'`);
    }

    const cloneNode = (node: VFSNode, newName?: string): VFSNode => {
      const clone: VFSNode = {
        ...node,
        name: newName || node.name,
        created: new Date(),
        modified: new Date(),
      };

      if (node.children) {
        clone.children = new Map();
        for (const [name, child] of node.children) {
          clone.children.set(name, cloneNode(child));
        }
      }

      return clone;
    };

    const destResolved = this.resolvePath(dest);
    const destNode = this.getNode(dest);

    if (destNode?.type === 'directory') {
      // Copy into directory
      const clone = cloneNode(srcNode);
      destNode.children?.set(clone.name, clone);
    } else {
      // Copy with new name
      const parentInfo = this.getParentNode(destResolved);
      if (!parentInfo) {
        return err(`cp: cannot create '${dest}': No such file or directory`);
      }
      const clone = cloneNode(srcNode, parentInfo.name);
      parentInfo.parent.children?.set(parentInfo.name, clone);
    }

    return ok(undefined);
  }

  move(src: string, dest: string): Result<void> {
    const copyResult = this.copy(src, dest, true);
    if (!copyResult.ok) return copyResult;
    return this.remove(src, true);
  }

  // ============================================================================
  // Permissions
  // ============================================================================

  checkPermission(path: string, action: 'read' | 'write' | 'execute'): boolean {
    const node = this.getNode(path);
    if (!node) return false;

    // Root can do anything
    if (this.currentUser === 'root') return true;

    const perms = node.permissions;

    if (node.owner === this.currentUser) {
      return perms.owner[action];
    }

    if (node.group === this.currentGroup) {
      return perms.group[action];
    }

    return perms.other[action];
  }

  chmod(path: string, mode: string): Result<void> {
    const node = this.getNode(path);
    if (!node) {
      return err(`chmod: cannot access '${path}': No such file or directory`);
    }

    // Parse octal mode (e.g., "755", "644")
    if (/^[0-7]{3}$/.test(mode)) {
      const [o, g, u] = mode.split('').map(Number);
      node.permissions = {
        owner: { read: !!(o & 4), write: !!(o & 2), execute: !!(o & 1) },
        group: { read: !!(g & 4), write: !!(g & 2), execute: !!(g & 1) },
        other: { read: !!(u & 4), write: !!(u & 2), execute: !!(u & 1) },
      };
      return ok(undefined);
    }

    return err(`chmod: invalid mode: '${mode}'`);
  }

  // ============================================================================
  // Completions
  // ============================================================================

  getPathCompletions(partial: string): Completion[] {
    // Handle empty input
    if (!partial) {
      const result = this.readDirectory(this.currentPath);
      if (!result.ok) return [];
      return result.value.map(node => ({
        value: node.name + (node.type === 'directory' ? '/' : ''),
        display: node.name + (node.type === 'directory' ? '/' : ''),
        type: node.type === 'directory' ? 'directory' : 'file',
      }));
    }

    const resolved = this.resolvePath(partial);
    const dirPath = this.dirname(resolved);
    const prefix = this.basename(partial);

    // If partial ends with / or \, list that directory
    if (partial.endsWith('/') || partial.endsWith('\\')) {
      const result = this.readDirectory(resolved);
      if (!result.ok) return [];
      return result.value.map(node => ({
        value: partial + node.name + (node.type === 'directory' ? '/' : ''),
        display: node.name + (node.type === 'directory' ? '/' : ''),
        type: node.type === 'directory' ? 'directory' : 'file',
      }));
    }

    // Get parent directory and filter by prefix
    const result = this.readDirectory(dirPath);
    if (!result.ok) return [];

    const matches = result.value.filter(node =>
      node.name.toLowerCase().startsWith(prefix.toLowerCase())
    );

    const parentPath = partial.slice(0, partial.length - prefix.length);

    return matches.map(node => ({
      value: parentPath + node.name + (node.type === 'directory' ? '/' : ''),
      display: node.name + (node.type === 'directory' ? '/' : ''),
      type: node.type === 'directory' ? 'directory' : 'file',
    }));
  }

  // ============================================================================
  // Glob Pattern Matching
  // ============================================================================

  glob(pattern: string): string[] {
    const resolved = this.resolvePath(pattern);
    const dir = this.dirname(resolved);
    const filePattern = this.basename(resolved);

    // Convert glob to regex
    const regexPattern = filePattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');

    const result = this.readDirectory(dir);
    if (!result.ok) return [pattern]; // Return original if directory doesn't exist

    const matches = result.value
      .filter(node => regex.test(node.name))
      .map(node => this.join(dir, node.name));

    return matches.length > 0 ? matches : [pattern];
  }

  // ============================================================================
  // Initialization Helpers
  // ============================================================================

  addFile(path: string, content: string, permissions?: Partial<VFSPermissions>): void {
    const resolved = this.resolvePath(path);
    const parts = resolved.split(/[/\\]/).filter(Boolean);
    const fileName = parts.pop()!;

    // Ensure parent directories exist
    let current = this.root;
    for (const part of parts) {
      if (!current.children) {
        current.children = new Map();
      }
      if (!current.children.has(part)) {
        current.children.set(part, this.createDirectoryNode(part));
      }
      current = current.children.get(part)!;
    }

    // Create file
    if (!current.children) {
      current.children = new Map();
    }

    const node: VFSNode = {
      name: fileName,
      type: 'file',
      permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
      owner: this.currentUser,
      group: this.currentGroup,
      size: content.length,
      created: new Date(),
      modified: new Date(),
      content,
    };

    current.children.set(fileName, node);
  }

  addDirectory(path: string): void {
    this.mkdir(path, true);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createLinuxFilesystem(options: {
  user?: string;
  hostname?: string;
} = {}): VirtualFilesystem {
  const user = options.user || 'admin';
  const hostname = options.hostname || 'server';

  const vfs = new VirtualFilesystem({
    shellType: 'bash',
    user,
    home: `/home/${user}`,
    env: {
      HOSTNAME: hostname,
      LOGNAME: user,
    },
  });

  // Create standard Linux directory structure
  vfs.addDirectory('/bin');
  vfs.addDirectory('/etc');
  vfs.addDirectory('/etc/network');
  vfs.addDirectory('/etc/ssh');
  vfs.addDirectory(`/home/${user}`);
  vfs.addDirectory(`/home/${user}/Documents`);
  vfs.addDirectory(`/home/${user}/.ssh`);
  vfs.addDirectory('/opt');
  vfs.addDirectory('/root');
  vfs.addDirectory('/tmp');
  vfs.addDirectory('/usr/bin');
  vfs.addDirectory('/usr/local/bin');
  vfs.addDirectory('/var/log');
  vfs.addDirectory('/var/log/apache2');
  vfs.addDirectory('/var/www/html');

  // Add common files
  vfs.addFile('/etc/passwd', `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
${user}:x:1000:1000:${user}:/home/${user}:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin`);

  vfs.addFile('/etc/hosts', `127.0.0.1\tlocalhost
127.0.1.1\t${hostname}
::1\tlocalhost ip6-localhost ip6-loopback`);

  vfs.addFile('/etc/resolv.conf', `nameserver 8.8.8.8
nameserver 8.8.4.4`);

  vfs.addFile('/etc/hostname', hostname);

  vfs.addFile('/etc/os-release', `NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 22.04.3 LTS"
VERSION_ID="22.04"`);

  vfs.addFile(`/home/${user}/.bashrc`, `# ~/.bashrc
export PS1='\\u@\\h:\\w\\$ '
alias ll='ls -la'
alias grep='grep --color=auto'`);

  vfs.addFile(`/home/${user}/.bash_history`, `ls -la
cd /var/log
grep error syslog
cat /etc/passwd`);

  // Sample log files
  const now = new Date();
  const logDate = now.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');

  vfs.addFile('/var/log/syslog', `${logDate} ${hostname} systemd[1]: Starting Daily apt download activities...
${logDate} ${hostname} systemd[1]: Started Daily apt download activities.
${logDate} ${hostname} kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=192.168.1.100 DST=10.0.0.1
${logDate} ${hostname} sshd[1234]: Accepted publickey for ${user} from 192.168.1.50 port 52413
${logDate} ${hostname} CRON[5678]: (root) CMD (test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily ))`);

  vfs.addFile('/var/log/auth.log', `${logDate} ${hostname} sshd[1234]: Accepted publickey for ${user} from 192.168.1.50 port 52413 ssh2
${logDate} ${hostname} sshd[1234]: pam_unix(sshd:session): session opened for user ${user}
${logDate} ${hostname} sudo: ${user} : TTY=pts/0 ; PWD=/home/${user} ; USER=root ; COMMAND=/bin/cat /etc/shadow
${logDate} ${hostname} sshd[5678]: Failed password for invalid user admin from 203.0.113.42 port 44532 ssh2
${logDate} ${hostname} sshd[5678]: Connection closed by invalid user admin 203.0.113.42 port 44532 [preauth]`);

  vfs.addFile('/var/log/apache2/access.log', `192.168.1.100 - - [14/Mar/2026:10:00:00 +0100] "GET / HTTP/1.1" 200 1234
192.168.1.101 - - [14/Mar/2026:10:00:01 +0100] "GET /admin HTTP/1.1" 403 567
10.0.0.50 - - [14/Mar/2026:10:00:02 +0100] "POST /api/login HTTP/1.1" 401 89`);

  vfs.addFile('/var/log/apache2/error.log', `[Fri Mar 14 10:00:00.123456 2026] [error] [pid 1234] [client 192.168.1.101:54321] AH01630: client denied by server configuration
[Fri Mar 14 10:00:01.234567 2026] [warn] [pid 1235] mod_ssl: SSL handshake failed`);

  return vfs;
}

export function createWindowsFilesystem(options: {
  user?: string;
  hostname?: string;
} = {}): VirtualFilesystem {
  const user = options.user || 'admin.mueller';
  const hostname = options.hostname || 'WORKSTATION01';

  const vfs = new VirtualFilesystem({
    shellType: 'powershell',
    user,
    home: `C:\\Users\\${user}`,
    env: {
      COMPUTERNAME: hostname,
      USERNAME: user,
      USERPROFILE: `C:\\Users\\${user}`,
      HOMEDRIVE: 'C:',
      HOMEPATH: `\\Users\\${user}`,
      SYSTEMROOT: 'C:\\Windows',
      WINDIR: 'C:\\Windows',
    },
  });

  // Create Windows directory structure
  vfs.addDirectory(`C:\\Users\\${user}\\Desktop`);
  vfs.addDirectory(`C:\\Users\\${user}\\Documents`);
  vfs.addDirectory(`C:\\Users\\${user}\\Downloads`);
  vfs.addDirectory('C:\\Windows\\System32\\drivers\\etc');
  vfs.addDirectory('C:\\Program Files');
  vfs.addDirectory('C:\\Program Files (x86)');
  vfs.addDirectory('C:\\Logs');

  // Add common files
  vfs.addFile('C:\\Windows\\System32\\drivers\\etc\\hosts', `# Copyright (c) 1993-2009 Microsoft Corp.
127.0.0.1       localhost
::1             localhost`);

  vfs.addFile('C:\\Logs\\Application.log', `2026-03-14 10:00:00 INFO  Application started successfully
2026-03-14 10:00:01 WARN  Configuration file not found, using defaults
2026-03-14 10:00:02 ERROR Failed to connect to database server`);

  vfs.addFile('C:\\Logs\\System.log', `2026-03-14 09:00:00 INFO  System boot completed
2026-03-14 09:30:00 INFO  Windows Update check completed
2026-03-14 10:00:00 WARN  Disk space low on drive D:`);

  return vfs;
}
