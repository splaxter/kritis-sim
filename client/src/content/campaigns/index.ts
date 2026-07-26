/**
 * Campaign registry. A small keyed lookup — deliberately not a plugin system.
 * `getCampaign` is the single seam the engine and App use to reach story
 * content, replacing the former hard imports of the probation content globals.
 */
import { CampaignId, GameModeId, getGameModeConfig } from '@kritis/shared';
import { CampaignDefinition } from './types';
import { probationCampaign } from './probation';
import { auditTrailCampaign } from './audit-trail';

const CAMPAIGNS: Record<CampaignId, CampaignDefinition> = {
  probation: probationCampaign,
  'audit-trail': auditTrailCampaign,
};

/** Preferred display order in the campaign picker — chronological by release.
 *  Only a SORT key, never the source of the list (see listCampaigns). */
const CAMPAIGN_ORDER: CampaignId[] = ['probation', 'audit-trail'];

export function getCampaign(id: CampaignId): CampaignDefinition {
  return CAMPAIGNS[id] ?? probationCampaign;
}

/**
 * All playable campaigns, in picker order. Derived from the REGISTRY, not from
 * a hand-maintained parallel list — a new campaign shows up in the menu by
 * being registered; an id missing from CAMPAIGN_ORDER just sorts last instead
 * of silently disappearing from the picker.
 */
export function listCampaigns(): CampaignDefinition[] {
  const rank = (id: CampaignId) => {
    const i = CAMPAIGN_ORDER.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return (Object.keys(CAMPAIGNS) as CampaignId[])
    .sort((a, b) => rank(a) - rank(b))
    .map((id) => CAMPAIGNS[id]);
}

/**
 * The label a run shows in the HUD, the resume line and the run summary.
 * Story runs are named by their CAMPAIGN, so a second campaign never reads as
 * "Die Probezeit"; every other mode keeps its mode name. Probation is
 * unchanged: "Story: " + its title is byte-identical to the mode name.
 */
export function getRunLabel(
  gameMode: GameModeId,
  campaignId?: CampaignId | null
): { icon: string; name: string } {
  const config = getGameModeConfig(gameMode);
  if (gameMode !== 'story' || !campaignId) return { icon: config.icon, name: config.name };
  return { icon: config.icon, name: `Story: ${getCampaign(campaignId).title}` };
}

export type { CampaignDefinition, CampaignMenuEntry, StoryCharacter } from './types';
