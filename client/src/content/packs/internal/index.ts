// Internal NPCs - Content Pack
// Office politics, team dynamics, and internal stakeholder management

import { NpcPack, ScenarioPack } from '@kritis/shared';
import { manifest } from './manifest';
import { internalVendor, gameplayMechanics } from './npcs';
import { internalScenarios } from './scenarios';

// Re-export individual components for selective imports
export { manifest } from './manifest';
export {
  internalVendor,
  chefContact,
  gfContact,
  kaemmererContact,
  fachabteilungContact,
  kollegenContact,
  companyQuirks,
  relationshipSystem,
  gameplayMechanics,
} from './npcs';
export { internalScenarios } from './scenarios';

// Full NPC pack export
export const internalNpcPack: NpcPack = {
  ...manifest,
  npcs: [internalVendor],
  gameplayMechanics,
};

// Scenario pack export (linked to NPC)
export const internalScenarioPack: ScenarioPack = {
  npcId: internalVendor.id,
  scenarios: internalScenarios,
};

// Default export is the complete pack
export default {
  npcPack: internalNpcPack,
  scenarioPack: internalScenarioPack,
};
