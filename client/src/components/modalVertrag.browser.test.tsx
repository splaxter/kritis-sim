import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { CampaignSelectModal } from './CampaignSelectModal';
import { GameModeSelectModal } from './GameModeSelectModal';
import { NewGameSelectModal } from './NewGameSelectModal';
import { RunLeaveDialog } from './RunLeaveDialog';
import { SaveLoadModal } from './SaveLoadModal';

/**
 * Der Vertrag, den ein Modal einhalten muss — fuer ALLE Modale auf einmal.
 *
 * Das Haus ist tastatur-first, und CLAUDE.md sagt es ausdruecklich: „arrows/
 * Enter/Escape drive all menus and modals with focus traps". Bisher stand das
 * je Modal einzeln in dessen eigenem Test, und genau deshalb fiel nicht auf,
 * dass EINES den Vertrag gar nicht kennt.
 *
 * Die Lehre dahinter ist aelter als dieser Test (siehe die Listen mit
 * `role="listbox"` ohne Pfeiltasten): Ein Versprechen, das vier von fuenf
 * Stellen halten, faellt an der fuenften niemandem auf, solange jede Stelle
 * nur sich selbst prueft. Deshalb ist das hier eine Reihe ueber den Bestand
 * und kein weiterer Einzeltest.
 *
 * Geprueft werden die fuenf Punkte, an denen ein Tastaturnutzer haengenbleibt:
 *
 * 1. Es IST ein Dialog und hat einen Namen — sonst kuendigt die Hilfstechnik
 *    nichts an, und was dahinterliegt, bleibt im Baum stehen.
 * 2. Der Fokus landet DRIN. Sonst sitzt das Auge im Modal und die Tastatur im
 *    Menue dahinter.
 * 3. Tabulator laeuft im Kreis. Sonst verlaesst man das Modal, ohne es zu
 *    schliessen, und bedient blind weiter, was verdeckt ist.
 * 4. Escape schliesst.
 * 5. Der Fokus kommt zurueck, wo er herkam.
 */

interface Fall {
  name: string;
  /** Das Modal, mit einem `onClose`, das der Vertrag zurueckmelden muss. */
  bauen: (schliessen: () => void) => ReactElement;
  /** Der zugaengliche Name, unter dem der Dialog auffindbar sein muss. */
  nennt: RegExp;
}

const FAELLE: Fall[] = [
  {
    name: 'NewGameSelectModal',
    nennt: /Einsatzart/i,
    bauen: (schliessen) => (
      <NewGameSelectModal onSelectSimulation={() => {}} onSelectStory={() => {}} onClose={schliessen} />
    ),
  },
  {
    name: 'GameModeSelectModal',
    nennt: /Simulation/i,
    bauen: (schliessen) => <GameModeSelectModal onSelect={() => {}} onClose={schliessen} />,
  },
  {
    name: 'CampaignSelectModal',
    nennt: /Kampagne/i,
    bauen: (schliessen) => (
      <CampaignSelectModal playerId="spieler-1" onSelect={() => {}} onClose={schliessen} />
    ),
  },
  {
    name: 'RunLeaveDialog',
    nennt: /Hauptmen(ü|ue)|verlassen/i,
    // Der Dialog hat kein onClose: Escape heisst hier „bleiben".
    bauen: (schliessen) => <RunLeaveDialog onContinue={schliessen} onLeave={() => {}} />,
  },
  {
    name: 'SaveLoadModal',
    nennt: /laden|speichern/i,
    bauen: (schliessen) => (
      <SaveLoadModal mode="load" playerId="spieler-1" onLoad={() => {}} onClose={schliessen} />
    ),
  },
];

/** Der Knopf, von dem aus geoeffnet wurde — er muss den Fokus zurueckbekommen. */
function oeffnerSetzen(): HTMLButtonElement {
  const knopf = document.createElement('button');
  knopf.textContent = 'Oeffner';
  document.body.appendChild(knopf);
  knopf.focus();
  return knopf;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe.each(FAELLE.map((f) => [f.name, f] as const))('%s haelt den Modal-Vertrag', (_name, fall) => {
  it('ist ein Dialog mit Namen', () => {
    render(fall.bauen(() => {}));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal'), 'aria-modal fehlt').toBe('true');
    const name =
      dialog.getAttribute('aria-label') ??
      document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')?.textContent ??
      '';
    expect(name, `der Dialog hat keinen Namen (gefunden: "${name}")`).toMatch(fall.nennt);
  });

  it('der Fokus landet im Dialog, nicht dahinter', () => {
    const oeffner = oeffnerSetzen();
    render(fall.bauen(() => {}));
    const dialog = screen.getByRole('dialog');
    expect(
      dialog.contains(document.activeElement),
      'der Fokus steht noch auf dem Knopf dahinter — Auge im Modal, Tastatur im Menue'
    ).toBe(true);
    expect(document.activeElement).not.toBe(oeffner);
  });

  it('Tabulator laeuft im Kreis, statt hinauszufuehren', () => {
    oeffnerSetzen();
    render(fall.bauen(() => {}));
    const dialog = screen.getByRole('dialog');
    // Ein paar Runden reichen: Wer nach zehn Spruengen draussen ist, ist raus.
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(document.activeElement ?? window, { key: 'Tab' });
      expect(
        dialog.contains(document.activeElement),
        `nach ${i + 1} Tabulatorspruengen steht der Fokus ausserhalb des Dialogs`
      ).toBe(true);
    }
  });

  it('Escape schliesst', () => {
    const schliessen = vi.fn();
    render(fall.bauen(schliessen));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(schliessen).toHaveBeenCalled();
  });

  it('der Fokus kommt zurueck, wo er herkam', () => {
    const oeffner = oeffnerSetzen();
    const { unmount } = render(fall.bauen(() => {}));
    // Ohne diese Zeile besteht der Test aus dem falschen Grund: Ein Modal,
    // das den Fokus nie hereinholt, laesst ihn auf dem Oeffner stehen und
    // sieht damit aus, als haette es ihn sauber zurueckgegeben.
    expect(document.activeElement, 'der Fokus war nie drin').not.toBe(oeffner);
    unmount();
    expect(
      document.activeElement,
      'nach dem Schliessen steht der Fokus im Nirgendwo — der naechste Tabulator faengt oben an'
    ).toBe(oeffner);
  });
});

