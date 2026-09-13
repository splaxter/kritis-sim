import { describe, it, expect, vi } from 'vitest';
// waitFor bleibt: main hat seit Juli Tastatur-Tests, die auf DOM-Zustaende
// warten (Fokus, Ordnerwechsel) — das hat mit der Verweildauer nichts zu tun.
import { render, screen, act, waitFor } from '@testing-library/react';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { derivePermissionMatrix, PERMISSION_ROWS } from './apps/Explorer';
import { auditTrailStoryEvents } from '../../content/campaigns/audit-trail/events';

const context: GuiContext = {
  app: 'explorer',
  title: 'Eigenschaften: Finanzen',
  hostname: 'FILESRV01',
  state: {
    explorer: {
      shareName: 'Finanzen',
      sharePath: '\\\\FILESRV01\\Finanzen',
      entries: [
        { id: 'admins', principal: 'Administratoren', permission: 'Vollzugriff', critical: true, riskFeedback: 'Admins werden gebraucht.' },
        { id: 'buchhaltung', principal: 'Buchhaltung-RW', permission: 'Ändern', critical: true, riskFeedback: 'Buchhaltung braucht das.' },
        { id: 'jeder', principal: 'Jeder', permission: 'Vollzugriff', overlyBroad: true },
      ],
    },
  },
  solutions: [
    { interactions: ['remove:jeder'], allRequired: true, resultText: 'Offene Berechtigung entfernt.', skillGain: { windows: 2, security: 4 } },
  ],
  hints: ['Welcher Eintrag gibt allen Vollzugriff?'],
};

installFakeTimers();

describe('WindowsLevel — Explorer (share ACL)', () => {
  it('solves when the over-broad "Jeder" entry is removed', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('Jeder'));
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved, 'erst nach der Verweildauer').not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 2, security: 4 }, undefined);
  });

  it('blocks removal of a critical entry and does not solve', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('Administratoren'));
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    expect(screen.getByText(/Admins werden gebraucht/i)).toBeInTheDocument();
    expect(screen.getByText('Administratoren')).toBeInTheDocument(); // still listed
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('exposes ACL rows as a labelled listbox', () => {
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('listbox', { name: /Berechtigungen/i })).toBeInTheDocument();
  });
});

// ── File-browser mode ───────────────────────────────────────────────────────

const filesContext: GuiContext = {
  app: 'explorer',
  title: 'Projekte',
  hostname: 'FILE01',
  state: {
    explorer: {
      mode: 'files',
      shareName: 'Projekte',
      sharePath: '\\\\FILE01\\Projekte',
      items: [
        { id: 'ordner_bastion', name: '02_BASTION-01', kind: 'folder', modified: '02.05.2025' },
        { id: 'ordner_leer', name: '03_Leer', kind: 'folder', modified: '01.01.2026' }, // empty decoy
        { id: 'notizen_root', name: 'Ablage_alt.txt', kind: 'file', modified: '11.01.2024', preview: 'Nichts Relevantes.' },
        {
          id: 'angebot',
          name: 'Angebot_2025-03.pdf',
          kind: 'file',
          parent: 'ordner_bastion',
          modified: '14.03.2025',
          preview: 'ANGEBOT — Pos. 3: MFA-Modul (optional, nicht enthalten)',
        },
        {
          id: 'lieferschein',
          name: 'Lieferschein_2025-05-02.pdf',
          kind: 'file',
          parent: 'ordner_bastion',
          modified: '02.05.2025',
          preview: 'LIEFERSCHEIN — Pos. 3: MFA-Modul — ENTHALTEN',
        },
      ],
    },
  },
  solutions: [
    {
      interactions: ['open:lieferschein'],
      allRequired: true,
      resultText: 'Lieferschein gefunden.',
      skillGain: { windows: 2, security: 2 },
      setsFlags: ['bastion_delivery_found'],
    },
  ],
  hints: ['Wo würden Projektunterlagen zu BASTION-01 liegen?'],
};

