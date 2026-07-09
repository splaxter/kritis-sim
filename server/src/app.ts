/**
 * Express app factory. Split from index.ts so tests can drive it with supertest
 * without binding a port. index.ts adds static SPA serving and listens.
 *
 * Play-tracking endpoints:
 *   POST   /api/track            append one or more events (fire-and-forget)
 *   GET    /api/stats?token=…     aggregated JSON  (token-gated)
 *   GET    /stats?token=…         aggregated HTML page (token-gated)
 *   DELETE /api/player/:id?token= append a deletion tombstone (token-gated)
 *
 * Token gating: disabled (404) unless STATS_TOKEN is set; 403 on mismatch. The
 * write path (/api/track) is intentionally open — it's same-origin and only
 * appends pseudonymous events.
 */
import express, { Express, Request, Response } from 'express';
import { appendEvent, readEvents, aggregate, StoredEvent } from './store.js';
import { renderStatsHtml } from './statsPage.js';

const KNOWN_TYPES = new Set([
  'run_started',
  'run_completed',
  'lesson_completed',
  'player_named',
]);
const VALID_PLAYER = /^player-[\w-]{3,60}$/;
const MAX_BATCH = 50;
const MAX_NAME = 40;

function nowIso(): string {
  return new Date().toISOString();
}

/** Structural validation of an untrusted event. Returns a cleaned event or null. */
function sanitize(raw: unknown): StoredEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.type !== 'string' || !KNOWN_TYPES.has(e.type)) return null;
  if (typeof e.playerId !== 'string' || !VALID_PLAYER.test(e.playerId)) return null;

  const clean: StoredEvent = {
    v: typeof e.v === 'number' ? e.v : 1,
    type: e.type,
    playerId: e.playerId,
    ts: typeof e.ts === 'string' ? e.ts.slice(0, 40) : nowIso(),
    receivedAt: nowIso(),
    payload:
      e.payload && typeof e.payload === 'object'
        ? (e.payload as Record<string, unknown>)
        : {},
  };
  if (typeof e.playerName === 'string' && e.playerName.trim()) {
    clean.playerName = e.playerName.trim().slice(0, MAX_NAME);
  }
  if (typeof e.seed === 'string') clean.seed = e.seed.slice(0, 80);
  return clean;
}

/** true if the caller may proceed; otherwise the response has been sent. */
function passesToken(req: Request, res: Response): boolean {
  const secret = process.env.STATS_TOKEN;
  if (!secret) {
    res.status(404).send('Not found');
    return false;
  }
  const token = req.query.token;
  if (typeof token !== 'string' || token !== secret) {
    res.status(403).send('Forbidden');
    return false;
  }
  return true;
}

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Health — untouched (Docker HEALTHCHECK + Playwright webServer probe depend on it).
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: nowIso() });
  });

  // Ingest. Accepts one event or an array; silently drops invalid ones.
  app.post('/api/track', async (req, res) => {
    const body = req.body;
    const list = Array.isArray(body) ? body : [body];
    if (list.length === 0 || list.length > MAX_BATCH) {
      res.status(400).json({ error: 'batch size' });
      return;
    }
    let accepted = 0;
    for (const raw of list) {
      const clean = sanitize(raw);
      if (!clean) continue;
      await appendEvent(clean);
      accepted++;
    }
    res.status(202).json({ accepted, rejected: list.length - accepted });
  });

  // Aggregated JSON.
  app.get('/api/stats', async (req, res) => {
    if (!passesToken(req, res)) return;
    const agg = aggregate(await readEvents(), nowIso());
    res.json(agg);
  });

  // Aggregated HTML page.
  app.get('/stats', async (req, res) => {
    if (!passesToken(req, res)) return;
    const agg = aggregate(await readEvents(), nowIso());
    res.type('html').send(renderStatsHtml(agg));
  });

  // Right-to-erasure: append a tombstone; aggregation drops the player entirely.
  app.delete('/api/player/:id', async (req, res) => {
    if (!passesToken(req, res)) return;
    const id = req.params.id;
    if (!VALID_PLAYER.test(id)) {
      res.status(400).json({ error: 'invalid id' });
      return;
    }
    await appendEvent({ type: 'player_deleted', playerId: id, receivedAt: nowIso() });
    res.status(204).end();
  });

  return app;
}
