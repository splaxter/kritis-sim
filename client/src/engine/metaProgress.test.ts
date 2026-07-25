import { describe, it, expect } from 'vitest';
import { readMeta, recordRun, META_VERSION } from './metaProgress';

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
    expect(meta.endingsSeenByCampaign).toEqual({});
  });

  it('records a run, tracks distinct endings PER campaign and best score per mode', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'story', seed: 'r1', campaignId: 'probation', ending: 'neutral', score: 40 }, s);
    let meta = recordRun('p1', { mode: 'story', seed: 'r2', campaignId: 'probation', ending: 'good', score: 70 }, s);
    expect(meta.runsCompleted).toBe(2);
    expect(meta.endingsSeenByCampaign.probation?.slice().sort()).toEqual(['good', 'neutral']);
    expect(meta.bestScoreByMode.story).toBe(70);

    // A worse score does not lower the best.
    meta = recordRun('p1', { mode: 'story', seed: 'r3', campaignId: 'probation', ending: 'good', score: 55 }, s);
    expect(meta.bestScoreByMode.story).toBe(70);
    // 'good' already seen → not duplicated.
    expect(meta.endingsSeenByCampaign.probation?.filter((e) => e === 'good')).toHaveLength(1);
    expect(meta.runsCompleted).toBe(3);
  });

  it("an AUDIT TRAIL ending does not pollute probation's set (and vice versa)", () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'story', seed: 'r1', campaignId: 'probation', ending: 'good' }, s);
    const meta = recordRun('p1', { mode: 'story', seed: 'r2', campaignId: 'audit-trail', ending: 'profi' }, s);
    expect(meta.endingsSeenByCampaign.probation).toEqual(['good']);
    expect(meta.endingsSeenByCampaign['audit-trail']).toEqual(['profi']);
  });

  it('dedupes on (campaignId, seed): the same seed in two campaigns is TWO runs', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'story', seed: 'SHARED', campaignId: 'probation', ending: 'good' }, s);
    const meta = recordRun('p1', { mode: 'story', seed: 'SHARED', campaignId: 'audit-trail', ending: 'profi' }, s);
    // Both counted (not suppressed by the shared seed), each under its campaign.
    expect(meta.runsCompleted).toBe(2);
    expect(meta.endingsSeenByCampaign.probation).toEqual(['good']);
    expect(meta.endingsSeenByCampaign['audit-trail']).toEqual(['profi']);
  });

  it('is idempotent per seed (repeat renders count a run once)', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'kritis', seed: 'same', campaignId: 'probation', score: 0 }, s);
    const meta = recordRun('p1', { mode: 'kritis', seed: 'same', campaignId: 'probation', score: 0 }, s);
    expect(meta.runsCompleted).toBe(1);
  });

  it('persists across reads and recovers from corrupt data', () => {
    const s = fakeStorage();
    recordRun('p1', { mode: 'intermediate', seed: 'r1', campaignId: 'probation' }, s);
    expect(readMeta('p1', s).runsCompleted).toBe(1);

    s.setItem('kritis_meta_p1', '{not json');
    const meta = readMeta('p1', s);
    expect(meta.runsCompleted).toBe(0); // soft-reset, no throw
  });

  it('migrates a v1 flat endingsSeen under probation (fill, not discard)', () => {
    const s = fakeStorage();
    // Hand-write a legacy v1 blob.
    s.setItem('kritis_meta_p1', JSON.stringify({
      version: 1,
      runsCompleted: 4,
      endingsSeen: ['good', 'bad'],
      bestScoreByMode: { story: 88 },
      lastRunAt: '2026-01-01T00:00:00Z',
      countedSeeds: ['a', 'b'],
    }));
    const meta = readMeta('p1', s);
    expect(meta.version).toBe(META_VERSION);
    expect(meta.runsCompleted).toBe(4); // preserved, not reset
    expect(meta.endingsSeenByCampaign.probation).toEqual(['good', 'bad']);
    expect(meta.bestScoreByMode.story).toBe(88);
  });
});
