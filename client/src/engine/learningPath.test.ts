import { describe, it, expect } from 'vitest';
import { GameState } from '@kritis/shared';
import { LEARNING_TRACKS } from '../content/events/learning-tracks';
import { allEvents } from '../content/events';
import {
  getTrackState, getTrackProgress, getNextInTrack,
  getRecommendedNext, isFinaleUnlocked,
} from './learningPath';

const track = (id: string) => LEARNING_TRACKS.find((t) => t.id === id)!;

function state(completed: string[], lastTrackId?: string): GameState {
  return {
    completedEvents: completed,
    flags: {},
    gameMode: 'learning',
    isStoryMode: false,
    learningState: { lastTrackId },
  } as unknown as GameState;
}

describe('learningPath engine', () => {
  it('foundations is available from the start; other tracks are locked', () => {
    expect(getTrackState(track('foundations'), state([]), allEvents)).toBe('available');
    expect(getTrackState(track('linux_services'), state([]), allEvents)).toBe('locked');
  });

  it('tracks unlock once Foundations core is complete', () => {
    const done = ['learn_01_awakening', 'learn_02_hidden_notes', 'learn_03_forensics', 'learn_04_grep_hunter'];
    expect(getTrackState(track('foundations'), state(done), allEvents)).toBe('completed');
    expect(getTrackState(track('linux_services'), state(done), allEvents)).toBe('available');
  });

  it('getTrackProgress counts only CORE levels', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter','learn_05_pipe_filter'];
    const p = getTrackProgress(track('linux_services'), state(done), allEvents);
    expect(p.totalCore).toBe(3);
    expect(p.doneCore).toBe(1);
  });

  it('getNextInTrack returns the first not-done unlocked level', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter'];
    expect(getNextInTrack(track('linux_services'), state(done), allEvents)?.id).toBe('learn_05_pipe_filter');
  });
});

describe('getRecommendedNext (intent first)', () => {
  it('recommends the next Foundations level while Foundations is incomplete', () => {
    expect(getRecommendedNext(state(['learn_01_awakening']), allEvents)?.id).toBe('learn_02_hidden_notes');
  });

  it('continues the lastTrackId track when several are in progress', () => {
    const done = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter',
      'learn_05_pipe_filter', 'learn_08_network_recon'];
    expect(getRecommendedNext(state(done, 'network_dns'), allEvents)?.id).toBe('learn_adv_dns_splitbrain');
    expect(getRecommendedNext(state(done, 'linux_services'), allEvents)?.id).toBe('learn_06_zombie_hunt');
  });

  it('isFinaleUnlocked requires 3 completed CORE tracks (Foundations excluded)', () => {
    const f = ['learn_01_awakening','learn_02_hidden_notes','learn_03_forensics','learn_04_grep_hunter'];
    const linux = ['learn_05_pipe_filter','learn_06_zombie_hunt','learn_07_necromancer'];
    const net = ['learn_08_network_recon'];
    const ir = ['learn_10_incident_boss'];
    expect(isFinaleUnlocked(state([...f, ...linux, ...net]))).toBe(false);
    expect(isFinaleUnlocked(state([...f, ...linux, ...net, ...ir]))).toBe(true);
  });
});
