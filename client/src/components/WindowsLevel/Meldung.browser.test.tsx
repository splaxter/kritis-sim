import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';
import { GuiContext, MeldungState } from '@kritis/shared';
import { WindowsLevel } from './index';
import { missingRequired } from './apps/Meldung';

const baseState: MeldungState = {
  stufe: 'erst',
  kenntnisSeit: '03:14 h',
  meldestelle: 'Gemeinsame Meldestelle des BSI und des BBK',
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

installFakeTimers();

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
    const user = fakeTimerUser();
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
    const user = fakeTimerUser();
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
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={makeContext()} onSolved={onSolved} onCancel={() => {}} />);

    await user.type(screen.getByLabelText(/Zeitpunkt der Kenntnisnahme/), '17:40');
    await user.selectOptions(screen.getByLabelText(/Art des Vorfalls/), 'ransomware');
    const gruppe = screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe).getByRole('radio', { name: 'noch unbekannt' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    expect(onSolved, 'erst nach der Verweildauer').not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
  });

  /**
   * Formularfelder sind Zustaende, keine Ereignisse: eine korrigierte Angabe
   * darf nicht weiterzaehlen. Genau der Fehler, den das Kataster-Review fand.
   */
  it('eine korrigierte Antwort zaehlt nicht mehr mit', async () => {
    const user = fakeTimerUser();
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

    // Ueber die Verweildauer hinaus vorspulen: was jetzt nicht gefeuert hat,
    // feuert nie. Vorher wurde das mit 2,2 s echter Wartezeit "belegt".
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
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

/**
 * Aus dem Review zu PR #14: ein einmal abgeschicktes `submit` blieb in
 * `performed` stehen (der Verlauf ist append-only). Eine spaetere Feldaenderung
 * konnte das Level danach ohne erneutes Absenden loesen — sogar mit einem
 * inzwischen leeren Pflichtfeld. `submit` ist ein EREIGNIS, kein Zustand.
 */
describe('Meldeformular — ein gespeichertes submit gilt nicht weiter', () => {
  /** Loesung, die erst durch eine SPAETERE Feldaenderung vollstaendig wird. */
  const fallenContext = () =>
    makeContext({
      solutions: [
        {
          interactions: ['set:grenz:nein', 'submit'],
          allRequired: true,
          resultText: 'Behauptet.',
          skillGain: {},
        },
      ],
    });

  const pflichtfelderFuellen = async (user: ReturnType<typeof fakeTimerUser>) => {
    await user.type(screen.getByLabelText(/Zeitpunkt der Kenntnisnahme/), '17:40');
    await user.selectOptions(screen.getByLabelText(/Art des Vorfalls/), 'ransomware');
  };

  it('eine Feldaenderung nach dem Absenden loest NICHT ohne erneutes Absenden', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={fallenContext()} onSolved={onSolved} onCancel={() => {}} />);

    await pflichtfelderFuellen(user);
    // Abschicken mit einer Angabe, die KEINE Loesung trifft.
    const gruppe = () => screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe()).getByRole('radio', { name: 'ja' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    // Jetzt die Angabe auf den Fallenwert aendern — ohne erneut abzuschicken.
    await user.click(within(gruppe()).getByRole('radio', { name: 'nein' }));

    // Ueber die Verweildauer hinaus vorspulen: was jetzt nicht gefeuert hat,
    // feuert nie. Vorher wurde das mit 2,2 s echter Wartezeit "belegt".
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
    expect(onSolved, 'geloest ohne abzuschicken').not.toHaveBeenCalled();
  });

  it('… erst das erneute Absenden loest aus', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={fallenContext()} onSolved={onSolved} onCancel={() => {}} />);

    await pflichtfelderFuellen(user);
    const gruppe = () => screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe()).getByRole('radio', { name: 'ja' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    await user.click(within(gruppe()).getByRole('radio', { name: 'nein' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    expect(onSolved, 'erst nach der Verweildauer').not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledTimes(1);
  });

  /** Der schlimmere Fall: Pflichtfeld inzwischen leer. */
  it('mit geleertem Pflichtfeld loest gar nichts mehr', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={fallenContext()} onSolved={onSolved} onCancel={() => {}} />);

    await pflichtfelderFuellen(user);
    const gruppe = () => screen.getByRole('radiogroup', { name: /Grenz/ });
    await user.click(within(gruppe()).getByRole('radio', { name: 'ja' }));
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));

    // Pflichtfeld leeren, dann den Fallenwert setzen.
    await user.clear(screen.getByLabelText(/Zeitpunkt der Kenntnisnahme/));
    await user.click(within(gruppe()).getByRole('radio', { name: 'nein' }));

    // Ueber die Verweildauer hinaus vorspulen: was jetzt nicht gefeuert hat,
    // feuert nie. Vorher wurde das mit 2,2 s echter Wartezeit "belegt".
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
    expect(onSolved).not.toHaveBeenCalled();

    // … und ein Absendeversuch wird jetzt zu Recht zurueckgewiesen.
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));
    expect(screen.getByText(/nimmt das so nicht an/)).toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('auch eine Mehrfachauswahl macht ein frueheres Absenden ungueltig', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    const ctx = makeContext({
      solutions: [
        {
          interactions: ['set:systeme:mail', 'submit'],
          allRequired: true,
          resultText: 'Behauptet.',
          skillGain: {},
        },
      ],
    });
    render(<WindowsLevel context={ctx} onSolved={onSolved} onCancel={() => {}} />);

    await pflichtfelderFuellen(user);
    await user.click(screen.getByRole('button', { name: /Meldung absenden/ }));
    await user.click(screen.getByRole('checkbox', { name: /Mailserver/ }));

    // Ueber die Verweildauer hinaus vorspulen: was jetzt nicht gefeuert hat,
    // feuert nie. Vorher wurde das mit 2,2 s echter Wartezeit "belegt".
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });
});
