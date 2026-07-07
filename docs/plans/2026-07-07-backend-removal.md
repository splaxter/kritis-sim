# Backend Removal: Static SPA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete the dead Express/SQLite API (players/saves routes, sql.js database, Zod validation, testApp duplication) and ship the game as a static SPA. The client never calls the API — saves are localStorage-only via `client/src/hooks/useSaveLoad.ts` — so the entire persistence backend is dead code.

**Architecture:** Keep a *minimal* static server: a ~25-line Express app that serves `client/dist` and answers `GET /api/health`. Rationale: the existing Docker deployment (Coolify) builds this repo's Dockerfile, runs `node server/dist/index.js`, and health-checks `/api/health`; the Playwright `webServer` config also polls `/api/health`. Keeping the tiny server means **zero changes** to Coolify config, `playwright.config.ts`, and the root `start` script — only deletions elsewhere. Everything under `server/src/routes/`, `server/src/db/`, `server/src/validation/`, and `server/src/test/` is deleted, along with `sql.js`, `zod`, `cors`, `uuid`, `supertest`, `tsx`, and `concurrently` dependencies.

> **Pure-static alternative (rejected for now):** `client/dist` after `npm run build -w client` is fully self-contained and could be served by nginx, Caddy, Netlify, or Coolify's static-site type with no Node process at all. That would delete the `server/` workspace entirely, but requires reconfiguring the Coolify service (new Dockerfile or app type), a new healthcheck target, and a Playwright `webServer` change. If the deployment is ever rebuilt from scratch, prefer that route; the minimal server below is one file and one dependency, so the carrying cost is negligible.

**Tech Stack:** npm workspaces (client / server / shared), Vite + React client, Express 4 static server, Vitest (root config globs `**/*.test.ts`), Playwright e2e, multi-stage `node:20-alpine` Dockerfile.

**Verified audit findings (2026-07-07):**
- `grep -rnE "fetch\(|axios" client/src` → **zero hits**. The client has no HTTP layer at all.
- `grep -rn "api/" client/src` → one hit: `client/src/engine/shell/VirtualFilesystem.ts:708` — a *fake in-game log line* (`"POST /api/login HTTP/1.1" 401`), lore content, not a call. **Keep it.**
- `client/src/hooks/useSaveLoad.ts` — save/load is 100% `localStorage` (the `fetchSaves` name is historical; body uses `localStorage.getItem`).
- **e2e DOES exercise the API:** `e2e/game.spec.ts:278-344` (`test.describe('API Health', …)`) hits `/api/health`, `/api/players`, `/api/saves`. The two player/save tests test the deleted code and must go in the same commit; the health test stays.
- `client/vite.config.ts:8-13` proxies `/api` → `localhost:3000` in dev; dead once the API is gone.
- Server deps: `express` stays; `cors`, `sql.js`, `uuid`, `zod`, `@kritis/shared` become removable. DevDeps: `@types/express` stays; `@types/cors`, `@types/sql.js`, `@types/uuid`, `tsx` removable (tsx only powers `dev`, which becomes pointless). Root devDeps `supertest`, `@types/supertest` (used only by server route tests) and `concurrently` (used only to run dev:server alongside dev:client) become removable.
- Nothing outside `server/` imports from `server/` (only docs mention it). `server/data/` holds only a tracked `.gitignore` and an untracked local `kritis.db`.

---

## Task 1: Safety gate — confirm the API is dead code

No commits in this task. **If any command below produces an unexpected hit, STOP the plan and reassess with the owner.**

**Files:** none (read-only).

**Steps:**

1. Confirm no client/shared code calls the players/saves API:
   ```bash
   grep -rn "api/players\|api/saves" /Users/timoklinge/Projekte/kritis_game/client /Users/timoklinge/Projekte/kritis_game/shared --exclude-dir=node_modules --exclude-dir=dist
   ```
   **Expected output: empty** (exit code 1).

