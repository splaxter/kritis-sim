import { GameEvent } from '@kritis/shared';

/**
 * Chain F: Das Backup-Versprechen (red-thread continuity)
 *
 * Flow:
 * evt_backup_audit (Week 2-4) — how do you handle the backup situation?
 *   -> "3-2-1 + Restore-Test"        => evt_backup_payoff   (3 weeks later)
 *   -> trust untested job / local-only / wait for budget
 *                                    => evt_backup_disaster (3-4 weeks later)
 *
 * The payoff/disaster is the SAME external event (a ransomware hit) seen from two
 * sides — the consequence text explicitly references the earlier decision, so the
 * player feels "this happened because of what I chose weeks ago."
 */

export const backupChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_backup_audit',
    weekRange: [2, 4],
    probability: 0.95,
    // Scoped away from story (which has its own ransomware/predecessor arc — a
    // generic backup-ransomware thread would muddy it) and learning (cliOnly).
    // Scoping the START event gates the whole chain: consequences are only ever
    // scheduled if this fires. arcade is excluded (score mode, not narrative).
    requiredModes: ['beginner', 'kritis', 'intermediate', 'hard'],
    category: 'security',
    title: 'Wie steht es um die Backups?',
    description: `Beim Aufräumen im Serverraum stolperst du über den Backup-Server. Ein Klebezettel: "Läuft. Nicht anfassen! – {kollege}".

Du prüfst nach: Der nächtliche Job sichert auf eine NAS im selben Raum. Wann zuletzt ein Restore getestet wurde? Weiß niemand. Eine Kopie außer Haus? Gibt es nicht.

{kollege} zuckt mit den Schultern: "Ist nie was passiert." {kaemmerer} würde für ein zweites Backup-Ziel sicher kein Geld lockermachen.`,
    involvedCharacters: ['kollege', 'kaemmerer'],
    mentorNote:
      '3-2-1-Regel: 3 Kopien, auf 2 verschiedenen Medien, 1 davon außer Haus (offline/immutable). Ein Backup, das nie per Restore getestet wurde, ist kein Backup, sondern eine Hoffnung. Gegen Ransomware hilft nur eine Kopie, die der Angreifer nicht mitverschlüsseln kann.',
    choices: [
      {
        id: 'backup_321_tested',
        text: '3-2-1 einführen: zweites Ziel außer Haus + monatlicher Restore-Test',
        effects: { skills: { security: 6, troubleshooting: 4 }, compliance: 8, stress: 6, budget: -1500 },
        resultText:
          'Du richtest ein Offsite-Ziel ein und ziehst einen ersten Restore-Test durch — er klappt. {kaemmerer} murrt über die 1.500 €, aber du hast die Belege sauber dokumentiert.',
        choiceTags: ['careful', 'methodical', 'prepared'],
        teachingMoment:
          'Ein dokumentierter, regelmäßiger Restore-Test ist das, was ein Backup von einer Hoffnung unterscheidet. Genau das prüft auch ein BSI-Audit.',
        chainTriggers: [
          {
            targetEventId: 'evt_backup_payoff',
            delayWeeks: 3,
            description: 'Proper 3-2-1 + tested restore pays off when ransomware hits.',
          },
        ],
      },
      {
        id: 'backup_trust_existing',
        text: '„Läuft doch." — den bestehenden Job in Ruhe lassen',
        effects: { stress: -3, compliance: -5 },
        resultText:
          '{kollege} ist erleichtert, dass du nichts umbaust. Der Klebezettel bleibt kleben. Du hakst das Thema ab.',
        choiceTags: ['hasty', 'negligent'],
        chainTriggers: [
          {
            targetEventId: 'evt_backup_disaster',
            delayWeeks: 3,
            description: 'Untested single-site backup fails when ransomware hits.',
          },
        ],
      },
      {
        id: 'backup_local_only',
        text: 'Nur eine zweite NAS dazustellen — bleibt im selben Raum',
        effects: { compliance: 2, stress: 2, budget: -600 },
        resultText:
          'Zwei Kopien, beide im selben Serverraum, beide ständig online. Fühlt sich nach Fortschritt an. Außer Haus geht aber immer noch nichts.',
        choiceTags: ['partial', 'half_measure'],
        teachingMoment:
          'Zwei Online-Kopien im selben Raum sind gegen Ransomware fast wertlos — Schadsoftware verschlüsselt erreichbare Netzlaufwerke gleich mit. Es fehlt die offline/immutable Kopie.',
        chainTriggers: [
          {
            targetEventId: 'evt_backup_disaster',
            delayWeeks: 3,
            description: 'Two online copies in the same room both get encrypted.',
          },
        ],
      },
      {
        id: 'backup_wait_budget',
        text: 'Budgetantrag an {kaemmerer} schreiben und auf Freigabe warten',
        effects: { stress: 5, relationships: { kaemmerer: 3 } },
        resultText:
          '{kaemmerer} bedankt sich für den ordentlichen Antrag und legt ihn auf den Stapel „nächstes Quartal". Bis dahin bleibt alles, wie es ist.',
        choiceTags: ['passive', 'bureaucratic'],
        chainTriggers: [
          {
            targetEventId: 'evt_backup_disaster',
            delayWeeks: 4,
            description: 'Backup improvement stuck in budget limbo when ransomware hits.',
          },
        ],
      },
    ],
    tags: ['security', 'chain_start', 'backup', 'ransomware', 'bsi'],
  },

  // ── Consequence A: the backups save the day ───────────────────────
  {
    id: 'evt_backup_payoff',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 12,
    title: 'Der Ernstfall — und ein ruhiger Moment',
    description: `Montagmorgen, 7:42 Uhr. Auf drei Dateiservern liegt eine Erpresser-Nachricht: Eure Daten sind verschlüsselt. 4 Bitcoin, sonst weg.

{chef} wird kreidebleich. {fachabteilung} ruft Sturm. Und dann erinnerst du dich: das Offsite-Backup, das du vor ein paar Wochen eingerichtet — und getestet — hast.

Die verschlüsselten Server sind das eine. Deine saubere, vom Netz getrennte Kopie das andere.`,
    involvedCharacters: ['chef', 'fachabteilung'],
    mentorNote:
      'Genau dafür existiert die offline/immutable Kopie: Sie ist die einzige, die ein Angreifer nicht mitverschlüsseln konnte. Lösegeld zahlen ist nie die erste Option — und ohne getestetes Backup oft die einzige verbliebene. Vorfall trotzdem an BSI/Aufsicht melden (NIS2/Meldepflicht).',
    choices: [
      {
        id: 'payoff_clean_restore',
        text: 'Betroffene Server plattmachen und aus dem Offsite-Backup neu aufsetzen',
        effects: { skills: { security: 6, troubleshooting: 6 }, relationships: { chef: 15, fachabteilung: 12 }, compliance: 10, stress: 8 },
        resultText:
          'Am Abend laufen die Dienste wieder — von der sauberen Kopie, ohne einen Cent Lösegeld. {chef}: „Ich will gar nicht wissen, wie das ohne dein Backup ausgegangen wäre." Du weißt es.',
        teachingMoment:
          'Wiederherstellen statt zahlen ist immer das Ziel. Vorher die Einbruchsspur schließen, sonst verschlüsselt der Angreifer die frische Kopie gleich wieder.',
      },
      {
        id: 'payoff_report_first',
        text: 'Erst Vorfall dokumentieren und an BSI/GF melden, dann wiederherstellen',
        requires: { skill: 'security', threshold: 35 },
        effects: { skills: { security: 5 }, relationships: { chef: 8, gf: 10 }, compliance: 15, stress: 6 },
        resultText:
          'Du meldest sauber nach NIS2, informierst die Geschäftsführung — und stellst parallel wieder her. Die Aufsicht lobt später die saubere Doku. {gf} merkt sich, wer hier den Kopf behalten hat.',
        teachingMoment:
          'Meldepflicht und Wiederherstellung laufen parallel. Eine lückenlose Vorfall-Doku schützt dich und das Unternehmen rechtlich.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'backup', 'ransomware', 'recovery'],
  },

  // ── Consequence B: there was nothing clean to restore from ────────
  {
    id: 'evt_backup_disaster',
    weekRange: [5, 12],
    probability: 1.0,
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 12,
    title: 'Der Ernstfall — und keine saubere Kopie',
    description: `Montagmorgen, 7:42 Uhr. Auf drei Dateiservern liegt eine Erpresser-Nachricht: Eure Daten sind verschlüsselt. 4 Bitcoin, sonst weg.

Du greifst nach dem Backup — und der Magen sackt ab. Der nächtliche Job hat brav weitergelaufen … und die bereits verschlüsselten Dateien mitgesichert. Die NAS im selben Raum? Auch verschlüsselt.

Du erinnerst dich an die Backup-Entscheidung vor ein paar Wochen. Es gibt keine saubere, getrennte Kopie. {chef} steht hinter dir und wartet auf eine Antwort.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote:
      'Der klassische Doppelfehler: ungetestetes Backup (verschlüsselte Daten werden mitgesichert) plus keine offline-Kopie (alles online Erreichbare wird mitverschlüsselt). Lösegeld zahlen finanziert Kriminelle und garantiert keine Entschlüsselung. Trotzdem: Vorfall an BSI melden — das ist Pflicht, kein Bonus.',
    choices: [
      {
        id: 'disaster_pay_ransom',
        text: 'Den {kaemmerer} um die 4 Bitcoin bitten und zahlen',
        effects: { relationships: { kaemmerer: -20, chef: -10, gf: -15 }, compliance: -10, budget: -8000, stress: 10 },
        resultText:
          'Nach langem Hin und Her wird gezahlt. Ihr bekommt einen Decryptor, der zwei von drei Servern halb wiederherstellt. {kaemmerer} verzeiht dir die Ausgabe so schnell nicht — und der Angreifer hat eure Daten trotzdem.',
        choiceTags: ['desperate'],
        teachingMoment:
          'Zahlen ist die schlechteste Option: keine Garantie, finanziert Folgeangriffe, und ihr steht erpressbar in deren Kundenkartei.',
      },
      {
        id: 'disaster_rebuild',
        text: 'Nicht zahlen: aus Reststücken und Papierakten mühsam neu aufbauen',
        requires: { skill: 'troubleshooting', threshold: 30 },
        effects: { skills: { troubleshooting: 8, security: 4 }, relationships: { chef: 5, fachabteilung: -10 }, compliance: -5, stress: 20 },
        resultText:
          'Wochenlange Handarbeit. Einiges ist für immer weg, die {fachabteilung} ist sauer über verlorene Vorgänge — aber ihr habt keinen Cent gezahlt und niemanden ermutigt, es wieder zu versuchen.',
        teachingMoment:
          'Selbst der „gute" Ausgang ohne Backup kostet Wochen und echte Datenverluste. Das ist der Preis, den die fehlende Offsite-Kopie jetzt eintreibt.',
      },
      {
        id: 'disaster_lessons_learned',
        text: 'Sofort 3-2-1 mit Offsite-Backup einführen — diesmal richtig',
        effects: { skills: { security: 6 }, relationships: { chef: 8 }, compliance: 8, stress: 12, budget: -1500 },
        resultText:
          'Aus Schaden klug: Du baust jetzt das getrennte, getestete Backup auf, das vor Wochen gefehlt hat. {chef}: „Hätten wir das mal eher gemacht." Hättet ihr.',
        choiceTags: ['lessons_learned'],
        teachingMoment:
          'Die richtige Lehre, nur teuer bezahlt. Ein getestetes Offsite-Backup hätte denselben Aufwand vorab gekostet — ohne den Datenverlust.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'backup', 'ransomware', 'data_loss'],
  },
];
