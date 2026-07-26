import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { auditTrailStoryEvents } from './events';
import { auditTrailChapters } from './chapters';

const byId = new Map(auditTrailStoryEvents.map((e) => [e.id, e]));
const bjorg = byId.get('at_bjorg_dialogue')!;
const l7 = byId.get('at_l7_delivery_note')!;
const mail = byId.get('at_handover_mail')!;
const l8 = byId.get('at_l8_bastion_live')!;

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

describe('AUDIT TRAIL Act 3 — chapter beats', () => {
  it('ch04 plays Bjorg → L7 → Mail → L8★, with ONLY L8 optional', () => {
    const ch04 = auditTrailChapters.find((c) => c.id === 'at_ch04_blockade')!;
    expect(ch04.storyBeats.map((b) => b.eventId)).toEqual([
      'at_bjorg_dialogue', 'at_l7_delivery_note', 'at_handover_mail', 'at_l8_bastion_live',
    ]);
    expect(ch04.storyBeats.map((b) => !!b.isOptional)).toEqual([false, false, false, true]);
    for (const b of ch04.storyBeats) {
      expect(byId.has(b.eventId), `${b.eventId} must be authored`).toBe(true);
    }
  });

  it('hands-on beats are soft-gated (a narrative fallback exists beside the level choice)', () => {
    // L7 (GUI) and the optional L8 must never hard-block the campaign.
    expect(l7.choices.filter((c) => c.guiCommand)).toHaveLength(1);
    expect(l7.choices.some((c) => !c.guiCommand && !c.terminalCommand)).toBe(true);
    expect(l8.choices.filter((c) => c.terminalCommand)).toHaveLength(1);
    expect(l8.choices.some((c) => !c.guiCommand && !c.terminalCommand)).toBe(true);
  });
});

describe('Bjorg dialogue — the D5 decision', () => {
  it('offers three ungated options', () => {
    expect(bjorg.choices.filter((c) => !c.requires && !c.hidden)).toHaveLength(3);
  });

  it('preserving sets ONLY the warning flag; snapping sets ONLY provoked; deleting sets none', () => {
    const preserve = bjorg.choices.find((c) => c.id === 'at_bjorg_preserve')!;
    const snap = bjorg.choices.find((c) => c.id === 'at_bjorg_snap')!;
    const del = bjorg.choices.find((c) => c.id === 'at_bjorg_delete')!;
    expect(preserve.setsFlags).toEqual(['bjorg_warning_preserved']);
    expect(snap.setsFlags).toEqual(['bjorg_provoked']);
    expect(del.setsFlags).toBeUndefined();
  });
});

describe('L7 „Der Lieferschein" — Explorer file browser', () => {
  const explorer = l7.guiContext!.state.explorer!;

  it('is a files-mode Explorer level on FILE01', () => {
    expect(l7.guiContext!.app).toBe('explorer');
    expect(explorer.mode).toBe('files');
    expect(l7.guiContext!.hostname).toBe('FILE01');
  });

  it('wins ONLY by opening the Lieferschein, which sets bastion_delivery_found', () => {
    expect(l7.guiContext!.solutions).toHaveLength(1);
    const sol = l7.guiContext!.solutions[0];
    expect(sol.interactions).toEqual(['open:lieferschein']);
    expect(sol.setsFlags).toEqual(['bastion_delivery_found']);
  });

  it('the paper trail tells the story: Angebot optional → Bestellung mitbestellt → Lieferschein ENTHALTEN', () => {
    const preview = (id: string) => explorer.items!.find((i) => i.id === id)!.preview!;
    expect(preview('angebot')).toContain('OPTIONAL');
    expect(preview('bestellung')).toContain('MITBESTELLT');
    expect(preview('lieferschein')).toContain('ENTHALTEN');
    expect(preview('lieferschein')).toContain('nicht abgerufen'); // the Einweisung
    expect(preview('lieferschein')).toContain('Unterschrift: B.');
  });

  it('the Lieferschein sits INSIDE the BASTION folder (a real find, not root clutter)', () => {
    const doc = explorer.items!.find((i) => i.id === 'lieferschein')!;
    const folder = explorer.items!.find((i) => i.id === doc.parent)!;
    expect(folder.kind).toBe('folder');
    expect(folder.name).toContain('BASTION');
  });
});

