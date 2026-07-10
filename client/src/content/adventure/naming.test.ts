/**
 * Naming guard: the story character formerly called "Thomas" was renamed
 * (Jens/Henry/Bjorg, see git history) — display text was updated but ids and
 * flags lagged behind. This test pins the completed rename: no adventure
 * identifier (event id, choice id, flag, beat ref, character id, sidequest
 * ref) may reference the dead name.
 *
 * Save-compat note (verified 2026-07-10): renaming these identifiers needs no
 * save migration. thomas_* flags have zero readers (write-only), story
 * progress resumes via storyState.currentBeatIndex (adventureEngine.ts:76)
 * with event ids re-resolved from content, and completedEvents/decisions are
 * never looked up by adventure id. AUTOSAVE_VERSION stays at 1 on purpose.
 *
 * NOT in scope: 'TELEKOM-THOMAS' (Thomas Kellermann, telekom pack) and
 * 'Thomas Bergmann' (kritis-infra pack) are different, legitimate characters.
 */
import { describe, it, expect } from 'vitest';
import { adventureStoryEvents } from './story-events';
import { adventureSidequestEvents } from './sidequest-events';
import { adventureChapters } from './chapters';
import { adventureSidequests } from './sidequests';
import { STORY_CHARACTERS } from './index';

function collectIdentifiers(): string[] {
  const ids: string[] = [];
  for (const e of [...adventureStoryEvents, ...adventureSidequestEvents]) {
    ids.push(`event:${e.id}`);
    for (const f of e.requires?.flags ?? []) ids.push(`event:${e.id} requires.flag:${f}`);
    for (const req of e.requires?.events ?? []) ids.push(`event:${e.id} requires.event:${req}`);
    for (const c of e.choices) {
      ids.push(`event:${e.id} choice:${c.id}`);
      for (const f of c.setsFlags ?? []) ids.push(`event:${e.id} choice:${c.id} setsFlag:${f}`);
      if (c.triggersEvent) ids.push(`event:${e.id} choice:${c.id} triggers:${c.triggersEvent}`);
    }
  }
  for (const ch of adventureChapters) {
    ids.push(`chapter:${ch.id}`);
    for (const b of ch.storyBeats) {
      ids.push(`chapter:${ch.id} beat:${b.id} event:${b.eventId}`);
      if (b.branchCondition) ids.push(`chapter:${ch.id} beat:${b.id} branch:${b.branchCondition}`);
      if (b.alternateEventId) ids.push(`chapter:${ch.id} beat:${b.id} altEvent:${b.alternateEventId}`);
    }
    for (const f of ch.unlockConditions.requiredFlags ?? []) ids.push(`chapter:${ch.id} requiredFlag:${f}`);
  }
  for (const sq of adventureSidequests) {
    ids.push(`sidequest:${sq.id}`);
    for (const ev of sq.events) ids.push(`sidequest:${sq.id} event:${ev}`);
    for (const f of sq.triggerCondition.flags ?? []) ids.push(`sidequest:${sq.id} trigger.flag:${f}`);
    for (const f of sq.rewards.flags ?? []) ids.push(`sidequest:${sq.id} reward.flag:${f}`);
    for (const u of sq.storyEffects?.unlocksDialogue ?? []) {
      ids.push(`sidequest:${sq.id} unlocks:${u.eventId}/${u.optionId}`);
    }
  }
  for (const c of STORY_CHARACTERS) ids.push(`character:${c.id}`);
  return ids;
}

describe('Adventure identifier naming', () => {
  it('no id or flag references the pre-rename character name "thomas"', () => {
    const offenders = collectIdentifiers().filter((s) => /thomas/i.test(s));
    expect(
      offenders,
      'Thomas was renamed (Jens/Henry/Bjorg). Rename these identifiers too:\n' +
        offenders.join('\n')
    ).toEqual([]);
  });
});
