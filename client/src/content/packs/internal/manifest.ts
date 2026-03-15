// Internal NPCs - Content Pack Manifest
import { NpcPack } from '@kritis/shared';

export const manifest: Omit<NpcPack, 'npcs' | 'gameplayMechanics'> = {
  id: 'internal',
  name: 'AWRM Interne Organisation',
  version: '1.0.0',
  contentType: 'npc_internal',
  description: 'Interne NPCs - Chef, GF, Kämmerer, Fachabteilung und Kollegen mit Office-Politik-Szenarien',
  author: 'KRITIS Game',
};
