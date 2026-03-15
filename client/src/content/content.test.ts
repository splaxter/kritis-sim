/**
 * Content Validation Tests
 * Ensures data integrity across all game content
 */
import { describe, it, expect } from 'vitest';
import { allEvents, getEventById } from './events';
import { getAllScenarios } from './packs';

// Get all scenarios once for testing
const allScenarios = getAllScenarios();

describe('Content ID Uniqueness', () => {
  describe('Event IDs', () => {
    it('all event IDs are unique', () => {
      const ids = allEvents.map(e => e.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

      expect(duplicates).toEqual([]);
      if (duplicates.length > 0) {
        console.error('Duplicate event IDs:', [...new Set(duplicates)]);
      }
    });

    it('no empty event IDs', () => {
      const emptyIds = allEvents.filter(e => !e.id || e.id.trim() === '');
      expect(emptyIds).toEqual([]);
    });

    it('event IDs follow naming convention', () => {
      // Events should start with evt_, adv_, or sq_ prefix
      const invalidIds = allEvents.filter(e => {
        const id = e.id;
        return !id.startsWith('evt_') && !id.startsWith('adv_') && !id.startsWith('sq_');
      });

      // Log but don't fail - just informational
      if (invalidIds.length > 0) {
        console.warn('Events without standard prefix:', invalidIds.map(e => e.id));
      }
    });
  });

  describe('Scenario IDs', () => {
    it('all scenario IDs are unique', () => {
      const ids = allScenarios.map(s => s.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

      expect(duplicates).toEqual([]);
      if (duplicates.length > 0) {
        console.error('Duplicate scenario IDs:', [...new Set(duplicates)]);
      }
    });

    it('no empty scenario IDs', () => {
      const emptyIds = allScenarios.filter(s => !s.id || s.id.trim() === '');
      expect(emptyIds).toEqual([]);
    });
  });

  describe('Cross-Content ID Uniqueness', () => {
    it('no ID collision between events and scenarios', () => {
      const eventIds = new Set(allEvents.map(e => e.id));
      const scenarioIds = allScenarios.map(s => s.id);

      const collisions = scenarioIds.filter(id => eventIds.has(id));

      expect(collisions).toEqual([]);
      if (collisions.length > 0) {
        console.error('IDs used in both events and scenarios:', collisions);
      }
    });
  });
});

describe('Event Prerequisite Validation', () => {
  it('all required events exist', () => {
    const allEventIds = new Set(allEvents.map(e => e.id));
    const missingRefs: Array<{ eventId: string; missingRef: string }> = [];

    for (const event of allEvents) {
      if (event.requires?.events) {
        for (const reqEventId of event.requires.events) {
          if (!allEventIds.has(reqEventId)) {
            missingRefs.push({ eventId: event.id, missingRef: reqEventId });
          }
        }
      }
    }

    expect(missingRefs).toEqual([]);
    if (missingRefs.length > 0) {
      console.error('Events reference non-existent events:', missingRefs);
    }
  });

  it('getEventById returns correct events', () => {
    // Test a few known events
    const firstEvent = allEvents[0];
    const foundEvent = getEventById(firstEvent.id);

    expect(foundEvent).toBeDefined();
    expect(foundEvent?.id).toBe(firstEvent.id);
  });

  it('getEventById returns undefined for non-existent ID', () => {
    const notFound = getEventById('this_event_does_not_exist_xyz_123');
    expect(notFound).toBeUndefined();
  });
});

describe('Content Completeness', () => {
  it('all events have required fields', () => {
    const incompleteEvents = allEvents.filter(e => {
      return !e.id ||
        !e.title ||
        !e.description ||
        !e.category ||
        !e.weekRange ||
        e.weekRange.length !== 2 ||
        !e.choices ||
        e.choices.length === 0;
    });

    expect(incompleteEvents.map(e => e.id)).toEqual([]);
  });

  it('all scenarios have required fields', () => {
    const incompleteScenarios = allScenarios.filter(s => {
      return !s.id ||
        !s.title ||
        !s.flavorText ||
        !s.category ||
        s.difficulty === undefined ||
        !s.choices ||
        s.choices.length === 0;
    });

    expect(incompleteScenarios.map(s => s.id)).toEqual([]);
  });

  it('all event choices have required fields', () => {
    const invalidChoices: Array<{ eventId: string; choiceIndex: number }> = [];

    for (const event of allEvents) {
      event.choices.forEach((choice, index) => {
        if (!choice.id || !choice.text) {
          invalidChoices.push({ eventId: event.id, choiceIndex: index });
        }
      });
    }

    expect(invalidChoices).toEqual([]);
  });
});

describe('Content Counts', () => {
  it('has expected minimum content', () => {
    // Verify we have substantial content
    expect(allEvents.length).toBeGreaterThan(50);
    expect(allScenarios.length).toBeGreaterThan(30);
  });

  it('logs content counts for reference', () => {
    console.log(`Total events: ${allEvents.length}`);
    console.log(`Total scenarios: ${allScenarios.length}`);

    // Count by category
    const eventCategories = new Map<string, number>();
    for (const event of allEvents) {
      const count = eventCategories.get(event.category) || 0;
      eventCategories.set(event.category, count + 1);
    }
    console.log('Events by category:', Object.fromEntries(eventCategories));
  });
});
