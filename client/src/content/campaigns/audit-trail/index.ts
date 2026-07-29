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
  menu: {
    eyebrow: 'KAMPAGNE 2 · GEHEIM',
    description:
      'Eine NIS-2-Prüfung bei WARM: Du sollst die Auditfähigkeit herstellen — und findest eine Spur, die jemand lieber loswerden würde. Beweise sauber sichern, Grenzen einhalten, im Audit bestehen.',
    meta: '6 Kapitel · 3 Enden · Hands-on (Terminal & GUI)',
    badge: 'GEHEIM',
    badgeClass: 'border-terminal-warning text-terminal-warning',
  },
  // Not offered to a normal player: the card only appears in the picker after the
  // code is typed there (blind, case-insensitive), and the unlock then persists
  // per player. Hiding is menu-only — an existing AUDIT TRAIL save still resumes.
  hidden: true,
  unlockCode: 'trick17',
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
  endingHeadline: 'AUDIT TRAIL — ABGESCHLOSSEN',
  // Text-only + domain-based ending (no probation score/path/flag Bilanz, no art).
  usesScoreStats: false,
  // No defaultBackgroundImage → text-only.
  // A fresh WARM admin under NIS-2 scrutiny: the chef relationship starts cooler
  // and colleagues are wary until documentation earns trust.
  startingRelationships: { chef: 0, kollegen: 10 },
  deriveEnding: (state) => deriveAuditTrailEnding(state.flags),
  buildEpilogue: (state) => buildAuditTrailEpilogue(state.flags),
};

export { deriveAuditTrailEnding, satisfiedDomains, AUDIT_DOMAINS } from './domains';
export { buildAuditTrailEpilogue } from './endings';
