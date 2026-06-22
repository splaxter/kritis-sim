import { describe, it, expect } from 'vitest';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureChapters } from '../content/adventure/chapters';
import { getAvailableEvents } from './eventEngine';
import { createInitialState } from './gameState';
import { GameEvent } from '@kritis/shared';

// The three soft GUI beats, their app, the chapter they belong to, the beat
// they must follow, and the evidence flag their solution sets.
const BEATS = [
  {
    id: 'adv_gui_eventviewer_probe',
    app: 'eventviewer',
    chapter: 'ch05_coincidence',
    after: 'adv_pattern_recognition',
    flag: 'story_saw_intrusion',
  },
  {
    id: 'adv_gui_settings_preharden',
    app: 'settings',
    chapter: 'ch08_calm_before',
    after: 'adv_preparation_check',
    flag: 'story_hardened',
  },
  {
    id: 'adv_gui_taskmanager_attack',
    app: 'taskmanager',
    chapter: 'ch09_attack',
    after: 'adv_ransomware_strike',
    flag: 'story_incident_contained',
  },
] as const;

const byId = new Map(adventureStoryEvents.map((e) => [e.id, e]));

describe('story-mode GUI beats', () => {
  for (const beat of BEATS) {
    describe(beat.id, () => {
      const event = byId.get(beat.id) as GameEvent | undefined;

      it('exists in adventureStoryEvents with the right guiContext app', () => {
        expect(event, `${beat.id} must be authored in story-events.ts`).toBeDefined();
        expect(event!.guiContext?.app).toBe(beat.app);
      });

      it('is soft-gated: one guiCommand choice AND one narrative choice', () => {
        const choices = event!.choices ?? [];
        expect(choices.filter((c) => c.guiCommand).length).toBe(1);
        expect(choices.filter((c) => !c.guiCommand).length).toBeGreaterThanOrEqual(1);
      });

      it('its solution sets the evidence flag', () => {
        const flags = (event!.guiContext?.solutions ?? []).flatMap((s) => s.setsFlags ?? []);
        expect(flags).toContain(beat.flag);
      });

      it('is NOT a learning-mode pool event (no requiredModes)', () => {
        expect(event!.requiredModes).toBeUndefined();
      });

      it('is referenced by an optional beat placed after its anchor', () => {
        const chapter = adventureChapters.find((c) => c.id === beat.chapter)!;
        expect(chapter, `chapter ${beat.chapter} must exist`).toBeDefined();
        const ids = chapter.storyBeats.map((b) => b.eventId);
        const anchorIdx = ids.indexOf(beat.after);
        const beatIdx = ids.indexOf(beat.id);
        expect(anchorIdx, `${beat.after} must be in ${beat.chapter}`).toBeGreaterThanOrEqual(0);
        expect(beatIdx, `${beat.id} must be a beat in ${beat.chapter}`).toBe(anchorIdx + 1);
        const guiBeat = chapter.storyBeats[beatIdx];
        expect(guiBeat.isOptional, 'GUI beat must be optional').toBe(true);
      });
    });
  }

  it('every briefingVariant flag is produced by some story-GUI solution', () => {
    const produced = new Set(
      adventureStoryEvents.flatMap((e) =>
        (e.guiContext?.solutions ?? []).flatMap((s) => s.setsFlags ?? [])
      )
    );
    for (const beat of BEATS) {
      const event = byId.get(beat.id)!;
      for (const v of event.guiContext?.briefingVariants ?? []) {
        expect(produced.has(v.flag), `briefingVariant flag ${v.flag} must come from a GUI solution`).toBe(true);
      }
    }
  });

  it('the GUI beats never enter the learning-mode pool', () => {
    const state = { ...createInitialState('SEED', 'learning'), completedEvents: [] };
    const availIds = new Set(
      getAvailableEvents([...adventureStoryEvents], state).map((e) => e.id)
    );
    for (const beat of BEATS) {
      expect(availIds.has(beat.id)).toBe(false);
    }
  });
});
