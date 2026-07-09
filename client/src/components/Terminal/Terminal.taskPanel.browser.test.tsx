import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalContext } from '@kritis/shared';
import { Terminal } from './index';

// Reuse the same xterm mock shape as the partial-feedback test: we only care
// about the React chrome around the terminal (the task panel), not xterm.
const terminalMock = vi.hoisted(() => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    focus() {}
    write() {}
    writeln() {}
    clear() {}
    dispose() {}
    onData() {
      return { dispose: () => {} };
    }
  },
  FitAddon: class {
    fit() {}
  },
}));

vi.mock('@xterm/xterm', () => ({ Terminal: terminalMock.Terminal }));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: terminalMock.FitAddon }));

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
});
