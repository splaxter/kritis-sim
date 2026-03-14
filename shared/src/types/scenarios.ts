// Scenario System - Rich interactive scenarios with multiple outcomes
// Scenarios are more detailed than Events, with BSI references and real-world lessons

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
}

export interface ScenarioPack {
  npcId: string; // The NPC this scenario pack belongs to
  scenarios: Scenario[];
}
