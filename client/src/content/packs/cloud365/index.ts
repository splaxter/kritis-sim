// Cloud365 GmbH - Microsoft Partner - Content Pack Entry Point
import { NpcPack, ScenarioPack } from '@kritis/shared';
import { cloud365Vendor, gameplayMechanics } from './npcs';
import { cloud365Scenarios } from './scenarios';
import { cloud365Manifest } from './manifest';

export const npcPack: NpcPack = {
  id: cloud365Manifest.id,
  name: cloud365Manifest.name,
  version: cloud365Manifest.version,
  description: cloud365Manifest.description,
  contentType: 'npc_vendor',
  npcs: [cloud365Vendor],
  gameplayMechanics,
};

export const scenarioPack: ScenarioPack = {
  npcId: cloud365Vendor.id,
  scenarios: cloud365Scenarios,
};

export default {
  manifest: cloud365Manifest,
  npcPack,
  scenarioPack,
};
