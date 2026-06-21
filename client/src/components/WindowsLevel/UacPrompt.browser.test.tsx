import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';

const context: GuiContext = {
  app: 'uac',
  title: 'Benutzerkontensteuerung',
  hostname: 'WS-TEST',
  state: {
    uac: {
      program: 'Rechnung.pdf.exe',
      publisher: 'Kein verifizierter Herausgeber',
      verifiedPublisher: false,
      programPath: 'C:\\Users\\azubi\\Downloads\\Rechnung.pdf.exe',
      fileOrigin: 'E-Mail-Anhang',
      riskFeedback: 'Achtung: getarnte EXE ohne verifizierten Herausgeber. Wähle „Nein".',
    },
  },
  solutions: [
    {
      interactions: ['answer:uac:no'],
      allRequired: true,
      resultText: 'Korrekt abgelehnt.',
      skillGain: { windows: 3, security: 6 },
    },
  ],
  hints: ['Prüfe den Herausgeber.'],
};

describe('WindowsLevel — UAC prompt', () => {
  it('solves when the untrusted prompt is denied (Nein)', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    expect(screen.getByText(/Änderungen an Ihrem Gerät/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined), {
      timeout: 2500,
    });
  });

  it('does not solve when allowed (Ja) and shows the risk warning', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));

    // Risk feedback shown, level NOT solved.
    expect(screen.getByText(/getarnte EXE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('allows recovery: deny after a wrong allow still solves', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));
    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined), {
      timeout: 2500,
    });
  });
});
