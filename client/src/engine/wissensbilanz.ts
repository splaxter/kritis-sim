import type { GameEvent, TerminalContext } from '@kritis/shared';
import { allLinuxCommands } from './shell/commands/linux';
import { allPowerShellCommands } from './shell/commands/powershell';
import { anforderungenJeLoesung, UNBELEGTE_KANDIDATEN, type Anforderungen } from './anforderungen';

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
  // Deutsche oder englische Alltagswoerter, die zugleich Befehle sind
  'du', 'dir', 'man', 'top', 'id', 'date', 'file', 'free', 'host', 'type',
  'test', 'server', 'which', 'less', 'source', 'env', 'ip', 'lo', 'export',
  // PowerShell-Kuerzel, die als Silbe durchgehen. Eine pauschale Regel „alles
  // mit hoechstens zwei Zeichen" waere bequem, hat aber `ps` und `ss`
  // mitgenommen — beide sind in deutschem Text eindeutig.
  'ci', 'gc', 'gl', 'sc', 'sl', 'h', 'gi', 'ni', 'ri', 'si', 'cli', 'ft',
]);

/** Umlenkung und Verkettung sind kein Befehl, muessen aber gelernt werden. */
export const OPERATOREN = ['>>', '>', '|'] as const;

/** Zeichen, nach denen ein Befehl anfangen kann. */
const GRENZE = new Set(['`', '(', '|', ';', '+', ',', ':', '"', "'", '\n']);

const brauchtKontext = (wort: string) => ZWEIDEUTIG.has(wort);

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
    // Ein gescripteter Beat fuehrt seinen Befehl vor, auch wenn die Shell ihn
    // gar nicht kennt: `whois 185.234.72.15` ist im Spiel eine gueltige Zeile
    // mit Ausgabe, obwohl `whois` nirgends implementiert ist. Wer nur das
    // Shell-Vokabular fragt, uebersieht genau diese Level.
    const erstes = cmd.pattern.trim().split(/\s+/)[0]?.toLowerCase();
    if (erstes && /^[a-z][a-z0-9_.-]*$/.test(erstes)) gezeigt.add(erstes);
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
 * Was der Sollpfad BRAUCHT — aus der Siegbedingung, nicht aus den Hinweisen.
 *
 * Die erste Fassung las die Anforderungen aus den Hinweisen. Damit verschwand
 * eine Anforderung, sobald man ihre letzte Erklaerung loeschte: eine
 * unangekuendigte `sha256sum`-Pflicht blieb unsichtbar. Die Hinweise sind jetzt
 * nur noch eine QUELLE VON SICHTBARKEIT, nie eine Quelle von Anforderungen.
 */
export function verlangteBefehle(ctx: TerminalContext): Set<string> {
  return new Set(
    anforderungenJeLoesung(ctx).flatMap((l) => l.liste.flatMap((a) => a.kandidaten))
  );
}

export interface Befund {
  eventId: string;
  titel: string;
  /** Verlangt, aber nirgends zu sehen — weder frueher noch hier. */
  unloesbar: string[];
  /** Neu und nur im Hinweis erklaert, nicht im Auftrag. */
  nurImHinweis: string[];
  /** Zielarten, die die Anforderungsableitung nicht deutet. Solange die
   *  dastehen, ist das Level UNGEPRUEFT, nicht sauber. */
  ungedeutet: string[];
  /** Anforderungen, deren einziger sichtbarer Kandidat im Labor nicht belegt
   *  werden konnte. Weder gruen noch rot — offen, und zwar sichtbar. */
  ungeprueft: string[];
}

