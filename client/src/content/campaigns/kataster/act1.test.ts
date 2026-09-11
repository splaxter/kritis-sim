import { describe, it, expect, vi } from 'vitest';
import { GameModeId, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from '../../../engine/shell';
import { TerminalSession } from '../../../components/Terminal/session/TerminalSession';
import { isGuiSolutionMet } from '../../../components/WindowsLevel/guiSolution';
import { katasterStoryEvents } from './events';
import { katasterChapters } from './chapters';

const byId = new Map(katasterStoryEvents.map((e) => [e.id, e]));
const kickoff = byId.get('kt_kickoff')!;
const l1 = byId.get('kt_l1_ordner')!;
const l2 = byId.get('kt_l2_erster_eintrag')!;
const werMachtDas = byId.get('kt_wer_macht_das')!;

/** Real ShellEngine + real VFS from the level's own context. */
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
  const onSolved = vi.fn();
  const onFlagsSet = vi.fn();
  const session = new TerminalSession({ shell, context: ctx, gameMode, onSolved, onFlagsSet });
  return { session, shell, onSolved };
}

function run(session: TerminalSession, cmd: string) {
  for (const ch of cmd) session.handleData(ch);
  return session.handleData('\r');
}

/** The visible lines a command produced. */
function outputOf(session: TerminalSession, cmd: string): string {
  return run(session, cmd)
    .filter((e): e is { type: 'writeLine'; text: string } => e.type === 'writeLine')
    .map((e) => e.text)
    .join('\n');
}

