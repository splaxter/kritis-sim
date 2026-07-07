import { GameEvent } from '@kritis/shared';

/**
 * Chain I: Die Karteileiche (red-thread continuity — IAM lifecycle / offboarding)
 *
 * Flow:
 * evt_offboarding_request (Week 2-4) — ein Mitarbeiter ist weg, sein Zugang nicht.
 *   -> "Sauber offboarden (alle Zugänge + Prozess)"   => evt_offboarding_clean (payoff)
 *   -> nur AD-Konto / liegen lassen / Ticket          => evt_ghost_account_abuse (disaster)
 *
 * Same forgotten account seen from two sides: a clean offboarding blocks a later
 * login attempt; a half-done one leaves a VPN/extern path that gets abused.
 * Distinct from the other chains — this is the access-lifecycle lesson. Scoped
 * non-story/non-learning.
 */

export const offboardingChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_offboarding_request',
    weekRange: [2, 4],
    probability: 0.95,
    requiredModes: ['beginner', 'kritis', 'intermediate', 'hard'],
    category: 'compliance',
    title: 'Die Karteileiche',
    description: `Beim Aufräumen im Active Directory stolperst du über das Konto „m.bauer". Du fragst {kollege}: „Wer ist das?" — „Ach, der Bauer? Der ist vor drei Monaten gegangen."

Du schaust genauer hin: Das Konto ist noch aktiv. Es ist in der Gruppe „VPN-Nutzer". Und in „Domänen-Admins". Sein Laptop wurde nie zurückgesetzt, sein externer Wartungszugang läuft weiter.

{kollege} winkt ab: „Hat noch nie Probleme gemacht."`,
    involvedCharacters: ['kollege', 'chef'],
    mentorNote:
      'Verwaiste Konten ausgeschiedener Mitarbeiter sind ein Top-Einfallstor — besonders, wenn sie privilegiert (Admin) oder von außen erreichbar (VPN/Wartung) sind. Sauberes Offboarding heißt: ALLE Zugänge deaktivieren (AD, VPN, externe Dienste, Dienstkonten), Gruppen entfernen, dokumentieren — am besten per Checkliste/Prozess, nicht ad hoc.',
    choices: [
      {
        id: 'proper_offboarding',
        text: 'Sauber offboarden: alle Zugänge deaktivieren, Gruppen entfernen, Checkliste anlegen',
        effects: { skills: { security: 6, windows: 4 }, compliance: 8, stress: 6 },
        resultText:
          'Du deaktivierst das Konto, ziehst VPN- und Wartungszugang ein, entfernst die Admin-Mitgliedschaft und legst eine Offboarding-Checkliste an — damit das beim Nächsten nicht wieder passiert.',
        choiceTags: ['careful', 'prepared'],
        teachingMoment:
          'Eine Offboarding-Checkliste macht den Einzelfall zum Prozess. Genau das prüft auch ein Audit unter „Zugangsmanagement".',
        chainTriggers: [
          {
            targetEventId: 'evt_offboarding_clean',
            delayWeeks: 3,
            description: 'Clean offboarding blocks a later login attempt on the dead account.',
          },
        ],
      },
      {
        id: 'disable_ad_only',
        text: 'Schnell nur das AD-Konto deaktivieren — reicht erstmal',
        effects: { skills: { windows: 2 }, compliance: 1, stress: 2 },
        resultText:
          'Du sperrst das AD-Konto. Erledigt, denkst du. Der externe Wartungszugang und das VPN-Zertifikat laufen aber über ein anderes System — und das bleibt unangetastet.',
        choiceTags: ['half_measure'],
        teachingMoment:
          'Das AD-Konto ist nur eine Tür. VPN, externe Portale und Dienstkonten haben oft eigene — die müssen separat geschlossen werden.',
        chainTriggers: [
          {
            targetEventId: 'evt_ghost_account_abuse',
            delayWeeks: 3,
            description: 'Only AD disabled; the forgotten VPN/extern path stays open.',
          },
        ],
      },
      {
        id: 'leave_it',
        text: '„Hat noch nie Probleme gemacht." — so lassen',
        effects: { stress: -3, compliance: -6 },
        resultText:
          'Du klappst das AD wieder zu. Ein aktives Admin-Konto eines Menschen, der seit drei Monaten weg ist — aber heute hast du Wichtigeres.',
        choiceTags: ['negligent'],
        chainTriggers: [
          {
            targetEventId: 'evt_ghost_account_abuse',
            delayWeeks: 3,
            description: 'Dead admin account left fully active.',
          },
        ],
      },
      {
        id: 'ticket_hr',
        text: 'Ticket an HR/Vorgesetzte schreiben und auf Klärung warten',
        effects: { stress: 4, relationships: { chef: 2 } },
        resultText:
          'Du dokumentierst den Fund und bittest um Klärung, wer das veranlasst. Das Ticket wandert durch die Zuständigkeiten. Das Konto bleibt derweil offen.',
        choiceTags: ['passive', 'bureaucratic'],
        chainTriggers: [
          {
            targetEventId: 'evt_ghost_account_abuse',
            delayWeeks: 4,
            description: 'Offboarding stuck in process; account still open when abused.',
          },
        ],
      },
    ],
    tags: ['compliance', 'chain_start', 'iam', 'offboarding', 'access_control'],
  },

  // ── Consequence A: the locked door holds ──────────────────────────
  {
    id: 'evt_offboarding_clean',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 11,
    title: 'Tür zu',
    description: `Eine Meldung im VPN-Log: Versuchter Login mit den Zugangsdaten von „m.bauer" — von einer fremden IP, mitten in der Nacht. Abgelehnt. Konto deaktiviert, Zugang entzogen.

Du erinnerst dich an das aufgeräumte Offboarding von vor ein paar Wochen. Jemand hatte die alten Zugangsdaten — geleakt, verkauft, wer weiß. Nur: Es gibt keine Tür mehr, durch die sie passen.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'Genau dafür offboardet man sauber: Selbst wenn alte Zugangsdaten irgendwo auftauchen, laufen sie ins Leere. Der Login-Versuch ist trotzdem ein meldenswerter Hinweis — kurz prüfen, ob weitere alte Konten existieren.',
    choices: [
      {
        id: 'note_and_sweep',
        text: 'Vorfall notieren und prüfen, ob es weitere Alt-Konten gibt',
        effects: { skills: { security: 6 }, relationships: { chef: 8 }, compliance: 10, stress: 4 },
        resultText:
          'Du dokumentierst den abgewehrten Versuch und ziehst einen kurzen AD-Report über inaktive Konten. Zwei weitere Karteileichen — sofort mit erledigt.',
        teachingMoment: 'Ein abgewehrter Angriff ist auch ein Hinweis: Nutze ihn, um systematisch nach weiteren Alt-Konten zu suchen.',
      },
      {
        id: 'report_and_relax',
        text: 'Den abgewehrten Versuch an {chef} und die Security melden',
        effects: { skills: { security: 4 }, relationships: { chef: 6, gf: 6 }, compliance: 8, stress: 3 },
        resultText:
          'Du meldest sauber: „Login-Versuch auf ein deaktiviertes Konto, abgewehrt, kein Schaden." {chef} ist sichtlich erleichtert, dass das Konto eben nicht mehr offen war.',
        choiceTags: ['solid'],
        teachingMoment: 'Auch „nichts passiert, weil wir vorbereitet waren" gehört gemeldet — es zeigt, dass Kontrollen wirken.',
      },
    ],
    tags: ['team', 'chain_consequence', 'iam', 'access_control'],
  },

  // ── Consequence B: the ghost walks in ─────────────────────────────
  {
    id: 'evt_ghost_account_abuse',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'security',
    isChainEvent: true,
    chainPriority: 11,
    title: 'Jemand ist drin',
    description: `Das SIEM meldet eine aktive VPN-Sitzung von „m.bauer" — dem Mitarbeiter, der seit Monaten weg ist. Die Sitzung greift gerade auf einen Dateiserver zu.

Du erinnerst dich an die Offboarding-Entscheidung von vor ein paar Wochen. Das Konto war nie vollständig geschlossen. Ob es der ehemalige Mitarbeiter selbst ist oder jemand mit seinen Zugangsdaten — drin ist drin.

{chef} steht hinter dir: „Wie kann der noch reinkommen?"`,
    involvedCharacters: ['chef', 'gf'],
    mentorNote:
      'Ein verwaistes, privilegiertes Konto mit Außenzugang ist der Albtraum jedes Auditors — und ein meldepflichtiger Vorfall, wenn es genutzt wurde. Sofort: Sitzung kappen, alle Zugänge des Kontos schließen, Zugriffe forensisch prüfen, melden. Danach: der eigentliche Fehler war das fehlende Offboarding.',
    choices: [
      {
        id: 'kill_session_lock',
        text: 'Sitzung sofort kappen, alle Zugänge des Kontos schließen, Zugriffe prüfen',
        effects: { skills: { security: 6, netzwerk: 4 }, relationships: { chef: 6 }, compliance: 4, stress: 18 },
        resultText:
          'Du trennst die VPN-Sitzung, sperrst das Konto endgültig über alle Systeme und gehst die Zugriffe der letzten Stunde durch. Was vorher abgeflossen ist, lässt sich nicht mehr mit Sicherheit sagen.',
        teachingMoment: 'Erst die akute Tür schließen und Zugriffe sichern — dann die strukturelle Lücke (Offboarding) beheben.',
      },
      {
        id: 'full_ir_and_report',
        text: 'Vollständigen Incident-Response fahren und den Vorfall melden',
        effects: { skills: { security: 8, softSkills: 3 }, relationships: { chef: 4, gf: 8 }, compliance: 8, stress: 22 },
        resultText:
          'Du behandelst es als das, was es ist: ein Sicherheitsvorfall mit unbefugtem Zugriff. Sitzung gekappt, forensische Sicherung, Meldung an GF und ggf. Aufsicht. Sauber, aber ein langer Tag — und ein peinlicher Bericht.',
        choiceTags: ['thorough'],
        teachingMoment: 'Genutzter Fremdzugriff auf KRITIS-Systeme ist meldepflichtig. Eine lückenlose Doku schützt dich und das Unternehmen.',
      },
      {
        id: 'quietly_disable',
        text: 'Leise das Konto sperren und hoffen, dass niemand nachfragt',
        effects: { relationships: { gf: -10, chef: -8 }, compliance: -10, stress: 10 },
        resultText:
          'Du sperrst das Konto klammheimlich und sagst nichts. Beim nächsten Audit fällt der Zugriff in den Logs auf — und jetzt steht da auch noch „nicht gemeldet". Aus einem Fehler werden zwei.',
        choiceTags: ['cover_up', 'deflect'],
        teachingMoment: 'Einen genutzten Fremdzugriff zu verschweigen verwandelt ein Versäumnis in einen Meldepflicht-Verstoß. Stilles Wegsperren ist die teuerste Option.',
      },
    ],
    tags: ['security', 'chain_consequence', 'iam', 'incident', 'access_control'],
  },
];
