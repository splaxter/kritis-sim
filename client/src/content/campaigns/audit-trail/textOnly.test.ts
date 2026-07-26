import { describe, it, expect } from 'vitest';
import { auditTrailStoryEvents } from './events';
import { getCampaign } from '../index';

/**
 * AUDIT TRAIL V1 is deliberately text-only: no chapter art / StoryBackground
 * images, so no probation noir artwork can leak in. App's story backdrop is
 * driven by `event.image` (setBackgroundImage(event.image || null)), so the
 * guarantee is simply that no audit-trail event declares an image.
 */
describe('AUDIT TRAIL is text-only (no art/cinematics)', () => {
  it('no story event declares an image', () => {
    const withArt = auditTrailStoryEvents.filter((e) => e.image);
    expect(withArt.map((e) => e.id)).toEqual([]);
  });

  it('the campaign reuses no probation art path (distinct content arrays)', () => {
    const at = getCampaign('audit-trail');
    const prob = getCampaign('probation');
    expect(at.storyEvents).not.toBe(prob.storyEvents);
    expect(at.chapters).not.toBe(prob.chapters);
    expect(at.endingTexts).not.toBe(prob.endingTexts);
  });
});
