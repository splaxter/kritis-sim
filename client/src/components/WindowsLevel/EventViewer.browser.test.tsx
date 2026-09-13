import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GuiContext } from '@kritis/shared';
import { WindowsLevel } from './index';
import { SOLVE_DELAY_MS } from './useGuiLevel';
import { installFakeTimers, fakeTimerUser } from '../../test/fakeTimers';

const context: GuiContext = {
  app: 'eventviewer',
  title: 'Ereignisanzeige',
  hostname: 'DC01',
  state: {
    eventViewer: {
      logName: 'Sicherheit',
      entries: [
        { id: 'fail-1', level: 'Überwachung fehlgeschlagen', dateTime: '03:14', source: 'Auditing', eventId: 4625, message: 'Konto: Administrator\nIP: 10.0.0.66' },
        { id: 'fail-2', level: 'Überwachung fehlgeschlagen', dateTime: '03:15', source: 'Auditing', eventId: 4625, message: 'Konto: Administrator\nIP: 10.0.0.66' },
        { id: 'breach', level: 'Überwachung erfolgreich', dateTime: '03:17', source: 'Auditing', eventId: 4624, message: 'Erfolgreiche Anmeldung\nKonto: Administrator\nIP: 10.0.0.66' },
        { id: 'noise', level: 'Information', dateTime: '06:00', source: 'Auditing', eventId: 4624, message: 'backup-svc' },
      ],
    },
  },
  solutions: [
    {
      interactions: ['report:breach'],
      allRequired: true,
      resultText: 'Einbruch erkannt.',
      skillGain: { windows: 5, security: 8 },
    },
  ],
  hints: ['Filter nach fehlgeschlagen.'],
};

installFakeTimers();

describe('WindowsLevel — Event Viewer', () => {
  it('solves when the breach event is selected and reported', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    // Select the breach row (Event 4624 at 03:17), then report it.
    await user.click(screen.getByText('03:17'));
    // Details pane shows the selected event's message.
    expect(screen.getByText(/Erfolgreiche Anmeldung/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Als Vorfall melden/i }));

    expect(screen.getByText(/Aufgabe abgeschlossen/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).toHaveBeenCalledWith({ windows: 5, security: 8 }, undefined);
  });

  it('does not solve when a failed-logon event is reported', async () => {
    const user = fakeTimerUser();
    const onSolved = vi.fn();
    render(<WindowsLevel context={context} onSolved={onSolved} onCancel={() => {}} />);

    await user.click(screen.getByText('03:14'));
    await user.click(screen.getByRole('button', { name: /Als Vorfall melden/i }));

    expect(screen.queryByText(/Aufgabe abgeschlossen/i)).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(SOLVE_DELAY_MS);
    });
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('filters the list by level', async () => {
    const user = fakeTimerUser();
    render(<WindowsLevel context={context} onSolved={() => {}} onCancel={() => {}} />);

    // Initially the Information "noise" row is visible.
    expect(screen.getByText('06:00')).toBeInTheDocument();

    // Filter to failed audits — the success/info rows disappear.
    await user.click(screen.getByRole('tab', { name: /Überwachung fehlgeschlagen/i }));
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
    expect(screen.queryByText('03:17')).not.toBeInTheDocument();
    expect(screen.getByText('03:14')).toBeInTheDocument();
  });
});
