/**
 * Campaign identity primitives.
 *
 * These live in shared because `AdventureState.campaignId` (also shared) needs
 * `CampaignId`, and telemetry serializes ending ids as strings. The full
 * `CampaignDefinition` — which aggregates client-side content (chapters, story
 * events, act-break paragraphs, character lists, the ending-derivation) — lives
 * in the client campaigns module (`client/src/content/campaigns/`), so shared
 * stays free of content-shaped types.
 */
export type CampaignId = 'probation' | 'audit-trail';

/** Per-campaign ending identifier. Probation keeps 'good' | 'neutral' | 'bad'
 *  (see EndingType); AUDIT TRAIL uses 'profi' | 'raecher' | 'stille'. Kept as a
 *  widened string so telemetry and cross-campaign code need not enumerate. */
export type CampaignEndingId = string;
