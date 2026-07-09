import { describe, it, expect } from 'vitest';
import { readMeta, recordRun } from './metaProgress';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  };
}

describe('metaProgress', () => {
  it('returns empty meta for a new player', () => {
    const s = fakeStorage();
    const meta = readMeta('p1', s);
    expect(meta.runsCompleted).toBe(0);
    expect(meta.endingsSeen).toEqual([]);
  });

  it('records a run, tracks distinct endings and best score per mode', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'story', seed: 'r1', ending: 'neutral', score: 40 }, s);
    let meta = recordRun('p1', { mode: 'story', seed: 'r2', ending: 'good', score: 70 }, s);
    expect(meta.runsCompleted).toBe(2);
    expect(meta.endingsSeen.sort()).toEqual(['good', 'neutral']);
    expect(meta.bestScoreByMode.story).toBe(70);

    // A worse score does not lower the best.
    meta = recordRun('p1', { mode: 'story', seed: 'r3', ending: 'good', score: 55 }, s);
    expect(meta.bestScoreByMode.story).toBe(70);
    // 'good' already seen → not duplicated.
    expect(meta.endingsSeen.filter((e) => e === 'good')).toHaveLength(1);
    expect(meta.runsCompleted).toBe(3);
  });

  it('is idempotent per seed (repeat renders count a run once)', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'kritis', seed: 'same', score: 0 }, s);
    const meta = recordRun('p1', { mode: 'kritis', seed: 'same', score: 0 }, s);
    expect(meta.runsCompleted).toBe(1);
  });

  it('persists across reads and recovers from corrupt data', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'intermediate', seed: 'r1' }, s);
    expect(readMeta('p1', s).runsCompleted).toBe(1);

    s.setItem('kritis_meta_p1', '{not json');
    const meta = readMeta('p1', s);
    expect(meta.runsCompleted).toBe(0); // soft-reset, no throw
  });
});
