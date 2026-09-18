import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

/**
 * Der Testverkehr ist ein EREIGNIS, seine Aussage aber ein ZUSTAND.
 *
 * `performed` ist ein Verlauf: Ein einmal gemeldeter Token zaehlt fuer immer.
 * Ohne Ruecknahme wuerde eine Messung von VOR der Regelaenderung weiterzaehlen
 * — das Level waere mit einem Beweis geloest, der zu einem anderen Regelwerk
 * gehoert. Dieselbe Wurzel wie beim `submit` im Meldeformular, die dort zwei
 * Review-Runden gekostet hat. Der letzte Test hier haelt genau das fest.
 */
const context: GuiContext = {
  app: 'perimeter',
  title: 'Perimeter-Firewall — WebAdmin',
  hostname: 'KRITIS-FW-PERIMETER',
  state: {
    perimeter: {
      applianceName: 'KRITIS-FW-PERIMETER',
      rules: [
        {
          id: 'fernwartung',
          label: 'Fernwartung Hersteller (RDP)',
          source: 'any',
          dest: 'leitstand-hmi',
          service: '3389/tcp',
          action: 'allow',
          narrowTo: '198.51.100.0/24',
          overlyBroad: true,
        },
        {
          id: 'schlussregel',
          label: 'Alles Übrige verwerfen',
          source: 'any',
          dest: 'any',
          service: 'any',
          action: 'deny',
          critical: true,
          riskFeedback: 'Die Schlussregel ist die Grundhaltung der Firewall.',
        },
      ],
      probes: [
        { id: 'extern', label: 'Fremder Absender', source: '203.0.113.66', dest: 'leitstand-hmi', service: '3389/tcp' },
        { id: 'hersteller', label: 'Wartungsrechner', source: '198.51.100.7', dest: 'leitstand-hmi', service: '3389/tcp' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['narrow:fernwartung', 'probe:extern', 'probe:hersteller'],
      allRequired: true,
      setsFlags: ['solution_perimeter_narrowed'],
      resultText: 'Eingeengt und nachgemessen.',
      skillGain: { netzwerk: 5, security: 4 },
    },
  ],
  hints: ['Die rot markierte Zeile ist der Verdachtsfall.'],
};

installFakeTimers();

const senden = (name: RegExp) => screen.getByRole('button', { name });

describe('WindowsLevel — Perimeter-Regelwerk', () => {
  it('loest nach Einengen und beiden Messungen', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(senden(/Quelle einengen: Fernwartung/i));
    await user.click(senden(/Testverkehr senden: Fremder Absender/i));
    await user.click(senden(/Testverkehr senden: Wartungsrechner/i));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(SOLVE_DELAY_MS); });
    expect(onSolved).toHaveBeenCalledWith({ netzwerk: 5, security: 4 }, ['solution_perimeter_narrowed'], undefined, expect.anything());
  });

  it('nennt die Regel, die gegriffen hat — vor und nach dem Einengen', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={vi.fn()} onCancel={() => {}} />);

    await user.click(senden(/Testverkehr senden: Fremder Absender/i));
    expect(screen.getByText(/Treffer auf Regel 1 .* ZUGELASSEN/i)).toBeInTheDocument();

    await user.click(senden(/Quelle einengen: Fernwartung/i));
    await user.click(senden(/Testverkehr senden: Fremder Absender/i));
    expect(screen.getByText(/Treffer auf Regel 2 .* VERWORFEN/i)).toBeInTheDocument();
  });

  it('verweigert jede Aenderung an der Schlussregel', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(senden(/Nach oben: Alles Übrige/i));
    expect(screen.getByText(/Grundhaltung der Firewall/i)).toBeInTheDocument();
    await user.click(senden(/Abschalten: Alles Übrige/i));
    // Immer noch an Position 2 und immer noch aktiv.
    expect(senden(/Abschalten: Alles Übrige/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(SOLVE_DELAY_MS); });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('eine Messung von VOR der Aenderung zaehlt nicht weiter', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    // Erst messen (am ALTEN Regelwerk), dann aendern — und NICHT neu messen.
    await user.click(senden(/Testverkehr senden: Fremder Absender/i));
    await user.click(senden(/Testverkehr senden: Wartungsrechner/i));
    await user.click(senden(/Quelle einengen: Fernwartung/i));

    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(SOLVE_DELAY_MS); });
    expect(onSolved).not.toHaveBeenCalled();

    // Nachgemessen — jetzt zaehlt es.
    await user.click(senden(/Testverkehr senden: Fremder Absender/i));
    await user.click(senden(/Testverkehr senden: Wartungsrechner/i));
    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
  });
});
