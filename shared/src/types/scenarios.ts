// Scenario System - Rich interactive scenarios with multiple outcomes
// Scenarios are more detailed than Events, with BSI references and real-world lessons

import { TerminalContext } from './terminal';
import { GuiContext } from './gui';
import { GameModeId } from './gameMode';

export type ScenarioOutcome =
  | 'PERFECT'
  | 'PERFECT_ALTERNATIVE'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAIL'
  | 'CRITICAL_FAIL';

export type ScenarioCategory =
  | 'vendor_management'
  | 'security_incident'
  | 'compliance'
  | 'troubleshooting'
  | 'crisis_management'
  | 'team_dynamics'
  | 'budget_politics';

export type ScenarioUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface ScenarioChoice {
  id: string;
  text: string;
  outcome: ScenarioOutcome;
  consequence: string;
  scoreChange: number;
  reputationChange: number;
  lesson: string;
  triggersEvent?: string;
  followupEvent?: string;
  terminalCommand?: boolean; // If true, opens terminal for this choice
  guiCommand?: boolean; // If true, opens the scenario's guiContext (Windows-style GUI level)
  requiresSkill?: {
    skill: string;
    threshold: number;
  };
}

export interface Scenario {
  id: string;
  title: string;
  category: ScenarioCategory;
  difficulty: number; // 1-5
  flavorText: string;
  urgency: ScenarioUrgency;
  choices: ScenarioChoice[];
  realWorldReference: string;
  bsiReference?: string;
  involvedNpcs?: string[]; // NPC IDs involved in this scenario
  tags?: string[];
  /**
   * Restrict this scenario to specific game modes (same semantics as
   * `GameEvent.requiredModes`); omitted = every mode.
   *
   * WARUM ES DAS GIBT: Die Auswahl kennt nur `difficulty`, und der
   * Frueh-Cap liegt in JEDEM Modus bei 2. Ein Einstiegsfall auf
   * Schwierigkeit 1 landete damit auch in Woche 1 eines 24-woechigen
   * KRITIS-Laufs — inhaltlich der falsche Ton, und messbar schaedlich:
   * die drei Einstiegsfaelle vergroesserten den Frueh-Pool (Schwierigkeit
   * <= 2) von 9 auf 12 Szenarien und verschoben den KRITIS-Verlauf so
   * weit, dass `kritisLatePacing` in Woche 23 auf leere Tage lief
   * (0 tote Tage auf main, 32 von 200 Laeufen mit ihnen im Pool, wieder
   * 0 ohne sie). Schwierigkeit ist eben keine Zielgruppe.
   */
  requiredModes?: GameModeId[];
  terminalContext?: TerminalContext; // Terminal challenge for this scenario
  guiContext?: GuiContext; // Windows-style GUI challenge for this scenario
}

export interface ScenarioPack {
  npcId: string; // The NPC this scenario pack belongs to
  scenarios: Scenario[];
}
