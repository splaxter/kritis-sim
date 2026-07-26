import { describe, it, expect } from 'vitest';
import { getCampaign, listCampaigns, getRunLabel } from './index';

describe('campaign picker registry', () => {
  it('lists every registered campaign (derived from the registry, not a parallel list)', () => {
    const listed = listCampaigns().map((c) => c.id);
    // Every id reachable through getCampaign must be offered in the menu — the
    // guard against a new campaign being registered but never selectable.
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
