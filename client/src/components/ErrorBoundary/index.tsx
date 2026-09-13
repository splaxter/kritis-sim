import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Injectable for tests; defaults to a full page reload. */
  onReload?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary: a render/lifecycle throw anywhere below shows a
 * terminal-styled German fallback instead of a blank page.
 *
 * WAS DER TEXT VERSPRECHEN DARF — und was nicht. `useAutosave` schreibt erst
 * NACH einem erfolgreichen Rendern. Daraus folgen zwei Faelle, die der
 * Fallback nicht wegreden darf:
 *
 *   1. Der Fehler trifft den ersten Spielbildschirm → es gibt ueberhaupt
 *      keinen Spielstand, und „du kannst weiterspielen" waere gelogen.
 *   2. Der Fehler trifft einen spaeteren Uebergang → gespeichert ist der
 *      Zustand DAVOR; genau der fehlgeschlagene Schritt fehlt.
 *
 * Der Text sagt deshalb konjunktivisch, was der Fall sein KANN, und warnt vor
 * moeglichem Verlust. Im Review zu PR #15 mit zwei Repros belegt — vorher
 * behauptete er rundheraus, der Stand sei gesichert.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only — this app deliberately has no error telemetry.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error === null) return this.props.children;

    const reload = this.props.onReload ?? (() => window.location.reload());
    return (
      <div className="min-h-screen bg-terminal-bg text-terminal-green font-mono flex items-center justify-center p-4">
        <div className="border border-terminal-border max-w-xl w-full p-6 space-y-4">
          <h1 className="text-xl text-terminal-danger">✗ Etwas ist schiefgelaufen</h1>
          <p className="text-terminal-green-dim">
            Ein unerwarteter Fehler hat das Spiel unterbrochen. Lade die Seite
            neu. Falls ein gespeicherter Spielstand vorhanden ist, kannst du ihn
            im Menü fortsetzen. Nicht gespeicherte Änderungen können verloren
            sein.
          </p>
          <pre className="text-terminal-green-dim text-xs whitespace-pre-wrap overflow-x-auto border border-terminal-border p-2">
            {this.state.error.message}
          </pre>
          <button
            onClick={reload}
            className="border border-terminal-green px-3 py-1 hover:bg-terminal-green hover:text-terminal-bg"
          >
            [ NEU LADEN ]
          </button>
        </div>
      </div>
    );
  }
}
