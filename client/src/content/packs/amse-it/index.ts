// AMSE IT Solutions GmbH - Content Pack
// External IT vendor with scenarios about vendor management and trust-but-verify

import { NpcPack, ScenarioPack } from '@kritis/shared';
import { manifest } from './manifest';
import { amseVendor, gameplayMechanics } from './npcs';
import { amseScenarios } from './scenarios';

// Re-export individual components for selective imports
export { manifest } from './manifest';
export { amseVendor, marcoContact, stefanContact, companyQuirks, relationshipSystem, gameplayMechanics } from './npcs';
export { amseScenarios } from './scenarios';

// Full NPC pack export
export const amseNpcPack: NpcPack = {
  ...manifest,
  npcs: [amseVendor],
  gameplayMechanics,
};

// Scenario pack export (linked to NPC)
export const amseScenarioPack: ScenarioPack = {
  npcId: amseVendor.id,
  scenarios: amseScenarios,
};

// Default export is the complete pack
export default {
  npcPack: amseNpcPack,
  scenarioPack: amseScenarioPack,
};
