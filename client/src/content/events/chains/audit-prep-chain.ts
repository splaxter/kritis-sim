import { GameEvent } from '@kritis/shared';

/**
 * Chain: Die Audit-Vorbereitung (red-thread continuity, KRITIS late game)
 *
 * Theme: paperwork discipline vs. cosmetic bluff. Distinct from backup-chain
 * (restore) and supply-chain (vendor trust) — this one is about whether the
 * open findings from the first audit get worked honestly or faked.
 *
 * Flow:
 * evt_auditprep_start (Week 13-15) — how do you work the Mängelliste?
 *   -> "Ownership + Review"     => evt_auditprep_payoff  (4 weeks later)
 *   -> "Selbst alles nachts"    => evt_auditprep_payoff  (4 weeks later)
 *   -> "Word-Doku 'in Umsetzung'" => evt_auditprep_blamage (4 weeks later)
 *   -> "Praktikant + aussitzen" => evt_auditprep_blamage (5 weeks later)
 *
 * Payoff/blamage are the SAME external trigger (a pre-audit call from a
 * Prüfer) seen from two sides — the consequence text explicitly references
 * the week-13 decision, so the player feels the cause-and-effect.
 * Scoped to KRITIS on the START event (gates the whole chain).
 */

export const auditPrepChainEvents: GameEvent[] = [
  // ── Starting event ────────────────────────────────────────────────
  {
    id: 'evt_auditprep_start',
    weekRange: [13, 15],
    probability: 0.9,
    requiredModes: ['kritis'],
    category: 'compliance',
    title: 'Die Mängelliste auf dem Tisch',
    description: `{chef} legt dir einen Ausdruck hin — die Mängelliste aus der Frühjahrsprüfung. Zwölf offene Punkte, von "Netzsegmentierung fehlt" bis "keine dokumentierte Notfallübung".

"Mach das weg", sagt {chef}. "Bevor die wiederkommen. Ich will nicht nochmal so einen Tag erleben wie im Frühjahr."

Zwölf Punkte, ein paar Wochen Zeit, und die Wahl zwischen ernsthaft abarbeiten und schön aussehen lassen. Wie du das jetzt anpackst, holt dich beim Nachaudit wieder ein — so oder so.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'Findings aus einem Audit sind kein Papierproblem, sondern eine Risikoliste mit Frist. Wer sie mit klarer Verantwortlichkeit (ein Owner pro Punkt) und regelmäßigem Review abarbeitet, kann beim Nachaudit jeden Punkt belegen. Wer nur "in Umsetzung" dokumentiert, hat beim ersten Nachfragen nichts in der Hand.',
    choices: [
      {
        id: 'auditprep_ownership',
        text: 'Ownership verteilen: pro Mangel ein Verantwortlicher + monatlicher Review',
        effects: { skills: { softSkills: 5, security: 3 }, compliance: 10, relationships: { chef: 8, kollegen: 5 }, stress: 8 },
        resultText:
          'Du machst aus der Liste ein sauberes Tracking: jeder Punkt bekommt einen Verantwortlichen, eine Frist und einen monatlichen Review-Termin. Es ist Arbeit, aber die Liste schrumpft messbar. {chef} sieht zum ersten Mal Bewegung: "Das fühlt sich an, als hätten wir es im Griff." Habt ihr auch.',
        choiceTags: ['methodical', 'prepared'],
        teachingMoment:
          'Ein Finding-Tracker mit Owner, Frist und Review verwandelt eine bedrohliche Mängelliste in einen steuerbaren Prozess — und liefert nebenbei den Fortschrittsnachweis fürs Nachaudit.',
        chainTriggers: [
          {
            targetEventId: 'evt_auditprep_payoff',
            delayWeeks: 4,
            description: 'Methodically tracked findings pay off in the pre-audit call.',
          },
        ],
      },
      {
        id: 'auditprep_nachts',
        text: 'Selbst alles abarbeiten, notfalls nachts — Hauptsache, es ist echt erledigt',
        effects: { skills: { security: 5, troubleshooting: 3 }, compliance: 8, stress: 18 },
        resultText:
          'Du beißt dich allein durch die Liste, Abend für Abend, Punkt für Punkt. Am Ende sind die meisten Mängel wirklich behoben — nachweisbar, nicht nur behauptet. Der Preis: Du bist ausgelaugt und hast alles Wissen wieder in deinem eigenen Kopf gebündelt. Aber substanziell steht die Liste.',
        choiceTags: ['selfless', 'thorough'],
        teachingMoment:
          'Im Alleingang echte Substanz zu schaffen ist besser als kosmetischer Teamaufwand — aber es überlastet dich und konzentriert das Wissen gefährlich auf eine Person.',
        chainTriggers: [
          {
            targetEventId: 'evt_auditprep_payoff',
            delayWeeks: 4,
            description: 'Solo grind produces real, provable fixes for the pre-audit call.',
          },
        ],
      },
      {
        id: 'auditprep_worddoku',
        text: 'Pro Mangel ein Word-Dokument: "Maßnahme in Umsetzung"',
        effects: { skills: { softSkills: 2 }, compliance: -6, stress: 4 },
        resultText:
          'Du schreibst zu jedem Punkt ein hübsches Dokument: "Maßnahme in Umsetzung, Zieltermin folgt." Die Liste sieht auf einmal bearbeitet aus. Nur getan hast du nichts — die Segmentierung fehlt weiter, die Notfallübung auch. Papier ist geduldig. Prüfer sind es nicht.',
        choiceTags: ['cosmetic', 'negligent'],
        chainTriggers: [
          {
            targetEventId: 'evt_auditprep_blamage',
            delayWeeks: 4,
            description: 'Cosmetic "in progress" docs collapse when the Prüfer calls to verify.',
          },
        ],
      },
      {
        id: 'auditprep_aussitzen',
        text: 'Auf den Praktikanten schieben und auf "kommt Zeit, kommt Rat" hoffen',
        effects: { stress: -4, compliance: -10 },
        resultText:
          'Du delegierst die Liste an den Praktikanten und wendest dich Dringenderem zu. Der Praktikant versteht die Hälfte nicht, du schaust nie nach, und die Wochen vergehen. Die Mängel bleiben Mängel. "Kommt Zeit, kommt Rat" ist selten ein Prüfungskonzept.',
        choiceTags: ['negligent', 'passive'],
        chainTriggers: [
          {
            targetEventId: 'evt_auditprep_blamage',
            delayWeeks: 5,
            description: 'Findings left to rot surface embarrassingly in the pre-audit call.',
          },
        ],
      },
    ],
    tags: ['kritis', 'chain_start', 'audit', 'nis2', 'compliance'],
  },

  // ── Consequence A: the diligence pays off ─────────────────────────
  {
    id: 'evt_auditprep_payoff',
    weekRange: [16, 24],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 12,
    title: 'Der Anruf vor dem Termin',
    description: `Ein paar Tage vor dem Nachaudit-Termin klingelt das Telefon: einer der Prüfer. "Vorab, damit wir am Tag zügig durchkommen — nennen Sie mir drei der Maßnahmen aus Ihrer Mängelliste, und wie Sie sie umgesetzt haben."

Du lehnst dich zurück. Genau darauf hast du seit Wochen hingearbeitet. Netzsegmentierung: umgesetzt, belegbar. Notfallübung: durchgeführt, protokolliert. Log-Management: läuft.

Du kannst jede einzelne belegen — weil du sie damals wirklich angepackt hast, statt sie nur schön zu dokumentieren.`,
    involvedCharacters: ['chef'],
    mentorNote:
      'Ein vorbereiteter Prüfer testet vorab die Substanz. Wer die Findings echt abgearbeitet hat, kann jeden Punkt mit Konfiguration, Protokoll oder Log belegen — und geht mit Rückenwind in den eigentlichen Termin.',
    choices: [
      {
        id: 'auditprep_payoff_belegen',
        text: 'Souverän belegen: zu jeder Maßnahme Nachweis und Kurzstand liefern',
        effects: { skills: { security: 5, softSkills: 4 }, compliance: 15, relationships: { chef: 12 }, stress: -4 },
        resultText:
          'Du gehst die drei Punkte durch, mit Verweis auf Konfiguration, Protokoll und Log. Am anderen Ende Stille, dann: "Sehr schön, dann wird der Termin kurz." Genau die Arbeit aus Woche 13 zahlt jetzt ein — der Prüfer kommt schon mit gutem Eindruck. {chef} später: "Was auch immer du gemacht hast, mach weiter so."',
        teachingMoment:
          'Die Vorab-Belegbarkeit verkürzt und entspannt den eigentlichen Prüftag — frühe, echte Arbeit ist die beste Audit-Vorbereitung.',
        setsFlags: ['auditprep_erfolg'],
      },
      {
        id: 'auditprep_payoff_team',
        text: 'Den Anruf ans Team weiterreichen — jeder erklärt seinen Bereich',
        effects: { skills: { softSkills: 4, security: 2 }, compliance: 12, relationships: { chef: 8, kollegen: 8 }, stress: -2 },
        resultText:
          'Du verbindest den Prüfer der Reihe nach mit den Verantwortlichen — jeder erklärt seinen Punkt souverän. Der Prüfer notiert anerkennend, dass das Wissen breit verteilt ist. Aus der monatlichen Review-Runde ist ein Team geworden, das seine Maßnahmen selbst vertreten kann. {chef} grinst: "Das läuft ja wie geschmiert."',
        teachingMoment:
          'Wenn mehrere Personen ihre Findings selbst erklären können, ist das ein Reifegrad-Signal — verteilte Verantwortung schlägt den Einzelkämpfer, gerade unter Prüferblick.',
        setsFlags: ['auditprep_erfolg', 'auditprep_team'],
      },
    ],
    tags: ['kritis', 'chain_consequence', 'audit', 'nis2', 'payoff'],
  },

  // ── Consequence B: the bluff collapses ────────────────────────────
  {
    id: 'evt_auditprep_blamage',
    weekRange: [16, 24],
    probability: 1.0,
    category: 'compliance',
    isChainEvent: true,
    chainPriority: 12,
    title: 'Derselbe Anruf, andere Seite',
    description: `Ein paar Tage vor dem Nachaudit-Termin klingelt das Telefon: einer der Prüfer. "Vorab, damit wir am Tag zügig durchkommen — nennen Sie mir drei der Maßnahmen aus Ihrer Mängelliste, und wie Sie sie umgesetzt haben."

Du blätterst hektisch durch deine Dokumente — die, die nur behaupten. "Netzsegmentierung… ist in Umsetzung. Die Notfallübung… ist geplant. Log-Management… wird gerade eingerichtet."

Am anderen Ende eine kurze Pause. "In Umsetzung. Verstehe." Man hört das Kreuzchen. Die Wochen, in denen du nur dokumentiert statt gearbeitet hast, kommen jetzt genau hier zurück.`,
    involvedCharacters: ['chef', 'kaemmerer'],
    mentorNote:
      'Cosmetische Audit-Vorbereitung fliegt spätestens beim Nachfragen auf. "In Umsetzung" ohne Beleg wertet ein Prüfer wie "nicht umgesetzt" — und geht mit Misstrauen in den Termin. Ehrlich gestehen und um Frist bitten ist ab hier die einzige nicht selbstschädigende Option.',
    choices: [
      {
        id: 'auditprep_blamage_gestehen',
        text: 'Ehrlich gestehen und um eine realistische Fristverlängerung bitten',
        effects: { skills: { softSkills: 4 }, compliance: 4, relationships: { chef: -3 }, stress: 10 },
        resultText:
          'Du hörst auf zu blättern und sagst die Wahrheit: "Ehrlich gesagt ist da noch nicht viel umgesetzt. Ich brauche eine realistische Frist." Der Prüfer schätzt die Offenheit mehr als das Blättern — und gewährt eine kurze Nachfrist. {chef} ist enttäuscht über den Rückstand, aber froh, dass du nicht gelogen hast. Aus der Blamage wird eine zweite Chance.',
        choiceTags: ['honest'],
        teachingMoment:
          'Wenn die Fassade auffliegt, ist Ehrlichkeit die einzige Rettung: Ein gestandenes Defizit mit realistischem Plan ist reparabel, eine aufrechterhaltene Lüge nicht.',
        setsFlags: ['auditprep_gestanden'],
      },
      {
        id: 'auditprep_blamage_bluffen',
        text: 'Weiterbluffen: "läuft alles, nur die Doku hinkt hinterher"',
        effects: { compliance: -12, relationships: { chef: -8, kaemmerer: -5 }, stress: 16 },
        resultText:
          'Du versuchst, dich rauszureden — "die Umsetzung läuft, nur die Dokumentation hinkt hinterher". Der Prüfer notiert es wortlos und merkt es sich für den Termin, an dem er dich bittet, die "laufende Umsetzung" live zu zeigen. Der Bluff aus Woche 13 wird jetzt zum zweiten Mal fällig — mit Zinsen. {chef} ahnt Böses.',
        choiceTags: ['evasive', 'negligent'],
      },
      {
        id: 'auditprep_blamage_nachtschicht',
        text: 'Panische Rettung: die Tage bis zum Termin durcharbeiten',
        effects: { skills: { security: 4, troubleshooting: 3 }, compliance: 2, relationships: { kollegen: -3 }, stress: 22 },
        resultText:
          'Du legst auf und wirfst alles um: Nachtschichten, um wenigstens die schlimmsten Löcher noch zu stopfen, bevor die Prüfer kommen. Ein paar Punkte kriegst du echt hin, die meisten bleiben halbfertig. Du erscheinst zum Termin übernächtigt und mit einem Flickenteppich. Was in Woche 13 vier ruhige Wochen gewesen wären, presst du jetzt in vier verzweifelte Tage.',
        choiceTags: ['hasty', 'desperate'],
        teachingMoment:
          'Aufgeschobene Findings lassen sich am Ende nicht in Tagen nachholen, was Wochen gebraucht hätte — die Panik-Nachtschicht liefert bestenfalls Stückwerk und einen erschöpften Verantwortlichen.',
      },
    ],
    tags: ['kritis', 'chain_consequence', 'audit', 'nis2', 'blamage'],
  },
];
