# Play-Tracking

A deliberately minimal backend that records who played the game and what they
did, for internal team insight / security-training review. Not a revival of the
old sql.js backend (`docs/BACKEND_REMOVAL.md`) — this is an append-only event
log with no database.

## What is collected

Sent from the browser to `POST /api/track`, keyed to the pseudonymous
`kritis_player_id` (localStorage), plus an **optional** self-chosen name:

| Event | When | Payload |
|-------|------|---------|
| `run_started` | a fresh run begins | mode, campaignId (story runs) |
| `run_completed` | a run ends (win/lose/story ending) | mode, campaignId, outcome, week reached, score, ending, sidequests, **full `decisions[]`** |
| `lesson_completed` | a learning level is finished | lessonId, trackId |
| `player_named` | the player saves a name in the menu | name |
| `campaign_unlocked` | a hidden campaign's code is entered in the picker (once, on the transition) | campaignId |

**Reading a story run correctly:** `runsCompleted` counts *every* run end —
burnout and Kündigung included. What separates "played the campaign to its end"
from "the run stopped in week 12" is `outcome` plus `ending`: the client only
sends `ending` (and `score`) when `isAdventureModeComplete()` holds, the same
condition that gates the real ending screen. A run with `outcome: 'ended'` and
**no** `ending` never reached an ending screen. The aggregate surfaces this per
run in `players[].completedRuns[]`, rendered in the *Abschlüsse* column as
e.g. `Probezeit W12/12 · Beendet (kein Ende)`.

**Measuring a hidden campaign:** `campaign_unlocked` plus the campaignId on
`run_started` answer "did anyone find Trick 17, and did they play it?" — visible
in the *Kampagnen* column as `Audit Trail (entsperrt, gestartet)`. Events logged
before this existed carry no campaignId and simply don't attribute.

Game **saves stay local** (localStorage) and are never sent. See the in-app
Datenschutz page for the user-facing disclosure.

## Storage

- One NDJSON line per event in `DATA_DIR/events.jsonl` (`DATA_DIR` defaults to
  `<repo>/data`, set to `/data` in Docker).
- Append-only; writes are serialized in-process so lines never interleave.
- Reads skip any corrupt/half-written line. Aggregation dedupes `run_*` by
  `(playerId, seed)` and drops any player with a `player_deleted` tombstone.

## Viewing

Both endpoints require `?token=<STATS_TOKEN>`. **If `STATS_TOKEN` is unset they
return 404** (disabled) — the write path stays open regardless.

- `GET /stats?token=…` — server-rendered HTML table (players × runs, best result,
  per-mode, learning progress, last seen).
- `GET /api/stats?token=…` — the same data as JSON.

Ad-hoc analysis with `jq` on the raw log:

```bash
# every completed run with mode + outcome + whether an ending was reached
jq -c 'select(.type=="run_completed") | {player:.playerName, mode:.payload.mode, campaign:.payload.campaignId, outcome:.payload.outcome, week:.payload.weekReached, ending:.payload.ending}' data/events.jsonl

# who found a hidden campaign
jq -c 'select(.type=="campaign_unlocked") | {ts, player:.playerName, campaign:.payload.campaignId}' data/events.jsonl

# choice tags across all runs (what people engage with)
jq -r 'select(.type=="run_completed") | .payload.decisions[].tags[]' data/events.jsonl | sort | uniq -c | sort -rn
```

## Deleting a player (Art. 17 DSGVO)

```bash
curl -X DELETE "https://<host>/api/player/player-XXXX?token=$STATS_TOKEN"
```

Appends a tombstone; the player disappears from all aggregates immediately.

## Deployment

- `docker-compose.yml` mounts the named volume `kritis-data:/data` and passes
  `DATA_DIR=/data` + `STATS_TOKEN`.
- **Coolify:** add a persistent-storage mapping to `/data` and set the
  `STATS_TOKEN` env var. Without the volume the log is lost on redeploy; without
  the token the stats views stay disabled.
