import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackRunStarted, trackRunCompleted, trackLessonCompleted } from './telemetry';

function lastBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls.at(-1)!;
  return JSON.parse((init as RequestInit).body as string);
}

describe('telemetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs run_started to /api/track with keepalive and the seed', () => {
    trackRunStarted('player-abc12', 'SEED9', 'kritis');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/track');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).keepalive).toBe(true);
    const body = lastBody(fetchMock);
    expect(body).toMatchObject({ v: 1, type: 'run_started', playerId: 'player-abc12', seed: 'SEED9', payload: { mode: 'kritis' } });
    expect(typeof body.ts).toBe('string');
  });

  it('carries the full run_completed payload including decisions', () => {
    trackRunCompleted('player-abc12', 'SEED9', {
      mode: 'story',
      outcome: 'victory',
      weekReached: 12,
      totalWeeks: 12,
      survived: true,
      score: 82,
      ending: 'good',
      sidequestsCompleted: 3,
      decisions: [{ eventId: 'e', choiceIndex: 0, choiceId: 'c', week: 1, day: 1, tags: ['security'] }],
    });
    const body = lastBody(fetchMock);
    expect(body.type).toBe('run_completed');
    expect(body.payload.ending).toBe('good');
    expect(body.payload.decisions).toHaveLength(1);
  });

  it('sends lesson_completed with the track id', () => {
    trackLessonCompleted('player-abc12', 'learn_01', 'foundations');
    const body = lastBody(fetchMock);
    expect(body).toMatchObject({ type: 'lesson_completed', payload: { lessonId: 'learn_01', trackId: 'foundations' } });
  });

  it('never throws when fetch rejects', () => {
    fetchMock.mockReturnValue(Promise.reject(new Error('offline')));
    expect(() => trackRunStarted('player-abc12', 'S', 'beginner')).not.toThrow();
  });

  it('never throws when fetch is entirely unavailable', () => {
    vi.stubGlobal('fetch', undefined);
    expect(() => trackLessonCompleted('player-abc12', 'learn_01')).not.toThrow();
  });
});
