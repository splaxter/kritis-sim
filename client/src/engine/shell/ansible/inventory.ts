/**
 * Ansible INI inventory subset: [group] headers, one hostname per line,
 * '#'/';' comments, blank lines. Every host also lands in the implicit
 * 'all' group (deduped, first-seen order).
 */

export function parseInventory(text: string): Map<string, string[]> {
  const inventory = new Map<string, string[]>();
  const all: string[] = [];
  let currentGroup: string | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/[#;].*$/, '').trim();
    if (!line) continue;

    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      currentGroup = header[1];
      if (!inventory.has(currentGroup)) inventory.set(currentGroup, []);
      continue;
    }

    if (currentGroup) {
      inventory.get(currentGroup)!.push(line);
    }
    if (!all.includes(line)) all.push(line);
  }

  inventory.set('all', all);
  return inventory;
}

/** Group name | 'all' | single known hostname; anything else → []. */
export function resolveHosts(inventory: Map<string, string[]>, pattern: string): string[] {
  const group = inventory.get(pattern);
  if (group) return [...group];
  const all = inventory.get('all') ?? [];
  return all.includes(pattern) ? [pattern] : [];
}
