/**
 * Linux Shell Commands Index
 * Exports all Linux/Bash commands
 */

import { ShellCommand } from '../../types';
import { navigationCommands } from './navigation';
import { fileOpsCommands } from './fileops';
import { textProcCommands } from './textproc';
import { diffCommand } from './diffCmd';
import { systemCommands } from './system';
import { journalCommands } from './journal';
import { networkCommands } from './network';
import { builtinCommands } from './builtins';
import { extendedCommands } from './extended';
import { remoteCommands } from './remote';
import { firewallCommands } from './firewallCmd';
import { nftCommand } from './nftCmd';
import { opensslCommand } from './opensslCmd';
import { ansibleCommands } from './ansible';

export const allLinuxCommands: ShellCommand[] = [
  ...navigationCommands,
  ...fileOpsCommands,
  ...textProcCommands,
  diffCommand,
  ...systemCommands,
  ...journalCommands,
  ...networkCommands,
  ...builtinCommands,
  ...extendedCommands,
  ...remoteCommands,
  ...firewallCommands,
  nftCommand,
  opensslCommand,
  ...ansibleCommands,
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
  firewallCommands,
  nftCommand,
  opensslCommand,
  ansibleCommands,
};
