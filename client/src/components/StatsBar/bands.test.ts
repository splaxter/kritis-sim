import { describe, it, expect } from 'vitest';
import {
  stressBand,
  complianceBand,
  chefBand,
  relationshipBand,
  skillTierClass,
  budgetClass,
  getDefeatWarnings,
} from './bands';
import { createInitialState } from '../../engine/gameState';

describe('stat bands', () => {
  it('stress bands scale with the mode threshold (kritis 100 vs learning 120)', () => {
    expect(stressBand(35, 100)).toBe('ok');
    expect(stressBand(60, 100)).toBe('warning');
    expect(stressBand(90, 100)).toBe('danger');
    // Same raw value reads differently when the lose threshold is higher.
    expect(stressBand(90, 120)).toBe('warning');
    expect(stressBand(110, 120)).toBe('danger');
  });

  it('compliance is danger near its lose threshold (0 default, 10 hard)', () => {
    expect(complianceBand(50, 0)).toBe('ok');
    expect(complianceBand(20, 0)).toBe('warning');
    expect(complianceBand(8, 0)).toBe('danger');
    // Hard mode loses at 10, so danger reaches up to 20 and warning up to 35.
    expect(complianceBand(15, 10)).toBe('danger');
    expect(complianceBand(30, 10)).toBe('warning');
    expect(complianceBand(50, 10)).toBe('ok');
  });

  it('chef trends to danger well before the -100 firing threshold', () => {
    expect(chefBand(40, -100)).toBe('good');
    expect(chefBand(0, -100)).toBe('ok');
    expect(chefBand(-50, -100)).toBe('warning');
    expect(chefBand(-85, -100)).toBe('danger');
  });

  it('non-chef relationships surface negativity earlier than the old [-30,30] band', () => {
    expect(relationshipBand(40)).toBe('good');
    expect(relationshipBand(10)).toBe('ok');
    expect(relationshipBand(-15)).toBe('warning'); // used to read green
    expect(relationshipBand(-60)).toBe('danger');
  });

  it('skills are a calm 3-tier with no red', () => {
    expect(skillTierClass(80)).toContain('success');
    expect(skillTierClass(50)).toContain('green');
    expect(skillTierClass(10)).toContain('muted');
    expect(skillTierClass(10)).not.toContain('danger');
  });

  it('budget reddens when overdrawn', () => {
    expect(budgetClass(-500)).toContain('danger');
    expect(budgetClass(1000)).toContain('warning');
    expect(budgetClass(15000)).toBe('');
  });

  it('defeat warnings fire only inside the danger band, most-severe first', () => {
    const base = createInitialState('SEED', 'kritis');

    expect(getDefeatWarnings(base)).toEqual([]); // healthy start

    const burning = { ...base, stress: 95 };
    expect(getDefeatWarnings(burning)[0]).toMatch(/BURNOUT/);

    const firing = { ...base, relationships: { ...base.relationships, chef: -85 } };
    expect(getDefeatWarnings(firing).some((w) => /Chef/.test(w))).toBe(true);

    const safeChef = { ...base, relationships: { ...base.relationships, chef: -50 } };
    expect(getDefeatWarnings(safeChef).some((w) => /Chef/.test(w))).toBe(false);
  });
});
