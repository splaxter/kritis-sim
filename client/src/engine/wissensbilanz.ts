import type { GameEvent, TerminalContext } from '@kritis/shared';
import { allLinuxCommands } from './shell/commands/linux';
import { allPowerShellCommands } from './shell/commands/powershell';

/**
 * Die Wissensbilanz: Was hat das Spiel gezeigt, bevor es etwas verlangt?
 *
 * Der Anlass sind zwei Befunde derselben Klasse. DAS KATASTER verlangte im
 * ersten Level `find`, `wc -l`, `grep -r` und eine Umlenkung — keines davon war
 * einem Story-Spieler je gezeigt worden, denn die Grundlagen-Tutorials tragen
 * `requiredModes: ['beginner']`. Gefunden wurde das nicht von einem Test,
 * sondern davon, dass jemand gespielt hat.
 *
 * Diese Datei ersetzt keinen Menschen. Sie beantwortet mechanisch genau die
 * eine Frage, an der wir zweimal gescheitert sind: *Verlangt ein Level einen
 * Befehl, den die Route bis dahin nie vorgefuehrt hat?*
 *
 * Zwei Staerken von Befund, weil es zwei verschiedene Fehler sind:
 *
 * - UNLOESBAR: Der Befehl steht nirgends — nicht im Auftrag, nicht in den
 *   Hinweisen, nicht in einer vorgefuehrten Zeile, und die Route hat ihn nie
 *   gezeigt. Wer ihn nicht von aussen mitbringt, kommt nicht weiter. Das ist
 *   ein Fehler und wird hart geprueft.
 * - NUR IM HINWEIS: Der Befehl ist neu, steht aber im Level selbst — allerdings
 *   erst im Hinweis, nicht im Auftrag. Loesbar, aber es ist der Fall, ueber den
 *   sich der Auftraggeber beschwert hat: sich vier Hinweise abzuholen, um den
 *   ersten Schritt zu tun, fuehlt sich nicht nach Lernen an. Das wird gezaehlt
 *   und berichtet, nicht verboten.
 *
 * Grenzen, ausdruecklich:
 * - Nur Routen mit fester Reihenfolge (gefuehrter Einstieg, Lernpfad,
 *   Kampagnen) haben ueberhaupt ein „bis dahin". Was die Zufallsauswahl der
 *   Simulationsmodi serviert, hat keine Reihenfolge — dort gilt nur die
 *   schwaechere, aber ordnungsunabhaengige Regel: der Auftrag muss aus dem
 *   loesbar sein, was auf dem Bildschirm steht (siehe abschreibDurchstich).
 * - Erkannt wird ein Befehl nur, wenn die Shell DIESES Levels ihn kennt. Sonst
 *   faerbt PowerShell auf Linux ab: `dir`, `gc`, `ci` sind dort Aliasse und in
 *   deutscher Prosa blosse Woerter.
 */

const namen = (befehle: { name: string; aliases?: string[] }[]) =>
  new Set(befehle.flatMap((c) => [c.name.toLowerCase(), ...(c.aliases ?? []).map((a) => a.toLowerCase())]));

export const LINUX_BEFEHLE: ReadonlySet<string> = namen(allLinuxCommands);
export const POWERSHELL_BEFEHLE: ReadonlySet<string> = namen(allPowerShellCommands);

/**
 * Namen, die auch gewoehnliche Woerter sind. `du` und `dir` sind deutsche
 * Pronomen, `man` ein Pronomen, `top`, `id`, `date`, `file`, `free`, `host`,
 * `type`, `test`, `server` stehen in Prosa. Sie zaehlen nur mit Argument oder
 * Option dahinter — also im Befehlskontext. Aliasse mit ein oder zwei Zeichen
 * (`ci`, `gc`, `h`, `sl`) ebenso: zu kurz, um zufaellige Treffer zu ueberleben.
 */
const ZWEIDEUTIG = new Set([
  'du', 'dir', 'man', 'top', 'id', 'date', 'file', 'free', 'host', 'type',
  'test', 'server', 'which', 'less', 'source', 'env', 'ip', 'lo', 'export',
]);

/** Umlenkung und Verkettung sind kein Befehl, muessen aber gelernt werden. */
export const OPERATOREN = ['>>', '>', '|'] as const;

/** Zeichen, nach denen ein Befehl anfangen kann. */
const GRENZE = new Set(['`', '(', '|', ';', '+', ',', ':', '"', "'", '\n']);

const brauchtKontext = (wort: string) => ZWEIDEUTIG.has(wort) || wort.length <= 2;

/**
 * Die Befehle in einem Stueck Text, so wie ein Spieler sie dort sehen wuerde.
 *
 * Zweideutige Namen (`du`, `dir`, `man`) muessen BEIDES erfuellen: am Anfang
 * einer Befehlsstelle stehen UND ein Argument haben. „sieh dir /var/log an"
 * scheitert am Ersten, „man weiß ja nie" am Zweiten.
 */
