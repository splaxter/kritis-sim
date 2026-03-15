/**
 * Shell Engine Type Definitions
 */

import { Skills } from '@kritis/shared';

// ============================================================================
// Virtual Filesystem Types
// ============================================================================

export interface VFSPermissions {
  owner: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  other: { read: boolean; write: boolean; execute: boolean };
}

export interface VFSNode {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  permissions: VFSPermissions;
  owner: string;
  group: string;
  size: number;
  created: Date;
  modified: Date;
  content?: string;
  children?: Map<string, VFSNode>;
  target?: string;
}

export interface VFSState {
  root: VFSNode;
  currentPath: string;
  currentUser: string;
  currentGroup: string;
  homeDirectory: string;
  env: Record<string, string>;
}

// ============================================================================
// Result Type (for error handling)
// ============================================================================

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ============================================================================
// Command Types
// ============================================================================

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, boolean>;
  options: Record<string, string>;
  raw: string;
}

export interface CommandResult {
  output: string;
  exitCode: number;
  error?: string;
  sideEffects?: CommandSideEffect[];
  clearScreen?: boolean;
}

export interface CommandSideEffect {
  type: 'skill_gain' | 'flag_set' | 'stress_change' | 'solution';
  payload: Record<string, unknown>;
}

export interface ExecutionContext {
  vfs: VirtualFilesystemInterface;
  env: Record<string, string>;
  stdin?: string;
  shell: ShellState;
  cwd: string;
  user: string;
}

export interface CompletionContext {
  vfs: VirtualFilesystemInterface;
  input: string;
  cursorPos: number;
  args: string[];
  argIndex: number;
  currentArg: string;
}

export interface Completion {
  value: string;
  display: string;
  type: 'command' | 'file' | 'directory' | 'option' | 'argument' | 'variable';
  description?: string;
}

export interface ShellCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  options?: CommandOption[];

  execute(args: ParsedArgs, ctx: ExecutionContext): CommandResult;
  getCompletions?(partial: string, ctx: CompletionContext): Completion[];
}

export interface CommandOption {
  short?: string;
  long?: string;
  description: string;
  takesValue?: boolean;
}

// ============================================================================
// Shell State
// ============================================================================

export interface ShellState {
  type: 'bash' | 'powershell';
  history: HistoryEntry[];
  historyIndex: number;
  aliases: Record<string, string>;
  exitCode: number;
  env: Record<string, string>;
}

export interface HistoryEntry {
  command: string;
  timestamp: Date;
}

// ============================================================================
// Network Simulation
// ============================================================================

export interface NetworkConfig {
  hostname: string;
  interfaces: NetworkInterface[];
  dnsServers: string[];
  hosts: Record<string, string>;
  pingResponses: Record<string, PingResponse>;
  portResponses: Record<string, PortResponse>;
}

export interface NetworkInterface {
  name: string;
  ipv4?: string;
  ipv6?: string;
  mac?: string;
  status: 'up' | 'down';
  type: 'ethernet' | 'loopback' | 'wireless';
}

export interface PingResponse {
  reachable: boolean;
  latency?: number;
  ttl?: number;
  error?: string;
}

export interface PortResponse {
  open: boolean;
  service?: string;
}

// ============================================================================
// VFS Interface
// ============================================================================

export interface VirtualFilesystemInterface {
  // State
  getCurrentPath(): string;
  setCurrentPath(path: string): Result<void>;
  getUser(): string;
  getEnv(key: string): string | undefined;
  setEnv(key: string, value: string): void;

  // Path operations
  resolvePath(path: string): string;
  dirname(path: string): string;
  basename(path: string): string;
  join(...parts: string[]): string;

  // Node operations
  exists(path: string): boolean;
  isFile(path: string): boolean;
  isDirectory(path: string): boolean;
  stat(path: string): Result<VFSNode>;
  readFile(path: string): Result<string>;
  readDirectory(path: string): Result<VFSNode[]>;
  writeFile(path: string, content: string): Result<void>;
  appendFile(path: string, content: string): Result<void>;
  mkdir(path: string, recursive?: boolean): Result<void>;
  remove(path: string, recursive?: boolean): Result<void>;
  copy(src: string, dest: string, recursive?: boolean): Result<void>;
  move(src: string, dest: string): Result<void>;

  // Helper methods (used by index.ts)
  addDirectory(path: string): void;
  addFile(path: string, content: string): void;

  // Permissions
  checkPermission(path: string, action: 'read' | 'write' | 'execute'): boolean;
  chmod(path: string, mode: string): Result<void>;

  // Completion helpers
  getPathCompletions(partial: string): Completion[];

  // Glob
  glob(pattern: string): string[];
}

// ============================================================================
// Shell Engine Interface
// ============================================================================

export interface ShellEngineInterface {
  // Execution
  execute(input: string): CommandResult;
  executeCommand(name: string, args: ParsedArgs): CommandResult;

  // Completion
  complete(input: string, cursorPos: number): Completion[];

  // History
  addToHistory(command: string): void;
  getHistory(): HistoryEntry[];
  navigateHistory(direction: 'up' | 'down'): string | undefined;

  // State
  getState(): ShellState;
  getVfs(): VirtualFilesystemInterface;
  getEnv(): Record<string, string>;
  setEnv(key: string, value: string): void;
}
