# Backend Removal (2026-07-07)

The Express/SQLite persistence API was deleted in commit `187696f`
(branch chore/audit-fixes). It was dead code: the client never issued a
single HTTP request — saves and player state are localStorage-only via
`client/src/hooks/useSaveLoad.ts`.

## What was deleted

- `server/src/routes/players.ts` + tests — player CRUD, XP, learned commands, achievements
- `server/src/routes/saves.ts` + tests — save-slot CRUD, run history
- `server/src/db/database.ts` — sql.js (WASM SQLite) with full rewrite-to-disk per mutation
- `server/src/db/schema.sql` — tables: players, learned_commands, player_achievements, saves, run_history
- `server/src/validation/gameStateSchema.ts` — Zod GameState schema
- `server/src/test/testApp.ts` — 425-line route duplication for supertest
- Deps: sql.js, zod, cors, uuid, supertest, tsx, concurrently; the /data
  Docker volume and DATABASE_PATH env

## What remains

`server/src/index.ts` is a minimal Express static server: `GET /api/health`
(Docker HEALTHCHECK + Playwright webServer probe) and SPA serving of
`client/dist`. The Coolify deployment was intentionally left untouched.

## Update (2026-07-09): a new, minimal tracking backend exists

A small play-tracking backend was added — NOT a revival of the deleted one.
Instead of sql.js + save-slot CRUD, it is an append-only NDJSON event log
(`server/src/store.ts`) with a token-gated `/stats` page. It records run
starts/completions and learning progress, not full game saves (those remain
localStorage-only). See **`docs/TRACKING.md`**.

## If meta-progression ever needs a full backend again

The old schema, routes, and Zod validation live in git history:

    git show 187696f^:server/src/db/schema.sql
    git show 187696f^:server/src/routes/players.ts

Design docs: `docs/plans/2026-03-14-kritis-game-design.md` (persistence
section) and `docs/plans/2026-03-14-kritis-game-implementation.md`.
