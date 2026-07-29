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
 * All REGISTERED campaigns, in picker order. Derived from the registry, not from
 * a hand-maintained parallel list — a new campaign shows up by being registered;
 * an id missing from CAMPAIGN_ORDER just sorts last instead of silently
 * disappearing. This is the full roster, secrets included; the picker asks
 * listVisibleCampaigns instead.
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
 * What the campaign picker may show: every non-hidden campaign, plus the hidden
 * ones this player has already unlocked (ids from engine/unlocks). Order is the
 * registry order, so an unlocked secret slots into its release position.
 */
export function listVisibleCampaigns(
  unlockedIds: readonly string[] = []
): CampaignDefinition[] {
  return listCampaigns().filter((c) => !c.hidden || unlockedIds.includes(c.id));
}

/**
 * The lookup behind the picker's blind code entry: does this typed buffer end in
 * a hidden campaign's unlock code? Matching the END of the buffer means stray
 * keystrokes before the code don't spoil the attempt. Case-insensitive.
 *
 * Only hidden campaigns with a declared code can match — a visible campaign is
 * never "unlockable", and an empty/absent code never matches (which would
 * otherwise make every keystroke an unlock).
 */
export function findCampaignByUnlockCode(typed: string): CampaignDefinition | null {
  const buffer = typed.toLowerCase();
  if (!buffer) return null;
  return (
    listCampaigns().find(
      (c) => c.hidden && c.unlockCode && buffer.endsWith(c.unlockCode.toLowerCase())
    ) ?? null
  );
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

/**
 * Where a story run stands in ITS campaign: 1-based chapter position and the
 * campaign's chapter count. Story runs can't honestly show "Woche N/12" — the
 * mode's week budget is not the campaign's length (AUDIT TRAIL's 6 chapters end
 * around week 5). Returns null when the chapter is unknown, so callers fall
 * back to the mode display instead of inventing a number.
 *
 * Note: after the last chapter completes, currentChapter stays on the final id
 * (advanceStoryBeat keeps it), so the position saturates at total — never > total.
 */
export function getChapterProgress(
  campaignId: CampaignId,
  currentChapterId: string
): { position: number; total: number } | null {
  const chapters = getCampaign(campaignId).chapters;
  const index = chapters.findIndex((c) => c.id === currentChapterId);
  if (index === -1) return null;
  return { position: index + 1, total: chapters.length };
}

export type { CampaignDefinition, CampaignMenuEntry, StoryCharacter } from './types';