describe('WindowsLevel — Explorer (file browser)', () => {
  it('navigates into a folder, opens the target file and solves WITH its setsFlags', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={filesContext} onSolved={onSolved} onCancel={() => {}} />);

    // Root shows the folder but not its children.
    expect(screen.getByText(/02_BASTION-01/)).toBeInTheDocument();
    expect(screen.queryByText(/Lieferschein_2025-05-02/)).not.toBeInTheDocument();

    await user.dblClick(screen.getByText(/02_BASTION-01/));
    expect(screen.getByText(/Lieferschein_2025-05-02/)).toBeInTheDocument();

    await user.dblClick(screen.getByText(/Lieferschein_2025-05-02/));
    // The preview renders the document — the actual FIND.
    expect(screen.getByTestId('explorer-preview')).toHaveTextContent('MFA-Modul — ENTHALTEN');
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved, 'erst nach der Verweildauer').not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 2, security: 2 }, ['bastion_delivery_found']);
  });

  it('opening the WRONG document does not solve (decoy Angebot)', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={filesContext} onSolved={onSolved} onCancel={() => {}} />);

    await user.dblClick(screen.getByText(/02_BASTION-01/));
    await user.dblClick(screen.getByText(/Angebot_2025-03/));
    expect(screen.getByTestId('explorer-preview')).toHaveTextContent('nicht enthalten');
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('the Öffnen button and Zurück navigation work (keyboard-first parity)', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={filesContext} onSolved={() => {}} onCancel={() => {}} />);

    await user.click(screen.getByText(/02_BASTION-01/));
    await user.click(screen.getByRole('button', { name: /Öffnen/i }));
    expect(screen.getByText(/Angebot_2025-03/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Zurück/i }));
    expect(screen.getByText(/Ablage_alt/)).toBeInTheDocument();
    expect(screen.queryByText(/Angebot_2025-03/)).not.toBeInTheDocument();
  });

  it('is fully keyboard-drivable: arrows select, Enter enters/opens, focus follows into folders', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={filesContext} onSolved={onSolved} onCancel={() => {}} />);

    // The first row is the single initial tab stop (roving tabindex).
    const firstRow = screen.getByText(/02_BASTION-01/).closest('[role="option"]') as HTMLElement;
    firstRow.focus();
    expect(firstRow).toHaveFocus();

    // ArrowDown moves selection down the list; folders sort first, so two
    // downs (past the empty decoy folder) reach the first root file.
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const ablage = screen.getByText(/Ablage_alt/).closest('[role="option"]') as HTMLElement;
    expect(ablage).toHaveFocus();
    expect(ablage).toHaveAttribute('aria-selected', 'true');

    // Home jumps back to the first folder (BASTION); Enter opens it and focus
    // follows inside.
    await user.keyboard('{Home}');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      const angebot = screen.getByText(/Angebot_2025-03/).closest('[role="option"]') as HTMLElement;
      expect(angebot).toHaveFocus();
    });

    // End → the last file (the Lieferschein); Enter opens it and solves.
    await user.keyboard('{End}');
    await user.keyboard('{Enter}');
    const preview = screen.getByTestId('explorer-preview');
    expect(preview).toHaveAttribute('aria-live', 'polite');
    expect(preview).toHaveTextContent('MFA-Modul — ENTHALTEN');
    await waitFor(
      () => expect(onSolved).toHaveBeenCalledWith({ windows: 2, security: 2 }, ['bastion_delivery_found']),
      { timeout: 2500 }
    );
  });

  it('Backspace navigates up a folder (keyboard-only)', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={filesContext} onSolved={() => {}} onCancel={() => {}} />);

    const firstRow = screen.getByText(/02_BASTION-01/).closest('[role="option"]') as HTMLElement;
    firstRow.focus();
    await user.keyboard('{Enter}'); // into the folder
    await screen.findByText(/Angebot_2025-03/);

    await user.keyboard('{Backspace}'); // back out
    await waitFor(() => expect(screen.getByText(/Ablage_alt/)).toBeInTheDocument());
    expect(screen.queryByText(/Angebot_2025-03/)).not.toBeInTheDocument();
  });

  it('an EMPTY folder is not a keyboard dead end (focus lands on the empty state, Backspace exits)', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={filesContext} onSolved={() => {}} onCancel={() => {}} />);

    // Navigate to the empty decoy folder and open it by keyboard.
    const emptyFolder = screen.getByText(/03_Leer/).closest('[role="option"]') as HTMLElement;
    emptyFolder.focus();
    await user.keyboard('{Enter}');

    // Focus lands on the focusable empty-state (not lost to <body>).
    const emptyState = await screen.findByLabelText('Ordner ist leer');
    await waitFor(() => expect(emptyState).toHaveFocus());
    expect(document.body).not.toHaveFocus();

    // Backspace from the empty state navigates back up — no dead end.
    await user.keyboard('{Backspace}');
    await waitFor(() => expect(screen.getByText(/02_BASTION-01/)).toBeInTheDocument());
    expect(screen.queryByLabelText('Ordner ist leer')).not.toBeInTheDocument();
  });

  it('the REAL L7 dataset: an empty decoy folder (Fuhrpark) is keyboard-recoverable', async () => {
    const user = fakeTimerUser();
    const l7Context = auditTrailStoryEvents.find((e) => e.id === 'at_l7_delivery_note')!.guiContext!;
    render(<WindowsLevel context={l7Context} onSolved={() => {}} onCancel={() => {}} />);

    // Fuhrpark and Kompostanlage are empty decoys in the shipped level.
    const fuhrpark = screen.getByText(/Fuhrpark-Telematik/).closest('[role="option"]') as HTMLElement;
    fuhrpark.focus();
    await user.keyboard('{Enter}');

    const emptyState = await screen.findByLabelText('Ordner ist leer');
    await waitFor(() => expect(emptyState).toHaveFocus());

    await user.keyboard('{Backspace}');
    // Back at the root — the real Lieferschein folder is reachable again.
    await waitFor(() => expect(screen.getByText(/02_BASTION-01/)).toBeInTheDocument());
  });
});

