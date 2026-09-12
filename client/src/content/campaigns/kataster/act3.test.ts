import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext, checkFlagCondition } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';

const byId = new Map(katasterStoryEvents.map((e) => [e.id, e]));
const uhr = katasterChapters.find((c) => c.id === 'kt_ch05_uhr')!;
const l8 = byId.get('kt_l8_fristen')!;

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
  });
  return new TerminalSession({
    shell,
    context: ctx,
    gameMode,
    onSolved: vi.fn(),
    onFlagsSet: vi.fn(),
  });
}

function run(session: TerminalSession, cmd: string) {
  for (const ch of cmd) session.handleData(ch);
  return session.handleData('\r');
}

describe('Akt 3 — jede Uhr hat zwei Zifferblätter', () => {
  const payoffs = uhr.storyBeats.filter((b) => b.branchCondition);

  it('drei Payoffs, jeder mit beiden Varianten und beide authored', () => {
    expect(payoffs).toHaveLength(3);
    for (const beat of payoffs) {
      expect(byId.get(beat.eventId), `${beat.id}: Hauptvariante fehlt`).toBeDefined();
      expect(byId.get(beat.alternateEventId!), `${beat.id}: Gegenvariante fehlt`).toBeDefined();
    }
  });

  it.each([
    ['kt_mahnung', 'kat_orphan_sla', 'kt_mahnung_abgewendet'],
    ['kt_rechnung', 'kat_orphan_license', 'kt_rechnung_abgewendet'],
    ['kt_vorstandsfrage', 'kat_gap_concealed', 'kt_vorstandsfrage_gemeldet'],
  ])('%s spielt genau dann, wenn %s gesetzt ist', (eventId, flag, alternate) => {
    const beat = payoffs.find((b) => b.eventId === eventId)!;
    expect(beat.alternateEventId).toBe(alternate);
    expect(checkFlagCondition(beat.branchCondition, { [flag]: true })).toBe(true);
    expect(checkFlagCondition(beat.branchCondition, {})).toBe(false);
  });

  /**
   * Die Uhr muss beide Richtungen wirklich spürbar machen: die verwaiste
   * Variante kostet Geld, die besetzte bringt welches. Sonst ist der Payoff
   * nur Text und die Aufpasser-Spalte bleibt Dekoration.
   */
  it('verwaist kostet Budget, besetzt bringt Budget', () => {
    const budgetsOf = (id: string) =>
      byId.get(id)!.choices.map((c) => c.effects.budget ?? 0);
    for (const id of ['kt_mahnung', 'kt_rechnung']) {
      expect(Math.max(...budgetsOf(id)), `${id} sollte durchweg kosten`).toBeLessThan(0);
    }
    for (const id of ['kt_mahnung_abgewendet', 'kt_rechnung_abgewendet']) {
      expect(Math.min(...budgetsOf(id)), `${id} sollte durchweg einbringen`).toBeGreaterThan(0);
    }
  });

  it('derselbe Schaden, beide Richtungen gleich beziffert', () => {
    const verlust = Math.abs(byId.get('kt_mahnung')!.choices[0].effects.budget!);
    const gewinn = byId.get('kt_mahnung_abgewendet')!.choices[0].effects.budget!;
    expect(gewinn).toBe(verlust);
  });

  it('jede Variante bietet mindestens zwei ungated Optionen mit Konsequenztext', () => {
    const alle = uhr.storyBeats.flatMap((b) =>
      [b.eventId, b.alternateEventId].filter(Boolean).map((id) => byId.get(id as string)!)
    );
    // Gilt auch fuer das optionale Level: wer es nicht spielen muss, muss es
    // auch ablehnen koennen (Muster von AUDIT TRAILs L8).
    for (const ev of alle) {
      const open = ev.choices.filter((c) => !c.requires && !c.hidden);
      expect(open.length, ev.id).toBeGreaterThanOrEqual(2);
      for (const c of ev.choices) expect(c.resultText.length, `${ev.id}/${c.id}`).toBeGreaterThan(40);
    }
  });
});

