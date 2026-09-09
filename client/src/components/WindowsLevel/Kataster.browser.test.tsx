import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext, KatasterState } from '@kritis/shared';
import { WindowsLevel } from './index';
import { deriveRowState } from './apps/Kataster';

const baseState: KatasterState = {
  title: 'Pflichtenkataster WARM — Stand 09/2026',
  entries: [
    {
      id: 'sla_bericht',
      source: 'SLA Komm.ONE §4',
      duty: 'Monatlichen Verfügbarkeitsbericht prüfen',
      sourceExcerpt: 'Verfügbarkeit 99,5 % im Monatsmittel. Der Auftragnehmer stellt monatlich einen Verfügbarkeitsbericht bereit.',
    },
    {
      id: 'lizenznachweis',
      source: 'Rahmenvertrag Lizenzen §9',
      duty: 'Lizenzbelegung jährlich nachweisen',
      note: 'Vertrag vom Einkauf geschlossen',
    },
    {
      id: 'notfallhandbuch',
      source: 'Dienstvereinbarung Protokollierung §7',
      duty: 'Notfallhandbuch fortschreiben',
    },
    {
      id: 'altbestand',
      source: 'Kalb-Ordner',
      duty: 'USV-Batterietausch',
      owner: 'henry',
      cycle: 'jaehrlich',
      evidenceId: 'usv_protokoll',
      locked: true,
    },
  ],
  people: [
    { id: 'henry', name: 'Henry Bartels', role: 'Systemtechnik' },
    { id: 'bjorg', name: 'Bjorg Jörgensen', role: 'IT-Betrieb', unconfirmed: true },
    { id: 'it_abteilung', name: 'IT-Abteilung', role: 'Sammelzuweisung', isGroup: true },
  ],
  evidence: [
    { id: 'bericht_07', label: 'Verfügbarkeitsbericht 07/2026', date: '05.08.2026', forEntry: 'sla_bericht' },
    { id: 'usv_protokoll', label: 'USV-Prüfprotokoll', date: '11.03.2026', forEntry: 'altbestand' },
  ],
  findings: [
    {
      id: 'info_postfach',
      source: 'Mailexport info@',
      duty: 'Sammelpostfach arbeitstäglich sichten',
      excerpt: 'Eingang vom 24.06.2026, ungelesen.',
    },
    {
      id: 'hersteller_flyer',
      source: 'Herstellerbroschüre Athos',
      duty: 'Quartalsweise Security-Reviews durchführen',
      excerpt: 'Wir empfehlen quartalsweise Reviews.',
      decoy: true,
      riskFeedback: 'Eine Empfehlung des Herstellers ist keine Pflicht.',
    },
  ],
};

function makeContext(overrides: Partial<GuiContext> = {}): GuiContext {
  return {
    app: 'kataster',
    title: 'Pflichtenkataster',
    hostname: 'warm-adm-01',
    state: { kataster: baseState },
    solutions: [
      {
        interactions: ['gap:notfallhandbuch'],
        allRequired: true,
        resultText: 'Lücke ehrlich vermerkt.',
        skillGain: { security: 4 },
      },
    ],
    hints: ['Was hat keinen Aufpasser?'],
    ...overrides,
  };
}

const row = (name: RegExp) => screen.getByRole('option', { name });

describe('deriveRowState — die Ampel wird abgeleitet, nie geseedet', () => {
  it('kennt alle vier Zustände', () => {
    expect(deriveRowState({ id: 'a', source: 's', duty: 'd' })).toBe('orphan');
    expect(deriveRowState({ id: 'a', source: 's', duty: 'd', owner: 'henry' })).toBe('claimed');
    expect(
      deriveRowState({ id: 'a', source: 's', duty: 'd', owner: 'henry', cycle: 'jaehrlich' })
    ).toBe('claimed');
    expect(
      deriveRowState({
        id: 'a', source: 's', duty: 'd', owner: 'henry', cycle: 'jaehrlich', evidenceId: 'x',
      })
    ).toBe('proven');
    expect(deriveRowState({ id: 'a', source: 's', duty: 'd', gap: true })).toBe('gap');
  });

  it('eine gemeldete Lücke bleibt eine Lücke, auch mit Aufpasser und Nachweis', () => {
    expect(
      deriveRowState({
        id: 'a', source: 's', duty: 'd', gap: true,
        owner: 'henry', cycle: 'jaehrlich', evidenceId: 'x',
      })
    ).toBe('gap');
  });
});

