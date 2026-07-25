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

export interface CampaignDefinition {
  id: CampaignId;
  title: string;
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
  /** Ending derivation — MANDATORY, so there is no silent probation fallback.
   *  Probation uses its score-band strategy (deriveProbationEnding); AUDIT TRAIL
   *  uses its audit-domain strategy. App calls this, never a campaign switch. */
  deriveEnding: (state: GameState) => CampaignEndingId;
}
