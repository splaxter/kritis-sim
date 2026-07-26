import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { auditTrailStoryEvents } from './events';
import { auditTrailChapters } from './chapters';

const byId = new Map(auditTrailStoryEvents.map((e) => [e.id, e]));
const l1 = byId.get('at_l1_first_day')!;
const l2 = byId.get('at_l2_inventory')!;
const wiki = byId.get('at_wiki_password')!;

// Full session harness (real ShellEngine + real VFS from the level's context),
// so these tests play the level the way the game does — not just data checks.
function makeSession(ctx: TerminalContext, gameMode: GameModeId = 'story') {
  const shell = createShellFromContext({
    type: ctx.type,
    hostname: ctx.hostname,
    username: ctx.username,
    currentPath: ctx.currentPath,
    vfsOverlay: ctx.vfsOverlay,
    commands: ctx.commands,
    hints: ctx.hints,
    taskText: ctx.taskText,
    hosts: ctx.hosts,
    mailboxes: ctx.mailboxes,
  });
  const onSolved = vi.fn();
  const onFlagsSet = vi.fn();
  const session = new TerminalSession({ shell, context: ctx, gameMode, onSolved, onFlagsSet });
  return { session, shell, onSolved, onFlagsSet };
}

function run(session: TerminalSession, cmd: string) {
  for (const ch of cmd) session.handleData(ch);
  return session.handleData('\r');
}

describe('AUDIT TRAIL Act 1 — chapter beats', () => {
  it('ch01 plays welcome → team intro → L1 → L2 → Wiki-Passwort, all mandatory', () => {
    const ch01 = auditTrailChapters.find((c) => c.id === 'at_ch01_onboarding')!;
    expect(ch01.storyBeats.map((b) => b.eventId)).toEqual([
      'at_welcome',
      'at_team_intro',
      'at_l1_first_day',
      'at_l2_inventory',
      'at_wiki_password',
    ]);
    expect(ch01.storyBeats.every((b) => !b.isOptional)).toBe(true);
  });

  it('L1 and L2 are pure terminal beats (every choice opens the terminal)', () => {
    for (const level of [l1, l2]) {
      expect(level.terminalContext?.type).toBe('linux');
      expect(level.choices.every((c) => c.terminalCommand)).toBe(true);
    }
    // The dialog beat is NOT a terminal event.
    expect(wiki.terminalContext).toBeUndefined();
  });
});

describe('L1 „Der erste Arbeitstag" — core find on any read path', () => {
  const readCmd = l1.terminalContext!.commands.find((c) =>
    c.pattern.includes('notizen_m')
  )!;
  const re = new RegExp(readCmd.patternRegex!);

  it.each([
    'cat notizen_m.txt',
    'cat /srv/ticket-exports/notizen_m.txt',
    'cat ticket-exports/notizen_m.txt',
    'cat ./notizen_m.txt',
    'less /srv/ticket-exports/notizen_m.txt',
    'more notizen_m.txt',
    'head -n 20 notizen_m.txt',
    'tail /srv/ticket-exports/notizen_m.txt',
    'nl notizen_m.txt',
    'tac notizen_m.txt',
  ])('completes on: %s', (cmd) => {
    expect(re.test(cmd)).toBe(true);
  });

  it.each([
    'cat notiz-von-jens.txt', // a DIFFERENT file must not count as the core find
    'cat tickets_2026-06.csv',
    'cat notizen_m.txt extra.txt', // trailing junk → anchored regex rejects
    'rm notizen_m.txt',
  ])('does NOT complete on: %s', (cmd) => {
    expect(re.test(cmd)).toBe(false);
  });

  it('the canned output mirrors the seeded VFS file (no divergent bytes)', () => {
    const vfsFile = l1.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('notizen_m.txt')
    )!;
    expect(readCmd.output.startsWith(vfsFile.content)).toBe(true);
  });

  it('plays through: find locates the notes, reading them solves the level', () => {
    const { session, onSolved } = makeSession(l1.terminalContext!);

    const findEffects = run(session, 'find /srv -name "*.txt"');
    const findOut = findEffects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(findOut).toContain('/srv/ticket-exports/notizen_m.txt');

    run(session, 'cat /srv/ticket-exports/notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(true);
    // Solve confirmation is armed but only delivered on the player's Enter.
    session.handleData('\r');
    expect(onSolved).toHaveBeenCalled();
  });

  it('sets no domain flags — L1 is orientation only', () => {
    expect(l1.choices.flatMap((c) => c.setsFlags ?? [])).toEqual([]);
    expect(l1.terminalContext!.commands.flatMap((c) => c.setsFlags ?? [])).toEqual([]);
  });
});

