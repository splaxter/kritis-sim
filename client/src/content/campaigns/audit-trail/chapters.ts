/**
 * AUDIT TRAIL chapter grid — 4 acts, 6 chapters distributed 1 / 2 / 1 / 2 across
 * acts 1–4 (Acts 2 and 4 carry two chapters each; Acts 1 and 3 one). ~3–4 beats
 * per chapter, matching the actual §6 content volume (~20 beats), not a uniform
 * "N per act". Task 11 authors only Act 1's opening;
 * Acts 2–4 declare their beats against event ids that Tasks 12–15 will author.
 * An unauthored beat makes isAtAuthoredStoryEnd raise the act-break, so the
 * skeleton stops cleanly at the Act-1/2 seam. No sidequests in v1.
 *
 * Beat plan per chapter (levels are added by Tasks 12–15 as they are authored):
 *   Akt 1  ch01_onboarding : at_welcome, at_team_intro, L1 at_l1_first_day,
 *                            L2 at_l2_inventory, at_wiki_password (Task 12 ✓)
 *   Akt 2  ch02_trail      : L3 at_l3_ticket_diff, L4 at_l4_iis_log, at_authorization (Task 13 ✓)
 *          ch03_evidence   : at_finding_mail, L5 at_l5_evidence_chain, L6 at_l6_enable_auditing (Task 13 ✓)
 *   Akt 3  ch04_blockade   : at_bjorg_dialogue, L7 at_l7_delivery_note, at_handover_mail,
 *                            L8★ at_l8_bastion_live (optional, soft-gated) (Task 14 ✓)
 *   Akt 4  ch05_audit_1    : F1 (D1), F2 (D2), F3 (D3)
 *          ch06_audit_2    : F4 (D4), F5 (D5)
 */
import { AdventureChapter } from '@kritis/shared';
import { AUDIT_DOMAINS } from './domains';

