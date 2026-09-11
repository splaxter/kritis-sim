/**
 * DAS KATASTER chapter grid — 4 acts, 6 chapters (1 / 3 / 1 / 1), ~22 beats.
 * Same order of magnitude as AUDIT TRAIL, so `campaignBudget.test.ts` (every
 * REGISTERED campaign must reach its ending inside the day budget) stays green
 * without special tuning.
 *
 * NOT YET REGISTERED. `campaignBudget.test.ts` iterates `listCampaigns()` and
 * asserts each one reaches its ending — so the campaign may only be added to
 * the registry once the beats below actually resolve to authored events
 * (Phase C). Until then this file is the beat plan, kept next to the domain
 * logic it will branch on.
 *
 * Beat plan (event ids are authored in Phase C, Tasks 8–13):
 *   Akt 1  kt_ch01_ordner    : kt_kickoff, L1 kt_l1_ordner,
 *                              L2 kt_l2_erster_eintrag, kt_wer_macht_das
 *   Akt 2  kt_ch02_vertraege : L3 kt_l3_null_von_280, kt_l3_einkauf,
 *                              L4 kt_l4_acht_monate
 *          kt_ch03_papier    : L5 kt_l5_verweis_ins_leere, kt_l5_melden,
 *                              L6 kt_l6_erinnerung
 *          kt_ch04_register  : kt_jens_warnung, L7 kt_l7_kataster
 *   Akt 3  kt_ch05_uhr       : kt_mahnung, kt_rechnung, kt_vorstandsfrage,
 *                              kt_bjorg_vier, kt_eskalation, L8* kt_l8_fristen
 *   Akt 4  kt_ch06_audit     : Q1…Q5 (branchCondition = KATASTER_DOMAINS[Kn])
 */
import { AdventureChapter } from '@kritis/shared';

