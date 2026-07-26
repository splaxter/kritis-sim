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

describe('L1 „Der erste Arbeitstag" — core find through the REAL shell', () => {
  it('wins by the SEMANTIC fileRead goal (no canned commands, no command-line regex)', () => {
    expect(l1.terminalContext!.commands).toEqual([]);
    const sol = l1.terminalContext!.solutions[0];
    expect(sol.commands).toEqual([]);
    expect(sol.stateGoals).toEqual([{ fileRead: '/srv/ticket-exports/notizen_m.txt' }]);
  });

  it('plays through: find locates the notes, an absolute-path read solves the level', () => {
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

  it('REAL path semantics: a relative read from the wrong directory does NOT solve', () => {
    const { session } = makeSession(l1.terminalContext!);
    // From /home/timo the file does not exist relatively — the shell errors,
    // the goal (outcome: succeeded) stays unmet.
    run(session, 'cat notizen_m.txt');
    run(session, 'cat ./notizen_m.txt');
    run(session, 'cat ticket-exports/notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a relative read after a matching cd DOES solve (cwd honoured)', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'cd /srv/ticket-exports');
    run(session, 'cat notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('reading a DIFFERENT file (or deleting the notes) does not count as the core find', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'cat notiz-von-jens.txt'); // valid read, wrong file
    run(session, 'cat /srv/ticket-exports/2026/tickets_2026-06.csv');
    run(session, 'rm /srv/ticket-exports/notizen_m.txt'); // touches the file, no read
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('the chained || decoy does NOT solve (only executed stages count)', () => {
    const { session } = makeSession(l1.terminalContext!);
    // Reviewer spoof: the successful cat short-circuits the ||, so the echo
    // carrying the target filename never executes — and must not match.
    run(session, 'cat /home/timo/notiz-von-jens.txt || echo notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('the PIPELINE decoy does NOT solve (failing cat | succeeding echo)', () => {
    const { session } = makeSession(l1.terminalContext!);
    // Reviewer spoof round 2: the pipeline exits 0 via echo, but the cat
    // stage failed — per-pipe-command stages keep the goal unmet.
    run(session, 'cat /no/notizen_m.txt | echo ok');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a redirect naming the target is not a read (`cat andere.txt > notizen_m.txt`)', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'cat /home/timo/notiz-von-jens.txt > notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a real read WITHIN a pipeline still solves', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'cat /srv/ticket-exports/notizen_m.txt | head -n 3');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('grep with the target name as search PATTERN does NOT solve (reviewer repro)', () => {
    const { session } = makeSession(l1.terminalContext!);
    // Reads ONLY Jens' note; 'notizen_m.txt' is grep's -v pattern, not a file.
    run(session, 'grep -v notizen_m.txt /home/timo/notiz-von-jens.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('grep that actually READS the notes solves (role-independent semantics)', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'grep Wiki /srv/ticket-exports/notizen_m.txt');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('sets no domain flags — L1 is orientation only', () => {
    expect(l1.choices.flatMap((c) => c.setsFlags ?? [])).toEqual([]);
    expect(l1.terminalContext!.commands.flatMap((c) => c.setsFlags ?? [])).toEqual([]);
  });
});

describe('L2 „Die Inventur" — inspection + written inventory', () => {
  // The honest full path: check the asset export (metadata AND content), read
  // the wiki accounts page, then write the inventory.
  function inspectSources(session: TerminalSession) {
    run(session, 'stat /srv/assets/assets_2026-07.csv');
    run(session, 'cat /srv/assets/assets_2026-07.csv');
    run(session, 'cat /srv/wiki-export/konten.md');
  }
  function writeInventory(session: TerminalSession) {
    run(session, 'echo "EXCH01 - Mailserver (Exchange 2019)" >> /home/timo/inventar.md');
    run(session, 'echo "BASTION-01 - PAM, seit 14 Monaten unkonfiguriert" >> /home/timo/inventar.md');
  }

  it('requires file content AND both semantic reads (asset export + konten.md)', () => {
    const sol = l2.terminalContext!.solutions[0];
    expect(sol.commands).toEqual([]);
    expect(sol.stateGoals).toEqual([
      { file: '/home/timo/inventar.md', matches: 'EXCH01' },
      { file: '/home/timo/inventar.md', matches: 'BASTION-01' },
      { fileRead: '/srv/assets/assets_2026-07.csv' },
      { fileRead: '/srv/wiki-export/konten.md' },
    ]);
  });

  it('plays through the honest path: inspect, read the wiki, write the inventory', () => {
    const { session } = makeSession(l2.terminalContext!);
    inspectSources(session);
    run(session, 'echo "EXCH01 - Mailserver (Exchange 2019)" >> /home/timo/inventar.md');
    expect(session.getSnapshot().solved).toBe(false); // BASTION-01 still missing
    run(session, 'echo "BASTION-01 - PAM, seit 14 Monaten unkonfiguriert" >> /home/timo/inventar.md');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('the echo-only shortcut does NOT win (reviewer scenario: no find/stat/wiki)', () => {
    const { session } = makeSession(l2.terminalContext!);
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('without reading konten.md the level stays unsolved (story claim stays true)', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'stat /srv/assets/assets_2026-07.csv');
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('without inspecting the asset export the level stays unsolved', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'cat /srv/wiki-export/konten.md');
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('stat alone is metadata, not the read — the CSV content must be seen', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'stat /srv/assets/assets_2026-07.csv');
    run(session, 'cat /srv/wiki-export/konten.md');
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('grep with a source name as PATTERN is not an inspection (reviewer repro)', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'grep -v konten.md /srv/assets/assets_2026-07.csv'); // reads only the CSV
    run(session, 'grep -v assets_2026-07.csv /srv/wiki-export/bastion.md'); // reads neither source
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('relative inspections after cd count too (real cwd semantics, no exact-string match)', () => {
    const { session } = makeSession(l2.terminalContext!);
    run(session, 'cd /srv/wiki-export');
    run(session, 'cat konten.md');
    run(session, 'cd /srv/assets');
    run(session, 'cat assets_2026-07.csv'); // reading the export counts as inspecting it
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('an inventory mentioning only ONE core system does not win', () => {
    const { session } = makeSession(l2.terminalContext!);
    inspectSources(session);
    run(session, 'echo "BASTION-01 steht im Rack" > /home/timo/inventar.md');
    run(session, 'ls');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('chained decoys naming the sources do NOT count as inspections', () => {
    const { session } = makeSession(l2.terminalContext!);
    // Neither decoy stage executes (|| short-circuits after the successful ls),
    // so the inspection goals stay unmet even though the outer strings contain
    // both target files.
    run(session, 'ls || stat /srv/assets/assets_2026-07.csv');
    run(session, 'ls || cat /srv/wiki-export/konten.md');
    writeInventory(session);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('pipeline decoys naming the sources do NOT count as inspections', () => {
    const { session } = makeSession(l2.terminalContext!);
    // Failing reads piped into a succeeding echo: pipeline exit 0, but the
    // per-stage records keep both inspection goals unmet.
    run(session, 'stat /no/assets_2026-07.csv | echo ok');
    run(session, 'cat /no/konten.md | echo ok');
    writeInventory(session);
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