describe('WindowsLevel — Pflichtenkataster', () => {
  it('rendert die Kopfzeile mit den Zählern', () => {
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);
    expect(screen.getByText(/Pflichtenkataster WARM/)).toBeInTheDocument();
    // 4 Zeilen: 3 verwaist, 1 belegt (der gesperrte Altbestand).
    expect(screen.getByText(/3 ohne Aufpasser/)).toBeInTheDocument();
    expect(screen.getByText(/0 ohne Nachweis/)).toBeInTheDocument();
  });

  it('aktualisiert die Zähler, wenn ein Aufpasser gesetzt wird', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(within(row(/Monatlichen Verfügbarkeitsbericht/)).getByRole('button', { name: /Aufpasser/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Henry Bartels/ }));

    expect(screen.getByText(/2 ohne Aufpasser/)).toBeInTheDocument();
    expect(screen.getByText(/1 ohne Nachweis/)).toBeInTheDocument();
  });

  /**
   * THE CONTRACT TEST. If this ever "fails" because someone made the UI warn
   * about groups or unconfirmed people, the campaign is broken, not the test:
   * the player must NOT be able to see that an assignment is fabricated. Only
   * the audit sample exposes it (via the level's GuiSolution).
   */
  it('eine Gruppe als Aufpasser sieht exakt aus wie eine echte Person', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    const target = row(/Lizenzbelegung/);
    await user.click(within(target).getByRole('button', { name: /Aufpasser/ }));
    await user.click(await screen.findByRole('menuitem', { name: /IT-Abteilung/ }));
    await user.click(within(row(/Lizenzbelegung/)).getByRole('button', { name: /Turnus/ }));
    await user.click(await screen.findByRole('menuitem', { name: /^jährlich$/ }));
    await user.click(within(row(/Lizenzbelegung/)).getByRole('button', { name: /Nachweis/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Verfügbarkeitsbericht 07/ }));

    // Grün. Keine Warnung, kein Hinweis, kein Unterschied zu Henry.
    expect(row(/Lizenzbelegung.*BELEGT/)).toBeInTheDocument();
    expect(screen.queryByText(/Gruppe/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dasselbe gilt für eine Person, die nie zugesagt hat', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(within(row(/Lizenzbelegung/)).getByRole('button', { name: /Aufpasser/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Bjorg/ }));

    expect(row(/Lizenzbelegung.*BEHAUPTET/)).toBeInTheDocument();
    expect(screen.queryByText(/nicht bestätigt/i)).not.toBeInTheDocument();
  });

  it('emittiert je Interaktion genau ein Token und löst über die Lücke', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={makeContext()} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(within(row(/Notfallhandbuch/)).getByRole('button', { name: /Als Lücke melden/ }));

    expect(screen.getByText(/Lücke ehrlich vermerkt/)).toBeInTheDocument();
    // Der Solve-Callback feuert erst nach SOLVE_DELAY_MS (1600 ms) — waitFor
    // braucht ein Timeout darüber (Konvention der Geschwister-Tests).
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ security: 4 }, undefined), {
      timeout: 3000,
    });
  });

  it('zeigt den Quellentext, wenn eine Zeile gewählt wird', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    expect(screen.queryByRole('region', { name: 'Quellentext' })).not.toBeInTheDocument();
    await user.click(row(/Monatlichen Verfügbarkeitsbericht/));
    expect(screen.getByRole('region', { name: 'Quellentext' })).toHaveTextContent(/99,5 %/);
  });

  it('nimmt einen Fund als neue Zeile auf', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    expect(screen.getByText(/4 Pflichten/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ins Kataster aufnehmen: Sammelpostfach/ }));

    expect(screen.getByText(/5 Pflichten/)).toBeInTheDocument();
    expect(row(/Sammelpostfach.*VERWAIST/)).toBeInTheDocument();
  });

  it('weist einen Köder ab: eine Empfehlung ist keine Pflicht', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Ins Kataster aufnehmen: Quartalsweise/ }));

    expect(screen.getByText(/Empfehlung des Herstellers ist keine Pflicht/)).toBeInTheDocument();
    expect(screen.getByText(/4 Pflichten/)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Quartalsweise Security-Reviews/ })).not.toBeInTheDocument();
  });

  it('eine gesperrte Zeile lässt sich nicht verändern', () => {
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);
    const locked = row(/USV-Batterietausch/);
    expect(within(locked).getByRole('button', { name: /Aufpasser/ })).toBeDisabled();
    expect(within(locked).getByRole('button', { name: /Als Lücke melden/ })).toBeDisabled();
  });

  it('navigiert die Zeilen per Pfeiltasten (Roving Tabindex)', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    const first = row(/Monatlichen Verfügbarkeitsbericht/);
    first.focus();
    expect(first).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(row(/Lizenzbelegung/)).toHaveFocus();
    await user.keyboard('{End}');
    expect(row(/USV-Batterietausch/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(row(/Monatlichen Verfügbarkeitsbericht/)).toHaveFocus();
  });

  /** Risiko vor Lob: bei gemischtem Spiel gewinnt die zuerst gelistete Lösung. */
  it('die zuerst gelistete (Fabrication-)Lösung gewinnt bei gemischtem Spiel', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    const context = makeContext({
      solutions: [
        {
          interactions: ['owner:lizenznachweis:it_abteilung'],
          allRequired: true,
          setsFlags: ['kat_owner_fabricated'],
          resultText: 'Grid grün — aber die Zeile hält keiner Stichprobe stand.',
          skillGain: {},
        },
        {
          interactions: ['gap:notfallhandbuch'],
          allRequired: true,
          setsFlags: ['kat_no_silent_orphan'],
          resultText: 'Ehrlich vermerkt.',
          skillGain: { security: 4 },
        },
      ],
    });
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(within(row(/Lizenzbelegung/)).getByRole('button', { name: /Aufpasser/ }));
    await user.click(await screen.findByRole('menuitem', { name: /IT-Abteilung/ }));

    expect(screen.getByText(/keiner Stichprobe stand/)).toBeInTheDocument();
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({}, ['kat_owner_fabricated']), {
      timeout: 3000,
    });
  });
});
