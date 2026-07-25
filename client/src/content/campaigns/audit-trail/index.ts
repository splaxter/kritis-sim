/**
 * "AUDIT TRAIL" — the second WARM campaign, assembled as a CampaignDefinition.
 * Skeleton stage (Task 11): Act 1 authored, Acts 2–4 declared; the domain and
 * ending logic is complete and tested. Levels L1–L8 and the audit showdown are
 * authored in Tasks 12–15.
 */
import { CampaignDefinition } from '../types';
import { auditTrailChapters } from './chapters';
import { auditTrailStoryEvents } from './events';
import { AUDIT_TRAIL_CHARACTERS } from './characters';
import { AUDIT_TRAIL_ACT_BREAKS } from './actBreaks';
import { AUDIT_TRAIL_ENDING_TEXTS, buildAuditTrailEpilogue } from './endings';
import { deriveAuditTrailEnding } from './domains';

export const auditTrailCampaign: CampaignDefinition = {
  id: 'audit-trail',
  title: 'Audit Trail',
  startChapterId: 'at_ch01_onboarding',
  chapters: auditTrailChapters,
  sidequests: [],
  storyEvents: auditTrailStoryEvents,
  sidequestEvents: [],
  endingTexts: AUDIT_TRAIL_ENDING_TEXTS,
  actBreaks: AUDIT_TRAIL_ACT_BREAKS,
  characters: AUDIT_TRAIL_CHARACTERS,
  // Same WARM display names as probation (reused cast), campaign-owned so App
  // holds no hardcoded map.
  characterTokens: {
    chef: 'Bert',
    gf: 'Dr. Müller',
    kaemmerer: 'Herr Schmidt',
    athos: 'Frau Weber',
    kollege: 'Bjorg',
  },
  deriveEnding: (state) => deriveAuditTrailEnding(state.flags),
  buildEpilogue: (state) => buildAuditTrailEpilogue(state.flags),
};

export { deriveAuditTrailEnding, satisfiedDomains, AUDIT_DOMAINS } from './domains';
export { buildAuditTrailEpilogue } from './endings';
