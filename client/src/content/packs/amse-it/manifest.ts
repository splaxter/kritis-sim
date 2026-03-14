// AMSE IT Solutions GmbH - Content Pack Manifest
import { NpcPack } from '@kritis/shared';

export const manifest: Omit<NpcPack, 'npcs' | 'gameplayMechanics'> = {
  id: 'amse-it',
  name: 'AMSE IT Solutions GmbH',
  version: '1.0.0',
  contentType: 'npc_vendor',
  description: 'Externer IT-Dienstleister / Managed Service Provider - Rahmenvertrag für Sophos Firewall, Netzwerk-Infrastruktur',
  author: 'KRITIS Game',
};
