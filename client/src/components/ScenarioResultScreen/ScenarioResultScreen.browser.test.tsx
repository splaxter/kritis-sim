import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenarioChoice } from '@kritis/shared';
import { ScenarioResultScreen } from './index';

/**
 * Der ERREICHTE Loesungszweig muss den Ergebnisbildschirm erreichen.
 *
 * Vorher endete sein Text nach der Erfolgsanzeige in der GUI, und der
 * Ergebnisbildschirm zeigte die Fassung der Choice. Bei einem Fallen-Zweig war
 * das eine Geschichte, die es nicht gegeben hat: Wer erst das laufende Backup
 * abschoss und dann die richtige Anwendung beendete, bekam dauerhaft
 * „★ Perfekt" und kein Wort ueber die abgebrochene Sicherung.
 */

const choice: ScenarioChoice = {
  id: 'A',
  text: 'Task-Manager oeffnen',
  outcome: 'PERFECT',
  consequence: 'Die Anwendung startet neu.',
  scoreChange: 120,
  reputationChange: 10,
  lesson: 'Der Task-Manager beendet genau den einen Prozess.',
};

describe('ScenarioResultScreen — der erreichte Zweig', () => {
  it('zeigt den Befund des Zweigs zusaetzlich zur Nachgeschichte', () => {
    render(
      <ScenarioResultScreen
        choice={choice}
        onContinue={vi.fn()}
        solvedBranch={{ resultText: 'Der Sicherungslauf ist abgebrochen.' }}
      />
    );
    expect(screen.getByText('─ BEFUND ─')).toBeInTheDocument();
    expect(screen.getByText('Der Sicherungslauf ist abgebrochen.')).toBeInTheDocument();
    // Die Nachgeschichte bleibt daneben stehen — sie beschreibt, was der
    // Spieler versucht hat, der Befund, was dabei herauskam.
    expect(screen.getByText('Die Anwendung startet neu.')).toBeInTheDocument();
  });

  it('die Einstufung des Zweigs schlaegt die der Choice', () => {
    render(
      <ScenarioResultScreen
        choice={choice}
        onContinue={vi.fn()}
        solvedBranch={{ resultText: 'Teilweise.', outcome: 'PARTIAL_SUCCESS' }}
      />
    );
    expect(screen.getByText('◐ Teilerfolg')).toBeInTheDocument();
    expect(screen.queryByText('★ Perfekt')).not.toBeInTheDocument();
  });

  it('ohne eigene Einstufung bleibt die der Choice stehen', () => {
    render(
      <ScenarioResultScreen
        choice={choice}
        onContinue={vi.fn()}
        solvedBranch={{ resultText: 'Sauber geloest.' }}
      />
    );
    expect(screen.getByText('★ Perfekt')).toBeInTheDocument();
  });

  it('eine reine Dialogentscheidung sieht aus wie bisher', () => {
    render(<ScenarioResultScreen choice={choice} onContinue={vi.fn()} solvedBranch={null} />);
    expect(screen.queryByText('─ BEFUND ─')).not.toBeInTheDocument();
    expect(screen.getByText('★ Perfekt')).toBeInTheDocument();
    expect(screen.getByText('Die Anwendung startet neu.')).toBeInTheDocument();
  });
});