2. Confirm the client has no HTTP layer at all:
   ```bash
   grep -rnE "fetch\(|axios|XMLHttpRequest" /Users/timoklinge/Projekte/kritis_game/client/src
   ```
   **Expected output: empty** (exit code 1).

3. Confirm the only `/api` strings in client are the lore log line (and the vite proxy, removed in Task 3):
   ```bash
   grep -rn "api/" /Users/timoklinge/Projekte/kritis_game/client/src
   grep -rn "'/api'" /Users/timoklinge/Projekte/kritis_game/client/vite.config.ts
   ```
   **Expected output:** exactly one `client/src` hit — `client/src/engine/shell/VirtualFilesystem.ts:708` containing `"POST /api/login HTTP/1.1" 401` (fake log content, keep it) — and the proxy key in `vite.config.ts`.

4. Confirm nothing imports from the server workspace:
   ```bash
   grep -rn "@kritis/server\|from ['\"].*server/src" /Users/timoklinge/Projekte/kritis_game/client /Users/timoklinge/Projekte/kritis_game/shared /Users/timoklinge/Projekte/kritis_game/e2e --exclude-dir=node_modules --exclude-dir=dist
   ```
   **Expected output: empty** (exit code 1).

5. Confirm the known e2e API usage is confined to the `API Health` describe block (removed in Task 2):
   ```bash
   grep -rn "api/" /Users/timoklinge/Projekte/kritis_game/e2e
   ```
   **Expected output:** hits only in `e2e/game.spec.ts` between lines ~280 and ~340 (`/api/health`, `/api/players`, `/api/saves`). Any hit elsewhere → STOP.

6. Confirm saves are localStorage-only:
   ```bash
   grep -n "localStorage" /Users/timoklinge/Projekte/kritis_game/client/src/hooks/useSaveLoad.ts
   ```
   **Expected output:** multiple hits (`getItem`/`setItem`); this file must contain no `fetch`.

---

## Task 2: Delete the API — routes, db, validation, tests, e2e API specs; shrink index.ts

One atomic commit: `index.ts` imports the routers and db, and the e2e specs exercise them, so deletion + rewrite + e2e trim must land together to stay green.

**Files:**
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/routes/players.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/routes/players.test.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/routes/saves.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/routes/saves.test.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/db/database.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/db/schema.sql`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/validation/gameStateSchema.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/test/setup.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/src/test/testApp.ts`
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/vitest.config.ts` (no server tests remain)
- Delete: `/Users/timoklinge/Projekte/kritis_game/server/data/` (tracked `.gitignore` + untracked local `kritis.db`)
- Modify: `/Users/timoklinge/Projekte/kritis_game/server/src/index.ts` (full replacement below)
- Modify: `/Users/timoklinge/Projekte/kritis_game/server/package.json` (full replacement below)
- Modify: `/Users/timoklinge/Projekte/kritis_game/server/tsconfig.json` (drop shared reference)
- Modify: `/Users/timoklinge/Projekte/kritis_game/e2e/game.spec.ts` (trim API block)

**Steps:**

1. Delete the dead code:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   git rm -r server/src/routes server/src/db server/src/validation server/src/test server/vitest.config.ts server/data/.gitignore
   rm -rf server/data
   ```
   **Expected output:** `git rm` lists each removed file; `server/data/` (with the untracked `kritis.db`) is gone.