describe('DAS KATASTER Akt 1 — Beats', () => {
  it('ch01 spielt Kick-off → L1 → L2 → Dialog, alles verpflichtend', () => {
    const ch01 = katasterChapters.find((c) => c.id === 'kt_ch01_ordner')!;
    expect(ch01.storyBeats.map((b) => b.eventId)).toEqual([
      'kt_kickoff',
      'kt_l1_ordner',
      'kt_l2_erster_eintrag',
      'kt_wer_macht_das',
    ]);
    expect(ch01.storyBeats.every((b) => !b.isOptional)).toBe(true);
  });

  it('L1 ist ein Terminal-Beat, L2 ein GUI-Beat, die Dialoge keins von beidem', () => {
    expect(l1.terminalContext?.type).toBe('linux');
    expect(l1.choices.every((c) => c.terminalCommand)).toBe(true);
    expect(l2.guiContext?.app).toBe('kataster');
    expect(l2.choices.every((c) => c.guiCommand)).toBe(true);
    for (const dialog of [kickoff, werMachtDas]) {
      expect(dialog.terminalContext).toBeUndefined();
      expect(dialog.guiContext).toBeUndefined();
    }
  });

  it('jeder Dialog bietet mindestens zwei ungated Optionen mit Konsequenztext', () => {
    for (const dialog of [kickoff, werMachtDas]) {
      const open = dialog.choices.filter((c) => !c.requires && !c.hidden);
      expect(open.length, dialog.id).toBeGreaterThanOrEqual(2);
      for (const c of dialog.choices) {
        expect(c.resultText.length, `${dialog.id}/${c.id}`).toBeGreaterThan(40);
      }
    }
  });

  it('Hint-Eskalation: der erste Hinweis orientiert, die Syntax kommt zuletzt', () => {
    for (const level of [l1, l2]) {
      const hints = level.terminalContext?.hints ?? level.guiContext?.hints ?? [];
      expect(hints.length, level.id).toBeGreaterThanOrEqual(3);
      // hints[0] nennt nie ein Kommando …
      expect(hints[0], level.id).not.toMatch(/`|grep -|find |echo |wc -/);
      // … der letzte dagegen schon (CLI) bzw. nennt die konkrete Aktion (GUI).
      const last = hints[hints.length - 1];
      expect(last.length, level.id).toBeGreaterThan(40);
    }
    expect(l1.terminalContext!.hints.at(-1)).toMatch(/echo .* >> \/home\/timo\/quellen\.md/);
  });
});

describe('L1 „Der Ordner des Vorgängers" — in der echten Shell lösbar', () => {
  it('elf Dateien: der Umfang ist der erste Befund', () => {
    const { session } = makeSession(l1.terminalContext!);
    // Die Zahl steht im resultText des Levels ("Elf Dateien") — sie muss mit
    // dem stimmen, was die Shell wirklich zaehlt, sonst luegt der Text.
    expect(outputOf(session, 'find /srv/verwaltung -type f | wc -l')).toMatch(/\b11\b/);
    expect(l1.choices[0].resultText).toMatch(/Elf Dateien/);
  });

  it('grep -r findet die monatliche Pflicht im Komm.ONE-Vertrag', () => {
    const { session } = makeSession(l1.terminalContext!);
    const out = outputOf(session, 'grep -rn monatlich /srv/verwaltung/vertragsakten');
    expect(out).toMatch(/komm_one_sla\.txt/);
  });

  it('der Sollpfad löst das Level: lesen UND aufschreiben', () => {
    const { session, onSolved } = makeSession(l1.terminalContext!);
    run(session, 'grep -rn monatlich /srv/verwaltung/vertragsakten');
    run(session, 'cat /srv/verwaltung/vertragsakten/komm_one_sla.txt');
    run(session, 'echo "SLA Komm.ONE 4 - monatlicher Bericht" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(true);
    // Die Bestaetigung wird erst mit dem naechsten Enter des Spielers geliefert.
    session.handleData('\r');
    expect(onSolved).toHaveBeenCalled();
  });

  /** Die Datei allein ist Abschreiben — der Vertrag muss wirklich gelesen sein. */
  it('nur aufschreiben, ohne den Vertrag zu lesen, löst NICHT', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'echo "SLA Komm.ONE - monatlicher Bericht" >> /home/timo/quellen.md');
    expect(session.getSnapshot().solved).toBe(false);
  });

  /** Umgekehrt: lesen ohne Artefakt ist „weiss ich doch". */
  it('nur lesen, ohne aufzuschreiben, löst NICHT', () => {
    const { session } = makeSession(l1.terminalContext!);
    run(session, 'cat /srv/verwaltung/vertragsakten/komm_one_sla.txt');
    expect(session.getSnapshot().solved).toBe(false);
  });

  it('setzt die Quellen-Domäne K1 über die Choice', () => {
    expect(l1.choices[0].setsFlags).toContain('kat_source_contract');
  });
});

describe('L2 „Der erste Eintrag" — das Grid', () => {
  const gui = l2.guiContext!;

  it('startet leer: das Kataster entsteht erst durch den Spieler', () => {
    expect(gui.state.kataster!.entries).toHaveLength(0);
    expect(gui.state.kataster!.findings!.length).toBeGreaterThanOrEqual(2);
  });

  it('der Fundstapel enthält genau einen Köder, und der ist als solcher markiert', () => {
    const decoys = gui.state.kataster!.findings!.filter((f) => f.decoy);
    expect(decoys).toHaveLength(1);
    expect(decoys[0].riskFeedback, 'ein Köder ohne Erklärung lehrt nichts').toBeTruthy();
    expect(decoys[0].source).toMatch(/[Bb]rosch/);
  });

  it('die Lösung verlangt Aufnehmen UND Turnus — eine Pflicht ohne Rhythmus hat keine Frist', () => {
    const sol = gui.solutions[0];
    expect(sol.interactions).toEqual(['add:sla_bericht', 'cycle:sla_bericht:monatlich']);
    expect(isGuiSolutionMet(sol, ['add:sla_bericht'])).toBe(false);
    expect(isGuiSolutionMet(sol, ['add:sla_bericht', 'cycle:sla_bericht:monatlich'])).toBe(true);
  });

  it('der Köder allein löst nicht', () => {
    expect(isGuiSolutionMet(gui.solutions[0], ['add:athos_werbung'])).toBe(false);
  });

  it('der Turnus in der Lösung stimmt mit dem Vertragstext überein', () => {
    const finding = gui.state.kataster!.findings!.find((f) => f.id === 'sla_bericht')!;
    expect(finding.excerpt).toMatch(/monatlich/);
    expect(gui.solutions[0].interactions).toContain('cycle:sla_bericht:monatlich');
  });

  it('keine Gruppe in der Personenliste — die Falle kommt erst in Akt 2', () => {
    expect(gui.state.kataster!.people.some((p) => p.isGroup)).toBe(false);
  });
});
