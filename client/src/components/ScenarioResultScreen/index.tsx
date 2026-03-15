// client/src/components/ScenarioResultScreen/index.tsx
import { ScenarioChoice, EventEffects } from '@kritis/shared';
import { getOutcomeColor, getOutcomeLabel } from '../../engine/scenarioEngine';

interface ScenarioResultScreenProps {
  choice: ScenarioChoice;
  bsiReference?: string;
  onContinue: () => void;
}

export function ScenarioResultScreen({ choice, bsiReference, onContinue }: ScenarioResultScreenProps) {
  const renderEffects = () => {
    const items: JSX.Element[] = [];

    if (choice.scoreChange !== 0) {
      const color = choice.scoreChange > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = choice.scoreChange > 0 ? '+' : '';
      items.push(
        <div key="score" className={color}>
          Kompetenz {sign}{choice.scoreChange}
        </div>
      );
    }

    if (choice.reputationChange !== 0) {
      const color = choice.reputationChange > 0 ? 'text-terminal-success' : 'text-terminal-danger';
      const sign = choice.reputationChange > 0 ? '+' : '';
      items.push(
        <div key="reputation" className={color}>
          Reputation {sign}{choice.reputationChange}
        </div>
      );
    }

    return items;
  };

  return (
    <div className="border border-terminal-border p-6">
      {/* Outcome Header */}
      <div className={`text-xl mb-4 ${getOutcomeColor(choice.outcome)}`}>
        {getOutcomeLabel(choice.outcome)}
      </div>

      {/* Consequence */}
      <div className="mb-6 text-terminal-green-dim leading-relaxed whitespace-pre-wrap">
        {choice.consequence}
      </div>

      {/* Lesson learned */}
      {choice.lesson && (
        <div className="border border-terminal-info p-4 mb-6">
          <div className="text-terminal-info mb-2">─ LERNEFFEKT ─</div>
          <div className="text-terminal-green-dim">
            {choice.lesson}
          </div>
        </div>
      )}

      {/* BSI Reference */}
      {bsiReference && (
        <div className="border border-terminal-green-muted p-4 mb-6">
          <div className="text-terminal-green-muted mb-2">─ BSI IT-GRUNDSCHUTZ ─</div>
          <div className="text-terminal-green-dim text-sm">
            {bsiReference}
          </div>
        </div>
      )}

      {/* Effects */}
      {(choice.scoreChange !== 0 || choice.reputationChange !== 0) && (
        <div className="border border-terminal-border p-4 mb-6">
          <div className="text-terminal-green-dim mb-2">─ AUSWIRKUNGEN ─</div>
          <div className="grid grid-cols-2 gap-2">
            {renderEffects()}
          </div>
        </div>
      )}

      {/* Triggered event indicator */}
      {choice.triggersEvent && (
        <div className="border border-terminal-warning p-3 mb-6 text-terminal-warning text-sm">
          Diese Entscheidung wird Folgen haben...
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full p-3 border border-terminal-green hover:bg-terminal-bg-highlight transition-colors text-center"
      >
        [ENTER] Weiter
      </button>
    </div>
  );
}
