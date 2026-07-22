import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';
// We only care about the React chrome around the terminal (the task panel),
// not xterm — the shared harness mock is a superset that serves fine here.
vi.mock('@xterm/xterm', async () => ({ Terminal: (await import('./testHarness')).terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', async () => ({ FitAddon: (await import('./testHarness')).terminalMock.FitAddon }));

const baseContext: TerminalContext = {
  type: 'linux',
  hostname: 'srv-test',
  username: 'azubi',
  currentPath: '/var/log',
  hints: [],
  commands: [],
  solutions: [],
};

describe('Terminal task panel — the quest stays reviewable', () => {
  it('renders context.taskText in a persistent panel', () => {
    render(
      <Terminal
        context={{ ...baseContext, taskText: 'Finde die Angreifer-IP in syslog.' }}
        onSolved={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/Aufgabe:/)).toBeInTheDocument();
    expect(screen.getByText(/Finde die Angreifer-IP in syslog\./)).toBeInTheDocument();
  });

  it('falls back to the task prop when the context has no taskText', () => {
    render(
      <Terminal
        context={baseContext}
        task={'Extrahierte Aufgabe aus dem Briefing.'}
        onSolved={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/Extrahierte Aufgabe aus dem Briefing\./)).toBeInTheDocument();
  });

  it('prefers context.taskText over the task prop', () => {
    render(
      <Terminal
        context={{ ...baseContext, taskText: 'Aus dem Kontext.' }}
        task={'Aus dem Prop.'}
        onSolved={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/Aus dem Kontext\./)).toBeInTheDocument();
    expect(screen.queryByText(/Aus dem Prop\./)).not.toBeInTheDocument();
  });

  it('renders no panel when there is no task at all', () => {
    render(<Terminal context={baseContext} onSolved={() => {}} onCancel={() => {}} />);
    expect(screen.queryByText(/Aufgabe:/)).not.toBeInTheDocument();
  });

  it('wraps terminal controls into readable mobile rows', () => {
    render(<Terminal context={baseContext} onSolved={() => {}} onCancel={() => {}} />);

    const headerCancel = screen.getByRole('button', { name: /Abbrechen/ });
    const hint = screen.getByRole('button', { name: /Hinweis/ });
    const footerHint = screen
      .getAllByText('[ESC] Abbrechen')
      .find((node) => node.tagName === 'SPAN');

    expect(headerCancel.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    expect(headerCancel).toHaveClass('min-h-11');
    expect(hint.parentElement?.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    expect(hint.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    expect(hint).toHaveClass('min-h-11');
    expect(footerHint).toBeDefined();
    expect(footerHint).toHaveClass('shrink-0');
  });
});
