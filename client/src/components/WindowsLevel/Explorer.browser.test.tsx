import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';

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

describe('WindowsLevel — Explorer (share ACL)', () => {
  it('solves when the over-broad "Jeder" entry is removed', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('Jeder'));
    await user.click(screen.getByRole('button', { name: /Entfernen/i }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ windows: 2, security: 4 }, undefined), { timeout: 2500 });
  });

  it('blocks removal of a critical entry and does not solve', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    await waitFor(
      () => expect(onSolved).toHaveBeenCalledWith({ windows: 2, security: 2 }, ['bastion_delivery_found']),
      { timeout: 2500 }
    );
  });

  it('opening the WRONG document does not solve (decoy Angebot)', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={filesContext} onSolved={onSolved} onCancel={() => {}} />);

    await user.dblClick(screen.getByText(/02_BASTION-01/));
    await user.dblClick(screen.getByText(/Angebot_2025-03/));
    expect(screen.getByTestId('explorer-preview')).toHaveTextContent('nicht enthalten');
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('the Öffnen button and Zurück navigation work (keyboard-first parity)', async () => {
    const user = userEvent.setup();
    render(<WindowsLevel context={filesContext} onSolved={() => {}} onCancel={() => {}} />);

    await user.click(screen.getByText(/02_BASTION-01/));
    await user.click(screen.getByRole('button', { name: /Öffnen/i }));
    expect(screen.getByText(/Angebot_2025-03/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Zurück/i }));
    expect(screen.getByText(/Ablage_alt/)).toBeInTheDocument();
    expect(screen.queryByText(/Angebot_2025-03/)).not.toBeInTheDocument();
  });
});