export const katasterChapters: AdventureChapter[] = [
  // ── ACT 1 — Der Ordner ────────────────────────────────────────────────────
  {
    id: 'kt_ch01_ordner',
    title: 'Der Ordner',
    act: 1,
    description:
      'Der neue ISB kündigt den Kick-off an und stellt eine Frage, die niemand im Haus beantworten kann: Welche Regelwerke gelten für Sie? Der Vorgänger ist in Rente. Sein Ordner ist halb leer.',
    storyBeats: [
      { id: 'kt_b0101', eventId: 'kt_kickoff', isOptional: false },
      { id: 'kt_b0102', eventId: 'kt_l1_ordner', isOptional: false },
      { id: 'kt_b0103', eventId: 'kt_l2_erster_eintrag', isOptional: false },
      { id: 'kt_b0104', eventId: 'kt_wer_macht_das', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { minimumWeek: 1 },
    completionUnlocks: ['kt_ch02_vertraege'],
  },

  // ── ACT 2 — Die Spuren ────────────────────────────────────────────────────
  {
    id: 'kt_ch02_vertraege',
    title: 'Was in den Verträgen steht',
    act: 2,
    description:
      '280 Lizenzen, null belegt — und ein Aufpasser, der seit acht Monaten keine Aktivität mehr hat. Zwei Funde, die zeigen: eine Zahl ist kein Nachweis und ein Name auch nicht.',
    storyBeats: [
      { id: 'kt_b0201', eventId: 'kt_l3_null_von_280', isOptional: false },
      { id: 'kt_b0202', eventId: 'kt_l3_einkauf', isOptional: false },
      { id: 'kt_b0203', eventId: 'kt_l4_acht_monate', isOptional: false },
      // Der Befund-Dialog steht NACH dem Level: erst der Fund, dann die Wahl,
      // was man damit macht (dieselbe Ordnung wie kt_l5_melden).
      { id: 'kt_b0204', eventId: 'kt_l4_befund', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'kt_ch01_ordner' },
    completionUnlocks: ['kt_ch03_papier'],
  },
  {
    id: 'kt_ch03_papier',
    title: 'Was auf dem Papier steht',
    act: 2,
    description:
      'Die Dienstvereinbarung verweist auf ein Notfallhandbuch, das es nicht gibt. Und im Sammelpostfach liegt seit elf Wochen eine ungelesene Erinnerung der Aufsicht.',
    storyBeats: [
      { id: 'kt_b0301', eventId: 'kt_l5_verweis_ins_leere', isOptional: false },
      // Die Melden-oder-Kaschieren-Entscheidung steht bewusst NACH dem Level:
      // erst der Negativbefund, dann die Wahl, was man damit macht.
      { id: 'kt_b0302', eventId: 'kt_l5_melden', isOptional: false },
      { id: 'kt_b0303', eventId: 'kt_l6_erinnerung', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'kt_ch02_vertraege' },
    completionUnlocks: ['kt_ch04_register'],
  },
  {
    id: 'kt_ch04_register',
    title: 'Das Register',
    act: 2,
    description:
      'Alles, was du gefunden hast, wird zu Zeilen. Aufpasser, Turnus, Nachweis — und die Entscheidung, ob eine leere Zelle leer bleiben darf.',
    storyBeats: [
      // Jens' Vorwarnung ist die einzige Warnung vor der Fabrication-Falle —
      // sie MUSS vor L7 liegen, sonst ist die Falle unfair.
      { id: 'kt_b0401', eventId: 'kt_jens_warnung', isOptional: false },
      { id: 'kt_b0402', eventId: 'kt_l7_kataster', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'kt_ch03_papier' },
    completionUnlocks: ['kt_ch05_uhr'],
  },

  // ── ACT 3 — Die Uhr ───────────────────────────────────────────────────────
  {
    id: 'kt_ch05_uhr',
    title: 'Die Uhr',
    act: 3,
    description:
      'Was keinen Aufpasser hat, meldet sich irgendwann selbst — als Mahnschreiben, als Rechnung, als Frage im Vorstand.',
    storyBeats: [
      // Jeder Payoff-Beat hat zwei Varianten: verwaist (branchCondition) vs.
      // besetzt (alternateEventId). Garantierter Payoff statt Chain-Engine —
      // Story-Mode serviert pendingChainEvents nicht.
      {
        id: 'kt_b0501',
        eventId: 'kt_mahnung',
        isOptional: false,
        branchCondition: 'kat_orphan_sla',
        alternateEventId: 'kt_mahnung_abgewendet',
      },
      {
        id: 'kt_b0502',
        eventId: 'kt_rechnung',
        isOptional: false,
        branchCondition: 'kat_orphan_license',
        alternateEventId: 'kt_rechnung_abgewendet',
      },
      {
        id: 'kt_b0503',
        eventId: 'kt_vorstandsfrage',
        isOptional: false,
        branchCondition: 'kat_gap_concealed',
        alternateEventId: 'kt_vorstandsfrage_gemeldet',
      },
      { id: 'kt_b0504', eventId: 'kt_bjorg_vier', isOptional: false },
      { id: 'kt_b0505', eventId: 'kt_eskalation', isOptional: false },
      // L8 ist der optionale Bonus-Payoff: er gated nichts und wertet nur den
      // Epilog auf (kat_reminder_live).
      { id: 'kt_b0506', eventId: 'kt_l8_fristen', isOptional: true },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'kt_ch04_register' },
    completionUnlocks: ['kt_ch06_audit'],
  },

  // ── ACT 4 — Der Audit-Tag ─────────────────────────────────────────────────
  {
    id: 'kt_ch06_audit',
    title: 'Der Audit-Tag',
    act: 4,
    description:
      'Michael schlägt drei Zeilen auf und stellt zu jeder dieselben drei Fragen: Wer passt auf? Womit belegen Sie das? Wann ist es wieder fällig?',
    storyBeats: [
      // branchCondition = das Domänen-Objekt aus domains.ts, importiert statt
      // kopiert (Phase C, Task 13) — eine Wahrheit für Beat UND Ending.
      { id: 'kt_b0601', eventId: 'kt_audit_q1', isOptional: false },
      { id: 'kt_b0602', eventId: 'kt_audit_q2', isOptional: false },
      { id: 'kt_b0603', eventId: 'kt_audit_q3', isOptional: false },
      { id: 'kt_b0604', eventId: 'kt_audit_q4', isOptional: false },
      { id: 'kt_b0605', eventId: 'kt_audit_q5', isOptional: false },
    ],
    sidequests: [],
    unlockConditions: { previousChapter: 'kt_ch05_uhr' },
    completionUnlocks: [],
  },
];
