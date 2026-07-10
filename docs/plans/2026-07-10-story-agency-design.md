# Story Agency and Consequence Design

## Goal

Make “Die Probezeit” feel meaningfully reactive without replacing its existing 12-chapter spine or invalidating current saves.

## Scope

The first pass keeps `AdventureChapter`, `GameEvent`, `StoryBeat`, flags, relationship memory, and the current three ending types. It adds authored alternate events, explicit route/preparation flags, reliable sidequest opportunities, and a visible ending breakdown.

## Design

### 1. Route divergence

The Chapter 6 official/solo decision becomes a persistent route flag. Chapters 7–8 receive route-specific events that change the investigation method, allies, and risk profile. Chapter 11’s investigation and Chapter 12’s climax use route-specific alternates where authored. The main chapter order remains unchanged, so old saves can continue from their current chapter.

### 2. Preparation consequences

Preparation decisions in Chapters 4–8 set canonical flags such as `backup_verified`, `team_prepared`, `evidence_secured`, and `systems_isolated`. Chapter 9–10 crisis beats read these flags and offer different response options/events. The ending screen still resolves to good/neutral/bad, but the crisis text and epilogue acknowledge which preparation actually mattered.

### 3. Sidequest discovery

Sidequests remain optional and one-at-a-time, but eligible quests get a deterministic authored invitation instead of relying solely on a 30% start roll. The invitation is surfaced at the next eligible story transition; declining or postponing remains possible. Existing trigger conditions, rewards, and completed-save data remain valid.

### 4. NPC memory payoffs

Key relationship/sidequest flags unlock visible callback choices in later events. Callback choices are not hidden behind opaque score thresholds: the event text tells the player why the option is available and what relationship or preparation it represents. Existing character memory remains the source of trust calculations.

### 5. Ending transparency

The run summary exposes the factors that shaped the ending: route, completed sidequests, preparation flags, evidence/team/trust status, and penalties. The ending classification formula remains stable for compatibility, but the player can understand the result and what to change on a replay.

## Compatibility and failure behavior

- No new required fields are added to saved state; missing flags default to false.
- Missing authored alternate content falls back to the existing main event.
- Sidequest scheduling must never block the main story.
- Branch audits fail if any route or alternate event id is dangling.
- Existing tests for all three endings, pacing, and old saves remain in place.

## Verification

- Add content consistency tests for route alternates and preparation flags.
- Add engine tests proving official and underground routes serve different content.
- Add sidequest tests proving eligible quests are offered deterministically and the main story still advances when declined.
- Add summary tests for ending-factor visibility.
- Run the full Node test suite, client browser suite, and production build.
