import { describe, it, expect } from 'vitest';
import { createInitialState } from './gameState';
import { selectNextEvent, getAvailableEvents } from './eventEngine';
import { allEvents } from '../content/events';
import { GameState } from '@kritis/shared';

const GUI_IDS = [
  'gui_taskmanager_rogue',
  'gui_eventviewer_bruteforce',
  'gui_uac_unsigned_exe',
  'gui_taskmanager_doppelganger',
  'gui_eventviewer_persistence',
  'gui_uac_legit_install',
  'gui_settings_reharden',
  'gui_explorer_open_share',
];

/**
 * Simulate the real learning-mode day loop: each "day" pick the next event the
 * engine would serve, mark it completed, advance. This exercises the actual
 * requiredModes / requires / cliOnly / completedEvents filtering — the part the
 * preview harness can't cover.
 */
function playLearning(seed: string, maxPicks = 80): string[] {
  // Fresh completedEvents array (createInitialState aliases the shared default).
  let state: GameState = { ...createInitialState(seed, 'learning'), completedEvents: [] };
  const sequence: string[] = [];

  for (let i = 0; i < maxPicks; i++) {
    const event = selectNextEvent(allEvents, state, state.seed);
    if (!event) {
      // No content this day — advance the clock and try again.
      state = { ...state, currentDay: state.currentDay + 1 };
      continue;
    }
    sequence.push(event.id);
    state = {
      ...state,
      completedEvents: [...state.completedEvents, event.id],
      currentDay: state.currentDay + 1,
    };
  }
  return sequence;
}

describe('GUI levels in learning mode — engine integration', () => {
  it('exposes GUI levels in cliOnly learning mode (regression for the terminalContext-only filter)', () => {
    // Immutable update — createInitialState aliases DEFAULT_GAME_STATE.completedEvents,
    // so mutating it in place would leak into every other test in the run.
    const base = createInitialState('SEED', 'learning');
    // Each basic GUI level now gates on a thematically matching lesson (spread
    // across the path to avoid tail-clustering); complete the early lessons so
    // all three are reachable here.
    const state = {
      ...base,
      completedEvents: ['learn_01_awakening', 'learn_02_hidden_notes', 'learn_03_forensics', 'learn_04_grep_hunter'],
    };
    const available = getAvailableEvents(allEvents, state).map((e) => e.id);

    // GUI levels must be selectable in cliOnly mode (not filtered out by the
    // terminalContext-only check).
    expect(available).toContain('gui_taskmanager_rogue'); // learn_01
    expect(available).toContain('gui_uac_unsigned_exe'); // learn_02
    expect(available).toContain('gui_eventviewer_bruteforce'); // learn_04
  });

  it('never serves a GUI level before its prerequisite is completed', () => {
    const fresh = createInitialState('SEED', 'learning');
    const availableAtStart = getAvailableEvents(allEvents, fresh).map((e) => e.id);
    // Nothing GUI is reachable on a brand-new save (all require learn_01 / a basic level).
    for (const id of GUI_IDS) {
      expect(availableAtStart).not.toContain(id);
    }
  });

  it('all GUI levels become reachable across a full learning playthrough (multiple seeds)', () => {
    for (const seed of ['ALPHA', 'BRAVO', 'CHARLIE']) {
      const seq = playLearning(seed);
      for (const id of GUI_IDS) {
        expect(seq, `${id} should appear for seed ${seed}`).toContain(id);
      }
      // advanced levels must come after their basic counterpart
      expect(seq.indexOf('gui_taskmanager_doppelganger')).toBeGreaterThan(seq.indexOf('gui_taskmanager_rogue'));
      expect(seq.indexOf('gui_eventviewer_persistence')).toBeGreaterThan(seq.indexOf('gui_eventviewer_bruteforce'));
      expect(seq.indexOf('gui_uac_legit_install')).toBeGreaterThan(seq.indexOf('gui_uac_unsigned_exe'));
      // The incident-response capstone comes last in its chain.
      expect(seq.indexOf('gui_settings_reharden')).toBeGreaterThan(seq.indexOf('gui_eventviewer_persistence'));
    }
  });

  it('never serves a 3rd consecutive GUI level while a non-GUI lesson is available (MAX_CONSECUTIVE_GUI)', () => {
    // The live guarantee in selectNextEvent: after 2 GUI levels in a row, it
    // prefers non-GUI content WHILE ANY non-GUI event remains selectable. Under
    // the track-based path, terminal lessons can themselves gate behind a GUI
    // level (e.g. learn_adv_ssh_orphan ← gui_explorer_auth_users), so there are
    // legitimate moments where the ONLY selectable content is GUI — a 3-in-a-row
    // run there reflects the prerequisite graph, not a clustering failure. So we
    // assert the property the cap actually enforces: every time the engine picks
    // a GUI level that would extend a GUI streak to >=3, there was no non-GUI
    // learning event available to serve instead.
    const seeds = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF'];
    for (const seed of seeds) {
      let state: GameState = { ...createInitialState(seed, 'learning'), completedEvents: [] };
      let trailingGui = 0;
      for (let i = 0; i < 80; i++) {
        const event = selectNextEvent(allEvents, state, state.seed);
        if (!event) {
          state = { ...state, currentDay: state.currentDay + 1 };
          continue;
        }
        const isGui = !!event.guiContext;
        if (isGui && trailingGui >= 2) {
          // The cap should only be "overridden" when nothing non-GUI is selectable.
          const available = getAvailableEvents(allEvents, state);
          const nonGuiAvailable = available.filter((e) => !e.guiContext);
          expect(
            nonGuiAvailable.length,
            `seed ${seed}: 3rd consecutive GUI (${event.id}) served while non-GUI was available: [${nonGuiAvailable
              .map((e) => e.id)
              .join(',')}]`
          ).toBe(0);
        }
        trailingGui = isGui ? trailingGui + 1 : 0;
        state = {
          ...state,
          completedEvents: [...state.completedEvents, event.id],
          currentDay: state.currentDay + 1,
        };
      }
    }
  });

  it('every GUI briefingVariant flag is actually set by some GUI solution', () => {
    const guiEvents = allEvents.filter((e) => e.guiContext);
    const flagsSet = new Set<string>();
    for (const e of guiEvents) {
      for (const s of e.guiContext!.solutions) {
        for (const f of s.setsFlags ?? []) flagsSet.add(f);
      }
    }
    const setList = [...flagsSet];
    for (const e of guiEvents) {
      for (const v of e.guiContext!.briefingVariants ?? []) {
        expect(setList, `${e.id}: briefingVariant flag "${v.flag}" is never set by any GUI solution`).toContain(v.flag);
      }
    }
  });

  it('does not front-load GUI levels (terminal lessons still lead the playthrough)', () => {
    // DOCUMENTED FINDING (see report): GUI levels can clump at the TAIL of a
    // learning run — once every terminal lesson is completed, only GUI levels
    // remain in the pool, so the worst-case run is every remaining GUI level
    // back-to-back at the end.
    // That tail-clustering is a content-tuning decision, not a correctness bug.
    // What we DO assert here is the inverse property that matters for onboarding:
    // a learner is never dropped straight into GUI levels — terminal lessons
    // lead the early game.
    for (const seed of ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO']) {
      const seq = playLearning(seed);
      const firstGui = seq.findIndex((id) => id.startsWith('gui_'));
      expect(firstGui, `seed ${seed}: first event must be a terminal lesson`).toBeGreaterThan(0);
      // No event is ever served twice (sanity: no duplicate/infinite selection).
      expect(new Set(seq).size).toBe(seq.length);
    }
  });
});
