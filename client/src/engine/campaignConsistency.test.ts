import { describe, it, expect } from 'vitest';
import { allEvents } from '../content/events';
import { adventureStoryEvents } from '../content/adventure/story-events';
import { adventureSidequestEvents } from '../content/adventure/sidequest-events';
import { adventureChapters } from '../content/adventure/chapters';
import { adventureSidequests } from '../content/adventure/sidequests';
import { getAllScenarios } from '../content/packs';
import { GameEvent } from '@kritis/shared';

// ── id universes ──────────────────────────────────────────────────────────
const storyEvents: GameEvent[] = [...allEvents, ...adventureStoryEvents, ...adventureSidequestEvents];
const eventIds = new Set(storyEvents.map((e) => e.id));
const scenarioIds = new Set(getAllScenarios().map((s) => s.id));
const contentIds = new Set([...eventIds, ...scenarioIds]);
const chapterIds = new Set(adventureChapters.map((c) => c.id));

// ── DOCUMENTED CONTENT GAP (see audit report) ─────────────────────────────
// The story campaign is authored through the chapters in FINISHED_CHAPTERS
// (currently ch1–8). The remaining chapters exist in the chapter structure but
// still reference adv_* events that were never written, so the campaign
// soft-ends after the last finished chapter (App.skipToNextDay loops to a false
// "victory"). These guards lock in the FINISHED part and TRACK the gap; they do
// not bless it — finishing or rescoping the campaign is a product decision.
const FINISHED_CHAPTERS = [
  'ch01_first_day',
  'ch02_settling_in',
  'ch03_first_crisis',
  'ch04_the_file',
  'ch05_coincidence',
  'ch06_trust_no_one',
  'ch07_escalation',
  'ch08_calm_before',
  'ch09_attack',
];
const KNOWN_WIP_CHAPTERS = adventureChapters.map((c) => c.id).filter((id) => !FINISHED_CHAPTERS.includes(id));
const KNOWN_DANGLING_TRIGGERS: string[] = []; // (evt_license_cleanup trigger removed)

// ── SIDEQUEST LAYER: rescoped to 3 authored quests ────────────────────────
// adventureSidequests is the LIVE source the engine scans (getAvailableSidequests
// in adventureEngine.ts) — NOT chapters[].sidequests, which are all empty today.
// The sidequest layer shipped 12 definitions with zero authored events. It is being
// rescoped to 3 fully-authored quests (sq_haunted_printer, sq_network_optimization,
// sq_coffee_machine) and the other 9 are cut (parked in docs/sidequest-backlog.md).
// This pin tracks the still-unauthored events of the kept 3 while Tasks 4–6 author
// them; it shrinks to [] once every kept quest's events exist. It can neither grow
// silently (a new unauthored ref slips in) nor shrink silently (someone authors
// one — then remove it from this list).
const KNOWN_DANGLING_SIDEQUEST_EVENTS: string[] = [];

const setFlags = new Set<string>(['kritis_mode']);
for (const e of storyEvents) {
  for (const c of e.choices ?? []) {
    for (const f of c.setsFlags ?? []) setFlags.add(f);
    if (c.triggersEvent) setFlags.add(`triggered_${c.triggersEvent}`);
  }
  for (const s of e.guiContext?.solutions ?? []) for (const f of s.setsFlags ?? []) setFlags.add(f);
}

