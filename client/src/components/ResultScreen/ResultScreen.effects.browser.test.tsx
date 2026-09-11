import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventChoice, EventEffects } from '@kritis/shared';
import { ResultScreen } from './index';

const choice = (effects: EventEffects): EventChoice =>
  ({ text: 'Lösung', resultText: 'Erledigt.', effects } as unknown as EventChoice);

/**
 * Ein Hands-on-Level trägt seine Belohnung im skillGain der Lösung, nicht in den
 * Effekten der Start-Auswahl. Deren `effects` sind dann leer — und vorher stand
 * über dem leeren Raster trotzdem die Überschrift.
 */
describe('ResultScreen — Auswirkungen nur, wenn es welche gibt', () => {
  it.each([
    ['leeres Objekt', {}],
    ['nur Nullwerte', { skills: { linux: 0 }, stress: 0, budget: 0, compliance: 0 }],
  ])('zeigt bei %s keine Überschrift', (_label, effects) => {
    render(<ResultScreen choice={choice(effects as EventEffects)} onContinue={vi.fn()} />);

    expect(screen.queryByText(/AUSWIRKUNGEN/i)).not.toBeInTheDocument();
    // Der Ergebnistext selbst muss natürlich stehen bleiben.
    expect(screen.getByText('Erledigt.')).toBeInTheDocument();
  });

  it('zeigt die Überschrift, sobald ein einziger Effekt greift', () => {
    render(<ResultScreen choice={choice({ skills: { linux: 3 } })} onContinue={vi.fn()} />);

    expect(screen.getByText(/AUSWIRKUNGEN/i)).toBeInTheDocument();
    expect(screen.getByText('Linux +3')).toBeInTheDocument();
  });

  it('zählt auch negative Effekte als Effekte', () => {
    render(<ResultScreen choice={choice({ stress: 8 })} onContinue={vi.fn()} />);

    expect(screen.getByText(/AUSWIRKUNGEN/i)).toBeInTheDocument();
    expect(screen.getByText('Stress +8')).toBeInTheDocument();
  });
});
