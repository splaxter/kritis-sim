import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

/**
 * Autorenansicht (?level): alle Level auflisten und einzeln öffnen.
 *
 * Sie hängt hier und nicht in `App`, und das ist der ganze Punkt: `App` fährt
 * beim Rendern die Spielmaschine hoch — Spielstand laden, Autosave, Telemetrie.
 * In der ersten Fassung stand die Weiche innerhalb von `App`, also liefen diese
 * Haken trotzdem, und der e2e-Test hat es gemeldet: Der hinterlegte Spielstand
 * war nach dem Öffnen der Ansicht weg. Ein Werkzeug zum Nachsehen darf den
 * Stand dessen, der nachsieht, nicht anfassen.
 */
const LevelBrowser = lazy(() => import('./components/LevelBrowser').then((m) => ({ default: m.LevelBrowser })));

const nurLevelAnsicht = new URLSearchParams(window.location.search).has('level');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {nurLevelAnsicht ? (
        <Suspense fallback={<div className="p-8 text-terminal-green font-mono">Level-Ansicht wird geladen…</div>}>
          <LevelBrowser />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
