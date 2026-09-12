import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext, MeldungState } from '@kritis/shared';
import { WindowsLevel } from './index';
import { missingRequired } from './apps/Meldung';

const baseState: MeldungState = {
  stufe: 'erst',
  kenntnisSeit: '03:14 h',
  empfaenger: 'Gemeinsame Meldestelle des BSI und des BBK',
  rechtsgrundlage: '§ 32 Abs. 1 BSIG — Erstmeldung',
  felder: [
    {
      id: 'kenntnis',
      label: 'Zeitpunkt der Kenntnisnahme',
      kind: 'text',
      required: true,
      hint: 'Der Moment, in dem IHR es wusstet — nicht der Beginn des Vorfalls.',
    },
    {
      id: 'art',
      label: 'Art des Vorfalls',
      kind: 'select',
      required: true,
      options: [
        { id: 'ransomware', label: 'Verschlüsselung / Ransomware' },
        { id: 'ausfall', label: 'Ausfall ohne erkennbare Fremdeinwirkung' },
      ],
    },
    {
      id: 'systeme',
      label: 'Betroffene Dienste und Systeme',
      kind: 'multiselect',
      options: [
        { id: 'fs_dispo', label: 'Dateiserver Disposition' },
        { id: 'mail', label: 'Mailserver' },
      ],
    },
    { id: 'boeswillig', label: 'Verdacht auf rechtswidrige oder böswillige Handlung', kind: 'tristate' },
    { id: 'grenz', label: 'Grenzüberschreitende Auswirkungen', kind: 'tristate' },
    { id: 'bewertung', label: 'Erstbewertung', kind: 'longtext' },
  ],
};

function makeContext(overrides: Partial<GuiContext> = {}): GuiContext {
  return {
    app: 'meldung',
    title: 'Meldung an die Meldestelle',
    hostname: 'warm-adm-01',
    state: { meldung: baseState },
    solutions: [
      {
        interactions: ['set:grenz:unbekannt', 'submit'],
        allRequired: true,
        resultText: 'Fristgerecht und ohne erfundene Gewissheit.',
        skillGain: { security: 5 },
      },
    ],
    hints: ['Was weißt du nach drei Stunden wirklich?'],
    ...overrides,
  };
}

describe('missingRequired — rein, ohne DOM', () => {
  it('meldet leere, fehlende und nur aus Leerzeichen bestehende Pflichtfelder', () => {
    expect(missingRequired(baseState.felder, {})).toEqual(['kenntnis', 'art']);
    expect(missingRequired(baseState.felder, { kenntnis: '   ', art: 'ransomware' })).toEqual(['kenntnis']);
    expect(missingRequired(baseState.felder, { kenntnis: '17:40', art: 'ransomware' })).toEqual([]);
  });

  it('eine leere Mehrfachauswahl zaehlt als leer, wenn sie Pflicht ist', () => {
    const felder = [{ id: 'm', label: 'M', kind: 'multiselect' as const, required: true, options: [] }];
    expect(missingRequired(felder, { m: [] })).toEqual(['m']);
    expect(missingRequired(felder, { m: ['a'] })).toEqual([]);
  });
});

describe('WindowsLevel — Meldeformular', () => {
  it('zeigt Rechtsgrundlage, Empfaenger und die erzaehlte Uhr', () => {
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    expect(screen.getByText('§ 32 Abs. 1 BSIG — Erstmeldung')).toBeInTheDocument();
    // Der haeufigste Irrtum: die Meldung geht NICHT nur ans BSI.
    expect(screen.getByText(/Gemeinsame Meldestelle des BSI und des BBK/)).toBeInTheDocument();
    expect(screen.getByText(/Kenntnis seit 03:14 h/)).toBeInTheDocument();
  });

  /**
   * DER VERTRAGSTEST. Eine erfundene Gewissheit („nein") muss im Formular exakt
   * aussehen wie eine belegte Angabe — sonst nimmt die UI dem Spieler die
   * Entscheidung ab, um die der ganze Track geht.
   */
  it('„nein" und „noch unbekannt" werden gleichwertig angeboten', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={makeContext()} onSolved={vi.fn()} onCancel={() => {}} />);

    const gruppe = screen.getByRole('radiogroup', { name: /Grenzueberschreitende|Grenzüberschreitende/ });
    const nein = within(gruppe).getByRole('radio', { name: 'nein' });
    const unbekannt = within(gruppe).getByRole('radio', { name: 'noch unbekannt' });

    // Keiner ist vorausgewaehlt — das Formular empfiehlt nichts.
    expect(nein).not.toBeChecked();
    expect(unbekannt).not.toBeChecked();
    // Gleiche Rolle, gleicher Zustand, kein Warnhinweis am falschen Wert.
    expect(nein.tagName).toBe(unbekannt.tagName);

    await user.click(nein);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/unbelegt|ohne Grundlage|Achtung/i)).not.toBeInTheDocument();
  });

  it('weist eine unvollstaendige Meldung zurueck, ohne sie zu senden', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={makeContext()} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    // Auf die Meldung selbst zielen: der Feldname steht auch am Eingabefeld.
    const hinweis = screen.getByText(/nimmt das so nicht an/);
    expect(hinweis).toHaveTextContent('Zeitpunkt der Kenntnisnahme');
    expect(hinweis).toHaveTextContent('Art des Vorfalls');
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('loest aus, wenn Pflichtfelder stehen und die Antwort ehrlich ist', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={makeContext()} onSolved={onSolved} onCancel={() => {}} />);

    await user.type(screen.getByLabelText(/Zeitpunkt der Kenntnisnahme/), '17:40');
    await user.selectOptions(screen.getByLabelText(/Art des Vorfalls/), 'ransomware');
    const gruppe = screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe).getByRole('radio', { name: 'noch unbekannt' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    await waitFor(() => expect(onSolved).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  /**
   * Formularfelder sind Zustaende, keine Ereignisse: eine korrigierte Angabe
   * darf nicht weiterzaehlen. Genau der Fehler, den das Kataster-Review fand.
   */
  it('eine korrigierte Antwort zaehlt nicht mehr mit', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    const ctx = makeContext({
      solutions: [
        {
          interactions: ['set:grenz:nein', 'submit'],
          allRequired: true,
          resultText: 'Behauptet.',
          skillGain: {},
        },
      ],
    });
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    const gruppe = screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe).getByRole('radio', { name: 'nein' }));
    await user.click(within(gruppe).getByRole('radio', { name: 'noch unbekannt' }));

    await user.type(screen.getByLabelText(/Zeitpunkt der Kenntnisnahme/), '17:40');
    await user.selectOptions(screen.getByLabelText(/Art des Vorfalls/), 'ransomware');
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    await new Promise((r) => setTimeout(r, 2200));
    expect(onSolved, 'zurueckgenommenes „nein" darf die Falle nicht ausloesen').not.toHaveBeenCalled();
  });

  it('zeigt den Vorbefund der frueheren Stufe read-only an', () => {
    const ctx = makeContext({
      state: {
        meldung: {
          ...baseState,
          stufe: 'folge',
          rechtsgrundlage: '§ 32 Abs. 1 BSIG — Folgemeldung',
          vorbefund: [{ label: 'Grenzüberschreitende Auswirkungen', value: 'nein' }],
        },
      },
    });
    render(<WindowsLevel context={ctx} onSolved={vi.fn()} onCancel={() => {}} />);

    expect(screen.getByText('Das habt ihr bereits gemeldet')).toBeInTheDocument();
    expect(screen.getByText(/Grenzüberschreitende Auswirkungen: nein/)).toBeInTheDocument();
  });
});
