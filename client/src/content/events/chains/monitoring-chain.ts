import { GameEvent } from '@kritis/shared';

/**
 * Chain H: Der blinde Fleck (red-thread continuity — observability)
 *
 * Flow:
 * evt_monitoring_gap (Week 3-5) — kritische Systeme laufen ohne Überwachung.
 *   -> "Monitoring + Alerting einrichten"          => evt_monitoring_caught (payoff)
 *   -> manuell / keine Zeit / Budgetantrag         => evt_cert_expiry_outage (disaster)
 *
 * Same root cause (a TLS cert quietly running out) seen from two sides: with
 * monitoring you catch it three days early; without it the citizen portal goes
 * dark on a Monday morning. Distinct from the backup/hardware threads — this is
 * the "you can't fix what you can't see" lesson. Scoped non-story/non-learning.
 */

export const monitoringChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_monitoring_gap',
    weekRange: [3, 5],
    probability: 0.95,
    requiredModes: ['beginner', 'kritis', 'intermediate', 'hard'],
    category: 'compliance',
    title: 'Der blinde Fleck',
    description: `Du gehst die Infrastruktur durch und merkst: Niemand überwacht irgendetwas aktiv. Kein Alerting, keine Dashboards. Das Bürgerportal, der Mailserver, die Log-Partition — alles läuft, bis es eben nicht mehr läuft.

{kollege} zuckt mit den Schultern: „Wenn was ausfällt, merken wir's. Dann rufen die Bürger an."

Dir fällt auf: Das TLS-Zertifikat des Bürgerportals läuft in ein paar Wochen ab, und /var auf dem Logserver ist schon bei 85%. Aber das sieht gerade — niemand.`,
    involvedCharacters: ['kollege'],
    mentorNote:
      'Monitoring ist kein Luxus, sondern Grundlage: Festplattenfüllstand, Dienst-Verfügbarkeit und vor allem ablaufende Zertifikate gehören automatisch überwacht und alarmiert. „Die Bürger rufen schon an" ist kein Frühwarnsystem, sondern ein Ausfall. Cert-Expiry-Monitoring (z. B. 30/14/7 Tage vorher) verhindert die häufigste vermeidbare Störung überhaupt.',
    choices: [
      {
        id: 'set_up_monitoring',
        text: 'Monitoring mit Alerting aufsetzen — inkl. Zertifikats- und Füllstands-Warnungen',
        effects: { skills: { netzwerk: 5, linux: 4 }, compliance: 8, stress: 6, budget: -1200 },
        resultText:
          'Du rollst ein schlankes Monitoring aus: Schwellwerte für Platten und Dienste, plus eine Warnung 30/14/7 Tage vor Zertifikatsablauf. Zum ersten Mal siehst du, wie es den Systemen wirklich geht.',
        choiceTags: ['careful', 'prepared'],
        teachingMoment:
          'Schon ein einfaches Monitoring mit Alerting fängt die teuersten Überraschungen ab. Zertifikatsablauf ganz oben auf die Liste.',
        chainTriggers: [
          {
            targetEventId: 'evt_monitoring_caught',
            delayWeeks: 3,
            description: 'Monitoring catches the expiring cert before it causes an outage.',
          },
        ],
      },
      {
        id: 'manual_spotchecks',
        text: '„Ich schau halt ab und zu manuell rein." — kein Tool',
        effects: { stress: -2, compliance: -3 },
        resultText:
          'Du nimmst dir vor, regelmäßig manuell nachzusehen. Die ersten Tage klappt das. Dann kommt der Alltag dazwischen.',
        choiceTags: ['half_measure'],
        chainTriggers: [
          {
            targetEventId: 'evt_cert_expiry_outage',
            delayWeeks: 3,
            description: 'Manual spot-checks miss the cert expiry.',
          },
        ],
      },
      {
        id: 'no_capacity',
        text: 'Gerade keine Zeit — das Tagesgeschäft geht vor',
        effects: { stress: -3, compliance: -5 },
        resultText:
          'Du schiebst das Thema auf „wenn mal Luft ist". Die Systeme laufen ja. Vorerst.',
        choiceTags: ['negligent'],
        chainTriggers: [
          {
            targetEventId: 'evt_cert_expiry_outage',
            delayWeeks: 3,
            description: 'No monitoring set up; the cert expires unseen.',
          },
        ],
      },
      {
        id: 'budget_request',
        text: 'Antrag für ein Monitoring-Tool schreiben und auf Freigabe warten',
        effects: { stress: 4, relationships: { kaemmerer: 3 } },
        resultText:
          '{kaemmerer} nimmt den Antrag entgegen und legt ihn auf „prüfen". Bis zur Freigabe bleibt alles im Blindflug.',
        choiceTags: ['passive', 'bureaucratic'],
        chainTriggers: [
          {
            targetEventId: 'evt_cert_expiry_outage',
            delayWeeks: 4,
            description: 'Tooling stuck in approval; cert expires meanwhile.',
          },
        ],
      },
    ],
    tags: ['compliance', 'chain_start', 'monitoring', 'observability', 'tls'],
  },

  // ── Consequence A: caught in time ─────────────────────────────────
  {
    id: 'evt_monitoring_caught',
    weekRange: [6, 12],
    probability: 1.0,
    category: 'team',
    isChainEvent: true,
    chainPriority: 11,
    title: 'Die Warnung um 02:00',
    description: `Dein Handy summt nachts: eine Monitoring-Mail. „WARN: TLS-Zertifikat bürgerportal.example.de läuft in 3 Tagen ab." Direkt darunter: „/var auf logsrv01 bei 91%."

Du erinnerst dich an die Monitoring-Entscheidung von vor ein paar Wochen — und bist heilfroh. Drei Tage Vorlauf statt eines Montagmorgen-Desasters.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'So sieht der Normalfall mit Monitoring aus: kein Drama, nur ein Hinweis mit Vorlauf. Zertifikate idealerweise per ACME/certbot automatisch erneuern, dann wird selbst der Hinweis seltener.',
    choices: [
      {
        id: 'renew_and_clear',
        text: 'Zertifikat in Ruhe erneuern und die Log-Partition aufräumen',
        effects: { skills: { linux: 5, troubleshooting: 4 }, relationships: { chef: 8 }, compliance: 8, stress: 4 },
        resultText:
          'Am nächsten Vormittag ist beides erledigt — neues Zertifikat eingespielt, Logrotation eingerichtet. Niemand hat etwas gemerkt, und genau das ist der Punkt.',
        teachingMoment: 'Wartung mit Vorlauf ist unspektakulär — und genau deshalb richtig.',
      },
      {
        id: 'automate_renewal',
        text: 'Erneuern und gleich auf automatische Zertifikatsverlängerung umstellen',
        effects: { skills: { linux: 6, netzwerk: 3 }, relationships: { chef: 6 }, compliance: 10, stress: 5 },
        resultText:
          'Du richtest ACME-Auto-Renewal ein. Das Zertifikat erneuert sich künftig von selbst — eine ganze Klasse von Störungen ist damit dauerhaft erledigt.',
        choiceTags: ['proactive'],
        teachingMoment: 'Das Beste am Monitoring ist, wenn es ein Problem so automatisiert, dass es gar nicht mehr alarmieren muss.',
      },
    ],
    tags: ['team', 'chain_consequence', 'monitoring', 'tls'],
  },

  // ── Consequence B: the portal goes dark ───────────────────────────
  {
    id: 'evt_cert_expiry_outage',
    weekRange: [6, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 11,
    title: 'NET::ERR_CERT_DATE_INVALID',
    description: `Montag, 8:10 Uhr. Das Telefon explodiert. Jeder, der das Bürgerportal aufruft, bekommt eine knallrote Browser-Warnung: „Ihre Verbindung ist nicht privat — Zertifikat abgelaufen." Niemand kommt mehr rein, keine Anträge, nichts.

Das TLS-Zertifikat ist heute Nacht abgelaufen. Du erinnerst dich an die Monitoring-Entscheidung von vor ein paar Wochen. Es hätte dich rechtzeitig gewarnt — wenn es es gegeben hätte.

{fachabteilung} steht in der Tür, {chef} ruft schon an.`,
    involvedCharacters: ['fachabteilung', 'chef'],
    mentorNote:
      'Ein abgelaufenes TLS-Zertifikat ist die Lehrbuch-Definition eines vermeidbaren Ausfalls — die Information lag Monate vorher im Zertifikat selbst. Sofort erneuern, dann die eigentliche Lücke schließen: Monitoring + Auto-Renewal. „Kein Budget" ist im Nachhinein die schwächste Erklärung.',
    choices: [
      {
        id: 'emergency_renew',
        text: 'Sofort hektisch ein neues Zertifikat ausstellen und einspielen',
        effects: { skills: { linux: 6, troubleshooting: 4 }, relationships: { chef: -5, fachabteilung: -5 }, compliance: -3, stress: 18 },
        resultText:
          'Mit zittrigen Fingern stellst du ein neues Zertifikat aus und spielst es ein. Nach 40 Minuten ist das Portal wieder erreichbar — 40 Minuten, in denen kein Bürger einen Antrag stellen konnte.',
        teachingMoment: 'Der Notfall-Fix funktioniert, behebt aber nur das Symptom. Ohne Monitoring passiert dasselbe beim nächsten Zertifikat wieder.',
      },
      {
        id: 'renew_then_monitor',
        text: 'Erneuern und sofort danach Monitoring + Auto-Renewal aufsetzen',
        effects: { skills: { linux: 6, netzwerk: 4 }, relationships: { chef: 6 }, compliance: 6, stress: 20 },
        resultText:
          'Du bringst das Portal zurück und ziehst noch am selben Tag das nach, was gefehlt hat: Überwachung und automatische Verlängerung. {chef}: „Hätten wir das mal vorher gemacht." Hättet ihr.',
        choiceTags: ['lessons_learned'],
        teachingMoment: 'Aus dem Ausfall die richtige Konsequenz zu ziehen ist gut — nur teuer bezahlt mit einem öffentlichen Portal-Ausfall.',
      },
      {
        id: 'blame_no_budget',
        text: '"Für ein Monitoring-Tool gab es ja kein Budget."',
        effects: { relationships: { kaemmerer: -10, chef: -8 }, compliance: -5, stress: 8 },
        resultText:
          '{kaemmerer}: „Ein Zertifikat zu beobachten kostet kein Budget, sondern fünf Minuten." Die Schuldzuweisung verfängt nicht — und das Portal war trotzdem offline.',
        choiceTags: ['deflect'],
        teachingMoment: 'Cert-Monitoring ist mit Bordmitteln kostenlos machbar. „Kein Budget" trägt hier nicht.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'monitoring', 'tls', 'outage'],
  },
];
