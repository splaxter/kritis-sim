# Story and Level Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the story timeline coherent, make preparation visibly affect the finale, expose sidequest choice to the player, complete the Blackout arc, and balance/unify the learning tracks.

**Architecture:** Keep the existing event, chapter, flag, and track registries. Add pure adventure helpers for crisis labels, preparation tiers, climax outcomes, and sidequest offers; wire only offer selection into `useGame`. Add three engine-native learning events and update the track/finale rules. Content changes remain data-only and are guarded by focused tests.

**Tech Stack:** TypeScript, React 18, Vitest 4, Testing Library, npm workspaces.

---

### Task 1: Crisis timeline labels and countdown consistency

**Files:**
- Create: `client/src/engine/storyTimeline.test.ts`
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/components/GameScreen/index.tsx`
- Modify: `client/src/content/adventure/story-events.ts`
- Modify: `client/src/content/adventure/chapters.ts`

**Step 1: Write failing tests**

Add tests for a new pure helper:

```ts
describe('getStoryTimeLabel', () => {
  it.each([
    ['ch09_attack', 0, 'Tag 1 · 07:23'],
    ['ch09_attack', 4, 'Nacht 1 · noch 72 Stunden'],
    ['ch10_72_hours', 0, 'Tag 2 · Wiederherstellung'],
    ['ch11_truth', 0, 'Tag 3 · Spurensuche'],
    ['ch12_finale', 2, 'Tag 3 · 23:47'],
  ])('%s beat %i has incident time %s', (chapter, beat, expected) => {
    expect(getStoryTimeLabel(storyState(chapter, beat), 9, 1)).toBe(expected);
  });

  it('uses the normal calendar outside the crisis', () => {
    expect(getStoryTimeLabel(storyState('ch08_calm_before', 0), 8, 3))
      .toBe('Woche 8 / Tag 3');
  });
});
```

Add content assertions that `adv_file_contents` no longer says “In zwei Wochen”
and `adv_jens_confession` does not claim a days-long countdown four chapters
before the attack.

**Step 2: Verify red**

Run:

```bash
npx vitest run --root client src/engine/storyTimeline.test.ts
```

Expected: failure because `getStoryTimeLabel` does not exist.

**Step 3: Implement the helper and UI wiring**

Export:

```ts
export function getStoryTimeLabel(
  storyState: AdventureState | undefined,
  week: number,
  day: number
): string
```

Use a chapter/beat label table for chapters 9–12 and return
`Woche ${week} / Tag ${day}` otherwise. Replace both story-mode calendar labels
in `GameScreen` with the helper output. Align chapter descriptions and countdown
copy with an attack window that narrows only when chapter 9 begins.

**Step 4: Verify green**

Run the targeted test and `client/src/engine/campaignConsistency.test.ts`.

**Step 5: Commit**

```bash
git add client/src/engine/storyTimeline.test.ts client/src/engine/adventureEngine.ts client/src/components/GameScreen/index.tsx client/src/content/adventure/story-events.ts client/src/content/adventure/chapters.ts
git commit -m "feat(story): present act three as a 72-hour crisis"
```

### Task 2: Preparation tiers and consequence-driven climax

**Files:**
- Create: `client/src/engine/adventurePreparation.test.ts`
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/content/adventure/story-events.ts`
- Modify: `client/src/content/adventure/endings.ts`
- Modify: `client/src/engine/adventureEnding.test.ts`

**Step 1: Write failing tests**

Specify two pure helpers:

```ts
expect(derivePreparationTier(stateWith(
  'evidence_secured', 'restore_tested', 'shift_plan', 'coordinated_defense'
))).toBe('prepared');
expect(derivePreparationTier(stateWith('evidence_secured', 'restore_tested')))
  .toBe('partial');
expect(derivePreparationTier(stateWith('ignored_warnings', 'all_nighter')))
  .toBe('exposed');

expect(deriveCrisisOutcome(preparedState)).toBe('controlled');
expect(deriveCrisisOutcome(partialState)).toBe('costly');
expect(deriveCrisisOutcome(exposedState)).toBe('emergency');
```

Assert that the three `adv_climax` choices are gated to their matching outcome
flags and do not all expose unconditional victories. Extend ending tests so the
controlled/costly/emergency flags respectively add a bonus, no modifier, and a
penalty through canonical ending flags.

**Step 2: Verify red**

Run `src/engine/adventurePreparation.test.ts`; expect missing helper failures.

**Step 3: Implement minimal derivation**

Use positive flag groups (evidence, recovery, containment, team) and negative
flags (`ignored_warnings`, `recommended_payment`, `burned_bridges`,
`all_nighter`). Prepared requires three positive groups and no major negative;
partial requires one positive group; otherwise exposed. Crisis outcome maps
directly from the tier.