export function befehleImText(text: string | undefined, vokabular: ReadonlySet<string>): Set<string> {
  const gefunden = new Set<string>();
  if (!text) return gefunden;

  for (const op of OPERATOREN) {
    // `>` steckt in `>>`; nur zaehlen, wo es allein steht.
    if (op === '>' ? /(^|[^>])>(?!>)/.test(text) : text.includes(op)) gefunden.add(op);
  }

  const stellen = [...text.matchAll(/[A-Za-zÄÖÜäöüß0-9_.-]+/g)];
  stellen.forEach((treffer, i) => {
    const wort = treffer[0].toLowerCase().replace(/^[-.]+|[.:!?]+$/g, '');
    if (!vokabular.has(wort)) return;
    if (!brauchtKontext(wort)) {
      gefunden.add(wort);
      return;
    }
    const davor = text.slice(0, treffer.index).replace(/\s+$/, '');
    const amAnfang = davor.length === 0 || GRENZE.has(davor[davor.length - 1]);
    if (!amAnfang) return;

    const naechstes = stellen[i + 1]?.[0] ?? '';
    const zwischenraum = stellen[i + 1]
      ? text.slice(treffer.index + treffer[0].length, stellen[i + 1].index)
      : '';
    const istOption = zwischenraum.includes('-') || naechstes.startsWith('-');
    const istPfad = /[~/]\s*$/.test(zwischenraum) || zwischenraum.trim().startsWith('/');
    const istBefehl = vokabular.has(naechstes.toLowerCase());
    if (!istOption && !istPfad && !istBefehl) return;
    gefunden.add(wort);
  });
  return gefunden;
}

const vokabularVon = (ctx: TerminalContext) =>
  ctx.type === 'windows' ? POWERSHELL_BEFEHLE : LINUX_BEFEHLE;

/** Was ein Level VORFUEHRT: getippt, mit sichtbarer Ausgabe. */
export function gezeigteBefehle(ctx: TerminalContext): Set<string> {
  const vok = vokabularVon(ctx);
  const gezeigt = new Set<string>();
  for (const cmd of ctx.commands ?? []) {
    for (const b of befehleImText(cmd.pattern, vok)) gezeigt.add(b);
    if (cmd.teachesCommand) gezeigt.add(cmd.teachesCommand.toLowerCase());
  }
  return gezeigt;
}

/** Was im AUFTRAG steht — das, was der Spieler koennen soll, bevor er zum
 *  Hinweisknopf greift. */
export function angesagteBefehle(event: GameEvent, ctx: TerminalContext): Set<string> {
  const vok = vokabularVon(ctx);
  const angesagt = befehleImText(ctx.taskText, vok);
  for (const b of befehleImText(event.description, vok)) angesagt.add(b);
  for (const b of befehleImText(event.mentorNote, vok)) angesagt.add(b);
  return angesagt;
}

/** Was in den HINWEISEN steht — der vom Spiel angebotene Rettungsweg. */
export function hinweisBefehle(ctx: TerminalContext): Set<string> {
  const vok = vokabularVon(ctx);
  const aus = new Set<string>();
  for (const hinweis of ctx.hints ?? []) {
    for (const b of befehleImText(hinweis, vok)) aus.add(b);
  }
  return aus;
}

/**
 * Was der Sollpfad BRAUCHT. Quelle sind die Hinweise (der vom Spiel selbst
 * angebotene Loesungsweg) und die vorgesehenen `solutions[].commands`.
 */
export function verlangteBefehle(ctx: TerminalContext): Set<string> {
  const verlangt = hinweisBefehle(ctx);
  const vok = vokabularVon(ctx);
  for (const loesung of ctx.solutions ?? []) {
    for (const name of loesung.commands ?? []) {
      const wort = name.toLowerCase();
      if (vok.has(wort)) verlangt.add(wort);
    }
  }
  return verlangt;
}

export interface Befund {
  eventId: string;
  titel: string;
  /** Verlangt, aber nirgends zu sehen — weder frueher noch hier. */
  unloesbar: string[];
  /** Neu und nur im Hinweis erklaert, nicht im Auftrag. */
  nurImHinweis: string[];
}

export interface Routenbilanz {
  route: string;
  terminalLevel: number;
  befunde: Befund[];
  vokabular: string[];
}

/**
 * Eine Route in fester Reihenfolge durchrechnen. `vorwissen` ist, was der
 * Spieler mitbringt, bevor die Route beginnt.
 */
export function bilanziere(
  route: string,
  levelInReihenfolge: GameEvent[],
  vorwissen: Iterable<string> = []
): Routenbilanz {
  const bekannt = new Set<string>(vorwissen);
  const befunde: Befund[] = [];
  let terminalLevel = 0;

  for (const event of levelInReihenfolge) {
    const ctx = event.terminalContext;
    if (!ctx) continue;
    terminalLevel++;

    const zeigt = gezeigteBefehle(ctx);
    const angesagt = angesagteBefehle(event, ctx);
    const imHinweis = hinweisBefehle(ctx);
    const verlangt = verlangteBefehle(ctx);

    // Alles, was im Level SELBST zu sehen ist — abschreibbar.
    const sichtbar = new Set([...zeigt, ...angesagt, ...imHinweis]);

    const unloesbar = [...verlangt].filter((b) => !bekannt.has(b) && !sichtbar.has(b)).sort();
    const nurImHinweis = [...verlangt]
      .filter((b) => !bekannt.has(b) && !zeigt.has(b) && !angesagt.has(b) && imHinweis.has(b))
      .sort();

    if (unloesbar.length > 0 || nurImHinweis.length > 0) {
      befunde.push({ eventId: event.id, titel: event.title, unloesbar, nurImHinweis });
    }

    // Erst NACH der Pruefung lernen: ein Level deckt sich nicht selbst.
    for (const b of sichtbar) bekannt.add(b);
    for (const b of verlangt) bekannt.add(b);
  }

  return { route, terminalLevel, befunde, vokabular: [...bekannt].sort() };
}