describe('Akt 3 — Verbindlichkeit und Eskalation', () => {
  const bjorg = byId.get('kt_bjorg_vier')!;
  const eskalation = byId.get('kt_eskalation')!;

  it('Bjorgs vier Zeilen: schriftlich bestätigen erfüllt K2, blind eintragen ist die Lüge', () => {
    const flagsOf = (id: string) => bjorg.choices.find((c) => c.id === id)!.setsFlags ?? [];
    expect(flagsOf('kt_bjorg_vier_bestaetigen')).toEqual(['kat_ownership_confirmed']);
    expect(flagsOf('kt_bjorg_vier_eintragen')).toEqual(['kat_owner_fabricated']);
    expect(flagsOf('kt_bjorg_vier_ablehnen')).toEqual([]);
  });

  it('die Eskalation ist eine Mail, und nur die schriftliche Variante zählt', () => {
    expect(eskalation.mailCompose?.cc, 'ohne CC an die GF ist es keine Eskalation').toBeTruthy();
    const flagsOf = (id: string) => eskalation.choices.find((c) => c.id === id)!.setsFlags ?? [];
    expect(flagsOf('kt_eskalation_schriftlich')).toEqual(['kat_gaps_escalated']);
    expect(flagsOf('kt_eskalation_muendlich')).toEqual([]);
    expect(flagsOf('kt_eskalation_selbst')).toEqual([]);
  });

  /** Alles selbst tragen ist die teuerste Option — nicht an Geld, an Stress. */
  it('alles allein machen kostet am meisten Stress', () => {
    const stressOf = (id: string) => eskalation.choices.find((c) => c.id === id)!.effects.stress ?? 0;
    expect(stressOf('kt_eskalation_selbst')).toBeGreaterThan(stressOf('kt_eskalation_schriftlich'));
  });
});

describe('L8 ★ „Was in dreißig Tagen fällig wird" — optional, aber echt', () => {
  it('ist der einzige optionale Beat und gated nichts', () => {
    const optional = uhr.storyBeats.filter((b) => b.isOptional);
    expect(optional.map((b) => b.eventId)).toEqual(['kt_l8_fristen']);
    // Kein anderer Beat und keine Domäne hängt an kat_reminder_live.
    const gates = katasterChapters
      .flatMap((c) => c.storyBeats)
      .flatMap((b) => JSON.stringify(b.branchCondition ?? ''));
    expect(gates.join()).not.toMatch(/kat_reminder_live/);
  });

  it('awk filtert die fälligen Zeilen wirklich heraus', () => {
    const session = makeSession(l8.terminalContext!);
    const out = run(session, 'awk -F\';\' \'$4 <= "2026-10-11"\' /srv/kataster/pflichten.csv')
      .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
      .map((e) => e.text)
      .join('\n');
    expect(out).toMatch(/2026-10-05/);
    expect(out).toMatch(/2026-10-09/);
    expect(out).not.toMatch(/2027-/);
  });

  it('der Sollpfad löst und setzt den Bonus', () => {
    const session = makeSession(l8.terminalContext!);
    run(session, 'cat /srv/kataster/pflichten.csv');
    run(
      session,
      'awk -F\';\' \'$4 <= "2026-10-11"\' /srv/kataster/pflichten.csv > /srv/monitoring/inbox/kataster_faellig.txt'
    );
    expect(session.getSnapshot().solved).toBe(true);
    expect(l8.choices[0].setsFlags).toContain('kat_reminder_live');
  });

  /** Der ganze Export hineinzukippen ist kein Filtern — genau das prüft absentMatches. */
  it('die komplette CSV durchzureichen löst NICHT', () => {
    const session = makeSession(l8.terminalContext!);
    run(session, 'cat /srv/kataster/pflichten.csv > /srv/monitoring/inbox/kataster_faellig.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });
});