Add `controlled_victory`, `costly_victory`, and `emergency_save` as canonical
ending sources. Rework climax choices so prepared players execute the plan,
partial players improvise with operational damage, and exposed players use the
physical emergency cut with prolonged outage. Each route still sets
`climax_resolved`.

**Step 4: Rewrite high-impact dilemmas**

In `adv_ransomware_strike`, `adv_clock_starts`, `adv_attacker_identity`, and
`adv_final_decision`, replace answer-signalling labels with plausible trade-offs.
Keep at least two ungated choices and make every option carry a short-term
benefit plus a cost.

**Step 5: Verify green and commit**

Run preparation, ending, pacing, and flow-balance tests, then commit with:

```bash
git commit -m "feat(story): make preparation determine crisis consequences"
```

### Task 3: Deliberate sidequest offers

**Files:**
- Modify: `client/src/engine/sidequestFlow.test.ts`
- Modify: `client/src/engine/adventureEngine.test.ts`
- Modify: `client/src/engine/adventureEngine.ts`
- Modify: `client/src/hooks/useGame.ts`
- Modify: `client/src/hooks/useGame.skillgain.browser.test.tsx`

**Step 1: Write failing engine tests**

Replace deterministic-random assertions with:

```ts
const offer = buildSidequestOffer(stateWithTwoAvailableQuests);
expect(offer?.id).toBe('adv_sidequest_offer');
expect(offer?.choices.map((c) => c.id)).toEqual([
  'start:sq_coffee_machine',
  'start:sq_haunted_printer',
  'defer',
]);
expect(buildSidequestOffer(crisisState)).toBeNull();
```

Test `applySidequestOfferChoice`:

- `start:<id>` puts that quest in `activeSidequests`, initializes progress to 0,
  and sets `sidequest_offer_seen_<chapter>`;
- `defer` only sets the chapter-scoped seen flag;
- an expired quest is never offered;
- an active sidequest event still takes priority over the main beat.

**Step 2: Verify red**

Run `sidequestFlow.test.ts`; expect missing helper failures.

**Step 3: Implement offer construction**

Remove `pickSidequestToStart` and its 30% hash gate. In
`getNextStoryContent`, serve an active sidequest first, then a dynamic offer,
then the current beat. The offer uses authored sidequest titles/descriptions and
does not enter `completedEvents`.

**Step 4: Wire offer choices**

In `useGame.makeChoice`, detect `adv_sidequest_offer`, apply the offer helper,
skip ordinary story-beat advancement, and keep normal result-screen behavior.
Add a hook/browser test proving that selecting a quest starts it without
advancing the chapter beat.

**Step 5: Verify green and commit**

Run sidequest flow, adventure engine, hook browser, and campaign pacing tests.
Commit with:

```bash
git commit -m "feat(story): let players choose sidequests explicitly"
```

### Task 4: Blackout debrief and learning-frame cohesion

**Files:**
- Modify: `client/src/content/events/blackout.test.ts`
- Modify: `client/src/content/events/blackout.ts`
- Modify: `client/src/content/events/learning-tracks.ts`
- Modify: `client/src/content/events/learning-tracks.test.ts`
- Modify: `client/src/components/LearningHub/index.tsx`
- Modify: `client/src/components/LearningHub/index.browser.test.tsx`

**Step 1: Write failing content tests**

Require a sixth event, `blk_debrief`, gated on `blk_c3_firewall`, with one
terminal or GUI modality, flag-reactive briefing variants for `blk_sloppy` and
`blk_source_ip_known`, and completion flag `blk_debrief_complete`. Assert it is
the final core Blackout track level.

Add a browser assertion that the hub title is “Incident-Fallarchiv” and displays
copy explaining that each track is a reconstructed case file.

**Step 2: Verify red**

Run Blackout and LearningHub tests; expect missing event/copy failures.

**Step 3: Add the debrief**

Author a compact PowerShell debrief using the existing terminal engine. The
player inspects a prepared incident summary and writes/prints the root-cause and
follow-up report using supported commands. The result text references the known
source IP and Bergmann; `briefingVariants` calls out sloppy initial triage.

**Step 4: Update the hub frame**

Rename the visible hub frame, add a one-paragraph archive explanation, and tune
track descriptions so Awakening, GUI cases, and Blackout read as simulations in
one curriculum. Do not rewrite individual lesson mechanics.

**Step 5: Verify and commit**

Run Blackout, learning-track, hub, GUI-integration, and skill-balance tests.
Commit with:

```bash
git commit -m "feat(learning): close Blackout with a reactive debrief"
```

