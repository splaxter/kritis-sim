import type { GameEvent, TerminalContext } from '@kritis/shared';
import { createShellFromContext } from './shell';
import { TerminalSession } from '../components/Terminal/session/TerminalSession';
import { sollpfad, type Sollpfad } from './sollpfad';

/**
 * Faehrt einen Sollpfad so, wie die Oberflaeche es tut.
 *
 * Der erste Anlauf tat das NICHT und hat sich damit selbst belogen:
 *
 * - Er hat `scheduleDrip` ignoriert. Ein `ping` streamt seine Antwortzeilen
 *   ueber Timer; wer nicht tickt, tippt in eine Session, die noch beschaeftigt
 *   ist — die naechsten Befehle fielen ins Leere. `evt_tutorial_network` galt
 *   deshalb als nicht abschreibbar, obwohl derselbe Pfad nach vier Ticks loest.
 * - Er hat nach dem Erfolg weitergetippt. Das naechste Enter ist im Spiel die
 *   BESTAETIGUNG des Erfolgs; sie ruft `onSolved` und setzt `solved` zurueck.
 *   Drei weitere Level galten dadurch als ungeloest, obwohl sie mittendrin
 *   geloest waren.
 *
 * Beides zusammen hatte denselben Effekt: Der Test war gruen und seine Aussage
 * falsch. Deshalb wird der Erfolg hier DAUERHAFT festgehalten (`jeGeloest`) und
 * beim ersten Erfolg abgebrochen.
 */

const MAX_TICKS = 40;

export interface Fahrt {
  pfad: Sollpfad;
  /** Wurde das Level irgendwann waehrend der Fahrt geloest? */
  geloest: boolean;
  /** Wie viele Zeilen wurden bis dahin gebraucht? */
  zeilenGetippt: number;
}

export interface Zeile {
  cmd: string;
  /** Antworten auf Rueckfragen (Passwort, Passphrase) in ihrer Reihenfolge. */
  antworten?: string[];
}

export interface Zeilenfahrt {
  /** Nach der wievielten Zeile war das Level zum ersten Mal geloest? null = nie. */
  geloestNachZeile: number | null;
  zeilenGetippt: number;
}

/**
 * Feste Zeilen durch die SITZUNG fahren — nicht an ihr vorbei.
 *
 * Der Unterschied ist kein Detail: Wer `shell.execute` direkt aufruft, umgeht
 * die Erfolgserkennung und merkt deshalb NICHT, dass ein Level schon nach der
 * zweiten Zeile geloest ist. Genau so hat ein Nachweis einen Aufgabentext
 * bestaetigt, dessen letzte beide Schritte im Spiel nie zur Ausfuehrung kommen:
 * Nach dem Erfolg wartet die Sitzung auf das bestaetigende Enter, und was der
 * Spieler danach tippt, ist keine Eingabe mehr.
 */
export function fahreZeilen(ctx: TerminalContext, zeilen: readonly Zeile[]): Zeilenfahrt {
  const shell = createShellFromContext(ctx);
  const session = new TerminalSession({
    shell, context: ctx, gameMode: 'learning', onSolved: () => {}, onFlagsSet: () => {},
  });

  let geloestNachZeile: number | null = null;
  let zeilenGetippt = 0;

  const ausstreamen = (effekte: { type: string }[]) => {
    let offen = effekte.some((e) => e.type === 'scheduleDrip');
    for (let i = 0; offen && i < MAX_TICKS; i++) {
      offen = session.tick('drip').some((e) => e.type === 'scheduleDrip');
    }
  };

  for (const { cmd, antworten } of zeilen) {
    if (geloestNachZeile !== null) break; // nach dem Erfolg tippt niemand weiter
    for (const zeichen of cmd) session.handleData(zeichen);
    ausstreamen(session.handleData('\r'));
    zeilenGetippt++;
    let i = 0;
    while (shell.hasPendingInput() && i < 8) {
      const antwort = antworten?.[i++] ?? '';
      for (const zeichen of antwort) session.handleData(zeichen);
      ausstreamen(session.handleData('\r'));
    }
    if (session.getSnapshot().solved) geloestNachZeile = zeilenGetippt;
  }

  return { geloestNachZeile, zeilenGetippt };
}

export function fahreSollpfad(event: GameEvent): Fahrt {
  const ctx = event.terminalContext!;
  const pfad = sollpfad(event)!;
  const shell = createShellFromContext(ctx);
  const session = new TerminalSession({
    shell,
    context: ctx,
    gameMode: 'learning',
    onSolved: () => {},
    onFlagsSet: () => {},
  });

  let jeGeloest = false;
  let zeilenGetippt = 0;

  /** Alles abarbeiten, was die Session noch ausgeben will — wie die UI. */
  const ausstreamen = (effekte: { type: string }[]) => {
    let offen = effekte.some((e) => e.type === 'scheduleDrip');
    for (let i = 0; offen && i < MAX_TICKS; i++) {
      const weitere = session.tick('drip');
      offen = weitere.some((e) => e.type === 'scheduleDrip');
      if (session.getSnapshot().solved) jeGeloest = true;
    }
  };

  for (const zeile of pfad.zeilen) {
    if (jeGeloest) break; // nach dem Erfolg tippt niemand weiter
    for (const zeichen of zeile) session.handleData(zeichen);
    ausstreamen(session.handleData('\r'));
    zeilenGetippt++;
    if (session.getSnapshot().solved) jeGeloest = true;
    if (!jeGeloest && shell.hasPendingInput()) {
      for (const zeichen of 'ja') session.handleData(zeichen);
      ausstreamen(session.handleData('\r'));
      if (session.getSnapshot().solved) jeGeloest = true;
    }
  }

  return { pfad, geloest: jeGeloest, zeilenGetippt };
}
