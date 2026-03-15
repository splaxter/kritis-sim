/**
 * Linux Shell Commands Index
 * Exports all Linux/Bash commands
 */

import { ShellCommand } from '../../types';
import { navigationCommands } from './navigation';
import { fileOpsCommands } from './fileops';
import { textProcCommands } from './textproc';
import { systemCommands } from './system';
import { networkCommands } from './network';
import { builtinCommands } from './builtins';

export const allLinuxCommands: ShellCommand[] = [
  ...navigationCommands,
  ...fileOpsCommands,
  ...textProcCommands,
  ...systemCommands,
  ...networkCommands,
  ...builtinCommands,
];

export {
  navigationCommands,
  fileOpsCommands,
  textProcCommands,
  systemCommands,
  networkCommands,
  builtinCommands,
};
