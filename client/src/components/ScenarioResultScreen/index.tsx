// client/src/components/ScenarioResultScreen/index.tsx
import { ScenarioChoice } from '@kritis/shared';
import { getOutcomeColor, getOutcomeLabel, calculateScenarioEffects } from '../../engine/scenarioEngine';

interface ScenarioResultScreenProps {
  choice: ScenarioChoice;
  bsiReference?: string;
  onContinue: () => void;
}

// Display labels for the actual stat fields the engine touches, so the
// "Auswirkungen" panel matches what really changes on the bars.
const SKILL_LABELS: Record<string, string> = {
  netzwerk: 'Netzwerk',
  linux: 'Linux',
  windows: 'Windows',
  security: 'Security',
  troubleshooting: 'Troubleshoot',
  softSkills: 'Soft Skills',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  chef: 'Chef',
  gf: 'GF',
  kaemmerer: 'Kämmerer',
  fachabteilung: 'Fachabtlg.',
  kollegen: 'Kollegen',
};

export function ScenarioResultScreen({ choice, bsiReference, onContinue }: ScenarioResultScreenProps) {
  // Show the effects that are ACTUALLY applied to the game state (skills,
  // relationships, stress), not the abstract score/reputation numbers which
  // never matched the bars (GitHub issue #2).
  const effects = calculateScenarioEffects(choice);

  const renderDelta = (key: string, label: string, value: number, invert = false) => {
    if (!value) return null;
    // For stress, an increase is "bad" (danger); for skills/relationships, up is "good".
    const good = invert ? value < 0 : value > 0;
    const color = good ? 'text-terminal-success' : 'text-terminal-danger';
    const sign = value > 0 ? '+' : '';
    return (
      <div key={key} className={color}>
        {label} {sign}{value}
      </div>
    );
  };

  const renderEffects = () => {
    const items: JSX.Element[] = [];

    for (const [key, value] of Object.entries(effects.skills ?? {})) {
      const el = renderDelta(`skill-${key}`, SKILL_LABELS[key] ?? key, value as number);
      if (el) items.push(el);
    }

    for (const [key, value] of Object.entries(effects.relationships ?? {})) {
      const el = renderDelta(`rel-${key}`, RELATIONSHIP_LABELS[key] ?? key, value as number);
      if (el) items.push(el);
    }

    const stressEl = renderDelta('stress', 'Stress', effects.stress ?? 0, true);
    if (stressEl) items.push(stressEl);

    return items;
  };

  const hasEffects = () => renderEffects().length > 0;

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
      {hasEffects() && (
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