2. Replace `/Users/timoklinge/Projekte/kritis_game/server/src/index.ts` with exactly:
   ```typescript
   import express from 'express';
   import { join, dirname } from 'path';
   import { fileURLToPath } from 'url';

   const __dirname = dirname(fileURLToPath(import.meta.url));
   const app = express();
   const PORT = process.env.PORT || 3000;

   // Health check (used by the Docker HEALTHCHECK and the Playwright webServer probe)
   app.get('/api/health', (_req, res) => {
     res.json({ status: 'ok', timestamp: new Date().toISOString() });
   });

   // Serve the built SPA
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(join(__dirname, '../../client/dist')));
     app.get('*', (_req, res) => {
       res.sendFile(join(__dirname, '../../client/dist/index.html'));
     });
   }

   app.listen(PORT, () => {
     console.log(`Static server running on http://localhost:${PORT}`);
   });
   ```
   Notes: no `cors` (same-origin static serving needs none), no db init, no routers. The `NODE_ENV` gate is kept so `npm start` behavior matches today (dev uses Vite on 5173).

3. Replace `/Users/timoklinge/Projekte/kritis_game/server/package.json` with exactly:
   ```json
   {
     "name": "@kritis/server",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     },
     "dependencies": {
       "express": "^4.18.3"
     },
     "devDependencies": {
       "@types/express": "^4.17.21"
     }
   }
   ```
   Removed: deps `@kritis/shared`, `cors`, `sql.js`, `uuid`, `zod`; devDeps `@types/cors`, `@types/sql.js`, `@types/uuid`, `tsx`; the `dev` script (tsx-based; the static server has no dev role — see Task 3); the `cp src/db/schema.sql` step in `build`.

4. In `/Users/timoklinge/Projekte/kritis_game/server/tsconfig.json`, remove the shared project reference. Change:
   ```json
     "include": ["src/**/*"],
     "references": [{ "path": "../shared" }]
   ```
   to:
   ```json
     "include": ["src/**/*"]
   ```
   (The minimal server no longer imports `@kritis/shared`.)

5. In `/Users/timoklinge/Projekte/kritis_game/e2e/game.spec.ts`, replace the entire `test.describe('API Health', …)` block (currently lines 278–344, from `test.describe('API Health', () => {` through the file's final `});`) with:
   ```typescript
   test.describe('API Health', () => {
     test('health endpoint returns ok', async ({ request }) => {
       const response = await request.get('/api/health');
       expect(response.ok()).toBeTruthy();

       const body = await response.json();
       expect(body.status).toBe('ok');
     });
   });
   ```
   This drops the `can create and retrieve a player` and `can save and load game state` tests (they tested the deleted routes) and keeps the health probe.

6. Sync the lockfile and verify:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   npm install
   npm run build
   npm test
   ```
   **Expected output:** `npm install` rewrites `package-lock.json` (removed packages pruned). `npm run build` succeeds for shared, client, and server (server build is now just `tsc`). `npm test` passes with exit code 0 — the test-file list contains **no** `server/` paths and no failures.

7. Commit (include `package-lock.json`):
   ```bash
   git add -A
   git commit -m "refactor(server): remove dead players/saves API and SQLite layer

   Client never called the API (saves are localStorage-only via
   useSaveLoad.ts). Server is now a minimal static file server with
   /api/health kept for Docker HEALTHCHECK and Playwright webServer.

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 3: Root scripts, root dev-dependency prune, Vite proxy removal

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/package.json`
- Modify: `/Users/timoklinge/Projekte/kritis_game/client/vite.config.ts`

**Steps:**

