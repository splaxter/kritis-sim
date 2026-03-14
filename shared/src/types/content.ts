// Content Pack System - Extensible content loading
// Each content pack is a self-contained module with NPCs, scenarios, and dialogue

export interface ContentPack {
  id: string;
  name: string;
  version: string;
  contentType: ContentType;
  description?: string;
  author?: string;
  dependencies?: string[]; // Other pack IDs this pack requires
}

export type ContentType =
  | 'npc_vendor'      // External vendor/service provider
  | 'npc_internal'    // Internal colleagues
  | 'npc_authority'   // BSI, auditors, etc.
  | 'scenario_pack'   // Standalone scenario collection
  | 'event_pack'      // Event collection (simpler than scenarios)
  | 'dialogue_pack';  // Dialogue/localization pack

export interface ContentManifest {
  packs: ContentPack[];
  loadOrder: string[];
}
