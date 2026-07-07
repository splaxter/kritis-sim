import { GameEvent } from '@kritis/shared';
import { patchChainEvents } from './patch-chain';
import { documentationChainEvents } from './documentation-chain';
import { trustChainEvents } from './trust-chain';
import { colleagueChainEvents } from './colleague-chain';
import { securityChainEvents } from './security-chain';
import { backupChainEvents } from './backup-chain';
import { hardwareChainEvents } from './hardware-chain';
import { monitoringChainEvents } from './monitoring-chain';
import { offboardingChainEvents } from './offboarding-chain';
import { changeChainEvents } from './change-chain';
import { auditPrepChainEvents } from './audit-prep-chain';

export const chainEvents: GameEvent[] = [
  ...patchChainEvents,
  ...documentationChainEvents,
  ...trustChainEvents,
  ...colleagueChainEvents,
  ...securityChainEvents,
  ...backupChainEvents,
  ...hardwareChainEvents,
  ...monitoringChainEvents,
  ...offboardingChainEvents,
  ...changeChainEvents,
  ...auditPrepChainEvents,
];

// Re-export individual chains for testing/debugging
export {
  patchChainEvents,
  documentationChainEvents,
  trustChainEvents,
  colleagueChainEvents,
  securityChainEvents,
  backupChainEvents,
  hardwareChainEvents,
  monitoringChainEvents,
  offboardingChainEvents,
  changeChainEvents,
  auditPrepChainEvents,
};
