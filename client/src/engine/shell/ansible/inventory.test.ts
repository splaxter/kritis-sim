/**
 * INI inventory subset: [group] headers, one hostname per line, comments,
 * implicit deduped 'all' group; resolveHosts over group | all | hostname.
 */
import { describe, it, expect } from 'vitest';
import { parseInventory, resolveHosts } from './inventory';

const INVENTORY = `# Stadtwerke fleet
[web]
web01
web02  ; trailing comment

[db]
db01
web01

; full-line comment
[monitoring]
mon01
`;

describe('parseInventory', () => {
  it('maps group headers to their hosts', () => {
    const inv = parseInventory(INVENTORY);
    expect(inv.get('web')).toEqual(['web01', 'web02']);
    expect(inv.get('db')).toEqual(['db01', 'web01']);
    expect(inv.get('monitoring')).toEqual(['mon01']);
  });

  it('builds an implicit deduped all group in first-seen order', () => {
    const inv = parseInventory(INVENTORY);
    expect(inv.get('all')).toEqual(['web01', 'web02', 'db01', 'mon01']);
  });

  it('hosts before any group header still land in all', () => {
    const inv = parseInventory('lonely01\n[web]\nweb01\n');
    expect(inv.get('all')).toEqual(['lonely01', 'web01']);
    expect(inv.get('web')).toEqual(['web01']);
  });

  it('empty or comment-only input yields an empty all group', () => {
    expect(parseInventory('').get('all')).toEqual([]);
    expect(parseInventory('# nur Kommentare\n; hier auch\n').get('all')).toEqual([]);
  });
});

describe('resolveHosts', () => {
  const inv = parseInventory(INVENTORY);

  it('resolves a group name to its hosts', () => {
    expect(resolveHosts(inv, 'web')).toEqual(['web01', 'web02']);
  });

  it('resolves all to every host, deduped', () => {
    expect(resolveHosts(inv, 'all')).toEqual(['web01', 'web02', 'db01', 'mon01']);
  });

  it('resolves a single hostname present anywhere in the inventory', () => {
    expect(resolveHosts(inv, 'mon01')).toEqual(['mon01']);
    expect(resolveHosts(inv, 'web02')).toEqual(['web02']);
  });

  it('unknown patterns resolve to an empty array', () => {
    expect(resolveHosts(inv, 'nixda')).toEqual([]);
    expect(resolveHosts(inv, '')).toEqual([]);
  });
});
