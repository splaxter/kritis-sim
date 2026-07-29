import { describe, it, expect } from 'vitest';
import {
  getCampaign,
  listCampaigns,
  listVisibleCampaigns,
  findCampaignByUnlockCode,
  getRunLabel,
} from './index';

describe('campaign picker registry', () => {
  it('lists every registered campaign (derived from the registry, not a parallel list)', () => {
    const listed = listCampaigns().map((c) => c.id);
    // Every registered id must resolve through getCampaign — the guard against a
    // campaign that exists in the roster but can never be loaded.
    expect(listed).toEqual(['probation', 'audit-trail']);
    for (const id of listed) {
      expect(getCampaign(id).id, `${id} must resolve to itself`).toBe(id);
    }
  });

  it('every campaign carries its own non-empty menu copy', () => {
    for (const c of listCampaigns()) {
      expect(c.title.trim().length, `${c.id} title`).toBeGreaterThan(0);
      expect(c.menu.eyebrow.trim().length, `${c.id} eyebrow`).toBeGreaterThan(0);
      expect(c.menu.description.trim().length, `${c.id} description`).toBeGreaterThan(0);
      expect(c.menu.meta.trim().length, `${c.id} meta`).toBeGreaterThan(0);
      // A badge without styling would render as unstyled text.
      if (c.menu.badge) expect(c.menu.badgeClass, `${c.id} badge needs a class`).toBeTruthy();
    }
  });

  it('hides AUDIT TRAIL from the picker until it is unlocked', () => {
    // The normal player sees exactly one campaign; the secret one is absent from
    // the list entirely (not disabled, not greyed out — invisible).
    expect(listVisibleCampaigns().map((c) => c.id)).toEqual(['probation']);
    expect(listVisibleCampaigns([]).map((c) => c.id)).toEqual(['probation']);
    // An unrelated unlock id must not reveal it either.
    expect(listVisibleCampaigns(['something-else']).map((c) => c.id)).toEqual(['probation']);
    // Unlocked, it slots back into its registry position.
    expect(listVisibleCampaigns(['audit-trail']).map((c) => c.id)).toEqual([
      'probation',
      'audit-trail',
    ]);
  });

  it('every hidden campaign declares an unlock code, and no visible one does', () => {
    for (const c of listCampaigns()) {
      if (c.hidden) {
        // Without a code a hidden campaign would be unreachable through the menu.
        expect(c.unlockCode?.trim(), `${c.id} needs an unlockCode`).toBeTruthy();
      } else {
        expect(c.unlockCode, `${c.id} is visible and must not carry a code`).toBeUndefined();
      }
    }
  });

  it('the unlock code resolves only for the hidden campaign, case-insensitively', () => {
    expect(findCampaignByUnlockCode('trick17')?.id).toBe('audit-trail');
    expect(findCampaignByUnlockCode('TrIcK17')?.id).toBe('audit-trail');
    // Matched on the END of the buffer: stray keys before the code are tolerated.
    expect(findCampaignByUnlockCode('xyzqtrick17')?.id).toBe('audit-trail');
    // …but not after it, and not for a partial or empty buffer.
    expect(findCampaignByUnlockCode('trick17x')).toBeNull();
    expect(findCampaignByUnlockCode('trick1')).toBeNull();
    expect(findCampaignByUnlockCode('')).toBeNull();
    // A campaign title/id is not a code — guessing the name must not work.
    expect(findCampaignByUnlockCode('audit-trail')).toBeNull();
    expect(findCampaignByUnlockCode('probation')).toBeNull();
  });

  it('hiding is a menu concern only — a hidden campaign still loads by id', () => {
    // An existing save (or a resume) must never depend on the unlock state.
    expect(getCampaign('audit-trail').id).toBe('audit-trail');
    expect(getCampaign('audit-trail').chapters.length).toBeGreaterThan(0);
  });

  it('campaign titles and descriptions are distinct (no copy-paste leftovers)', () => {
    const titles = listCampaigns().map((c) => c.title);
    const descriptions = listCampaigns().map((c) => c.menu.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe('run label', () => {
  it('names a story run by its CAMPAIGN, not by the shared story mode', () => {
    expect(getRunLabel('story', 'audit-trail').name).toBe('Story: Audit Trail');
    expect(getRunLabel('story', 'audit-trail').name).not.toContain('Probezeit');
  });

  it('probation is unchanged — byte-identical to the story mode name', () => {
    // The label refactor must not alter a single probation pixel.
    expect(getRunLabel('story', 'probation').name).toBe('Story: Die Probezeit');
    expect(getRunLabel('story', 'probation').icon).toBe('📖');
  });

  it('non-story modes keep their mode name (no campaign leaks in)', () => {
    expect(getRunLabel('beginner').name).not.toContain('Story');
    expect(getRunLabel('kritis').name).not.toContain('Probezeit');
    // A stale campaignId on a non-story run must not rename it either.
    expect(getRunLabel('learning', 'audit-trail').name).toBe(getRunLabel('learning').name);
  });

  it('falls back to the mode name when a story run has no campaign yet', () => {
    expect(getRunLabel('story').name).toBe('Story: Die Probezeit');
  });
});
