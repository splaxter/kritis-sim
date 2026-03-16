import { GameEvent } from '@kritis/shared';

/**
 * Chain A: The Patch Disaster
 *
 * Flow:
 * evt_patch_tuesday (Week 3-5)
 *   -> Choose "immediate patch"
 *   -> evt_patch_fallout triggers 2 weeks later
 */

export const patchChainEvents: GameEvent[] = [
  // Starting event: Patch Tuesday decision
  {
    id: 'evt_patch_tuesday',
    weekRange: [3, 5],
    probability: 0.95,
    category: 'security',
    title: 'Patch Tuesday',
    description: `Microsoft hat 47 kritische Updates veroeffentlicht. {chef} sagt: "Mach mal." {kollege} schaut nervoees auf den WSUS-Server.

"Das sind einige grosse Updates dabei", sagt {kollege}. "Letztes Mal hat der Druckertreiber-Patch die Buchhaltung lahmgelegt."

Die BSI-Compliance fordert zeitnahes Patchen. Aber die Fachabteilungen arbeiten gerade an Quartalsabschluessen.`,
    involvedCharacters: ['chef', 'kollege'],
    mentorNote: 'In der Praxis: Patches immer zuerst in einer Testgruppe ausrollen. KRITIS-Betreiber muessen laut BSI innerhalb definierter Fristen patchen, aber ein kaputter Fachverfahren-Server ist schlimmer als 2 Tage Verzoegerung. Eine Testgruppe mit 5-10 repraesentativen Systemen ist Standard.',
    choices: [
      {
        id: 'patch_immediate',
        text: 'Sofort alle Patches ausrollen - Compliance wartet nicht',
        effects: { relationships: { chef: 5 }, compliance: 10, stress: 5 },
        resultText: 'Die Patches laufen durch. Erstmal sieht alles gut aus... {chef} nickt zufrieden. "Endlich mal jemand, der nicht ewig diskutiert."',
        choiceTags: ['hasty', 'compliant'],
        chainTriggers: [{
          targetEventId: 'evt_patch_fallout',
          delayWeeks: 2,
          description: 'Immediate patch without testing causes fallout 2 weeks later',
        }],
      },
      {
        id: 'patch_test',
        text: 'Erst auf 5 Test-PCs deployen, dann abwarten',
        effects: { relationships: { chef: -5, kollegen: 5 }, compliance: -3, stress: 3 },
        resultText: '{kollege} hilft dir bei der Testgruppe. "Gute Idee. Ich hab noch Alptraeume vom letzten Update-Desaster." {chef} meckert ueber die Verzoegerung, aber ihr ignoriert das.',
        choiceTags: ['careful', 'methodical'],
        teachingMoment: 'Eine Testgruppe ist der beste Kompromiss zwischen Geschwindigkeit und Sicherheit. 48-72 Stunden Testphase sind Standard.',
      },
      {
        id: 'patch_delegate',
        text: 'Patch-Bericht an {chef} schicken und auf Freigabe warten',
        effects: { stress: 8 },
        resultText: '{chef} liest die Mail nicht. Drei Tage spaeter fragt er: "Sind die Patches drauf?" Du zeigst ihm die ungelesene Mail. Er seufzt.',
        choiceTags: ['passive', 'bureaucratic'],
      },
      {
        id: 'patch_weekend',
        text: 'Die Patches fuers Wochenende planen, wenn niemand arbeitet',
        effects: { stress: 10, relationships: { gf: -10 } },
        resultText: 'Du planst die Installation fuer Samstagnacht. Deine Freundin ist nicht begeistert von den geplatzten Wochenendplaenen.',
        choiceTags: ['careful', 'worklife_sacrifice'],
        teachingMoment: 'Wartungsfenster am Wochenende sind bei KRITIS Standard, aber die Work-Life-Balance leidet. Rufbereitschaft muss fair verteilt werden.',
      },
    ],
    tags: ['security', 'windows', 'chain_start', 'wsus', 'patching'],
  },

  // Consequence event: Patch Fallout (triggered 2 weeks after immediate patching)
  {
    id: 'evt_patch_fallout',
    weekRange: [5, 8],
    probability: 1.0, // Always shows when triggered
    category: 'crisis',
    isChainEvent: true,
    chainPriority: 10, // High priority - shows before random events
    title: 'Patch-Desaster',
    description: `Drei Fachverfahren laufen nicht mehr. Die Fachabteilung ruft an: "Unsere Wiegesoftware spinnt seit dem Update!" Die Buchhaltung meldet Excel-Abstuerze. {chef} steht ploetzlich hinter dir.

"Ich dachte, du hast das im Griff?"

Du erinnerst dich: Das waren die Patches, die du sofort ausgerollt hast. Ohne Test. Vor zwei Wochen.`,
    involvedCharacters: ['chef'],
    mentorNote: 'Rollbacks sollten immer geplant sein. WSUS-Genehmigungen zurueckziehen, Deinstallations-Jobs in Baramundi, oder VM-Snapshots. Ohne Rollback-Plan ist jeder Patch ein Risiko. Bei KRITIS-Systemen: Immer einen dokumentierten Rollback-Pfad haben.',
    choices: [
      {
        id: 'fix_yourself',
        text: 'Nachtschicht: Jeden betroffenen PC einzeln fixen',
        requires: { skill: 'troubleshooting', threshold: 30 },
        effects: { stress: 15, relationships: { fachabteilung: 10, chef: 5 } },
        resultText: 'Um 3 Uhr morgens laeuft alles wieder. Du hast 47 PCs angefasst, 3 Treiber neu installiert, und einen Workaround fuer die Buchhaltungssoftware gebastelt. Die Fachabteilung bringt dir am naechsten Tag Kaffee.',
        teachingMoment: 'Heldenhafte Nachtschichten sind keine nachhaltige Loesung. Dokumentiere das Problem und schlage praeventive Massnahmen vor.',
      },
      {
        id: 'blame_microsoft',
        text: '"Microsoft hat einen Bug eingebaut. Nicht meine Schuld."',
        effects: { relationships: { chef: -15, kollegen: -5 }, stress: 5 },
        resultText: '{chef}: "Und was machen wir jetzt? Die Wasserwerke brauchen ihre Software!" Er glaubt dir nicht. {kollege} schaut peinlich beruehrt weg.',
        choiceTags: ['deflect', 'unprofessional'],
      },
      {
        id: 'rollback',
        text: 'Alle Patches zurueckrollen - Compliance-Hit in Kauf nehmen',
        effects: { compliance: -15, relationships: { chef: -5, fachabteilung: 10 }, stress: -5 },
        resultText: 'Die Systeme laufen wieder. {kaemmerer} fragt nach dem Audit-Bericht. Du musst erklaeren, warum kritische Sicherheitsupdates wieder deinstalliert wurden.',
        choiceTags: ['pragmatic'],
        teachingMoment: 'Ein Rollback ist manchmal die beste Option, aber dokumentiere die Gruende sauber. Das BSI akzeptiert dokumentierte Ausnahmen.',
      },
      {
        id: 'partial_rollback',
        text: 'Nur die problematischen Patches identifizieren und gezielt zurueckrollen',
        requires: { skill: 'windows', threshold: 40 },
        effects: { skills: { windows: 5, troubleshooting: 5 }, stress: 10, compliance: -5, relationships: { chef: 10 } },
        resultText: 'Du analysierst die Logs und findest den Uebeltaeter: KB5034441, ein kumulatives Update. Gezielter Rollback nur fuer dieses Update, der Rest bleibt. {chef} ist beeindruckt.',
        teachingMoment: 'Event Viewer und Windows Update Logs (C:\\Windows\\Logs\\CBS) sind deine Freunde beim Debugging von Update-Problemen.',
      },
    ],
    tags: ['crisis', 'chain_consequence', 'windows', 'wsus', 'rollback'],
  },
];
