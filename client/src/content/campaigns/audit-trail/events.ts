/**
 * AUDIT TRAIL story events. Task 11 authors only the Act-1 opening so the
 * campaign is playable up to the first act-break; Acts 2–4 (levels L1–L8 and the
 * audit showdown) are authored in Tasks 12–15. Beats in later chapters point at
 * event ids that don't exist yet, which is exactly what makes
 * isAtAuthoredStoryEnd raise the "Fortsetzung folgt" screen at the Act-1/2 seam.
 */
import { GameEvent } from '@kritis/shared';

export const auditTrailStoryEvents: GameEvent[] = [
  {
    id: 'at_welcome',
    weekRange: [1, 1],
    probability: 1,
    category: 'story',
    title: 'Ein zusätzlicher Auftrag',
    description:
      'Erster Tag als Admin bei WARM — Abfallwirtschaft Rhein-Main. Bert, die IT-Leitung, fängt dich schon am Kaffeeautomaten ab. „Schön, dass Sie da sind. Der Betrieb läuft, so weit. Aber wir haben NIS-2 im Nacken, und die Prüffähigkeit ist ... sagen wir: ausbaufähig." Er druckst. „Ihr Vorgänger, Herr M., ist krankheitsbedingt raus. Niemand redet gern drüber."',
    image: undefined,
    involvedCharacters: ['bert', 'm'],
    choices: [
      {
        id: 'at_welcome_accept',
        text: 'Auftrag annehmen: „Ich stelle die Auditfähigkeit her — sauber und nachvollziehbar."',
        effects: { relationships: { chef: 3 } },
        resultText: 'Bert nickt erleichtert. „Genau das wollte ich hören. Melden Sie sich, wenn Sie etwas brauchen — schriftlich am besten."',
        setsFlags: ['audit_mandate_accepted'],
      },
      {
        id: 'at_welcome_scope',
        text: 'Nachfragen: „Welche Zugriffe habe ich — und wo hören sie auf?"',
        effects: { skills: { security: 1 } },
        resultText: 'Bert wird ernst. „Technisch kommen Sie an vieles ran. Aber Postfachinhalte anfassen Sie nur mit dokumentierter Freigabe und Zweckbindung. Das ist keine Formalie."',
        setsFlags: ['audit_mandate_accepted'],
      },
    ],
    tags: ['audit-trail', 'act1', 'onboarding'],
  },
  {
    id: 'at_team_intro',
    weekRange: [1, 1],
    probability: 1,
    category: 'team',
    title: 'Die Runde',
    description:
      'Im Büro sortiert Jens wortlos ein Kabelchaos und nickt dir zu. Henry zeigt aufs Rack: „Das graue Ding da oben? BASTION-01. Steht seit vierzehn Monaten. Frag Bjorg — der erzählt dir jedes Mal was anderes." Und Bjorg? Bjorg schiebt dir ein Ticket zu, in dem als interne Notiz steht: „[intern] Kann der Neue das übernehmen? Bin gleich in einem wichtigen Termin."',
    image: undefined,
    involvedCharacters: ['jens', 'henry', 'bjorg'],
    choices: [
      {
        id: 'at_team_intro_cool',
        text: 'Kühl und knapp: Ticket sachlich übernehmen, die Spitze ignorieren.',
        effects: { relationships: { kollegen: 1 } },
        resultText: 'Du schreibst zwei sachliche Sätze ins Ticket. Bjorg wirkt fast enttäuscht, dass es keinen Streit gibt.',
      },
    ],
    tags: ['audit-trail', 'act1', 'onboarding'],
  },
];
