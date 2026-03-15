import { describe, it, expect } from 'vitest';
import {
  getAllNpcs,
  getNpcById,
  getContactById,
  getAllScenarios,
  getScenarioById,
  getScenariosForNpc,
  getScenariosByCategory,
  getScenariosByDifficulty,
  getRandomCatchphrase,
  getContentStats,
} from './index';

describe('Content Packs Registry', () => {
  describe('getAllNpcs', () => {
    it('returns all NPCs from all packs', () => {
      const npcs = getAllNpcs();

      expect(npcs.length).toBeGreaterThan(0);
      expect(npcs[0]).toHaveProperty('id');
      expect(npcs[0]).toHaveProperty('companyName');
      expect(npcs[0]).toHaveProperty('contacts');
    });

    it('includes AMSE vendor', () => {
      const npcs = getAllNpcs();
      const amse = npcs.find(npc => npc.id === 'NPC-AMSE');

      expect(amse).toBeDefined();
      expect(amse!.companyName).toBe('AMSE IT Solutions GmbH');
    });
  });

  describe('getNpcById', () => {
    it('returns NPC by ID', () => {
      const npc = getNpcById('NPC-AMSE');

      expect(npc).toBeDefined();
      expect(npc!.companyName).toBe('AMSE IT Solutions GmbH');
    });

    it('returns undefined for unknown ID', () => {
      const npc = getNpcById('UNKNOWN-NPC');

      expect(npc).toBeUndefined();
    });
  });

  describe('getContactById', () => {
    it('returns contact by ID', () => {
      const contact = getContactById('AMSE-MARCO');

      expect(contact).toBeDefined();
      expect(contact!.name).toBe('Marco Bühler');
      expect(contact!.role).toContain('Techniker');
    });

    it('returns Stefan contact', () => {
      const contact = getContactById('AMSE-STEFAN');

      expect(contact).toBeDefined();
      expect(contact!.name).toBe('Stefan Wengler');
      expect(contact!.role).toContain('Geschäftsführer');
    });

    it('returns undefined for unknown contact ID', () => {
      const contact = getContactById('UNKNOWN-CONTACT');

      expect(contact).toBeUndefined();
    });
  });

  describe('getAllScenarios', () => {
    it('returns all scenarios from all packs', () => {
      const scenarios = getAllScenarios();

      // Multiple packs with scenarios
      expect(scenarios.length).toBeGreaterThanOrEqual(8);
    });

    it('all scenarios have required fields', () => {
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        expect(scenario.id).toBeDefined();
        expect(scenario.title).toBeDefined();
        expect(scenario.category).toBeDefined();
        expect(scenario.difficulty).toBeGreaterThanOrEqual(1);
        expect(scenario.difficulty).toBeLessThanOrEqual(5);
        expect(scenario.flavorText).toBeDefined();
        expect(scenario.urgency).toBeDefined();
        expect(scenario.choices.length).toBeGreaterThan(0);
        expect(scenario.realWorldReference).toBeDefined();
      }
    });

    it('all scenario choices have required fields', () => {
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        for (const choice of scenario.choices) {
          expect(choice.id).toBeDefined();
          expect(choice.text).toBeDefined();
          expect(choice.outcome).toBeDefined();
          expect(choice.consequence).toBeDefined();
          expect(typeof choice.scoreChange).toBe('number');
          expect(typeof choice.reputationChange).toBe('number');
          expect(choice.lesson).toBeDefined();
        }
      }
    });
  });

  describe('getScenarioById', () => {
    it('returns scenario by ID', () => {
      const scenario = getScenarioById('AMSE-SC-001');

      expect(scenario).toBeDefined();
      expect(scenario!.title).toContain('Firewall');
    });

    it('returns undefined for unknown ID', () => {
      const scenario = getScenarioById('UNKNOWN-SC');

      expect(scenario).toBeUndefined();
    });
  });

  describe('getScenariosForNpc', () => {
    it('returns scenarios for AMSE NPC', () => {
      const scenarios = getScenariosForNpc('NPC-AMSE');

      expect(scenarios.length).toBe(8);
    });

    it('returns empty array for unknown NPC', () => {
      const scenarios = getScenariosForNpc('UNKNOWN-NPC');

      expect(scenarios.length).toBe(0);
    });
  });

  describe('getScenariosByCategory', () => {
    it('returns vendor_management scenarios', () => {
      const scenarios = getScenariosByCategory('vendor_management');

      expect(scenarios.length).toBeGreaterThan(0);
      for (const scenario of scenarios) {
        expect(scenario.category).toBe('vendor_management');
      }
    });

    it('returns security_incident scenarios', () => {
      const scenarios = getScenariosByCategory('security_incident');

      expect(scenarios.length).toBeGreaterThan(0);
      for (const scenario of scenarios) {
        expect(scenario.category).toBe('security_incident');
      }
    });

    it('returns empty array for unknown category', () => {
      const scenarios = getScenariosByCategory('unknown_category');

      expect(scenarios.length).toBe(0);
    });
  });

  describe('getScenariosByDifficulty', () => {
    it('returns scenarios within difficulty range', () => {
      const scenarios = getScenariosByDifficulty(2, 3);

      expect(scenarios.length).toBeGreaterThan(0);
      for (const scenario of scenarios) {
        expect(scenario.difficulty).toBeGreaterThanOrEqual(2);
        expect(scenario.difficulty).toBeLessThanOrEqual(3);
      }
    });

    it('returns empty array for no matching scenarios', () => {
      const scenarios = getScenariosByDifficulty(10, 15);

      expect(scenarios.length).toBe(0);
    });
  });

  describe('getRandomCatchphrase', () => {
    it('returns a catchphrase from Marco', () => {
      const catchphrase = getRandomCatchphrase('AMSE-MARCO');

      expect(catchphrase).toBeDefined();
      expect(typeof catchphrase).toBe('string');
      expect(catchphrase!.length).toBeGreaterThan(0);
    });

    it('returns undefined for unknown contact', () => {
      const catchphrase = getRandomCatchphrase('UNKNOWN-CONTACT');

      expect(catchphrase).toBeUndefined();
    });
  });

  describe('getContentStats', () => {
    it('returns correct content statistics', () => {
      const stats = getContentStats();

      // Multiple content packs
      expect(stats.npcPacks).toBeGreaterThanOrEqual(1);
      expect(stats.totalNpcs).toBeGreaterThanOrEqual(1);
      expect(stats.totalContacts).toBeGreaterThanOrEqual(2);
      expect(stats.scenarioPacks).toBeGreaterThanOrEqual(1);
      expect(stats.totalScenarios).toBeGreaterThanOrEqual(8);
      expect(stats.scenariosByCategory).toHaveProperty('vendor_management');
    });
  });

  describe('Scenario Content Validation', () => {
    it('all scenarios have valid outcome types', () => {
      const validOutcomes = ['PERFECT', 'PERFECT_ALTERNATIVE', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAIL', 'CRITICAL_FAIL'];
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        for (const choice of scenario.choices) {
          expect(validOutcomes).toContain(choice.outcome);
        }
      }
    });

    it('all scenarios have valid urgency levels', () => {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        expect(validUrgencies).toContain(scenario.urgency);
      }
    });

    it('all scenarios have valid category types', () => {
      const validCategories = [
        'vendor_management',
        'security_incident',
        'compliance',
        'troubleshooting',
        'crisis_management',
        'team_dynamics',
        'budget_politics',
      ];
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        expect(validCategories).toContain(scenario.category);
      }
    });

    it('all scenario NPC references are valid contacts', () => {
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        if (scenario.involvedNpcs) {
          for (const npcId of scenario.involvedNpcs) {
            // Each referenced NPC should exist as a contact
            const contact = getContactById(npcId);
            expect(contact).toBeDefined();
          }
        }
      }
    });

    it('scenarios have at least one PERFECT or SUCCESS outcome', () => {
      const scenarios = getAllScenarios();
      const goodOutcomes = ['PERFECT', 'PERFECT_ALTERNATIVE', 'SUCCESS'];

      for (const scenario of scenarios) {
        const hasGoodOutcome = scenario.choices.some(c => goodOutcomes.includes(c.outcome));
        expect(hasGoodOutcome).toBe(true);
      }
    });

    it('scenarios have educational content (lessons and BSI references)', () => {
      const scenarios = getAllScenarios();

      for (const scenario of scenarios) {
        // All choices should have lessons
        for (const choice of scenario.choices) {
          expect(choice.lesson).toBeDefined();
          expect(choice.lesson.length).toBeGreaterThan(10);
        }

        // Scenario should have real-world reference
        expect(scenario.realWorldReference).toBeDefined();
        expect(scenario.realWorldReference.length).toBeGreaterThan(10);
      }
    });
  });
});