1. In root `package.json`, replace the three dev scripts:
   ```json
       "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
       "dev:client": "npm run dev -w client",
       "dev:server": "npm run dev -w server",
   ```
   with:
   ```json
       "dev": "npm run dev -w client",
   ```
   (Dev is Vite-only now; the static server has nothing to serve in dev. `build`, `start`, and all test scripts stay unchanged — Playwright's `NODE_ENV=production npm start` keeps working.)

2. In root `package.json` devDependencies, delete these three lines:
   ```json
       "@types/supertest": "^7.2.0",
       "concurrently": "^8.2.2",
       "supertest": "^7.2.2",
   ```
   (`supertest` was used only by the deleted server route tests; `concurrently` only by the deleted dev script.)

3. In `/Users/timoklinge/Projekte/kritis_game/client/vite.config.ts`, remove the dead dev proxy. Change:
   ```typescript
     server: {
       port: 5173,
       proxy: {
         '/api': {
           target: 'http://localhost:3000',
           changeOrigin: true,
         },
       },
     },
   ```
   to:
   ```typescript
     server: {
       port: 5173,
     },
   ```

4. Verify:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   npm install
   npm test
   npm run build
   ```
   **Expected output:** lockfile pruned again; all tests pass (exit 0); build succeeds.

5. Commit:
   ```bash
   git add -A
   git commit -m "chore: drop server dev workflow and unused supertest/concurrently deps

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 4: Dockerfile and docker-compose — drop the /data volume and DATABASE_PATH

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/Dockerfile` (full replacement below)
- Modify: `/Users/timoklinge/Projekte/kritis_game/docker-compose.yml` (full replacement below)

**Steps:**

1. Replace `/Users/timoklinge/Projekte/kritis_game/Dockerfile` with exactly:
   ```dockerfile
   # Dockerfile
   FROM node:20-alpine AS builder

   WORKDIR /app

   # Copy package files
   COPY package*.json ./
   COPY client/package*.json ./client/
   COPY server/package*.json ./server/
   COPY shared/package*.json ./shared/

   # Install dependencies
   RUN npm ci

   # Copy source
   COPY . .

   # Build
   RUN npm run build

   # Production image
   FROM node:20-alpine

   WORKDIR /app

   # Create non-root user for security
   RUN addgroup -g 1001 -S nodejs && \
       adduser -S nodejs -u 1001 -G nodejs

   # Copy built files
   COPY --from=builder --chown=nodejs:nodejs /app/server/dist ./server/dist
   COPY --from=builder --chown=nodejs:nodejs /app/client/dist ./client/dist
   COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
   COPY --from=builder --chown=nodejs:nodejs /app/server/package.json ./server/

   ENV NODE_ENV=production

   # Switch to non-root user
   USER nodejs

   EXPOSE 3000

   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
     CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

   CMD ["node", "server/dist/index.js"]
   ```
   Removed vs. today: the `schema.sql` COPY line, `RUN mkdir -p /data && chown …`, and `ENV DATABASE_PATH=/data/kritis.db`. Kept: the `/api/health` HEALTHCHECK (the minimal server still serves it — Coolify config needs no change).

2. Replace `/Users/timoklinge/Projekte/kritis_game/docker-compose.yml` with exactly:
   ```yaml
   version: '3.8'

   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       restart: unless-stopped
   ```
   Removed: `DATABASE_PATH` env, the `kritis-data:/data` mount, and the top-level `volumes:` block.

3. Verify with a local build and smoke test:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   docker build -t kritis-game-static .
   docker run -d --rm --name kritis-smoke -p 3000:3000 kritis-game-static
   sleep 3
   curl -sf http://localhost:3000/api/health
   curl -sf http://localhost:3000/ | head -c 200
   docker stop kritis-smoke
   ```
   **Expected output:** build succeeds; first curl prints `{"status":"ok","timestamp":"…"}`; second curl prints the start of the SPA's `index.html` (`<!doctype html>…`). If Docker isn't running locally, note it and rely on Task 7 / the Coolify deploy for this check — do not skip silently.

4. Commit:
   ```bash
   git add Dockerfile docker-compose.yml
   git commit -m "chore(docker): drop /data volume and DATABASE_PATH from static image

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 5: Update README and TECHNICAL_DEBT

**Files:**
- Modify: `/Users/timoklinge/Projekte/kritis_game/README.md`
- Modify: `/Users/timoklinge/Projekte/kritis_game/docs/TECHNICAL_DEBT.md`

**Steps:**

1. In `README.md` Tech Stack (line ~40), replace:
   ```markdown
   - **Backend:** Express + TypeScript + SQLite (sql.js)
   ```
   with:
   ```markdown
   - **Server:** Minimal Express static server (health check + SPA serving; game state lives in browser localStorage)
   ```

2. In the README Project Structure block (line ~72), replace:
   ```
   ├── server/                 # Express backend
   │   └── src/
   │       ├── db/             # SQLite database
   │       └── routes/         # API routes
   ```
   with:
   ```
   ├── server/                 # Minimal static file server (health check + SPA)
   ```

3. In `docs/TECHNICAL_DEBT.md`, delete the two rows that reference deleted files:
   - In "Tests (Low Priority)": the row `| Zod validation tests | \`server/src/routes/saves.test.ts\` | Marked as \`.todo()\` … |`
   - In "Architecture (Nice-to-Have)": the row `| Test app router duplication | \`server/src/test/testApp.ts\` duplicates route logic … |`

   Also delete the entire "### Zod validation tests" subsection (the ```bash code block referencing `server/src/test/testApp.ts` and `validateGameState`) under "How to Address Remaining Items".

4. Verify nothing else in docs actively instructs against the new state (historical plans under `docs/plans/` stay as-is — they are records, not live docs):
   ```bash
   grep -rn "server/src" /Users/timoklinge/Projekte/kritis_game/README.md /Users/timoklinge/Projekte/kritis_game/docs/TECHNICAL_DEBT.md
   ```
   **Expected output: empty.**

5. Commit:
   ```bash
   git add README.md docs/TECHNICAL_DEBT.md
   git commit -m "docs: reflect static-SPA architecture after backend removal

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---## Task 6: Record the removal for future meta-progression work

**Files:**
- Create: `/Users/timoklinge/Projekte/kritis_game/docs/BACKEND_REMOVAL.md`

**Steps:**

1. Get the hash of the Task 2 deletion commit:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   git log --oneline --grep "remove dead players/saves API" -1
   ```
   **Expected output:** one line, `<hash> refactor(server): remove dead players/saves API and SQLite layer`. Use `<hash>` below.

2. Create `/Users/timoklinge/Projekte/kritis_game/docs/BACKEND_REMOVAL.md` with (substitute the real hash):
   ```markdown
   # Backend Removal (2026-07-07)

   The Express/SQLite persistence API was deleted in commit `<hash>`
   (branch feat/blackout-slice). It was dead code: the client never issued a
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

   ## If meta-progression ever needs a backend

   The full schema, routes, and Zod validation live in git history:

       git show <hash>^:server/src/db/schema.sql
       git show <hash>^:server/src/routes/players.ts

   Design docs: `docs/plans/2026-03-14-kritis-game-design.md` (persistence
   section) and `docs/plans/2026-03-14-kritis-game-implementation.md`.
   ```

3. Commit:
   ```bash
   git add docs/BACKEND_REMOVAL.md
   git commit -m "docs: record backend removal and git-history recovery path

   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
   ```

---

## Task 7: Final verification — full suite, e2e, Docker

No commits unless something fails (fix forward with a conventional commit, then re-run).

**Files:** none.

**Steps:**

1. Unit/integration suite from a clean install state:
   ```bash
   cd /Users/timoklinge/Projekte/kritis_game
   npm ci
   npm test
   ```
   **Expected output:** exit 0, all test files pass, zero `server/` test files listed.

2. Full build + e2e (Playwright starts `NODE_ENV=production npm start` and polls `/api/health` — this exercises the new minimal server end-to-end):
   ```bash
   npm run test:e2e
   ```
   **Expected output:** exit 0; the `API Health › health endpoint returns ok` test passes; no test references `/api/players` or `/api/saves` anymore.

3. Docker image build + smoke (skip only if Docker is unavailable, and say so):
   ```bash
   docker build -t kritis-game-static .
   docker run -d --rm --name kritis-smoke -p 3000:3000 kritis-game-static
   sleep 3
   curl -sf http://localhost:3000/api/health && echo OK
   docker stop kritis-smoke
   ```
   **Expected output:** `{"status":"ok",…}` then `OK`.

4. Confirm no stray references survived:
   ```bash
   grep -rn "sql.js\|DATABASE_PATH\|initializeDatabase\|playersRouter\|savesRouter" /Users/timoklinge/Projekte/kritis_game --include="*.ts" --include="*.json" --include="*.yml" --include="Dockerfile" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git | grep -v "docs/"
   ```
   **Expected output: empty** (docs mentions are the historical records from Tasks 5–6 and `docs/plans/`).