export const auditTrailChapters: AdventureChapter[] = [
  // ── ACT 1 — Onboarding (fully authored: dialogs + L1/L2 + Wiki-Fund) ──────
  {
    id: 'at_ch01_onboarding',
    title: 'Der zusätzliche Auftrag',
    act: 1,
    description: 'Neuer Admin bei WARM, Probezeit läuft, NIS-2 im Nacken. Bert bittet dich, die Auditfähigkeit herzustellen. Der Vorgänger M. ist „krankheitsbedingt abwesend".',
    storyBeats: [
      { id: 'at_b0101', eventId: 'at_welcome', isOptional: false },
      { id: 'at_b0102', eventId: 'at_team_intro', isOptional: false },
      // L1/L2 are pure terminal beats: they resolve through the solve path
      // (closeTerminal advances the beat via applyStoryProgression).
      { id: 'at_b0103', eventId: 'at_l1_first_day', isOptional: false },
      { id: 'at_b0104', eventId: 'at_l2_inventory', isOptional: false },
      // The Wiki-Passwort dialog carries the shared_account_documented decision
      // (D1) — deliberately AFTER the level, so the find precedes the choice.
      { id: 'at_b0105', eventId: 'at_wiki_password', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { minimumWeek: 1 },
    completionUnlocks: ['at_ch02_trail'],
  },

  // ── ACT 2 — Die Spur (fully authored: L3/L4 + Mandat, Meldung + L5/L6) ────
  {
    id: 'at_ch02_trail',
    title: 'Die Spur (I)',
    act: 2,
    description: 'Ein nachträglich editierter Ticket-Export und eine Zugriffsspur in den IIS-Logs — und die Frage, was du auswerten darfst, ohne selbst zum Vorfall zu werden.',
    storyBeats: [
      { id: 'at_b0201', eventId: 'at_l3_ticket_diff', isOptional: false },
      { id: 'at_b0202', eventId: 'at_l4_iis_log', isOptional: false },
      { id: 'at_b0203', eventId: 'at_authorization', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch01_onboarding' },
    completionUnlocks: ['at_ch03_evidence'],
  },
  {
    id: 'at_ch03_evidence',
    title: 'Die Spur (II)',
    act: 2,
    description: 'Das Finding ist gemeldet — jetzt zählt die Beweiskette: Originale sichern, hashen, das Übergabeprotokoll schließen und das Auditing dauerhaft einschalten.',
    storyBeats: [
      { id: 'at_b0301', eventId: 'at_finding_mail', isOptional: false },
      { id: 'at_b0302', eventId: 'at_l5_evidence_chain', isOptional: false },
      { id: 'at_b0303', eventId: 'at_l6_enable_auditing', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch02_trail' },
    completionUnlocks: ['at_ch04_blockade'],
  },

  // ── ACT 3 — Die Blockade (fully authored: Bjorg, L7, Mail, L8★) ───────────
  {
    id: 'at_ch04_blockade',
    title: 'Die Blockade',
    act: 3,
    description: 'BASTION-01 muss endlich laufen. Bjorg blockt. Der Lieferschein, die Schnittstellen-Mail und der Umgang mit seinen Provokationen entscheiden, wie das Audit ausgeht.',
    storyBeats: [
      { id: 'at_b0401', eventId: 'at_bjorg_dialogue', isOptional: false },
      { id: 'at_b0402', eventId: 'at_l7_delivery_note', isOptional: false },
      // The Mail beat branches on whether the Lieferschein was actually found:
      // without the evidence it plays the neutral variant instead of citing a
      // document the player never opened.
      {
        id: 'at_b0403',
        eventId: 'at_handover_mail',
        isOptional: false,
        branchCondition: 'bastion_delivery_found',
        alternateEventId: 'at_handover_mail_nodelivery',
      },
      { id: 'at_b0404', eventId: 'at_l8_bastion_live', isOptional: true },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch03_evidence' },
    completionUnlocks: ['at_ch05_audit_1'],
  },

  // ── ACT 4 — Das Audit (authored in Task 15) ───────────────────────────────
  // Each audit-question beat branches on its domain condition (the SAME object
  // from AUDIT_DOMAINS): domain satisfied → the belastbare-Antwort event, else
  // the confrontation event (…_fail). No divergence between branching and the
  // ending derivation — both read these objects.
  {
    id: 'at_ch05_audit_1',
    title: 'Das Audit (I)',
    act: 4,
    description: 'Der neue ISB kommt. Kein Bosskampf mit dem Schwert, sondern mit Fragen. Die ersten drei: Zurechenbarkeit, die Beweiskette, die PAM-Blockade.',
    storyBeats: [
      { id: 'at_b0501', eventId: 'at_audit_f1', isOptional: false, branchCondition: AUDIT_DOMAINS.D1.condition, alternateEventId: 'at_audit_f1_fail' },
      { id: 'at_b0502', eventId: 'at_audit_f2', isOptional: false, branchCondition: AUDIT_DOMAINS.D2.condition, alternateEventId: 'at_audit_f2_fail' },
      { id: 'at_b0503', eventId: 'at_audit_f3', isOptional: false, branchCondition: AUDIT_DOMAINS.D3.condition, alternateEventId: 'at_audit_f3_fail' },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch04_blockade' },
    completionUnlocks: ['at_ch06_audit_2'],
  },
  {
    id: 'at_ch06_audit_2',
    title: 'Das Audit (II)',
    act: 4,
    description: 'Die letzten beiden Fragen: deine Dokumentation der letzten Monate — und der Umgang mit Bjorg. Danach die Auswertung.',
    storyBeats: [
      { id: 'at_b0601', eventId: 'at_audit_f4', isOptional: false, branchCondition: AUDIT_DOMAINS.D4.condition, alternateEventId: 'at_audit_f4_fail' },
      { id: 'at_b0602', eventId: 'at_audit_f5', isOptional: false, branchCondition: AUDIT_DOMAINS.D5.condition, alternateEventId: 'at_audit_f5_fail' },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch05_audit_1' },
    completionUnlocks: [],
  },
];