/**
 * Issue #5: der echte „Sicherheit"-Tab zeigt fuer die AUSGEWAEHLTE Gruppe ein
 * Kaestchenraster. Unsere Zeilen nannten nur die Stufe — das ist der eine
 * Bildschirm, den ein Windows-Admin sofort als vereinfacht erkennt.
 *
 * Das Raster wird ABGELEITET und ist reine Darstellung: kein Token, kein
 * Zustand, nicht bedienbar.
 */
describe('derivePermissionMatrix — die Leiter der Stufen', () => {
  it('Vollzugriff setzt alles', () => {
    const m = derivePermissionMatrix('Vollzugriff');
    expect(PERMISSION_ROWS.every((r) => m[r])).toBe(true);
  });

  it('Ändern setzt alles ausser Vollzugriff', () => {
    const m = derivePermissionMatrix('Ändern');
    expect(m['Vollzugriff']).toBe(false);
    expect(m['Ändern']).toBe(true);
    expect(m['Schreiben']).toBe(true);
    expect(m['Lesen']).toBe(true);
  });

  it('Lesen & Ausführen schliesst Lesen ein, aber nicht Schreiben', () => {
    const m = derivePermissionMatrix('Lesen & Ausführen');
    expect(m['Lesen']).toBe(true);
    expect(m['Ordnerinhalt anzeigen']).toBe(true);
    expect(m['Schreiben']).toBe(false);
  });

  it('Lesen setzt nur Lesen', () => {
    const m = derivePermissionMatrix('Lesen');
    expect(Object.entries(m).filter(([, v]) => v).map(([k]) => k)).toEqual(['Lesen']);
  });

  /** Lieber ein leeres Raster als ein erfundenes. */
  it('eine unbekannte Stufe setzt nichts', () => {
    const m = derivePermissionMatrix('Spezielle Berechtigungen');
    expect(Object.values(m).some(Boolean)).toBe(false);
  });
});

