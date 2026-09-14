import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalContext, GameEvent } from '@kritis/shared';
import { Terminal } from './index';
import { katasterStoryEvents } from '../../content/campaigns/kataster/events';
import { auditTrailStoryEvents } from '../../content/campaigns/audit-trail/events';

vi.mock('@xterm/xterm', async () => ({ Terminal: (await import('./testHarness')).terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', async () => ({ FitAddon: (await import('./testHarness')).terminalMock.FitAddon }));

/**
 * Ein Auftrag, der hinter einer stillen Scrollkante endet, ist kein Auftrag.
 *
 * Zweimal hintereinander lag hier eine feste Zahl: `max-h-28` war fuer den
 * damals laengsten Auftrag gemessen und zu klein fuer das Berichtsschema,
 * `max-h-48` war dafuer gemessen und zu klein fuer die Schreibanleitung in
 * DAS KATASTER — auf 320 px 316 px Inhalt in 191 px sichtbarer Hoehe, das
 * Beispiel `echo "Zeile" >> pfad` vollstaendig unter der Kante. Beide Male war
 * der Text im DOM und beide Male hat ihn niemand gesehen.
 *
 * Die Regel ist deshalb nicht mehr "es passt schon", sondern: entweder steht
 * alles da, oder es gibt einen sichtbaren Knopf. Was jsdom NICHT kann, ist
 * messen — echte Hoehen misst `e2e/aufgabenfeld.spec.ts` im Browser. Hier wird
 * der Mechanismus geprueft, mit gestellter Geometrie.
 */

/** Gestellte Geometrie: jsdom liefert fuer beides 0. */
const hoehen = { scroll: 0, client: 0 };
function stelleGeometrie() {
  for (const eigenschaft of ['scrollHeight', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, eigenschaft, {
      configurable: true,
      get(this: HTMLElement) {
        if (this.dataset?.testid !== 'aufgabentext') return 0;
        return eigenschaft === 'scrollHeight' ? hoehen.scroll : hoehen.client;
      },
    });
  }
}

const basis: TerminalContext = {
  type: 'linux',
  hostname: 'srv-test',
  username: 'timo',
  currentPath: '/home/timo',
  hints: [],
  commands: [],
  solutions: [],
};

const zeichne = (taskText: string) =>
  render(
    <Terminal
      context={{ ...basis, taskText }}
      onSolved={() => {}}
      onCancel={() => {}}
      onFlagsSet={() => {}}
    />
  );

beforeEach(() => {
  hoehen.scroll = 0;
  hoehen.client = 0;
  stelleGeometrie();
});

afterEach(() => {
  for (const eigenschaft of ['scrollHeight', 'clientHeight'] as const) {
    Reflect.deleteProperty(HTMLElement.prototype, eigenschaft);
  }
});

describe('Aufgabenfeld — nichts verschwindet stillschweigend', () => {
  it('zeigt keinen Knopf, wenn der Auftrag ohnehin ganz dasteht', () => {
    hoehen.scroll = 120;
    hoehen.client = 120;
    zeichne('Kurzer Auftrag.');
    expect(screen.queryByRole('button', { name: /Ganze Aufgabe/ })).not.toBeInTheDocument();
  });

  it('kuendigt verborgenen Text an, statt ihn zu verstecken', () => {
    hoehen.scroll = 316;
    hoehen.client = 191; // die gemeldeten Werte von 320x568
    zeichne('Zeile eins\n\nSchreiben ohne Editor: echo "Zeile" >> pfad');
    expect(screen.getByRole('button', { name: /Ganze Aufgabe anzeigen/ })).toBeVisible();
  });

  it('der Hinweis auf verborgenen Text steht AUSSERHALB des Scrollbereichs', () => {
    // Sonst waere der Knopf selbst das Erste, was hinter der Kante liegt.
    hoehen.scroll = 316;
    hoehen.client = 191;
    zeichne('Ein langer Auftrag.');
    const knopf = screen.getByRole('button', { name: /Ganze Aufgabe anzeigen/ });
    const scrollbereich = screen.getByTestId('aufgabentext');
    expect(scrollbereich.contains(knopf)).toBe(false);
  });

  it('das Aufklappen hebt die Kante auf und laesst sich zuruecknehmen', () => {
    hoehen.scroll = 316;
    hoehen.client = 191;
    zeichne('Ein langer Auftrag.');
    const feld = screen.getByTestId('aufgabentext');
    expect(feld.style.maxHeight, 'eingeklappt gedeckelt').not.toBe('');

    hoehen.client = 316; // aufgeklappt misst der Browser die volle Hoehe
    fireEvent.click(screen.getByRole('button', { name: /Ganze Aufgabe anzeigen/ }));
    expect(screen.getByTestId('aufgabentext').style.maxHeight, 'aufgeklappt ohne Deckel').toBe('');
    const zurueck = screen.getByRole('button', { name: /einklappen/ });
    expect(zurueck).toHaveAttribute('aria-expanded', 'true');

    hoehen.client = 191;
    fireEvent.click(zurueck);
    expect(screen.getByTestId('aufgabentext').style.maxHeight).not.toBe('');
  });
});

/** Die beiden Auftraege, die in dieser Runde laenger geworden sind. */
function auftrag(events: GameEvent[], id: string): string {
  const text = events.find((e) => e.id === id)?.terminalContext?.taskText;
  if (!text) throw new Error(`${id} hat keinen taskText — Test veraltet?`);
  return text;
}

describe('Die geaenderten Auftraege gehen durch denselben Weg', () => {
  it.each([
    ['kt_l1_ordner', auftrag(katasterStoryEvents, 'kt_l1_ordner')],
    ['at_l2_inventory', auftrag(auditTrailStoryEvents, 'at_l2_inventory')],
  ])('%s steht vollstaendig im Feld', (_id, text) => {
    hoehen.scroll = 280;
    hoehen.client = 280;
    zeichne(text);
    const feld = screen.getByTestId('aufgabentext');
    // Kein Wort des Auftrags landet ausserhalb des Feldes, und die
    // Schreibanleitung ist Teil davon.
    expect(feld.textContent).toBe(text);
    expect(feld.textContent).toContain('>>');
    expect(screen.queryByRole('button', { name: /Ganze Aufgabe/ })).not.toBeInTheDocument();
  });
});
