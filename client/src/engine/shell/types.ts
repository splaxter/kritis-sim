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
  /**
   * Set when the command wants ANOTHER input line (password prompt etc.).
   * The UI shows `prompt` (masking input if `mask`) and feeds the typed line
   * to ShellEngine.continueInput instead of executing it.
   */
  pendingInput?: { prompt: string; mask: boolean };
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
  /**
   * True when stdout goes to the terminal (last pipeline stage, no redirect).
   * Commands use this like real tools use isatty(): colors and grid layouts
   * only when interactive, plain parseable output when piped/redirected.
   */
  isTty?: boolean;
  /** Terminal width in columns (for grid layouts); 80 when unknown. */
  termCols?: number;
  /** Registry of all commands, so which/type/man/help can answer truthfully. */
  commands?: Map<string, ShellCommand>;
  /** Re-enter the shell (used by sudo/source to run nested commands). */
  execute?: (input: string) => CommandResult;
  /** Multi-host: state of the host this command runs on. */
  host?: import('./hosts').HostState;
  /** Resolve another registered host by id, hostname or IP. */
  resolveHost?: (nameOrIp: string) => import('./hosts').HostState | undefined;
  /** Open a session on another host (ssh) / leave it (exit). */
  pushSession?: (hostId: string, user: string) => void;
  popSession?: () => { closedHostname: string } | null;
  sessionDepth?: number;
  /**
   * Ask the player for one more input line. Returns the pendingInput result
   * to hand back from execute(); `next` runs on the line typed. Chaining is
   * allowed — `next` may call requestInput again. Requesting input aborts any
   * remaining chain segments / pipeline stages of the current command line
   * (deviation from bash, acceptable for the simulation).
   */
  requestInput: (prompt: string, mask: boolean, next: (line: string) => CommandResult) => CommandResult;
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
  setUser(user: string): void;
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
  /** Omitting owner (undefined) changes only the group. */
  chown(path: string, owner: string | undefined, group?: string, recursive?: boolean): Result<void>;

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
  executeCommand(name: string, args: ParsedArgs, stdin?: string, isTty?: boolean): CommandResult;

  // Interactive input continuations
  continueInput(line: string): CommandResult;
  hasPendingInput(): boolean;
  getPendingPrompt(): { prompt: string; mask: boolean } | null;
  cancelPendingInput(): void;

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