describe('Explorer ACL — Berechtigungsraster der Auswahl', () => {
  it('erscheint erst mit einer Auswahl', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    expect(screen.queryByText(/Berechtigungen für/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Jeder/ }));
    expect(screen.getByText(/Berechtigungen für/)).toBeInTheDocument();
  });

  /**
   * Prueft den ACCESSIBILITY-BAUM, nicht ein DOM-Attribut.
   *
   * Vorher standen hier ☑/☐ in einem span mit aria-label. getByLabelText fand
   * das Attribut und der Test war gruen — im Browser kam davon nichts an, weil
   * aria-label an einem rollenlosen span wirkungslos ist. Genau das hat das
   * Review zu PR #16 aufgedeckt. Jetzt: echte Checkboxen, echter Zustand.
   */
  it('zeigt fuer „Jeder: Vollzugriff" alle Haken bei Zulassen', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('option', { name: /Jeder/ }));
    for (const zeile of PERMISSION_ROWS) {
      expect(screen.getByRole('checkbox', { name: `${zeile} Zulassen` }), zeile).toBeChecked();
      // „Verweigern" bleibt durchgaengig leer — unsere Freigaben kennen keine
      // expliziten Verbote.
      expect(screen.getByRole('checkbox', { name: `${zeile} Verweigern` }), zeile).not.toBeChecked();
    }
  });

  it('die Kaestchen sind als Nur-Lese-Darstellung deaktiviert', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('option', { name: /Jeder/ }));
    const kaesten = screen.getAllByRole('checkbox');
    expect(kaesten).toHaveLength(PERMISSION_ROWS.length * 2);
    for (const k of kaesten) expect(k).toBeDisabled();
  });

  it('eine niedrigere Stufe zeigt im Baum auch weniger Haken', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(screen.getByRole('option', { name: /Buchhaltung/ }));
    const gesetzt = screen.getAllByRole('checkbox').filter((k) => (k as HTMLInputElement).checked);
    expect(gesetzt.length).toBeGreaterThan(0);
    expect(gesetzt.length).toBeLessThan(PERMISSION_ROWS.length);
  });

  /** Reine Darstellung: das Raster darf kein Level loesen und nichts aendern. */
  it('ein Klick ins Raster loest nichts aus', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('option', { name: /Jeder/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Vollzugriff Zulassen' }));
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS * 2);
    });
    expect(onSolved).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: /Jeder/ })).toBeInTheDocument();
  });
});

/**
 * Regression aus dem Review zu b244ab1: `styles.list` gehoerte BEIDEN
 * Explorer-Modi. Beim Umbau fuer das Berechtigungsraster verlor der
 * Datei-Explorer sein Scrollen — die Dateien liefen hinter den Footer.
 *
 * jsdom loest die Fluent-Klassen auf, also laesst sich das hier direkt pruefen:
 * jeder Modus braucht einen scrollfaehigen Bereich, und die beiden duerfen sich
 * dafuer nicht dieselbe Klasse teilen.
 */
describe('Explorer — beide Modi behalten ihren Scrollbereich', () => {
  /** Naechster Vorfahr (oder das Element selbst), der vertikal scrollen kann. */
  const scrollTraeger = (el: HTMLElement): HTMLElement | null => {
    let n: HTMLElement | null = el;
    while (n) {
      const o = getComputedStyle(n).overflowY;
      if (o === 'auto' || o === 'scroll') return n;
      n = n.parentElement;
    }
    return null;
  };

  it('Datei-Modus: die Liste scrollt selbst und waechst mit', () => {
    render(<WindowsLevel context={filesContext} onSolved={vi.fn()} onCancel={() => {}} />);
    const liste = screen.getByRole('listbox', { name: 'Dateien' });
    const cs = getComputedStyle(liste);
    expect(cs.overflowY, 'Datei-Liste scrollt nicht mehr').toBe('auto');
    expect(cs.flexGrow, 'Datei-Liste fuellt die Hoehe nicht mehr').toBe('1');
  });

  it('ACL-Modus: Liste und Raster scrollen gemeinsam in einem Vorfahren', () => {
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);
    const liste = screen.getByRole('listbox', { name: 'Berechtigungen' });
    const traeger = scrollTraeger(liste);
    expect(traeger, 'kein scrollfaehiger Bereich').not.toBeNull();
    // Der Traeger ist NICHT die Liste selbst — sonst bliebe das Raster aussen vor.
    expect(traeger).not.toBe(liste);
  });

  it('die beiden Modi teilen sich die Klasse nicht mehr', () => {
    const { unmount } = render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);
    const aclKlasse = screen.getByRole('listbox', { name: 'Berechtigungen' }).className;
    unmount();

    render(<WindowsLevel context={filesContext} onSolved={vi.fn()} onCancel={() => {}} />);
    const dateiKlasse = screen.getByRole('listbox', { name: 'Dateien' }).className;

    expect(dateiKlasse, 'gemeinsame Klasse — genau das war die Regression').not.toBe(aclKlasse);
  });
});
