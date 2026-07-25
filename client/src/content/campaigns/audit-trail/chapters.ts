/**
 * AUDIT TRAIL chapter skeleton — 4 acts. Act 1 is authored (playable up to the
 * first act-break); Acts 2–4 declare their beats against event ids that Tasks
 * 12–15 will author. An unauthored beat makes isAtAuthoredStoryEnd raise the
 * act-break, so the skeleton stops cleanly at the Act-1/2 seam instead of
 * skipping to a false victory. No sidequests in v1.
 */
import { AdventureChapter } from '@kritis/shared';

export const auditTrailChapters: AdventureChapter[] = [
  // ── ACT 1 — Onboarding (authored) ─────────────────────────────────────────
  {
    id: 'at_ch01_onboarding',
    title: 'Der zusätzliche Auftrag',
    act: 1,
    description: 'Neuer Admin bei WARM, Probezeit läuft, NIS-2 im Nacken. Bert bittet dich, die Auditfähigkeit herzustellen. Der Vorgänger M. ist „krankheitsbedingt abwesend".',
    storyBeats: [
      { id: 'at_b01', eventId: 'at_welcome', isOptional: false },
      { id: 'at_b02', eventId: 'at_team_intro', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { minimumWeek: 1 },
    completionUnlocks: ['at_ch02_trail'],
  },

  // ── ACT 2 — Die Spur (authored in Tasks 12–13) ────────────────────────────
  {
    id: 'at_ch02_trail',
    title: 'Die Spur',
    act: 2,
    description: 'Ein nachträglich editierter Ticket-Export, eine Zugriffsspur in den IIS-Logs — und die Frage, was du auswerten darfst, ohne selbst zum Vorfall zu werden.',
    storyBeats: [
      { id: 'at_b03', eventId: 'at_l3_ticket_diff', isOptional: false },
      { id: 'at_b04', eventId: 'at_l4_iis_log', isOptional: false },
      { id: 'at_b05', eventId: 'at_authorization', isOptional: false },
      { id: 'at_b06', eventId: 'at_l5_evidence_chain', isOptional: false },
      { id: 'at_b07', eventId: 'at_l6_enable_auditing', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch01_onboarding' },
    completionUnlocks: ['at_ch03_blockade'],
  },

  // ── ACT 3 — Die Blockade (authored in Task 14) ────────────────────────────
  {
    id: 'at_ch03_blockade',
    title: 'Die Blockade',
    act: 3,
    description: 'BASTION-01 muss endlich laufen. Bjorg blockt. Der Lieferschein, die Schnittstellen-Mail und der Umgang mit seinen Provokationen entscheiden, wie das Audit ausgeht.',
    storyBeats: [
      { id: 'at_b08', eventId: 'at_bjorg_dialogue', isOptional: false },
      { id: 'at_b09', eventId: 'at_l7_delivery_note', isOptional: false },
      { id: 'at_b10', eventId: 'at_handover_mail', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch02_trail' },
    completionUnlocks: ['at_ch04_audit'],
  },

  // ── ACT 4 — Das Audit (authored in Task 15) ───────────────────────────────
  {
    id: 'at_ch04_audit',
    title: 'Das Audit',
    act: 4,
    description: 'Der neue ISB kommt. Kein Bosskampf mit dem Schwert, sondern mit fünf Fragen — auf die nur deine Aktenlage antworten kann.',
    storyBeats: [
      { id: 'at_b11', eventId: 'at_audit_f1', isOptional: false },
      { id: 'at_b12', eventId: 'at_audit_f2', isOptional: false },
      { id: 'at_b13', eventId: 'at_audit_f3', isOptional: false },
      { id: 'at_b14', eventId: 'at_audit_f4', isOptional: false },
      { id: 'at_b15', eventId: 'at_audit_f5', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'at_ch03_blockade' },
    completionUnlocks: [],
  },
];
