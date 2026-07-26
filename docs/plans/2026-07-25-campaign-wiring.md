# Campaign Wiring — Implementation Plan

> Emerged from the Task-11 review. Runs BEFORE Task 12 (Act-1 content) and Task 7
> (menu selection). Goal: make the ending/character/act-break/persistence paths
> campaign-aware so AUDIT TRAIL is runtime-correct the moment it becomes
> selectable — no silent probation fallback anywhere.

**Design doc:** `docs/plans/2026-07-24-audit-trail-campaign-design.md` (§5 domains/
endings, §7.3 decoupling). **Acceptance bar:** each task typechecks + its tests
pass + commits; **probation behaviour byte-identical** (regression tests prove it).

## Architecture decisions

### D1 — `deriveEnding` mandatory, no cycle
`CampaignDefinition.deriveEnding: (state) => CampaignEndingId` becomes **required**.
Constraint found: `getEndingStats` (stays in the engine; App uses it for the
ending-screen stats) calls `deriveEndingFlags`/`deriveStoryPath` internally, so
moving those into `campaigns/*` would just reverse the cycle (engine→campaigns).
Resolution: the probation ending policy (`ENDING_FLAG_SOURCES`,
`deriveEndingFlags`, `deriveStoryPath`, and a new `deriveProbationEnding` =
`calculateEndingScore`+`determineEnding`) moves into a **neutral content module**
`content/adventure/probationEnding.ts` whose only deps are `@kritis/shared`.
Both the engine (`getEndingStats`) and the probation campaign import it — neither
creates a cycle, because `content/adventure/*` imports neither the engine nor the
campaign registry. The engine's `calculateAdventureEnding` is removed; App calls
`getCampaign(state.storyState.campaignId).deriveEnding(state)`. `getEndingStats`
(score/sidequest counts) stays in the engine unchanged except its import source
for the two helpers.

### D2 — Two distinct "character" concepts, both campaign-owned
- **Token map** (`{chef: 'Bert', …}`, App:148) replaces `{chef}` tokens in
  narrative. It is relationship-key → display-name. It moves onto the campaign as
  `characterTokens: Record<string,string>`. Both WARM campaigns share the same
  values, but the source becomes the campaign, not a hardcode.
- **Cast list** (`campaign.characters: StoryCharacter[]`, already exists) is the
  id/name/role roster (for any character screen). Unchanged; App may read it but
  the token replacement uses `characterTokens`.

### D3 — Ending render is campaign-driven, text-only for AUDIT TRAIL
App's ending branch resolves `endingId = campaign.deriveEnding(state)`,
`text = campaign.endingTexts[endingId]`, and the **modular epilogue** via an
optional `campaign.buildEpilogue?(state) → string` (AUDIT TRAIL sets it to
`buildAuditTrailEpilogue`; probation omits it and uses the static
`endingTexts[id].epilogue`). `otherEndingTitles`/`totalEndings`/`missedSidequests`
come from `campaign.endingTexts`/`campaign.sidequests`. Act-break body comes from
`campaign.actBreaks` (fallback to the shared default). AUDIT TRAIL ships **no**
chapter art / StoryBackground images — the noir background only renders for
campaigns that declare art; AUDIT TRAIL events carry `image: undefined`, so the
existing `setBackgroundImage(event.image || null)` already yields a plain
text-only backdrop (verified: no probation art leaks).

### D4 — Campaign-specific initial state
`createInitialState(mode, …)` for a story run seeds `storyState` from the chosen
campaign: `createInitialAdventureState(campaign)` already sets `campaignId`/start
chapter; add campaign-specific **relationship start values** and an empty
**characterMemory** so an AUDIT TRAIL run carries none of probation's relationship
state. Campaign selection itself is Task 7; until then story runs default to
probation, so this task wires the plumbing and tests it with an explicit
audit-trail seed (no menu path needed).

### D5 — metaProgress + telemetry per campaign
- `MetaProgress`: `endingsSeen` becomes per-campaign (`endingsSeenByCampaign:
  Record<CampaignId, string[]>`), `TOTAL_STORY_ENDINGS` becomes per-campaign.
  `recordRun` takes `campaignId`. **Migration:** a v1 record's flat `endingsSeen`
  moves under `probation`; bump `META_VERSION` with a fill-migration (not discard).
- Telemetry `RunCompletedPayload`: add `campaignId`, widen `ending` to `string`.

## Tasks

**W1 — deriveEnding mandatory + probation ending module (D1).**
Move `deriveEndingFlags`/`deriveStoryPath`/`ENDING_FLAG_SOURCES` → `campaigns/
probation/ending.ts`; add `deriveProbationEnding`. Make `CampaignDefinition.
deriveEnding` required; probation set to `deriveProbationEnding`, audit-trail
already has its own. Remove engine `calculateAdventureEnding`; update its callers
(App, tests) to `getCampaign(state.storyState.campaignId).deriveEnding(state)`.
Tests: probation ending byte-identical for representative states (snapshot the
old vs new result); audit-trail deriveEnding reachable.

**W2 — campaign-driven App ending/act-break/epilogue (D2, D3).**
Add `characterTokens` + optional `buildEpilogue` to `CampaignDefinition`; probation
provides `characterTokens`, audit-trail provides both. App: tokenMap from campaign;
ending screen + act-break from campaign; epilogue via `buildEpilogue`. Tests:
probation ending screen unchanged; audit-trail renders its own titles/epilogue;
no art for audit-trail.

**W3 — campaign-specific initial state (D4).**
gameState story-init seeds relationships/characterMemory per campaign. Test: an
audit-trail initial state carries campaign relationship defaults + empty
characterMemory; a probation initial state is unchanged.

**W4 — metaProgress + telemetry per campaign (D5).**
Per-campaign endingsSeen with migration; recordRun/telemetry carry campaignId +
string ending. Tests: v1 meta migrates (flat endingsSeen → probation); recording
an audit-trail ending doesn't pollute probation's set; telemetry payload shape.

**W5 — probation regression + fresh-state guard.**
A test that an audit-trail run start carries no probation flags/relationship
state, plus a probation full-run-ending regression. Full node + jsdom suites.