describe('campaign (story mode) consistency', () => {
  it('FINISHED chapters have no dangling beat references', () => {
    const dangling: string[] = [];
    for (const ch of adventureChapters.filter((c) => FINISHED_CHAPTERS.includes(c.id))) {
      for (const beat of ch.storyBeats) {
        if (!contentIds.has(beat.eventId)) dangling.push(`${ch.id}/${beat.id} → "${beat.eventId}"`);
        if (beat.alternateEventId && !contentIds.has(beat.alternateEventId)) {
          dangling.push(`${ch.id}/${beat.id} (alt) → "${beat.alternateEventId}"`);
        }
      }
    }
    expect(dangling, `dangling beat refs in FINISHED chapters:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('tracks the unfinished-campaign gap (FINISHED_CHAPTERS only)', () => {
    // Which chapters actually have unresolved beats right now?
    const broken = adventureChapters
      .filter((ch) =>
        ch.storyBeats.some(
          (b) => !contentIds.has(b.eventId) && (!b.alternateEventId || !contentIds.has(b.alternateEventId))
        )
      )
      .map((c) => c.id);
    // If this fails: either a FINISHED chapter regressed, or someone authored a WIP chapter
    // (good — move it into FINISHED_CHAPTERS) — update the documented boundary.
    expect(broken, 'set of chapters with unresolved beats changed').toEqual(KNOWN_WIP_CHAPTERS);
  });

  it('chapter-embedded sidequest event ids resolve', () => {
    // Guards chapters[].sidequests — a real structure that is empty today, so this
    // currently iterates nothing. Kept so that IF a chapter ever embeds a sidequest,
    // its events are validated. The LIVE sidequest gap is tracked separately below.
    const dangling: string[] = [];
    for (const ch of adventureChapters) {
      for (const sq of ch.sidequests ?? []) {
        for (const ev of sq.events ?? []) {
          if (!contentIds.has(ev)) dangling.push(`${ch.id}/${sq.id} → "${ev}"`);
        }
      }
    }
    expect(dangling, `dangling sidequest events:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('tracks the dangling-sidequest-event gap (adventureSidequests, the live source)', () => {
    const dangling = new Set<string>();
    for (const sq of adventureSidequests) {
      for (const ev of sq.events ?? []) {
        if (!contentIds.has(ev)) dangling.add(ev);
      }
      // addsStoryBeat injects extra beats whose events must also exist.
      for (const add of sq.storyEffects?.addsStoryBeat ?? []) {
        if (!contentIds.has(add.beat.eventId)) dangling.add(add.beat.eventId);
      }
    }
    // If this fails: a sidequest event was authored (good — remove it from the
    // known list) or a new unauthored ref was introduced (fix or add it knowingly).
    expect([...dangling].sort()).toEqual(KNOWN_DANGLING_SIDEQUEST_EVENTS);
  });

  it('chapter completionUnlocks reference real chapter ids', () => {
    const bad: string[] = [];
    for (const ch of adventureChapters) {
      for (const u of ch.completionUnlocks ?? []) {
        if (!chapterIds.has(u)) bad.push(`${ch.id} → "${u}"`);
      }
    }
    expect(bad, `unknown chapter unlocks:\n${bad.join('\n')}`).toEqual([]);
  });

  it('choice.triggersEvent targets exist (except documented TODOs)', () => {
    const bad: string[] = [];
    for (const e of storyEvents) {
      for (const c of e.choices ?? []) {
        if (c.triggersEvent && !eventIds.has(c.triggersEvent) && !KNOWN_DANGLING_TRIGGERS.includes(c.triggersEvent)) {
          bad.push(`${e.id}/${c.id} → "${c.triggersEvent}"`);
        }
      }
    }
    expect(bad, `triggersEvent targets missing:\n${bad.join('\n')}`).toEqual([]);
  });

  it('requires.events reference real events', () => {
    const bad: string[] = [];
    for (const e of storyEvents) {
      for (const req of e.requires?.events ?? []) {
        if (!eventIds.has(req)) bad.push(`${e.id} requires "${req}"`);
      }
    }
    expect(bad, `requires.events missing:\n${bad.join('\n')}`).toEqual([]);
  });

  it('every beat branchCondition flag is set somewhere (no dead branches)', () => {
    const dead: string[] = [];
    for (const ch of adventureChapters) {
      for (const beat of ch.storyBeats) {
        if (beat.branchCondition && !setFlags.has(beat.branchCondition)) {
          dead.push(`${ch.id}/${beat.id} branchCondition "${beat.branchCondition}"`);
        }
      }
    }
    expect(dead, `branch flags never set:\n${dead.join('\n')}`).toEqual([]);
  });

  it('story-event ids are unique (no shadowed duplicate definitions)', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of adventureStoryEvents) {
      if (seen.has(e.id)) dupes.push(e.id);
      seen.add(e.id);
    }
    expect(dupes, `duplicate adventure event ids (2nd definition is dead):\n${dupes.join('\n')}`).toEqual([]);
  });
});
