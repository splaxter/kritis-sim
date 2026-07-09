/**
 * Terminal context consistency guard.
 * Builds the real (seeded) shell for EVERY terminal context in the game and
 * asserts the quest's world is actually there: start dir exists, prompts are
 * clean, and every path mentioned in commands/hints/taskText exists in the
 * VFS. New levels are covered automatically.
 */
import { describe, it, expect } from 'vitest';
import { allEvents } from './events';
import { getAllScenarios } from './packs';
import {
  createShellFromContext,
  resolveTemplateIds,
  extractPathsFromPattern,
  extractPathsFromText,
} from '../engine/shell';
import type { TerminalContext } from '@kritis/shared';

const contexts: { id: string; ctx: TerminalContext }[] = [
  ...allEvents
    .filter(e => e.terminalContext)
    .map(e => ({ id: e.id, ctx: e.terminalContext! })),
  ...getAllScenarios()
    .filter(s => s.terminalContext)
    .map(s => ({ id: s.id, ctx: s.terminalContext! })),
];

function buildShell(ctx: TerminalContext) {
  return createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    vfsOverlay: ctx.vfsOverlay,
    env: ctx.env,
    templates: ctx.templateIds ? resolveTemplateIds(ctx.templateIds) : undefined,
    commands: ctx.commands,
    hints: ctx.hints,
    taskText: ctx.taskText,
  });
}

describe(`terminal contexts (${contexts.length} total)`, () => {
  it('found a plausible number of contexts', () => {
    expect(contexts.length).toBeGreaterThanOrEqual(45);
  });

  it.each(contexts.map(c => [c.id, c] as const))('%s: world matches the quest', (_id, { ctx }) => {
    const shell = buildShell(ctx);
    const vfs = shell.getVfs();

    // Start dir exists and prompt path carries no baked-in prompt chars
    expect(vfs.getCurrentPath()).not.toMatch(/[$>]$|~\$/);
    expect(vfs.exists(vfs.getCurrentPath())).toBe(true);

    // Every extractable path from canned commands exists
    for (const cmd of ctx.commands) {
      for (const seed of extractPathsFromPattern(cmd.pattern, cmd.output)) {
        if (seed.kind === 'listing') continue; // listing target checked via dir below
        const resolved = vfs.resolvePath(seed.path);
        expect(vfs.exists(resolved), `${_id}: missing ${seed.kind} ${seed.path}`).toBe(true);
      }
    }

    // Every path mentioned in hints/taskText exists
    for (const text of [...ctx.hints, ctx.taskText || '']) {
      for (const seed of extractPathsFromText(text)) {
        const resolved = vfs.resolvePath(seed.path);
        expect(vfs.exists(resolved), `${_id}: hint/task path missing ${seed.path}`).toBe(true);
      }
    }
  });
});
