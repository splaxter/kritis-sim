/**
 * A self-contained story campaign: all content the adventure engine and App
 * need to run one campaign, keyed by CampaignId. This is a DATA definition — it
 * holds no functions that call back into the engine, so `adventureEngine` can
 * import the campaign registry without an import cycle. Per-campaign ending
 * DERIVATION (probation score-bands vs AUDIT TRAIL domains) is wired in a later
 * phase; for now the engine keeps its existing ending path for probation.
 */
import type {
  CampaignId,
  CampaignEndingId,
  AdventureChapter,
  AdventureChapterId,
  SidequestDefinition,
  GameEvent,
  GameState,
  Relationships,
} from '@kritis/shared';
import type { AdventureEndingText } from '../adventure/endings';
import type { ActBreakParagraph } from '../adventure/actBreaks';

/** A visible story character (name/role/flavour). Shape mirrors the existing
 *  STORY_CHARACTERS entries; kept campaign-local so shared stays content-free. */
export interface StoryCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  arcPotential: string;
}

/** Copy for the campaign-select screen. Campaign-owned (like characterTokens
 *  and endingTexts) so the menu holds no per-campaign text; mandatory, so a new
 *  campaign cannot silently appear unlabelled. */
export interface CampaignMenuEntry {
  eyebrow: string;
  description: string;
  /** Short facts line, e.g. "12 Kapitel · 3 Enden · Casual". */
  meta: string;
  badge?: string;
  /** Tailwind classes for the badge; omit when there is no badge. */
  badgeClass?: string;
}

export interface CampaignDefinition {
  id: CampaignId;
  title: string;
  /** How this campaign presents itself in the campaign picker. */
  menu: CampaignMenuEntry;
  /** Chapter the run starts in. */
  startChapterId: AdventureChapterId;
  chapters: AdventureChapter[];
  sidequests: SidequestDefinition[];
  storyEvents: GameEvent[];
  sidequestEvents: GameEvent[];
  /** Ending id → displayed text. Probation: 'good'|'neutral'|'bad'. */
  endingTexts: Record<string, AdventureEndingText>;
  /** Act number → the "Fortsetzung folgt" break copy shown after that act. */
  actBreaks: Record<number, ActBreakParagraph[]>;
  characters: StoryCharacter[];
  /** Relationship-key → display name for {token} replacement in narrative text
   *  (e.g. {chef} → "Bert"). Sourced here so App holds no hardcoded cast. */
  characterTokens: Record<string, string>;
  /** Headline shown on the ending screen (probation: "PROBEZEIT BEENDET"). */
  endingHeadline: string;
  /** Whether the ending screen shows the probation-style score/path/flag
   *  "Bilanz". AUDIT TRAIL's domain-based ending presentation is separate, so it
   *  sets this false and App passes no probation stats. */
  usesScoreStats: boolean;
  /** Fallback story-mode background image; omit for a text-only campaign so no
   *  other campaign's artwork can leak in (AUDIT TRAIL). */
  defaultBackgroundImage?: string;
  /** Campaign-specific starting relationships, applied OVER the mode defaults.
   *  Omit to use the mode defaults unchanged (probation). */
  startingRelationships?: Partial<Relationships>;
  /** Ending derivation — MANDATORY, so there is no silent probation fallback.
   *  Probation uses its score-band strategy (deriveProbationEnding); AUDIT TRAIL
   *  uses its audit-domain strategy. App calls this, never a campaign switch. */
  deriveEnding: (state: GameState) => CampaignEndingId;
  /** Optional dynamic epilogue composed from run flags (AUDIT TRAIL's modular
   *  per-domain epilogue). When omitted, the static endingTexts[id].epilogue is
   *  used (probation). */
  buildEpilogue?: (state: GameState) => string;
}
