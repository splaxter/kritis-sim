import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const context: GuiContext = {
  app: 'corefirewall',
  title: 'Core-Firewall — Konsole',
  hostname: 'KRITIS-FW-CORE',
  state: {
    coreFirewall: {
      zoneName: 'Leitstand-Perimeter',
      rules: [
        { id: 'atk', label: 'Angreifer extern', direction: 'inbound', target: '203.0.113.66', action: 'allow', hostile: true },
        {
          id: 'mgmt',
          label: 'Leitstand-Management',
          direction: 'inbound',
          target: '10.20.1.10',
          action: 'allow',
          critical: true,
          riskFeedback: 'Management-Leitung darf nicht gekappt werden.',
        },
      ],
      subnets: [
        { id: 'scada', label: 'SCADA-Prozessnetz', isolated: false },
        {
          id: 'sis',
          label: 'Sicherheitssystem (SIS)',
          isolated: false,
          critical: true,
          riskFeedback: 'Das Sicherheitssystem muss erreichbar bleiben.',
        },
      ],
    },
  },
  solutions: [
    {
      interactions: ['block:atk', 'isolate:scada'],
      allRequired: true,
      setsFlags: ['solution_firewall_locked'],
      resultText: 'Angreifer geblockt, SCADA isoliert.',
      skillGain: { netzwerk: 5, security: 5 },
    },
  ],
  hints: ['Sperr die fremde IP und isolier das Prozessnetz.'],
};

installFakeTimers();

describe('WindowsLevel — Core-Firewall', () => {
  it('solves when the hostile rule is blocked and the SCADA net isolated', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Blockieren: Angreifer extern/i }));
    await user.click(screen.getByRole('button', { name: /Isolieren: SCADA-Prozessnetz/i }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ netzwerk: 5, security: 5 }, ['solution_firewall_locked']);
  });

  it('refuses to block the critical management rule and does not solve', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Blockieren: Leitstand-Management/i }));

    expect(screen.getByText(/Management-Leitung darf nicht gekappt/i)).toBeInTheDocument();
    // Rule stays allowed — button still offers "Blockieren", not "Freigeben".
    expect(screen.getByRole('button', { name: /Blockieren: Leitstand-Management/i })).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('protects a critical rule in BOTH directions (a blocked critical rule cannot be freed)', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    // Seed the critical management rule as already blocked: freeing it would cut
    // the control room just as blocking an allowed one would.
    const blockedCritical: GuiContext = {
      ...context,
      state: {
        coreFirewall: {
          ...context.state.coreFirewall!,
          rules: context.state.coreFirewall!.rules.map((r) =>
            r.id === 'mgmt' ? { ...r, action: 'block' } : r
          ),
        },
      },
    };
    render(<WindowsLevel context={blockedCritical} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Freigeben: Leitstand-Management/i }));

    expect(screen.getByText(/Management-Leitung darf nicht gekappt/i)).toBeInTheDocument();
    // Still blocked — the button still offers "Freigeben", it did not flip to allow.
    expect(screen.getByRole('button', { name: /Freigeben: Leitstand-Management/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('refuses to isolate the critical safety system and does not solve', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Isolieren: Sicherheitssystem/i }));

    expect(screen.getByText(/Sicherheitssystem muss erreichbar bleiben/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('does not solve on the hostile block alone (both actions required)', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Blockieren: Angreifer extern/i }));

    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
    // The rule did flip to blocked (now offers "Freigeben").
    expect(screen.getByRole('button', { name: /Freigeben: Angreifer extern/i })).toBeInTheDocument();
  });
});
