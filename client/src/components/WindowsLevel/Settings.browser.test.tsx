import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';

const context: GuiContext = {
  app: 'settings',
  title: 'Windows-Sicherheit',
  hostname: 'DC01-TEST',
  state: {
    settings: {
      settings: [
        { id: 'rt', category: 'Viren- & Bedrohungsschutz', label: 'Echtzeitschutz', enabled: false, recommended: true },
        { id: 'tp', category: 'Viren- & Bedrohungsschutz', label: 'Manipulationsschutz', enabled: false, recommended: true },
        { id: 'cloud', category: 'Viren- & Bedrohungsschutz', label: 'Cloud-Schutz', enabled: true, recommended: true },
        { id: 'fw', category: 'Firewall- & Netzwerkschutz', label: 'Domänen-Firewall', enabled: false, recommended: true },
        // Secure-when-off, NOT locked → exercises status from `enabled === recommended`.
        { id: 'opt', category: 'Datenschutz', label: 'Optionale Telemetrie', enabled: false, recommended: false, riskFeedback: 'Telemetrie sollte aus bleiben.' },
        // Managed by org → disabled switch + static helper text.
        { id: 'dev', category: 'Für Entwickler', label: 'Entwicklermodus', enabled: false, recommended: false, locked: true, riskFeedback: 'Per Richtlinie gesperrt.' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['enable:rt', 'enable:fw', 'enable:tp'],
      allRequired: true,
      resultText: 'Schutz wiederhergestellt.',
      skillGain: { windows: 6, security: 8 },
    },
  ],
  hints: ['Drei Sachen sind aus.'],
};

describe('WindowsLevel — Windows-Sicherheit (Settings)', () => {
  it('solves once the three insecure protections are enabled', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('switch', { name: 'Echtzeitschutz' }));
    await user.click(screen.getByRole('switch', { name: 'Domänen-Firewall' }));
    await user.click(screen.getByRole('switch', { name: 'Manipulationsschutz' }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith({ windows: 6, security: 8 }, undefined), {
      timeout: 2500,
    });
  });

  it('renders status from enabled === recommended, not enabled alone', () => {
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);

    // 'opt' and 'dev' are both OFF, yet both are secure-when-off:
    //   opt (not locked) → "Sicher"; dev (locked) → "Verwaltet".
    expect(screen.getAllByText('Sicher').length).toBeGreaterThanOrEqual(2); // cloud + opt
    expect(screen.getByText('Verwaltet')).toBeInTheDocument();
    // The off-but-insecure protections demand action.
    expect(screen.getAllByText('Aktion nötig').length).toBe(3); // rt, tp, fw
  });

  it('locked settings are disabled and surface their feedback statically', () => {
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole('switch', { name: 'Entwicklermodus' })).toBeDisabled();
    expect(screen.getByText(/Per Richtlinie gesperrt/i)).toBeInTheDocument();
  });

  it('warns and does not solve when a setting is driven into an insecure state', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('switch', { name: 'Optionale Telemetrie' }));

    expect(screen.getByText(/Telemetrie sollte aus bleiben/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    expect(onSolved).not.toHaveBeenCalled();
  });
});