describe('L2 „Die Inventur" — stateGoal on the written inventory', () => {
  it('wins by state (file with EXCH01 AND BASTION-01), not by canned commands', () => {
    const sol = l2.terminalContext!.solutions[0];
    expect(sol.commands).toEqual([]);
    expect(sol.stateGoals).toEqual([
      { file: '/home/timo/inventar.md', matches: 'EXCH01' },
      { file: '/home/timo/inventar.md', matches: 'BASTION-01' },
    ]);
  });

  it('plays through: two echo lines solve the level', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'echo "EXCH01 - Mailserver (Exchange 2019)" >> /home/timo/inventar.md');
    expect(session.getSnapshot().solved).toBe(false); // BASTION-01 still missing
    run(session, 'echo "BASTION-01 - PAM, seit 14 Monaten unkonfiguriert" >> /home/timo/inventar.md');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('an inventory mentioning only ONE core system does not win', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'echo "BASTION-01 steht im Rack" > /home/timo/inventar.md');
    run(session, 'ls');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('the wiki export seeds the half-ironic administrator password (the L2 find)', () => {
    const konten = l2.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('konten.md')
    )!;
    expect(konten.content).toContain('administrator');
    expect(konten.content).toContain('Passwort');
  });

  it('solving sets onboarding_documented via the terminal choice', () => {
    expect(l2.choices[0].setsFlags).toEqual(['onboarding_documented']);
  });
});

describe('Wiki-Passwort dialog — the shared_account_documented decision', () => {
  it('offers at least two ungated options (choice-design rule)', () => {
    const ungated = wiki.choices.filter((c) => !c.requires && !c.hidden);
    expect(ungated.length).toBeGreaterThanOrEqual(2);
  });

  it('documenting the find sets shared_account_documented; the other paths set nothing', () => {
    const documenting = wiki.choices.find((c) => c.id === 'at_wiki_password_document')!;
    expect(documenting.setsFlags).toEqual(['shared_account_documented']);
    for (const c of wiki.choices) {
      if (c.id !== 'at_wiki_password_document') expect(c.setsFlags).toBeUndefined();
    }
  });

  it('each Act-1 domain flag has exactly ONE source across the campaign', () => {
    const sources = new Map<string, string[]>();
    for (const e of auditTrailStoryEvents) {
      for (const c of e.choices) {
        for (const f of c.setsFlags ?? []) {
          sources.set(f, [...(sources.get(f) ?? []), `${e.id}/${c.id}`]);
        }
      }
      for (const cmd of e.terminalContext?.commands ?? []) {
        for (const f of cmd.setsFlags ?? []) {
          sources.set(f, [...(sources.get(f) ?? []), `${e.id}/terminal`]);
        }
      }
    }
    expect(sources.get('onboarding_documented')).toEqual(['at_l2_inventory/start']);
    expect(sources.get('shared_account_documented')).toEqual([
      'at_wiki_password/at_wiki_password_document',
    ]);
  });
});

describe('hint escalation (hints[0] orients, exact syntax last)', () => {
  it('L1: the first hint never contains the solution command', () => {
    const hints = l1.terminalContext!.hints;
    expect(hints[0]).not.toContain('find /srv -name');
    expect(hints[0]).not.toContain('cat /srv');
    expect(hints[hints.length - 1]).toContain('cat /srv/ticket-exports/notizen_m.txt');
  });

  it('L2: the first hint never contains the echo syntax', () => {
    const hints = l2.terminalContext!.hints;
    expect(hints[0]).not.toContain('echo');
    expect(hints[hints.length - 1]).toContain('>> /home/timo/inventar.md');
  });
});
