/**
 * Campaign registry. A small keyed lookup — deliberately not a plugin system.
 * `getCampaign` is the single seam the engine and App use to reach story
 * content, replacing the former hard imports of the probation content globals.
 */
import { CampaignId } from '@kritis/shared';
import { CampaignDefinition } from './types';
import { probationCampaign } from './probation';

// 'audit-trail' is registered in Phase D once its content exists. Until then
// getCampaign falls back to probation so an unknown/stale id can never crash.
const CAMPAIGNS: Partial<Record<CampaignId, CampaignDefinition>> = {
  probation: probationCampaign,
};

export function getCampaign(id: CampaignId): CampaignDefinition {
  return CAMPAIGNS[id] ?? probationCampaign;
}

export type { CampaignDefinition, StoryCharacter } from './types';
