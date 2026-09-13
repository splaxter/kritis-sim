import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './index';

function Bomb(): never {
  throw new Error('Kaboom');
}

// React logs caught render errors via console.error — keep test output clean.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>alles gut</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('alles gut')).toBeInTheDocument();
  });

  it('shows the German fallback instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Etwas ist schiefgelaufen/i)).toBeInTheDocument();
    // Autosave reassurance + the thrown message for bug reports.
    expect(screen.getByText(/Lade die Seite\s+neu/i)).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });

  it('offers a reload button that triggers the reload callback', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <ErrorBoundary onReload={onReload}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: /neu laden/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

/**
 * Aus dem Review zu PR #15: der Fallback darf keinen Spielstand versprechen,
 * den es moeglicherweise nicht gibt. `useAutosave` schreibt erst NACH einem
 * erfolgreichen Rendern — wer beim ersten Spielbildschirm abstuerzt, hat gar
 * keinen; wer bei einem spaeteren Uebergang abstuerzt, hat den Zustand DAVOR.
 *
 * Der Test haengt bewusst an der Aussage, nicht am Wortlaut: geprueft wird,
 * dass der Text die Unsicherheit benennt und nichts Unbedingtes behauptet.
 */
describe('ErrorBoundary — verspricht nicht mehr, als der Autosave halten kann', () => {
  const zeigeFehler = () =>
    render(
      <ErrorBoundary onReload={vi.fn()}>
        <Bomb />
      </ErrorBoundary>
    );

  it('stellt den Spielstand unter Vorbehalt, statt ihn zuzusichern', () => {
    zeigeFehler();
    const absatz = screen.getByText(/Lade die Seite\s+neu/i);
    expect(absatz).toHaveTextContent(/Falls ein gespeicherter Spielstand vorhanden ist/i);
  });

  it('warnt ausdruecklich vor moeglichem Verlust', () => {
    zeigeFehler();
    expect(screen.getByText(/Lade die Seite\s+neu/i)).toHaveTextContent(
      /Nicht gespeicherte Änderungen können verloren sein/i
    );
  });

  it.each([
    [/wird automatisch gesichert/i, 'sichert unbedingt zu'],
    [/Keine Sorge/i, 'beschwichtigt ohne Deckung'],
    [/kannst du im Menü einfach weiterspielen/i, 'verspricht das Fortsetzen'],
  ])('behauptet nirgends %s (%s)', (muster) => {
    zeigeFehler();
    expect(screen.queryByText(muster)).not.toBeInTheDocument();
  });
});
