import { GameEvent } from '@kritis/shared';
import { patchChainEvents } from './patch-chain';
import { documentationChainEvents } from './documentation-chain';
import { trustChainEvents } from './trust-chain';
import { colleagueChainEvents } from './colleague-chain';
import { securityChainEvents } from './security-chain';

export const chainEvents: GameEvent[] = [
  ...patchChainEvents,
  ...documentationChainEvents,
  ...trustChainEvents,
  ...colleagueChainEvents,
  ...securityChainEvents,
];

// Re-export individual chains for testing/debugging
export {
  patchChainEvents,
  documentationChainEvents,
  trustChainEvents,
  colleagueChainEvents,
  securityChainEvents,
};
