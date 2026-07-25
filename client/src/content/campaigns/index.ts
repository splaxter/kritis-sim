/**
 * Campaign registry. A small keyed lookup — deliberately not a plugin system.
 * `getCampaign` is the single seam the engine and App use to reach story
 * content, replacing the former hard imports of the probation content globals.
 */
import { CampaignId } from '@kritis/shared';
import { CampaignDefinition } from './types';
import { probationCampaign } from './probation';
import { auditTrailCampaign } from './audit-trail';

const CAMPAIGNS: Record<CampaignId, CampaignDefinition> = {
  probation: probationCampaign,
  'audit-trail': auditTrailCampaign,
};

export function getCampaign(id: CampaignId): CampaignDefinition {
  return CAMPAIGNS[id] ?? probationCampaign;
}

export type { CampaignDefinition, StoryCharacter } from './types';
