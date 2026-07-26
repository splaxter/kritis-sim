import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { auditTrailStoryEvents } from './events';
import { auditTrailChapters } from './chapters';

const byId = new Map(auditTrailStoryEvents.map((e) => [e.id, e]));
const l3 = byId.get('at_l3_ticket_diff')!;
const l4 = byId.get('at_l4_iis_log')!;
const auth = byId.get('at_authorization')!;
const mail = byId.get('at_finding_mail')!;
const l5 = byId.get('at_l5_evidence_chain')!;
const l6 = byId.get('at_l6_enable_auditing')!;

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

describe('AUDIT TRAIL Act 2 — chapter beats', () => {
  it('ch02 plays L3 → L4 → Mandat; ch03 plays Meldung → L5 → L6, all mandatory', () => {
    const ch02 = auditTrailChapters.find((c) => c.id === 'at_ch02_trail')!;
    const ch03 = auditTrailChapters.find((c) => c.id === 'at_ch03_evidence')!;
    expect(ch02.storyBeats.map((b) => b.eventId)).toEqual([
      'at_l3_ticket_diff', 'at_l4_iis_log', 'at_authorization',
    ]);
    expect(ch03.storyBeats.map((b) => b.eventId)).toEqual([
      'at_finding_mail', 'at_l5_evidence_chain', 'at_l6_enable_auditing',
    ]);
    for (const b of [...ch02.storyBeats, ...ch03.storyBeats]) {
      expect(byId.has(b.eventId), `${b.eventId} must be authored`).toBe(true);
      expect(b.isOptional).toBe(false);
    }
  });

  it('platform boundary: L3/L5 are Linux, L4/L6 are PowerShell on EXCH01', () => {
    expect(l3.terminalContext?.type).toBe('linux');
    expect(l5.terminalContext?.type).toBe('linux');
    expect(l4.terminalContext?.type).toBe('windows');
    expect(l4.terminalContext?.hostname).toBe('EXCH01');
    expect(l6.terminalContext?.type).toBe('windows');
    expect(l6.terminalContext?.hostname).toBe('EXCH01');
    // The dialogs are not hands-on levels.
    expect(auth.terminalContext).toBeUndefined();
    expect(mail.terminalContext).toBeUndefined();
  });
});

