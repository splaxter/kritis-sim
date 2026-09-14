import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '@kritis/shared';
import { createInitialState } from '../../engine/gameState';
import { StatsBar } from './index';

/**
 * Playtest-Befund: Bei 375x667 fuellten Kopfzeile und Statistik fast den ganzen
 * ersten Bildschirm, die Aufgabe begann darunter. Die Detailwerte sind deshalb
 * auf schmalen Geraeten eingeklappt — die Werte, an denen ein Lauf SCHEITERT,
 * aber nicht.
 *
 * jsdom kennt keine Media Queries, hier wird also die Mechanik geprueft: dass
 * es einen bedienbaren Schalter gibt, dass er zu beginnt, und dass die
 * Gefahrenwerte nie dahinter liegen.
 */

const zustand = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState('statsbar', 'beginner'),
  ...over,
});

describe('StatsBar — die Aufgabe hat Vorrang', () => {
  it('Skills und Beziehungen liegen hinter einem Schalter, der zu beginnt', () => {
    render(<StatsBar state={zustand()} />);
    const schalter = screen.getByRole('button', { name: /Skills & Beziehungen/i });
    expect(schalter).toHaveAttribute('aria-expanded', 'false');
  });

  it('der Schalter oeffnet und schliesst', async () => {
    const user = userEvent.setup();
    render(<StatsBar state={zustand()} />);
    const schalter = screen.getByRole('button', { name: /Skills & Beziehungen/i });
    await user.click(schalter);
    expect(schalter).toHaveAttribute('aria-expanded', 'true');
    await user.click(schalter);
    expect(schalter).toHaveAttribute('aria-expanded', 'false');
  });

  it('er steuert wirklich den Detailbereich', () => {
    render(<StatsBar state={zustand()} />);
    const schalter = screen.getByRole('button', { name: /Skills & Beziehungen/i });
    const ziel = schalter.getAttribute('aria-controls')!;
    expect(document.getElementById(ziel), 'aria-controls zeigt ins Leere').not.toBeNull();
  });

  /** Diese drei entscheiden ueber Sieg und Niederlage — nie hinter einem Klick. */
  it('Stress, Budget und Compliance bleiben immer sichtbar', () => {
    render(<StatsBar state={zustand({ stress: 42, budget: 12345, compliance: 55 })} />);
    expect(screen.getByText(/42\/100/)).toBeInTheDocument();
    expect(screen.getByText(/12\.345/)).toBeInTheDocument();
    expect(screen.getByText(/Compliance: 55%/)).toBeInTheDocument();
  });

  it('eine Niederlagenwarnung steht nicht hinter dem Schalter', () => {
    // Stress dicht an der Schwelle -> Warnbanner.
    render(<StatsBar state={zustand({ stress: 95 })} />);
    const schalter = screen.getByRole('button', { name: /Skills & Beziehungen/i });
    expect(schalter).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/BURNOUT-GEFAHR/)).toBeInTheDocument();
  });

  it('der Lernmodus hat diesen Kopf gar nicht', () => {
    render(<StatsBar state={zustand({ gameMode: 'learning' })} />);
    expect(screen.queryByRole('button', { name: /Skills & Beziehungen/i })).toBeNull();
  });
});
