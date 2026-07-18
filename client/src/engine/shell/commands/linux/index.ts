/**
 * Linux Shell Commands Index
 * Exports all Linux/Bash commands
 */

import { ShellCommand } from '../../types';
import { navigationCommands } from './navigation';
import { fileOpsCommands } from './fileops';
import { textProcCommands } from './textproc';
import { systemCommands } from './system';
import { journalCommands } from './journal';
import { networkCommands } from './network';
import { builtinCommands } from './builtins';
import { extendedCommands } from './extended';
import { remoteCommands } from './remote';

export const allLinuxCommands: ShellCommand[] = [
  ...navigationCommands,
  ...fileOpsCommands,
  ...textProcCommands,
  ...systemCommands,
  ...journalCommands,
  ...networkCommands,
  ...builtinCommands,
  ...extendedCommands,
  ...remoteCommands,
];

export {
  navigationCommands,
  fileOpsCommands,
  textProcCommands,
  systemCommands,
  journalCommands,
  networkCommands,
  builtinCommands,
  extendedCommands,
  remoteCommands,
};