describe('L3 „Der editierte Ticket-Export"', () => {
  const BEFUND = '/home/timo/befund_tickets.md';

  it('the two exports really differ in exactly the authored tampering (diff exits 1)', () => {
    const { session } = makeSession(l3.terminalContext!);
    const effects = run(
      session,
      'diff /srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv /srv/ticket-exports/2026/tickets_2026-06.csv'
    );
    const out = effects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(out).toContain('Zuarbeit Bjorg');
    expect(out).toContain('Freigabe Einkauf');
    expect(out).toContain('4715'); // the deleted ticket shows up as removed
  });

  it('diff + documented Befund with both ticket ids solves', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(
      session,
      'diff /srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv /srv/ticket-exports/2026/tickets_2026-06.csv'
    );
    run(session, `echo "4713: Kommentar nachtraeglich geaendert" >> ${BEFUND}`);
    expect(session.getSnapshot().solved).toBe(false); // 4715 still missing
    run(session, `echo "4715: Ticket im aktuellen Export entfernt" >> ${BEFUND}`);
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('reading both files manually (cat) is a valid comparison path', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(session, 'cat /srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv');
    run(session, 'cat /srv/ticket-exports/2026/tickets_2026-06.csv');
    run(session, `echo "4713 und 4715 weichen ab" >> ${BEFUND}`);
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('a Befund without having read BOTH versions does not solve', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(session, 'cat /srv/ticket-exports/2026/tickets_2026-06.csv'); // current only
    run(session, `echo "4713 4715" >> ${BEFUND}`);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('naming only one ticket id does not solve', () => {
    const { session } = makeSession(l3.terminalContext!);
    run(
      session,
      'diff /srv/ticket-exports/archiv/tickets_2026-06_stand_m.csv /srv/ticket-exports/2026/tickets_2026-06.csv'
    );
    run(session, `echo "nur 4713 dokumentiert" >> ${BEFUND}`);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('solving sets ticket_tamper_documented via the terminal choice', () => {
    expect(l3.choices[0].setsFlags).toEqual(['ticket_tamper_documented']);
  });
});

describe('L4 „Die Spur im IIS-Log" — honeypot fires on EVERY read path', () => {
  const honeypot = l4.terminalContext!.commands.find((c) => c.setsFlags)!;

  it('the honeypot is a canned command that never solves and only sets the scope flag', () => {
    expect(honeypot.setsFlags).toEqual(['mailbox_scope_exceeded']);
    expect(honeypot.isSolution).toBeUndefined();
  });

  // Design §8: one case per supported read path, incl. pipeline and path
  // variants — the flag must be unavoidable however the PST is opened.
  it.each([
    'Get-Content k_mertens_export.pst',
    'gc k_mertens_export.pst',
    'cat k_mertens_export.pst',
    'type k_mertens_export.pst',
    'Get-Content .\\k_mertens_export.pst',
    'Get-Content C:\\inetpub\\logs\\LogFiles\\W3SVC1\\k_mertens_export.pst',
    'Get-Content -Path k_mertens_export.pst',
    'Select-String -Path k_mertens_export.pst -Pattern Betreff',
    'sls Betreff k_mertens_export.pst',
    'Get-Content k_mertens_export.pst | Select-String Betreff',
    'Get-ChildItem | Get-Content k_mertens_export.pst',
    // PowerShell is case-insensitive — lower/mixed/upper case must not
    // slip past the honeypot (reviewer repro).
    'get-content C:\\inetpub\\logs\\LogFiles\\W3SVC1\\k_mertens_export.pst',
    'GET-CONTENT K_MERTENS_EXPORT.PST',
    'select-string -path k_mertens_export.pst -pattern betreff',
    'sls betreff k_mertens_export.PST',
  ])('fires immediately WITHOUT solving on: %s', (cmd) => {
    const { session, onFlagsSet } = makeSession(l4.terminalContext!);
    run(session, cmd);
    expect(onFlagsSet).toHaveBeenCalledWith(['mailbox_scope_exceeded']);
    expect(session.getSnapshot().solved).toBe(false);
  });

  it.each([
    'Select-String -Path u_ex260722.log -Pattern owa',
    'Get-Content u_ex260722.log',
    'Get-ChildItem',
  ])('does NOT fire on legitimate log work: %s', (cmd) => {
    const { session, onFlagsSet } = makeSession(l4.terminalContext!);
    run(session, cmd);
    expect(onFlagsSet).not.toHaveBeenCalled();
  });
});

describe('L4 — solve path (read the trace log, start the Export-Protokoll)', () => {
  it('plays through: Set-Location, Get-ChildItem shows the PST, Select-String reads the log, Set-Content starts the protocol', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'Set-Location C:\\inetpub\\logs\\LogFiles\\W3SVC1');
    const lsEffects = run(session, 'Get-ChildItem');
    const lsOut = lsEffects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(lsOut).toContain('u_ex260722.log');
    expect(lsOut).toContain('k_mertens_export.pst'); // the honeypot is VISIBLE

    const slsEffects = run(session, 'Select-String -Path u_ex260722.log -Pattern owa');
    const slsOut = slsEffects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(slsOut).toContain('k.mertens@warm.local');
    expect(slsOut).toContain('administrator');
    expect(session.getSnapshot().solved).toBe(false); // protocol still missing

    run(session, 'Set-Content C:\\Users\\timo\\protokoll_export.txt "Quelle: EXCH01 u_ex260722.log"');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('a protocol WITHOUT having read the trace log does not solve', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'Set-Content C:\\Users\\timo\\protokoll_export.txt "Quelle: EXCH01 u_ex260722.log"');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a protocol not naming the log file does not solve', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'Set-Location C:\\inetpub\\logs\\LogFiles\\W3SVC1');
    run(session, 'Select-String -Path u_ex260722.log -Pattern owa');
    run(session, 'Set-Content C:\\Users\\timo\\protokoll_export.txt "Logs gesichtet"');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('reading the honeypot never contributes to the win', () => {
    const { session } = makeSession(l4.terminalContext!);
    run(session, 'Get-Content k_mertens_export.pst');
    run(session, 'Set-Content C:\\Users\\timo\\protokoll_export.txt "Quelle: EXCH01 u_ex260722.log"');
    expect(session.getSnapshot().solved).toBe(false); // trace log still unread
  });
});

describe('Mandat & Meldung — the Act-2 decision dialogs', () => {
  it('both dialogs offer ≥2 ungated options', () => {
    for (const e of [auth, mail]) {
      const ungated = e.choices.filter((c) => !c.requires && !c.hidden);
      expect(ungated.length, e.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('the Meldung composes a NEUTRAL draft to Bert only (no static CC)', () => {
    expect(mail.mailCompose?.to).toBe('bert@warm.local');
    expect(mail.mailCompose?.cc).toBeUndefined();
    expect(mail.mailCompose?.body).not.toMatch(/Betreff: Re:/); // no mailbox CONTENT quoted
  });

  it('Act-2 flags each have exactly ONE source across the campaign', () => {
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
    expect(sources.get('ticket_tamper_documented')).toEqual(['at_l3_ticket_diff/start']);
    expect(sources.get('authorization_documented')).toEqual(['at_authorization/at_authorization_written']);
    expect(sources.get('finding_reported')?.sort()).toEqual([
      'at_finding_mail/at_finding_mail_bert',
      'at_finding_mail/at_finding_mail_broad',
    ]);
    expect(sources.get('personal_data_shared_broadly')).toEqual(['at_finding_mail/at_finding_mail_broad']);
    expect(sources.get('mailbox_scope_exceeded')).toEqual(['at_l4_iis_log/terminal']);
    expect(sources.get('evidence_hashed')).toEqual(['at_l5_evidence_chain/start']);
    expect(sources.get('export_documented')).toEqual(['at_l5_evidence_chain/start']);
    expect(sources.get('mailbox_auditing_enabled')).toEqual(['at_l6_enable_auditing/start']);
  });
});

describe('L5 „Die Beweiskette"', () => {
  function fullPath(session: TerminalSession) {
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    run(session, 'sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 OWA-Zugriff Postfach k.mertens als administrator" >> /home/timo/beweis/timeline.md');
  }

  it('plays through: copy, hash, timeline, close the protocol — solved', () => {
    const { session } = makeSession(l5.terminalContext!);
    fullPath(session);
    expect(session.getSnapshot().solved).toBe(false); // protocol still open
    run(session, 'echo "Erledigt: Kopie gesichert, SHA-256 in hashes.txt" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('the real sha256sum output prints "<64 hex>  <path>" (what the player writes to hashes.txt)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    const effects = run(session, 'sha256sum /home/timo/beweis/u_ex260722.log');
    const out = effects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(out).toMatch(/^[0-9a-f]{64}\s+\/home\/timo\/beweis\/u_ex260722\.log/m);
  });

  it('a fully INVENTED chain does not solve (reviewer forgery repro — no real read/copy/hash)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'echo fake > /home/timo/beweis/u_ex260722.log');
    run(session, `echo "${'a'.repeat(64)}  /home/timo/beweis/u_ex260722.log" > /home/timo/beweis/hashes.txt`);
    run(session, 'echo "2026-07-22 12:40 erfunden" > /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: synthetisch" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a copy made WITHOUT cp (cat >) does not satisfy the bound copy goal', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cat /home/timo/eingang/u_ex260722.log > /home/timo/beweis/u_ex260722.log');
    run(session, 'sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false); // no cp original→kopie on record
  });

  it('an ORIGINAL-labelled hash line + throwaway copy-hash does not solve (reviewer repro v3)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    // hashes.txt explicitly carries the ORIGINAL's path; the copy's sha256
    // only ever landed in a throwaway file.
    run(session, 'sha256sum /home/timo/eingang/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/wegwerf_hash.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('a pre-crafted valid line + FAILED redirect does not solve (reviewer repro v4)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    // Learn the digest WITHOUT feeding any list (no redirect)…
    const effects = run(session, 'sha256sum /home/timo/beweis/u_ex260722.log');
    const digest = effects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n')
      .match(/[0-9a-f]{64}/)![0];
    // …hand-craft a perfectly valid-LOOKING protocol line…
    run(session, `echo "${digest}  u_ex260722.log" > /home/timo/beweis/hashes.txt`);
    // …then produce a writtenTo record whose redirect FAILS (directory target).
    run(session, 'sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    // The pending record was discarded with the failed write: no proof that
    // any sha256sum ever fed hashes.txt.
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('the honest RELATIVE flow still solves (cd + basename output into the list)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    run(session, 'cd /home/timo/beweis');
    run(session, 'sha256sum u_ex260722.log > hashes.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 OWA-Zugriff" >> timeline.md');
    run(session, 'echo "Erledigt: Kopie und Hash" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('a REAL cp + sha256 of the ORIGINAL + md5 of the copy does not solve (reviewer repro)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    // The hash list carries the ORIGINAL's sha256 (digest matches the copy,
    // bytes are equal) — but the only digest computed FOR the copy is MD5.
    run(session, 'sha256sum /home/timo/eingang/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'md5sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/md5.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false); // sha256 was never computed for the COPY
  });

  it('borrowed tool runs do not count (reviewer repro: fremd-cp + hash of the ORIGINAL)', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    // Copy made by cat, an UNRELATED cp, and a hash of the ORIGINAL (whose
    // digest equals the copy's — but was not computed FOR the copy).
    run(session, 'cat /home/timo/eingang/u_ex260722.log > /home/timo/beweis/u_ex260722.log');
    run(session, 'cp /home/timo/eingang/protokoll_export.txt /home/timo/protokoll_kopie.txt');
    run(session, 'sha256sum /home/timo/eingang/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('hashing some OTHER file does not satisfy the hash goal', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    run(session, 'sha256sum /home/timo/eingang/protokoll_export.txt > /home/timo/beweis/hashes.txt');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: alles" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('tampering with the copy AFTER hashing breaks the chain again', () => {
    const { session } = makeSession(l5.terminalContext!);
    run(session, 'mkdir /home/timo/beweis');
    run(session, 'cp /home/timo/eingang/u_ex260722.log /home/timo/beweis/');
    run(session, 'sha256sum /home/timo/beweis/u_ex260722.log > /home/timo/beweis/hashes.txt');
    run(session, 'echo manipuliert >> /home/timo/beweis/u_ex260722.log');
    run(session, 'echo "2026-07-22 12:40-12:44 Zugriff" >> /home/timo/beweis/timeline.md');
    run(session, 'echo "Erledigt: fertig" >> /home/timo/eingang/protokoll_export.txt');
    expect(session.getSnapshot().solved).toBe(false); // copy ≠ original, hash stale
  });

  it('the seeded protocol does not pre-satisfy the closing line', () => {
    const seeded = l5.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('protokoll_export.txt')
    )!;
    expect(seeded.content).not.toMatch(/^Erledigt:/m);
    expect(seeded.content).toContain('u_ex260722'); // continuity with L4
  });

  it('the exported log carries the SAME bytes as the L4 source (chain of custody)', () => {
    const l4Log = l4.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('u_ex260722.log')
    )!;
    const l5Log = l5.terminalContext!.vfsOverlay!.files!.find((f) =>
      f.path.endsWith('u_ex260722.log')
    )!;
    expect(l5Log.content).toBe(l4Log.content);
  });

  it('solving sets evidence_hashed AND export_documented', () => {
    expect(l5.choices[0].setsFlags).toEqual(['evidence_hashed', 'export_documented']);
  });
});

describe('L6 „Ab jetzt wird geloggt"', () => {
  it('Get-Mailbox shows the disabled state, Set-Mailbox $true solves — no restart involved', () => {
    const { session } = makeSession(l6.terminalContext!);
    const getEffects = run(session, 'Get-Mailbox k.mertens');
    const out = getEffects
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(out).toMatch(/AuditEnabled\s*:\s*False/);
    expect(session.getSnapshot().solved).toBe(false);

    run(session, 'Set-Mailbox k.mertens -AuditEnabled $true');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('a typo ($ture) fails loudly and does NOT solve (strict bool)', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'Set-Mailbox k.mertens -AuditEnabled $ture');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('erst prüfen, dann ändern: a direct Set-Mailbox WITHOUT the Get-Mailbox check does not solve', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'Set-Mailbox k.mertens -AuditEnabled $true');
    expect(session.getSnapshot().solved).toBe(false); // check still missing
    // The check counts case-insensitively (real PowerShell semantics) and
    // also as the AFTER-verification the hints teach.
    run(session, 'get-mailbox k.mertens');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('inspecting a DIFFERENT mailbox does not count (reviewer repro: extra arg is ignored)', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'Set-Mailbox k.mertens -AuditEnabled $true');
    // The cmdlet resolves only 'poststelle'; 'k.mertens' is a discarded
    // second positional — the operand-bound record must not credit it.
    run(session, 'Get-Mailbox poststelle k.mertens');
    expect(session.getSnapshot().solved).toBe(false);
    run(session, 'Get-Mailbox k.mertens');
    expect(session.getSnapshot().solved).toBe(true);
  });

  it('enabling a DIFFERENT mailbox does not solve', () => {
    const { session } = makeSession(l6.terminalContext!);
    run(session, 'Set-Mailbox poststelle -AuditEnabled $true');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('solving sets mailbox_auditing_enabled; the Lernnotiz cites both Microsoft references', () => {
    expect(l6.choices[0].setsFlags).toEqual(['mailbox_auditing_enabled']);
    const note = l6.terminalContext!.solutions[0].resultText;
    expect(note).toContain('learn.microsoft.com/en-us/purview/audit-mailboxes');
    expect(note).toContain('enable-or-disable?view=exchserver-2019');
    // The procedure explicitly does NOT involve a service restart.
    expect(note).toContain('ohne Neustart');
  });
});

describe('hint escalation (hints[0] orients, exact syntax later)', () => {
  it.each([
    ['L3', l3, 'diff /srv'],
    ['L4', l4, 'Select-String -Path u_ex260722.log'],
    ['L5', l5, 'sha256sum /home/timo'],
    ['L6', l6, 'Set-Mailbox k.mertens -AuditEnabled $true'],
  ] as const)('%s: the first hint never contains the exact solution command', (_n, level, syntax) => {
    const hints = level.terminalContext!.hints;
    expect(hints[0]).not.toContain(syntax);
    expect(hints.some((h) => h.includes(syntax))).toBe(true);
  });
});
