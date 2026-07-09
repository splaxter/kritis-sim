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
import { extendedCommands } from './extended';

export const allLinuxCommands: ShellCommand[] = [
  ...navigationCommands,
  ...fileOpsCommands,
  ...textProcCommands,
  ...systemCommands,
  ...networkCommands,
  ...builtinCommands,
  ...extendedCommands,
];

export {
  navigationCommands,
  fileOpsCommands,
  textProcCommands,
  systemCommands,
  networkCommands,
  builtinCommands,
  extendedCommands,
};
