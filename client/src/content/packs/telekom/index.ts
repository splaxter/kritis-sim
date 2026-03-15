// Deutsche Telekom Business - Content Pack Entry Point
import { NpcPack, ScenarioPack } from '@kritis/shared';
import { telekomVendor, gameplayMechanics } from './npcs';
import { telekomScenarios } from './scenarios';
import { telekomManifest } from './manifest';

export const npcPack: NpcPack = {
  id: telekomManifest.id,
  name: telekomManifest.name,
  version: telekomManifest.version,
  description: telekomManifest.description,
  contentType: 'npc_vendor',
  npcs: [telekomVendor],
  gameplayMechanics,
};

export const scenarioPack: ScenarioPack = {
  npcId: telekomVendor.id,
  scenarios: telekomScenarios,
};

export default {
  manifest: telekomManifest,
  npcPack,
  scenarioPack,
};
