/**
 * Shell Engine - Main Export
 * Complete terminal emulation with virtual filesystem and command execution
 */

export * from './types';
export * from './VirtualFilesystem';
export * from './ShellEngine';
export * from './templates';
export * from './gridLayout';
export { allLinuxCommands } from './commands/linux';
export { allPowerShellCommands } from './commands/powershell';
export * from './scenarioSeed';
export * from './hosts';
export * from './unitControl';
export * from './stateGoals';

import {
  TerminalHostSpec, TerminalSolution, TerminalServiceSpec,
  TerminalJournalEntry, TerminalFirewallSpec, NetListener, NetConnection,
} from '@kritis/shared';
import { ShellEngine } from './ShellEngine';
import { createHostState, seedPrimaryHost } from './hosts';
import { VirtualFilesystem, createLinuxFilesystem, createWindowsFilesystem } from './VirtualFilesystem';
import { allLinuxCommands } from './commands/linux';
import { allPowerShellCommands } from './commands/powershell';
import { VFSTemplate, applyTemplate } from './templates';
import { VFSNode } from './types';
import { seedVfsFromScenario } from './scenarioSeed';

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
  /** Canned scenario commands — used to auto-seed the VFS so quest paths exist. */
  commands?: { pattern: string; output: string }[];
  hints?: string[];
  taskText?: string;
  /** Accepted (unused here) so a full terminal context can be passed through. */
  solutions?: TerminalSolution[];
  /** Additional machines reachable via ssh from the local host. */
  hosts?: TerminalHostSpec[];
  /** Custom services seeded onto the PRIMARY host (single-host levels). */
  services?: TerminalServiceSpec[];
  /** Journal seeded onto the PRIMARY host (single-host forensic levels). */
  journal?: TerminalJournalEntry[];
  /** Firewall state seeded onto the PRIMARY host. */
  firewall?: TerminalFirewallSpec;
  /** Listening sockets seeded onto the PRIMARY host. */
  listeners?: NetListener[];
  /** Established connections seeded onto the PRIMARY host. */
  connections?: NetConnection[];
}): ShellEngine {
  const shellType = context.type === 'linux' ? 'bash' : 'powershell';

  const shell = createShell({
    type: shellType,
    user: context.username,
    hostname: context.hostname,
    env: context.env,
    files: context.vfsOverlay?.files,
    directories: context.vfsOverlay?.directories,
    templates: context.templates,
  });

  // Set the initial working directory. Content occasionally bakes a prompt
  // character into the path ('/backup$', 'C:\>'), which would otherwise
  // create a literal directory of that name — strip it defensively.
  const vfs = shell.getVfs();
  const startPath = (context.currentPath || '').trim().replace(/[$>\s]+$/, '');
  if (startPath) {
    vfs.addDirectory(startPath);
    vfs.setCurrentPath(startPath);
  }

  // Materialize every path the scenario talks about (canned cat/ls outputs,
  // hint/task mentions) so free exploration matches the story. Runs AFTER
  // templates/overlay/currentPath are applied; its vfs.exists() guards mean it
  // only fills gaps and never overwrites authored nodes.
  seedVfsFromScenario(vfs, {
    commands: context.commands,
    hints: context.hints,
    taskText: context.taskText,
  });

  // Seed custom services/journal/firewall onto the primary host AFTER the VFS
  // overlay is in place (unit files must exist when snapshotted).
  if (context.services || context.journal || context.firewall || context.listeners || context.connections) {
    seedPrimaryHost(shell.getBaseHost(), {
      services: context.services,
      journal: context.journal,
      firewall: context.firewall,
      listeners: context.listeners,
      connections: context.connections,
    });
  }

  for (const spec of context.hosts ?? []) {
    shell.registerHost(createHostState(spec));
  }

  return shell;
}

// Re-export filesystem creators
export { createLinuxFilesystem, createWindowsFilesystem };