### Task 5: Balance thin learning tracks and require breadth

**Files:**
- Create: `client/src/content/events/learning-expansion.ts`
- Create: `client/src/content/events/learning-expansion.test.ts`
- Modify: `client/src/content/events/index.ts`
- Modify: `client/src/content/events/learning-tracks.ts`
- Modify: `client/src/engine/learningPath.ts`
- Modify: `client/src/engine/learningPath.test.ts`
- Modify: `client/src/components/LearningHub/index.tsx`
- Modify: `client/src/components/LearningHub/index.browser.test.tsx`

**Step 1: Write failing finale-breadth tests**

Add `getFinaleUnlockStatus` returning `{ unlocked, completedTracks,
missingDomains }`. Tests must prove:

- three short tracks without Linux/services remain locked;
- Linux/services plus Windows/access plus Network/DNS unlocks;
- Linux/services plus Windows/access plus Incident Response unlocks;
- the status names missing domains for hub copy.

**Step 2: Write failing content tests**

Require two new core events:

- `learn_net_service_triage`, following `learn_08_network_recon`, with a Linux
  terminal case that distinguishes DNS failure from service reachability;
- `learn_ir_containment_order`, following `learn_10_incident_boss`, with a
  terminal case that preserves evidence before containment.

Each must have solutions, escalating hints, two or more valid diagnostic
commands, and teaching text. Update track consistency expectations.

**Step 3: Verify red**

Run learning expansion and learning path tests.

**Step 4: Implement events and breadth rule**

Add the event module to `allEvents`, insert both levels as non-optional core
levels, and make `isFinaleUnlocked` delegate to `getFinaleUnlockStatus`.
Domain groups are:

- operations: `linux_services`;
- security: either `windows_security` or `access_hardening`;
- response: either `network_dns` or `incident_response`.

Still require three completed non-foundation tracks overall.

**Step 5: Update hub feedback**

Replace “Schließe 3 Tracks ab” with a status-derived reason that names the
missing domain. Add browser coverage.

**Step 6: Verify and commit**

Run all learning engine/content/browser tests and commit with:

```bash
git commit -m "feat(learning): balance tracks and require finale breadth"
```

### Task 6: Character voice and campaign-copy cleanup

**Files:**
- Create: `client/src/content/adventure/voice.test.ts`
- Modify: `client/src/content/adventure/index.ts`
- Modify: `client/src/content/adventure/story-events.ts`
- Modify: `client/src/content/adventure/sidequest-events.ts`
- Modify: `client/src/content/adventure/endings.ts`

**Step 1: Write failing voice tests**

Assert adventure display text contains none of the curated sexist punchline
stems (`Frauen und Technik`, `wie bei meiner Frau`, `wie meine Schwiegermutter`,
`neue Frau`). Assert the story overview no longer claims Bert does not
understand the internet and does describe him as pragmatic support.

**Step 2: Verify red**

Run `voice.test.ts`; expect matches in the four content files.

**Step 3: Rewrite only matched lines**

Keep Bjorg's established cadence but replace the jokes with fake meetings,
delegation, buzzwords, and credit-taking. Align tagline/description with the
authored Bert. Avoid changing ids, flags, or effects.

**Step 4: Verify and commit**

Run voice, orthography, naming, and content tests. Commit with:

```bash
git commit -m "fix(content): sharpen character voice and campaign framing"
```

### Task 7: Full verification and documentation refresh

**Files:**
- Modify: `docs/CONTENT_INVENTORY.md`
- Modify: `docs/BLACKOUT_SLICE.md`

**Step 1: Update authoritative counts and status**

Record the new learning-event count, Blackout six-level arc, explicit sidequest
offer behavior, crisis timeline presentation, and breadth-based finale rule.

**Step 2: Run focused verification**

```bash
npm run build -w shared
npx vitest run --root client \
  src/engine/storyTimeline.test.ts \
  src/engine/adventurePreparation.test.ts \
  src/engine/sidequestFlow.test.ts \
  src/content/events/blackout.test.ts \
  src/content/events/learning-expansion.test.ts \
  src/engine/learningPath.test.ts \
  src/content/adventure/voice.test.ts
```

Expected: all selected tests pass with zero failures.

**Step 3: Run full verification**

```bash
npm test
npm run build
```

Expected: both commands exit 0 with zero test failures and zero TypeScript build
errors.

**Step 4: Review scope and commit docs**

Use `git diff --check`, `git status --short`, and `git diff --stat`. Do not add
the user's pre-existing untracked image or `.claude` files. Commit only the two
documentation updates:

```bash
git commit -m "docs: refresh story and learning content inventory"
```
