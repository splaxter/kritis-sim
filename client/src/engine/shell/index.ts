/**
 * Shell Engine - Main Export
 * Complete terminal emulation with virtual filesystem and command execution
 */

export * from './types';
export * from './VirtualFilesystem';
export * from './ShellEngine';
export * from './templates';
export { allLinuxCommands } from './commands/linux';
export { allPowerShellCommands } from './commands/powershell';

import { ShellEngine } from './ShellEngine';
import { VirtualFilesystem, createLinuxFilesystem, createWindowsFilesystem } from './VirtualFilesystem';
import { allLinuxCommands } from './commands/linux';
import { allPowerShellCommands } from './commands/powershell';
import { VFSTemplate, applyTemplate } from './templates';
import { VFSNode } from './types';

export interface CreateShellOptions {
  type: 'bash' | 'powershell';
  user?: string;
  hostname?: string;
  env?: Record<string, string>;
  files?: { path: string; content: string }[];
  directories?: string[];
  /** Templates to apply to the filesystem */
  templates?: VFSTemplate[];
}

/**
 * Create a fully configured shell with filesystem and commands
 */
export function createShell(options: CreateShellOptions): ShellEngine {
  const { type, user, hostname, env, files, directories, templates } = options;

  // Create appropriate filesystem
  const vfs = type === 'bash'
    ? createLinuxFilesystem({ user, hostname })
    : createWindowsFilesystem({ user, hostname });

  // Apply templates first (so custom files can override template files)
  if (templates) {
    for (const template of templates) {
      applyTemplate(vfs, template);
    }
  }

  // Add any custom environment variables
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      vfs.setEnv(key, value);
    }
  }

  // Add custom directories
  if (directories) {
    for (const dir of directories) {
      vfs.addDirectory(dir);
    }
  }

  // Add custom files (these can override template files)
  if (files) {
    for (const file of files) {
      vfs.addFile(file.path, file.content);
    }
  }

  // Create shell engine
  const shell = new ShellEngine(vfs, type);

  // Register commands
  const commands = type === 'bash' ? allLinuxCommands : allPowerShellCommands;
  shell.registerCommands(commands);

  return shell;
}

/**
 * Create a shell from a terminal context (for game integration)
 */
export function createShellFromContext(context: {
  type: 'linux' | 'windows';
  hostname: string;
  username: string;
  currentPath: string;
  vfsOverlay?: {
    files?: { path: string; content: string }[];
    directories?: string[];
  };
  env?: Record<string, string>;
  templates?: VFSTemplate[];
}): ShellEngine {
  const shellType = context.type === 'linux' ? 'bash' : 'powershell';

  return createShell({
    type: shellType,
    user: context.username,
    hostname: context.hostname,
    env: context.env,
    files: context.vfsOverlay?.files,
    directories: context.vfsOverlay?.directories,
    templates: context.templates,
  });
}

// Re-export filesystem creators
export { createLinuxFilesystem, createWindowsFilesystem };
