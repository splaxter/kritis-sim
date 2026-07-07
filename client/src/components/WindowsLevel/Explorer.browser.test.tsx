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