export interface Routenlevel {
  event: GameEvent;
  /** Muss der Spieler dieses Level gespielt haben, bevor die naechsten kommen?
   *  Optionale Lektionen sind KEINE Pflichtvorgeschichte — was sie zeigen,
   *  darf ein spaeteres Level nicht voraussetzen. */
  pflicht: boolean;
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
  levelInReihenfolge: readonly Routenlevel[],
  vorwissen: Iterable<string> = []
): Routenbilanz {
  const bekannt = new Set<string>(vorwissen);
  const befunde: Befund[] = [];
  let terminalLevel = 0;

  for (const { event, pflicht } of levelInReihenfolge) {
    const ctx = event.terminalContext;
    if (!ctx) continue;
    terminalLevel++;

    const zeigt = gezeigteBefehle(ctx);
    const angesagt = angesagteBefehle(event, ctx);
    const imHinweis = hinweisBefehle(ctx);
    const wege = anforderungenJeLoesung(ctx);

    // Alles, was im Level SELBST zu sehen ist — abschreibbar.
    const sichtbar = new Set([...zeigt, ...angesagt, ...imHinweis]);
    const verfuegbar = (b: string) => bekannt.has(b) || sichtbar.has(b);

    // ODER zwischen den Loesungen: gemeldet wird der BESTE Weg. Gangbar heisst
    // — jede Anforderung hat einen verfuegbaren Kandidaten und keine Zielart
    // blieb ungedeutet. Gibt es keinen gangbaren, entscheidet der mit den
    // wenigsten Luecken, damit die Meldung den naechstliegenden Weg nennt.
    // Ein Kandidat, den das Labor nicht belegen konnte, traegt keine Aussage:
    // die Anforderung ist dann nicht erfuellt, sondern UNGEPRUEFT.
    const belegtVerfuegbar = (b: string) => verfuegbar(b) && !UNBELEGTE_KANDIDATEN.has(b);
    const bewertet = wege.map((weg) => ({
      weg,
      ungeprueft: weg.liste
        .filter((a) => !a.kandidaten.some(belegtVerfuegbar) && a.kandidaten.some(verfuegbar))
        .map((a) => a.was)
        .sort(),
      unloesbar: weg.liste.filter((a) => !a.kandidaten.some(verfuegbar)).map((a) => a.was).sort(),
      nurImHinweis: weg.liste
        .filter(
          (a) =>
            !a.kandidaten.some((k: string) => bekannt.has(k) || zeigt.has(k) || angesagt.has(k)) &&
            a.kandidaten.some((k: string) => imHinweis.has(k))
        )
        .map((a) => a.was)
        .sort(),
    }));
    const luecken = (b: (typeof bewertet)[number]) =>
      b.unloesbar.length + b.weg.ungedeutet.length + b.ungeprueft.length;
    const gangbar = bewertet.filter((b) => luecken(b) === 0);
    const beste = (gangbar.length > 0 ? gangbar : bewertet)
      .slice()
      .sort((a, b) => luecken(a) - luecken(b) || a.nurImHinweis.length - b.nurImHinweis.length)[0];

    const unloesbar = beste?.unloesbar ?? [];
    const nurImHinweis = beste?.nurImHinweis ?? [];
    const ungedeutet = beste?.weg.ungedeutet ?? [];
    const ungeprueft = beste?.ungeprueft ?? [];

    if (unloesbar.length || nurImHinweis.length || ungedeutet.length || ungeprueft.length) {
      befunde.push({ eventId: event.id, titel: event.title, unloesbar, nurImHinweis, ungedeutet, ungeprueft });
    }

    // Erst NACH der Pruefung lernen — und nur, wenn das Level Pflicht ist.
    //
    // Gelernt wird, was der Spieler GESEHEN hat, plus die Befehle, die er
    // zwangslaeufig getippt hat: eine Anforderung mit genau einem Kandidaten
    // laesst keine Wahl. Bei einer ODER-Anforderung („irgendwie schreiben")
    // waere das Gegenteil fatal — wer alle zwoelf Schreib-Kandidaten als
    // gelernt verbucht, haelt danach auch `sha256sum` fuer bekannt und
    // uebersieht genau die unangekuendigte Pflicht, die gefunden werden soll.
    if (pflicht) {
      for (const b of sichtbar) bekannt.add(b);
      // Gelernt wird nur aus dem Weg, den der Spieler realistisch geht.
      for (const a of beste?.weg.liste ?? []) {
        if (a.kandidaten.length === 1) bekannt.add(a.kandidaten[0]);
      }
    }
  }

  return { route, terminalLevel, befunde, vokabular: [...bekannt].sort() };
}