describe('Schnittstellen-Mail — the D3 handover decision', () => {
  it('composes a NEUTRAL draft to the vendor (no static CC; the CC is the choice)', () => {
    expect(mail.mailCompose?.to).toContain('pam-hersteller');
    expect(mail.mailCompose?.cc).toBeUndefined();
  });

  it('only the CC-Bert send sets handover_mail_sent; ≥2 ungated options', () => {
    const cc = mail.choices.find((c) => c.id === 'at_handover_cc_bert')!;
    expect(cc.setsFlags).toEqual(['handover_mail_sent']);
    for (const c of mail.choices) {
      if (c.id !== 'at_handover_cc_bert') expect(c.setsFlags).toBeUndefined();
    }
    expect(mail.choices.filter((c) => !c.requires && !c.hidden).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Act-3 flags each have exactly ONE source across the campaign', () => {
  it('single-source map', () => {
    const sources = new Map<string, string[]>();
    for (const e of auditTrailStoryEvents) {
      for (const c of e.choices) {
        for (const f of c.setsFlags ?? []) {
          sources.set(f, [...(sources.get(f) ?? []), `${e.id}/${c.id}`]);
        }
      }
      for (const s of e.guiContext?.solutions ?? []) {
        for (const f of s.setsFlags ?? []) {
          sources.set(f, [...(sources.get(f) ?? []), `${e.id}/gui`]);
        }
      }
    }
    expect(sources.get('bjorg_warning_preserved')).toEqual(['at_bjorg_dialogue/at_bjorg_preserve']);
    expect(sources.get('bjorg_provoked')).toEqual(['at_bjorg_dialogue/at_bjorg_snap']);
    expect(sources.get('bastion_delivery_found')).toEqual(['at_l7_delivery_note/gui']);
    expect(sources.get('handover_mail_sent')).toEqual(['at_handover_mail/at_handover_cc_bert']);
    expect(sources.get('bastion_live')).toEqual(['at_l8_bastion_live/at_l8_start']);
  });
});

describe('L8 ★ „BASTION-01 in Betrieb"', () => {
  function loginWaage(session: TerminalSession) {
    run(session, 'ssh admin@waage01');
    run(session, 'wiegeschein-42'); // password continuation
  }
  // Order matters: add the bastion door BEFORE removing the blanket rule, or
  // `default deny` cuts the player's own direct session mid-change.
  function hardenWaage(session: TerminalSession) {
    run(session, 'sudo ufw allow from 10.0.30.10 to any port 22');
    run(session, 'sudo ufw default deny incoming');
    run(session, 'sudo ufw enable');
    run(session, 'sudo ufw delete allow 22');
  }

  it('plays through: harden waage01 over ssh, then the bastion path still works — solved', () => {
    const { session, shell } = makeSession(l8.terminalContext!);
    loginWaage(session);
    hardenWaage(session);
    expect(session.getSnapshot().solved).toBe(true);

    // The taught verification: back out, then in via the bastion.
    run(session, 'exit');
    run(session, 'ssh admin@bastion01');
    run(session, 'schleuse-blau-9');
    run(session, 'ssh admin@waage01');
    run(session, 'wiegeschein-42');
    expect(shell.getBaseHost().id).not.toBe(''); // session healthy
    const whoami = run(session, 'hostname');
    const out = whoami
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(out).toContain('waage01');
  });

  it('leaving the GLOBAL ssh rule in place does not solve (the door past the bastion)', () => {
    const { session } = makeSession(l8.terminalContext!);
    loginWaage(session);
    // Everything except deleting the old global allow.
    run(session, 'sudo ufw allow from 10.0.30.10 to any port 22');
    run(session, 'sudo ufw default deny incoming');
    run(session, 'sudo ufw enable');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a global allow-22 instead of the bastion-scoped rule does not solve', () => {
    const { session } = makeSession(l8.terminalContext!);
    loginWaage(session);
    // Global allow stays (never deleted, no scoped door) → the wall is up but
    // the door is open to everyone: not "bastion-only".
    run(session, 'sudo ufw default deny incoming');
    run(session, 'sudo ufw enable');
    expect(session.getSnapshot().solved).toBe(false); // scoped door missing, global still open
  });

  it('configuring without ENABLING the wall does not solve', () => {
    const { session } = makeSession(l8.terminalContext!);
    loginWaage(session);
    run(session, 'sudo ufw allow from 10.0.30.10 to any port 22');
    run(session, 'sudo ufw default deny incoming');
    run(session, 'sudo ufw delete allow 22');
    // never enabled
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('solving sets bastion_live via the terminal choice; the skip choice sets nothing', () => {
    const start = l8.choices.find((c) => c.id === 'at_l8_start')!;
    const skip = l8.choices.find((c) => c.id === 'at_l8_postpone')!;
    expect(start.setsFlags).toEqual(['bastion_live']);
    expect(skip.setsFlags).toBeUndefined();
  });
});

describe('hint escalation (hints[0] orients, exact syntax later)', () => {
  it('L7: the first hint never names the target file', () => {
    const hints = l7.guiContext!.hints;
    expect(hints[0]).not.toContain('Lieferschein_2025-05-02');
    expect(hints[hints.length - 1]).toContain('Lieferschein_2025-05-02.pdf');
  });

  it('L8: the first hint never contains ufw syntax', () => {
    const hints = l8.terminalContext!.hints;
    expect(hints[0]).not.toContain('ufw');
    expect(hints.some((h) => h.includes('ufw allow from 10.0.30.10'))).toBe(true);
  });
});
