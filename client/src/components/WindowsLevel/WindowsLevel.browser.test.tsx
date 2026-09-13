import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const context: GuiContext = {
  app: 'taskmanager',
  title: 'Task-Manager',
  hostname: 'WS-TEST',
  state: {
    taskManager: {
      processes: [
        { name: 'svchost.exe', pid: 980, cpu: 2, memoryMb: 142, description: 'System', critical: true },
        { name: 'explorer.exe', pid: 3104, cpu: 1, memoryMb: 188, description: 'Explorer' },
        { name: 'rogue-miner.exe', pid: 7341, cpu: 94, memoryMb: 856, description: 'Unbekannt' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['endtask:rogue-miner.exe'],
      allRequired: true,
      resultText: 'Krypto-Miner beendet.',
      skillGain: { windows: 6, security: 4 },
    },
  ],
  hints: ['Welcher Prozess zieht 94% CPU?'],
};

installFakeTimers();

describe('WindowsLevel — Task Manager', () => {
  it('solves when the rogue process is selected and ended', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    // The fake app renders its processes.
    expect(screen.getByText('rogue-miner.exe')).toBeInTheDocument();

    // Select the rogue process, then end it.
    await user.click(screen.getByText('rogue-miner.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Success overlay appears immediately; onSolved fires after a short delay.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith({ windows: 6, security: 4 }, undefined);
  });

  it('refuses to end a critical system process and does not solve', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('svchost.exe'));
    await user.click(screen.getByRole('button', { name: /task beenden/i }));

    // Access-denied message shown, process still listed, level not solved.
    expect(screen.getByText(/kritischer Windows-Prozess/i)).toBeInTheDocument();
    expect(screen.getByText('svchost.exe')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('reveals hints on demand', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);

    expect(screen.queryByText(/94% CPU/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Hinweis/i }));
    expect(screen.getByText(/94% CPU/i)).toBeInTheDocument();
  });
});

/**
 * Issue #5: der erste Griff eines Admins ist „nach CPU sortieren". Vorher gab
 * es das nicht, und der auffaellige Prozess konnte unter dem Falz liegen.
 *
 * Die Sortierung ist ANSICHT: sie aendert keinen Zustand, emittiert nichts und
 * verraet beim Oeffnen nichts.
 */
describe('Task Manager — sortierbare Spalten', () => {
  // Strukturell statt per Regex: textContent haengt Name, Beschreibung und
  // Zahlen ohne Trenner aneinander („svchost.exeSystem9802"), und zwischen
  // „exe" und „System" steht kein Zeichen, an dem sich schneiden liesse.
  // Der Name ist das erste verschachtelte span der Zeile.
  const namenInReihenfolge = () =>
    screen.getAllByRole('option').map((el) => el.querySelector('span span')?.textContent);

  it('startet in der gelieferten Reihenfolge — der Taeter liegt nicht obenauf', () => {
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);
    expect(namenInReihenfolge()).toEqual(['svchost.exe', 'explorer.exe', 'rogue-miner.exe']);
    // Unsortiert laden die Koepfe zum Sortieren ein, statt einen Zustand zu melden.
    expect(screen.getByRole('button', { name: 'Nach CPU sortieren' })).toBeInTheDocument();
  });

  it('CPU-Klick sortiert absteigend und holt den Ausreisser nach oben', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /CPU/ }));

    expect(namenInReihenfolge()).toEqual(['rogue-miner.exe', 'svchost.exe', 'explorer.exe']);
    // Der Zustand steht im ZUGAENGLICHEN NAMEN, nicht in einer Tabellenrolle
    // ohne Tabelle — und die Live-Region sagt den Wechsel an.
    expect(screen.getByRole('button', { name: /CPU — sortiert absteigend/ })).toBeInTheDocument();
    expect(screen.getByText('Sortiert nach CPU, absteigend')).toBeInTheDocument();
  });

  it('ein zweiter Klick dreht die Richtung um', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /CPU/ }));
    await user.click(screen.getByRole('button', { name: /CPU/ }));

    expect(namenInReihenfolge()).toEqual(['explorer.exe', 'svchost.exe', 'rogue-miner.exe']);
    expect(screen.getByRole('button', { name: /CPU — sortiert aufsteigend/ })).toBeInTheDocument();
    expect(screen.getByText('Sortiert nach CPU, aufsteigend')).toBeInTheDocument();
  });

  it('Namen sortieren zuerst aufsteigend, Zahlen zuerst absteigend', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(namenInReihenfolge()).toEqual(['explorer.exe', 'rogue-miner.exe', 'svchost.exe']);
  });

  /** Sortieren ist keine Entscheidung — es darf kein Level loesen. */
  it('sortieren loest nichts aus', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /CPU/ }));
    await user.click(screen.getByRole('button', { name: /Arbeitsspeicher/ }));
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  /** Die Sortierung ist eine Ansicht: „Task beenden" muss danach normal gehen. */
  it('nach dem Sortieren laesst sich der richtige Prozess weiterhin beenden', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /CPU/ }));
    await user.click(screen.getByText('rogue-miner.exe'));
    await user.click(screen.getByRole('button', { name: /Task beenden/i }));

    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(namenInReihenfolge()).not.toContain('rogue-miner.exe');
  });
});

/**
 * Aus dem Review zu PR #16: role="row"/"columnheader" verlangen einen Tabellen-
 * kontext. Die Prozesse sind eine listbox — die Rollen haetten Beziehungen
 * behauptet, die es nicht gibt.
 */
describe('Task Manager — keine vorgetaeuschten Tabellenrollen', () => {
  it('es gibt weder columnheader noch row noch table', () => {
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    // Die Liste bleibt, was sie ist.
    expect(screen.getByRole('listbox', { name: 'Prozesse' })).toBeInTheDocument();
  });

  it('jeder Spaltenkopf ist ein Button mit sprechendem Namen', () => {
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);
    for (const label of ['Name', 'PID', 'CPU', 'Arbeitsspeicher']) {
      expect(screen.getByRole('button', { name: `Nach ${label} sortieren` })).toBeInTheDocument();
    }
  });
});
