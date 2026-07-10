import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

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

installFakeTimers();

describe('WindowsLevel — UAC prompt', () => {
  it('solves when the untrusted prompt is denied (Nein)', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    expect(screen.getByText(/Änderungen an Ihrem Gerät/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    // Success overlay appears immediately; onSolved fires after the dwell.
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined);
  });

  it('does not solve when allowed (Ja) and shows the risk warning', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));

    // Risk feedback shown, level NOT solved — not even after the dwell.
    expect(screen.getByText(/getarnte EXE/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('allows recovery: deny after a wrong allow still solves', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Ja$/ }));
    await user.click(screen.getByRole('button', { name: /^Nein$/ }));

    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 3, security: 6 }, undefined);
  });
});