describe('Die Auswahlliste eines Modals ist auch fuer Hilfstechnik eine', () => {
  /**
   * Dieselbe Klasse wie bei den Listen im Windows-Level: Eine Zeile, die sich
   * beim Pfeildruck nur FAERBT, bewegt sich fuer eine Hilfstechnik nicht. Wer
   * nicht hinsieht, hoert bei jedem Pfeildruck dasselbe.
   */
  it('SaveLoadModal: die Pfeiltasten bewegen eine echte Auswahl', () => {
    render(<SaveLoadModal mode="load" playerId="spieler-1" onLoad={() => {}} onClose={() => {}} />);
    const liste = screen.getByRole('listbox');
    const zeilen = within(liste).getAllByRole('option');
    expect(zeilen.length, 'fuenf Speicherplaetze').toBe(5);
    expect(zeilen[0].getAttribute('aria-selected')).toBe('true');

    // Auf dem FOKUSSIERTEN Element tippen, nicht auf dem Fenster: Die
    // Pfeiltasten haengen an der Liste, damit ein Enter auf einem Knopf nicht
    // zusaetzlich den hervorgehobenen Platz ausloest. Ein `fireEvent` gegen
    // `window` steigt nicht zur Liste hinauf — ein Spieler tippt ohnehin dort,
    // wo der Fokus steht.
    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(
      within(liste).getAllByRole('option')[1].getAttribute('aria-selected'),
      'nach dem Pfeildruck ist die zweite Zeile ausgewaehlt'
    ).toBe('true');
    expect(within(liste).getAllByRole('option')[0].getAttribute('aria-selected')).toBe('false');
  });
});

describe('SaveLoadModal — die Aktionen haengen an der Auswahl', () => {
  /**
   * Die Knoepfe lagen frueher IN den Zeilen. Das war fuer die Maus bequem und
   * fuer die Tastatur teuer: Fuenf Zeilen mal zwei Knoepfe sind zehn
   * Tabstopps, und ein `option` darf gar keine Bedienelemente enthalten. Jetzt
   * gibt es eine Stelle, die auf den ausgewaehlten Platz wirkt — und die
   * Beschriftung nennt ihn, damit niemand raten muss, worauf er drueckt.
   */
  /** Ein Stand in Slot 2 — in der Form, die `useSaveLoad` wirklich ablegt. */
  const standSchreiben = (spieler: string) => {
    localStorage.setItem(`kritis_saves_${spieler}`, JSON.stringify([
      {
        id: `${spieler}-2`,
        slot: 2,
        current_week: 4,
        stress: 35,
        updated_at: '2026-03-14T09:00:00.000Z',
        gameState: { currentWeek: 4, currentDay: 2, score: 120 },
      },
    ]));
  };

  it('die Beschriftung folgt der Auswahl', () => {
    localStorage.clear();
    standSchreiben('spieler-1');
    render(<SaveLoadModal mode="load" playerId="spieler-1" onLoad={() => {}} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: /Slot 1 laden/ }).hasAttribute('disabled'), 'Slot 1 ist leer').toBe(true);
    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    const laden = screen.getByRole('button', { name: /Slot 2 laden/ });
    expect(laden.hasAttribute('disabled'), 'Slot 2 traegt einen Stand').toBe(false);
  });

  it('Enter auf der Zeile laedt denselben Platz wie der Knopf', async () => {
    localStorage.clear();
    standSchreiben('spieler-2');
    const onLoad = vi.fn();
    render(<SaveLoadModal mode="load" playerId="spieler-2" onLoad={onLoad} onClose={() => {}} />);

    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement ?? window, { key: 'Enter' });
    // Das Laden laeuft ueber einen Versprechen-Pfad — abwarten, statt im
    // selben Zug zu pruefen.
    await vi.waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
  });

  it('Enter auf einem Knopf loest NICHT zusaetzlich den ausgewaehlten Platz aus', () => {
    // Frueher lag Enter am Fenster. Mit einem Fokus im Modal — den es jetzt
    // gibt — haette jeder Enter zweimal gewirkt: einmal der Knopf, einmal die
    // Auswahl.
    localStorage.clear();
    standSchreiben('spieler-3');
    const onClose = vi.fn();
    render(<SaveLoadModal mode="load" playerId="spieler-3" onLoad={() => {}} onClose={onClose} />);

    const schliessen = screen.getByRole('button', { name: /Schließen/ });
    schliessen.focus();
    fireEvent.keyDown(schliessen, { key: 'Enter' });
    fireEvent.click(schliessen);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
