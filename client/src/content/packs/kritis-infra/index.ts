/**
 * KRITIS Infrastructure Pack - Main Export
 * Critical infrastructure scenarios with SCADA, monitoring, and network focus
 */

import { NpcPack, ScenarioPack } from '@kritis/shared';
import { manifest } from './manifest';
import { kritisInfraVendor, gameplayMechanics } from './npcs';
import { kritisInfraScenarios } from './scenarios';

// Re-export individual components
export { manifest } from './manifest';
export {
  kritisInfraVendor,
  scadaOperatorContact,
  siemensVendorContact,
  securityAnalystContact,
  gameplayMechanics,
} from './npcs';
export { kritisInfraScenarios } from './scenarios';

// Full NPC pack export
export const kritisInfraNpcPack: NpcPack = {
  ...manifest,
  npcs: [kritisInfraVendor],
  gameplayMechanics,
};

// Scenario pack export
export const kritisInfraScenarioPack: ScenarioPack = {
  npcId: kritisInfraVendor.id,
  scenarios: kritisInfraScenarios,
};

// Default export
export default {
  npcPack: kritisInfraNpcPack,
  scenarioPack: kritisInfraScenarioPack,
};
